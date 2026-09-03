import { describe, expect, it } from "vitest";
import {
  planoAlocacao,
  saldoQuota,
  type QuotaParaAlocacao,
} from "../src/lib/financeiro/alocacao";

function quota(
  id: string,
  valorCents: number,
  over: Partial<Omit<QuotaParaAlocacao, "id">> = {},
): QuotaParaAlocacao {
  return { id, valor_cents: valorCents, pago_cents: 0, estado: "pendente", ...over };
}

describe("planoAlocacao", () => {
  it("o caso do bug do trigger 0027: 60€ sobre duas quotas de 50€ aloca 50+10, não 60 a cada uma", () => {
    const plano = planoAlocacao(6000, [quota("a", 5000), quota("b", 5000)]);
    expect(plano).toEqual([
      { quota_id: "a", valor_cents: 5000 },
      { quota_id: "b", valor_cents: 1000 },
    ]);
  });

  it("pagamento maior que tudo: sobra fica sem alocação", () => {
    const plano = planoAlocacao(12000, [quota("a", 5000), quota("b", 5000)]);
    expect(plano).toEqual([
      { quota_id: "a", valor_cents: 5000 },
      { quota_id: "b", valor_cents: 5000 },
    ]);
  });

  it("respeita o que outros pagamentos já cobriram", () => {
    const plano = planoAlocacao(6000, [
      quota("a", 5000, { pago_cents: 3000, estado: "parcial" }),
      quota("b", 5000),
    ]);
    expect(plano).toEqual([
      { quota_id: "a", valor_cents: 2000 },
      { quota_id: "b", valor_cents: 4000 },
    ]);
  });

  it("quota já paga é ignorada; isentas nunca recebem alocação", () => {
    const plano = planoAlocacao(9000, [
      quota("a", 5000, { pago_cents: 5000, estado: "pago" }),
      quota("b", 5000, { estado: "isento" }),
      quota("c", 5000),
    ]);
    expect(plano).toEqual([{ quota_id: "c", valor_cents: 5000 }]);
  });

  it("valor zero ou negativo não aloca nada", () => {
    expect(planoAlocacao(0, [quota("a", 5000)])).toEqual([]);
    expect(planoAlocacao(-100, [quota("a", 5000)])).toEqual([]);
  });
});

describe("saldoQuota", () => {
  it("devida menos pago, sem nunca negativo", () => {
    expect(saldoQuota({ valor_cents: 5000, pago_cents: 3000, estado: "parcial" })).toBe(2000);
    expect(saldoQuota({ valor_cents: 5000, pago_cents: 6000, estado: "pago" })).toBe(0);
  });

  it("isenta tem saldo zero mesmo sem pagamentos", () => {
    expect(saldoQuota({ valor_cents: 5000, pago_cents: 0, estado: "isento" })).toBe(0);
  });
});
