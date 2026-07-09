import { redirect } from "next/navigation";
import Link from "next/link";
import { getCurrentUserInTenant } from "@/lib/supabase/tenant";

/**
 * Layout das páginas de configuração (admin).
 *
 * Proteção dupla:
 * 1. O middleware refresca a sessão Supabase em cada request (renova tokens).
 *    A imposição de autenticação acontece aqui e no layout (app): sem sessão
 *    válida ou sem pertencer ao tenant, redirecciona-se.
 * 2. Esta verificação confirma que o utilizador tem role 'admin' no tenant
 *
 * Note-se que a proteção real está nas políticas RLS do Supabase: mesmo que
 * alguém contornasse esta verificação, a base de dados rejeitaria as
 * mutations. Isto é apenas conveniência de UX.
 */
export default async function ConfiguracaoLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const ctx = await getCurrentUserInTenant();
  if (!ctx) redirect("/login");
  if (ctx.membership.role !== "admin") redirect("/avisos");

  return (
    <div className="space-y-8">
      <div className="border-b border-warmBeige/30 pb-4">
        <p className="font-body text-xs tracking-widest uppercase text-oliveGray mb-1">
          Configuração · Administração
        </p>
        <nav className="flex gap-6 mt-3 flex-wrap">
          <ConfigNavLink href="/configuracao/perfil">Perfil</ConfigNavLink>
          <ConfigNavLink href="/configuracao/fracoes">Frações</ConfigNavLink>
          <ConfigNavLink href="/configuracao/avisos">Avisos</ConfigNavLink>
          <ConfigNavLink href="/configuracao/documentos">Documentos</ConfigNavLink>
          <ConfigNavLink href="/configuracao/ocorrencias">Ocorrências</ConfigNavLink>
          <ConfigNavLink href="/configuracao/assembleias">Assembleias</ConfigNavLink>
          <ConfigNavLink href="/configuracao/membros">Membros</ConfigNavLink>
        </nav>
      </div>
      {children}
    </div>
  );
}

function ConfigNavLink({
  href,
  children,
}: {
  href: string;
  children: React.ReactNode;
}) {
  return (
    <Link
      href={href}
      className="font-body text-sm text-oliveGray hover:text-ink transition-colors"
    >
      {children}
    </Link>
  );
}
