"use client";

import { useRouter } from "next/navigation";
import { useTransition } from "react";
import { AlertTriangle, CheckCircle2, Clock3 } from "lucide-react";
import type { LinhaMapaContas, MapaContasAnual } from "@/lib/actions/mapa-contas";

function euro(cents: number | null | undefined) {
  if (cents === null || cents === undefined) return "—";
  return (cents / 100).toLocaleString("pt-PT", { style: "currency", currency: "EUR" });
}

function profundidade(codigo: string) {
  return Math.max(0, codigo.split(".").length - 1);
}

function isCabecalho(linha: LinhaMapaContas) {
  return ["1", "2", "3", "4"].includes(linha.codigo);
}

function badgeEstado(estado: LinhaMapaContas["estadoReconciliacao"]) {
  if (estado === "reconciliado") return <span className="inline-flex items-center gap-1 text-xs text-emerald-700"><CheckCircle2 className="h-3.5 w-3.5" />Reconciliado</span>;
  if (estado === "discrepancia") return <span className="inline-flex items-center gap-1 text-xs text-red-700"><AlertTriangle className="h-3.5 w-3.5" />Discrepância</span>;
  return <span className="inline-flex items-center gap-1 text-xs text-amber-700"><Clock3 className="h-3.5 w-3.5" />{estado === "parcial" ? "Parcial" : "Por reconciliar"}</span>;
}

