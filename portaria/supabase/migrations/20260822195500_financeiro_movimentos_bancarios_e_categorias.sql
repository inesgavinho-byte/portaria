-- Categorias financeiras de primeira classe para utilidades e fachadas.
alter table public.despesas drop constraint if exists despesas_categoria_check;
alter table public.despesas add constraint despesas_categoria_check check (
  categoria = any (array[
    'seguranca_social'::text,
    'salario'::text,
    'elevadores'::text,
    'seguro'::text,
    'manutencao'::text,
    'obras'::text,
    'obras_fachadas'::text,
    'servicos'::text,
    'electricidade'::text,
    'agua_saneamento'::text,
    'impostos'::text,
    'outro'::text
  ])
);

alter table public.obrigacoes_recorrentes drop constraint if exists obrigacoes_recorrentes_categoria_check;
alter table public.obrigacoes_recorrentes add constraint obrigacoes_recorrentes_categoria_check check (
  categoria = any (array[
    'seguranca_social'::text,
    'salario'::text,
    'elevadores'::text,
    'seguro'::text,
    'manutencao'::text,
    'obras'::text,
    'obras_fachadas'::text,
    'servicos'::text,
    'electricidade'::text,
    'agua_saneamento'::text,
    'impostos'::text,
    'outro'::text
  ])
);

-- Movimento bancario e prova documental sao conceitos distintos.
-- Esta tabela permite provar que o dinheiro entrou/saiu mesmo antes de o
-- comprovativo original estar associado ao arquivo documental.
create table if not exists public.movimentos_bancarios (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references public.tenants(id) on delete cascade,
  data_movimento date not null,
  data_valor date,
  tipo text not null check (tipo in ('debito','credito')),
  valor_cents integer not null check (valor_cents > 0),
  descricao text not null,
  contraparte text,
  referencia_externa text,
  origem text not null default 'manual' check (origem in ('extrato_bancario','comprovativo_transferencia','manual')),
  fonte_referencia text,
  confirmado boolean not null default false,
  estado_reconciliacao text not null default 'nao_reconciliado' check (estado_reconciliacao in ('nao_reconciliado','parcial','reconciliado')),
  despesa_id uuid references public.despesas(id) on delete set null,
  pagamento_id uuid references public.pagamentos(id) on delete set null,
  notas text,
  criado_por uuid references auth.users(id) on delete set null,
  criado_em timestamptz not null default now(),
  atualizado_em timestamptz not null default now(),
  check (not (despesa_id is not null and pagamento_id is not null))
);

create index if not exists idx_movimentos_bancarios_tenant_data
  on public.movimentos_bancarios (tenant_id, data_movimento desc);
create index if not exists idx_movimentos_bancarios_despesa
  on public.movimentos_bancarios (despesa_id) where despesa_id is not null;
create index if not exists idx_movimentos_bancarios_pagamento
  on public.movimentos_bancarios (pagamento_id) where pagamento_id is not null;
create unique index if not exists idx_movimentos_bancarios_ref_unique
  on public.movimentos_bancarios (tenant_id, referencia_externa) where referencia_externa is not null;

alter table public.movimentos_bancarios enable row level security;
grant select, insert, update, delete on public.movimentos_bancarios to authenticated;

create policy movimentos_bancarios_admin_select on public.movimentos_bancarios
for select to authenticated
using (exists (
  select 1 from public.user_tenants ut
  where ut.user_id = (select auth.uid())
    and ut.tenant_id = movimentos_bancarios.tenant_id
    and ut.role = 'admin'
));

create policy movimentos_bancarios_admin_insert on public.movimentos_bancarios
for insert to authenticated
with check (exists (
  select 1 from public.user_tenants ut
  where ut.user_id = (select auth.uid())
    and ut.tenant_id = movimentos_bancarios.tenant_id
    and ut.role = 'admin'
));

create policy movimentos_bancarios_admin_update on public.movimentos_bancarios
for update to authenticated
using (exists (
  select 1 from public.user_tenants ut
  where ut.user_id = (select auth.uid())
    and ut.tenant_id = movimentos_bancarios.tenant_id
    and ut.role = 'admin'
))
with check (exists (
  select 1 from public.user_tenants ut
  where ut.user_id = (select auth.uid())
    and ut.tenant_id = movimentos_bancarios.tenant_id
    and ut.role = 'admin'
));

create policy movimentos_bancarios_admin_delete on public.movimentos_bancarios
for delete to authenticated
using (exists (
  select 1 from public.user_tenants ut
  where ut.user_id = (select auth.uid())
    and ut.tenant_id = movimentos_bancarios.tenant_id
    and ut.role = 'admin'
));
