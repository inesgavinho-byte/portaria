import { redirect } from "next/navigation";
import { cookies } from "next/headers";
import { getCurrentUserInTenant } from "@/lib/supabase/tenant";
import { AppNav, type NavGrupo } from "@/components/layout/app-nav";
import { Conselheira } from "@/components/conselheira/conselheira";
import type { Vista } from "@/lib/actions/vista";

const GRUPOS_ADMIN: NavGrupo[] = [
  { itens: [{ href: "/inicio", label: "Início" }] },
  {
    titulo: "Gestão",
    itens: [
      { href: "/configuracao/ocorrencias", label: "Ocorrências" },
      { href: "/configuracao/assembleias", label: "Assembleias" },
      { href: "/configuracao/documentos", label: "Documentos" },
      { href: "/configuracao/avisos", label: "Avisos" },
      { href: "/blueprints", label: "Modelos" },
    ],
  },
  {
    titulo: "Registos",
    itens: [
      { href: "/fracoes", label: "Frações" },
      { href: "/fornecedores", label: "Fornecedores" },
      { href: "/contactos", label: "Contactos" },
      { href: "/contratos", label: "Contratos" },
      { href: "/conversas", label: "Conversas" },
    ],
  },
  {
    titulo: "Consulta",
    itens: [
      { href: "/calendario", label: "Calendário" },
      { href: "/timeline", label: "Timeline" },
      { href: "/pesquisa", label: "Pesquisa" },
    ],
  },
  {
    itens: [
      { href: "/integracoes", label: "Integrações" },
      { href: "/configuracao", label: "Configuração" },
    ],
  },
];

const GRUPOS_CONDOMINO: NavGrupo[] = [
  {
    itens: [
      { href: "/avisos", label: "Avisos" },
      { href: "/documentos", label: "Documentos" },
      { href: "/ocorrencias", label: "Ocorrências" },
      { href: "/assembleias", label: "Assembleias" },
    ],
  },
];

export default async function AppLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const ctx = await getCurrentUserInTenant();
  if (!ctx) redirect("/login");

  const isAdmin = ctx.membership.role === "admin";
  const canToggle = isAdmin && !!ctx.membership.fracao_id;

  const cookieStore = await cookies();
  const raw = cookieStore.get("portaria-vista")?.value;
  // Vista efetiva: não-admins são sempre condómino; admins seguem o cookie
  // (default: administração).
  const vista: Vista = isAdmin
    ? raw === "condomino"
      ? "condomino"
      : "admin"
    : "condomino";

  const grupos = vista === "admin" ? GRUPOS_ADMIN : GRUPOS_CONDOMINO;

  return (
    <div className="min-h-screen bg-softCream/30 lg:flex">
      <AppNav
        tenantNome={ctx.tenant.nome}
        userEmail={ctx.user.email ?? ""}
        fracao={ctx.membership.fracao}
        grupos={grupos}
        vista={vista}
        canToggle={canToggle}
      />
      <main className="flex-1 min-w-0 px-6 py-10 md:px-12 max-w-5xl">
        {children}
      </main>
      {/* Conselheira: presença proactiva para a administração */}
      {vista === "admin" && <Conselheira />}
    </div>
  );
}
