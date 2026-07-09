-- =====================================================================
-- Migration: 0009_assembleias.sql
-- Slice 05 — Assembleias v1
--
-- IMPORTANTE: Executar no SQL Editor do Supabase depois da 0008.
--
-- Visibilidade: condóminos veem assembleias publicadas (agendada/
-- realizada/cancelada) e a ata; rascunhos são só do admin.
-- =====================================================================

create type public.assembleia_tipo as enum ('ordinaria', 'extraordinaria');
create type public.assembleia_estado as enum (
  'rascunho', 'agendada', 'realizada', 'cancelada'
);

create table public.assembleias (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references public.tenants(id) on delete cascade,
  tipo public.assembleia_tipo default 'ordinaria' not null,
  titulo text not null,
  data_hora timestamptz,
  local text,
  convocatoria text,
  ata text,
  estado public.assembleia_estado default 'rascunho' not null,
  criado_por uuid not null references auth.users(id),
  criado_em timestamptz default now() not null,
  atualizado_em timestamptz default now() not null
);

comment on table public.assembleias is
  'Assembleias de condóminos: convocatória, ordem de trabalhos e ata.';

create index assembleias_tenant_idx
  on public.assembleias(tenant_id, data_hora desc);

create table public.assembleia_pontos (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references public.tenants(id) on delete cascade,
  assembleia_id uuid not null references public.assembleias(id) on delete cascade,
  ordem integer not null,
  titulo text not null,
  descricao text,
  criado_em timestamptz default now() not null
);

create index assembleia_pontos_idx
  on public.assembleia_pontos(assembleia_id, ordem);

-- Documentos podem pertencer a uma assembleia (convocatória, anexos, ata)
alter table public.documentos
  add column assembleia_id uuid references public.assembleias(id) on delete set null;


-- ----- RLS -----
alter table public.assembleias enable row level security;

create policy "members see published assembleias"
  on public.assembleias for select
  using (
    estado <> 'rascunho'
    and tenant_id in (select public.user_tenant_ids())
  );

create policy "admins see all assembleias"
  on public.assembleias for select
  using (public.is_tenant_admin(tenant_id));

create policy "admins manage assembleias"
  on public.assembleias for all
  using (public.is_tenant_admin(tenant_id))
  with check (public.is_tenant_admin(tenant_id));

alter table public.assembleia_pontos enable row level security;

create policy "members see published pontos"
  on public.assembleia_pontos for select
  using (
    exists (
      select 1 from public.assembleias a
      where a.id = assembleia_id
        and a.estado <> 'rascunho'
        and a.tenant_id in (select public.user_tenant_ids())
    )
  );

create policy "admins see all pontos"
  on public.assembleia_pontos for select
  using (public.is_tenant_admin(tenant_id));

create policy "admins manage pontos"
  on public.assembleia_pontos for all
  using (public.is_tenant_admin(tenant_id))
  with check (public.is_tenant_admin(tenant_id));
