-- =====================================================================
-- Migration: 0002_foundation_objects.sql
-- Plataforma Portaria — objetos operacionais da Foundation
--
-- Executar no SQL Editor do Supabase (Dashboard > SQL Editor > New Query),
-- DEPOIS da migration 0001.
--
-- Acrescenta os objetos reais do condomínio descritos no Product Canon:
--   1. Frações
--   2. Pessoas / contactos
--   3. Ocorrências (+ eventos/histórico)
--   4. Assembleias (+ pontos da ordem de trabalhos)
--   5. Decisões
--   6. Tarefas
--   7. Storage para fotografias de ocorrências
--   8. Row-Level Security em todas as tabelas novas
--
-- Princípio do canon: a base de dados ANTECIPA os objetos (decisões,
-- tarefas, memória) mesmo antes de existir UI para todos eles.
--
-- NOTA: reutiliza as funções helper de RLS já criadas na 0001:
--   public.user_tenant_ids()  e  public.is_tenant_admin(uuid)
-- =====================================================================


-- ----------------------------------------------------------------------
-- 0. Alinhar categorias de documentos com o canon (obras, seguros)
--    ADD VALUE é aditivo e idempotente; mantém-se 'apolice' por retro-compat.
-- ----------------------------------------------------------------------
alter type public.documento_categoria add value if not exists 'obra';
alter type public.documento_categoria add value if not exists 'seguro';


-- ----------------------------------------------------------------------
-- 1. FRAÇÕES — as unidades do edifício
-- ----------------------------------------------------------------------
create table public.fracoes (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references public.tenants(id) on delete cascade,
  identificacao text not null,            -- ex: "3.º Direito", "R/C Esq.", "Loja A"
  piso text,
  permilagem numeric(7,3),                -- permilagem da fração (até 1000,000)
  observacoes text,
  created_at timestamptz default now() not null,

  unique (tenant_id, identificacao)
);

create index fracoes_tenant_id_idx on public.fracoes(tenant_id);

comment on table public.fracoes is 'Frações autónomas de cada condomínio';
comment on column public.fracoes.permilagem is 'Peso da fração na propriedade horizontal (‰)';


-- Liga o membership existente à fração (aditivo; o campo texto fracao mantém-se)
alter table public.user_tenants
  add column if not exists fracao_id uuid references public.fracoes(id) on delete set null;


-- ----------------------------------------------------------------------
-- 2. PESSOAS / CONTACTOS — pode haver contactos que não são utilizadores
-- ----------------------------------------------------------------------
create type public.pessoa_relacao as enum (
  'proprietario', 'inquilino', 'representante', 'fornecedor', 'outro'
);

create table public.pessoas (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references public.tenants(id) on delete cascade,
  nome text not null,
  email text,
  telefone text,
  relacao public.pessoa_relacao default 'proprietario' not null,
  fracao_id uuid references public.fracoes(id) on delete set null,
  user_id uuid references auth.users(id) on delete set null,  -- se também tiver login
  observacoes text,
  created_at timestamptz default now() not null
);

create index pessoas_tenant_id_idx on public.pessoas(tenant_id);
create index pessoas_fracao_id_idx on public.pessoas(fracao_id);

comment on table public.pessoas is 'Contactos do condomínio (proprietários, inquilinos, fornecedores). Nem todos têm conta.';


-- ----------------------------------------------------------------------
-- 3. OCORRÊNCIAS — problemas, pedidos e assuntos operacionais
-- ----------------------------------------------------------------------
create type public.ocorrencia_estado as enum (
  'novo', 'em_curso', 'aguarda_fornecedor', 'resolvido', 'arquivado'
);

create type public.ocorrencia_categoria as enum (
  'infiltracao', 'elevador', 'ruido', 'limpeza', 'iluminacao',
  'porta', 'esclarecimento', 'outro'
);

create table public.ocorrencias (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references public.tenants(id) on delete cascade,
  titulo text not null,
  descricao text,
  categoria public.ocorrencia_categoria default 'outro' not null,
  estado public.ocorrencia_estado default 'novo' not null,
  fracao_id uuid references public.fracoes(id) on delete set null,
  reportado_por uuid not null references auth.users(id),
  responsavel_id uuid references auth.users(id) on delete set null,
  criado_em timestamptz default now() not null,
  atualizado_em timestamptz default now() not null
);

create index ocorrencias_tenant_estado_idx
  on public.ocorrencias(tenant_id, estado, criado_em desc);

comment on table public.ocorrencias is 'Assuntos operacionais do condomínio com ciclo de vida e histórico';


-- Histórico/timeline de cada ocorrência (mudanças de estado, notas, fotos)
create type public.ocorrencia_evento_tipo as enum (
  'criacao', 'mudanca_estado', 'nota', 'foto', 'atribuicao'
);

