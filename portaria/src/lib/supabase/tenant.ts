import { cache } from "react";
import { headers } from "next/headers";
import { createClient } from "@/lib/supabase/server";
import type { Tenant } from "@/types/database";

/**
 * Obtém o tenant da request atual.
 *
 * O middleware (src/middleware.ts) identifica o tenant pelo hostname e
 * coloca o slug no header `x-tenant-slug`. Esta função lê esse header
 * e busca os dados completos do tenant no Supabase.
 *
 * Memoizada com React.cache(): dentro da mesma request, layouts,
 * páginas e metadata partilham o mesmo resultado — uma única query.
 *
 * USAR APENAS EM SERVER COMPONENTS / ROUTE HANDLERS / SERVER ACTIONS.
 */
export const getCurrentTenant = cache(async (): Promise<Tenant | null> => {
  const headerList = await headers();
  const slug = headerList.get("x-tenant-slug");

  if (!slug) return null;

  const supabase = await createClient();
  const { data, error } = await supabase
    .from("tenants")
    .select("*")
    .eq("slug", slug)
    .single();

  if (error || !data) {
    console.error(`Tenant não encontrado para slug: ${slug}`, error);
    return null;
  }

  return data as Tenant;
});

/**
 * Obtém o utilizador autenticado e verifica que pertence ao tenant atual.
 * Retorna null se não autenticado ou não pertence ao tenant.
 *
 * Memoizada com React.cache(): o layout, a página e as actions da mesma
 * request partilham o resultado.
 */
export const getCurrentUserInTenant = cache(async () => {
  const supabase = await createClient();
  const tenant = await getCurrentTenant();

  if (!tenant) return null;

  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return null;

  // Verifica que o utilizador está associado a este tenant
  const { data: membership } = await supabase
    .from("user_tenants")
    .select("*")
    .eq("user_id", user.id)
    .eq("tenant_id", tenant.id)
    .single();

  if (!membership) return null;

  return { user, tenant, membership };
});

/**
 * Contexto do utilizador se (e só se) for admin do tenant atual.
 * Fonte única da verificação de role nas Server Actions e páginas admin.
 */
export async function requireAdmin() {
  const ctx = await getCurrentUserInTenant();
  if (!ctx || ctx.membership.role !== "admin") return null;
  return ctx;
}
