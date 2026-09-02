"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { requireAdmin } from "@/lib/supabase/tenant";
import { garantirFonte } from "@/lib/fornecedores/fontes";

/**
 * Evidências do dossiê: juntar um documento do arquivo a um acontecimento,
 * com localizador, citação e papel.
 *
 * A ponte para a fonte vive em `lib/fornecedores/fontes.ts`, partilhada com a
 * ingestão e com as posições de imputação — é a mesma camada, um só arquivo
 * de fontes.
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
