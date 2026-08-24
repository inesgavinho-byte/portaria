/**
 * Triagem da relação MOVIMENTO BANCÁRIO → FORNECEDOR.
 *
 * O backfill estrutural resolveu os casos inequívocos. O que sobra exige
 * julgamento humano: um débito pode ser de um fornecedor que ainda não existe
 * na base, de um condómino, ou de um encargo que nunca terá fornecedor.
 *
 * Este módulo separa duas coisas que não se devem confundir:
 *
 *  - o **estado** de cada movimento, derivado dos dados e sem coluna
 *    redundante;
 *  - as **sugestões** de fornecedor, que existem apenas para acelerar a
 *    decisão de quem tria.
 *
 * Uma sugestão nunca é uma atribuição. O matching por nome vive aqui, nesta
 * fronteira, e não na relação canónica: só é escrito em `fornecedor_id` o que
 * uma pessoa confirmar.
 */

export type EstadoAtribuicao = "atribuido" | "nao_aplicavel" | "pendente";

export type MovimentoAtribuivel = {
  id: string;
  data_movimento: string;
  tipo: "debito" | "credito";
  valor_cents: number;
  descricao: string;
  contraparte: string | null;
  confirmado: boolean;
  despesa_id: string | null;
  fornecedor_id: string | null;
  fornecedor_nao_aplicavel: boolean;
};

export type FornecedorCandidato = {
  id: string;
  nome: string;
  ativo: boolean;
};

/**
 * Confiança da sugestão, do mais forte para o mais fraco:
 *   exacta   — a contraparte é literalmente o nome do fornecedor;
 *   provavel — o nome completo do fornecedor aparece no texto do movimento;
 *   possivel — pelo menos dois termos significativos em comum.
 *
 * Nenhuma delas dispensa confirmação humana.
 */
export type ConfiancaSugestao = "exacta" | "provavel" | "possivel";

export type SugestaoFornecedor = {
  fornecedor: FornecedorCandidato;
  confianca: ConfiancaSugestao;
  motivo: string;
};

export type ResumoTriagem = {
  pendentes: number;
  atribuidos: number;
  naoAplicaveis: number;
  /** Valor dos débitos confirmados ainda por triar. */
  valorPendenteCents: number;
};

export function estadoAtribuicao(movimento: MovimentoAtribuivel): EstadoAtribuicao {
  if (movimento.fornecedor_id) return "atribuido";
  if (movimento.fornecedor_nao_aplicavel) return "nao_aplicavel";
  return "pendente";
}

export function resumirTriagem(movimentos: MovimentoAtribuivel[]): ResumoTriagem {
  const resumo: ResumoTriagem = { pendentes: 0, atribuidos: 0, naoAplicaveis: 0, valorPendenteCents: 0 };
  for (const movimento of movimentos) {
    const estado = estadoAtribuicao(movimento);
    if (estado === "atribuido") resumo.atribuidos += 1;
    else if (estado === "nao_aplicavel") resumo.naoAplicaveis += 1;
    else {
      resumo.pendentes += 1;
      if (movimento.confirmado && movimento.tipo === "debito") {
        resumo.valorPendenteCents += movimento.valor_cents;
      }
    }
  }
  return resumo;
}

/** minúsculas, sem acentos, sem pontuação, espaços colapsados. */
function normalizar(valor: string): string {
  return valor
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

/**
 * Palavras que não distinguem um fornecedor de outro e que, sozinhas, não
 * sustentam uma sugestão.
 */
const PALAVRAS_VAZIAS = new Set([
  "lda", "unipessoal", "sa", "s", "a", "de", "do", "da", "dos", "das", "e",
  "transferencia", "trf", "pagamento", "pag", "p", "pt", "servicos", "comercio",
  "sociedade", "empresa", "condominio", "cond", "recebida", "para", "por",
]);

function tokensSignificativos(valor: string): string[] {
  return normalizar(valor)
    .split(" ")
    .filter((token) => token.length >= 3 && !PALAVRAS_VAZIAS.has(token));
}

/**
 * Propõe fornecedores para um movimento por triar, do mais forte para o mais
 * fraco. Devolve lista vazia quando nada é suficientemente parecido — não
 * adivinhar é uma resposta válida.
 */
export function sugerirFornecedores(
  movimento: MovimentoAtribuivel,
  fornecedores: FornecedorCandidato[],
  limite = 3,
): SugestaoFornecedor[] {
  const textos = [movimento.contraparte, movimento.descricao].filter(
    (texto): texto is string => Boolean(texto && texto.trim()),
  );
  if (textos.length === 0) return [];

  const contraparteNormalizada = movimento.contraparte ? normalizar(movimento.contraparte) : "";
  const textoCompleto = normalizar(textos.join(" "));
  const tokensMovimento = new Set(textos.flatMap(tokensSignificativos));

  const sugestoes: SugestaoFornecedor[] = [];
  for (const fornecedor of fornecedores) {
    const nomeNormalizado = normalizar(fornecedor.nome);
    if (!nomeNormalizado) continue;

    if (contraparteNormalizada && contraparteNormalizada === nomeNormalizado) {
      sugestoes.push({ fornecedor, confianca: "exacta", motivo: "A contraparte é exactamente o nome do fornecedor." });
      continue;
    }
    if (textoCompleto.includes(nomeNormalizado)) {
      sugestoes.push({ fornecedor, confianca: "provavel", motivo: "O nome do fornecedor aparece no movimento." });
      continue;
    }
    // Dois termos em comum, no mínimo. Um único termo partilhado é ruído em
    // nomes portugueses — "José Artur Castro Inácio" e "José João Manageiro"
    // partilham "josé" e não têm relação nenhuma. Uma sugestão errada ao lado
    // do nome de uma pessoa convida a um clique que corrompe os KPIs.
    const tokensFornecedor = tokensSignificativos(fornecedor.nome);
    const comuns = tokensFornecedor.filter((token) => tokensMovimento.has(token));
    if (comuns.length >= 2) {
      sugestoes.push({
        fornecedor,
        confianca: "possivel",
        motivo: `Termos em comum: ${comuns.join(", ")}.`,
      });
    }
  }

  const ordem: Record<ConfiancaSugestao, number> = { exacta: 0, provavel: 1, possivel: 2 };
  return sugestoes
    .sort((a, b) => ordem[a.confianca] - ordem[b.confianca] || a.fornecedor.nome.localeCompare(b.fornecedor.nome, "pt-PT"))
    .slice(0, limite);
}