export function MapaContasAnualView({ mapa }: { mapa: MapaContasAnual }) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();

  function mudarAno(ano: number) {
    startTransition(() => router.push(`/configuracao/financeiro/mapa?ano=${ano}`));
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center gap-2">
        {mapa.anos.map((ano) => (
          <button
            type="button"
            key={ano}
            onClick={() => mudarAno(ano)}
            disabled={pending}
            className={`min-w-[72px] rounded-xl px-4 py-2.5 text-sm font-semibold transition-all ${ano === mapa.ano ? "bg-britishGreen text-white shadow-sm" : "border border-britishGreen/10 bg-white/70 text-ink hover:border-britishGreen/25 hover:text-britishGreen"}`}
          >
            {ano}
          </button>
        ))}
        <button type="button" disabled title="O histórico é criado à medida que os documentos são importados" className="rounded-xl border border-dashed border-britishGreen/15 px-4 py-2.5 text-sm text-oliveGray opacity-70">
          + Adicionar histórico
        </button>
      </div>

      {mapa.exercicio && (
        <div className="portaria-panel p-5 md:p-6">
          <div className="flex flex-col gap-2 md:flex-row md:items-start md:justify-between">
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.12em] text-britishGreen">Exercício {mapa.ano}</p>
              <h2 className="mt-1 text-2xl font-semibold tracking-[-0.03em] text-ink">{mapa.exercicio.titulo ?? `Mapa de contas ${mapa.ano}`}</h2>
              {mapa.exercicio.observacoes && <p className="mt-2 max-w-3xl text-sm leading-6 text-oliveGray">{mapa.exercicio.observacoes}</p>}
            </div>
            <div className="rounded-full bg-britishGreenSoft px-3 py-1.5 text-xs font-semibold uppercase tracking-[0.08em] text-britishGreen">{mapa.exercicio.estado}</div>
          </div>
        </div>
      )}

      <div className="grid gap-3 md:grid-cols-3 xl:grid-cols-6">
        <ResumoCard label="Orçamento despesas" valor={mapa.resumo.orcamentoDespesasCents} />
        <ResumoCard label="Realizado despesas" valor={mapa.resumo.realizadoDespesasCents} />
        <ResumoCard label="Comprometido" valor={mapa.resumo.comprometidoDespesasCents} />
        <ResumoCard label="Orçamento receitas" valor={mapa.resumo.orcamentoReceitasCents} />
        <ResumoCard label="Recebido" valor={mapa.resumo.realizadoReceitasCents} />
        <ResumoCard label="Saldo projectado" valor={mapa.resumo.saldoProjetadoCents} destaque />
      </div>

      <div className="overflow-hidden rounded-2xl border border-britishGreen/10 bg-white/75 backdrop-blur-xl">
        <div className="overflow-x-auto">
          <table className="min-w-[980px] w-full border-collapse text-sm">
            <thead>
              <tr className="border-b border-britishGreen/10 bg-britishGreenSoft/45 text-left text-xs uppercase tracking-[0.08em] text-oliveGray">
                <th className="px-4 py-3 font-semibold">Código</th>
                <th className="px-4 py-3 font-semibold">Conta</th>
                <th className="px-4 py-3 text-right font-semibold">Orçamento</th>
                <th className="px-4 py-3 text-right font-semibold">Realizado</th>
                <th className="px-4 py-3 text-right font-semibold">Comprometido</th>
                <th className="px-4 py-3 text-right font-semibold">Previsão</th>
                <th className="px-4 py-3 text-right font-semibold">Desvio</th>
                <th className="px-4 py-3 font-semibold">Estado</th>
              </tr>
            </thead>
            <tbody>
              {mapa.linhas.map((linha) => {
                const cabecalho = isCabecalho(linha);
                const depth = profundidade(linha.codigo);
                const discrepanciaDeclarada = linha.desvioDeclaradoCents !== null && linha.desvioCents !== null && linha.desvioDeclaradoCents !== linha.desvioCents;
                return (
                  <tr key={linha.id} className={`border-b border-britishGreen/8 last:border-0 ${cabecalho ? "bg-[#f7faf8]" : "hover:bg-britishGreenSoft/25"}`}>
                    <td className={`px-4 py-3 font-mono text-xs ${cabecalho ? "font-bold text-britishGreen" : "text-oliveGray"}`}>{linha.codigo}</td>
                    <td className="px-4 py-3" style={{ paddingLeft: `${16 + depth * 18}px` }}>
                      <div className={cabecalho ? "font-semibold text-ink" : "text-ink"}>{linha.descricao}</div>
                      {linha.fonteCalculo !== "manual" && <div className="mt-1 text-[11px] uppercase tracking-[0.06em] text-britishGreen">actualização automática</div>}
                    </td>
                    <td className="px-4 py-3 text-right tabular-nums text-ink">{euro(linha.orcamentoCents)}</td>
                    <td className="px-4 py-3 text-right tabular-nums text-ink">{euro(linha.realizadoCents)}</td>
                    <td className="px-4 py-3 text-right tabular-nums text-ink">{euro(linha.comprometidoCents)}</td>
                    <td className="px-4 py-3 text-right tabular-nums text-ink">{euro(linha.previsaoCents)}</td>
                    <td className={`px-4 py-3 text-right tabular-nums ${(linha.desvioCents ?? 0) < 0 ? "text-red-700" : "text-ink"}`}>
                      {euro(linha.desvioCents)}
                      {discrepanciaDeclarada && <div className="mt-1 text-[11px] text-red-700">fonte: {euro(linha.desvioDeclaradoCents)}</div>}
                    </td>
                    <td className="px-4 py-3">{badgeEstado(linha.estadoReconciliacao)}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {mapa.exercicio?.fonteReferencia && (
        <p className="text-xs leading-5 text-oliveGray">Fonte base do exercício: <span className="font-medium text-ink">{mapa.exercicio.fonteReferencia}</span>. Os valores históricos permanecem ligados à fonte; os valores vivos são actualizados pelos movimentos reconciliados no PORTARIA.</p>
      )}
    </div>
  );
}

function ResumoCard({ label, valor, destaque = false }: { label: string; valor: number; destaque?: boolean }) {
  return (
    <div className={`rounded-2xl border p-4 ${destaque ? "border-britishGreen/20 bg-britishGreen text-white" : "border-white/80 bg-white/65"}`}>
      <p className={`text-[11px] font-semibold uppercase tracking-[0.08em] ${destaque ? "text-white/70" : "text-oliveGray"}`}>{label}</p>
      <p className="mt-2 text-lg font-semibold tracking-[-0.025em] tabular-nums">{euro(valor)}</p>
    </div>
  );
}
