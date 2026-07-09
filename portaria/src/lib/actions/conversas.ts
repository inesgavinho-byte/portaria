"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { requireAdmin } from "@/lib/supabase/tenant";

export type ConversaFormState = {
  error?: string;
  fieldErrors?: Partial<Record<"assunto", string>>;
};

export async function criarConversa(
  _prev: ConversaFormState,
  formData: FormData
): Promise<ConversaFormState> {
  const ctx = await requireAdmin();
  if (!ctx) return { error: "Sem permissões para esta operação." };

  const assunto = String(formData.get("assunto") ?? "").trim();
  const ocorrenciaId = String(formData.get("ocorrencia_id") ?? "").trim() || null;
  const primeiraMensagem = String(formData.get("mensagem") ?? "").trim();

  if (!assunto) return { fieldErrors: { assunto: "O assunto é obrigatório." } };

  const supabase = await createClient();

  // Valida que a ocorrência (se indicada) pertence ao tenant
  if (ocorrenciaId) {
    const { data: oc } = await supabase
      .from("ocorrencias")
      .select("id")
      .eq("id", ocorrenciaId)
      .eq("tenant_id", ctx.tenant.id)
      .single();
    if (!oc) return { error: "Ocorrência associada inválida." };
  }

  const { data: conversa, error } = await supabase
    .from("conversas")
    .insert({
      tenant_id: ctx.tenant.id,
      assunto,
      ocorrencia_id: ocorrenciaId,
      criado_por: ctx.user.id,
    })
    .select()
    .single();

  if (error || !conversa) {
    console.error("Erro insert conversa:", error);
    return { error: "Erro ao criar a conversa." };
  }

  if (primeiraMensagem) {
    await supabase.from("conversa_mensagens").insert({
      tenant_id: ctx.tenant.id,
      conversa_id: conversa.id,
      corpo: primeiraMensagem,
      autor: ctx.user.id,
    });
  }

  revalidatePath("/configuracao/conversas");
  redirect(`/configuracao/conversas/${conversa.id}`);
}

export async function adicionarMensagem(
  conversaId: string,
  formData: FormData
): Promise<void> {
  const ctx = await requireAdmin();
  if (!ctx) throw new Error("Sem permissões");

  const corpo = String(formData.get("corpo") ?? "").trim();
  if (!corpo) return;

  const supabase = await createClient();
  const { error } = await supabase.from("conversa_mensagens").insert({
    tenant_id: ctx.tenant.id,
    conversa_id: conversaId,
    corpo,
    autor: ctx.user.id,
  });
  if (error) throw new Error("Erro ao adicionar a mensagem.");

  await supabase
    .from("conversas")
    .update({ atualizado_em: new Date().toISOString() })
    .eq("id", conversaId)
    .eq("tenant_id", ctx.tenant.id);

  revalidatePath(`/configuracao/conversas/${conversaId}`);
}

export async function apagarConversa(id: string) {
  const ctx = await requireAdmin();
  if (!ctx) throw new Error("Sem permissões");

  const supabase = await createClient();
  const { error } = await supabase
    .from("conversas")
    .delete()
    .eq("id", id)
    .eq("tenant_id", ctx.tenant.id);
  if (error) throw new Error("Erro ao apagar a conversa.");

  revalidatePath("/configuracao/conversas");
  redirect("/configuracao/conversas");
}
