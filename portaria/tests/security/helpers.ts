/**
 * Helpers para os testes de segurança RLS.
 *
 * Estes testes exercem o PostgREST DIRETAMENTE (como faria um atacante com a
 * anon key embutida no bundle), não as server actions. Cada teste usa:
 *   • um cliente `anon` (só a anon key), OU
 *   • um cliente autenticado com o access token de um utilizador de teste.
 *
 * Requer variáveis de ambiente (ver tests/security/README.md):
 *   SUPABASE_URL                — ex. http://127.0.0.1:54321 (supabase local)
 *   SUPABASE_ANON_KEY           — anon key do projeto/local
 *   SUPABASE_SERVICE_ROLE_KEY   — service role key (para criar utilizadores e semear)
 *
 * Se as variáveis não estiverem definidas, a suite é ignorada (skip) em vez
 * de falhar — assim não quebra em ambientes sem Supabase. A CI (Tarefa 2.4)
 * define-as contra um Supabase local.
 */
import { createClient, type SupabaseClient } from "@supabase/supabase-js";

export const SUPABASE_URL = process.env.SUPABASE_URL ?? "";
export const ANON_KEY = process.env.SUPABASE_ANON_KEY ?? "";
export const SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY ?? "";

/** true se o ambiente tem tudo o que a suite precisa. */
export const hasEnv = Boolean(SUPABASE_URL && ANON_KEY && SERVICE_KEY);

/** Cliente com a anon key, sem sessão (equivale a um visitante anónimo). */
export function anonClient(): SupabaseClient {
  return createClient(SUPABASE_URL, ANON_KEY, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
}

/** Cliente com privilégios de service role (ignora RLS) — só para setup/teardown. */
export function serviceClient(): SupabaseClient {
  return createClient(SUPABASE_URL, SERVICE_KEY, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
}

/**
 * Cliente autenticado como um access token concreto. As chamadas usam a anon
 * key como apikey (como o browser) mas o header Authorization leva o JWT do
 * utilizador — é assim que o PostgREST resolve auth.uid()/role.
 */
export function userClient(accessToken: string): SupabaseClient {
  return createClient(SUPABASE_URL, ANON_KEY, {
    auth: { persistSession: false, autoRefreshToken: false },
    global: { headers: { Authorization: `Bearer ${accessToken}` } },
  });
}

export type TestUser = {
  id: string;
  email: string;
  password: string;
  accessToken: string;
};

const PASSWORD = "Test-Passw0rd!";

/**
 * Cria (ou reutiliza) um utilizador confirmado e devolve o seu access token.
 * Usa a admin API (service role) para criar já confirmado, depois faz login
 * com o cliente anónimo para obter o token de sessão real.
 */
export async function createConfirmedUser(email: string): Promise<TestUser> {
  const svc = serviceClient();

  // Cria confirmado (idempotente: se já existir, apanha e segue para login)
  const { data: created, error: createErr } = await svc.auth.admin.createUser({
    email,
    password: PASSWORD,
    email_confirm: true,
  });

  let userId = created?.user?.id;
  if (createErr && !/already been registered|already exists/i.test(createErr.message)) {
    throw createErr;
  }

  const anon = anonClient();
  const { data: signIn, error: signErr } = await anon.auth.signInWithPassword({
    email,
    password: PASSWORD,
  });
  if (signErr || !signIn.session) {
    throw signErr ?? new Error(`Falha a autenticar ${email}`);
  }
  userId = userId ?? signIn.user.id;

  return {
    id: userId!,
    email,
    password: PASSWORD,
    accessToken: signIn.session.access_token,
  };
}

/** Apaga utilizadores de teste (por id) via admin API. */
export async function deleteUsers(ids: string[]): Promise<void> {
  const svc = serviceClient();
  for (const id of ids) {
    await svc.auth.admin.deleteUser(id).catch(() => undefined);
  }
}

/** Chamada RPC crua a /rest/v1/rpc/<fn> com uma dada chave/token. */
export async function rpcRaw(
  fnName: string,
  body: Record<string, unknown>,
  opts: { apikey: string; token?: string }
): Promise<{ status: number; json: unknown }> {
  const res = await fetch(`${SUPABASE_URL}/rest/v1/rpc/${fnName}`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      apikey: opts.apikey,
      Authorization: `Bearer ${opts.token ?? opts.apikey}`,
    },
    body: JSON.stringify(body),
  });
  let json: unknown = null;
  try {
    json = await res.json();
  } catch {
    json = null;
  }
  return { status: res.status, json };
}

/** POST cru a /rest/v1/<tabela> (insere) com uma dada chave/token. */
export async function restInsert(
  table: string,
  row: Record<string, unknown>,
  opts: { apikey: string; token?: string }
): Promise<{ status: number; json: unknown }> {
  const res = await fetch(`${SUPABASE_URL}/rest/v1/${table}`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      apikey: opts.apikey,
      Authorization: `Bearer ${opts.token ?? opts.apikey}`,
      Prefer: "return=representation",
    },
    body: JSON.stringify(row),
  });
  let json: unknown = null;
  try {
    json = await res.json();
  } catch {
    json = null;
  }
  return { status: res.status, json };
}
