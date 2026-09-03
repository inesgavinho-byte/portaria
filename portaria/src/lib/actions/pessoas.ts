"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { requireAdmin } from "@/lib/supabase/tenant";
import {
  candidatosPessoaDaFracao,
  planearAssociacoes,
} from "@/lib/pessoas/sincronizacao";

export type PessoaFormState = {
  error?: string;
  fieldErrors?: Partial<Record<"nome" | "email", string>>;
  sucesso?: boolean;
};

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

function texto(formData: FormData, campo: string, max: number): string | null {
  const v = String(formData.get(campo) ?? "").trim();
  return v ? v.slice(0, max) : null;
}

// ---------------------------------------------------------------------------
// Sincronização fracoes → pessoas/fracao_pessoas
// ---------------------------------------------------------------------------
// Chamada pelas actions de frações depois de cada escrita. Estratégia: como
// o índice de dedupe é sobre lower(btrim(nome)) (expressão, não coluna), o
// PostgREST não consegue fazer upsert "on conflict" sobre ele — por isso se
// lêem as pessoas do tenant (ordem de dezenas num condomínio) e decide-se
// em memória: existe → reutiliza o id; não existe → insere.
// As associações vigentes de cada papel fecham-se com `ate` quando o papel
// muda de mãos — histórico não se apaga.
// Erros não abortam a escrita da fração: os campos desnormalizados de
// fracoes continuam a ser a fonte primária nesta fase; a sincronização é
// best-effort e registada.
export async function sincronizarPessoasDaFracao(
  tenantId: string,
  fracaoId: string,
): Promise<void> {
  const supabase = await createClient();
  const { data: fracao } = await supabase
    .from("fracoes")
    .select(
      "proprietario_nome, proprietario_email, proprietario_telefone, inquilino_nome",
    )
    .eq("id", fracaoId)
    .eq("tenant_id", tenantId)
    .maybeSingle();
  if (!fracao) return;

  const candidatos = candidatosPessoaDaFracao(fracao);

  const { data: existentes } = await supabase
    .from("pessoas")
    .select("id, nome")
    .eq("tenant_id", tenantId);
  const porChave = new Map(
    (existentes ?? []).map((p) => [p.nome.trim().replace(/\s+/g, " ").toLowerCase(), p.id]),
  );

  const idsPorCandidato = new Map<string, string>();
  for (const candidato of candidatos) {
    const chave = candidato.nome.trim().replace(/\s+/g, " ").toLowerCase();
    let pessoaId = porChave.get(chave);
    if (!pessoaId) {
      const { data: nova, error } = await supabase
        .from("pessoas")
        .insert({
          tenant_id: tenantId,
          nome: candidato.nome,
          email: candidato.email,
          telefone: candidato.telefone,
        })
        .select("id")
        .single();
      if (error || !nova) {
        console.error("Sincronização de pessoas: falha ao criar pessoa:", error);
        return;
      }
      pessoaId = nova.id;
      porChave.set(chave, pessoaId);
    }
    idsPorCandidato.set(candidato.papel, pessoaId);
  }

  const { data: vigentes } = await supabase
    .from("fracao_pessoas")
    .select("pessoa_id, papel")
    .eq("fracao_id", fracaoId)
    .eq("tenant_id", tenantId)
    .is("ate", null);

  const plano = planearAssociacoes(
    vigentes ?? [],
    candidatos.map((c) => ({
      pessoaId: idsPorCandidato.get(c.papel)!,
      papel: c.papel,
    })),
  );

  for (const pessoaId of plano.aFechar) {
    await supabase
      .from("fracao_pessoas")
      .update({ ate: new Date().toISOString().slice(0, 10) })
      .eq("fracao_id", fracaoId)
      .eq("pessoa_id", pessoaId)
      .eq("tenant_id", tenantId)
      .is("ate", null);
  }

  for (const abertura of plano.aAbrir) {
    await supabase.from("fracao_pessoas").insert({
      tenant_id: tenantId,
      fracao_id: fracaoId,
      pessoa_id: abertura.pessoaId,
      papel: abertura.papel,
    });
  }
}

// ---------------------------------------------------------------------------
// Edição do condómino a partir da ficha
// ---------------------------------------------------------------------------

export async function atualizarPessoa(
  id: string,
  _prev: PessoaFormState,
  formData: FormData,
): Promise<PessoaFormState> {
  const ctx = await requireAdmin();
  if (!ctx) return { error: "Sem permissões para esta operação." };

  const nome = String(formData.get("nome") ?? "").trim();
  const email = texto(formData, "email", 200);
  const telefone = texto(formData, "telefone", 30);
  const notas = texto(formData, "notas", 500);

  const fieldErrors: PessoaFormState["fieldErrors"] = {};
  if (!nome) fieldErrors.nome = "O nome é obrigatório.";
  if (email && !EMAIL_RE.test(email)) fieldErrors.email = "Email inválido.";
  if (Object.keys(fieldErrors).length > 0) return { fieldErrors };

  const supabase = await createClient();
  const { error } = await supabase
    .from("pessoas")
    .update({ nome, email, telefone, notas, atualizado_em: new Date().toISOString() })
    .eq("id", id)
    .eq("tenant_id", ctx.tenant.id);

  if (error) {
    console.error("Erro update pessoa:", error);
    return { error: "Erro ao atualizar o condómino." };
  }

  // Mantém o fallback desnormalizado nas frações onde esta pessoa é
  // proprietária vigente — enquanto a UI antiga (comunicações, dossiê)
  // continuar a ler de fracoes.
  const { data: fracoesDaPessoa } = await supabase
    .from("fracao_pessoas")
    .select("fracao_id")
    .eq("pessoa_id", id)
    .eq("tenant_id", ctx.tenant.id)
    .eq("papel", "proprietario")
    .is("ate", null);

  for (const ligacao of fracoesDaPessoa ?? []) {
    await supabase
      .from("fracoes")
      .update({ proprietario_nome: nome, proprietario_email: email, proprietario_telefone: telefone })
      .eq("id", ligacao.fracao_id)
      .eq("tenant_id", ctx.tenant.id);
  }

  revalidatePath(`/condominos/${id}`);
  revalidatePath("/condominos");
  revalidatePath("/fracoes");
  redirect(`/condominos/${id}`);
}
