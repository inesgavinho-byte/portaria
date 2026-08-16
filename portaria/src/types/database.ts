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
  quota_mensal_cents: number | null;
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

/** Documento confidencial, visível apenas a administradores do tenant. */
export type DocumentoAdministracao = {
  id: string;
  tenant_id: string;
  titulo: string;
  descricao: string | null;
  categoria: Documento["categoria"];
  ano: number | null;
  ficheiro_path: string;
  ficheiro_tamanho: number | null;
  ficheiro_tipo: string | null;
  origem_partilhada_path: string | null;
  upload_em: string;
  upload_por: string;
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

export type EspacoComum = {
  id: string;
  tenant_id: string;
  nome: string;
  descricao: string | null;
  capacidade: number | null;
  imagem_url: string | null;
  duracao_minima_minutos: number;
  duracao_maxima_minutos: number;
  antecedencia_minima_horas: number;
  reservas_por_semana: number;
  abertura_seg: string | null;
  fecho_seg: string | null;
  abertura_ter: string | null;
  fecho_ter: string | null;
  abertura_qua: string | null;
  fecho_qua: string | null;
  abertura_qui: string | null;
  fecho_qui: string | null;
  abertura_sex: string | null;
  fecho_sex: string | null;
  abertura_sab: string | null;
  fecho_sab: string | null;
  abertura_dom: string | null;
  fecho_dom: string | null;
  ativo: boolean;
  criado_em: string;
  atualizado_em: string;
};

export type Reserva = {
  id: string;
  tenant_id: string;
  espaco_id: string;
  user_id: string;
  fracao_id: string | null;
  data_inicio: string;
  data_fim: string;
  estado: "pendente" | "confirmada" | "cancelada" | "concluida";
  motivo: string | null;
  num_pessoas: number | null;
  criado_em: string;
  atualizado_em: string;
};

// ============================================================================
// TIPOS FINANCEIROS (Migration 0027)
// ============================================================================

export type ConfiguracaoFinanceira = {
  tenant_id: string;
  dia_vencimento_padrao: number;
  metodo_pagamento_padrao: string;
  iban: string | null;
  mbway_telefone: string | null;
  email_financeiro: string | null;
  moeda: string;
  taxa_juros_mora: number | null;
  ultimo_numero_recibo: number;
  atualizado_em: string;
};

export type QuotaMensal = {
  id: string;
  tenant_id: string;
  fracao_id: string;
  ano: number;
  mes: number;
  valor_cents: number;
  estado: "pendente" | "pago" | "parcial" | "isento";
  vencimento: string | null;
  notas: string | null;
  criado_por: string | null;
  criado_em: string;
  atualizado_em: string;
};

export type Pagamento = {
  id: string;
  tenant_id: string;
  fracao_id: string;
  quota_ids: string[];
  valor_cents: number;
  metodo: "transferencia" | "mbway" | "dinheiro" | "debito_direto" | "outro";
  data_pagamento: string;
  referencia: string | null;
  comprovativo_url: string | null;
  notas: string | null;
  registado_por: string | null;
  criado_em: string;
};

export type Recibo = {
  id: string;
  tenant_id: string;
  fracao_id: string;
  pagamento_id: string | null;
  numero: string;
  valor_cents: number;
  periodo_inicio: string | null;
  periodo_fim: string | null;
  pdf_url: string | null;
  estado: "emitido" | "anulado";
  emitido_em: string;
  anulado_em: string | null;
  anulado_por: string | null;
  motivo_anulacao: string | null;
};

export type VwQuotasResumoMes = {
  tenant_id: string;
  ano: number;
  mes: number;
  pendentes: number;
  pagas: number;
  parciais: number;
  isentos: number;
  total_a_receber: number;
  total_recebido: number;
};

export type VwInadimplencia = {
  fracao_id: string;
  tenant_id: string;
  codigo: string;
  proprietario_nome: string | null;
  divida_total: number;
  meses_pendentes: number;
  ultimo_vencimento: string | null;
};