create table public.ocorrencia_eventos (
  id uuid primary key default gen_random_uuid(),
  ocorrencia_id uuid not null references public.ocorrencias(id) on delete cascade,
  tenant_id uuid not null references public.tenants(id) on delete cascade,
  tipo public.ocorrencia_evento_tipo not null,
  conteudo text,                         -- nota, descrição da mudança, ou path da foto
  autor_id uuid not null references auth.users(id),
  criado_em timestamptz default now() not null
);

create index ocorrencia_eventos_ocorrencia_idx
  on public.ocorrencia_eventos(ocorrencia_id, criado_em);

comment on table public.ocorrencia_eventos is 'Linha temporal de cada ocorrência (memória estrutural)';


-- ----------------------------------------------------------------------
-- 4. ASSEMBLEIAS — convocatórias e atas
-- ----------------------------------------------------------------------
create type public.assembleia_tipo as enum ('ordinaria', 'extraordinaria');

create type public.assembleia_estado as enum (
  'rascunho', 'agendada', 'realizada', 'cancelada'
);

create table public.assembleias (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references public.tenants(id) on delete cascade,
  titulo text not null,
  tipo public.assembleia_tipo default 'ordinaria' not null,
  estado public.assembleia_estado default 'rascunho' not null,
  data_hora timestamptz,
  local text,
  observacoes text,
  ata_documento_id uuid references public.documentos(id) on delete set null,
  criado_por uuid not null references auth.users(id),
  criado_em timestamptz default now() not null
);

create index assembleias_tenant_idx
  on public.assembleias(tenant_id, data_hora desc);

comment on table public.assembleias is 'Assembleias de condóminos; ata ligada a um documento quando existir';


-- Pontos da ordem de trabalhos
create table public.assembleia_pontos (
  id uuid primary key default gen_random_uuid(),
  assembleia_id uuid not null references public.assembleias(id) on delete cascade,
  tenant_id uuid not null references public.tenants(id) on delete cascade,
  ordem integer not null default 1,
  titulo text not null,
  descricao text
);

create index assembleia_pontos_assembleia_idx
  on public.assembleia_pontos(assembleia_id, ordem);


-- ----------------------------------------------------------------------
-- 5. DECISÕES — ativos de memória; podem nascer de várias origens
-- ----------------------------------------------------------------------
create type public.decisao_origem as enum (
  'assembleia', 'administracao', 'ocorrencia', 'obra', 'consulta'
);

create type public.decisao_estado as enum (
  'pendente', 'em_execucao', 'concluida', 'arquivada'
);

create table public.decisoes (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references public.tenants(id) on delete cascade,
  titulo text not null,
  contexto text,
  origem public.decisao_origem default 'administracao' not null,
  estado public.decisao_estado default 'pendente' not null,
  consequencia text,
  decidido_em date,
  decidido_por text,                     -- texto livre (pode não ser um utilizador)
  assembleia_id uuid references public.assembleias(id) on delete set null,
  ocorrencia_id uuid references public.ocorrencias(id) on delete set null,
  documento_id uuid references public.documentos(id) on delete set null,
  criado_em timestamptz default now() not null
);

create index decisoes_tenant_idx on public.decisoes(tenant_id, criado_em desc);

comment on table public.decisoes is 'Decisões do condomínio com contexto e ligações de memória';


-- ----------------------------------------------------------------------
-- 6. TAREFAS — o que está pendente; alimenta o dashboard
-- ----------------------------------------------------------------------
create type public.tarefa_estado as enum (
  'pendente', 'em_curso', 'concluida', 'cancelada'
);

create type public.tarefa_prioridade as enum (
  'baixa', 'normal', 'alta', 'urgente'
);

create type public.tarefa_origem as enum (
  'manual', 'assembleia', 'ocorrencia', 'seguro', 'contrato', 'sistema'
);

create table public.tarefas (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references public.tenants(id) on delete cascade,
  titulo text not null,
  descricao text,
  estado public.tarefa_estado default 'pendente' not null,
  prioridade public.tarefa_prioridade default 'normal' not null,
  origem public.tarefa_origem default 'manual' not null,
  prazo date,
  responsavel_id uuid references auth.users(id) on delete set null,
  ocorrencia_id uuid references public.ocorrencias(id) on delete set null,
  assembleia_id uuid references public.assembleias(id) on delete set null,
  criado_por uuid not null references auth.users(id),
  criado_em timestamptz default now() not null
);

create index tarefas_tenant_estado_idx
  on public.tarefas(tenant_id, estado, prazo);

comment on table public.tarefas is 'Tarefas da administração; base do dashboard "o que faço hoje"';


-- ======================================================================
-- ROW-LEVEL SECURITY — mesmo padrão da 0001
--   • membros do tenant veem as linhas do seu tenant
--   • apenas admins fazem mutations (exceção: condóminos criam ocorrências)
-- ======================================================================

-- ----- fracoes -----
alter table public.fracoes enable row level security;

create policy "members see tenant fracoes"
  on public.fracoes for select
  using (tenant_id in (select public.user_tenant_ids()));

