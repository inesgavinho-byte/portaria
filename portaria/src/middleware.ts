import { createServerClient, type CookieOptions } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";
import { getSupabaseUrl, getSupabaseAnonKey } from "@/lib/supabase/env";

/**
 * Middleware central — corre em cada request.
 *
 * Tem duas responsabilidades:
 * 1. Identificar o tenant pelo hostname (lookup à tabela `tenants`,
 *    com cache em memória) e passá-lo via header para a app
 * 2. Refrescar a sessão Supabase (renova tokens automaticamente)
 */
export async function middleware(request: NextRequest) {
  // ----- 1. Identificação do tenant pelo hostname -----
  const hostname = request.headers.get("host") ?? "";
  const tenantSlug = await resolveTenantFromHostname(hostname);

  // O slug tem de ir nos headers do PEDIDO (não da resposta) para que os
  // Server Components o consigam ler via `headers()`. Sobrepõe-se sempre
  // o valor (mesmo que vazio) para que um cliente malicioso não consiga
  // injetar o seu próprio x-tenant-slug.
  const requestHeaders = new Headers(request.headers);
  if (tenantSlug) {
    requestHeaders.set("x-tenant-slug", tenantSlug);
  } else {
    // Host sem tenant (ex.: domínio do produto): modo landing.
    // As páginas de tenant tratam a ausência como notFound/redirect.
    requestHeaders.delete("x-tenant-slug");
  }

  let response = NextResponse.next({
    request: { headers: requestHeaders },
  });

  // ----- 2. Refresh da sessão Supabase -----
  const supabase = createServerClient(
    getSupabaseUrl(),
    getSupabaseAnonKey(),
    {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet: { name: string; value: string; options?: CookieOptions }[]) {
          cookiesToSet.forEach(({ name, value }) =>
            request.cookies.set(name, value)
          );
          response = NextResponse.next({
            request: { headers: requestHeaders },
          });
          cookiesToSet.forEach(({ name, value, options }) =>
            response.cookies.set(name, value, options)
          );
        },
      },
    }
  );

  // Garante que tokens expirados são renovados
  await supabase.auth.getUser();

  return response;
}

// ----------------------------------------------------------------------
// Resolução hostname → slug de tenant
//
// Fonte: coluna tenants.dominios (migration 0004). Cache em memória por
// instância, com TTL — o lookup só toca na base de dados uma vez por
// host a cada 5 minutos.
//
// Host desconhecido → null (modo landing do produto). NUNCA se deriva
// um slug do próprio hostname: um atacante que aponte um domínio
// arbitrário à app não obtém o site de nenhum tenant.
// ----------------------------------------------------------------------

const CACHE_TTL_MS = 5 * 60 * 1000;
const tenantCache = new Map<string, { slug: string | null; expira: number }>();

async function resolveTenantFromHostname(
  hostname: string
): Promise<string | null> {
  // Remove porta (localhost:3000 → localhost)
  const host = hostname.split(":")[0].toLowerCase();

  // Desenvolvimento local e previews Netlify: tenant default para teste
  if (host === "localhost" || host.endsWith(".netlify.app")) {
    return "europa";
  }

  const emCache = tenantCache.get(host);
  if (emCache && emCache.expira > Date.now()) {
    return emCache.slug;
  }

  const slug = await lookupTenantSlug(host);
  tenantCache.set(host, { slug, expira: Date.now() + CACHE_TTL_MS });
  return slug;
}

/**
 * Consulta PostgREST diretamente (mais leve no middleware do que um
 * cliente Supabase completo). A tabela tenants é publicamente legível
 * (migration 0003), pelo que a anon key chega.
 */
async function lookupTenantSlug(host: string): Promise<string | null> {
  const url = getSupabaseUrl();
  const anonKey = getSupabaseAnonKey();
  if (!url || !anonKey) return null;

  try {
    const query = `${url}/rest/v1/tenants?select=slug&dominios=cs.${encodeURIComponent(
      `{"${host}"}`
    )}&limit=1`;

    const res = await fetch(query, {
      headers: { apikey: anonKey, Authorization: `Bearer ${anonKey}` },
    });

    if (!res.ok) {
      console.error(`Lookup de tenant falhou (${res.status}) para: ${host}`);
      return null;
    }

    const rows: { slug: string }[] = await res.json();
    return rows[0]?.slug ?? null;
  } catch (error) {
    console.error(`Erro no lookup de tenant para: ${host}`, error);
    return null;
  }
}

export const config = {
  matcher: [
    // Excluir ficheiros estáticos e API internas do Next.js
    "/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)",
  ],
};
