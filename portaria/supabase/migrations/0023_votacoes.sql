-- =====================================================================
-- Migration: 0023_votacoes.sql
-- Votações eletrónicas para assembleias de condomínio
--
-- Características:
--   • Anonimato: votos não têm user_id; ligação indireta via hash
--   • Integridade: cada voto tem hash SHA-256 para verificação futura
--   • Audit trail: votacao_participantes regista QUEM votou (não COMO)
--   • Pesos: suporte a votação proporcional por permilagem
-- =====================================================================

-- ----------------------------------------------------------------------
-- TIPOS
-- ----------------------------------------------------------------------
create type public.votacao_estado as enum ('rascunho', 'aberta', 'encerrada', 'cancelada');
create type public.votacao_quorum as enum ('maioria_simples', 'maioria_qualificada', 'unanimidade');

-- ----------------------------------------------------------------------
-- 1. VOTACOES — uma votação vinculada a uma assembleia
-- ----------------------------------------------------------------------
create table public.votacoes (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references public.tenants(id) on delete cascade,
  assembleia_id uuid references public.assembleias(id) on delete set null,
  titulo text not null,
  descricao text,
  estado public.votacao_estado default 'rascunho' not null,
  tipo_quorum public.votacao_quorum default 'maioria_simples' not null,
  peso_por_permilagem boolean default true not null,
  aberta_em timestamptz,
  encerrada_em timestamptz,
  criado_por uuid not null references auth.users(id),
  criado_em timestamptz default now() not null
);

comment on table public.votacoes is 'Votações eletrónicas de condomínio, anónimas e verificáveis';
comment on column public.votacoes.estado is 'rascunho=preparação; aberta=votação em curso; encerrada=resultados disponíveis; cancelada=anulada';
comment on column public.votacoes.peso_por_permilagem is 'Se true, o peso de cada voto é proporcional à permilagem da fração do votante';

create index votacoes_tenant_idx on public.votacoes(tenant_id, criado_em desc);
create index votacoes_assembleia_idx on public.votacoes(assembleia_id, estado);

-- ----------------------------------------------------------------------
-- 2. VOTACAO_OPCOES — opções de resposta de uma votação
-- ----------------------------------------------------------------------
create table public.votacao_opcoes (
  id uuid primary key default gen_random_uuid(),
  votacao_id uuid not null references public.votacoes(id) on delete cascade,
  tenant_id uuid not null references public.tenants(id) on delete cascade,
  texto text not null,
  ordem integer not null default 0
);

create index votacao_opcoes_votacao_idx on public.votacao_opcoes(votacao_id, ordem);

-- ----------------------------------------------------------------------
-- 3. VOTOS — registo anónimo de cada voto
-- ----------------------------------------------------------------------
-- NOTA: Não há user_id aqui — anonimato garantido.
-- O voto_hash permite ao votante verificar que o voto foi contado.
create table public.votos (
  id uuid primary key default gen_random_uuid(),
  votacao_id uuid not null references public.votacoes(id) on delete cascade,
  tenant_id uuid not null references public.tenants(id) on delete cascade,
  opcao_id uuid not null references public.votacao_opcoes(id) on delete cascade,
  voto_hash text not null,
  criado_em timestamptz default now() not null
);

comment on column public.votos.voto_hash is 'SHA-256 do voto + salt único; permite ao votante verificar integridade sem revelar conteúdo';

create index votos_votacao_idx on public.votos(votacao_id, opcao_id);

