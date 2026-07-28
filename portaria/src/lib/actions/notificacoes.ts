"use server";

import { createClient } from "@/lib/supabase/server";
import { getCurrentUserInTenant } from "@/lib/supabase/tenant";
import type { Notificacao } from "@/types/database";

// ---------------------------------------------------------------------------
// LISTAR NOTIFICAÇÕES
// ---------------------------------------------------------------------------

export async function listarNotificacoes(limite = 50): Promise<Notificacao[]> {
  const ctx = await getCurrentUserInTenant();
  if (!ctx) return [];

  const supabase = await createClient();
  const { data } = await supabase
    .from("notificacoes")
    .select("*")
    .eq("user_id", ctx.user.id)
    .order("criado_em", { ascending: false })
    .limit(limite);

  return (data ?? []) as Notificacao[];
}

// ---------------------------------------------------------------------------
// CONTAR NÃO LIDAS
// ---------------------------------------------------------------------------

export async function contarNaoLidas(): Promise<number> {
  const ctx = await getCurrentUserInTenant();
  if (!ctx) return 0;

  const supabase = await createClient();
  const { count } = await supabase
    .from("notificacoes")
    .select("*", { count: "exact", head: true })
    .eq("user_id", ctx.user.id)
    .eq("lida", false);

  return count ?? 0;
}

// ---------------------------------------------------------------------------
// MARCAR COMO LIDA
// ---------------------------------------------------------------------------

export async function marcarComoLida(notificacaoId: string): Promise<void> {
  const ctx = await getCurrentUserInTenant();
  if (!ctx) return;

  const supabase = await createClient();
  await supabase
    .from("notificacoes")
    .update({ lida: true, lida_em: new Date().toISOString() })
    .eq("id", notificacaoId)
    .eq("user_id", ctx.user.id);
}

// ---------------------------------------------------------------------------
// MARCAR TODAS COMO LIDAS
// ---------------------------------------------------------------------------

export async function marcarTodasComoLidas(): Promise<void> {
  const ctx = await getCurrentUserInTenant();
  if (!ctx) return;

  const supabase = await createClient();
  await supabase
    .from("notificacoes")
    .update({ lida: true, lida_em: new Date().toISOString() })
    .eq("user_id", ctx.user.id)
    .eq("lida", false);
}

// ---------------------------------------------------------------------------
// APAGAR NOTIFICAÇÃO
// ---------------------------------------------------------------------------

export async function apagarNotificacao(notificacaoId: string): Promise<void> {
  const ctx = await getCurrentUserInTenant();
  if (!ctx) return;

  const supabase = await createClient();
  await supabase
    .from("notificacoes")
    .delete()
    .eq("id", notificacaoId)
    .eq("user_id", ctx.user.id);
}

// ---------------------------------------------------------------------------
// PREFERÊNCIAS
// ---------------------------------------------------------------------------

export type PreferenciaState = { error?: string; ok?: boolean };

export async function atualizarPreferenciaNotificacoes(
  _prev: PreferenciaState,
  formData: FormData
): Promise<PreferenciaState> {
  const ctx = await getCurrentUserInTenant();
  if (!ctx) return { error: "Não autenticado." };

  const ativo = formData.get("notificacoes_email") === "on";

  const supabase = await createClient();
  const { error } = await supabase
    .from("user_tenants")
    .update({ notificacoes_email: ativo })
    .eq("user_id", ctx.user.id)
    .eq("tenant_id", ctx.tenant.id);

  if (error) return { error: "Erro ao guardar preferência." };
  return { ok: true };
}
