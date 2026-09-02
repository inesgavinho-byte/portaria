import { describe, expect, it } from "vitest";
import {
  normalizarCodigoFracao,
  sugerirFracoes,
  sugerirQuotas,
  type FracaoCandidata,
  type MovimentoCredito,
  type QuotaPendente,
} from "../src/lib/financeiro/recebimentos";

function movimento(over: Partial<MovimentoCredito> = {}): MovimentoCredito {
  return {
    id: "m1",
    dataMovimento: "2026-06-11",
    valorCents: 110000,
    descricao: "TRF DE C EUROPA 3T 26 4 DTO 4 ESQ",
    ...over,
  };
}

function fracao(over: Partial<FracaoCandidata> & { id: string; codigo: string }): FracaoCandidata {
  return {
    proprietarioNome: null,
    quotasPendentes: [],
    ...over,
  };
}

function quota(over: Partial<QuotaPendente> & { id: string; mes: number }): QuotaPendente {
  return { ano: 2026, valorCents: 55000, ...over };
}

describe("normalizarCodigoFracao", () => {
  it("normaliza os códigos reais do edifício", () => {
    expect(normalizarCodigoFracao("3.º Dto")).toBe("3 dto");
    expect(normalizarCodigoFracao("11DTO e ESQ")).toBe("11 dto e esq");
    expect(normalizarCodigoFracao("8dt.")).toBe("8 dto");
    expect(normalizarCodigoFracao("fracao 9 dto")).toBe("fracao 9 dto");
    expect(normalizarCodigoFracao("PRIMEIRO ESQUERDO")).toBe("1 esq");
    // "R/C Esq" fica como está (r c esq): "r/c" não é ordinal nem lado — o
    // teste documenta o comportamento.
    expect(normalizarCodigoFracao("R/C Esq")).toBe("r c esq");
  });
});

describe("sugerirQuotas", () => {
  it("fecha com uma quota exacta do mês do movimento", () => {
    const quotas = [quota({ id: "q6", mes: 6, valorCents: 110000 })];
    const resultado = sugerirQuotas(movimento({ valorCents: 110000 }), quotas);
    expect(resultado?.quotas.map((q) => q.id)).toEqual(["q6"]);
    expect(resultado?.somaCents).toBe(110000);
  });

  it("fecha com 2 quotas consecutivas a partir da mais antiga", () => {
    const quotas = [
      quota({ id: "q4", mes: 4 }),
      quota({ id: "q5", mes: 5 }),
      quota({ id: "q6", mes: 6 }),
    ];
    const resultado = sugerirQuotas(movimento(), quotas);
    expect(resultado?.quotas.map((q) => q.id)).toEqual(["q4", "q5"]);
    expect(resultado?.somaCents).toBe(110000);
  });

  it("devolve null quando nenhuma combinação consecutiva fecha", () => {
    const quotas = [quota({ id: "q1", mes: 1, valorCents: 30000 }), quota({ id: "q2", mes: 2, valorCents: 40000 })];
    expect(sugerirQuotas(movimento(), quotas)).toBeNull();
    expect(sugerirQuotas(movimento(), [])).toBeNull();
  });

  it("ignora quotas a seguir à data do movimento", () => {
    // Só a quota de julho fecharia o valor — mas é futura: nunca é elegível.
    const quotas = [
      quota({ id: "q7", mes: 7, valorCents: 110000 }),
      quota({ id: "q8", mes: 8, valorCents: 55000 }),
    ];
    expect(sugerirQuotas(movimento(), quotas)).toBeNull();
  });

  it("prefere a combinação com menos quotas", () => {
    const quotas = [
      quota({ id: "q5", mes: 5, valorCents: 110000 }),
      quota({ id: "q6", mes: 6, valorCents: 55000 }),
      quota({ id: "q7", mes: 7, valorCents: 55000 }),
    ];
    // Movimento de junho: a quota de julho (q7) é futura e fica de fora; a
    // combinação de 1 quota (q5) vence qualquer combinação de 2.
    const resultado = sugerirQuotas(movimento({ dataMovimento: "2026-06-30" }), quotas);
    expect(resultado?.quotas.map((q) => q.id)).toEqual(["q5"]);
  });
});

