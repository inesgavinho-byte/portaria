import { describe, expect, it } from "vitest";
import {
  conflitosDocumentais,
  propostasComValor,
  type EventoRelatorio,
} from "../src/lib/relatorios/valores-fornecedor";

function evento(over: Partial<EventoRelatorio> & { id: string; data_evento: string }): EventoRelatorio {
  return {
    tipo: "outro",
    titulo: "Evento",
    resumo: "Resumo",
    natureza: "facto",
    valor_cents: null,
    contrato_memoria_evidencias: [],
    ...over,
  };
}

/** Réplica da relação Pinturas Verticais depois do backfill estrutural. */
const EVENTOS: EventoRelatorio[] = [
  evento({
    id: "e-proposta-global",
    data_evento: "2025-01-07T00:00:00Z",
    tipo: "proposta",
    titulo: "Proposta 010125-R para reabilitação e pintura das fachadas",
    valor_cents: 6300000,
  }),
  evento({
    id: "e-conflito-valor",
    data_evento: "2026-05-15T00:00:00Z",
    tipo: "conflito",
    natureza: "conflito",
    titulo: "Divergência documental do valor global da obra",
    contrato_memoria_evidencias: [
      {
        id: "ev-63",
        localizador: 'secção "Valores declarados na proposta"',
        citacao: "Valor global: €63.000.",
        papel: "primaria",
        ia_documental_fontes: [
          { id: "f-proposta", titulo: "Pinturas Verticais — proposta e adjudicação", referencia: null, url: null },
        ],
      },
      {
        id: "ev-60",
        localizador: "mapa 2025/2026, quadro-resumo",
        citacao: "Valor total da obra indicado: 60.000 EUR.",
        papel: "contradicao",
        ia_documental_fontes: [{ id: "f-mapa", titulo: "Mapa de controlo 2025/2026", referencia: null, url: null }],
      },
      {
        id: "ev-62",
        localizador: "mapa de contribuições extraordinárias",
        citacao: "Total da contribuição extraordinária: 62.000,00 EUR.",
        papel: "contradicao",
        ia_documental_fontes: [{ id: "f-contrib", titulo: "Contribuições extraordinárias", referencia: null, url: null }],
      },
    ],
  }),
  evento({
    id: "e-conflito-titulares",
    data_evento: "2026-05-15T00:00:00Z",
    tipo: "conflito",
    natureza: "conflito",
    titulo: "Mapa histórico identifica pagamentos a titulares distintos do fornecedor",
  }),
  evento({
    id: "e-proposta-lateral",
    data_evento: "2026-05-25T00:00:00Z",
    tipo: "proposta",
    titulo: "Recepção do orçamento da fachada lateral",
    valor_cents: 1590000,
  }),
  evento({
    id: "e-fatura",
    data_evento: "2026-05-26T00:00:00Z",
    tipo: "fatura",
    titulo: "Emissão e envio da Factura 2026/4",
    valor_cents: 636000,
  }),
];

describe("propostas com valor declarado", () => {
  it("devolve as propostas com valor, da mais antiga para a mais recente", () => {
    expect(propostasComValor(EVENTOS)).toEqual([
      { id: "e-proposta-global", data: "2025-01-07T00:00:00Z", titulo: EVENTOS[0].titulo, cents: 6300000 },
      { id: "e-proposta-lateral", data: "2026-05-25T00:00:00Z", titulo: EVENTOS[3].titulo, cents: 1590000 },
    ]);
  });

  it("não elege uma proposta nem soma âmbitos diferentes", () => {
    const propostas = propostasComValor(EVENTOS);
    expect(propostas).toHaveLength(2);
    const soma = propostas.reduce((total, proposta) => total + proposta.cents, 0);
    expect(soma).not.toBe(propostas[0].cents);
  });

  it("ignora acontecimentos que não são propostas, mesmo com valor", () => {
    expect(propostasComValor(EVENTOS).some((p) => p.id === "e-fatura")).toBe(false);
  });

  it("omite propostas sem valor estruturado em vez de o procurar no texto", () => {
    const semValor = [
      evento({ id: "p", data_evento: "2026-01-01T00:00:00Z", tipo: "proposta", resumo: "Valor de 15.000,00 EUR." }),
    ];
    expect(propostasComValor(semValor)).toEqual([]);
  });

  it("devolve lista vazia quando não há acontecimentos", () => {
    expect(propostasComValor([])).toEqual([]);
  });
});

describe("conflitos documentais", () => {
  it("recolhe todos os acontecimentos de natureza conflito", () => {
    expect(conflitosDocumentais(EVENTOS).map((e) => e.id)).toEqual(["e-conflito-valor", "e-conflito-titulares"]);
  });

  it("preserva as citações com o valor de cada fonte, sem eleger vencedor", () => {
    const conflito = conflitosDocumentais(EVENTOS)[0];
    const citacoes = conflito.contrato_memoria_evidencias.map((ev) => ev.citacao);
    expect(citacoes).toHaveLength(3);
    expect(citacoes.some((c) => c.includes("63.000"))).toBe(true);
    expect(citacoes.some((c) => c.includes("60.000"))).toBe(true);
    expect(citacoes.some((c) => c.includes("62.000"))).toBe(true);
    // O conflito não carrega valor próprio: nenhum dos três é adoptado.
    expect(conflito.valor_cents).toBeNull();
  });

  it("não devolve conflitos quando não existem", () => {
    expect(conflitosDocumentais([evento({ id: "a", data_evento: "2026-01-01T00:00:00Z" })])).toEqual([]);
  });
});
