-- =====================================================================
-- Migration: 0004_dominios_tenant.sql
-- Resolução de tenant por domínio passa a ser dados, não código
--
-- IMPORTANTE: Executar no SQL Editor do Supabase depois da 0003.
--
-- O middleware deixa de ter um mapa hardcoded hostname→slug: passa a
-- consultar esta coluna (com cache). Adicionar um prédio novo passa a
-- ser um UPDATE, sem deploy.
-- =====================================================================

alter table public.tenants
  add column dominios text[] not null default '{}';

comment on column public.tenants.dominios is
  'Hostnames que servem este tenant (ex.: {edificioeuropa.pt,www.edificioeuropa.pt}). Sem esquema nem porta, em minúsculas.';

-- Índice GIN para lookup por domínio (dominios @> array[host])
create index tenants_dominios_idx on public.tenants using gin (dominios);

-- Domínios do primeiro tenant
update public.tenants
set dominios = array['edificioeuropa.pt', 'www.edificioeuropa.pt']
where slug = 'europa';