describe("sugerirFracoes", () => {
  const A = fracao({ id: "f-a", codigo: "4.º Dto" });
  const B = fracao({
    id: "f-b",
    codigo: "7.º Dto",
    quotasPendentes: [quota({ id: "b4", mes: 4 }), quota({ id: "b5", mes: 5 })],
  });
  const C = fracao({
    id: "f-c",
    codigo: "9.º Dto",
    proprietarioNome: "Beatriz Nagelho",
    quotasPendentes: [quota({ id: "c1", mes: 1, valorCents: 60000 })],
  });

  it("sugere exacta pelo código da fracção na descrição", () => {
    const sugestoes = sugerirFracoes(movimento(), [fracao({ id: "f-x", codigo: "Loja A" }), A]);
    expect(sugestoes).toHaveLength(1);
    expect(sugestoes[0].fracao.id).toBe("f-a");
    expect(sugestoes[0].confianca).toBe("exacta");
    expect(sugestoes[0].motivo).toContain("Código da fracção");
  });

  it("aplica o pipeline de código de fracção TAMBÉM à descrição do movimento", () => {
    // Casos reais que apanham o bug H1: o extrato escreve o lado abreviado e
    // colado ("8dt.") e o ordinal por extenso ("PRIMEIRO ESQUERDO") exactamente
    // como os códigos das fracções.
    const oito = fracao({ id: "f-8", codigo: "8.º Dto" });
    const sugestoesOito = sugerirFracoes(movimento({ descricao: "TRF DE 8dt." }), [oito]);
    expect(sugestoesOito).toHaveLength(1);
    expect(sugestoesOito[0].fracao.id).toBe("f-8");
    expect(sugestoesOito[0].confianca).toBe("exacta");

    const primeiro = fracao({ id: "f-1", codigo: "1.º Esq" });
    const sugestoesPrimeiro = sugerirFracoes(
      movimento({ descricao: "TRF DE QUOTIZACAO PRIMEIRO ESQUERDO" }),
      [primeiro],
    );
    expect(sugestoesPrimeiro).toHaveLength(1);
    expect(sugestoesPrimeiro[0].fracao.id).toBe("f-1");
    expect(sugestoesPrimeiro[0].confianca).toBe("exacta");
  });

  it("não casa uma fracção dentro de um número maior (pin de regressão)", () => {
    // "13 dto" contém "3 dto" como substring — mas por tokens "13" ≠ "3".
    const tres = fracao({ id: "f-3", codigo: "3.º Dto" });
    expect(sugerirFracoes(movimento({ descricao: "TRF DE 13 dto JUNHO" }), [tres])).toEqual([]);
  });

  it("sugere exacta pelo nome completo do proprietário", () => {
    const dono = fracao({ id: "f-d", codigo: "2.º Esq", proprietarioNome: "Maria Silva Pereira" });
    const sugestoes = sugerirFracoes(movimento({ descricao: "TRANSFERENCIA RECEBIDA DE MARIA SILVA PEREIRA" }), [
      dono,
    ]);
    expect(sugestoes[0].confianca).toBe("exacta");
    expect(sugestoes[0].motivo).toContain("Nome do proprietário");
  });

  it("sugere provável pela soma exacta de quotas pendentes", () => {
    // Sem nome de proprietário: a única pista possível é a soma de quotas.
    const sugestoes = sugerirFracoes(movimento(), [B]);
    expect(sugestoes).toHaveLength(1);
    expect(sugestoes[0].confianca).toBe("provavel");
    expect(sugestoes[0].motivo).toContain("Soma de 2 quotas");
    // Sem o separador de milhares, que varia (espaço vs. espaço inseparável).
    expect(sugestoes[0].motivo).toContain("100,00");
  });

  it("sugere possível com um único termo raro do proprietário", () => {
    const sugestoes = sugerirFracoes(movimento({ descricao: "RECEBIDO DE BEATRIZ JUNHO" }), [C]);
    expect(sugestoes).toHaveLength(1);
    expect(sugestoes[0].confianca).toBe("possivel");
    expect(sugestoes[0].motivo).toContain("beatriz");
  });

  it("ordena da confiança mais alta para a mais baixa e respeita o limite", () => {
    // A descrição activa as três pistas: código de A (exacta), soma de quotas
    // de B (provável) e termo raro de C (possível).
    const sugestoes = sugerirFracoes(
      movimento({ descricao: "TRF DE C EUROPA 3T 26 4 DTO 4 ESQ RECEBIDO DE BEATRIZ" }),
      [C, B, A],
    );
    expect(sugestoes.map((s) => s.fracao.id)).toEqual(["f-a", "f-b", "f-c"]);
    expect(
      sugerirFracoes(movimento({ descricao: "TRF DE C EUROPA 3T 26 4 DTO 4 ESQ RECEBIDO DE BEATRIZ" }), [C, B, A], 2).map(
        (s) => s.fracao.id,
      ),
    ).toEqual(["f-a", "f-b"]);
  });

  it("não sugere nada quando nenhuma pista chega", () => {
    const qualquer = fracao({ id: "f-z", codigo: "Loja B", proprietarioNome: "Anónimo Completo" });
    expect(sugerirFracoes(movimento({ descricao: "PAGAMENTO DE SERVIÇOS" }), [qualquer])).toEqual([]);
  });
});
