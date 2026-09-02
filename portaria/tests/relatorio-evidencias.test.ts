import { describe, expect, it } from "vitest";
import { agruparPorAno, indexarEvidencias } from "../src/lib/relatorios/evidencias";
import type { ContratoMemoriaEvento } from "../src/types/database";

type Citacao = { fonteId: string; titulo?: string; citacao?: string; localizador?: string | null };

let sequencia = 0;

function evento(data: string, citacoes: Citacao[][] = []): ContratoMemoriaEvento {
  sequencia += 1;
  return {
    id: `evento-${sequencia}`,
    data_evento: data,
    tipo: "comunicacao",
    titulo: `Acontecimento ${sequencia}`,
    resumo: "",
    natureza: "facto",
    valor_cents: null,
    despesa_id: null,
    movimento_id: null,
    efeito: null,
    criado_em: data,
    contrato_memoria_evidencias: citacoes.map((fontes, i) => ({
      id: `evidencia-${sequencia}-${i}`,
      localizador: fontes[0]?.localizador ?? null,
      citacao: fontes[0]?.citacao ?? "citação",
      papel: "primaria" as const,
      ia_documental_fontes: fontes.map((fonte) => ({
        id: fonte.fonteId,
        titulo: fonte.titulo ?? `Fonte ${fonte.fonteId}`,
        referencia: null,
        url: null,
        documento_id: null,
      })),
    })),
  };
}

describe("indexarEvidencias", () => {
  it("numera as fontes pela ordem em que aparecem na leitura", () => {
    const indice = indexarEvidencias([
      evento("2025-01-01", [[{ fonteId: "b" }]]),
      evento("2025-02-01", [[{ fonteId: "a" }]]),
    ]);
    expect(indice.fontes.map((f) => [f.codigo, f.id])).toEqual([
      ["E01", "b"],
      ["E02", "a"],
    ]);
  });

  it("atribui um só código a uma fonte citada várias vezes", () => {
    const primeiro = evento("2025-01-01", [[{ fonteId: "a" }]]);
    const segundo = evento("2025-03-01", [[{ fonteId: "a" }]]);
    const indice = indexarEvidencias([primeiro, segundo]);

    expect(indice.fontes).toHaveLength(1);
    expect(indice.fontes[0].ocorrencias).toBe(2);
    // É a razão de existir do índice: a mesma fonte citada em dois sítios não
    // duplica o texto, referencia-se pelo mesmo código nos dois.
    expect(indice.codigosPorEvento.get(primeiro.id)).toEqual(["E01"]);
    expect(indice.codigosPorEvento.get(segundo.id)).toEqual(["E01"]);
  });

  it("não repete o código quando o mesmo acontecimento cita a fonte duas vezes", () => {
    const unico = evento("2025-01-01", [[{ fonteId: "a" }], [{ fonteId: "a" }]]);
    const indice = indexarEvidencias([unico]);
    expect(indice.codigosPorEvento.get(unico.id)).toEqual(["E01"]);
  });

  it("guarda a primeira citação e acumula localizadores distintos", () => {
    const indice = indexarEvidencias([
      evento("2025-01-01", [[{ fonteId: "a", citacao: "primeira", localizador: "p. 1" }]]),
      evento("2025-02-01", [[{ fonteId: "a", citacao: "segunda", localizador: "p. 4" }]]),
      evento("2025-03-01", [[{ fonteId: "a", citacao: "terceira", localizador: "p. 1" }]]),
    ]);
    expect(indice.fontes[0].citacao).toBe("primeira");
    expect(indice.fontes[0].localizadores).toEqual(["p. 1", "p. 4"]);
  });

  it("indexa todas as fontes de uma evidência que cita mais do que uma", () => {
    const conflito = evento("2025-01-01", [[{ fonteId: "a" }, { fonteId: "b" }]]);
    const indice = indexarEvidencias([conflito]);
    expect(indice.codigosPorEvento.get(conflito.id)).toEqual(["E01", "E02"]);
  });

  it("passa dos noventa e nove sem perder o alinhamento do código", () => {
    const eventos = Array.from({ length: 101 }, (_, i) =>
      evento("2025-01-01", [[{ fonteId: `fonte-${i}` }]]),
    );
    const indice = indexarEvidencias(eventos);
    expect(indice.fontes[98].codigo).toBe("E99");
    expect(indice.fontes[99].codigo).toBe("E100");
  });

  it("omite do mapa os acontecimentos sem evidência", () => {
    const semEvidencia = evento("2025-01-01");
    const indice = indexarEvidencias([semEvidencia]);
    expect(indice.codigosPorEvento.has(semEvidencia.id)).toBe(false);
    expect(indice.fontes).toEqual([]);
  });

  it("expõe a fonte pelo id para citar uma evidência isolada", () => {
    const indice = indexarEvidencias([evento("2025-01-01", [[{ fonteId: "a" }, { fonteId: "b" }]])]);
    expect(indice.codigoPorFonte.get("b")).toBe("E02");
    expect(indice.codigoPorFonte.get("inexistente")).toBeUndefined();
  });
});

describe("agruparPorAno", () => {
  it("agrupa por ano do mais antigo para o mais recente", () => {
    const grupos = agruparPorAno([
      { data_evento: "2026-03-01" },
      { data_evento: "2024-11-01" },
      { data_evento: "2026-01-01" },
    ]);
    expect(grupos.map((g) => g.ano)).toEqual(["2024", "2026"]);
    expect(grupos[1].eventos).toHaveLength(2);
  });

  it("preserva dentro do ano a ordem recebida", () => {
    const grupos = agruparPorAno([
      { data_evento: "2025-05-01", marca: "segundo" },
      { data_evento: "2025-01-01", marca: "primeiro" },
    ]);
    // A função não reordena: a ordenação cronológica é responsabilidade da
    // consulta, e reordenar aqui esconderia um erro de consulta em vez de o
    // revelar.
    expect(grupos[0].eventos.map((e) => e.marca)).toEqual(["segundo", "primeiro"]);
  });

  it("devolve vazio sem acontecimentos", () => {
    expect(agruparPorAno([])).toEqual([]);
  });
});
