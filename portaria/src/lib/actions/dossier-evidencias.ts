"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { requireAdmin } from "@/lib/supabase/tenant";

/**
 * Ligação entre o arquivo de ficheiros e a camada analítica do dossiê.
 *
 * Um ficheiro carregado vive em `documentos`. Uma afirmação do histórico cita
 * uma fonte em `ia_documental_fontes`. São camadas distintas de propósito: a
 * primeira guarda o original, a segunda guarda a leitura — o que o documento
 * diz, onde o diz e que papel desempenha na afirmação.
 *
 * Estas acções fazem a ponte, criando a fonte a partir do documento quando ela
 * ainda não existe. Nunca se duplica: um documento tem no máximo uma fonte,
 * garantido por índice único em (tenant_id, documento_id).
 */

export type EvidenciaFormState = {
  error?: string;
  ok?: boolean;
  fieldErrors?: Partial<Record<"documento" | "citacao" | "localizador" | "papel", string>>;
};

const PAPEIS = ["primaria", "corroboracao", "contradicao"] as const;
type Papel = (typeof PAPEIS)[number];

const CITACAO_MAX = 2000;
const LOCALIZADOR_MAX = 240;

/**
 * Devolve a fonte documental do documento indicado, criando-a se necessário.
 * A fonte herda o título, a data e o fornecedor do documento.
 */
async function garantirFonte(
  supabase: Awaited<ReturnType<typeof createClient>>,
  tenantId: string,
  userId: string,
  documentoId: string,
): Promise<{ fonteId?: string; error?: string }> {
  const { data: existente, error: erroExistente } = await supabase
    .from("ia_documental_fontes")
    .select("id")
    .eq("tenant_id", tenantId)
    .eq("documento_id", documentoId)
    .maybeSingle();

  if (erroExistente) return { error: "Não foi possível verificar a fonte documental." };
  if (existente) return { fonteId: existente.id };

  const { data: documento, error: erroDocumento } = await supabase
    .from("documentos")
    .select("id, titulo, categoria, data_documento, contraparte, n_mensagens, checksum, fornecedor_id")
    .eq("tenant_id", tenantId)
    .eq("id", documentoId)
    .maybeSingle();

  if (erroDocumento || !documento) return { error: "Documento não encontrado no arquivo." };

  const referencia = [
    documento.contraparte,
    documento.data_documento ? `de ${documento.data_documento}` : null,
    documento.n_mensagens ? `${documento.n_mensagens} mensagens` : null,
  ]
    .filter(Boolean)
    .join(", ");

  const { data: criada, error: erroCriar } = await supabase
    .from("ia_documental_fontes")
    .insert({
      tenant_id: tenantId,
      titulo: documento.titulo,
      referencia: referencia || documento.categoria,
      jurisdicao: "PT",
      ativa: true,
      documento_id: documento.id,
      fornecedor_id: documento.fornecedor_id,
      data_documento: documento.data_documento,
      checksum: documento.checksum,
      criado_por: userId,
    })
    .select("id")
    .single();

  if (erroCriar || !criada) return { error: "Não foi possível criar a fonte documental." };
  return { fonteId: criada.id };
}

/**
 * Junta um documento do arquivo a um acontecimento do histórico, como
 * evidência, com o localizador e a citação que sustentam a afirmação.
 */
export async function juntarEvidencia(
  _prev: EvidenciaFormState,
  formData: FormData,
): Promise<EvidenciaFormState> {
  const ctx = await requireAdmin();
  if (!ctx) return { error: "Sem permissões para esta operação." };

  const eventoId = String(formData.get("evento_id") ?? "").trim();
  const documentoId = String(formData.get("documento_id") ?? "").trim();
  const localizador = String(formData.get("localizador") ?? "").trim();
  const citacao = String(formData.get("citacao") ?? "").trim();
  const papel = String(formData.get("papel") ?? "").trim() as Papel;
  const rawRedirect = String(formData.get("redirect_to") ?? "").trim();

  const fieldErrors: EvidenciaFormState["fieldErrors"] = {};
  if (!documentoId) fieldErrors.documento = "Escolha um documento do arquivo.";
  if (!citacao) fieldErrors.citacao = "A citação é obrigatória — é ela que sustenta a afirmação.";
  if (citacao.length > CITACAO_MAX) fieldErrors.citacao = "Citação demasiado longa.";
  if (localizador.length > LOCALIZADOR_MAX) fieldErrors.localizador = "Localizador demasiado longo.";
  if (!PAPEIS.includes(papel)) fieldErrors.papel = "Indique o papel da evidência.";
  if (!eventoId) return { error: "Acontecimento não identificado." };
  if (Object.keys(fieldErrors).length > 0) return { fieldErrors };

  const supabase = await createClient();

  const { data: evento } = await supabase
    .from("contrato_memoria_eventos")
    .select("id")
    .eq("tenant_id", ctx.tenant.id)
    .eq("id", eventoId)
    .maybeSingle();
  if (!evento) return { error: "Acontecimento não encontrado." };

  const { fonteId, error: erroFonte } = await garantirFonte(
    supabase,
    ctx.tenant.id,
    ctx.user.id,
    documentoId,
  );
  if (erroFonte || !fonteId) return { error: erroFonte ?? "Falha ao preparar a fonte." };

  const { error } = await supabase.from("contrato_memoria_evidencias").insert({
    evento_id: eventoId,
    fonte_id: fonteId,
    localizador: localizador || null,
    citacao,
    papel,
    criado_por: ctx.user.id,
  });

  if (error) {
    // Índice único em (evento_id, fonte_id, citacao): a mesma citação da mesma
    // fonte no mesmo acontecimento não se repete.
    if (error.code === "23505") {
      return { error: "Esta citação já está associada a este acontecimento." };
    }
    return { error: "Não foi possível juntar a evidência." };
  }

  if (rawRedirect.startsWith("/") && !rawRedirect.startsWith("//")) {
    revalidatePath(rawRedirect);
  }
  return { ok: true };
}

export async function removerEvidencia(
  _prev: EvidenciaFormState,
  formData: FormData,
): Promise<EvidenciaFormState> {
  const ctx = await requireAdmin();
  if (!ctx) return { error: "Sem permissões para esta operação." };

  const evidenciaId = String(formData.get("evidencia_id") ?? "").trim();
  const rawRedirect = String(formData.get("redirect_to") ?? "").trim();
  if (!evidenciaId) return { error: "Evidência não identificada." };

  const supabase = await createClient();

  // A evidência não tem tenant_id próprio: valida-se pelo acontecimento.
  const { data: evidencia } = await supabase
    .from("contrato_memoria_evidencias")
    .select("id, contrato_memoria_eventos!inner(tenant_id)")
    .eq("id", evidenciaId)
    .maybeSingle();

  const tenantDoEvento = (
    evidencia as { contrato_memoria_eventos?: { tenant_id: string }[] } | null
  )?.contrato_memoria_eventos?.[0]?.tenant_id;

  if (!evidencia || tenantDoEvento !== ctx.tenant.id) {
    return { error: "Evidência não encontrada." };
  }

  const { error } = await supabase
    .from("contrato_memoria_evidencias")
    .delete()
    .eq("id", evidenciaId);

  if (error) return { error: "Não foi possível remover a evidência." };

  if (rawRedirect.startsWith("/") && !rawRedirect.startsWith("//")) {
    revalidatePath(rawRedirect);
  }
  return { ok: true };
}
