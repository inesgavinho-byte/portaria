import Link from "next/link";
import { redirect } from "next/navigation";
import { requireAdmin } from "@/lib/supabase/tenant";
import { createClient } from "@/lib/supabase/server";
import { MovimentoAtribuicao } from "@/components/admin/movimento-atribuicao";
import {
  estadoAtribuicao,
  resumirTriagem,
  sugerirFornecedores,
  type AliasFornecedor,
  type EstadoAtribuicao,
  type FornecedorCandidato,
  type MovimentoAtribuivel,
} from "@/lib/financeiro/atribuicao-movimentos";
import { normalizarPadrao } from "@/lib/financeiro/regras-classificacao";

export const metadata = { title: "Atribuição de movimentos — Portaria" };

const VISTAS: { valor: EstadoAtribuicao | "todos"; label: string }[] = [
  { valor: "pendente", label: "Por triar" },
  { valor: "atribuido", label: "Atribuídos" },
  { valor: "nao_aplicavel", label: "Sem fornecedor" },
  { valor: "todos", label: "Todos" },
];

const euro = (cents: number) =>
  new Intl.NumberFormat("pt-PT", { style: "currency", currency: "EUR" }).format(cents / 100);

const data = (valor: string) =>
  new Intl.DateTimeFormat("pt-PT", { day: "2-digit", month: "short", year: "numeric" }).format(new Date(valor));

/**
 * Padrão pré-preenchido do link «criar regra»: a contraparte extraída, se
 * existir; senão os primeiros ~30 caracteres normalizados da descrição. Já
 * sai normalizado — é exactamente a forma em que a regra é guardada.
 */
function padraoDeMovimento(movimento: MovimentoAtribuivel): string {
  if (movimento.contraparte?.trim()) return normalizarPadrao(movimento.contraparte);
  return normalizarPadrao(movimento.descricao).slice(0, 30).trim();
}

