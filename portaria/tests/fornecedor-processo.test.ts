/**
 * Fase B do goal-portaria-1.0 — registo do processo pela interface.
 *
 * O que se prova aqui, sem base de dados:
 *
 *   1. `eurosParaCents` lê valores como uma pessoa os escreve ("1.234,56",
 *      "1590,00", "68700") e recusa o que não sabe ler — devolvendo
 *      "invalido" em vez de zero, para que um valor mal escrito nunca seja
 *      registado como gratuito;
 *   2. `validarAcontecimento` exige contrato na criação, tolera a sua ausência
 *      na correcção (o contrato de um acontecimento não é editável) e valida
 *      data, tipo, natureza, título e resumo;
 *   3. `validarPosicao` mantém a regra de ouro de 20260826000000 ao nível do
 *      formulário: imputar ou negar exige dizer a qual factura; só a reserva
 *      pode ser vaga, e nela a factura é esquecida; evidência sem citação ou
 *      citação sem documento são recusadas;
 *   4. `validarEstadoPosicao` só aceita estados que mantêm histórico — nunca
 *      apagam;
 *   5. os componentes novos renderizam sozinhos: o registo de acontecimento
 *      com e sem contratos, o bloco de processo de um pagamento imputado e
 *      não-imputado, com posições divergentes de duas partes.
 */

import { describe, expect, it } from "vitest";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";

import {
  eurosParaCents,
  validarAcontecimento,
  validarEstadoPosicao,
  validarPosicao,
} from "../src/lib/fornecedores/processo";
import { AcontecimentoRegistar } from "../src/components/admin/acontecimento-forms";
import { ProcessoMovimento } from "../src/components/admin/processo-movimento";
import type { PosicaoImputacao } from "../src/types/database";

/* ------------------------------------------------------------------ */
/* eurosParaCents                                                      */
/* ------------------------------------------------------------------ */

describe("eurosParaCents", () => {
  it("lê o formato português com milhares e decimais", () => {
    expect(eurosParaCents("1.234,56")).toBe(123_456);
    expect(eurosParaCents("68.700,00")).toBe(6_870_000);
  });

  it("lê o formato com ponto decimal", () => {
    expect(eurosParaCents("1590.00")).toBe(159_000);
    expect(eurosParaCents("0.05")).toBe(5);
  });

  it("lê vírgula como decimal", () => {
    expect(eurosParaCents("1590,00")).toBe(159_000);
    expect(eurosParaCents("15,9")).toBe(1590);
  });

  it("lê inteiros e ignora espaços e símbolo de euro", () => {
    expect(eurosParaCents("1590")).toBe(159_000);
    expect(eurosParaCents(" 1 590,00 € ")).toBe(159_000);
  });

  it("arredonda cêntimos em vez de truncar", () => {
    expect(eurosParaCents("10,005")).toBe(1001);
  });

  it("vazio é ausência de valor, nunca zero", () => {
    expect(eurosParaCents("")).toBeNull();
    expect(eurosParaCents("   ")).toBeNull();
    expect(eurosParaCents(null)).toBeNull();
    expect(eurosParaCents(undefined)).toBeNull();
  });

  it("valor ilegível é invalido, não zero", () => {
    expect(eurosParaCents("mil euros")).toBe("invalido");
    expect(eurosParaCents("12,34,56")).toBe("invalido");
  });
});

/* ------------------------------------------------------------------ */
/* validarAcontecimento                                                */
/* ------------------------------------------------------------------ */

function formDataAcontecimento(over: Record<string, string> = {}): FormData {
  const fd = new FormData();
  fd.set("contrato_id", "contrato-1");
  fd.set("data_evento", "2025-09-04");
  fd.set("tipo", "comunicacao");
  fd.set("natureza", "conflito");
  fd.set("titulo", "Folha de adjudicação entregue a 04-09-2025");
  fd.set("resumo", "A folha aposta a um corpo entregue três meses depois do previsto.");
  fd.set("valor", "68.700,00");
  for (const [chave, valor] of Object.entries(over)) {
    if (valor === "") fd.delete(chave);
    else fd.set(chave, valor);
  }
  return fd;
}

