-- =====================================================================
-- Migration: 0001_initial_schema.sql
-- Plataforma Portaria — schema inicial multi-tenant
--
-- IMPORTANTE: Este ficheiro deve ser executado no SQL Editor do Supabase
-- (Dashboard > SQL Editor > New Query). Cola o conteúdo todo e corre.
--
-- Cria:
--   1. Tabela tenants (prédios)
--   2. Tabela user_tenants (associação utilizador↔prédio com role)
--   3. Tabela avisos
--   4. Tabela documentos
--   5. Storage bucket para ficheiros de documentos
--   6. Row-Level Security (RLS) em TODAS as tabelas
--   7. Helper functions
-- =====================================================================


-- ----------------------------------------------------------------------
-- 1. TENANTS — cada prédio é um tenant
-- ----------------------------------------------------------------------
create table public.tenants (
  id uuid primary key default gen_random_uuid(),
  slug text unique not null,
  nome text not null,
  morada text,
  num_fracoes integer,
  ano_construcao integer,
  tema jsonb,
  created_at timestamptz default now() not null
);

comment on table public.tenants is 'Prédios geridos pela plataforma; cada um é um tenant isolado';
comment on column public.tenants.slug is 'Identificador URL-friendly (ex: europa)';
comment on column public.tenants.tema is 'Personalização visual do tenant (cores, fontes, logo)';


-- ----------------------------------------------------------------------
-- 2. USER_TENANTS — quem pertence a cada tenant e com que papel
-- ----------------------------------------------------------------------
create type public.user_role as enum ('admin', 'comissao', 'condomino');

create table public.user_tenants (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  tenant_id uuid not null references public.tenants(id) on delete cascade,
  fracao text,
  role public.user_role default 'condomino' not null,
  created_at timestamptz default now() not null,

  unique (user_id, tenant_id)
);

create index user_tenants_user_id_idx on public.user_tenants(user_id);
create index user_tenants_tenant_id_idx on public.user_tenants(tenant_id);

comment on table public.user_tenants is 'Associação N:N entre utilizadores e tenants, com role';
comment on column public.user_tenants.role is
  'admin = administração; comissao = comissões internas; condomino = utilizador comum';


-- ----------------------------------------------------------------------
-- 3. AVISOS — mural de comunicações da administração
-- ----------------------------------------------------------------------
create type public.aviso_prioridade as enum ('normal', 'importante', 'urgente');

create table public.avisos (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references public.tenants(id) on delete cascade,
  titulo text not null,
  conteudo text not null,
  prioridade public.aviso_prioridade default 'normal' not null,
  publicado_em timestamptz default now() not null,
  publicado_por uuid not null references auth.users(id),
  ativo boolean default true not null
);

create index avisos_tenant_id_publicado_em_idx
  on public.avisos(tenant_id, publicado_em desc);


-- ----------------------------------------------------------------------
-- 4. DOCUMENTOS — repositório (atas, contas, contratos, etc.)
-- ----------------------------------------------------------------------
create type public.documento_categoria as enum (
  'ata', 'conta', 'contrato', 'regulamento', 'manual', 'apolice', 'outro'
);

create table public.documentos (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references public.tenants(id) on delete cascade,
  titulo text not null,
  descricao text,
  categoria public.documento_categoria not null,
  ano integer,
  ficheiro_path text not null,
  ficheiro_tamanho bigint,
  ficheiro_tipo text,
  upload_em timestamptz default now() not null,
  upload_por uuid not null references auth.users(id)
);

create index documentos_tenant_id_categoria_idx
  on public.documentos(tenant_id, categoria, ano desc);


-- ======================================================================
-- HELPER FUNCTIONS — usadas nas políticas RLS
-- ======================================================================

-- Devolve os tenant_ids a que o utilizador atual pertence
create or replace function public.user_tenant_ids()
returns setof uuid
language sql
stable
security definer
set search_path = public
as $$
  select tenant_id
  from public.user_tenants
  where user_id = auth.uid();
$$;

-- Verifica se o utilizador atual é admin do tenant indicado
create or replace function public.is_tenant_admin(p_tenant_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.user_tenants
    where user_id = auth.uid()
      and tenant_id = p_tenant_id
      and role = 'admin'
  );
$$;


