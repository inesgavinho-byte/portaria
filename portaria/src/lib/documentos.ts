/**
 * Constantes partilhadas do domínio Documentos.
 * Whitelist de tipos: o que a UI promete ("PDF, Word, Excel ou imagem").
 * A extensão do path deriva sempre do MIME, nunca do nome do ficheiro.
 */
export const DOCUMENTO_TIPOS_VALIDOS: Record<string, string> = {
  "application/pdf": "pdf",
  "application/msword": "doc",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document":
    "docx",
  "application/vnd.ms-excel": "xls",
  "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet": "xlsx",
  "image/jpeg": "jpg",
  "image/png": "png",
  "image/webp": "webp",
};

/** Valor para o atributo accept do input de ficheiro. */
export const DOCUMENTO_ACCEPT = Object.keys(DOCUMENTO_TIPOS_VALIDOS).join(",");
