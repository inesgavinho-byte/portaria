import { describe, expect, it } from "vitest";
import { apurarTotais } from "../src/lib/relatorios/apuramentos";
import type { MovimentoRelatorio } from "../src/components/relatorios/relatorio-fornecedor";
import type { Contrato, ContratoMemoriaEvento, Despesa } from "../src/types/database";

const FORNECEDOR = "fornecedor-1";

function despesa(over: Partial<Despesa> & { id: string; valor_cents: number }): Despesa {
  return {
    tenant_id: "t",
    fornecedor_id: FORNECEDOR,
    contrato_id: null,
    numero_documento: null,
    referencia: null,
    descricao: "",
    estado: "a_reconciliar",
    data_documento: "2026-01-01",
    data_vencimento: null,
    criado_em: "2026-01-01",
    ...over,
  } as Despesa;
}

function movimento(over: Partial<MovimentoRelatorio> & { id: string; valor_cents: number }): MovimentoRelatorio {
  return {
    fornecedor_id: FORNECEDOR,
    despesa_id: null,
    data_movimento: "2026-01-01",
    tipo: "debito",
    descricao: "",
    contraparte: null,
    referencia_externa: null,
    confirmado: true,
    estado_reconciliacao: "reconciliado",
    ...over,
  };
}

function retencao(despesaId: string): ContratoMemoriaEvento {
  return {
    id: `evento-${despesaId}`,
    data_evento: "2026-06-01",
    tipo: "decisao",
    titulo: "Retenção do pagamento final",
    resumo: "",
    natureza: "facto",
    valor_cents: null,
    despesa_id: despesaId,
    movimento_id: null,
    efeito: "retencao",
    criado_em: "2026-06-01",
    contrato_memoria_evidencias: [],
  };
}

const semContratos: Contrato[] = [];

describe("apurarTotais — caso Pinturas Verticais", () => {
  // Os valores vêm da situação real do dossiê: três facturas (6.360 + 6.360 +
  // 3.180), um único débito confirmado de 6.360, e a factura 2026/8 retida por
  // deliberação. É o caso de aceitação do relatório.
  const despesas = [
    despesa({ id: "f-2026-4", valor_cents: 636_000 }),
    despesa({ id: "f-2026-7", valor_cents: 636_000 }),
    despesa({ id: "f-2026-8", valor_cents: 318_000 }),
  ];
  const movimentos = [movimento({ id: "m1", valor_cents: 636_000, despesa_id: "f-2026-4" })];
  const eventos = [retencao("f-2026-8")];

  const totais = apurarTotais({
    id: FORNECEDOR,
    despesasPeriodo: despesas,
    movimentosPeriodo: movimentos,
    eventosPeriodo: eventos,
    contratos: semContratos,
  });

  it("factura 15.900", () => expect(totais.facturado).toBe(1_590_000));
  it("confirma 6.360 em banco", () => expect(totais.pagoConfirmado).toBe(636_000));
  it("deixa 9.540 em aberto", () => expect(totais.emAberto).toBe(954_000));
  it("condiciona 3.180", () => expect(totais.condicionado).toBe(318_000));

  it("não declara contratado quando nenhum contrato traz valor", () => {
    expect(totais.contratado).toBeNull();
  });

  it("não inventa dúvida quando o pagamento tem factura identificada", () => {
    expect(totais.confirmadoSemFactura).toBe(0);
  });
});

describe("apurarTotais — regras", () => {
  it("conta como saída confirmada só o débito confirmado deste fornecedor", () => {
    const totais = apurarTotais({
      id: FORNECEDOR,
      despesasPeriodo: [despesa({ id: "d", valor_cents: 100_000 })],
      movimentosPeriodo: [
        movimento({ id: "confirmado", valor_cents: 10_000 }),
        movimento({ id: "por-confirmar", valor_cents: 20_000, confirmado: false }),
        movimento({ id: "credito", valor_cents: 40_000, tipo: "credito" }),
        movimento({ id: "de-outro", valor_cents: 80_000, fornecedor_id: "outro" }),
      ],
      eventosPeriodo: [],
      contratos: [],
    });
    expect(totais.pagoConfirmado).toBe(10_000);
  });

  it("assinala o valor confirmado sem factura identificada", () => {
    const totais = apurarTotais({
      id: FORNECEDOR,
      despesasPeriodo: [despesa({ id: "d", valor_cents: 100_000 })],
      movimentosPeriodo: [
        movimento({ id: "com-factura", valor_cents: 30_000, despesa_id: "d" }),
        movimento({ id: "sem-factura", valor_cents: 25_000 }),
      ],
      eventosPeriodo: [],
      contratos: [],
    });
    expect(totais.pagoConfirmado).toBe(55_000);
    expect(totais.confirmadoSemFactura).toBe(25_000);
  });

  it("nunca devolve um saldo negativo quando se pagou acima do facturado", () => {
    const totais = apurarTotais({
      id: FORNECEDOR,
      despesasPeriodo: [despesa({ id: "d", valor_cents: 50_000 })],
      movimentosPeriodo: [movimento({ id: "m", valor_cents: 80_000 })],
      eventosPeriodo: [],
      contratos: [],
    });
    // Pago acima do facturado é uma anomalia a mostrar noutro sítio, não um
    // saldo simétrico: "-300 €" em aberto leria-se como crédito do fornecedor.
    expect(totais.emAberto).toBe(0);
  });

  it("só retém a despesa que o acontecimento de retenção referencia", () => {
    const totais = apurarTotais({
      id: FORNECEDOR,
      despesasPeriodo: [
        despesa({ id: "retida", valor_cents: 40_000 }),
        despesa({ id: "livre", valor_cents: 70_000 }),
      ],
      movimentosPeriodo: [],
      eventosPeriodo: [retencao("retida")],
      contratos: [],
    });
    expect(totais.condicionado).toBe(40_000);
  });

  it("ignora acontecimento de retenção sem despesa associada", () => {
    const semDespesa = { ...retencao("x"), despesa_id: null };
    const totais = apurarTotais({
      id: FORNECEDOR,
      despesasPeriodo: [despesa({ id: "d", valor_cents: 40_000 })],
      movimentosPeriodo: [],
      eventosPeriodo: [semDespesa],
      contratos: [],
    });
    expect(totais.condicionado).toBe(0);
  });

  it("soma o valor dos contratos que o declaram, em euros para cêntimos", () => {
    const totais = apurarTotais({
      id: FORNECEDOR,
      despesasPeriodo: [],
      movimentosPeriodo: [],
      eventosPeriodo: [],
      contratos: [{ valor: 1_500 } as Contrato, { valor: null } as Contrato],
    });
    expect(totais.contratado).toBe(150_000);
  });

  it("devolve zeros para um fornecedor sem dados", () => {
    const totais = apurarTotais({
      id: FORNECEDOR,
      despesasPeriodo: [],
      movimentosPeriodo: [],
      eventosPeriodo: [],
      contratos: [],
    });
    expect(totais).toEqual({
      facturado: 0,
      pagoConfirmado: 0,
      pagoDocumental: 0,
      emAberto: 0,
      condicionado: 0,
      contratado: null,
      confirmadoSemFactura: 0,
    });
  });
});
