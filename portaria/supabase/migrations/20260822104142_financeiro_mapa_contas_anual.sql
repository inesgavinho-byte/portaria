create table if not exists public.financeiro_exercicios (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references public.tenants(id) on delete cascade,
  ano integer not null check (ano between 1900 and 2200),
  estado text not null default 'aberto' check (estado in ('rascunho','aberto','encerrado','historico')),
  titulo text,
  saldo_inicial_cents bigint,
  fonte_referencia text,
  observacoes text,
  criado_por uuid references auth.users(id) on delete set null,
  criado_em timestamptz not null default now(),
  atualizado_em timestamptz not null default now(),
  unique (tenant_id, ano)
);

create table if not exists public.financeiro_contas_anuais (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references public.tenants(id) on delete cascade,
  exercicio_id uuid not null references public.financeiro_exercicios(id) on delete cascade,
  parent_id uuid references public.financeiro_contas_anuais(id) on delete cascade,
  codigo text not null,
  descricao text not null,
  grupo text not null check (grupo in ('despesa_corrente','poupanca','despesa_extraordinaria','receita_corrente','receita_extraordinaria')),
  ordem integer not null default 0,
  orcamento_cents bigint,
  realizado_declarado_cents bigint,
  comprometido_declarado_cents bigint,
  previsao_declarado_cents bigint,
  desvio_declarado_cents bigint,
  fonte_calculo text not null default 'manual' check (fonte_calculo in ('manual','despesas','pagamentos')),
  filtro_calculo text[] not null default '{}',
  estado_reconciliacao text not null default 'nao_reconciliado' check (estado_reconciliacao in ('nao_reconciliado','parcial','reconciliado','discrepancia')),
  fonte_referencia text,
  notas text,
  criado_em timestamptz not null default now(),
  atualizado_em timestamptz not null default now(),
  unique (exercicio_id, codigo)
);

create index if not exists idx_financeiro_exercicios_tenant_ano on public.financeiro_exercicios(tenant_id, ano desc);
create index if not exists idx_financeiro_contas_exercicio_ordem on public.financeiro_contas_anuais(exercicio_id, ordem, codigo);
create index if not exists idx_financeiro_contas_tenant on public.financeiro_contas_anuais(tenant_id);

alter table public.financeiro_exercicios enable row level security;
alter table public.financeiro_contas_anuais enable row level security;

grant select, insert, update, delete on public.financeiro_exercicios to authenticated;
grant select, insert, update, delete on public.financeiro_contas_anuais to authenticated;

create policy financeiro_exercicios_admin_select on public.financeiro_exercicios for select to authenticated
using (exists (select 1 from public.user_tenants ut where ut.user_id = (select auth.uid()) and ut.tenant_id = financeiro_exercicios.tenant_id and ut.role = 'admin'));
create policy financeiro_exercicios_admin_insert on public.financeiro_exercicios for insert to authenticated
with check (exists (select 1 from public.user_tenants ut where ut.user_id = (select auth.uid()) and ut.tenant_id = financeiro_exercicios.tenant_id and ut.role = 'admin'));
create policy financeiro_exercicios_admin_update on public.financeiro_exercicios for update to authenticated
using (exists (select 1 from public.user_tenants ut where ut.user_id = (select auth.uid()) and ut.tenant_id = financeiro_exercicios.tenant_id and ut.role = 'admin'))
with check (exists (select 1 from public.user_tenants ut where ut.user_id = (select auth.uid()) and ut.tenant_id = financeiro_exercicios.tenant_id and ut.role = 'admin'));
create policy financeiro_exercicios_admin_delete on public.financeiro_exercicios for delete to authenticated
using (exists (select 1 from public.user_tenants ut where ut.user_id = (select auth.uid()) and ut.tenant_id = financeiro_exercicios.tenant_id and ut.role = 'admin'));

create policy financeiro_contas_admin_select on public.financeiro_contas_anuais for select to authenticated
using (exists (select 1 from public.user_tenants ut where ut.user_id = (select auth.uid()) and ut.tenant_id = financeiro_contas_anuais.tenant_id and ut.role = 'admin'));
create policy financeiro_contas_admin_insert on public.financeiro_contas_anuais for insert to authenticated
with check (
  exists (select 1 from public.user_tenants ut where ut.user_id = (select auth.uid()) and ut.tenant_id = financeiro_contas_anuais.tenant_id and ut.role = 'admin')
  and exists (select 1 from public.financeiro_exercicios e where e.id = financeiro_contas_anuais.exercicio_id and e.tenant_id = financeiro_contas_anuais.tenant_id)
  and (financeiro_contas_anuais.parent_id is null or exists (select 1 from public.financeiro_contas_anuais p where p.id = financeiro_contas_anuais.parent_id and p.exercicio_id = financeiro_contas_anuais.exercicio_id and p.tenant_id = financeiro_contas_anuais.tenant_id))
);
create policy financeiro_contas_admin_update on public.financeiro_contas_anuais for update to authenticated
using (exists (select 1 from public.user_tenants ut where ut.user_id = (select auth.uid()) and ut.tenant_id = financeiro_contas_anuais.tenant_id and ut.role = 'admin'))
with check (
  exists (select 1 from public.user_tenants ut where ut.user_id = (select auth.uid()) and ut.tenant_id = financeiro_contas_anuais.tenant_id and ut.role = 'admin')
  and exists (select 1 from public.financeiro_exercicios e where e.id = financeiro_contas_anuais.exercicio_id and e.tenant_id = financeiro_contas_anuais.tenant_id)
  and (financeiro_contas_anuais.parent_id is null or exists (select 1 from public.financeiro_contas_anuais p where p.id = financeiro_contas_anuais.parent_id and p.exercicio_id = financeiro_contas_anuais.exercicio_id and p.tenant_id = financeiro_contas_anuais.tenant_id))
);
create policy financeiro_contas_admin_delete on public.financeiro_contas_anuais for delete to authenticated
using (exists (select 1 from public.user_tenants ut where ut.user_id = (select auth.uid()) and ut.tenant_id = financeiro_contas_anuais.tenant_id and ut.role = 'admin'));
