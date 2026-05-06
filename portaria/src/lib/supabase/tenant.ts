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
 * USAR APENAS EM SERVER COMPONENTS / ROUTE HANDLERS / SERVER ACTIONS.
 */
export async function getCurrentTenant(): Promise<Tenant | null> {
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
}

/**
 * Obtém o utilizador autenticado e verifica que pertence ao tenant atual.
 * Retorna null se não autenticado ou não pertence ao tenant.
 */
export async function getCurrentUserInTenant() {
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
}
