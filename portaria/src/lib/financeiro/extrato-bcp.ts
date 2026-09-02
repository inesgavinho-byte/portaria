/**
 * Leitura e validação do extrato XLSX exportado pelo Millennium BCP.
 *
 * O extrato bancário é a prova primária do que saiu e entrou na conta: antes
 * dele, tudo o que a app sabia sobre dinheiro real vinha de declarações das
 * partes. Este módulo é puro — sem base de dados, sem sessão — para que a
 * leitura do ficheiro seja testável isoladamente; a escrita vive na Server
 * Action de importação.
 *
 * Layout real do ficheiro (uma folha):
 *   - linhas 1–7: metadados em pares (rótulo na col A, valor na col C);
 *   - linha 8: cabeçalho `Data Lançamento … Tratado`;
 *   - linhas 9+: movimentos em ordem DESCENDENTE por data, datas como texto
 *     `DD/MM/YYYY`, montantes com sinal, colunas `Notas`/`Tratado` ignoradas.
 *
 * Duas defesas tornam a importação segura:
 *   1. a cadeia de saldos (`saldo[i] === saldo[i+1] + montante[i]`, correndo
 *      de baixo para cima no ficheiro) prova que o ficheiro está completo e
 *      ileso — um extrato truncado ou corrompido quebra-a;
 *   2. cada movimento recebe um hash determinístico do seu conteúdo
 *      (`referencia_externa`), pelo que reimportar o mesmo ficheiro não
 *      duplica nada — a deduplicação é matemática, não julgamento.
 */

import * as XLSX from "xlsx";

export type LinhaExtrato = {
  /** ISO `yyyy-mm-dd`. */
  dataLancamento: string;
  /** ISO `yyyy-mm-dd`, ou null quando o banco não a traz. */
  dataValor: string | null;
  /** Trimmed, espaços internos colapsados. */
  descricao: string;
  /** Com sinal, em cêntimos. */
  montanteCents: number;
  saldoCents: number;
};

export type MetadadosExtrato = {
  conta: string | null;
  dataInicio: string | null;
  dataFim: string | null;
  exportadoEm: string | null;
};

/** Linha = número da linha na folha (1-based), como o utilizador a vê no Excel. */
export type ErroLinha = { linha: number; motivo: string };

export type ParseExtratoResultado = {
  metadados: MetadadosExtrato;
  movimentos: LinhaExtrato[];
  /** Linhas ignoradas (valor a zero, moeda estrangeira, dados ilegíveis). */
  erros: ErroLinha[];
  /** Saldo antes do movimento mais antigo do ficheiro. */
  saldoInicialCents: number | null;
  /** Saldo do movimento mais recente (primeira linha de movimentos). */
  saldoFinalCents: number | null;
};

/** Índices das colunas do cabeçalho BCP. Fixos no formato exportado. */
const COLUNAS = {
  dataLancamento: 0,
  dataValor: 1,
  descricao: 2,
  montante: 3,
  saldo: 4,
  moeda: 5,
} as const;

const ROTULOS_METADADOS: Record<string, keyof MetadadosExtrato> = {
  conta: "conta",
  "data de inicio": "dataInicio",
  "data fim": "dataFim",
  "data de exportacao": "exportadoEm",
};

/** minúsculas, sem acentos, espaços colapsados — para comparar rótulos e cabeçalhos. */
function normalizarEtiqueta(valor: string): string {
  return valor
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/\s+/g, " ")
    .trim();
}

/**
 * Converte um montante para cêntimos. Aceita números (como o XLSX traz os
 * montantes) e texto tolerante: decimal com ponto ou vírgula, separadores de
 * milhar, espaços e símbolo de euro. Devolve null quando não há número
 * legível — um montante inventado corromperia a cadeia de saldos.
 */
export function paraCents(valor: unknown): number | null {
  if (typeof valor === "number") {
    return Number.isFinite(valor) ? Math.round(valor * 100) : null;
  }
  if (typeof valor !== "string") return null;

  const texto = valor.replace(/[\s\u00a0]/g, "").replace(/€/g, "");
  if (!texto || !/\d/.test(texto)) return null;

  const ultimoPonto = texto.lastIndexOf(".");
  const ultimaVirgula = texto.lastIndexOf(",");
  let separadorDecimal = "";
  if (ultimoPonto !== -1 && ultimaVirgula !== -1) {
    // Quando os dois existem, o último é o decimal: "1.234,56" ou "1,234.56".
    separadorDecimal = ultimoPonto > ultimaVirgula ? "." : ",";
  } else if (ultimoPonto !== -1 || ultimaVirgula !== -1) {
    const pos = Math.max(ultimoPonto, ultimaVirgula);
    // Dinheiro tem no máximo duas casas: um separador seguido de 1–2 dígitos
    // é decimal ("-818.8"); seguido de 3 é milhar à portuguesa ("1.234").
    if (/^\d{1,2}$/.test(texto.slice(pos + 1))) separadorDecimal = ultimoPonto !== -1 ? "." : ",";
  }

  let normalizado: string;
  if (separadorDecimal === ",") {
    normalizado = texto.replace(/\./g, "").replace(/,/g, ".");
  } else if (separadorDecimal === ".") {
    normalizado = texto.replace(/,/g, "");
  } else {
    // Sem decimal detectado: todos os separadores são de milhar.
    normalizado = texto.replace(/[.,]/g, "");
  }
  if (!/^-?\d+(\.\d+)?$/.test(normalizado)) return null;

  const numero = Number(normalizado);
  return Number.isFinite(numero) ? Math.round(numero * 100) : null;
}

