import { createClient as createSupabaseClient } from "@supabase/supabase-js";

/**
 * Cliente Supabase com service role — IGNORA RLS.
 *
 * USAR APENAS EM SERVER ACTIONS / ROUTE HANDLERS, para operações que o
 * RLS não pode permitir por definição (ex.: enviar convites via
 * auth.admin, ler emails de utilizadores para listagens de membros).
 * NUNCA importar em código com "use client".
 *
 * Devolve null se a SUPABASE_SERVICE_ROLE_KEY não estiver configurada —
 * quem chama decide como degradar.
 */
export function createAdminClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) return null;

  return createSupabaseClient(url, key, {
    auth: { autoRefreshToken: false, persistSession: false },
  });
}
