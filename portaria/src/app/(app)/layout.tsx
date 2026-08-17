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
      { href: "/configuracao/documentos-administracao", label: "Arquivo confidencial" },
      { href: "/comunicacoes", label: "Comunicações" },
      { href: "/configuracao/avisos", label: "Avisos" },
      { href: "/blueprints", label: "Modelos" },
      { href: "/configuracao/reservas", label: "Reservas" },
      { href: "/configuracao/financeiro", label: "Financeiro" },
      { href: "/configuracao/manutencao", label: "Manutenção preventiva" },
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
      { href: "/ia", label: "Assistente IA" },
      { href: "/votacoes", label: "Votações" },
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
      { href: "/avisos", label: "Mural" },
      { href: "/documentos", label: "Documentos" },
      { href: "/ocorrencias", label: "Ocorrências" },
      { href: "/assembleias", label: "Assembleias" },
      { href: "/votacoes", label: "Votações" },
      { href: "/reservas", label: "Reservas" },
      { href: "/financeiro", label: "Financeiro" },
      { href: "/ia", label: "Assistente IA" },
      { href: "/regulamento", label: "Regulamento" },
    ],
  },
];

// Inquilino: mural + ocorrências + regulamento. Sem financeiro nem assembleias.
const GRUPOS_INQUILINO: NavGrupo[] = [
  {
    itens: [
      { href: "/avisos", label: "Mural" },
      { href: "/ocorrencias", label: "Ocorrências" },
      { href: "/regulamento", label: "Regulamento" },
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

  const role = ctx.membership.role;
  const isAdmin = role === "admin";

  // Vistas disponíveis: os admins podem pré-visualizar as três; um inquilino
  // vê a vista de inquilino; os restantes veem a vista de condómino.
  const vistas: Vista[] = isAdmin
    ? ["admin", "condomino", "inquilino"]
    : role === "inquilino"
    ? ["inquilino"]
    : ["condomino"];

  const cookieStore = await cookies();
  const raw = cookieStore.get("portaria-vista")?.value as Vista | undefined;
  const vista: Vista =
    isAdmin && raw && vistas.includes(raw) ? raw : vistas[0];

  const grupos =
    vista === "admin"
      ? GRUPOS_ADMIN
      : vista === "inquilino"
      ? GRUPOS_INQUILINO
      : GRUPOS_CONDOMINO;

  return (
    <div className="min-h-screen bg-softCream/30 lg:flex">
      <AppNav
        tenantNome={ctx.tenant.nome}
        userEmail={ctx.user.email ?? ""}
        fracao={ctx.membership.fracao}
        grupos={grupos}
        vista={vista}
        vistas={vistas}
      />
      <main className="flex-1 min-w-0 px-6 py-10 md:px-12 max-w-5xl">
        {children}
      </main>
      {/* Conselheira: presença proactiva para a administração */}
      {vista === "admin" && <Conselheira />}
    </div>
  );
}
