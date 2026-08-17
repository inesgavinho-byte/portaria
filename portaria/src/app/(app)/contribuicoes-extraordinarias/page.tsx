import Link from "next/link";
import { Landmark, Building2, CalendarDays } from "lucide-react";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { requireAdmin } from "@/lib/supabase/tenant";
import type { ContribuicaoExtraordinaria, ContribuicaoPrestacao } from "@/types/database";

const EURO = new Intl.NumberFormat("pt-PT", { style: "currency", currency: "EUR" });

const ESTADO_LABEL: Record<ContribuicaoExtraordinaria["estado"], string> = {
  rascunho: "Rascunho",
  ativa: "Ativa",
  encerrada: "Encerrada",
  arquivada: "Arquivada",
  cancelada: "Cancelada",
};

type ContribuicaoComPrestacoes = ContribuicaoExtraordinaria & {
  contribuicao_prestacoes: ContribuicaoPrestacao[] | null;
};

export default async function ContribuicoesExtraordinariasPage() {
  const ctx = await requireAdmin();
  if (!ctx) redirect("/avisos");

  const supabase = await createClient();
  const { data } = await supabase
    .from("contribuicoes_extraordinarias")
    .select("*, contribuicao_prestacoes(*)")
    .eq("tenant_id", ctx.tenant.id)
    .order("criado_em", { ascending: false });
  const contribuicoes = (data ?? []) as ContribuicaoComPrestacoes[];
  const total = contribuicoes.reduce((soma, item) => soma + item.total_cents, 0);
  const prestacoes = contribuicoes.flatMap((item) => item.contribuicao_prestacoes ?? []);
  const liquidadas = prestacoes.filter((item) => item.estado === "liquidada").length;

  return (
    <div>
      <div className="mb-8 flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="font-body text-xs tracking-[0.18em] uppercase text-warmBeige mb-2">Financeiro administrativo</p>
          <h1 className="font-title text-h1 text-ink mb-2">Contribuições extraordinárias</h1>
          <p className="font-body text-oliveGray max-w-2xl">
            Operações de obras e deliberações financiadas à parte das quotas regulares, com distribuição e histórico por fração.
          </p>
        </div>
        <Link href="/contribuicoes-extraordinarias/nova" className="shrink-0 px-5 py-3 bg-ink text-paper font-body text-xs tracking-widest uppercase text-center">Nova contribuição</Link>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-3 gap-3 mb-8">
        <div className="bg-paper border border-warmBeige/20 p-4"><p className="font-body text-xs tracking-widest uppercase text-oliveGray">Operações</p><p className="font-title text-3xl text-ink mt-2">{contribuicoes.length}</p></div>
        <div className="bg-paper border border-warmBeige/20 p-4"><p className="font-body text-xs tracking-widest uppercase text-oliveGray">Total registado</p><p className="font-title text-3xl text-ink mt-2">{EURO.format(total / 100)}</p></div>
        <div className="bg-paper border border-warmBeige/20 p-4"><p className="font-body text-xs tracking-widest uppercase text-oliveGray">Prestações liquidadas</p><p className="font-title text-3xl text-success mt-2">{liquidadas}/{prestacoes.length}</p></div>
      </div>

      {contribuicoes.length === 0 ? (
        <div className="bg-paper border border-warmBeige/20 p-10 text-center">
          <Landmark className="w-6 h-6 text-warmBeige mx-auto mb-4" />
          <h2 className="font-title text-xl text-ink mb-2">Ainda não há contribuições extraordinárias.</h2>
          <p className="font-body text-sm text-oliveGray max-w-md mx-auto">As obras e chamadas de capital serão registadas aqui, sempre separadas das quotas mensais.</p>
        </div>
      ) : (
        <div className="bg-paper border border-warmBeige/20 divide-y divide-warmBeige/10">
          {contribuicoes.map((contribuicao) => {
            const lista = contribuicao.contribuicao_prestacoes ?? [];
            const vencimentoInicial = lista.length > 0
              ? [...lista].sort((a, b) => a.vencimento.localeCompare(b.vencimento))[0].vencimento
              : null;
            return (
              <Link key={contribuicao.id} href={`/contribuicoes-extraordinarias/${contribuicao.id}`} className="block p-5 hover:bg-softCream/40 transition-colors">
                <div className="flex gap-4 items-start">
                  <Building2 className="w-5 h-5 shrink-0 text-warmBeige mt-1" />
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-x-3 gap-y-1"><h2 className="font-title text-xl text-ink">{contribuicao.titulo}</h2><span className="font-body text-[10px] uppercase tracking-widest px-2 py-1 bg-softCream text-oliveGray">{ESTADO_LABEL[contribuicao.estado]}</span></div>
                    <p className="font-body text-sm text-oliveGray mt-1">{contribuicao.referencia ?? "Sem referência"}</p>
                    <div className="flex flex-wrap gap-x-4 gap-y-1 mt-3 font-body text-xs text-oliveGray"><span>{EURO.format(contribuicao.total_cents / 100)}</span><span>{lista.length} {lista.length === 1 ? "prestação" : "prestações"}</span>{vencimentoInicial && <span className="inline-flex items-center gap-1"><CalendarDays className="w-3.5 h-3.5" /> Início: {new Date(`${vencimentoInicial}T00:00:00`).toLocaleDateString("pt-PT")}</span>}</div>
                  </div>
                </div>
              </Link>
            );
          })}
        </div>
      )}
    </div>
  );
}