/**
 * Converte uma data do extrato para ISO `yyyy-mm-dd`. O BCP exporta texto
 * `DD/MM/YYYY` (aceita também `DD-MM-YYYY`); tolera serial Excel para quando
 * o ficheiro chega com células de data verdadeiras. Null quando ilegível.
 */
export function dataIso(valor: unknown): string | null {
  if (typeof valor === "string") {
    const m = /^(\d{1,2})[/\-.](\d{1,2})[/\-.](\d{4})$/.exec(valor.trim());
    if (!m) return null;
    const dia = Number(m[1]);
    const mes = Number(m[2]);
    const ano = Number(m[3]);
    // Validação real do calendário: "31/02/2026" não é uma data.
    const data = new Date(Date.UTC(ano, mes - 1, dia));
    if (mes < 1 || mes > 12 || data.getUTCFullYear() !== ano || data.getUTCMonth() !== mes - 1 || data.getUTCDate() !== dia) {
      return null;
    }
    return `${ano}-${String(mes).padStart(2, "0")}-${String(dia).padStart(2, "0")}`;
  }
  if (typeof valor === "number" && Number.isFinite(valor)) {
    // Serial Excel: dias desde 1899-12-30; 25569 é 1970-01-01.
    const data = new Date(Math.round((valor - 25569) * 86_400_000));
    return Number.isFinite(data.getTime()) ? data.toISOString().slice(0, 10) : null;
  }
  if (valor instanceof Date) {
    return Number.isFinite(valor.getTime()) ? valor.toISOString().slice(0, 10) : null;
  }
  return null;
}

const PREFIXOS_TRF = ["trf. p/o ", "trf p/o ", "trf. p/ ", "trf p/ "] as const;

/**
 * Extrai a contraparte comercial dos pagamentos "TRF. P/O …" — é o que a
 * triagem de fornecedores compara com os nomes na base. Só os quatro prefixos
 * de transferência a terceiros são fiáveis: "TRF DE " e restantes formatos do
 * banco não identificam um destinatário, e devolvem null.
 */
export function extrairContraparte(descricao: string): string | null {
  const texto = descricao.replace(/\s+/g, " ").trim();
  const minusculas = texto.toLowerCase();
  for (const prefixo of PREFIXOS_TRF) {
    if (minusculas.startsWith(prefixo)) {
      return texto.slice(prefixo.length).trim() || null;
    }
  }
  return null;
}

/**
 * Prova de integridade do ficheiro: no extrato em ordem descendente, o saldo
 * de cada linha é o saldo da linha seguinte mais o seu montante. Uma quebra
 * significa extrato truncado, editado ou corrompido — nada deve ser gravado.
 * O saldo corre de baixo para cima porque o banco escreve de cima para baixo
 * os dias mais recentes primeiro.
 */
export function validarCadeiaSaldos(movimentos: LinhaExtrato[]): {
  ok: boolean;
  quebra: { indice: number; esperadoCents: number; realCents: number } | null;
} {
  for (let i = 0; i < movimentos.length - 1; i++) {
    const esperado = movimentos[i + 1].saldoCents + movimentos[i].montanteCents;
    if (movimentos[i].saldoCents !== esperado) {
      return { ok: false, quebra: { indice: i, esperadoCents: esperado, realCents: movimentos[i].saldoCents } };
    }
  }
  return { ok: true, quebra: null };
}

export type ChaveHashReferencia = {
  conta: string | null;
  dataLancamento: string;
  dataValor: string | null;
  montanteCents: number;
  descricao: string;
  saldoCents: number;
};

/**
 * Referência externa estável de um movimento: SHA-256 do conteúdo completo.
 * Dois exports do mesmo período produzem a mesma referência para o mesmo
 * movimento — é isto que torna a reimportação idempotente e permite importar
 * extratos sobrepostos sem duplicar (a coluna tem índice único parcial).
 */
export async function hashReferencia(linha: ChaveHashReferencia): Promise<string> {
  const base = [
    linha.conta ?? "",
    linha.dataLancamento,
    linha.dataValor ?? "",
    linha.montanteCents,
    linha.descricao,
    linha.saldoCents,
  ].join("|");
  const digesto = await globalThis.crypto.subtle.digest("SHA-256", new TextEncoder().encode(base));
  const hex = Array.from(new Uint8Array(digesto), (byte) => byte.toString(16).padStart(2, "0")).join("");
  return `bcp:${linha.conta ?? ""}:${hex.slice(0, 20)}`;
}

