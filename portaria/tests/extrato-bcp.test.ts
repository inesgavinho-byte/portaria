import * as XLSX from "xlsx";
import { describe, expect, it } from "vitest";
import {
  dataIso,
  extrairContraparte,
  hashReferencia,
  paraCents,
  parseExtratoBcp,
  validarCadeiaSaldos,
  type LinhaExtrato,
} from "../src/lib/financeiro/extrato-bcp";

function linha(over: Partial<LinhaExtrato> & { dataLancamento: string }): LinhaExtrato {
  return {
    dataValor: null,
    descricao: "Movimento",
    montanteCents: -1000,
    saldoCents: 9000,
    ...over,
  };
}

describe("paraCents", () => {
  it("converte números directamente, arredondando a cêntimos", () => {
    expect(paraCents(550)).toBe(55000);
    expect(paraCents(-818.8)).toBe(-81880);
    expect(paraCents(0)).toBe(0);
    expect(paraCents(Number.NaN)).toBeNull();
    expect(paraCents(Number.POSITIVE_INFINITY)).toBeNull();
  });

  it("aceita texto com ponto decimal", () => {
    expect(paraCents("-818.8")).toBe(-81880);
    expect(paraCents("1234.56")).toBe(123456);
  });

  it("aceita texto com vírgula decimal", () => {
    expect(paraCents("-818,8")).toBe(-81880);
    expect(paraCents("1.234,56")).toBe(123456);
    expect(paraCents("1 234,56")).toBe(123456);
  });

  it("trata separador seguido de 3 dígitos como milhar à portuguesa", () => {
    expect(paraCents("1.234")).toBe(123400);
    expect(paraCents("1,234,567")).toBe(123456700);
  });

  it("devolve null para texto ilegível", () => {
    expect(paraCents("")).toBeNull();
    expect(paraCents("abc")).toBeNull();
    expect(paraCents(null)).toBeNull();
    expect(paraCents(undefined)).toBeNull();
  });
});

describe("dataIso", () => {
  it("lê datas em texto DD/MM/YYYY e DD-MM-YYYY", () => {
    expect(dataIso("01/01/2026")).toBe("2026-01-01");
    expect(dataIso("31-12-2026")).toBe("2026-12-31");
  });

  it("converte serial Excel", () => {
    expect(dataIso(46023)).toBe("2026-01-01");
  });

  it("devolve null para datas impossíveis ou formatos estranhos", () => {
    expect(dataIso("32/01/2026")).toBeNull();
    expect(dataIso("31/02/2026")).toBeNull();
    expect(dataIso("2026/01/01")).toBeNull();
    expect(dataIso("ontem")).toBeNull();
    expect(dataIso(null)).toBeNull();
  });
});

describe("extrairContraparte", () => {
  it("reconhece os quatro prefixos de transferência a terceiros", () => {
    expect(extrairContraparte("TRF. P/O PINTURAS VERTICAIS")).toBe("PINTURAS VERTICAIS");
    expect(extrairContraparte("TRF P/O SIMAS OEIRAS")).toBe("SIMAS OEIRAS");
    expect(extrairContraparte("TRF. P/ TK ELEVATOR")).toBe("TK ELEVATOR");
    expect(extrairContraparte("TRF P/ EDIFICIO XPTO")).toBe("EDIFICIO XPTO");
  });

  it("é insensível a maiúsculas e colapsa espaços", () => {
    expect(extrairContraparte("trf. p/o   Pinturas   Verticais ")).toBe("Pinturas Verticais");
  });

  it("devolve null para outros formatos do banco e para restos vazios", () => {
    expect(extrairContraparte("TRF DE QUOTIZACAO MES DE JANEIRO")).toBeNull();
    expect(extrairContraparte("COM. MANUTENCAO DE CONTA")).toBeNull();
    expect(extrairContraparte("DD  CONDOMINIO")).toBeNull();
    expect(extrairContraparte("TRF. P/O    ")).toBeNull();
  });
});

describe("validarCadeiaSaldos", () => {
  it("aceita uma cadeia íntegra (saldo desce de baixo para cima)", () => {
    const movimentos = [
      linha({ dataLancamento: "2026-01-10", montanteCents: -2000, saldoCents: 8000 }),
      linha({ dataLancamento: "2026-01-05", montanteCents: 3000, saldoCents: 10000 }),
      linha({ dataLancamento: "2026-01-02", montanteCents: -7000, saldoCents: 7000 }),
    ];
    expect(validarCadeiaSaldos(movimentos)).toEqual({ ok: true, quebra: null });
  });

  it("detecta a quebra com índice, esperado e real", () => {
    const movimentos = [
      linha({ dataLancamento: "2026-01-10", montanteCents: -100, saldoCents: 500 }),
      linha({ dataLancamento: "2026-01-05", montanteCents: 300, saldoCents: 700 }),
    ];
    const resultado = validarCadeiaSaldos(movimentos);
    expect(resultado.ok).toBe(false);
    expect(resultado.quebra).toEqual({ indice: 0, esperadoCents: 600, realCents: 500 });
  });

  it("aceita uma lista de um elemento", () => {
    expect(validarCadeiaSaldos([linha({ dataLancamento: "2026-01-10" })]).ok).toBe(true);
  });
});

