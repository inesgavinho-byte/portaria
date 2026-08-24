import { describe, expect, it } from "vitest";
import {
  estadoAtribuicao,
  resumirTriagem,
  sugerirFornecedores,
  type FornecedorCandidato,
  type MovimentoAtribuivel,
} from "../src/lib/financeiro/atribuicao-movimentos";

function mov(over: Partial<MovimentoAtribuivel> & { id: string }): MovimentoAtribuivel {
  return {
    data_movimento: "2026-06-11",
    tipo: "debito",
    valor_cents: 10000,
    descricao: "Movimento",
    contraparte: null,
    confirmado: true,
    despesa_id: null,
    fornecedor_id: null,
    fornecedor_nao_aplicavel: false,
    ...over,
  };
}

const FORNECEDORES: FornecedorCandidato[] = [
  { id: "f-pinturas", nome: "Pinturas Verticais", ativo: true },
  { id: "f-simas", nome: "SIMAS Oeiras e Amadora", ativo: true },
  { id: "f-su", nome: "SU Eletricidade", ativo: true },
  { id: "f-cmc", nome: "CMC Extintores", ativo: true },
  { id: "f-tk", nome: "TK Elevator", ativo: true },
  { id: "f-generali", nome: "Generali Tranquilidade", ativo: false },
];

describe("estado de atribuição", () => {
  it("deriva os três estados sem coluna redundante", () => {
    expect(estadoAtribuicao(mov({ id: "a", fornecedor_id: "f-pinturas" }))).toBe("atribuido");
    expect(estadoAtribuicao(mov({ id: "b", fornecedor_nao_aplicavel: true }))).toBe("nao_aplicavel");
    expect(estadoAtribuicao(mov({ id: "c" }))).toBe("pendente");
  });

  it("dá precedência ao fornecedor atribuído", () => {
    // A constraint da base impede este par, mas a leitura não deve depender disso.
    expect(estadoAtribuicao(mov({ id: "d", fornecedor_id: "f-su", fornecedor_nao_aplicavel: true }))).toBe("atribuido");
  });
});

describe("resumo da triagem", () => {
  it("conta cada estado e soma apenas débitos confirmados por triar", () => {
    const resumo = resumirTriagem([
      mov({ id: "1", fornecedor_id: "f-pinturas", valor_cents: 636000 }),
      mov({ id: "2", fornecedor_nao_aplicavel: true, valor_cents: 26 }),
      mov({ id: "3", valor_cents: 12700 }),
      mov({ id: "4", valor_cents: 5000, tipo: "credito" }),
      mov({ id: "5", valor_cents: 9999, confirmado: false }),
    ]);
    expect(resumo.atribuidos).toBe(1);
    expect(resumo.naoAplicaveis).toBe(1);
    expect(resumo.pendentes).toBe(3);
    // Só o débito confirmado por triar entra no valor.
    expect(resumo.valorPendenteCents).toBe(12700);
  });

  it("devolve zeros para uma lista vazia", () => {
    expect(resumirTriagem([])).toEqual({ pendentes: 0, atribuidos: 0, naoAplicaveis: 0, valorPendenteCents: 0 });
  });
});

describe("sugestões de fornecedor", () => {
  it("classifica a contraparte idêntica como correspondência exacta", () => {
    const sugestoes = sugerirFornecedores(mov({ id: "1", contraparte: "Pinturas Verticais" }), FORNECEDORES);
    expect(sugestoes[0].fornecedor.id).toBe("f-pinturas");
    expect(sugestoes[0].confianca).toBe("exacta");
  });

  it("ignora acentos, maiúsculas e pontuação", () => {
    const sugestoes = sugerirFornecedores(mov({ id: "1", contraparte: "  simas oeiras e amadora  " }), FORNECEDORES);
    expect(sugestoes[0].fornecedor.id).toBe("f-simas");
    expect(sugestoes[0].confianca).toBe("exacta");
  });

  it("encontra o fornecedor no texto da descrição quando a contraparte é nula", () => {
    const sugestoes = sugerirFornecedores(
      mov({ id: "1", descricao: "TRF P/ CMC Extintores Lda", contraparte: null }),
      FORNECEDORES,
    );
    expect(sugestoes[0].fornecedor.id).toBe("f-cmc");
    expect(sugestoes[0].confianca).toBe("provavel");
  });

  it("não sugere nada para encargos que não têm fornecedor", () => {
    expect(sugerirFornecedores(mov({ id: "1", descricao: "Taxa Social Única — maio 2026" }), FORNECEDORES)).toEqual([]);
    expect(sugerirFornecedores(mov({ id: "2", descricao: "Imposto do selo" }), FORNECEDORES)).toEqual([]);
    expect(sugerirFornecedores(mov({ id: "3", descricao: "Portagens Agregados" }), FORNECEDORES)).toEqual([]);
  });

  it("não sugere com base apenas em palavras vazias", () => {
    const sugestoes = sugerirFornecedores(
      mov({ id: "1", descricao: "Transferência recebida", contraparte: "Condomínio" }),
      [{ id: "f-x", nome: "Transferências Lda", ativo: true }],
    );
    expect(sugestoes).toEqual([]);
  });

  it("devolve lista vazia quando não há texto para comparar", () => {
    expect(sugerirFornecedores(mov({ id: "1", descricao: "", contraparte: null }), FORNECEDORES)).toEqual([]);
  });

  it("ordena da confiança mais alta para a mais baixa e respeita o limite", () => {
    const candidatos: FornecedorCandidato[] = [
      { id: "f-possivel", nome: "Águas de Oeiras e Amadora", ativo: true },
      { id: "f-exacta", nome: "SIMAS Oeiras e Amadora", ativo: true },
    ];
    const movimento = mov({ id: "1", contraparte: "SIMAS Oeiras e Amadora" });
    expect(sugerirFornecedores(movimento, candidatos).map((s) => s.fornecedor.id)).toEqual([
      "f-exacta",
      "f-possivel",
    ]);
    expect(sugerirFornecedores(movimento, candidatos, 1)).toHaveLength(1);
  });

  it("não sugere com base num único termo em comum", () => {
    // Caso real: dois nomes que partilham apenas o primeiro nome e não têm
    // relação nenhuma. Uma sugestão aqui convida a um clique que corrompe KPIs.
    const sugestoes = sugerirFornecedores(
      mov({ id: "1", contraparte: "José Artur Castro Inácio" }),
      [{ id: "f-manageiro", nome: "José João Manageiro", ativo: true }],
    );
    expect(sugestoes).toEqual([]);
  });

  it("exige dois termos significativos para a confiança mais fraca", () => {
    const sugestoes = sugerirFornecedores(
      mov({ id: "1", contraparte: "Oeiras Amadora Serviços" }),
      [{ id: "f-simas", nome: "SIMAS Oeiras e Amadora", ativo: true }],
    );
    expect(sugestoes).toHaveLength(1);
    expect(sugestoes[0].confianca).toBe("possivel");
    expect(sugestoes[0].motivo).toContain("oeiras");
  });

  it("inclui fornecedores arquivados nas sugestões, para não perder histórico", () => {
    const sugestoes = sugerirFornecedores(mov({ id: "1", contraparte: "Generali Tranquilidade" }), FORNECEDORES);
    expect(sugestoes[0].fornecedor.id).toBe("f-generali");
  });

  it("explica sempre o motivo da sugestão", () => {
    const sugestoes = sugerirFornecedores(mov({ id: "1", contraparte: "SU Eletricidade" }), FORNECEDORES);
    expect(sugestoes[0].motivo.length).toBeGreaterThan(0);
  });
});
