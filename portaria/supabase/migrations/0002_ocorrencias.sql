-- =====================================================================
-- Migration: 0002_ocorrencias.sql
-- Bloco Ocorrências — reporte e acompanhamento de ocorrências
--
-- IMPORTANTE: Executar no SQL Editor do Supabase depois da 0001.
--
-- Cria:
--   1. Tabela ocorrencias
--   2. Tabela ocorrencia_eventos (timeline — a camada de contexto interna)
--   3. Tabela ocorrencia_fotografias
--   4. Storage bucket para fotografias
--   5. Políticas RLS de todas as tabelas e do bucket
--
-- Modelo de visibilidade:
--   - Condómino: cria ocorrências; vê apenas as suas; vê a timeline
--     das suas ocorrências EXCETO notas internas.
--   - Admin: vê e gere todas as ocorrências do tenant, incluindo notas.
-- =====================================================================


-- ----------------------------------------------------------------------
-- 1. OCORRENCIAS
-- ----------------------------------------------------------------------
create type public.ocorrencia_estado as enum (
  'novo', 'em_curso', 'aguarda_fornecedor', 'resolvido', 'arquivado'
);

create type public.ocorrencia_categoria as enum (
  'agua', 'eletricidade', 'elevadores', 'limpeza',
  'seguranca', 'espacos_comuns', 'outro'
);

create table public.ocorrencias (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references public.tenants(id) on delete cascade,
  titulo text not null,
  descricao text not null,
  categoria public.ocorrencia_categoria not null,
  fracao text,
  estado public.ocorrencia_estado default 'novo' not null,
  criado_por uuid not null references auth.users(id),
  criado_em timestamptz default now() not null,
  atualizado_em timestamptz default now() not null
);

comment on table public.ocorrencias is
  'Ocorrências reportadas pelos condóminos e geridas pela administração';
comment on column public.ocorrencias.fracao is
  'Fração associada, se aplicável (texto livre, alinhado com user_tenants.fracao)';

create index ocorrencias_tenant_estado_idx
  on public.ocorrencias(tenant_id, estado, criado_em desc);
create index ocorrencias_criado_por_idx
  on public.ocorrencias(criado_por, criado_em desc);


-- ----------------------------------------------------------------------
-- 2. OCORRENCIA_EVENTOS — timeline
--    Regista tudo o que acontece a uma ocorrência. As entradas do tipo
--    'nota' são internas (só admins as veem, imposto por RLS).
-- ----------------------------------------------------------------------
create type public.ocorrencia_evento_tipo as enum (
  'criada', 'fotografia', 'estado', 'nota'
);

create table public.ocorrencia_eventos (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references public.tenants(id) on delete cascade,
  ocorrencia_id uuid not null references public.ocorrencias(id) on delete cascade,
  tipo public.ocorrencia_evento_tipo not null,
  estado_anterior public.ocorrencia_estado,
  estado_novo public.ocorrencia_estado,
  nota text,
  autor uuid not null references auth.users(id),
  criado_em timestamptz default now() not null,

  -- Coerência mínima entre tipo e campos
  constraint evento_estado_campos check (
    (tipo = 'estado') = (estado_novo is not null)
  ),
  constraint evento_nota_campos check (
    (tipo = 'nota') = (nota is not null)
  )
);

comment on table public.ocorrencia_eventos is
  'Timeline de cada ocorrência: criação, fotografias, mudanças de estado, notas internas';

create index ocorrencia_eventos_ocorrencia_idx
  on public.ocorrencia_eventos(ocorrencia_id, criado_em);


-- ----------------------------------------------------------------------
-- 3. OCORRENCIA_FOTOGRAFIAS
-- ----------------------------------------------------------------------
create table public.ocorrencia_fotografias (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references public.tenants(id) on delete cascade,
  ocorrencia_id uuid not null references public.ocorrencias(id) on delete cascade,
  ficheiro_path text not null,
  criado_por uuid not null references auth.users(id),
  criado_em timestamptz default now() not null
);

create index ocorrencia_fotografias_ocorrencia_idx
  on public.ocorrencia_fotografias(ocorrencia_id, criado_em);


-- ======================================================================
-- ROW-LEVEL SECURITY
-- ======================================================================