describe("hashReferencia", () => {
  const chave = {
    conta: "0000045406856047",
    dataLancamento: "2026-01-10",
    dataValor: "2026-01-10",
    montanteCents: -200000,
    descricao: "TRF. P/O PINTURAS VERTICAIS",
    saldoCents: 800000,
  };

  it("é determinístico", async () => {
    expect(await hashReferencia(chave)).toBe(await hashReferencia({ ...chave }));
  });

  it("muda quando qualquer campo muda", async () => {
    const base = await hashReferencia(chave);
    expect(await hashReferencia({ ...chave, montanteCents: -200001 })).not.toBe(base);
    expect(await hashReferencia({ ...chave, descricao: "outra" })).not.toBe(base);
    expect(await hashReferencia({ ...chave, conta: null })).not.toBe(base);
    expect(await hashReferencia({ ...chave, dataValor: null })).not.toBe(base);
    expect(base.startsWith("bcp:0000045406856047:")).toBe(true);
  });
});

/**
 * Folha sintética que replica o layout real do export BCP: metadados em pares,
 * cabeçalho na linha 8 e movimentos em ordem descendente com a cadeia de
 * saldos coerente de baixo para cima. Inclui deliberadamente uma linha a zero
 * e uma linha em moeda estrangeira — ambas têm de ser ignoradas com aviso.
 */
function extratoSintetico(): Buffer {
  const folha = XLSX.utils.aoa_to_sheet([
    ["Millennium bcp"],
    ["Conta", null, "0000045406856047 - EUR"],
    ["Data de inicio", null, "01/01/2026"],
    ["Data fim", null, "31/01/2026"],
    ["Tipos de Pesquisa", null, "Todos"],
    ["Data de exportação", null, "02-09-2026 13:06:41"],
    [null],
    ["Data Lançamento", "Data Valor", "Descrição", "Montante", "Saldo Contabilístico", "Moeda", "Notas", "Tratado"],
    ["10/01/2026", "10/01/2026", "TRF. P/O  PINTURAS VERTICAIS", -2000, 8000, "EUR", null, null],
    ["08/01/2026", null, "COM. MANUTENCAO DE CONTA", 0, 8000, "EUR", null, null],
    ["05/01/2026", "06/01/2026", "TRF DE QUOTIZACAO MES DE JANEIRO", 3000, 10000, "EUR", null, null],
    ["02/01/2026", "02/01/2026", "DD  CONDOMINIO RUA DAS FLORES", -7000, 7000, "EUR", null, null],
    ["01/01/2026", null, "COMPROVANTE MOEDA ESTRANGEIRA", 50, 7050, "USD", null, null],
  ]);
  const livro = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(livro, folha, "Extrato");
  return XLSX.write(livro, { type: "buffer", bookType: "xlsx" }) as Buffer;
}

describe("parseExtratoBcp", () => {
  it("lê um extrato completo: metadados, movimentos, erros e saldos", () => {
    const resultado = parseExtratoBcp(extratoSintetico());
    if (!("movimentos" in resultado)) throw new Error(resultado.erro);

    expect(resultado.metadados).toEqual({
      conta: "0000045406856047 - EUR",
      dataInicio: "01/01/2026",
      dataFim: "31/01/2026",
      exportadoEm: "02-09-2026 13:06:41",
    });

    expect(resultado.movimentos).toHaveLength(3);
    expect(resultado.movimentos[0]).toEqual({
      dataLancamento: "2026-01-10",
      dataValor: "2026-01-10",
      descricao: "TRF. P/O PINTURAS VERTICAIS",
      montanteCents: -200000,
      saldoCents: 800000,
    });
    expect(resultado.movimentos[1]).toEqual({
      dataLancamento: "2026-01-05",
      dataValor: "2026-01-06",
      descricao: "TRF DE QUOTIZACAO MES DE JANEIRO",
      montanteCents: 300000,
      saldoCents: 1000000,
    });
    expect(resultado.movimentos[2]).toEqual({
      dataLancamento: "2026-01-02",
      dataValor: "2026-01-02",
      descricao: "DD CONDOMINIO RUA DAS FLORES",
      montanteCents: -700000,
      saldoCents: 700000,
    });

    // As duas linhas inválidas (zero e moeda estrangeira) viram avisos, não movimentos.
    expect(resultado.erros.map((e) => e.motivo)).toEqual(["valor a zero", "moeda USD — só se importa EUR"]);
    expect(resultado.erros.every((e) => e.linha > 8)).toBe(true);

    expect(validarCadeiaSaldos(resultado.movimentos).ok).toBe(true);
    expect(resultado.saldoInicialCents).toBe(1400000);
    expect(resultado.saldoFinalCents).toBe(800000);
  });

  it("recusa um ficheiro sem o cabeçalho do extrato BCP", () => {
    const folha = XLSX.utils.aoa_to_sheet([["qualquer", "coisa"], ["sem", "cabeçalho"]]);
    const livro = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(livro, folha, "Folha");
    const buffer = XLSX.write(livro, { type: "buffer", bookType: "xlsx" }) as Buffer;

    const resultado = parseExtratoBcp(buffer);
    expect(resultado).toEqual({
      erro: "O ficheiro não parece um extrato do Millennium BCP (cabeçalho 'Data Lançamento' não encontrado).",
    });
  });
});
