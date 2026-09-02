-- Fecho do ciclo de triagem financeira: REGRAS + ALIASES + proveniência.
--
-- Princípio de desenho: uma sugestão nunca é uma atribuição. Mas uma REGRA
-- criada por uma pessoa é uma decisão permanente dessa pessoa — por isso as
-- regras aplicam-se sozinhas, com proveniência visível
-- (movimentos_bancarios.fornecedor_origem = 'regra') e reversíveis com um
-- clique (qualquer acção manual volta a escrever 'manual'). Os aliases e as
-- sugestões de fracção nunca escrevem nada sozinhos: só aceleram a decisão
-- de quem tria.

-- ---------------------------------------------------------------------------
-- 1. Proveniência da atribuição de fornecedor (manual vs. regra)
-- ---------------------------------------------------------------------------
alter table public.movimentos_bancarios
  add column if not exists fornecedor_origem text not null default 'manual'
  check (fornecedor_origem in ('manual','regra'));

comment on column public.movimentos_bancarios.fornecedor_origem is
  'Quem decidiu a atribuição actual do fornecedor: ''manual'' (uma pessoa, na triagem) ou ''regra'' (aplicada automaticamente a partir de regras_classificacao_movimentos). Uma correcção manual sobrescreve sempre a regra.';

-- Linhas já existentes foram todas decididas por pessoas: o default cobre-as.

-- ---------------------------------------------------------------------------
-- 2. Regras de classificação: padrão normalizado → fornecedor OU "sem fornecedor"
-- ---------------------------------------------------------------------------
create table if not exists public.regras_classificacao_movimentos (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references public.tenants(id) on delete cascade,
  padrao text not null,          -- minúsculas, sem acentos, espaços colapsados
  -- Nullable por decisão de desenho: uma regra pode ser "marcar como sem
  -- fornecedor", e nesse caso não há fornecedor nenhum para referenciar.
  -- O check abaixo garante o XOR: sem_fornecedor = true ⟺ fornecedor_id nulo.
  fornecedor_id uuid references public.fornecedores(id) on delete cascade,
  sem_fornecedor boolean not null default false,
  criado_por uuid references auth.users(id) on delete set null,
  criado_em timestamptz not null default now(),
  check (sem_fornecedor = (fornecedor_id is null)),
  unique (tenant_id, padrao)
);

-- A precedência das regras é a ordem de criação (primeira regra criada vence),
-- por isso o índice de listagem ordena por criado_em.
create index if not exists idx_regras_classificacao_tenant
  on public.regras_classificacao_movimentos (tenant_id, criado_em);
create index if not exists idx_regras_classificacao_fornecedor
  on public.regras_classificacao_movimentos (tenant_id, fornecedor_id);

alter table public.regras_classificacao_movimentos enable row level security;
grant select, insert, update, delete on public.regras_classificacao_movimentos to authenticated;

create policy regras_classificacao_admin_select on public.regras_classificacao_movimentos
for select to authenticated
using (exists (
  select 1 from public.user_tenants ut
  where ut.user_id = (select auth.uid())
    and ut.tenant_id = regras_classificacao_movimentos.tenant_id
    and ut.role = 'admin'
));

create policy regras_classificacao_admin_insert on public.regras_classificacao_movimentos
for insert to authenticated
with check (exists (
  select 1 from public.user_tenants ut
  where ut.user_id = (select auth.uid())
    and ut.tenant_id = regras_classificacao_movimentos.tenant_id
    and ut.role = 'admin'
));

create policy regras_classificacao_admin_update on public.regras_classificacao_movimentos
for update to authenticated
using (exists (
  select 1 from public.user_tenants ut
  where ut.user_id = (select auth.uid())
    and ut.tenant_id = regras_classificacao_movimentos.tenant_id
    and ut.role = 'admin'
))
with check (exists (
  select 1 from public.user_tenants ut
  where ut.user_id = (select auth.uid())
    and ut.tenant_id = regras_classificacao_movimentos.tenant_id
    and ut.role = 'admin'
));

create policy regras_classificacao_admin_delete on public.regras_classificacao_movimentos
for delete to authenticated
using (exists (
  select 1 from public.user_tenants ut
  where ut.user_id = (select auth.uid())
    and ut.tenant_id = regras_classificacao_movimentos.tenant_id
    and ut.role = 'admin'
));

-- ---------------------------------------------------------------------------
-- 3. Aliases de contraparte: a memória das variantes de nome confirmadas por
--    humanos. Cada vez que alguém atribui um fornecedor a um movimento com
--    contraparte, a contraparte normalizada fica guardada como alias — da
--    próxima vez a sugestão nasce "exacta".
-- ---------------------------------------------------------------------------
create table if not exists public.fornecedores_aliases (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references public.tenants(id) on delete cascade,
  fornecedor_id uuid not null references public.fornecedores(id) on delete cascade,
  alias text not null,           -- normalizado igual aos padrões
  criado_em timestamptz not null default now(),
  unique (tenant_id, alias)
);

create index if not exists idx_fornecedores_aliases_fornecedor
  on public.fornecedores_aliases (fornecedor_id);

alter table public.fornecedores_aliases enable row level security;
grant select, insert, update, delete on public.fornecedores_aliases to authenticated;

create policy fornecedores_aliases_admin_select on public.fornecedores_aliases
for select to authenticated
using (exists (
  select 1 from public.user_tenants ut
  where ut.user_id = (select auth.uid())
    and ut.tenant_id = fornecedores_aliases.tenant_id
    and ut.role = 'admin'
));

create policy fornecedores_aliases_admin_insert on public.fornecedores_aliases
for insert to authenticated
with check (exists (
  select 1 from public.user_tenants ut
  where ut.user_id = (select auth.uid())
    and ut.tenant_id = fornecedores_aliases.tenant_id
    and ut.role = 'admin'
));

create policy fornecedores_aliases_admin_update on public.fornecedores_aliases
for update to authenticated
using (exists (
  select 1 from public.user_tenants ut
  where ut.user_id = (select auth.uid())
    and ut.tenant_id = fornecedores_aliases.tenant_id
    and ut.role = 'admin'
))
with check (exists (
  select 1 from public.user_tenants ut
  where ut.user_id = (select auth.uid())
    and ut.tenant_id = fornecedores_aliases.tenant_id
    and ut.role = 'admin'
));

create policy fornecedores_aliases_admin_delete on public.fornecedores_aliases
for delete to authenticated
using (exists (
  select 1 from public.user_tenants ut
  where ut.user_id = (select auth.uid())
    and ut.tenant_id = fornecedores_aliases.tenant_id
    and ut.role = 'admin'
));
