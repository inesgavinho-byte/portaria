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
  email: string | null;
  telefone: string | null;
  created_at: string;
};

export type TenantPerfil = {
  tenant_id: string;
  seguradora_nome: string | null;
  seguradora_apolice: string | null;
  seguradora_contacto: string | null;
  seguradora_validade: string | null;
  administrador_nome: string | null;
  administrador_empresa: string | null;
  administrador_email: string | null;
  administrador_telefone: string | null;
  atualizado_em: string;
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
  fracao_id: string | null;
  role: "admin" | "comissao" | "condomino";
  created_at: string;
};

export type Fracao = {
  id: string;
  tenant_id: string;
  codigo: string;
  descricao: string | null;
  permilagem: number | null;
  piso: string | null;
  tipologia: string | null;
  proprietario_nome: string | null;
  proprietario_email: string | null;
  proprietario_telefone: string | null;
  inquilino_nome: string | null;
  criado_em: string;
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

export type Convite = {
  id: string;
  tenant_id: string;
  email: string;
  fracao: string | null;
  role: "admin" | "comissao" | "condomino";
  criado_por: string;
  criado_em: string;
  expira_em: string;
  aceite_em: string | null;
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
  fracao_id: string | null;
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

export type Conversa = {
  id: string;
  tenant_id: string;
  assunto: string;
  ocorrencia_id: string | null;
  criado_por: string;
  criado_em: string;
  atualizado_em: string;
};

export type ConversaMensagem = {
  id: string;
  tenant_id: string;
  conversa_id: string;
  corpo: string;
  autor: string;
  criado_em: string;
};

export type Assembleia = {
  id: string;
  tenant_id: string;
  tipo: "ordinaria" | "extraordinaria";
  titulo: string;
  data_hora: string | null;
  local: string | null;
  convocatoria: string | null;
  ata: string | null;
  estado: "rascunho" | "agendada" | "realizada" | "cancelada";
  criado_por: string;
  criado_em: string;
  atualizado_em: string;
};

export type AssembleiaPonto = {
  id: string;
  tenant_id: string;
  assembleia_id: string;
  ordem: number;
  titulo: string;
  descricao: string | null;
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
