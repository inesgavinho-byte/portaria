import type { Ocorrencia } from "@/types/database";

/**
 * Constantes partilhadas do domínio Ocorrências.
 * Fonte única para labels de estados e categorias — usada por páginas,
 * formulários e Server Actions (validação por whitelist).
 */

export const ESTADO_LABEL: Record<Ocorrencia["estado"], string> = {
  novo: "Novo",
  em_curso: "Em curso",
  aguarda_fornecedor: "Aguarda fornecedor",
  resolvido: "Resolvido",
  arquivado: "Arquivado",
};

export const ESTADOS = Object.keys(ESTADO_LABEL) as Ocorrencia["estado"][];

export const CATEGORIA_LABEL: Record<Ocorrencia["categoria"], string> = {
  agua: "Água e infiltrações",
  eletricidade: "Eletricidade",
  elevadores: "Elevadores",
  limpeza: "Limpeza",
  seguranca: "Segurança",
  espacos_comuns: "Espaços comuns",
  outro: "Outro",
};

export const CATEGORIAS = Object.keys(
  CATEGORIA_LABEL
) as Ocorrencia["categoria"][];

export const FOTOS_MAX = 5;
export const FOTO_MAX_MB = 5;
export const FOTO_TIPOS_VALIDOS = ["image/jpeg", "image/png", "image/webp"];
