/**
 * Índice de referências das evidências do relatório.
 *
 * O problema que resolve: no caso Pinturas Verticais existem 222 evidências
 * ligadas a 59 fontes distintas. Sem índice, a mesma citação aparece três
 * vezes — na memória da contratação, na secção de divergências e na lista de
 * fontes — e o documento cresce sem acrescentar informação.
 *
 * Com índice, cada fonte recebe um código estável (E01, E02, …) atribuído pela
 * ordem em que aparece na leitura cronológica. O corpo do relatório refere
 * `[E04]`; o texto integral vive uma única vez, na secção final.
 *
 * A numeração depende do conjunto de acontecimentos filtrado: mudar o período
 * renumera. É intencional — os códigos são coordenadas dentro deste documento,
 * não identificadores persistentes. O identificador persistente da fonte é o
 * seu `id`, que vai a par do código.
 */

import type { ContratoMemoriaEvento } from "@/types/database";

export type FonteReferenciada = {
  /** Código de leitura dentro deste documento: E01, E02, … */
  codigo: string;
  id: string;
  titulo: string;
  referencia: string | null;
  url: string | null;
  /** Localizadores distintos por onde esta fonte foi citada. */
  localizadores: string[];
  /** Primeira citação registada, para a entrada da lista de fontes. */
  citacao: string | null;
  /** Quantas evidências no período apontam para esta fonte. */
  ocorrencias: number;
};

export type IndiceEvidencias = {
  /** Fontes por ordem de código. */
  fontes: FonteReferenciada[];
  /** Códigos a citar em cada acontecimento, por ordem de código. */
  codigosPorEvento: Map<string, string[]>;
  /** Código de uma fonte a partir do seu id, para citar evidências isoladas. */
  codigoPorFonte: Map<string, string>;
};

const codigoDe = (posicao: number) => `E${String(posicao).padStart(2, "0")}`;

/**
 * Constrói o índice a partir dos acontecimentos já filtrados e ordenados.
 *
 * Espera-se a ordem cronológica em que serão apresentados: é dela que sai a
 * numeração, para que `[E01]` seja de facto a primeira referência que o leitor
 * encontra.
 */
export function indexarEvidencias(eventos: ContratoMemoriaEvento[]): IndiceEvidencias {
  const porFonte = new Map<string, FonteReferenciada>();
  const codigosPorEvento = new Map<string, string[]>();

  for (const evento of eventos) {
    const codigosDoEvento = new Set<string>();

    for (const evidencia of evento.contrato_memoria_evidencias ?? []) {
      for (const fonte of evidencia.ia_documental_fontes ?? []) {
        let registo = porFonte.get(fonte.id);
        if (!registo) {
          registo = {
            codigo: codigoDe(porFonte.size + 1),
            id: fonte.id,
            titulo: fonte.titulo,
            referencia: fonte.referencia,
            url: fonte.url,
            localizadores: [],
            citacao: null,
            ocorrencias: 0,
          };
          porFonte.set(fonte.id, registo);
        }
        registo.ocorrencias += 1;
        // A primeira citação encontrada é a que representa a fonte na lista
        // final. Guardar todas duplicaria o que o índice existe para evitar.
        if (!registo.citacao && evidencia.citacao) registo.citacao = evidencia.citacao;
        if (evidencia.localizador && !registo.localizadores.includes(evidencia.localizador)) {
          registo.localizadores.push(evidencia.localizador);
        }
        codigosDoEvento.add(registo.codigo);
      }
    }

    if (codigosDoEvento.size > 0) {
      codigosPorEvento.set(evento.id, [...codigosDoEvento].sort());
    }
  }

  const fontes = [...porFonte.values()];
  return {
    fontes,
    codigosPorEvento,
    codigoPorFonte: new Map(fontes.map((fonte) => [fonte.id, fonte.codigo])),
  };
}

/**
 * Agrupa acontecimentos por ano, do mais antigo para o mais recente.
 *
 * O relatório de um fornecedor com uma relação longa — 104 acontecimentos, no
 * caso que motivou isto — precisa de uma âncora de navegação. O ano é a única
 * que não exige interpretação dos dados.
 */
export function agruparPorAno<T extends { data_evento: string }>(eventos: T[]) {
  const grupos = new Map<string, T[]>();
  for (const evento of eventos) {
    const ano = evento.data_evento.slice(0, 4);
    const grupo = grupos.get(ano);
    if (grupo) grupo.push(evento);
    else grupos.set(ano, [evento]);
  }
  return [...grupos.entries()]
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([ano, itens]) => ({ ano, eventos: itens }));
}