-- ======================================================================
-- ROW-LEVEL SECURITY — esta é a peça central de isolamento entre tenants
-- ======================================================================

-- ----- tenants -----
alter table public.tenants enable row level security;

-- Qualquer pessoa pode ver os tenants a que pertence (para listagem/troca)
create policy "users see their tenants"
  on public.tenants for select
  using (id in (select public.user_tenant_ids()));

-- Apenas admins podem atualizar o seu tenant
create policy "admins update their tenant"
  on public.tenants for update
  using (public.is_tenant_admin(id));


-- ----- user_tenants -----
alter table public.user_tenants enable row level security;

-- Utilizador vê os seus próprios memberships
create policy "users see own memberships"
  on public.user_tenants for select
  using (user_id = auth.uid());

-- Admin do tenant vê todos os memberships do seu tenant
create policy "admins see tenant memberships"
  on public.user_tenants for select
  using (public.is_tenant_admin(tenant_id));

-- Apenas admins podem adicionar/remover membros do tenant
create policy "admins manage memberships"
  on public.user_tenants for all
  using (public.is_tenant_admin(tenant_id))
  with check (public.is_tenant_admin(tenant_id));


-- ----- avisos -----
alter table public.avisos enable row level security;

-- Membros do tenant veem avisos ativos do seu tenant
create policy "members see active avisos"
  on public.avisos for select
  using (
    ativo = true
    and tenant_id in (select public.user_tenant_ids())
  );

-- Admins veem todos os avisos (incluindo inativos)
create policy "admins see all avisos"
  on public.avisos for select
  using (public.is_tenant_admin(tenant_id));

-- Apenas admins criam/atualizam avisos
create policy "admins manage avisos"
  on public.avisos for all
  using (public.is_tenant_admin(tenant_id))
  with check (public.is_tenant_admin(tenant_id));


-- ----- documentos -----
alter table public.documentos enable row level security;

-- Membros do tenant veem documentos do seu tenant
create policy "members see tenant documentos"
  on public.documentos for select
  using (tenant_id in (select public.user_tenant_ids()));

-- Apenas admins fazem upload/edit/delete
create policy "admins manage documentos"
  on public.documentos for all
  using (public.is_tenant_admin(tenant_id))
  with check (public.is_tenant_admin(tenant_id));


-- ======================================================================
-- STORAGE — bucket para ficheiros de documentos
-- ======================================================================
insert into storage.buckets (id, name, public)
values ('documentos', 'documentos', false)
on conflict do nothing;

-- Política: utilizadores podem fazer download se pertencerem ao tenant
-- A convenção de path é: {tenant_id}/{documento_id}/{filename}
create policy "members download tenant documentos"
  on storage.objects for select
  using (
    bucket_id = 'documentos'
    and (storage.foldername(name))[1]::uuid in (select public.user_tenant_ids())
  );

-- Apenas admins fazem upload
create policy "admins upload documentos"
  on storage.objects for insert
  with check (
    bucket_id = 'documentos'
    and public.is_tenant_admin((storage.foldername(name))[1]::uuid)
  );

create policy "admins delete documentos"
  on storage.objects for delete
  using (
    bucket_id = 'documentos'
    and public.is_tenant_admin((storage.foldername(name))[1]::uuid)
  );


-- ======================================================================
-- DADOS INICIAIS — primeiro tenant: Edifício Europa
-- ======================================================================
insert into public.tenants (slug, nome, morada, num_fracoes, ano_construcao, tema)
values (
  'europa',
  'Edifício Europa',
  'Rua Professor Ricardo Jorge, n.º 7, Miraflores/Algés',
  26,
  null,  -- preencher quando se souber
  '{
    "cor_primaria": "#ADAA96",
    "cor_secundaria": "#F2F0E7",
    "cor_destaque": "#8B8670"
  }'::jsonb
);

-- NOTA: Após o primeiro registo de utilizador via Supabase Auth, terás de
-- inserir manualmente uma linha em user_tenants com role='admin' para esse
-- utilizador, para te poderes administrar a ti própria. Exemplo:
--
--   insert into public.user_tenants (user_id, tenant_id, fracao, role)
--   values (
--     '<o teu user id do auth.users>',
--     (select id from public.tenants where slug = 'europa'),
--     '3.º Direito',
--     'admin'
--   );
