/**
 * Registo do processo pela interface — validação e lógica pura.
 *
 * As server actions (`dossier-eventos.ts`, `dossier-imputacoes.ts`) só orquestram
 * sessão, inquilino e escrita; toda a decisão sobre o que é aceitável vive aqui,
 * onde é testável sem base de dados.
 *
 * Duas regras que este módulo existe para manter:
 *
 *  1. um acontecimento nasce sempre pendurado num contrato
 *     (`contrato_memoria_eventos.contrato_id` é NOT NULL) — a validação recusa
 *     qualquer coisa que não identifique o contrato do próprio tenant;
 *  2. uma posição de imputação nunca cria a ligação movimento → factura
 *     (migração 20260826000000). Ela afirma o que uma parte sustenta; a factura
 *     candidata vive no campo próprio da posição, e o que o processo demonstra
 *     continua a viver em `movimentos_bancarios.despesa_id`.
 */

import type {
  ContratoMemoriaNatureza,
  ContratoMemoriaTipo,
  PosicaoEstado,
  PosicaoParte,
  PosicaoTipo,
} from "@/types/database";

/* ------------------------------------------------------------------ */
/* Dicionários da interface                                            */
/* ------------------------------------------------------------------ */

export const TIPOS_ACONTECIMENTO: { valor: ContratoMemoriaTipo; label: string }[] = [
  { valor: "comunicacao", label: "Comunicação" },
  { valor: "proposta", label: "Proposta" },
  { valor: "adjudicacao", label: "Adjudicação" },
  { valor: "fatura", label: "Factura" },
  { valor: "pagamento", label: "Pagamento" },
  { valor: "execucao", label: "Execução" },
  { valor: "decisao", label: "Decisão" },
  { valor: "garantia", label: "Garantia" },
  { valor: "conflito", label: "Conflito" },
  { valor: "outro", label: "Outro" },
];

export const NATUREZAS_ACONTECIMENTO: {
  valor: ContratoMemoriaNatureza;
  label: string;
  nota: string;
}[] = [
  { valor: "facto", label: "Facto", nota: "provado por documento" },
  { valor: "inferencia", label: "Inferência", nota: "conclusão raciocinada, não documentada" },
  { valor: "conflito", label: "Conflito", nota: "documentos divergentes" },
  { valor: "pendente", label: "Pendente", nota: "por resolver ou documentar" },
];

export const PARTES_POSICAO: { valor: PosicaoParte; label: string }[] = [
  { valor: "condominio", label: "Condomínio" },
  { valor: "contraparte", label: "Contraparte" },
  { valor: "terceiro", label: "Terceiro" },
];

export const TIPOS_POSICAO: { valor: PosicaoTipo; label: string }[] = [
  { valor: "imputa", label: "Imputa o pagamento a uma factura" },
  { valor: "nao_imputa", label: "Sustenta que continua por liquidar" },
  { valor: "reserva", label: "Reserva posição" },
];

export const ESTADOS_POSICAO: { valor: PosicaoEstado; label: string }[] = [
  { valor: "sustentada", label: "Sustentada" },
  { valor: "aceite", label: "Aceite" },
  { valor: "retirada", label: "Retirada" },
  { valor: "superada", label: "Superada" },
];

/** Rótulos directos por valor, para apresentar posições guardadas. */
export const PARTE_LABEL_POSICAO: Record<PosicaoParte, string> = Object.fromEntries(
  PARTES_POSICAO.map((p) => [p.valor, p.label]),
) as Record<PosicaoParte, string>;

export const TIPO_LABEL_POSICAO: Record<PosicaoTipo, string> = Object.fromEntries(
  TIPOS_POSICAO.map((t) => [t.valor, t.label]),
) as Record<PosicaoTipo, string>;

export const ESTADO_LABEL_POSICAO: Record<PosicaoEstado, string> = Object.fromEntries(
  ESTADOS_POSICAO.map((e) => [e.valor, e.label]),
) as Record<PosicaoEstado, string>;

/* ------------------------------------------------------------------ */
/* Valores monetários                                                  */
/* ------------------------------------------------------------------ */

/**
 * Converte um valor em euros, escrito por uma pessoa, para cêntimos.
 *
 * Aceita o formato português ("1.234,56"), o com ponto decimal ("1234.56") e
 * valores inteiros. Regras de desambiguação: quando há ponto E vírgula, o
 * ponto é separador de milhares; quando há só vírgula, é decimal; quando há
 * só ponto, é decimal — a leitura que um campo de valor sem formatação
 * quase sempre tem.
 *
 * Devolve `null` para entrada vazia (campo opcional) ou ilegível — nunca zero,
 * para que um valor mal escrito não seja registado como "gratuito".
 */
