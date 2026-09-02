import { describe, expect, it } from "vitest";
import { agruparImputacoes } from "../src/lib/relatorios/imputacoes";
import { apurarTotais } from "../src/lib/relatorios/apuramentos";
import type { MovimentoRelatorio } from "../src/components/relatorios/relatorio-fornecedor";
import type { Despesa, PosicaoImputacao } from "../src/types/database";

const FORNECEDOR = "fornecedor-1";
const MOVIMENTO = "m-11-06";

function despesa(id: string, numero: string, cents: number): Despesa {
  return {
    id,
    tenant_id: "t",
    fornecedor_id: FORNECEDOR,
    contrato_id: null,
    numero_documento: numero,
    referencia: null,
    descricao: `Factura ${numero}`,
    valor_cents: cents,
    estado: "a_reconciliar",
    data_documento: "2026-05-26",
    data_vencimento: null,
    criado_em: "2026-05-26",
  } as Despesa;
}

function movimento(over: Partial<MovimentoRelatorio> = {}): MovimentoRelatorio {
  return {
    id: MOVIMENTO,
    fornecedor_id: FORNECEDOR,
    despesa_id: null,
    data_movimento: "2026-06-11",
    tipo: "debito",
    valor_cents: 636_000,
    descricao: "Transferência",
    contraparte: null,
    referencia_externa: null,
    confirmado: true,
    estado_reconciliacao: "parcial",
    ...over,
  };
}

function posicao(over: Partial<PosicaoImputacao> & { id: string }): PosicaoImputacao {
  return {
    tenant_id: "t",
    movimento_id: MOVIMENTO,
    despesa_id: "d-4",
    parte: "condominio",
    parte_descricao: null,
    tipo: "imputa",
    fundamento: "fundamento",
    estado: "sustentada",
    data_posicao: "2026-08-24T00:00:00Z",
    observacoes: null,
    criado_em: "2026-08-24T00:00:00Z",
    atualizado_em: "2026-08-24T00:00:00Z",
    imputacoes_posicoes_evidencias: [],
    ...over,
  };
}

const DESPESAS = [
  despesa("d-4", "2026/4", 636_000),
  despesa("d-7", "2026/7", 636_000),
  despesa("d-8", "2026/8", 318_000),
];

const CONDOMINIO = posicao({ id: "p-condominio", parte: "condominio", tipo: "imputa", despesa_id: "d-4" });
const CONTRAPARTE = posicao({
  id: "p-contraparte",
  parte: "contraparte",
  tipo: "nao_imputa",
  despesa_id: "d-4",
  data_posicao: "2026-07-31T00:00:00Z",
});

describe("uma posição nunca cria ligação movimento → factura", () => {
  it("mantém a factura reconciliada a nulo mesmo com posições que imputam", () => {
    const [imputacao] = agruparImputacoes([CONDOMINIO, CONTRAPARTE], [movimento()], DESPESAS);

    // O ponto todo: duas partes falam da 2026/4 e o movimento continua sem
    // factura identificada.
    expect(imputacao.facturaReconciliada).toBeNull();
    expect(imputacao.posicoes.map((p) => p.facturaNumero)).toEqual(["2026/4", "2026/4"]);
  });

  it("não altera o movimento que recebe", () => {
    const original = movimento();
    const copia = { ...original };
    agruparImputacoes([CONDOMINIO, CONTRAPARTE], [original], DESPESAS);
    expect(original).toEqual(copia);
  });

  it("mostra a factura reconciliada quando ela existe, vinda do movimento e não da posição", () => {
    const [imputacao] = agruparImputacoes(
      [posicao({ id: "p", despesa_id: "d-7", tipo: "imputa" })],
      [movimento({ despesa_id: "d-4", estado_reconciliacao: "reconciliado" })],
      DESPESAS,
    );
    // A posição diz 2026/7; o processo reconcilia 2026/4. Prevalece o processo.
    expect(imputacao.facturaReconciliada).toBe("2026/4");
    expect(imputacao.posicoes[0].facturaNumero).toBe("2026/7");
  });
});