describe("validarAcontecimento", () => {
  it("aceita um acontecimento completo e converte o valor", () => {
    const resultado = validarAcontecimento(formDataAcontecimento(), { comContrato: true });
    expect(resultado.ok).toBe(true);
    if (resultado.ok) {
      expect(resultado.valores.contratoId).toBe("contrato-1");
      expect(resultado.valores.valorCents).toBe(6_870_000);
      expect(resultado.valores.natureza).toBe("conflito");
      // Meio-dia UTC: a data escolhida não desliza de dia em nenhum fuso ocidental.
      expect(resultado.valores.dataEvento).toBe("2025-09-04T12:00:00.000Z");
    }
  });

  it("na criação, acontecimento sem contrato é recusado", () => {
    const resultado = validarAcontecimento(formDataAcontecimento({ contrato_id: "" }), {
      comContrato: true,
    });
    expect(resultado.ok).toBe(false);
    if (!resultado.ok) expect(resultado.fieldErrors?.contrato).toBeTruthy();
  });

  it("na correcção, o contrato não é exigido — não é editável", () => {
    const resultado = validarAcontecimento(formDataAcontecimento({ contrato_id: "" }), {
      comContrato: false,
    });
    expect(resultado.ok).toBe(true);
  });

  it("recusa data em falta ou ilegível", () => {
    for (const data of ["", "04/09/2025"]) {
      const resultado = validarAcontecimento(formDataAcontecimento({ data_evento: data }), {
        comContrato: false,
      });
      expect(resultado.ok).toBe(false);
      if (!resultado.ok) expect(resultado.fieldErrors?.data).toBeTruthy();
    }
  });

  it("recusa tipo e natureza fora do domínio", () => {
    const resultado = validarAcontecimento(
      formDataAcontecimento({ tipo: "piada", natureza: "talvez" }),
      { comContrato: false },
    );
    expect(resultado.ok).toBe(false);
    if (!resultado.ok) {
      expect(resultado.fieldErrors?.tipo).toBeTruthy();
      expect(resultado.fieldErrors?.natureza).toBeTruthy();
    }
  });

  it("recusa título e resumo vazios", () => {
    const resultado = validarAcontecimento(
      formDataAcontecimento({ titulo: "", resumo: "" }),
      { comContrato: false },
    );
    expect(resultado.ok).toBe(false);
    if (!resultado.ok) {
      expect(resultado.fieldErrors?.titulo).toBeTruthy();
      expect(resultado.fieldErrors?.resumo).toBeTruthy();
    }
  });

  it("recusa valor ilegível com erro próprio", () => {
    const resultado = validarAcontecimento(formDataAcontecimento({ valor: "caro" }), {
      comContrato: false,
    });
    expect(resultado.ok).toBe(false);
    if (!resultado.ok) expect(resultado.fieldErrors?.valor).toBeTruthy();
  });
});

/* ------------------------------------------------------------------ */
/* validarPosicao                                                      */
/* ------------------------------------------------------------------ */

function formDataPosicao(over: Record<string, string> = {}): FormData {
  const fd = new FormData();
  fd.set("movimento_id", "movimento-1");
  fd.set("parte", "contraparte");
  fd.set("tipo", "imputa");
  fd.set("despesa_id", "despesa-1");
  fd.set("fundamento", "O pagamento liquidou a factura 2026/4, conforme folha de folhas.");
  fd.set("data_posicao", "2025-09-01");
  for (const [chave, valor] of Object.entries(over)) {
    if (valor === "") fd.delete(chave);
    else fd.set(chave, valor);
  }
  return fd;
}