export function eurosParaCents(entrada: string | null | undefined): number | null | "invalido" {
  const bruto = (entrada ?? "").trim();
  if (!bruto) return null;

  const limpo = bruto.replaceAll(/[\s€]/g, "");
  if (!/^[0-9.,+-]+$/.test(limpo)) return "invalido";

  let normalizado = limpo;
  if (limpo.includes(",") && limpo.includes(".")) {
    // "1.234,56" — ponto é milhar, vírgula é decimal.
    normalizado = limpo.replaceAll(/\./g, "").replace(",", ".");
  } else if (limpo.includes(",")) {
    normalizado = limpo.replace(",", ".");
  }

  const valor = Number(normalizado);
  if (!Number.isFinite(valor)) return "invalido";
  return Math.round(valor * 100);
}

/* ------------------------------------------------------------------ */
/* Acontecimentos                                                      */
/* ------------------------------------------------------------------ */

export type AcontecimentoValores = {
  contratoId: string;
  /** Instante ISO para `data_evento` (timestamptz). */
  dataEvento: string;
  tipo: ContratoMemoriaTipo;
  natureza: ContratoMemoriaNatureza;
  titulo: string;
  resumo: string;
  valorCents: number | null;
};

export type AcontecimentoValidacao =
  | { ok: true; valores: AcontecimentoValores }
  | {
      ok: false;
      error?: string;
      fieldErrors?: Partial<Record<"contrato" | "data" | "tipo" | "natureza" | "titulo" | "resumo" | "valor", string>>;
    };

const TITULO_MAX = 200;
const RESUMO_MAX = 4000;

const DATA_PADRAO = /^\d{4}-\d{2}-\d{2}$/;

function validarDataEvento(cru: string): string | null {
  if (!DATA_PADRAO.test(cru)) return null;
  const instante = new Date(`${cru}T12:00:00Z`);
  // Meio-dia UTC: uma data escolhida num input nunca desliza para o dia
  // anterior nem seguinte por fuso, em nenhum fuso ocidental.
  return Number.isNaN(instante.getTime()) ? null : instante.toISOString();
}

/**
 * Valida os campos de um acontecimento a partir do formulário.
 *
 * `comContrato` distingue criação (contrato obrigatório) de correcção, em que
 * o contrato não é editável — a memória pertence ao contrato a que foi
 * registada, e mudá-la seria reescrever o dossiê.
 */
export function validarAcontecimento(
  formData: FormData,
  { comContrato }: { comContrato: boolean },
): AcontecimentoValidacao {
  const fieldErrors: NonNullable<AcontecimentoValidacao & { ok: false }>["fieldErrors"] = {};

  const contratoId = String(formData.get("contrato_id") ?? "").trim();
  if (comContrato && !contratoId) fieldErrors.contrato = "Escolha o contrato a que o acontecimento pertence.";

  const dataCrua = String(formData.get("data_evento") ?? "").trim();
  const dataEvento = dataCrua ? validarDataEvento(dataCrua) : null;
  if (!dataEvento) fieldErrors.data = "Indique a data do acontecimento.";

  const tipo = String(formData.get("tipo") ?? "").trim() as ContratoMemoriaTipo;
  if (!TIPOS_ACONTECIMENTO.some((t) => t.valor === tipo)) fieldErrors.tipo = "Tipo inválido.";

  const natureza = String(formData.get("natureza") ?? "facto").trim() as ContratoMemoriaNatureza;
  if (!NATUREZAS_ACONTECIMENTO.some((n) => n.valor === natureza)) fieldErrors.natureza = "Natureza inválida.";

  const titulo = String(formData.get("titulo") ?? "").trim();
  if (!titulo) fieldErrors.titulo = "O título é obrigatório.";
  else if (titulo.length > TITULO_MAX) fieldErrors.titulo = "Título demasiado longo.";

  const resumo = String(formData.get("resumo") ?? "").trim();
  if (!resumo) fieldErrors.resumo = "O resumo é obrigatório — é ele que conta o que aconteceu.";
  else if (resumo.length > RESUMO_MAX) fieldErrors.resumo = "Resumo demasiado longo.";

  const valorCents = eurosParaCents(String(formData.get("valor") ?? ""));
  if (valorCents === "invalido") fieldErrors.valor = "Valor inválido — escreva um número, ex.: 1590,00.";

  if (Object.keys(fieldErrors).length > 0) return { ok: false, fieldErrors };

  return {
    ok: true,
    valores: {
      contratoId,
      dataEvento: dataEvento as string,
      tipo,
      natureza,
      titulo,
      resumo,
      valorCents: valorCents === "invalido" ? null : valorCents,
    },
  };
}