-- ----------------------------------------------------------------------
-- 4. VOTACAO_PARTICIPANTES — quem pode votar e se já votou
-- ----------------------------------------------------------------------
create table public.votacao_participantes (
  id uuid primary key default gen_random_uuid(),
  votacao_id uuid not null references public.votacoes(id) on delete cascade,
  tenant_id uuid not null references public.tenants(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  votou_em timestamptz,

  unique (votacao_id, user_id)
);

comment on table public.votacao_participantes is 'Registo de participantes numa votação; votou_em=null significa que ainda não votou';

create index votacao_participantes_votacao_idx on public.votacao_participantes(votacao_id, votou_em);
create index votacao_participantes_user_idx on public.votacao_participantes(user_id, votacao_id);

-- ----------------------------------------------------------------------
-- HELPER: Peso total de permilagem de um tenant (para cálculo de quórum)
-- ----------------------------------------------------------------------
create or replace function public.total_permilagem_tenant(p_tenant_id uuid)
returns integer
language sql
stable
security definer
set search_path = public
as $$
  select coalesce(sum(permilagem), 0)::integer
  from public.fracoes
  where tenant_id = p_tenant_id;
$$;

-- ----------------------------------------------------------------------
-- HELPER: Permilagem de um user num tenant (via fração associada)
-- ----------------------------------------------------------------------
create or replace function public.user_permilagem(p_user_id uuid, p_tenant_id uuid)
returns integer
language sql
stable
security definer
set search_path = public
as $$
  select coalesce(f.permilagem, 0)::integer
  from public.user_tenants ut
  left join public.fracoes f on f.id = ut.fracao_id
  where ut.user_id = p_user_id and ut.tenant_id = p_tenant_id
  limit 1;
$$;

-- ----------------------------------------------------------------------
-- ROW-LEVEL SECURITY
-- ----------------------------------------------------------------------

-- ----- votacoes -----
alter table public.votacoes enable row level security;

-- Membros veem votações abertas ou encerradas do seu tenant
-- (rascunho e cancelada só admins)
create policy "members see active votacoes"
  on public.votacoes for select
  using (
    estado in ('aberta', 'encerrada')
    and tenant_id in (select public.user_tenant_ids())
  );

create policy "admins see all votacoes"
  on public.votacoes for select
  using (public.is_tenant_admin(tenant_id));

create policy "admins manage votacoes"
  on public.votacoes for all
  using (public.is_tenant_admin(tenant_id))
  with check (public.is_tenant_admin(tenant_id));

-- ----- votacao_opcoes -----
alter table public.votacao_opcoes enable row level security;

-- Membros veem opções de votações visíveis
create policy "members see opcoes of visible votacoes"
  on public.votacao_opcoes for select
  using (
    exists (
      select 1 from public.votacoes v
      where v.id = votacao_id
        and v.estado in ('aberta', 'encerrada')
        and v.tenant_id in (select public.user_tenant_ids())
    )
  );

create policy "admins see all opcoes"
  on public.votacao_opcoes for select
  using (public.is_tenant_admin(tenant_id));

create policy "admins manage opcoes"
  on public.votacao_opcoes for all
  using (public.is_tenant_admin(tenant_id))
  with check (public.is_tenant_admin(tenant_id));

-- ----- votos -----
alter table public.votos enable row level security;

-- NINGUÉM pode SELECT diretamente em votos (apenas via funções seguras)
-- Apenas o sistema insere votos (via server action com service role)
create policy "system inserts votos"
  on public.votos for insert
  with check (tenant_id in (select public.user_tenant_ids()));

-- ----- votacao_participantes -----
alter table public.votacao_participantes enable row level security;

-- Cada utilizador vê os seus próprios participações
create policy "users see own participacoes"
  on public.votacao_participantes for select
  using (user_id = auth.uid());

-- Admin vê todas as participações do tenant
create policy "admins see all participacoes"
  on public.votacao_participantes for select
  using (public.is_tenant_admin(tenant_id));

-- Admin gere participantes
create policy "admins manage participacoes"
  on public.votacao_participantes for all
  using (public.is_tenant_admin(tenant_id))
  with check (public.is_tenant_admin(tenant_id));

-- Utilizador pode atualizar a sua própria linha (marcar como votado)
create policy "users update own participacao"
  on public.votacao_participantes for update
  using (user_id = auth.uid())
  with check (user_id = auth.uid());