describe("validarPosicao", () => {
  it("aceita uma posição completa", () => {
    const resultado = validarPosicao(formDataPosicao());
    expect(resultado.ok).toBe(true);
    if (resultado.ok) {
      expect(resultado.valores.despesaId).toBe("despesa-1");
      expect(resultado.valores.dataPosicao).toBe("2025-09-01T12:00:00.000Z");
      expect(resultado.valores.evidencia).toBeNull();
    }
  });

  it("imputar sem indicar a factura é recusado", () => {
    const resultado = validarPosicao(formDataPosicao({ despesa_id: "" }));
    expect(resultado.ok).toBe(false);
    if (!resultado.ok) expect(resultado.fieldErrors?.despesa).toBeTruthy();
  });

  it("nao_imputa também exige a factura — é sobre ela que se nega", () => {
    const resultado = validarPosicao(formDataPosicao({ tipo: "nao_imputa", despesa_id: "" }));
    expect(resultado.ok).toBe(false);
    if (!resultado.ok) expect(resultado.fieldErrors?.despesa).toBeTruthy();
  });

  it("a reserva pode ser vaga — e a factura é esquecida", () => {
    const resultado = validarPosicao(formDataPosicao({ tipo: "reserva", despesa_id: "despesa-1" }));
    expect(resultado.ok).toBe(true);
    if (resultado.ok) {
      expect(resultado.valores.despesaId).toBeNull();
      expect(resultado.valores.tipo).toBe("reserva");
    }
  });

  it("evidência com documento exige citação", () => {
    const resultado = validarPosicao(
      formDataPosicao({ documento_id: "documento-1", citacao: "" }),
    );
    expect(resultado.ok).toBe(false);
    if (!resultado.ok) expect(resultado.fieldErrors?.citacao).toBeTruthy();
  });

  it("citação sem documento é recusada — não há passagem sem fonte", () => {
    const resultado = validarPosicao(formDataPosicao({ citacao: "«pagarei tudo»" }));
    expect(resultado.ok).toBe(false);
    if (!resultado.ok) expect(resultado.fieldErrors?.documento).toBeTruthy();
  });

  it("evidência completa segue para a acção", () => {
    const resultado = validarPosicao(
      formDataPosicao({ documento_id: "documento-1", citacao: "«o pagamento reporta-se à 2026/4»", localizador: "email de 11-06-2025" }),
    );
    expect(resultado.ok).toBe(true);
    if (resultado.ok) {
      expect(resultado.valores.evidencia).toEqual({
        documentoId: "documento-1",
        localizador: "email de 11-06-2025",
        citacao: "«o pagamento reporta-se à 2026/4»",
      });
    }
  });

  it("fundamento é obrigatório — é o argumento da parte", () => {
    const resultado = validarPosicao(formDataPosicao({ fundamento: "" }));
    expect(resultado.ok).toBe(false);
    if (!resultado.ok) expect(resultado.fieldErrors?.fundamento).toBeTruthy();
  });
});

/* ------------------------------------------------------------------ */
/* validarEstadoPosicao                                                */
/* ------------------------------------------------------------------ */

describe("validarEstadoPosicao", () => {
  it("aceita só os estados que mantêm histórico", () => {
    expect(validarEstadoPosicao("sustentada")).toBe("sustentada");
    expect(validarEstadoPosicao("aceite")).toBe("aceite");
    expect(validarEstadoPosicao("retirada")).toBe("retirada");
    expect(validarEstadoPosicao("superada")).toBe("superada");
    expect(validarEstadoPosicao("apagada")).toBeNull();
    expect(validarEstadoPosicao("")).toBeNull();
  });
});

/* ------------------------------------------------------------------ */
/* Render                                                              */
/* ------------------------------------------------------------------ */

function posicao(over: Partial<PosicaoImputacao> = {}): PosicaoImputacao {
  return {
    id: "posicao-1",
    tenant_id: "t",
    movimento_id: "movimento-1",
    despesa_id: "despesa-1",
    parte: "contraparte",
    parte_descricao: null,
    tipo: "imputa",
    fundamento: "O pagamento liquidou a factura 2026/4.",
    estado: "sustentada",
    data_posicao: "2025-09-01T12:00:00.000Z",
    observacoes: null,
    criado_em: "2025-09-01T12:00:00.000Z",
    atualizado_em: "2025-09-01T12:00:00.000Z",
    imputacoes_posicoes_evidencias: [],
    ...over,
  } as PosicaoImputacao;
}

const FACTURAS = [
  { id: "despesa-1", numero: "2026/4", descricao: "Factura de execução", valor: "15.900,00 €" },
];

