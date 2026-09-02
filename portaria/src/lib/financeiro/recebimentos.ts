/**
 * Triagem da relação CRÉDITO BANCÁRIO → FRAÇÃO (recebimentos de quotas).
 *
 * Igual à triagem de fornecedores, com o mesmo princípio: uma sugestão nunca
 * é uma atribuição. Nada aqui escreve em `pagamentos` nem toca em quotas —
 * apenas propõe fracções e combinações de quotas cuja soma fecha com o valor
 * do crédito, para acelerar a decisão de quem reconcilia.
 *
 * As três pistas são independentes e a melhor confiança vence por fracção:
 *   exacta   — o código da fracção (ou o nome completo do proprietário)
 *              aparece na descrição do movimento;
 *   provavel — dois ou mais termos significativos do proprietário em comum,
 *              ou a soma de quotas pendentes consecutivas fecha exactamente
 *              com o valor do movimento;
 *   possivel — um único termo raro do proprietário (comprimento ≥ 5).
 */

import { normalizar, tokensSignificativos } from "@/lib/financeiro/atribuicao-movimentos";

export type QuotaPendente = { id: string; ano: number; mes: number; valorCents: number };

export type FracaoCandidata = {
  id: string;
  codigo: string;
  proprietarioNome: string | null;
  quotasPendentes: QuotaPendente[];
};

export type MovimentoCredito = {
  id: string;
  dataMovimento: string;
  valorCents: number;
  descricao: string;
};

export type SugestaoFracao = {
  fracao: FracaoCandidata;
  confianca: "exacta" | "provavel" | "possivel";
  motivo: string;
};

export type SugestaoQuotas = { quotas: QuotaPendente[]; somaCents: number };

/** Ordinais por extenso tal como ficam depois da normalização (sem acentos). */
const ORDINAIS = new Map([
  ["primeiro", "1"],
  ["segundo", "2"],
  ["terceiro", "3"],
  ["quarto", "4"],
  ["quinto", "5"],
  ["sexto", "6"],
  ["setimo", "7"],
  ["oitavo", "8"],
  ["nono", "9"],
  ["decimo", "10"],
]);

/** Abreviaturas de lado que aparecem nos códigos das fracções. */
const LADO: Record<string, string> = {
  direito: "dto",
  dto: "dto",
  // "dt" é abreviatura corrente de "direito" nos códigos de fracção ("8dt.").
  dt: "dto",
  esquerdo: "esq",
  esq: "esq",
};

/**
 * Normaliza o código de uma fracção para comparável com a descrição do
 * movimento: minúsculas sem acentos/pontuação, ordinais por extenso em
 * dígito, lados em "dto"/"esq", dígito colado à letra separado por espaço.
 *   "3.º Dto" → "3 dto";  "11DTO e ESQ" → "11 dto e esq";
 *   "8dt." → "8 dto";  "PRIMEIRO ESQUERDO" → "1 esq";  "R/C Esq" → "r c esq".
 */
export function normalizarCodigoFracao(codigo: string): string {
  const tokens: string[] = [];
  for (const bruto of normalizar(codigo).split(" ")) {
    if (!bruto) continue;
    // Dígito colado à letra ("11dto") separa-se em duas partes para casar
    // com a forma espaçada que aparece nas descrições bancárias ("11 dto").
    const colado = /^(\d+)([a-z].*)$/.exec(bruto);
    for (const parte of colado ? [colado[1], colado[2]] : [bruto]) {
      tokens.push(ORDINAIS.get(parte) ?? LADO[parte] ?? parte);
    }
  }
  return tokens.join(" ");
}

/** A sequência de tokens `agulha` ocorre contígua dentro de `palheiro`. */
function contemSequencia(agulha: string[], palheiro: string[]): boolean {
  if (agulha.length === 0 || agulha.length > palheiro.length) return false;
  externa: for (let inicio = 0; inicio <= palheiro.length - agulha.length; inicio++) {
    for (let i = 0; i < agulha.length; i++) {
      if (palheiro[inicio + i] !== agulha[i]) continue externa;
    }
    return true;
  }
  return false;
}

const euro = (cents: number) =>
  new Intl.NumberFormat("pt-PT", { style: "currency", currency: "EUR" }).format(cents / 100);

/**
 * Combinações CONSECUTIVAS de quotas pendentes (ordenadas por ano, mes) cuja
 * soma fecha exactamente com o valor do crédito. Só quotas anteriores ou do
 * próprio mês do movimento são elegíveis — uma transferência nunca paga uma
 * quota futura. Devolve a primeira combinação encontrada (menor número de
 * quotas, começando na mais antiga) ou null se nada fechar.
 */