-- ----- ocorrencias -----
alter table public.ocorrencias enable row level security;

create policy "creators see own ocorrencias"
  on public.ocorrencias for select
  using (
    criado_por = auth.uid()
    and tenant_id in (select public.user_tenant_ids())
  );

create policy "admins see tenant ocorrencias"
  on public.ocorrencias for select
  using (public.is_tenant_admin(tenant_id));

create policy "members create ocorrencias"
  on public.ocorrencias for insert
  with check (
    criado_por = auth.uid()
    and tenant_id in (select public.user_tenant_ids())
  );

-- Apenas admins alteram (estado); condóminos não editam após criar
create policy "admins update ocorrencias"
  on public.ocorrencias for update
  using (public.is_tenant_admin(tenant_id))
  with check (public.is_tenant_admin(tenant_id));


-- ----- ocorrencia_eventos -----
alter table public.ocorrencia_eventos enable row level security;

-- Criador da ocorrência vê a timeline, exceto notas internas
create policy "creators see public eventos"
  on public.ocorrencia_eventos for select
  using (
    tipo <> 'nota'
    and exists (
      select 1 from public.ocorrencias o
      where o.id = ocorrencia_id and o.criado_por = auth.uid()
    )
  );

create policy "admins see all eventos"
  on public.ocorrencia_eventos for select
  using (public.is_tenant_admin(tenant_id));

-- Criador regista eventos de criação e fotografia nas suas ocorrências
create policy "creators log own eventos"
  on public.ocorrencia_eventos for insert
  with check (
    autor = auth.uid()
    and tipo in ('criada', 'fotografia')
    and exists (
      select 1 from public.ocorrencias o
      where o.id = ocorrencia_id
        and o.criado_por = auth.uid()
        and o.tenant_id = ocorrencia_eventos.tenant_id
    )
  );

-- Admins registam qualquer tipo de evento no seu tenant
create policy "admins log eventos"
  on public.ocorrencia_eventos for insert
  with check (
    autor = auth.uid()
    and public.is_tenant_admin(tenant_id)
  );


-- ----- ocorrencia_fotografias -----
alter table public.ocorrencia_fotografias enable row level security;

create policy "creators see own fotografias"
  on public.ocorrencia_fotografias for select
  using (
    exists (
      select 1 from public.ocorrencias o
      where o.id = ocorrencia_id and o.criado_por = auth.uid()
    )
  );

create policy "admins see tenant fotografias"
  on public.ocorrencia_fotografias for select
  using (public.is_tenant_admin(tenant_id));

create policy "members add fotografias"
  on public.ocorrencia_fotografias for insert
  with check (
    criado_por = auth.uid()
    and (
      public.is_tenant_admin(tenant_id)
      or exists (
        select 1 from public.ocorrencias o
        where o.id = ocorrencia_id
          and o.criado_por = auth.uid()
          and o.tenant_id = ocorrencia_fotografias.tenant_id
      )
    )
  );


-- ======================================================================
-- STORAGE — bucket para fotografias de ocorrências
-- Convenção de path: {tenant_id}/{ocorrencia_id}/{filename}
-- ======================================================================
insert into storage.buckets (id, name, public)
values ('ocorrencias', 'ocorrencias', false)
on conflict do nothing;

-- Download: admin do tenant ou criador da ocorrência
create policy "ocorrencias fotos download"
  on storage.objects for select
  using (
    bucket_id = 'ocorrencias'
    and (
      public.is_tenant_admin((storage.foldername(name))[1]::uuid)
      or exists (
        select 1 from public.ocorrencias o
        where o.id = (storage.foldername(name))[2]::uuid
          and o.criado_por = auth.uid()
      )
    )
  );

-- Upload: admin do tenant ou criador da ocorrência
create policy "ocorrencias fotos upload"
  on storage.objects for insert
  with check (
    bucket_id = 'ocorrencias'
    and (
      public.is_tenant_admin((storage.foldername(name))[1]::uuid)
      or exists (
        select 1 from public.ocorrencias o
        where o.id = (storage.foldername(name))[2]::uuid
          and o.criado_por = auth.uid()
          and o.tenant_id = (storage.foldername(name))[1]::uuid
      )
    )
  );
