"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { getCurrentUserInTenant } from "@/lib/supabase/tenant";
import type { Ocorrencia, OcorrenciaCategoria, OcorrenciaEstado } from "@/types/database";

const CATEGORIAS_VALIDAS: OcorrenciaCategoria[] = [
  "infiltracao", "elevador", "ruido", "limpeza",
  "iluminacao", "porta", "esclarecimento", "outro",
];

const ESTADOS_VALIDOS: OcorrenciaEstado[] = [
  "novo", "em_curso", "aguarda_fornecedor", "resolvido", "arquivado",
];

const MAX_FOTOS = 6;
const MAX_FOTO_MB = 10;
const MAX_FOTO_BYTES = MAX_FOTO_MB * 1024 * 1024;

export type OcorrenciaFormState = {
  error?: string;
  fieldErrors?: Partial<
    Record<"titulo" | "categoria" | "descricao" | "fotos", string>
  >;
};

/**
 * Reporta (cria) uma ocorrência. Qualquer membro do tenant pode fazê-lo —
 * a RLS (0002) valida que `reportado_por = auth.uid()` e o tenant é o seu.
 *
 * Fotografias vão para o bucket `ocorrencias` com path
 * {tenant_id}/{ocorrencia_id}/{filename} e cada uma gera um evento 'foto'.
 */
export async function criarOcorrencia(
  _prev: OcorrenciaFormState,
  formData: FormData
): Promise<OcorrenciaFormState> {
  const ctx = await getCurrentUserInTenant();
  if (!ctx) return { error: "Sessão inválida. Inicie sessão novamente." };

  const titulo = String(formData.get("titulo") ?? "").trim();
  const descricao = String(formData.get("descricao") ?? "").trim() || null;
  const categoria = String(formData.get("categoria") ?? "");
  const fracaoIdRaw = String(formData.get("fracao_id") ?? "").trim();
  const fracao_id = fracaoIdRaw || null;

  const fotos = formData
    .getAll("fotos")
    .filter((f): f is File => f instanceof File && f.size > 0);

  const fieldErrors: OcorrenciaFormState["fieldErrors"] = {};
  if (!titulo) fieldErrors.titulo = "O título é obrigatório.";
  if (titulo.length > 200) fieldErrors.titulo = "Título demasiado longo (máx. 200).";
  if (!CATEGORIAS_VALIDAS.includes(categoria as OcorrenciaCategoria)) {
    fieldErrors.categoria = "Selecione uma categoria.";
  }
  if (fotos.length > MAX_FOTOS) {
    fieldErrors.fotos = `Máximo de ${MAX_FOTOS} fotografias.`;
  }
  for (const f of fotos) {
    if (!f.type.startsWith("image/")) {
      fieldErrors.fotos = "Só são permitidas imagens.";
      break;
    }
    if (f.size > MAX_FOTO_BYTES) {
      fieldErrors.fotos = `Cada imagem deve ter no máximo ${MAX_FOTO_MB} MB.`;
      break;
    }
  }

  if (Object.keys(fieldErrors).length > 0) {
    return { fieldErrors };
  }

  const supabase = await createClient();

  // 1. Cria a ocorrência
  const { data: ocorrencia, error: insertError } = await supabase
    .from("ocorrencias")
    .insert({
      tenant_id: ctx.tenant.id,
      titulo,
      descricao,
      categoria: categoria as OcorrenciaCategoria,
      fracao_id,
      reportado_por: ctx.user.id,
    })
    .select()
    .single();

  if (insertError || !ocorrencia) {
    console.error("Erro insert ocorrencia:", insertError);
    return { error: "Não foi possível registar a ocorrência. Tente novamente." };
  }

  // 2. Evento inicial
  await supabase.from("ocorrencia_eventos").insert({
    ocorrencia_id: ocorrencia.id,
    tenant_id: ctx.tenant.id,
    tipo: "criacao",
    conteudo: null,
    autor_id: ctx.user.id,
  });

  // 3. Upload das fotografias (best-effort) + evento 'foto' por cada uma
  for (let i = 0; i < fotos.length; i++) {
    const f = fotos[i];
    const extensao = f.name.split(".").pop()?.toLowerCase() ?? "jpg";
    const path = `${ctx.tenant.id}/${ocorrencia.id}/${Date.now()}-${i}.${extensao}`;

    const { error: uploadError } = await supabase.storage
      .from("ocorrencias")
      .upload(path, f, { contentType: f.type, upsert: false });

    if (uploadError) {
      console.error("Erro upload foto ocorrencia:", uploadError);
      continue; // não falha a ocorrência por causa de uma foto
    }

    await supabase.from("ocorrencia_eventos").insert({
      ocorrencia_id: ocorrencia.id,
      tenant_id: ctx.tenant.id,
      tipo: "foto",
      conteudo: path,
      autor_id: ctx.user.id,
    });
  }

  revalidatePath("/ocorrencias");
  redirect(`/ocorrencias/${ocorrencia.id}`);
}

/**
 * Altera o estado de uma ocorrência. Apenas admins (a RLS reforça isto).
 * Regista um evento 'mudanca_estado' na timeline.
 */
export async function alterarEstadoOcorrencia(
  id: string,
  novoEstado: OcorrenciaEstado
): Promise<{ error?: string }> {
  const ctx = await getCurrentUserInTenant();
  if (!ctx || ctx.membership.role !== "admin") {
    return { error: "Sem permissões para esta operação." };
  }
  if (!ESTADOS_VALIDOS.includes(novoEstado)) {
    return { error: "Estado inválido." };
  }

  const supabase = await createClient();

  const { data: atual } = await supabase
    .from("ocorrencias")
    .select("estado")
    .eq("id", id)
    .eq("tenant_id", ctx.tenant.id)
    .single<Pick<Ocorrencia, "estado">>();

  if (!atual) return { error: "Ocorrência não encontrada." };
  if (atual.estado === novoEstado) return {};

  const { error } = await supabase
    .from("ocorrencias")
    .update({ estado: novoEstado, atualizado_em: new Date().toISOString() })
    .eq("id", id)
    .eq("tenant_id", ctx.tenant.id);

  if (error) return { error: "Erro ao atualizar o estado." };

  await supabase.from("ocorrencia_eventos").insert({
    ocorrencia_id: id,
    tenant_id: ctx.tenant.id,
    tipo: "mudanca_estado",
    conteudo: `${atual.estado} → ${novoEstado}`,
    autor_id: ctx.user.id,
  });

  revalidatePath("/ocorrencias");
  revalidatePath(`/ocorrencias/${id}`);
  return {};
}

/**
 * Adiciona uma nota à timeline da ocorrência. Qualquer membro do tenant
 * pode (a RLS valida tenant + autor_id = auth.uid()).
 */
export async function adicionarNotaOcorrencia(
  id: string,
  nota: string
): Promise<{ error?: string }> {
  const ctx = await getCurrentUserInTenant();
  if (!ctx) return { error: "Sessão inválida." };

  const texto = nota.trim();
  if (!texto) return { error: "A nota não pode estar vazia." };
  if (texto.length > 2000) return { error: "Nota demasiado longa." };

  const supabase = await createClient();
  const { error } = await supabase.from("ocorrencia_eventos").insert({
    ocorrencia_id: id,
    tenant_id: ctx.tenant.id,
    tipo: "nota",
    conteudo: texto,
    autor_id: ctx.user.id,
  });

  if (error) return { error: "Erro ao adicionar a nota." };

  revalidatePath(`/ocorrencias/${id}`);
  return {};
}
