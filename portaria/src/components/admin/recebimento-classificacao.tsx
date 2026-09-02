"use client";

import { useState, useTransition } from "react";
import { Check } from "lucide-react";
import {
  registarPagamentoDeMovimento,
  type MovimentoRecebimento,
} from "@/lib/actions/recebimentos";
import { sugerirQuotas, type QuotaPendente } from "@/lib/financeiro/recebimentos";

const euro = (cents: number) =>
  new Intl.NumberFormat("pt-PT", { style: "currency", currency: "EUR" }).format(cents / 100);

const data = (iso: string) =>
  new Intl.DateTimeFormat("pt-PT", { day: "2-digit", month: "short", year: "numeric" }).format(new Date(iso));

const CONFIANCA_LABEL = {
  exacta: "exacta",
  provavel: "provável",
  possivel: "possível",
} as const;

/**
 * Lista de recebimentos por classificar. Clicar numa fracção (chip ou select)
 * mostra as quotas pendentes dela com a combinação sugerida pré-marcada; o
 * servidor volta a validar tudo — daqui só sai uma proposta.
 */
export function RecebimentoClassificacao({ movimentos }: { movimentos: MovimentoRecebimento[] }) {
  return (
    <ul className="space-y-3">
      {movimentos.map((movimento) => (
        <RecebimentoItem key={movimento.id} movimento={movimento} />
      ))}
    </ul>
  );
}