create policy "admins manage fracoes"
  on public.fracoes for all
  using (public.is_tenant_admin(tenant_id))
  with check (public.is_tenant_admin(tenant_id));


-- ----- pessoas -----
alter table public.pessoas enable row level security;

create policy "members see tenant pessoas"
  on public.pessoas for select
  using (tenant_id in (select public.user_tenant_ids()));

create policy "admins manage pessoas"
  on public.pessoas for all
  using (public.is_tenant_admin(tenant_id))
  with check (public.is_tenant_admin(tenant_id));


-- ----- ocorrencias -----
alter table public.ocorrencias enable row level security;

-- Qualquer membro do tenant vê as ocorrências (transparência)
create policy "members see tenant ocorrencias"
  on public.ocorrencias for select
  using (tenant_id in (select public.user_tenant_ids()));

-- Qualquer membro pode reportar (criar) uma ocorrência no seu tenant
create policy "members create ocorrencias"
  on public.ocorrencias for insert
  with check (
    tenant_id in (select public.user_tenant_ids())
    and reportado_por = auth.uid()
  );

-- Apenas admins atualizam estado / responsável
create policy "admins update ocorrencias"
  on public.ocorrencias for update
  using (public.is_tenant_admin(tenant_id))
  with check (public.is_tenant_admin(tenant_id));

create policy "admins delete ocorrencias"
  on public.ocorrencias for delete
  using (public.is_tenant_admin(tenant_id));


-- ----- ocorrencia_eventos -----
alter table public.ocorrencia_eventos enable row level security;

create policy "members see tenant ocorrencia_eventos"
  on public.ocorrencia_eventos for select
  using (tenant_id in (select public.user_tenant_ids()));

-- Membros podem acrescentar notas/fotos às ocorrências do seu tenant
create policy "members add ocorrencia_eventos"
  on public.ocorrencia_eventos for insert
  with check (
    tenant_id in (select public.user_tenant_ids())
    and autor_id = auth.uid()
  );

create policy "admins manage ocorrencia_eventos"
  on public.ocorrencia_eventos for delete
  using (public.is_tenant_admin(tenant_id));


-- ----- assembleias -----
alter table public.assembleias enable row level security;

create policy "members see tenant assembleias"
  on public.assembleias for select
  using (tenant_id in (select public.user_tenant_ids()));

create policy "admins manage assembleias"
  on public.assembleias for all
  using (public.is_tenant_admin(tenant_id))
  with check (public.is_tenant_admin(tenant_id));


-- ----- assembleia_pontos -----
alter table public.assembleia_pontos enable row level security;

create policy "members see tenant assembleia_pontos"
  on public.assembleia_pontos for select
  using (tenant_id in (select public.user_tenant_ids()));

create policy "admins manage assembleia_pontos"
  on public.assembleia_pontos for all
  using (public.is_tenant_admin(tenant_id))
  with check (public.is_tenant_admin(tenant_id));


-- ----- decisoes -----
alter table public.decisoes enable row level security;

create policy "members see tenant decisoes"
  on public.decisoes for select
  using (tenant_id in (select public.user_tenant_ids()));

create policy "admins manage decisoes"
  on public.decisoes for all
  using (public.is_tenant_admin(tenant_id))
  with check (public.is_tenant_admin(tenant_id));


-- ----- tarefas -----
alter table public.tarefas enable row level security;

-- Tarefas são de gestão: apenas admins veem e gerem
create policy "admins see tarefas"
  on public.tarefas for select
  using (public.is_tenant_admin(tenant_id));

create policy "admins manage tarefas"
  on public.tarefas for all
  using (public.is_tenant_admin(tenant_id))
  with check (public.is_tenant_admin(tenant_id));


-- ======================================================================
-- STORAGE — bucket para fotografias de ocorrências
--   Convenção de path: {tenant_id}/{ocorrencia_id}/{filename}
-- ======================================================================
insert into storage.buckets (id, name, public)
values ('ocorrencias', 'ocorrencias', false)
on conflict do nothing;

-- Membros do tenant veem as fotos das ocorrências do seu tenant
create policy "members see ocorrencia fotos"
  on storage.objects for select
  using (
    bucket_id = 'ocorrencias'
    and (storage.foldername(name))[1]::uuid in (select public.user_tenant_ids())
  );

-- Membros do tenant podem anexar fotos (ao reportar/atualizar ocorrências)
create policy "members upload ocorrencia fotos"
  on storage.objects for insert
  with check (
    bucket_id = 'ocorrencias'
    and (storage.foldername(name))[1]::uuid in (select public.user_tenant_ids())
  );

-- Apenas admins apagam fotos
create policy "admins delete ocorrencia fotos"
  on storage.objects for delete
  using (
    bucket_id = 'ocorrencias'
    and public.is_tenant_admin((storage.foldername(name))[1]::uuid)
  );