export default async function AtribuicaoMovimentosPage({
  searchParams,
}: {
  searchParams: Promise<{ estado?: string }>;
}) {
  const [ctx, filtros] = await Promise.all([requireAdmin(), searchParams]);
  if (!ctx) redirect("/inicio");

  const supabase = await createClient();
  const [{ data: movimentosData }, { data: fornecedoresData }, { data: aliasesData }] = await Promise.all([
    supabase
      .from("movimentos_bancarios")
      .select(
        "id,data_movimento,tipo,valor_cents,descricao,contraparte,confirmado,despesa_id,fornecedor_id,fornecedor_nao_aplicavel",
      )
      .eq("tenant_id", ctx.tenant.id)
      .order("data_movimento", { ascending: false }),
    supabase
      .from("fornecedores")
      .select("id,nome,ativo")
      .eq("tenant_id", ctx.tenant.id)
      .order("nome", { ascending: true }),
    supabase
      .from("fornecedores_aliases")
      .select("fornecedor_id,alias")
      .eq("tenant_id", ctx.tenant.id),
  ]);

  const movimentos = (movimentosData ?? []) as MovimentoAtribuivel[];
  const fornecedores = (fornecedoresData ?? []) as FornecedorCandidato[];
  const aliases: AliasFornecedor[] = (aliasesData ?? []).map((entrada) => ({
    fornecedorId: entrada.fornecedor_id,
    alias: entrada.alias,
  }));
  const resumo = resumirTriagem(movimentos);

  const vista = VISTAS.some((v) => v.valor === filtros.estado)
    ? (filtros.estado as EstadoAtribuicao | "todos")
    : "pendente";
  const visiveis = vista === "todos" ? movimentos : movimentos.filter((m) => estadoAtribuicao(m) === vista);

  const nomePorFornecedor = new Map(fornecedores.map((f) => [f.id, f.nome]));
  const totais: Record<EstadoAtribuicao | "todos", number> = {
    pendente: resumo.pendentes,
    atribuido: resumo.atribuidos,
    nao_aplicavel: resumo.naoAplicaveis,
    todos: movimentos.length,
  };

  return (
    <div className="max-w-5xl">
      <div className="mb-7">
        <p className="mb-1 font-body text-xs font-semibold uppercase tracking-[0.12em] text-britishGreen">Financeiro</p>
        <div className="flex flex-wrap items-center justify-between gap-3">
          <h1 className="font-title text-h1 text-ink">Atribuição de movimentos</h1>
          <div className="flex flex-wrap items-center gap-2">
            <Link
              href="/configuracao/financeiro/movimentos/importar"
              className="rounded-lg border border-britishGreen/15 px-3 py-1.5 font-body text-xs font-semibold text-oliveGray transition-colors hover:text-britishGreen"
            >
              Importar extrato
            </Link>
            <Link
              href="/configuracao/financeiro/movimentos/recebimentos"
              className="rounded-lg border border-britishGreen/15 px-3 py-1.5 font-body text-xs font-semibold text-oliveGray transition-colors hover:text-britishGreen"
            >
              Recebimentos
            </Link>
            <Link
              href="/configuracao/financeiro/movimentos/regras"
              className="rounded-lg border border-britishGreen/15 px-3 py-1.5 font-body text-xs font-semibold text-oliveGray transition-colors hover:text-britishGreen"
            >
              Regras
            </Link>
          </div>
        </div>
        <p className="mt-2 max-w-3xl font-body text-sm leading-6 text-oliveGray">
          A quem pertence cada movimento bancário. Esta decisão alimenta as saídas confirmadas na ficha de cada
          fornecedor. Atribuir um fornecedor não reconcilia nenhuma factura — são decisões separadas.
        </p>
      </div>

      <div className="mb-6 grid gap-3 sm:grid-cols-3">
        <Cartao label="Por triar" valor={String(resumo.pendentes)} destaque={resumo.pendentes > 0} />
        <Cartao label="Débitos confirmados por triar" valor={euro(resumo.valorPendenteCents)} />
        <Cartao label="Já decididos" valor={String(resumo.atribuidos + resumo.naoAplicaveis)} />
      </div>

      <nav className="mb-5 flex flex-wrap gap-1.5 border-b border-britishGreen/15 pb-4">
        {VISTAS.map((v) => (
          <Link
            key={v.valor}
            href={`/configuracao/financeiro/movimentos?estado=${v.valor}`}
            className={`rounded-lg px-3 py-1.5 font-body text-xs font-semibold transition-colors ${
              v.valor === vista
                ? "bg-britishGreen text-white"
                : "border border-britishGreen/15 text-oliveGray hover:text-britishGreen"
            }`}
          >
            {v.label} <span className="tabular-nums opacity-70">{totais[v.valor]}</span>
          </Link>
        ))}
      </nav>

      {visiveis.length === 0 ? (
        <p className="border-l-2 border-warmBeige/50 bg-softCream/40 px-4 py-3 font-body text-sm text-oliveGray">
          {vista === "pendente"
            ? "Não há movimentos por triar. Todos os movimentos têm fornecedor atribuído ou foram marcados como não aplicáveis."
            : "Nenhum movimento nesta vista."}
        </p>
      ) : (
        <ul className="space-y-3">
          {visiveis.map((movimento) => (
            <li key={movimento.id} className="portaria-panel px-5 py-4">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div className="min-w-0">
                  <div className="mb-1 flex flex-wrap items-center gap-2">
                    <span className="font-body text-xs text-oliveGray">{data(movimento.data_movimento)}</span>
                    <span
                      className={`rounded-full px-2 py-0.5 font-body text-[0.65rem] font-semibold uppercase tracking-[0.06em] ${
                        movimento.tipo === "debito"
                          ? "bg-alert/10 text-alert"
                          : "bg-britishGreenSoft text-britishGreen"
                      }`}
                    >
                      {movimento.tipo === "debito" ? "Débito" : "Crédito"}
                    </span>
                    {!movimento.confirmado && (
                      <span className="rounded-full border border-oliveGray/30 px-2 py-0.5 font-body text-[0.65rem] text-oliveGray">
                        por confirmar
                      </span>
                    )}
                    {movimento.despesa_id && (
                      <span className="rounded-full bg-britishGreenSoft px-2 py-0.5 font-body text-[0.65rem] text-britishGreen">
                        ligado a factura
                      </span>
                    )}
                  </div>
                  <p className="font-body text-sm font-medium text-ink">{movimento.descricao}</p>
                  {movimento.contraparte && (
                    <p className="mt-0.5 font-body text-xs text-oliveGray">Contraparte: {movimento.contraparte}</p>
                  )}
                  {estadoAtribuicao(movimento) === "pendente" && (
                    <Link
                      href={`/configuracao/financeiro/movimentos/regras?padrao=${encodeURIComponent(padraoDeMovimento(movimento))}`}
                      className="mt-1 inline-block font-body text-[0.68rem] font-semibold text-britishGreen/80 transition-colors hover:text-britishGreen"
                    >
                      criar regra
                    </Link>
                  )}
                </div>
                <p className="font-body text-base font-semibold tabular-nums text-ink">{euro(movimento.valor_cents)}</p>
              </div>

              <MovimentoAtribuicao
                movimentoId={movimento.id}
                estado={estadoAtribuicao(movimento)}
                fornecedorId={movimento.fornecedor_id}
                fornecedorNome={movimento.fornecedor_id ? nomePorFornecedor.get(movimento.fornecedor_id) ?? null : null}
                fornecedores={fornecedores}
                sugestoes={
                  estadoAtribuicao(movimento) === "pendente"
                    ? sugerirFornecedores(movimento, fornecedores, 3, aliases)
                    : []
                }
              />
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

function Cartao({ label, valor, destaque = false }: { label: string; valor: string; destaque?: boolean }) {
  return (
    <div className="portaria-panel px-4 py-4">
      <p className="font-body text-[0.67rem] font-semibold uppercase tracking-[0.11em] text-oliveGray">{label}</p>
      <p
        className={`mt-2 font-body text-xl font-semibold tracking-[-0.025em] ${destaque ? "text-alert" : "text-ink"}`}
      >
        {valor}
      </p>
    </div>
  );
}
