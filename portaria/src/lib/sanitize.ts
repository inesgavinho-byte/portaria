import sanitizeHtml from "sanitize-html";

/**
 * Sanitização de HTML produzido pelo editor de avisos (Tiptap).
 *
 * Whitelist estrita: apenas as tags que a toolbar do editor oferece
 * (+ variantes de teclado do StarterKit). Tudo o resto — scripts,
 * event handlers, iframes, estilos inline — é removido.
 *
 * USAR SEMPRE: ao gravar (Server Action) E ao renderizar com
 * dangerouslySetInnerHTML, para cobrir conteúdo gravado antes
 * desta proteção existir.
 */
const OPCOES: sanitizeHtml.IOptions = {
  allowedTags: [
    "p",
    "br",
    "strong",
    "b",
    "em",
    "i",
    "s",
    "u",
    "h2",
    "h3",
    "ul",
    "ol",
    "li",
    "blockquote",
    "a",
  ],
  allowedAttributes: {
    a: ["href", "target", "rel"],
  },
  allowedSchemes: ["http", "https", "mailto"],
  transformTags: {
    // Links abrem sempre em nova janela sem acesso ao opener
    a: sanitizeHtml.simpleTransform("a", {
      rel: "noopener noreferrer",
      target: "_blank",
    }),
  },
};

export function sanitizarHtml(html: string): string {
  return sanitizeHtml(html, OPCOES);
}

/**
 * true se o HTML não tem conteúdo textual (ex.: "<p></p>").
 */
export function htmlVazio(html: string): boolean {
  return sanitizeHtml(html, { allowedTags: [] }).trim().length === 0;
}
