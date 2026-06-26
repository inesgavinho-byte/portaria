import { createServerClient, type CookieOptions } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";

/**
 * Middleware central — corre em cada request.
 *
 * Tem duas responsabilidades:
 * 1. Refrescar a sessão Supabase (renova tokens automaticamente)
 * 2. Identificar o tenant pelo hostname e passá-lo via header para a app
 */
export async function middleware(request: NextRequest) {
  // ----- 1. Identificação do tenant pelo hostname -----
  // Em produção: edificioeuropa.pt → tenant "europa"
  // Em dev local: localhost → tenant default ("europa") para teste
  const hostname = request.headers.get("host") ?? "";
  const tenantSlug = resolveTenantFromHostname(hostname);

  // O slug tem de ir nos headers do PEDIDO (não da resposta) para que os
  // Server Components o consigam ler via `headers()`. Os headers da resposta
  // só chegam ao browser, não ao render server-side.
  const requestHeaders = new Headers(request.headers);
  requestHeaders.set("x-tenant-slug", tenantSlug);

  let response = NextResponse.next({
    request: { headers: requestHeaders },
  });

  // ----- 2. Refresh da sessão Supabase -----
  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
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

/**
 * Mapeia hostname para slug de tenant.
 *
 * Estratégia recomendada (Opção 2 do plano): cada prédio tem domínio próprio,
 * todos apontam para a mesma app, e este mapeamento decide qual é qual.
 *
 * Para já: hardcoded; quando houver mais prédios, mover para tabela `tenants`
 * no Supabase e fazer cache desta resolução.
 */
function resolveTenantFromHostname(hostname: string): string {
  // Remove porta (localhost:3000 → localhost)
  const host = hostname.split(":")[0].toLowerCase();

  // Mapeamento estático (substituir por lookup à tabela `tenants` no futuro)
  const map: Record<string, string> = {
    "edificioeuropa.pt": "europa",
    "www.edificioeuropa.pt": "europa",
    // Adicionar futuros prédios aqui
  };

  if (map[host]) return map[host];

  // Localhost / preview Netlify → tenant default para desenvolvimento
  if (host === "localhost" || host.endsWith(".netlify.app")) {
    return "europa";
  }

  // Fallback: extrair primeiro segmento (ex: outropredio.com → outropredio)
  return host.split(".")[0];
}

export const config = {
  matcher: [
    // Excluir ficheiros estáticos e API internas do Next.js
    "/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)",
  ],
};
