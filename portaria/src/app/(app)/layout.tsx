import { redirect } from "next/navigation";
import { cookies } from "next/headers";
import { getCurrentUserInTenant } from "@/lib/supabase/tenant";
import { AppNav, type NavGrupo } from "@/components/layout/app-nav";
import { PesquisaGlobal } from "@/components/layout/pesquisa-global";
import type { Vista } from "@/lib/actions/vista";

const GRUPOS_ADMIN: NavGrupo[] = [
  {
    itens: [
      { href: "/hoje", label: "Hoje" },
      {
        href: "/comunicacoes",
        label: "Entrada",
        filhos: [
          { href: "/conversas", label: "Conversas" },
          { href: "/configuracao/avisos", label: "Avisos" },
        ],
      },
      {
        href: "/configuracao",
        label: "Edifícios",
        filhos: [
          { href: "/configuracao/ocorrencias", label: "Ocorrências" },
          { href: "/configuracao/manutencao", label: "Manutenção" },
          { href: "/calendario", label: "Calendário" },
          { href: "/fracoes", label: "Pessoas e frações" },
          { href: "/configuracao/assembleias", label: "Assembleias" },
          { href: "/configuracao/reservas", label: "Reservas" },
          { href: "/fornecedores", label: "Fornecedores" },
          { href: "/contratos", label: "Contratos" },
        ],
      },
      {
        href: "/configuracao/financeiro",
        label: "Financeiro",
        filhos: [
          { href: "/configuracao/financeiro/mapa", label: "Mapa de contas" },
          { href: "/configuracao/financeiro/movimentos", label: "Movimentos" },
          { href: "/contribuicoes-extraordinarias", label: "Contribuições" },
        ],
      },
      {
        href: "/configuracao/documentos-administracao",
        label: "Arquivo",
        filhos: [
          { href: "/configuracao/documentos", label: "Documentos publicados" },
          { href: "/blueprints", label: "Modelos" },
          { href: "/timeline", label: "Histórico" },
          { href: "/ia", label: "Pesquisar e perguntar" },
          { href: "/integracoes", label: "Integrações" },
        ],
      },
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

  // `data-chrome="app"` marca o invólucro da aplicação para a impressão o
  // retirar. Sem estas marcas a sidebar, a barra de pesquisa e a conselheira
  // saíam no papel: a regra global que antes as escondia apagava elementos pela
  // forma (`nav, aside, header + div`) e levava conteúdo das páginas com ela,
  // pelo que foi substituída por marcação explícita.
  return (
    <div className="min-h-screen bg-softCream lg:flex">
      <div data-chrome="app" className="contents">
        <AppNav tenantNome={ctx.tenant.nome} userEmail={ctx.user.email ?? ""} fracao={ctx.membership.fracao} grupos={grupos} vista={vista} vistas={vistas} />
      </div>
      <div className="min-w-0 flex-1">
        {vista === "admin" && (
          <div data-chrome="app" className="sticky top-0 z-30 border-b border-black/[0.05] bg-softCream/90 px-5 py-3 backdrop-blur-xl md:px-8 lg:px-10 xl:px-12">
            <div className="mx-auto flex w-full max-w-[1500px] justify-end">
              <PesquisaGlobal />
            </div>
          </div>
        )}
        <main className={`px-5 py-7 md:px-8 lg:px-10 xl:px-12 print:p-0 ${vista === "admin" ? "" : "pb-28 lg:pb-10"}`}>
          {/*
            O invólucro limita as páginas a 72rem (1152px). Um relatório
            editorial precisa de mais do que isso num monitor grande, e o
            `max-w` do próprio relatório nunca chegava a ser o limite efectivo
            porque este era menor. Em vez de duplicar o layout para uma rota,
            o invólucro cede quando o filho se declara documento largo.
          */}
          <div className={`mx-auto w-full ${vista === "admin" ? "max-w-[1500px]" : "max-w-5xl"} has-[[data-documento='largo']]:max-w-[1500px] print:max-w-none`}>
            {children}
          </div>
        </main>
      </div>
    </div>
  );
}
