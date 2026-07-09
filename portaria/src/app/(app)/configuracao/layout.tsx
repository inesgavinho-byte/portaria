import { redirect } from "next/navigation";
import { getCurrentUserInTenant } from "@/lib/supabase/tenant";

/**
 * Layout das páginas de configuração (admin).
 *
 * A navegação principal é a sidebar (src/components/layout/app-nav.tsx);
 * aqui só se impõe o papel de admin. A proteção real está nas políticas
 * RLS do Supabase — isto é conveniência de UX.
 */
export default async function ConfiguracaoLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const ctx = await getCurrentUserInTenant();
  if (!ctx) redirect("/login");
  if (ctx.membership.role !== "admin") redirect("/avisos");

  return <>{children}</>;
}
