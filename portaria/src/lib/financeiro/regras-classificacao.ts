/**
 * REGRAS de classificação movimento → fornecedor.
 *
 * Uma sugestão nunca é uma atribuição — mas uma regra criada por uma pessoa é
 * uma decisão permanente dessa pessoa. Por isso as regras aplicam-se sozinhas
 * (com `fornecedor_origem = 'regra'` na base, para a proveniência ficar
 * visível) e são reversíveis com um clique (qualquer acção manual volta a
 * escrever 'manual'). O matching vive aqui, nesta fronteira pura: o que é
 * escrito em `fornecedor_id` é sempre rastreável a uma regra humana.
 *
 * O padrão de uma regra é texto normalizado (minúsculas, sem acentos, espaços
 * colapsados — a mesma normalização da triagem manual) e casa por substring
 * contra a descrição ou a contraparte normalizadas do movimento.
 */

import { normalizar } from "@/lib/financeiro/atribuicao-movimentos";

export type RegraClassificacao = {
  id: string;
  /** Texto normalizado; casa como substring da descrição ou da contraparte. */
  padrao: string;
  /** Null quando a regra marca o movimento como "sem fornecedor". */
  fornecedorId: string | null;
  semFornecedor: boolean;
};

export type MovimentoClassificavel = {
  id: string;
  descricao: string;
  contraparte: string | null;
  fornecedor_id: string | null;
  fornecedor_nao_aplicavel: boolean;
};

export type ClassificacaoPorRegra = {
  movimentoId: string;
  fornecedorId: string | null;
  semFornecedor: boolean;
};

/**
 * A mesma normalização canónica da triagem de atribuição. Os padrões das
 * regras e os aliases de contraparte são guardados exactamente nesta forma.
 */
export function normalizarPadrao(texto: string): string {
  return normalizar(texto);
}

/**
 * Aplica as regras aos movimentos, EM MEMÓRIA — nunca escreve nada. A ordem
 * da lista de regras é a precedência (a lista chega ordenada por criado_em:
 * a primeira regra criada vence). Só propõe para movimentos pendentes, isto
 * é, sem fornecedor e não marcados como "sem fornecedor" — uma regra nunca
 * sobrescreve uma decisão já tomada, nem pela regra anterior nem por pessoa.
 */
export function aplicarRegrasAMovimentos(
  movimentos: MovimentoClassificavel[],
  regras: RegraClassificacao[],
): ClassificacaoPorRegra[] {
  const classificacoes: ClassificacaoPorRegra[] = [];

  for (const movimento of movimentos) {
    // Pendente = nenhum humano (nem regra anterior) decidiu este movimento.
    if (movimento.fornecedor_id || movimento.fornecedor_nao_aplicavel) continue;

    const descricaoNormalizada = normalizar(movimento.descricao);
    const contraparteNormalizada = movimento.contraparte ? normalizar(movimento.contraparte) : "";

    for (const regra of regras) {
      if (!regra.padrao) continue;
      // Regra malformada (nem fornecedor nem "sem fornecedor") não classifica
      // nada — na base o check XOR impede isto, aqui é defesa gratuita.
      if (!regra.semFornecedor && !regra.fornecedorId) continue;
      const casa =
        descricaoNormalizada.includes(regra.padrao) ||
        (contraparteNormalizada.length > 0 && contraparteNormalizada.includes(regra.padrao));
      if (!casa) continue;

      // Primeira regra que casa vence; XOR garantido pelo tipo da regra
      // (sem_fornecedor = true ⟺ fornecedorId null).
      classificacoes.push({
        movimentoId: movimento.id,
        fornecedorId: regra.semFornecedor ? null : regra.fornecedorId,
        semFornecedor: regra.semFornecedor,
      });
      break;
    }
  }

  return classificacoes;
}
