-- 0020_mural_condominio.sql
-- Mural do Condomínio: ausências de funcionários, contactos de emergência
-- locais e marcação de fornecedores como contacto de emergência.

create table if not exists public.funcionarios_ausencias (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references public.tenants(id) on delete cascade,
  nome text not null,
  funcao text,
  data_inicio date not null,
  data_fim date,
  motivo text,
  criado_em timestamptz not null default now()
);

comment on table public.funcionarios_ausencias is
  'Ausências de funcionários/prestadores, mostradas no Mural do Condomínio.';

create index if not exists funcionarios_ausencias_tenant_idx
  on public.funcionarios_ausencias(tenant_id, data_inicio);

alter table public.funcionarios_ausencias enable row level security;

create policy "membros veem ausencias" on public.funcionarios_ausencias for select
  using (tenant_id in (select public.user_tenant_ids()));

create policy "admins gerem ausencias" on public.funcionarios_ausencias for all
  using (public.is_tenant_admin(tenant_id))
  with check (public.is_tenant_admin(tenant_id));

alter table public.tenant_perfil
  add column if not exists contactos_emergencia_locais jsonb not null default '[]'::jsonb;
comment on column public.tenant_perfil.contactos_emergencia_locais is
  'Contactos de emergência locais [{nome, telefone}], editáveis pelo condomínio.';

alter table public.fornecedores
  add column if not exists contacto_emergencia boolean not null default false;
comment on column public.fornecedores.contacto_emergencia is
  'Se o fornecedor aparece nos contactos de emergência do Mural.';

-- Pré-preenchimento para o Edifício Europa.
update public.tenant_perfil p
set contactos_emergencia_locais =
  '[{"nome":"Bombeiros Voluntários de Algés","telefone":"214 103 042"}]'::jsonb
from public.tenants t
where t.id = p.tenant_id and t.slug = 'europa'
  and (p.contactos_emergencia_locais is null or p.contactos_emergencia_locais = '[]'::jsonb);