function extrairMetadados(linhas: unknown[][]): MetadadosExtrato {
  const metadados: MetadadosExtrato = { conta: null, dataInicio: null, dataFim: null, exportadoEm: null };
  for (const linha of linhas) {
    const rotulo = linha?.[0];
    const valor = linha?.[2];
    if (typeof rotulo !== "string" || typeof valor !== "string") continue;
    const campo = ROTULOS_METADADOS[normalizarEtiqueta(rotulo)];
    if (campo) metadados[campo] = valor.trim() || null;
  }
  return metadados;
}

/** Linha inteira vazia — ruído do Excel, não é um erro de importação. */
function linhaVazia(linha: unknown[]): boolean {
  return linha.every((celula) => celula === null || celula === "");
}

/**
 * Lê o XLSX do Millennium BCP e devolve movimentos validados. Não escreve
 * nada; devolve `{ erro }` quando o ficheiro nem sequer é um extrato BCP.
 */
export function parseExtratoBcp(dados: ArrayBuffer | Buffer): ParseExtratoResultado | { erro: string } {
  const buffer = Buffer.isBuffer(dados) ? dados : Buffer.from(dados);

  let folha: XLSX.WorkSheet | undefined;
  try {
    const workbook = XLSX.read(buffer, { type: "buffer" });
    folha = workbook.Sheets[workbook.SheetNames[0]];
  } catch {
    return { erro: "Não foi possível ler o ficheiro XLSX." };
  }
  if (!folha) return { erro: "O ficheiro não tem folhas legíveis." };

  const linhas = XLSX.utils.sheet_to_json<unknown[]>(folha, { header: 1, raw: true, defval: null });

  // O cabeçalho pode deslocar-se se o banco alterar as linhas de metadados;
  // procurá-lo em vez de o fixar na linha 8 é a defesa mais barata.
  let indiceCabecalho = -1;
  for (let i = 0; i < Math.min(linhas.length, 15); i++) {
    const primeira = linhas[i]?.[COLUNAS.dataLancamento];
    if (typeof primeira === "string" && normalizarEtiqueta(primeira) === "data lancamento") {
      indiceCabecalho = i;
      break;
    }
  }
  if (indiceCabecalho === -1) {
    return { erro: "O ficheiro não parece um extrato do Millennium BCP (cabeçalho 'Data Lançamento' não encontrado)." };
  }

  const metadados = extrairMetadados(linhas.slice(0, indiceCabecalho));
  const movimentos: LinhaExtrato[] = [];
  const erros: ErroLinha[] = [];

  for (let i = indiceCabecalho + 1; i < linhas.length; i++) {
    const linha = linhas[i];
    if (!linha || linhaVazia(linha)) continue;
    // 1-based: é o número que o utilizador vê no Excel.
    const numeroLinha = i + 1;

    const dataLancamento = dataIso(linha[COLUNAS.dataLancamento]);
    if (!dataLancamento) {
      erros.push({ linha: numeroLinha, motivo: "data de lançamento ilegível" });
      continue;
    }

    const montanteCents = paraCents(linha[COLUNAS.montante]);
    if (montanteCents === null) {
      erros.push({ linha: numeroLinha, motivo: "montante ilegível" });
      continue;
    }
    if (montanteCents === 0) {
      erros.push({ linha: numeroLinha, motivo: "valor a zero" });
      continue;
    }

    const saldoCents = paraCents(linha[COLUNAS.saldo]);
    if (saldoCents === null) {
      erros.push({ linha: numeroLinha, motivo: "saldo ilegível" });
      continue;
    }

    const moeda = linha[COLUNAS.moeda];
    if (typeof moeda === "string" && moeda.trim() && moeda.trim().toUpperCase() !== "EUR") {
      erros.push({ linha: numeroLinha, motivo: `moeda ${moeda.trim()} — só se importa EUR` });
      continue;
    }

    const descricaoBruta = linha[COLUNAS.descricao];
    movimentos.push({
      dataLancamento,
      dataValor: dataIso(linha[COLUNAS.dataValor]),
      descricao: typeof descricaoBruta === "string" ? descricaoBruta.replace(/\s+/g, " ").trim() : "",
      montanteCents,
      saldoCents,
    });
  }

  const ultimo = movimentos[movimentos.length - 1];
  return {
    metadados,
    movimentos,
    erros,
    // O ficheiro está em ordem descendente: o saldo inicial está na última
    // linha, menos o montante dela (o saldo que lá vem já é depois do movimento).
    saldoInicialCents: ultimo ? ultimo.saldoCents - ultimo.montanteCents : null,
    saldoFinalCents: movimentos[0]?.saldoCents ?? null,
  };
}