/* ------------------------------------------------------------------ */
/* Posições de imputação                                               */
/* ------------------------------------------------------------------ */

export type PosicaoValores = {
  movimentoId: string;
  /** Factura candidata. Nula apenas na reserva. */
  despesaId: string | null;
  parte: PosicaoParte;
  parteDescricao: string | null;
  tipo: PosicaoTipo;
  fundamento: string;
  dataPosicao: string;
  observacoes: string | null;
  evidencia: { documentoId: string; localizador: string | null; citacao: string } | null;
};

export type PosicaoValidacao =
  | { ok: true; valores: PosicaoValores }
  | {
      ok: false;
      error?: string;
      fieldErrors?: Partial<
        Record<
          "movimento" | "despesa" | "parte" | "tipo" | "fundamento" | "data" | "documento" | "citacao",
          string
        >
      >;
    };

const FUNDAMENTO_MAX = 4000;

/**
 * Valida os campos de uma posição de imputação a partir do formulário.
 *
 * Espelha a constraint da base (20260826000000): imputar ou negar exige dizer
 * a qual factura; só a reserva pode ser vaga — e nela a factura é esquecida,
 * porque "reserva sobre a factura X" não é uma reserva, é uma não-imputação
 * discreta.
 */
export function validarPosicao(formData: FormData): PosicaoValidacao {
  const fieldErrors: NonNullable<PosicaoValidacao & { ok: false }>["fieldErrors"] = {};

  const movimentoId = String(formData.get("movimento_id") ?? "").trim();
  if (!movimentoId) fieldErrors.movimento = "Movimento não identificado.";

  const tipo = String(formData.get("tipo") ?? "").trim() as PosicaoTipo;
  if (!TIPOS_POSICAO.some((t) => t.valor === tipo)) fieldErrors.tipo = "Indique o que a parte sustenta.";

  const parte = String(formData.get("parte") ?? "").trim() as PosicaoParte;
  if (!PARTES_POSICAO.some((p) => p.valor === parte)) fieldErrors.parte = "Indique quem sustenta a posição.";

  const despesaCru = String(formData.get("despesa_id") ?? "").trim();
  const despesaId = tipo === "reserva" ? null : despesaCru || null;
  if (tipo !== "reserva" && !despesaId) {
    fieldErrors.despesa = "Imputar ou negar exige dizer a qual factura.";
  }

  const fundamento = String(formData.get("fundamento") ?? "").trim();
  if (!fundamento) fieldErrors.fundamento = "O fundamento é obrigatório — é o argumento da parte.";
  else if (fundamento.length > FUNDAMENTO_MAX) fieldErrors.fundamento = "Fundamento demasiado longo.";

  const dataCrua = String(formData.get("data_posicao") ?? "").trim();
  const dataPosicao = dataCrua ? validarDataEvento(dataCrua) : null;
  if (!dataPosicao) fieldErrors.data = "Indique a data em que a parte assumiu a posição.";

  const documentoId = String(formData.get("documento_id") ?? "").trim();
  const localizador = String(formData.get("localizador") ?? "").trim() || null;
  const citacao = String(formData.get("citacao") ?? "").trim();
  let evidencia: PosicaoValores["evidencia"] = null;
  if (documentoId) {
    if (!citacao) {
      fieldErrors.citacao = "Com documento, a citação é obrigatória — é ela que sustenta a posição.";
    }
    evidencia = { documentoId, localizador, citacao };
  } else if (citacao) {
    fieldErrors.documento = "Citação sem documento — escolha o documento que contém a passagem.";
  }

  if (Object.keys(fieldErrors).length > 0) return { ok: false, fieldErrors };

  return {
    ok: true,
    valores: {
      movimentoId,
      despesaId,
      parte,
      parteDescricao: String(formData.get("parte_descricao") ?? "").trim() || null,
      tipo,
      fundamento,
      dataPosicao: dataPosicao as string,
      observacoes: String(formData.get("observacoes") ?? "").trim() || null,
      evidencia,
    },
  };
}

const ESTADOS_VALIDOS: PosicaoEstado[] = ["sustentada", "aceite", "retirada", "superada"];

/**
 * Valida uma mudança de estado de posição. Nenhum estado apaga: `retirada` e
 * `superada` mantêm a posição no histórico — é o processo a dizer que deixou
 * de a sustentar, não que ela nunca existiu.
 */
export function validarEstadoPosicao(estado: string): PosicaoEstado | null {
  return ESTADOS_VALIDOS.includes(estado as PosicaoEstado) ? (estado as PosicaoEstado) : null;
}