describe("posições contraditórias coexistem", () => {
  it("guarda as duas e marca o movimento como controvertido", () => {
    const [imputacao] = agruparImputacoes([CONDOMINIO, CONTRAPARTE], [movimento()], DESPESAS);
    expect(imputacao.posicoes).toHaveLength(2);
    expect(imputacao.controvertida).toBe(true);
  });

  it("ordena o condomínio antes da contraparte, seja qual for a ordem de entrada", () => {
    const [imputacao] = agruparImputacoes([CONTRAPARTE, CONDOMINIO], [movimento()], DESPESAS);
    expect(imputacao.posicoes.map((p) => p.parte)).toEqual(["condominio", "contraparte"]);
  });

  it("duas partes a imputar à mesma factura concordam, e não é divergência", () => {
    const terceiro = posicao({ id: "p-terceiro", parte: "terceiro", tipo: "imputa", despesa_id: "d-4" });
    const [imputacao] = agruparImputacoes([CONDOMINIO, terceiro], [movimento()], DESPESAS);
    expect(imputacao.posicoes).toHaveLength(2);
    expect(imputacao.controvertida).toBe(false);
  });

  it("uma posição retirada deixa de gerar divergência mas continua registada", () => {
    const retirada = { ...CONTRAPARTE, estado: "retirada" as const };
    const [imputacao] = agruparImputacoes([CONDOMINIO, retirada], [movimento()], DESPESAS);
    expect(imputacao.posicoes).toHaveLength(2);
    expect(imputacao.controvertida).toBe(false);
  });

  it("uma reserva não contradiz ninguém", () => {
    const reserva = posicao({ id: "p-reserva", parte: "terceiro", tipo: "reserva", despesa_id: null });
    const [imputacao] = agruparImputacoes([CONDOMINIO, reserva], [movimento()], DESPESAS);
    expect(imputacao.controvertida).toBe(false);
    expect(imputacao.posicoes.find((p) => p.tipo === "reserva")?.facturaNumero).toBeNull();
  });
});

describe("o apuramento financeiro não depende da posição", () => {
  const entrada = {
    id: FORNECEDOR,
    despesasPeriodo: DESPESAS,
    movimentosPeriodo: [movimento()],
    eventosPeriodo: [],
    contratos: [],
  };

  it("dá o mesmo resultado com zero, uma ou duas posições", () => {
    // `apurarTotais` nem sequer recebe posições. O teste fixa essa fronteira:
    // se um dia alguém lhe passar posições, isto obriga a pensar duas vezes.
    const semPosicoes = apurarTotais(entrada);
    agruparImputacoes([CONDOMINIO], [movimento()], DESPESAS);
    agruparImputacoes([CONDOMINIO, CONTRAPARTE], [movimento()], DESPESAS);
    expect(apurarTotais(entrada)).toEqual(semPosicoes);
  });

  it("mantém os KPIs do caso Pinturas Verticais com a divergência registada", () => {
    const totais = apurarTotais(entrada);
    expect(totais.facturado).toBe(1_590_000); //          €15.900
    expect(totais.pagoConfirmado).toBe(636_000); //        €6.360
    expect(totais.emAberto).toBe(954_000); //              €9.540
    expect(totais.confirmadoSemFactura).toBe(636_000); //  sem factura identificada
  });
});

describe("ausência de posições não quebra nada", () => {
  it("devolve lista vazia para um fornecedor sem posições", () => {
    expect(agruparImputacoes([], [movimento()], DESPESAS)).toEqual([]);
  });

  it("devolve lista vazia sem movimentos nem despesas", () => {
    expect(agruparImputacoes([], [], [])).toEqual([]);
  });

  it("ignora a posição cujo movimento está fora do período apresentado", () => {
    const foraDoPeriodo = posicao({ id: "p-fora", movimento_id: "outro-movimento" });
    expect(agruparImputacoes([foraDoPeriodo], [movimento()], DESPESAS)).toEqual([]);
  });

  it("tolera uma despesa que não está na lista do período", () => {
    const [imputacao] = agruparImputacoes(
      [posicao({ id: "p", despesa_id: "d-inexistente" })],
      [movimento()],
      DESPESAS,
    );
    expect(imputacao.posicoes[0].facturaNumero).toBeNull();
  });
});

describe("agrupamento por movimento", () => {
  it("separa posições de movimentos diferentes e ordena por data", () => {
    const segundo = movimento({ id: "m-segundo", data_movimento: "2026-02-01", valor_cents: 100_000 });
    const posicaoSegundo = posicao({ id: "p-segundo", movimento_id: "m-segundo" });
    const resultado = agruparImputacoes([CONDOMINIO, posicaoSegundo], [movimento(), segundo], DESPESAS);
    expect(resultado.map((i) => i.movimentoId)).toEqual(["m-segundo", MOVIMENTO]);
  });

  it("leva a evidência da posição consigo", () => {
    const comEvidencia = posicao({
      id: "p-evid",
      imputacoes_posicoes_evidencias: [
        {
          id: "e1",
          localizador: "carta de 31-07-2026",
          citacao: "reclamar o pagamento do valor total de € 9540,00",
          ia_documental_fontes: [
            { id: "f1", titulo: "Interpelação extrajudicial", referencia: null, url: null, documento_id: null },
          ],
        },
      ],
    });
    const [imputacao] = agruparImputacoes([comEvidencia], [movimento()], DESPESAS);
    expect(imputacao.posicoes[0].evidencias).toEqual([
      {
        id: "e1",
        localizador: "carta de 31-07-2026",
        citacao: "reclamar o pagamento do valor total de € 9540,00",
        fonte: "Interpelação extrajudicial",
      },
    ]);
  });
});
