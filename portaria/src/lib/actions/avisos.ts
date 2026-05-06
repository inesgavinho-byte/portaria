"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { getCurrentUserInTenant } from "@/lib/supabase/tenant";
import type { Aviso } from "@/types/database";

export type AvisoFormState = {
  error?: string;
  fieldErrors?: Partial<Record<"titulo" | "conteudo" | "prioridade", string>>;
};

/**
 * Cria novo aviso. RLS garante que apenas admins do tenant conseguem.
 */
export async function criarAviso(
  _prev: AvisoFormState,
  formData: FormData
): Promise<AvisoFormState> {
  const ctx = await getCurrentUserInTenant();
  if (!ctx || ctx.membership.role !== "admin") {
    return { error: "Sem permissões para esta operação." };
  }

  const titulo = String(formData.get("titulo") ?? "").trim();
  const conteudo = String(formData.get("conteudo") ?? "").trim();
  const prioridade = String(formData.get("prioridade") ?? "normal");

  // Validação básica server-side (defesa em profundidade — o HTML
  // required já apanha a maior parte mas nunca confiar só nisso)
  const fieldErrors: AvisoFormState["fieldErrors"] = {};
  if (!titulo) fieldErrors.titulo = "O título é obrigatório.";
  if (titulo.length > 200) fieldErrors.titulo = "Título demasiado longo (máx. 200).";
  if (!conteudo || conteudo === "<p></p>") fieldErrors.conteudo = "O conteúdo é obrigatório.";
  if (!["normal", "importante", "urgente"].includes(prioridade)) {
    fieldErrors.prioridade = "Prioridade inválida.";
  }

  if (Object.keys(fieldErrors).length > 0) {
    return { fieldErrors };
  }

  const supabase = await createClient();
  const { error } = await supabase.from("avisos").insert({
    tenant_id: ctx.tenant.id,
    titulo,
    conteudo,
    prioridade: prioridade as Aviso["prioridade"],
    publicado_por: ctx.user.id,
  });

  if (error) {
    return { error: "Erro ao guardar o aviso. Tente novamente." };
  }

  revalidatePath("/avisos");
  revalidatePath("/configuracao/avisos");
  redirect("/configuracao/avisos");
}

/**
 * Atualiza aviso existente.
 */
export async function atualizarAviso(
  id: string,
  _prev: AvisoFormState,
  formData: FormData
): Promise<AvisoFormState> {
  const ctx = await getCurrentUserInTenant();
  if (!ctx || ctx.membership.role !== "admin") {
    return { error: "Sem permissões para esta operação." };
  }

  const titulo = String(formData.get("titulo") ?? "").trim();
  const conteudo = String(formData.get("conteudo") ?? "").trim();
  const prioridade = String(formData.get("prioridade") ?? "normal");

  const fieldErrors: AvisoFormState["fieldErrors"] = {};
  if (!titulo) fieldErrors.titulo = "O título é obrigatório.";
  if (!conteudo || conteudo === "<p></p>") fieldErrors.conteudo = "O conteúdo é obrigatório.";
  if (Object.keys(fieldErrors).length > 0) {
    return { fieldErrors };
  }

  const supabase = await createClient();
  const { error } = await supabase
    .from("avisos")
    .update({
      titulo,
      conteudo,
      prioridade: prioridade as Aviso["prioridade"],
    })
    .eq("id", id)
    .eq("tenant_id", ctx.tenant.id);

  if (error) {
    return { error: "Erro ao atualizar o aviso." };
  }

  revalidatePath("/avisos");
  revalidatePath("/configuracao/avisos");
  redirect("/configuracao/avisos");
}

/**
 * Marca aviso como inativo (soft delete — não apaga, fica no histórico).
 */
export async function desativarAviso(id: string) {
  const ctx = await getCurrentUserInTenant();
  if (!ctx || ctx.membership.role !== "admin") {
    throw new Error("Sem permissões");
  }

  const supabase = await createClient();
  const { error } = await supabase
    .from("avisos")
    .update({ ativo: false })
    .eq("id", id)
    .eq("tenant_id", ctx.tenant.id);

  if (error) throw new Error("Erro ao desativar aviso.");

  revalidatePath("/avisos");
  revalidatePath("/configuracao/avisos");
}

/**
 * Reativa um aviso desativado.
 */
export async function reativarAviso(id: string) {
  const ctx = await getCurrentUserInTenant();
  if (!ctx || ctx.membership.role !== "admin") {
    throw new Error("Sem permissões");
  }

  const supabase = await createClient();
  const { error } = await supabase
    .from("avisos")
    .update({ ativo: true })
    .eq("id", id)
    .eq("tenant_id", ctx.tenant.id);

  if (error) throw new Error("Erro ao reativar aviso.");

  revalidatePath("/avisos");
  revalidatePath("/configuracao/avisos");
}
