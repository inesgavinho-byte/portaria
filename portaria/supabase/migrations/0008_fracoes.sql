-- =====================================================================
-- Migration: 0008_fracoes.sql
-- Slice 02 — Frações e Proprietários
--
-- IMPORTANTE: Executar no SQL Editor do Supabase depois da 0007.
--
-- A fração passa a ser uma entidade (deixa de ser texto livre). É a base
-- de contexto do edifício: ocorrências e (futuramente) assembleias
-- referenciam-na por FK.
--
-- Decisão de privacidade: fracoes é ADMIN-ONLY. Guarda dados de
-- proprietários/inquilinos (contactos) que não devem ser navegáveis por
-- todos os condóminos. O condómino vê apenas a SUA fração, via o rótulo
-- denormalizado em user_tenants.fracao (texto) — nunca consulta fracoes.
-- =====================================================================

create table public.fracoes (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references public.tenants(id) on delete cascade,
  codigo text not null,                 -- ex.: "3.º Dto", "R/C Esq", "Loja A"
  descricao text,
  permilagem numeric(6, 2),             -- 0..1000 (soma do prédio = 1000)
  piso text,
  tipologia text,                       -- ex.: "T2"
  proprietario_nome text,
  proprietario_email text,
  proprietario_telefone text,
  inquilino_nome text,
  criado_em timestamptz default now() not null,

  unique (tenant_id, codigo),
  constraint permilagem_valida check (
    permilagem is null or (permilagem >= 0 and permilagem <= 1000)
  )
);

comment on table public.fracoes is
  'Frações do condomínio. Admin-only: guarda contactos de proprietários/inquilinos.';

create index fracoes_tenant_idx on public.fracoes(tenant_id, codigo);

-- Associação utilizador ↔ fração (mantém o texto como rótulo denormalizado
-- para o condómino, que não consulta fracoes diretamente)
alter table public.user_tenants
  add column fracao_id uuid references public.fracoes(id) on delete set null;

-- Associação ocorrência ↔ fração
alter table public.ocorrencias
  add column fracao_id uuid references public.fracoes(id) on delete set null;


-- ----- RLS: admin-only -----
alter table public.fracoes enable row level security;

create policy "admins read fracoes"
  on public.fracoes for select
  using (public.is_tenant_admin(tenant_id));

create policy "admins manage fracoes"
  on public.fracoes for all
  using (public.is_tenant_admin(tenant_id))
  with check (public.is_tenant_admin(tenant_id));
