/**
 * Tipos das tabelas Supabase.
 *
 * Quando o schema mudar, podes regenerar este ficheiro automaticamente
 * com a CLI Supabase:
 *   npx supabase gen types typescript --project-id <id> > src/types/database.ts
 *
 * Por agora, definidos manualmente para corresponder à migration inicial.
 */

export type Tenant = {
  id: string;
  slug: string;
  nome: string;
  morada: string | null;
  num_fracoes: number | null;
  ano_construcao: number | null;
  tema: TenantTheme | null;
  dominios: string[];
  created_at: string;
};

export type TenantTheme = {
  cor_primaria?: string;
  cor_secundaria?: string;
  cor_destaque?: string;
  fonte_titulos?: string;
  fonte_corpo?: string;
  logo_url?: string;
};

export type UserTenant = {
  id: string;
  user_id: string;
  tenant_id: string;
  fracao: string | null;
  role: "admin" | "comissao" | "condomino";
  created_at: string;
};

export type Aviso = {
  id: string;
  tenant_id: string;
  titulo: string;
  conteudo: string;
  prioridade: "normal" | "importante" | "urgente";
  publicado_em: string;
  publicado_por: string;
  ativo: boolean;
};

export type Ocorrencia = {
  id: string;
  tenant_id: string;
  titulo: string;
  descricao: string;
  categoria:
    | "agua"
    | "eletricidade"
    | "elevadores"
    | "limpeza"
    | "seguranca"
    | "espacos_comuns"
    | "outro";
  fracao: string | null;
  estado: "novo" | "em_curso" | "aguarda_fornecedor" | "resolvido" | "arquivado";
  criado_por: string;
  criado_em: string;
  atualizado_em: string;
};

export type OcorrenciaEvento = {
  id: string;
  tenant_id: string;
  ocorrencia_id: string;
  tipo: "criada" | "fotografia" | "estado" | "nota";
  estado_anterior: Ocorrencia["estado"] | null;
  estado_novo: Ocorrencia["estado"] | null;
  nota: string | null;
  autor: string;
  criado_em: string;
};

export type OcorrenciaFotografia = {
  id: string;
  tenant_id: string;
  ocorrencia_id: string;
  ficheiro_path: string;
  criado_por: string;
  criado_em: string;
};

export type Documento = {
  id: string;
  tenant_id: string;
  titulo: string;
  descricao: string | null;
  categoria: "ata" | "conta" | "contrato" | "regulamento" | "manual" | "apolice" | "outro";
  ano: number | null;
  ficheiro_path: string;
  ficheiro_tamanho: number | null;
  ficheiro_tipo: string | null;
  upload_em: string;
  upload_por: string;
};
