"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { requireAdmin } from "@/lib/supabase/tenant";
import { validarAcontecimento } from "@/lib/fornecedores/processo";

/**
 * Acontecimentos da memória da contratação, registados pela interface.
 *
 * Até aqui, um acontecimento novo exigia uma migração escrita à mão — foi o
 * que a reconciliação do processo Pinturas Verticais tornou insustentável. A
 * partir da Fase B nasce aqui: escolhe-se o contrato, a data, o tipo, a
 * natureza (facto, inferência, conflito ou pendente) e descreve-se o que
 * aconteceu. As evidências juntam-se depois, citação a citação.
 */

export type AcontecimentoFormState = {
  error?: string;
  ok?: boolean;
  fieldErrors?: Partial<
    Record<"contrato" | "data" | "tipo" | "natureza" | "titulo" | "resumo" | "valor", string>
  >;
};

function revalidarDossie(redirect: string, fornecedorId: string | null) {
  if (redirect.startsWith("/") && !redirect.startsWith("//")) {
    revalidatePath(redirect);
  }
  if (fornecedorId) {
    revalidatePath(`/fornecedores/${fornecedorId}`);
    revalidatePath(`/fornecedores/${fornecedorId}/relatorio`);
  }
}

/**
 * Cria um acontecimento de memória da contratação.
 *
 * `contrato_id` é obrigatório por estrutura (NOT NULL na base) e por sentido:
 * a memória da contratação é a memória de um contrato. O formulário do dossiê
 * do fornecedor oferece os contratos existentes; sem nenhum, não há memória
 * que registar.
 */
export async function criarAcontecimento(
  _prev: AcontecimentoFormState,
  formData: FormData,
): Promise<AcontecimentoFormState> {
  const ctx = await requireAdmin();
  if (!ctx) return { error: "Sem permissões para esta operação." };

  const resultado = validarAcontecimento(formData, { comContrato: true });
  if (!resultado.ok) return { fieldErrors: resultado.fieldErrors };
  const valores = resultado.valores;

  const rawRedirect = String(formData.get("redirect_to") ?? "").trim();
  const fornecedorId = String(formData.get("fornecedor_id") ?? "").trim() || null;

  const supabase = await createClient();

  // O contrato tem de pertencer ao tenant. A FK garante a integridade; esta
  // verificação devolve um erro legível em vez de uma violação anónima.
  const { data: contrato } = await supabase
    .from("contratos")
    .select("id")
    .eq("id", valores.contratoId)
    .eq("tenant_id", ctx.tenant.id)
    .maybeSingle();
  if (!contrato) return { error: "Contrato não encontrado neste condomínio." };

  const { error } = await supabase.from("contrato_memoria_eventos").insert({
    tenant_id: ctx.tenant.id,
    contrato_id: valores.contratoId,
    data_evento: valores.dataEvento,
    tipo: valores.tipo,
    natureza: valores.natureza,
    titulo: valores.titulo,
    resumo: valores.resumo,
    valor_cents: valores.valorCents,
    criado_por: ctx.user.id,
  });

  if (error) {
    console.error("[dossier-eventos] falha ao criar acontecimento:", error);
    return { error: "Não foi possível registar o acontecimento." };
  }

  revalidarDossie(rawRedirect, fornecedorId);
  return { ok: true };
}

/**
 * Corrige um acontecimento existente — B4 do goal, correcção sem migração.
 *
 * Tudo o que descreve o acontecimento é editável (título, resumo, data,
 * tipo, natureza, valor). O contrato a que pertence não: a memória fica no
 * contrato a que foi registada. Não há apagar — um acontecimento registado
 * faz parte do histórico do dossiê; se deixou de ser sustentado, corrige-se
 * a descrição ou a natureza.
 */
export async function corrigirAcontecimento(
  _prev: AcontecimentoFormState,
  formData: FormData,
): Promise<AcontecimentoFormState> {
  const ctx = await requireAdmin();
  if (!ctx) return { error: "Sem permissões para esta operação." };

  const eventoId = String(formData.get("evento_id") ?? "").trim();
  if (!eventoId) return { error: "Acontecimento não identificado." };

  const resultado = validarAcontecimento(formData, { comContrato: false });
  if (!resultado.ok) return { fieldErrors: resultado.fieldErrors };
  const valores = resultado.valores;

  const rawRedirect = String(formData.get("redirect_to") ?? "").trim();
  const fornecedorId = String(formData.get("fornecedor_id") ?? "").trim() || null;

  const supabase = await createClient();

  const { data: actualizado, error } = await supabase
    .from("contrato_memoria_eventos")
    .update({
      data_evento: valores.dataEvento,
      tipo: valores.tipo,
      natureza: valores.natureza,
      titulo: valores.titulo,
      resumo: valores.resumo,
      valor_cents: valores.valorCents,
      atualizado_em: new Date().toISOString(),
    })
    .eq("id", eventoId)
    .eq("tenant_id", ctx.tenant.id)
    .select("id")
    .maybeSingle();

  if (error) {
    console.error("[dossier-eventos] falha ao corrigir acontecimento:", error);
    return { error: "Não foi possível corrigir o acontecimento." };
  }
  if (!actualizado) return { error: "Acontecimento não encontrado." };

  revalidarDossie(rawRedirect, fornecedorId);
  return { ok: true };
}
