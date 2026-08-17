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

/** Rótulos das categorias — fonte única (antes duplicado em 3 sítios). */
export const CATEGORIA_LABEL = {
  ata: "Atas",
  conta: "Contas e Orçamentos",
  contrato: "Contratos",
  regulamento: "Regulamento",
  manual: "Manuais",
  apolice: "Apólices",
  circular: "Circulares",
  outro: "Outros",
} as const;

export const CATEGORIAS = Object.keys(
  CATEGORIA_LABEL
) as (keyof typeof CATEGORIA_LABEL)[];

/** Temas administrativos do Arquivo confidencial. */
export const TEMA_DOCUMENTO_LABEL = {
  governacao_regulamento: "Governação e regulamento",
  financeiro_fiscal: "Financeiro e fiscal",
  contratos_fornecedores: "Contratos e fornecedores",
  manutencao_obras: "Manutenção e obras",
  tecnico_plantas: "Técnico e plantas",
  seguros_riscos: "Seguros e riscos",
  recursos_humanos: "Recursos humanos",
  transicao_correspondencia: "Transição e correspondência",
  geral: "Geral",
} as const;

export type TemaDocumento = keyof typeof TEMA_DOCUMENTO_LABEL;

export const TEMAS_DOCUMENTO = Object.keys(
  TEMA_DOCUMENTO_LABEL
) as TemaDocumento[];

export function temaPorDocumento(input: { titulo: string; categoria: string }): TemaDocumento {
  const texto = `${input.titulo} ${input.categoria}`
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase();

  if (/regulamento|adenda|ata|assembleia|titulo.?constitutivo|permilagem/.test(texto)) return "governacao_regulamento";
  if (/quota|balancete|conta|orcamento|nif|reconciliacao|recibo|comprovativo|fiscal/.test(texto)) return "financeiro_fiscal";
  if (/contrato|fornecedor|adjudicacao|proposta/.test(texto)) return "contratos_fornecedores";
  if (/obra|fachada|elevador|thyssen|tke|inspecao|manutencao/.test(texto)) return "manutencao_obras";
  if (/planta|esquema|cave|telhado|cobertura|agua|esgoto|caixa/.test(texto)) return "tecnico_plantas";
  if (/apolice|seguro|sinistro|risco/.test(texto)) return "seguros_riscos";
  if (/porteir|ferias|seguranca social|trabalh/.test(texto)) return "recursos_humanos";
  if (/transicao|passagem de pasta|correspondencia|oposicao/.test(texto)) return "transicao_correspondencia";
  return "geral";
}