describe("ProcessoMovimento (render)", () => {
  it("movimento sem factura mostra que está por identificar e não imputa nada", () => {
    const markup = renderToStaticMarkup(
      createElement(ProcessoMovimento, {
        movimento: {
          id: "movimento-1",
          despesa_id: null,
          estado_reconciliacao: "parcial",
          tipo: "debito",
          confirmado: true,
        },
        facturas: FACTURAS,
        posicoes: [],
        documentos: [],
        redirectTo: "/fornecedores/f-1",
        fornecedorId: "f-1",
      }),
    );
    expect(markup).toContain("Factura exacta por identificar");
    expect(markup).toContain("Imputação do pagamento");
    expect(markup).not.toContain("Anular imputação");
  });

  it("movimento imputado mostra a factura e o anular — e nunca o contrário", () => {
    const markup = renderToStaticMarkup(
      createElement(ProcessoMovimento, {
        movimento: {
          id: "movimento-1",
          despesa_id: "despesa-1",
          estado_reconciliacao: "reconciliado",
          tipo: "debito",
          confirmado: true,
        },
        facturas: FACTURAS,
        posicoes: [],
        documentos: [],
        redirectTo: "/fornecedores/f-1",
        fornecedorId: "f-1",
      }),
    );
    expect(markup).toContain("2026/4");
    expect(markup).toContain("Anular imputação");
    expect(markup).not.toContain("Factura exacta por identificar");
  });

  it("posições de duas partes divergentes aparecem com parte, tipo e estado", () => {
    const markup = renderToStaticMarkup(
      createElement(ProcessoMovimento, {
        movimento: {
          id: "movimento-1",
          despesa_id: null,
          estado_reconciliacao: "parcial",
          tipo: "debito",
          confirmado: true,
        },
        facturas: FACTURAS,
        posicoes: [
          posicao(),
          posicao({
            id: "posicao-2",
            parte: "condominio",
            tipo: "nao_imputa",
            despesa_id: "despesa-1",
            fundamento: "A factura 2026/4 continua por liquidar.",
            estado: "sustentada",
            imputacoes_posicoes_evidencias: [
              {
                id: "evid-1",
                localizador: "email de 11-06-2025",
                citacao: "«a factura permanece em aberto»",
                ia_documental_fontes: [
                  { id: "fonte-1", titulo: "Email de 11-06-2025", referencia: null, url: null, documento_id: null },
                ],
              },
            ],
          }),
        ],
        documentos: [],
        redirectTo: "/fornecedores/f-1",
        fornecedorId: "f-1",
      }),
    );
    expect(markup).toContain("Posições das partes (2)");
    expect(markup).toContain("Contraparte");
    expect(markup).toContain("Condomínio");
    expect(markup).toContain("Sustenta que continua por liquidar");
    expect(markup).toContain("«a factura permanece em aberto»");
    expect(markup).toContain("Retirada");
  });

  it("movimento de crédito não oferece imputação", () => {
    const markup = renderToStaticMarkup(
      createElement(ProcessoMovimento, {
        movimento: {
          id: "movimento-2",
          despesa_id: null,
          estado_reconciliacao: "nao_reconciliado",
          tipo: "credito",
          confirmado: true,
        },
        facturas: FACTURAS,
        posicoes: [],
        documentos: [],
        redirectTo: "/fornecedores/f-1",
        fornecedorId: "f-1",
      }),
    );
    expect(markup).toContain("Imputação do pagamento");
    expect(markup).not.toContain("Escolher factura");
  });
});

describe("AcontecimentoRegistar (render)", () => {
  it("sem contratos, explica que a memória pertence a um contrato", () => {
    const markup = renderToStaticMarkup(
      createElement(AcontecimentoRegistar, {
        contratos: [],
        redirectTo: "/fornecedores/f-1",
        fornecedorId: "f-1",
      }),
    );
    expect(markup).toContain("A memória da contratação pertence a um contrato");
    expect(markup).not.toContain("Registar acontecimento");
  });

  it("com contratos, oferece o registo", () => {
    const markup = renderToStaticMarkup(
      createElement(AcontecimentoRegistar, {
        contratos: [{ id: "contrato-1", titulo: "Empreitada de pinturas" }],
        redirectTo: "/fornecedores/f-1",
        fornecedorId: "f-1",
      }),
    );
    expect(markup).toContain("Registar acontecimento");
  });
});
