-- =====================================================================
-- Migration: 0024_ia_rag.sql
-- Base de Conhecimento com RAG — Assistente IA do Condomínio
--
-- Dependências: extension pgvector (instalada via Supabase dashboard
-- ou CREATE EXTENSION).
-- =====================================================================

-- ----------------------------------------------------------------------
-- 0. Extensão pgvector (ignora se já existir)
-- Explicitamente em `extensions`, onde produção a tem e onde as funções
-- posteriores (20260826030000) a referenciam como extensions.vector.
-- ----------------------------------------------------------------------
create extension if not exists vector with schema extensions;

-- O operador de distância coseno (<=>) e a classe de operadores
-- vector_cosine_ops vivem no schema da extensão; sem `extensions` no
-- search_path, a criação do índice HNSW e das funções que usam <=> falha
-- numa reconstrução limpa (produção tem extensions no search_path do papel).
set search_path = public, extensions;

-- ----------------------------------------------------------------------
-- 1. CONHECIMENTO_EMBEDDINGS — chunks de texto com embeddings vetoriais
-- ----------------------------------------------------------------------
create table public.conhecimento_embeddings (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references public.tenants(id) on delete cascade,
  origem text not null check (origem in ('regulamento', 'documento', 'legislacao', 'ata', 'ocorrencia_resolvida')),
  origem_id text not null, -- ID da entidade de origem (ex: documento.id)
  conteudo text not null, -- chunk de texto
  embedding vector(1536), -- OpenAI text-embedding-3-small
  metadata jsonb not null default '{}'::jsonb, -- { titulo, secao, pagina, ... }
  criado_em timestamptz default now() not null
);

comment on table public.conhecimento_embeddings is
  'Chunks de texto com embeddings vetoriais para busca semântica (RAG).';
comment on column public.conhecimento_embeddings.origem is
  'Tipo de fonte: regulamento, documento, legislacao, ata, ocorrencia_resolvida';
comment on column public.conhecimento_embeddings.embedding is
  'Vetor de 1536 dimensões (OpenAI text-embedding-3-small)';

create index conhecimento_embeddings_tenant_idx
  on public.conhecimento_embeddings(tenant_id, origem);

-- Índice HNSW para busca vetorial eficiente
create index conhecimento_embeddings_embedding_idx
  on public.conhecimento_embeddings
  using hnsw (embedding vector_cosine_ops);

-- ----------------------------------------------------------------------
-- 2. CONVERSAS_IA — histórico de conversas com o assistente
-- ----------------------------------------------------------------------
create table public.conversas_ia (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references public.tenants(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  titulo text,
  criado_em timestamptz default now() not null
);

create index conversas_ia_user_idx
  on public.conversas_ia(tenant_id, user_id, criado_em desc);

-- ----------------------------------------------------------------------
-- 3. CONVERSAS_IA_MENSAGENS — mensagens de cada conversa
-- ----------------------------------------------------------------------
create type public.mensagem_role as enum ('user', 'assistant', 'system');

create table public.conversas_ia_mensagens (
  id uuid primary key default gen_random_uuid(),
  conversa_id uuid not null references public.conversas_ia(id) on delete cascade,
  tenant_id uuid not null references public.tenants(id) on delete cascade,
  role public.mensagem_role not null,
  conteudo text not null,
  contexto jsonb, -- chunks usados para gerar a resposta [{ origem, origem_id, conteudo, score }]
  criado_em timestamptz default now() not null
);

create index conversas_ia_mensagens_conversa_idx
  on public.conversas_ia_mensagens(conversa_id, criado_em);

-- ----------------------------------------------------------------------
-- RLS
-- ----------------------------------------------------------------------

alter table public.conhecimento_embeddings enable row level security;

-- Todos os membros do tenant podem ler embeddings (read-only para RAG)
create policy "members read embeddings"
  on public.conhecimento_embeddings for select
  using (tenant_id in (select public.user_tenant_ids()));

-- Apenas admins podem inserir/apagar embeddings (pipeline de ingestão)
create policy "admins manage embeddings"
  on public.conhecimento_embeddings for all
  using (public.is_tenant_admin(tenant_id))
  with check (public.is_tenant_admin(tenant_id));

alter table public.conversas_ia enable row level security;

-- Cada utilizador vê as suas próprias conversas
create policy "users see own conversations"
  on public.conversas_ia for select
  using (user_id = auth.uid());

-- Cada utilizador cria as suas próprias conversas
create policy "users create own conversations"
  on public.conversas_ia for insert
  with check (user_id = auth.uid());

-- Cada utilizador apaga as suas próprias conversas
create policy "users delete own conversations"
  on public.conversas_ia for delete
  using (user_id = auth.uid());

alter table public.conversas_ia_mensagens enable row level security;

-- Cada utilizador vê mensagens das suas conversas
create policy "users see own messages"
  on public.conversas_ia_mensagens for select
  using (
    exists (
      select 1 from public.conversas_ia c
      where c.id = conversa_id and c.user_id = auth.uid()
    )
  );

-- Cada utilizador insere mensagens nas suas conversas
create policy "users create own messages"
  on public.conversas_ia_mensagens for insert
  with check (
    exists (
      select 1 from public.conversas_ia c
      where c.id = conversa_id and c.user_id = auth.uid()
    )
  );

-- ----------------------------------------------------------------------
-- FUNÇÃO: Busca semântica (vector similarity search)
-- ----------------------------------------------------------------------
-- Esta função é chamada pelas server actions para encontrar chunks
-- relevantes dado um embedding de query.
create or replace function public.buscar_chunks(
  p_tenant_id uuid,
  p_embedding vector(1536),
  p_limite integer default 5,
  p_threshold float default 0.7
)
returns table (
  id uuid,
  origem text,
  origem_id text,
  conteudo text,
  metadata jsonb,
  similarity float
)
language sql
stable
security definer
set search_path = public, extensions
as $$
  select
    e.id,
    e.origem,
    e.origem_id,
    e.conteudo,
    e.metadata,
    1 - (e.embedding <=> p_embedding) as similarity
  from public.conhecimento_embeddings e
  where e.tenant_id = p_tenant_id
    and e.embedding is not null
    and 1 - (e.embedding <=> p_embedding) > p_threshold
  order by e.embedding <=> p_embedding
  limit p_limite;
$$;

comment on function public.buscar_chunks is
  'Busca semântica nos embeddings do tenant. Devolve chunks ordenados por similaridade.';

-- ----------------------------------------------------------------------
-- FUNÇÃO: Contar documentos indexados por tenant
-- ----------------------------------------------------------------------
create or replace function public.estado_conhecimento(p_tenant_id uuid)
returns table (origem text, count bigint)
language sql
stable
security definer
set search_path = public, extensions
as $$
  select e.origem, count(*)::bigint
  from public.conhecimento_embeddings e
  where e.tenant_id = p_tenant_id
  group by e.origem;
$$;