export function sugerirQuotas(
  movimento: MovimentoCredito,
  quotasPendentes: QuotaPendente[],
): SugestaoQuotas | null {
  const [anoMovimento, mesMovimento] = movimento.dataMovimento.split("-").map(Number);
  if (!anoMovimento || !mesMovimento) return null;

  const elegiveis = [...quotasPendentes]
    // Anterior ou igual à data do movimento: compara (ano, mes).
    .filter((quota) => quota.ano < anoMovimento || (quota.ano === anoMovimento && quota.mes <= mesMovimento))
    .sort((a, b) => a.ano - b.ano || a.mes - b.mes);

  const MAXIMO_QUOTAS = 6;
  for (let tamanho = 1; tamanho <= MAXIMO_QUOTAS; tamanho++) {
    for (let inicio = 0; inicio + tamanho <= elegiveis.length; inicio++) {
      const combinacao = elegiveis.slice(inicio, inicio + tamanho);
      const soma = combinacao.reduce((total, quota) => total + quota.valorCents, 0);
      if (soma === movimento.valorCents) {
        return { quotas: combinacao, somaCents: soma };
      }
    }
  }
  return null;
}

/**
 * Propõe fracções para um crédito por classificar, da confiança mais alta
 * para a mais baixa (uma sugestão por fracção, a melhor pista vence).
 * Devolve lista vazia quando nada é suficientemente parecido.
 */
export function sugerirFracoes(
  movimento: MovimentoCredito,
  fracoes: FracaoCandidata[],
  limite = 3,
): SugestaoFracao[] {
  // A descrição passa pelo MESMO pipeline do código da fracção: os extratos
  // escrevem "8dt." e "PRIMEIRO ESQUERDO" exactamente como os códigos das
  // fracções — sem isto, "TRF DE 8dt." nunca casava com "8.º Dto". O matching
  // é por sequência contígua de tokens, por isso "13 dto" continua sem casar
  // a fracção "3.º Dto".
  const tokensDescricao = normalizarCodigoFracao(movimento.descricao)
    .split(" ")
    .filter(Boolean);
  const tokensMovimento = new Set(
    tokensDescricao.filter((token) => token.length >= 3),
  );
  const sugestoes: SugestaoFracao[] = [];

  for (const fracao of fracoes) {
    const codigoNormalizado = normalizarCodigoFracao(fracao.codigo);
    const tokensProprietario = fracao.proprietarioNome ? normalizar(fracao.proprietarioNome).split(" ").filter(Boolean) : [];

    // --- exacta: código da fracção como sequência na descrição ---
    if (codigoNormalizado && contemSequencia(codigoNormalizado.split(" "), tokensDescricao)) {
      sugestoes.push({ fracao, confianca: "exacta", motivo: "Código da fracção na descrição." });
      continue;
    }
    // --- exacta: nome completo do proprietário na descrição ---
    if (tokensProprietario.length > 0 && contemSequencia(tokensProprietario, tokensDescricao)) {
      sugestoes.push({ fracao, confianca: "exacta", motivo: "Nome do proprietário na descrição." });
      continue;
    }

    // --- provavel: ≥2 termos significativos do proprietário em comum ---
    const termosProprietario = fracao.proprietarioNome ? tokensSignificativos(fracao.proprietarioNome) : [];
    const comuns = termosProprietario.filter((token) => tokensMovimento.has(token));
    if (comuns.length >= 2) {
      sugestoes.push({
        fracao,
        confianca: "provavel",
        motivo: `Nome do proprietário (termos em comum: ${comuns.join(", ")}).`,
      });
      continue;
    }
    // --- provavel: a soma de quotas pendentes consecutivas fecha exacta ---
    const quotas = sugerirQuotas(movimento, fracao.quotasPendentes);
    if (quotas) {
      sugestoes.push({
        fracao,
        confianca: "provavel",
        motivo: `Soma de ${quotas.quotas.length} quota${quotas.quotas.length > 1 ? "s" : ""} = ${euro(quotas.somaCents)}.`,
      });
      continue;
    }

    // --- possivel: 1 termo raro do proprietário (comprimento ≥ 5) ---
    const raro = comuns.find((token) => token.length >= 5);
    if (raro) {
      sugestoes.push({ fracao, confianca: "possivel", motivo: `Termo do proprietário: ${raro}.` });
    }
  }

  const ordem: Record<SugestaoFracao["confianca"], number> = { exacta: 0, provavel: 1, possivel: 2 };
  return sugestoes
    .sort((a, b) => ordem[a.confianca] - ordem[b.confianca])
    .slice(0, limite);
}
