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
  fracao_id: string | null;
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

export type Documento = {
  id: string;
  tenant_id: string;
  titulo: string;
  descricao: string | null;
  categoria: DocumentoCategoria;
  ano: number | null;
  ficheiro_path: string;
  ficheiro_tamanho: number | null;
  ficheiro_tipo: string | null;
  upload_em: string;
  upload_por: string;
};

export type DocumentoCategoria =
  | "ata"
  | "conta"
  | "contrato"
  | "regulamento"
  | "manual"
  | "apolice"
  | "seguro"
  | "obra"
  | "outro";

// =====================================================================
// Objetos operacionais — migration 0002 (Foundation)
// =====================================================================

export type Fracao = {
  id: string;
  tenant_id: string;
  identificacao: string;
  piso: string | null;
  permilagem: number | null;
  observacoes: string | null;
  created_at: string;
};

export type PessoaRelacao =
  | "proprietario"
  | "inquilino"
  | "representante"
  | "fornecedor"
  | "outro";

export type Pessoa = {
  id: string;
  tenant_id: string;
  nome: string;
  email: string | null;
  telefone: string | null;
  relacao: PessoaRelacao;
  fracao_id: string | null;
  user_id: string | null;
  observacoes: string | null;
  created_at: string;
};

export type OcorrenciaEstado =
  | "novo"
  | "em_curso"
  | "aguarda_fornecedor"
  | "resolvido"
  | "arquivado";

export type OcorrenciaCategoria =
  | "infiltracao"
  | "elevador"
  | "ruido"
  | "limpeza"
  | "iluminacao"
  | "porta"
  | "esclarecimento"
  | "outro";

export type Ocorrencia = {
  id: string;
  tenant_id: string;
  titulo: string;
  descricao: string | null;
  categoria: OcorrenciaCategoria;
  estado: OcorrenciaEstado;
  fracao_id: string | null;
  reportado_por: string;
  responsavel_id: string | null;
  criado_em: string;
  atualizado_em: string;
};

export type OcorrenciaEventoTipo =
  | "criacao"
  | "mudanca_estado"
  | "nota"
  | "foto"
  | "atribuicao";

export type OcorrenciaEvento = {
  id: string;
  ocorrencia_id: string;
  tenant_id: string;
  tipo: OcorrenciaEventoTipo;
  conteudo: string | null;
  autor_id: string;
  criado_em: string;
};

export type AssembleiaTipo = "ordinaria" | "extraordinaria";

export type AssembleiaEstado =
  | "rascunho"
  | "agendada"
  | "realizada"
  | "cancelada";

export type Assembleia = {
  id: string;
  tenant_id: string;
  titulo: string;
  tipo: AssembleiaTipo;
  estado: AssembleiaEstado;
  data_hora: string | null;
  local: string | null;
  observacoes: string | null;
  ata_documento_id: string | null;
  criado_por: string;
  criado_em: string;
};

export type AssembleiaPonto = {
  id: string;
  assembleia_id: string;
  tenant_id: string;
  ordem: number;
  titulo: string;
  descricao: string | null;
};

export type DecisaoOrigem =
  | "assembleia"
  | "administracao"
  | "ocorrencia"
  | "obra"
  | "consulta";

export type DecisaoEstado =
  | "pendente"
  | "em_execucao"
  | "concluida"
  | "arquivada";

export type Decisao = {
  id: string;
  tenant_id: string;
  titulo: string;
  contexto: string | null;
  origem: DecisaoOrigem;
  estado: DecisaoEstado;
  consequencia: string | null;
  decidido_em: string | null;
  decidido_por: string | null;
  assembleia_id: string | null;
  ocorrencia_id: string | null;
  documento_id: string | null;
  criado_em: string;
};

export type TarefaEstado = "pendente" | "em_curso" | "concluida" | "cancelada";

export type TarefaPrioridade = "baixa" | "normal" | "alta" | "urgente";

export type TarefaOrigem =
  | "manual"
  | "assembleia"
  | "ocorrencia"
  | "seguro"
  | "contrato"
  | "sistema";

export type Tarefa = {
  id: string;
  tenant_id: string;
  titulo: string;
  descricao: string | null;
  estado: TarefaEstado;
  prioridade: TarefaPrioridade;
  origem: TarefaOrigem;
  prazo: string | null;
  responsavel_id: string | null;
  ocorrencia_id: string | null;
  assembleia_id: string | null;
  criado_por: string;
  criado_em: string;
};
