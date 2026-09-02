/**
 * Extração LOCAL de texto de PDF (C1 da Fase C — fecha a A1 da auditoria).
 *
 * Usa o pdf.js compilado para serverless, via `unpdf`: JavaScript puro, sem
 * binários nativos, sem chamadas a LLM. A extração não depende da OpenAI nem
 * de qualquer provedor externo (a decisão L-44 sobre provedores de IA fica
 * assim ortogonal à indexação).
 *
 * Nunca lança: qualquer falha (PDF corrompido, buffer vazio, PDF digitalizado
 * sem camada de texto) devolve um estado explícito e quem chama decide o
 * fallback — um documento não pode deixar de ser ingerido porque a extração
 * falhou.
 *
 * Contrato de indexação que daqui resulta (metadata dos chunks em
 * `conhecimento_embeddings`):
 *
 *   indexacao: "texto"        → chunk contém texto integral extraído do PDF.
 *       Acompanha: extrator: "local", paginas_total, paginas_extraidas
 *       e, quando se aplicou o teto de páginas, truncado: true.
 *   indexacao: "metadados"    → chunk só tem título + descrição. Acontece
 *       para não-PDF, para PDF cuja extração devolveu "sem_texto" (PDF
 *       digitalizado) ou "falha" (corrompido/ilegível) — nesse caso
 *       acompanha extracao: "sem_texto" | "falha".
 *   (ausente)                 → chunks legados, anteriores à Fase C;
 *       tratam-se como "metadados".
 *
 * Limites deliberados (documentados na UI de /ia/configuracao):
 *   • PDF_MAX_PAGINAS     — páginas extraídas por documento (as restantes
 *     ficam sem indexar; fica registado em paginas_extraidas/paginas_total).
 *   • PDF_MAX_CARACTERES  — teto de texto por documento, para conter o
 *     número de chunks (e de chamadas de embedding) num pedido serverless.
 */

import { getDocumentProxy } from "unpdf";

/** Teto de páginas extraídas por PDF (atas típicas ficam muito abaixo). */
export const PDF_MAX_PAGINAS = 80;

/** Teto de caracteres extraídos por PDF (~50 chunks de 4000). */
export const PDF_MAX_CARACTERES = 200_000;

/**
 * Abaixo deste número de caracteres úteis, considera-se que o PDF não tem
 * camada de texto aproveitável (mesmo limiar do carregamento do regulamento).
 */
const LIMIAR_TEXTO_MINIMO = 50;

export type EstadoExtracaoPdf = "texto" | "sem_texto" | "falha";

export type ResultadoExtracaoPdf =
  | {
      estado: "texto";
      texto: string;
      paginasTotal: number;
      paginasExtraidas: number;
      truncado: boolean;
    }
  | { estado: "sem_texto"; paginasTotal: number }
  | { estado: "falha" };

/** O documento é um PDF segundo o MIME validado no upload. */
export function ePdf(ficheiroTipo: string | null | undefined): boolean {
  return ficheiroTipo === "application/pdf";
}

/**
 * Extrai o texto de um PDF (bytes) localmente, página a página, até
 * PDF_MAX_PAGINAS / PDF_MAX_CARACTERES. Nunca lança.
 */
export async function extrairTextoPdfLocal(
  dados: Uint8Array
): Promise<ResultadoExtracaoPdf> {
  if (!dados || dados.byteLength === 0) {
    return { estado: "falha" };
  }

  let pdf: Awaited<ReturnType<typeof getDocumentProxy>> | null = null;
  try {
    pdf = await getDocumentProxy(dados);
    const paginasTotal = pdf.numPages;
    const limite = Math.min(paginasTotal, PDF_MAX_PAGINAS);

    const partes: string[] = [];
    let carateres = 0;

    for (let numero = 1; numero <= limite; numero++) {
      const pagina = await pdf.getPage(numero);
      const conteudo = await pagina.getTextContent();

      // Reconstrói o fluxo de texto: os itens chegam sem separadores;
      // hasEOL marca quebras de linha reais.
      let textoPagina = "";
      for (const item of conteudo.items) {
        if (!("str" in item) || !item.str) continue;
        textoPagina += item.str;
        if (item.hasEOL) textoPagina += "\n";
        else if (!item.str.endsWith(" ")) textoPagina += " ";
      }

      partes.push(textoPagina);
      carateres += textoPagina.length;
      if (carateres >= PDF_MAX_CARACTERES) break;
    }

    // \0 não é admissível em texto de embedding e aparece em PDFs mal formados.
    const texto = partes.join("\n\n").replace(/\0/g, "").trim();

    if (texto.length < LIMIAR_TEXTO_MINIMO) {
      return { estado: "sem_texto", paginasTotal };
    }

    return {
      estado: "texto",
      texto: texto.slice(0, PDF_MAX_CARACTERES),
      paginasTotal,
      paginasExtraidas: partes.length,
      truncado: paginasTotal > partes.length,
    };
  } catch (err) {
    console.error("[pdf-texto] extração local falhou:", err);
    return { estado: "falha" };
  } finally {
    // Liberta a memória do documento (funções serverless têm teto apertado).
    // O proxy do unpdf expõe cleanup(); loadingTask.destroy() quando existir.
    try {
      await pdf?.cleanup();
      const tarefa = (pdf as { loadingTask?: { destroy?: () => void } } | null)
        ?.loadingTask;
      if (typeof tarefa?.destroy === "function") tarefa.destroy();
    } catch {
      // libertação é best-effort
    }
  }
}
