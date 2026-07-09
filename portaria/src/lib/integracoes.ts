/**
 * Catálogo estático de integrações (Slice de UI — sem lógica).
 * Nenhum conector está ativo: tudo começa "Por configurar".
 * O `metodo` indica que tipo de configuração o painel mostrará (só UI).
 */
export type Categoria =
  | "IA"
  | "Documentos"
  | "Comunicação"
  | "Financeiro"
  | "Calendário";

export type Conector = {
  id: string;
  nome: string;
  fornecedor: string;
  descricao: string;
  categoria: Categoria;
  metodo: "api_key" | "oauth";
  /** Iniciais para o "logo" desenhado em CSS (sem assets externos). */
  sigla: string;
};

export const CATEGORIAS: Categoria[] = [
  "IA",
  "Documentos",
  "Comunicação",
  "Financeiro",
  "Calendário",
];

export const CONECTORES: Conector[] = [
  {
    id: "claude",
    nome: "Claude",
    fornecedor: "Anthropic",
    descricao: "Assistente contextual e redação.",
    categoria: "IA",
    metodo: "api_key",
    sigla: "Cl",
  },
  {
    id: "chatgpt",
    nome: "ChatGPT",
    fornecedor: "OpenAI",
    descricao: "Escrita e análise.",
    categoria: "IA",
    metodo: "api_key",
    sigla: "GPT",
  },
  {
    id: "google-docs",
    nome: "Google Docs",
    fornecedor: "Google",
    descricao: "Criação e edição de documentos.",
    categoria: "Documentos",
    metodo: "oauth",
    sigla: "Doc",
  },
  {
    id: "google-drive",
    nome: "Google Drive",
    fornecedor: "Google",
    descricao: "Armazenamento e partilha.",
    categoria: "Documentos",
    metodo: "oauth",
    sigla: "Drv",
  },
  {
    id: "gmail",
    nome: "Gmail",
    fornecedor: "Google",
    descricao: "Email integrado na plataforma.",
    categoria: "Comunicação",
    metodo: "oauth",
    sigla: "Gm",
  },
  {
    id: "outlook",
    nome: "Outlook",
    fornecedor: "Microsoft",
    descricao: "Email integrado na plataforma.",
    categoria: "Comunicação",
    metodo: "oauth",
    sigla: "Ol",
  },
  {
    id: "sibs",
    nome: "SIBS / Open Banking",
    fornecedor: "SIBS",
    descricao: "Movimentos e autorização de transferências.",
    categoria: "Financeiro",
    metodo: "oauth",
    sigla: "SB",
  },
  {
    id: "revolut",
    nome: "Revolut Business",
    fornecedor: "Revolut",
    descricao: "Conta e pagamentos.",
    categoria: "Financeiro",
    metodo: "oauth",
    sigla: "Rev",
  },
  {
    id: "google-calendar",
    nome: "Google Calendar",
    fornecedor: "Google",
    descricao: "Sincronização de assembleias e prazos.",
    categoria: "Calendário",
    metodo: "oauth",
    sigla: "Cal",
  },
];
