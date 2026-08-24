/**
 * Valores e divergências do relatório do fornecedor, lidos de acontecimentos
 * estruturados.
 *
 * Substitui a extracção por expressão regular sobre o markdown das fontes
 * documentais. Uma fonte é evidência; o valor de um acontecimento pertence ao
 * acontecimento. Quando o valor não está estruturado, a resposta correcta é
 * não o mostrar — não é procurá-lo no texto livre.
 */

import type { ContratoMemoriaEvidencia, ContratoMemoriaNatureza, ContratoMemoriaTipo } from "@/types/database";

export type EventoRelatorio = {
  id: string;
  data_evento: string;
  tipo: ContratoMemoriaTipo;
  titulo: string;
  resumo: string;
  natureza: ContratoMemoriaNatureza;
  valor_cents: number | null;
  contrato_memoria_evidencias: ContratoMemoriaEvidencia[];
};

export type PropostaComValor = {
  id: string;
  data: string;
  titulo: string;
  cents: number;
};

/**
 * Propostas que declaram um valor, da mais antiga para a mais recente.
 *
 * Nunca é eleita "a" proposta: uma relação pode ter várias, de âmbitos
 * diferentes — uma global e um aditamento para uma fachada — e escolher uma
 * delas como valor contratual seria uma inferência que os dados não
 * sustentam.
 */
export function propostasComValor(eventos: EventoRelatorio[]): PropostaComValor[] {
  return eventos
    .filter((evento) => evento.tipo === "proposta" && evento.valor_cents !== null)
    .map((evento) => ({
      id: evento.id,
      data: evento.data_evento,
      titulo: evento.titulo,
      cents: evento.valor_cents as number,
    }))
    .sort((a, b) => a.data.localeCompare(b.data));
}

/**
 * Divergências por resolver. Os valores em conflito vivem nas citações das
 * evidências, cada um atribuído à sua fonte: nenhum é eleito verdadeiro e
 * nenhum é somado aos outros.
 */
export function conflitosDocumentais(eventos: EventoRelatorio[]): EventoRelatorio[] {
  return eventos
    .filter((evento) => evento.natureza === "conflito")
    .sort((a, b) => a.data_evento.localeCompare(b.data_evento));
}