function RecebimentoItem({ movimento }: { movimento: MovimentoRecebimento }) {
  const todasFracoes = movimento.sugestoes.map((sugestao) => sugestao.fracao);
  const [fracaoId, setFracaoId] = useState(movimento.sugestoes[0]?.fracao.id ?? "");
  const fracao = todasFracoes.find((f) => f.id === fracaoId) ?? null;
  const [marcadas, setMarcadas] = useState<Set<string>>(
    () => new Set((movimento.quotasSugeridas?.quotas ?? []).map((quota) => quota.id)),
  );
  const [erro, setErro] = useState<string | null>(null);
  const [feito, setFeito] = useState(false);
  const [isPending, startTransition] = useTransition();

  function escolherFracao(novoId: string) {
    setFracaoId(novoId);
    setErro(null);
    // Pré-marca a combinação que fecha com o movimento para a fracção
    // escolhida — o cálculo é o mesmo módulo puro do servidor.
    const escolhida = todasFracoes.find((f) => f.id === novoId);
    const sugeridas = escolhida ? sugerirQuotas(movimento, escolhida.quotasPendentes) : null;
    setMarcadas(new Set((sugeridas?.quotas ?? []).map((quota) => quota.id)));
  }

  function alternarQuota(quotaId: string) {
    setMarcadas((actual) => {
      const proximo = new Set(actual);
      if (proximo.has(quotaId)) proximo.delete(quotaId);
      else proximo.add(quotaId);
      return proximo;
    });
  }

  const quotasSelecionadas: QuotaPendente[] = (fracao?.quotasPendentes ?? []).filter((quota) =>
    marcadas.has(quota.id),
  );
  const somaSelecionada = quotasSelecionadas.reduce((total, quota) => total + quota.valorCents, 0);
  const excede = somaSelecionada > movimento.valorCents;

  function reconciliar() {
    if (!fracao) return;
    setErro(null);
    startTransition(async () => {
      const formData = new FormData();
      formData.set("movimento_id", movimento.id);
      formData.set("fracao_id", fracao.id);
      formData.set("quota_ids", JSON.stringify(quotasSelecionadas.map((quota) => quota.id)));
      const resultado = await registarPagamentoDeMovimento(formData);
      if (resultado.ok) setFeito(true);
      else setErro(resultado.error);
    });
  }

  if (feito) {
    return (
      <li className="portaria-panel px-5 py-4">
        <p className="font-body text-sm font-semibold text-britishGreen">
          Recebimento reconciliado — {euro(movimento.valorCents)} em {data(movimento.dataMovimento)}.
        </p>
      </li>
    );
  }

  return (
    <li className="portaria-panel px-5 py-4">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="font-body text-xs text-oliveGray">{data(movimento.dataMovimento)}</p>
          <p className="mt-0.5 font-body text-sm font-medium text-ink">{movimento.descricao}</p>
        </div>
        <p className="font-body text-base font-semibold tabular-nums text-ink">{euro(movimento.valorCents)}</p>
      </div>

      {movimento.sugestoes.length > 0 && (
        <div className="mt-3 flex flex-wrap items-center gap-1.5">
          <span className="font-body text-[0.68rem] uppercase tracking-[0.08em] text-oliveGray">Sugestões</span>
          {movimento.sugestoes.map((sugestao) => (
            <button
              key={sugestao.fracao.id}
              type="button"
              title={sugestao.motivo}
              disabled={isPending}
              onClick={() => escolherFracao(sugestao.fracao.id)}
              className={`rounded-lg border px-2.5 py-1 font-body text-[0.7rem] transition-colors disabled:opacity-50 ${
                fracaoId === sugestao.fracao.id
                  ? "border-britishGreen bg-britishGreenSoft text-britishGreen"
                  : "border-britishGreen/20 text-oliveGray hover:text-britishGreen"
              }`}
            >
              {sugestao.fracao.codigo}
              <span className="ml-1.5 opacity-60">{CONFIANCA_LABEL[sugestao.confianca]}</span>
            </button>
          ))}
        </div>
      )}

      <div className="mt-3 border-t border-britishGreen/10 pt-3">
        <label htmlFor={`fracao-${movimento.id}`} className="sr-only">
          Fração
        </label>
        <select
          id={`fracao-${movimento.id}`}
          value={fracaoId}
          disabled={isPending || todasFracoes.length === 0}
          onChange={(evento) => escolherFracao(evento.target.value)}
          className="w-full rounded-xl border border-britishGreen/20 bg-white/80 px-3 py-2 font-body text-sm text-ink disabled:opacity-50"
        >
          <option value="">Escolher fracção…</option>
          {todasFracoes.map((fracao) => (
            <option key={fracao.id} value={fracao.id}>
              {fracao.codigo}
              {fracao.proprietarioNome ? ` — ${fracao.proprietarioNome}` : ""}
            </option>
          ))}
        </select>

        {fracao && (
          <div className="mt-3">
            <p className="font-body text-xs font-semibold uppercase tracking-[0.08em] text-oliveGray">
              Quotas pendentes de {fracao.codigo} ({new Date(movimento.dataMovimento + "T00:00:00").getFullYear()})
            </p>
            {fracao.quotasPendentes.length === 0 ? (
              <p className="mt-2 font-body text-xs text-oliveGray">
                Sem quotas pendentes no ano do movimento para esta fracção.
              </p>
            ) : (
              <ul className="mt-2 space-y-1.5">
                {fracao.quotasPendentes.map((quota) => (
                  <li key={quota.id}>
                    <label className="flex items-center gap-2.5 font-body text-sm text-ink">
                      <input
                        type="checkbox"
                        checked={marcadas.has(quota.id)}
                        onChange={() => alternarQuota(quota.id)}
                        disabled={isPending}
                        className="accent-britishGreen"
                      />
                      {String(quota.mes).padStart(2, "0")}/{quota.ano}
                      <span className="tabular-nums text-oliveGray">{euro(quota.valorCents)}</span>
                    </label>
                  </li>
                ))}
              </ul>
            )}
            <div className="mt-3 flex flex-wrap items-center gap-3">
              <p className="font-body text-xs text-oliveGray">
                Selecionadas: <span className="tabular-nums font-semibold text-ink">{euro(somaSelecionada)}</span> de{" "}
                {euro(movimento.valorCents)}
              </p>
              <button
                type="button"
                onClick={reconciliar}
                disabled={isPending || !fracao || excede}
                className="inline-flex items-center gap-1.5 rounded-xl bg-britishGreen px-3.5 py-2 font-body text-xs font-semibold text-white transition-colors hover:bg-britishGreenDeep disabled:opacity-40"
              >
                <Check className="h-3.5 w-3.5" /> Registar pagamento e reconciliar
              </button>
              {excede && (
                <span className="font-body text-xs text-alert">
                  A soma das quotas selecionadas excede o valor do movimento.
                </span>
              )}
              {erro && <span className="font-body text-xs text-alert">{erro}</span>}
            </div>
          </div>
        )}
      </div>
    </li>
  );
}
