// Lógica pura de alocação de um pagamento por quotas.
// É o espelho exacto da função plpgsql `alocar_pagamento_quotas` (migração
// 20260903010000): o trigger e esta função têm de decidir o mesmo, e é aqui
// que a decisão se testa sem base de dados.

export type QuotaParaAlocacao = {
  id: string;
  valor_cents: number;
  /** Já pago por OUTROS pagamentos (alocações vigentes de terceiros). */
  pago_cents: number;
  estado: string;
};

export type Alocacao = { quota_id: string; valor_cents: number };

/**
 * Distribui `valor_cents` pelas quotas, pela ordem cronológica (ano, mês —
 * quem chama ordena), enchendo cada quota até ao seu remanescente:
 * quota paga fecha e passa à seguinte; o que sobra fica sem alocação
 * (crédito do condómino — visível como pagamento > soma das quotas).
 * Quotas isentas não recebem alocação: são perdoadas, não cobradas.
 */
export function planoAlocacao(
  valorCents: number,
  quotas: QuotaParaAlocacao[],
): Alocacao[] {
  let restante = valorCents;
  const plano: Alocacao[] = [];

  for (const quota of quotas) {
    if (restante <= 0) break;
    if (quota.estado === "isento") continue;

    const remanescente = quota.valor_cents - quota.pago_cents;
    if (remanescente <= 0) continue;

    const alocar = Math.min(remanescente, restante);
    plano.push({ quota_id: quota.id, valor_cents: alocar });
    restante -= alocar;
  }

  return plano;
}

/** Saldo em dívida de uma quota: nunca negativo, isentas não contam. */
export function saldoQuota(quota: {
  valor_cents: number;
  pago_cents: number;
  estado: string;
}): number {
  if (quota.estado === "isento") return 0;
  return Math.max(0, quota.valor_cents - quota.pago_cents);
}
