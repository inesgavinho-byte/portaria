"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";

/**
 * S11 — Aceitação explícita de convites.
 *
 * O convidado autenticado decide convite a convite (aceitar ou recusar).
 * A autorização vive na base de dados: aceitar_convite/recusar_convite
 * (migração 20260902090000) só operam sobre convites dirigidos ao email
 * do próprio auth.uid(). Aqui valida-se apenas a sessão e transmite-se
 * o resultado (as mensagens de erro vêm das próprias funções, em PT-PT).
 */
export type ConvitePendente = {
  id: string;
  tenant_nome: string;
  fracao: string | null;
  role: "admin" | "comissao" | "condomino" | "inquilino";
  criado_em: string;
};

export type ConviteAcaoState = {
  ok: boolean;
  error?: string;
};

/** Sessão autenticada obrigatória para tratar convites. */
async function exigirAutenticacao(): Promise<boolean> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  return Boolean(user);
}

/**
 * Aceita explicitamente um convite pendente do próprio email.
 * Cria o membership no tenant do convite e marca aceite_em.
 */
export async function aceitarConvitePendente(
  conviteId: string
): Promise<ConviteAcaoState> {
  if (!(await exigirAutenticacao())) {
    return { ok: false, error: "Sessão expirada. Entre novamente." };
  }
  if (!conviteId) {
    return { ok: false, error: "Convite inválido." };
  }

  const supabase = await createClient();
  const { error } = await supabase.rpc("aceitar_convite", {
    p_convite_id: conviteId,
  });

  if (error) {
    // As funções devolvem mensagens explícitas em PT-PT (email alheio,
    // convite aceite/recusado/expirado, etc.) — mostram-se tal e qual.
    return { ok: false, error: error.message };
  }

  revalidatePath("/convite/pendentes");
  return { ok: true };
}

/**
 * Recusa explicitamente um convite pendente do próprio email.
 * Fica registado (recusado_em); a administração pode reconvidar.
 */
export async function recusarConvitePendente(
  conviteId: string
): Promise<ConviteAcaoState> {
  if (!(await exigirAutenticacao())) {
    return { ok: false, error: "Sessão expirada. Entre novamente." };
  }
  if (!conviteId) {
    return { ok: false, error: "Convite inválido." };
  }

  const supabase = await createClient();
  const { error } = await supabase.rpc("recusar_convite", {
    p_convite_id: conviteId,
  });

  if (error) {
    return { ok: false, error: error.message };
  }

  revalidatePath("/convite/pendentes");
  return { ok: true };
}
