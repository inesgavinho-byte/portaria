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
  logo_url: string | null;
  created_at: string;
};

export type TenantPerfil = {
  tenant_id: string;
  nif: string | null;
  iban: string | null;
  seguradora_nome: string | null;
  seguradora_apolice: string | null;
  seguradora_contacto: string | null;
  seguradora_validade: string | null;
  administrador_nome: string | null;
  administrador_empresa: string | null;
  administrador_email: string | null;
  administrador_telefone: string | null;
  contactos_emergencia_locais: ContactoEmergencia[];
  regulamento_texto: string | null;
  regulamento_pdf_path: string | null;
  atualizado_em: string;
};

export type ContactoEmergencia = { nome: string; telefone: string };

export type FuncionarioAusencia = {
  id: string;
  tenant_id: string;
  nome: string;
  funcao: string | null;
  data_inicio: string;
  data_fim: string | null;
  motivo: string | null;
  criado_em: string;
};

export type TenantTheme = {
  cor_primaria?: string;
  cor_secundaria?: string;
  cor_destaque?: string;
  fonte_titulos?: string;
  fonte_corpo?: string;
  logo_url?: string;
};

export type Blueprint = {
  id: string;
  tenant_id: string;
  nome: string;
  tipo: string;
  conteudo_template: string;
  variaveis: string[];
  criado_em: string;
  atualizado_em: string;
};

export type UserTenant = {
  id: string;
  user_id: string;
  tenant_id: string;
  fracao: string | null;
  fracao_id: string | null;
  role: "admin" | "comissao" | "condomino" | "inquilino";
  notificacoes_email: boolean;
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
  role: "admin" | "comissao" | "condomino" | "inquilino";
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

export type Fornecedor = {
  id: string;
  tenant_id: string;
  nome: string;
  categoria: string | null;
  contacto_nome: string | null;
  telefone: string | null;
  email: string | null;
  nif: string | null;
  morada: string | null;
  notas: string | null;
  ativo: boolean;
  criado_em: string;
  atualizado_em: string;
};

export type Contrato = {
  id: string;
  tenant_id: string;
  titulo: string;
  contacto_id: string | null;
  fornecedor_id: string | null;
  descricao: string | null;
  data_inicio: string | null;
  data_fim: string | null;
  renovacao_automatica: boolean;
  valor: number | null;
  valor_anual: number | null;
  referencia: string | null;
  notas_internas: string | null;
  notas: string | null;
  criado_em: string;
  atualizado_em: string;
};

export type Contacto = {
  id: string;
  tenant_id: string;
  nome: string;
  tipo: "fornecedor" | "empresa" | "pessoa" | "outro";
  papel: string | null;
  empresa: string | null;
  email: string | null;
  telefone: string | null;
  notas: string | null;
  criado_em: string;
  atualizado_em: string;
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
  categoria: "ata" | "conta" | "contrato" | "regulamento" | "manual" | "apolice" | "circular" | "outro";
  ano: number | null;
  ficheiro_path: string;
  ficheiro_tamanho: number | null;
  ficheiro_tipo: string | null;
  upload_em: string;
  upload_por: string;
  assembleia_id: string | null;
  fornecedor_id: string | null;
  contrato_id: string | null;
  blueprint_id: string | null;
};

export type Votacao = {
  id: string;
  tenant_id: string;
  assembleia_id: string | null;
  titulo: string;
  descricao: string | null;
  estado: "rascunho" | "aberta" | "encerrada" | "cancelada";
  tipo_quorum: "maioria_simples" | "maioria_qualificada" | "unanimidade";
  peso_por_permilagem: boolean;
  aberta_em: string | null;
  encerrada_em: string | null;
  criado_por: string;
  criado_em: string;
};

export type VotacaoOpcao = {
  id: string;
  votacao_id: string;
  tenant_id: string;
  texto: string;
  ordem: number;
};

export type Voto = {
  id: string;
  votacao_id: string;
  tenant_id: string;
  opcao_id: string;
  voto_hash: string;
  criado_em: string;
};

export type VotacaoParticipante = {
  id: string;
  votacao_id: string;
  tenant_id: string;
  user_id: string;
  votou_em: string | null;
};

export type ConhecimentoEmbedding = {
  id: string;
  tenant_id: string;
  origem: "regulamento" | "documento" | "legislacao" | "ata" | "ocorrencia_resolvida";
  origem_id: string;
  conteudo: string;
  embedding: number[] | null;
  metadata: Record<string, unknown>;
  criado_em: string;
};

export type ConversaIA = {
  id: string;
  tenant_id: string;
  user_id: string;
  titulo: string | null;
  criado_em: string;
};

export type ConversaIAMensagem = {
  id: string;
  conversa_id: string;
  tenant_id: string;
  role: "user" | "assistant" | "system";
  conteudo: string;
  contexto: Record<string, unknown>[] | null;
  criado_em: string;
};

export type Notificacao = {
  id: string;
  tenant_id: string;
  user_id: string;
  tipo:
    | "ocorrencia_criada"
    | "ocorrencia_atualizada"
    | "ocorrencia_resolvida"
    | "aviso_publicado"
    | "votacao_aberta"
    | "votacao_encerrada"
    | "assembleia_agendada"
    | "documento_publicado"
    | "convite_aceite"
    | "sistema";
  titulo: string;
  corpo: string | null;
  entidade_tipo: string | null;
  entidade_id: string | null;
  metadata: Record<string, unknown>;
  lida: boolean;
  lida_em: string | null;
  criado_em: string;
};
