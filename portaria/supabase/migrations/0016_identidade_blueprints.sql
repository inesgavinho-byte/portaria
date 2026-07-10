-- 0016_identidade_blueprints.sql
-- TEMA 2 — Identidade do condomínio + Document Blueprints.
--
-- PARTE A — Identidade visual e fiscal:
--   * tenants.logo_url          (público — o logótipo aparece em páginas
--                                 públicas e em documentos; não é sensível)
--   * tenant_perfil.nif / iban  (admin-only — dados fiscais internos)
--
-- PARTE B — Blueprints: modelos de documento com variáveis {{...}}
--   substituídas no servidor pelos dados reais do condomínio.

-- ---------- PARTE A ----------
alter table public.tenants
  add column if not exists logo_url text;
comment on column public.tenants.logo_url is
  'URL público do logótipo do condomínio (bucket publico).';

alter table public.tenant_perfil
  add column if not exists nif text,
  add column if not exists iban text;
comment on column public.tenant_perfil.nif is 'NIF do condomínio (interno).';
comment on column public.tenant_perfil.iban is 'IBAN do condomínio (interno).';

-- Bucket público para o logótipo. Objetos servidos sem autenticação.
insert into storage.buckets (id, name, public)
values ('publico', 'publico', true)
on conflict (id) do nothing;

-- ---------- PARTE B ----------
create table if not exists public.blueprints (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references public.tenants(id) on delete cascade,
  nome text not null,
  tipo text not null,
  conteudo_template text not null,
  variaveis text[] not null default '{}',
  criado_em timestamptz not null default now(),
  atualizado_em timestamptz not null default now(),
  unique (tenant_id, tipo)
);

comment on table public.blueprints is
  'Modelos de documento por condomínio, com variáveis {{...}} preenchidas no servidor.';

create index if not exists blueprints_tenant_idx on public.blueprints(tenant_id);

alter table public.blueprints enable row level security;

-- Blueprints são ferramenta de administração — admin-only, como contratos.
create policy "admins manage blueprints"
  on public.blueprints for all
  using (public.is_tenant_admin(tenant_id))
  with check (public.is_tenant_admin(tenant_id));
