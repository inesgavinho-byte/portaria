import { redirect } from "next/navigation";
import { cookies } from "next/headers";
import { getCurrentUserInTenant } from "@/lib/supabase/tenant";
import { AppNav, type NavGrupo } from "@/components/layout/app-nav";
import { PesquisaGlobal } from "@/components/layout/pesquisa-global";
import { Conselheira } from "@/components/conselheira/conselheira";
import type { Vista } from "@/lib/actions/vista";

const GRUPOS_ADMIN: NavGrupo[] = [
  { itens: [{ href: "/hoje", label: "Hoje" }] },
  {
    titulo: "Operação",
    itens: [
      { href: "/configuracao/ocorrencias", label: "Ocorrências" },
      {
        href: "/configuracao/manutencao",
        label: "Manutenção",
        filhos: [
          { href: "/calendario", label: "Calendário" },
        ],
      },
      { href: "/configuracao/reservas", label: "Reservas" },
    ],
  },
  {
    titulo: "Condomínio",
    itens: [
      {
        href: "/fracoes",
        label: "Pessoas e frações",
        filhos: [
          { href: "/contactos", label: "Contactos" },
        ],
      },
      {
        href: "/configuracao/assembleias",
        label: "Assembleias",
        filhos: [
          { href: "/votacoes", label: "Votações" },
        ],
      },
      { href: "/configuracao/avisos", label: "Avisos" },
      { href: "/comunicacoes", label: "Comunicações" },
    ],
  },
  {
    titulo: "Financeiro",
    itens: [
      {
        href: "/configuracao/financeiro",
        label: "Financeiro",
        filhos: [
          { href: "/configuracao/financeiro/mapa", label: "Mapa de contas" },
          { href: "/contribuicoes-extraordinarias", label: "Contribuições extraordinárias" },
        ],
      },
      { href: "/fornecedores", label: "Fornecedores" },
      { href: "/contratos", label: "Contratos" },
    ],
  },
  {
    titulo: "Documentos",
    itens: [
      { href: "/configuracao/documentos", label: "Documentos publicados" },
      {
        href: "/configuracao/documentos-administracao",
        label: "Arquivo administrativo",
        filhos: [
          { href: "/configuracao/documentos-administracao/importar-drive", label: "Importar do Drive" },
        ],
      },
      { href: "/blueprints", label: "Modelos" },
    ],
  },
  {
    titulo: "Conhecimento",
    itens: [
      { href: "/ia", label: "Assistente" },
      { href: "/timeline", label: "Timeline" },
      { href: "/conversas", label: "Conversas" },
    ],
  },
  {
    titulo: "Sistema",
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
      { href: "/ia", label: "Assistente" },
      { href: "/regulamento", label: "Regulamento" },
    ],
  },
];

const GRUPOS_INQUILINO: NavGrupo[] = [
  {
    itens: [
      { href: "/avisos", label: "Mural" },
      { href: "/ocorrencias", label: "Ocorrências" },
      { href: "/regulamento", label: "Regulamento" },
    ],
  },
];

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const ctx = await getCurrentUserInTenant();
  if (!ctx) redirect("/login");

  const role = ctx.membership.role;
  const isAdmin = role === "admin";
  const vistas: Vista[] = isAdmin ? ["admin", "condomino", "inquilino"] : role === "inquilino" ? ["inquilino"] : ["condomino"];

  const cookieStore = await cookies();
  const raw = cookieStore.get("portaria-vista")?.value as Vista | undefined;
  const vista: Vista = isAdmin && raw && vistas.includes(raw) ? raw : vistas[0];
  const grupos = vista === "admin" ? GRUPOS_ADMIN : vista === "inquilino" ? GRUPOS_INQUILINO : GRUPOS_CONDOMINO;

  return (
    <div className="min-h-screen lg:flex">
      <AppNav tenantNome={ctx.tenant.nome} userEmail={ctx.user.email ?? ""} fracao={ctx.membership.fracao} grupos={grupos} vista={vista} vistas={vistas} />
      <div className="min-w-0 flex-1">
        {vista === "admin" && (
          <div className="sticky top-0 z-30 border-b border-white/60 bg-[#edf3f0]/75 px-5 py-3 backdrop-blur-xl md:px-8 lg:px-10 xl:px-12">
            <PesquisaGlobal />
          </div>
        )}
        <main className="px-5 py-8 md:px-8 lg:px-10 xl:px-12">
          <div className="mx-auto w-full max-w-6xl">{children}</div>
        </main>
      </div>
      {vista === "admin" && <Conselheira />}
    </div>
  );
}
