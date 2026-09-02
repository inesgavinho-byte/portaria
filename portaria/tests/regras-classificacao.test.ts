import { describe, expect, it } from "vitest";
import {
  aplicarRegrasAMovimentos,
  normalizarPadrao,
  type MovimentoClassificavel,
  type RegraClassificacao,
} from "../src/lib/financeiro/regras-classificacao";

function mov(over: Partial<MovimentoClassificavel> & { id: string }): MovimentoClassificavel {
  return {
    descricao: "Movimento",
    contraparte: null,
    fornecedor_id: null,
    fornecedor_nao_aplicavel: false,
    ...over,
  };
}

function regra(over: Partial<RegraClassificacao> & { id: string; padrao: string }): RegraClassificacao {
  return {
    fornecedorId: "f-padrao",
    semFornecedor: false,
    ...over,
  };
}

describe("normalizarPadrao", () => {
  it("normaliza descrições reais para a forma canónica de matching", () => {
    expect(normalizarPadrao("COM. MANUTENCAO CONTA CONDOMINIO 072026")).toBe(
      "com manutencao conta condominio 072026",
    );
    expect(normalizarPadrao("TRF. P/O TK ELEVADORES")).toBe("trf p o tk elevadores");
  });

  it("remove acentos, pontuação e espaços duplicados", () => {
    expect(normalizarPadrao("  Comunicação   do Prédio nº 3!  ")).toBe("comunicacao do predio n 3");
  });
});

describe("aplicarRegrasAMovimentos", () => {
  const regras = [
    regra({ id: "r1", padrao: "com manutencao conta condominio", fornecedorId: "f-manutencao" }),
    regra({ id: "r2", padrao: "tk elevadores", fornecedorId: "f-tk" }),
    regra({ id: "r3", padrao: "imposto do selo", semFornecedor: true, fornecedorId: null }),
  ];

  it("casa o padrão na descrição do movimento", () => {
    const classificacoes = aplicarRegrasAMovimentos(
      [mov({ id: "m1", descricao: "COM. MANUTENCAO CONTA CONDOMINIO 072026" })],
      regras,
    );
    expect(classificacoes).toEqual([
      { movimentoId: "m1", fornecedorId: "f-manutencao", semFornecedor: false },
    ]);
  });

  it("casa o padrão na contraparte quando a descrição não casa", () => {
    const classificacoes = aplicarRegrasAMovimentos(
      [
        mov({
          id: "m1",
          descricao: "TRF. P/O TK ELEVADORES",
          contraparte: "TK Elevadores Lda",
        }),
      ],
      regras,
    );
    expect(classificacoes).toEqual([{ movimentoId: "m1", fornecedorId: "f-tk", semFornecedor: false }]);
  });

  it("a primeira regra criada vence quando várias casam", () => {
    const duplicadas = [
      regra({ id: "r-a", padrao: "manutencao", fornecedorId: "f-a" }),
      regra({ id: "r-b", padrao: "manutencao conta", fornecedorId: "f-b" }),
    ];
    const classificacoes = aplicarRegrasAMovimentos(
      [mov({ id: "m1", descricao: "COM. MANUTENCAO CONTA CONDOMINIO 072026" })],
      duplicadas,
    );
    expect(classificacoes).toHaveLength(1);
    expect(classificacoes[0].fornecedorId).toBe("f-a");
  });

  it("ignora movimentos já classificados (fornecedor ou sem fornecedor)", () => {
    const classificacoes = aplicarRegrasAMovimentos(
      [
        mov({ id: "m1", descricao: "COM. MANUTENCAO CONTA CONDOMINIO 072026", fornecedor_id: "f-outro" }),
        mov({
          id: "m2",
          descricao: "COM. MANUTENCAO CONTA CONDOMINIO 072026",
          fornecedor_nao_aplicavel: true,
        }),
      ],
      regras,
    );
    expect(classificacoes).toEqual([]);
  });

  it("mantém o XOR: regra sem fornecedor devolve fornecedorId null e semFornecedor true", () => {
    const classificacoes = aplicarRegrasAMovimentos(
      [
        mov({ id: "m1", descricao: "IMPOSTO DO SELO JUNHO" }),
        mov({ id: "m2", descricao: "TRF. P/O TK ELEVADORES" }),
      ],
      regras,
    );
    expect(classificacoes).toEqual([
      { movimentoId: "m1", fornecedorId: null, semFornecedor: true },
      { movimentoId: "m2", fornecedorId: "f-tk", semFornecedor: false },
    ]);
    for (const classificacao of classificacoes) {
      expect(classificacao.semFornecedor).toBe(classificacao.fornecedorId === null);
    }
  });

  it("não classifica nada sem regras ou sem padrões", () => {
    expect(aplicarRegrasAMovimentos([mov({ id: "m1", descricao: "COM. MANUTENCAO" })], [])).toEqual([]);
    expect(
      aplicarRegrasAMovimentos([mov({ id: "m1", descricao: "COM. MANUTENCAO" })], [
        regra({ id: "r0", padrao: "", fornecedorId: "f-x" }),
      ]),
    ).toEqual([]);
  });
});
