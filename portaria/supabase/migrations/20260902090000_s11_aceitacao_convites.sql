-- =====================================================================
-- Migration: 20260902090000_s11_aceitacao_convites.sql
-- S11 — Aceitação explícita de convites (auditoria beta-europa §4/P2;
--       plano registado em docs/beta/phase-1-report.md §4)
--
-- PROBLEMA: aceitar_convites() aceitava, de uma vez e sem confirmação,
-- TODOS os convites pendentes para o email autenticado, correndo
-- automaticamente ao definir a password. O convidado nunca consenti
-- em entrar em cada condomínio — fricção de consentimento (S11).
--
-- SOLUÇÃO: aceitação/recusa POR convite, explícita:
--   1. coluna recusado_em — estado de recusa do convite;
--   2. aceitar_convite(p_convite_id) — aceita UM convite, exigindo que
--      o email do convite corresponda ao auth.uid() autenticado;
--   3. recusar_convite(p_convite_id) — recusa UM convite (mesma exigência);
--   4. convites_pendentes() — lista os convites pendentes do próprio
--      email, com o nome do tenant (o convidado ainda não é membro e
--      a política RLS de tenants não lhe devolveria o nome);
--   5. aceitar_convites() (aceitar tudo de uma vez) é REMOVIDA — manter
--      um caminho de auto-aceite anulava o consentimento explícito.
--
-- FLUXO: ao definir a password, o convidado é levado a /convite/pendentes,
-- onde aceita ou recusa convite a convite. O início de sessão também
-- encaminha para lá se houver convites pendentes.
--
-- Padrões: SECURITY DEFINER com search_path fixo e grants mínimos
-- (0006_harden_function_grants.sql, 20260826030000 §2/§4). A segurança
-- vive DENTRO das funções (nunca confiar em RLS externo numa função
-- SECURITY DEFINER): filtragem e validação por lower(auth.email()).
--
-- Idempotente: add column if not exists, create or replace function,
-- drop/recreate do índice, revokes/grants repetíveis.
-- NÃO aplicar em produção antes de aprovação/merge (regra do repositório).
-- =====================================================================


-- =====================================================================
-- 1. ESTADO DE RECUSA
-- =====================================================================

alter table public.convites add column if not exists recusado_em timestamptz;

comment on column public.convites.recusado_em is
  'Momento da recusa explícita pelo convidado (S11); null enquanto pendente ou aceite';

comment on table public.convites is
  'Convites de adesão a um tenant; aceites ou recusados explicitamente, convite a convite (S11)';

-- O índice «um convite pendente por email por tenant» passa a ignorar os
-- recusados: sem isto, um convite recusado bloquearia para sempre o
-- reconvite do mesmo email pelo mesmo tenant.
drop index if exists convites_tenant_email_pendente_idx;
create unique index convites_tenant_email_pendente_idx
  on public.convites (tenant_id, lower(email))
  where aceite_em is null and recusado_em is null;


-- =====================================================================
-- 2. LISTA DE CONVIDADOS PENDENTES DO PRÓPRIO EMAIL
--
-- SECURITY DEFINER porque o convidado, por definição, ainda não é membro
-- do tenant e a política "users see their tenants" (0001) não lhe dá o
-- nome do condomínio. O definer só serve para o join com tenants: as
-- linhas são sempre filtradas pelo email DO PRÓPRIO chamador.
-- =====================================================================

create or replace function public.convites_pendentes()
returns table (
  id uuid,
  tenant_nome text,
  fracao text,
  role public.user_role,
  criado_em timestamptz
)
language sql
stable
security definer
set search_path = public
as $$
  select c.id, t.nome, c.fracao, c.role, c.criado_em
  from public.convites c
  join public.tenants t on t.id = c.tenant_id
  where lower(c.email) = lower(coalesce(auth.email(), ''))
    and c.aceite_em is null
    and c.recusado_em is null
    and c.expira_em > now()
  order by c.criado_em;
$$;

comment on function public.convites_pendentes() is
  'Convites pendentes (não aceites, não recusados, dentro do prazo) do email autenticado, com o nome do tenant (S11).';

revoke execute on function public.convites_pendentes() from public, anon;
grant execute on function public.convites_pendentes() to authenticated;


-- =====================================================================
-- 3. ACEITAR UM CONVITE — S11
--
-- Substitui aceitar_convites() (aceitar tudo de uma vez). Diferenças:
--   • exige p_convite_id — só o convite indicado é aceite;
--   • valida que o email do convite é o email do chamador;
--   • valida estado (não aceite, não recusado, dentro do prazo);
--   • erros explícitos em PT-PT, que a server action mostra tal e qual.
-- =====================================================================

create or replace function public.aceitar_convite(p_convite_id uuid)
returns boolean
language plpgsql
security definer
set search_path = public
as $$
declare
  v_user uuid := auth.uid();
  v_email text := lower(coalesce(auth.email(), ''));
  v_convite public.convites%rowtype;
begin
  if v_user is null or v_email = '' then
    raise exception 'Sessão não autenticada.' using errcode = '42501';
  end if;

  select * into v_convite from public.convites where id = p_convite_id;
  if not found then
    raise exception 'Convite não encontrado.' using errcode = 'P0002';
  end if;

  -- O convite é pessoal: só o próprio email convidado o pode aceitar.
  if lower(v_convite.email) <> v_email then
    raise exception 'Este convite não está dirigido a este email.' using errcode = '42501';
  end if;

  if v_convite.aceite_em is not null then
    raise exception 'Este convite já tinha sido aceite.' using errcode = 'P0002';
  end if;

  if v_convite.recusado_em is not null then
    raise exception 'Este convite tinha sido recusado. Peça um novo à administração.' using errcode = 'P0002';
  end if;

  if v_convite.expira_em <= now() then
    raise exception 'Este convite expirou. Peça um novo à administração.' using errcode = 'P0002';
  end if;

  insert into public.user_tenants (user_id, tenant_id, fracao, role)
  values (v_user, v_convite.tenant_id, v_convite.fracao, v_convite.role)
  on conflict (user_id, tenant_id) do nothing;

  update public.convites set aceite_em = now() where id = p_convite_id;

  return true;
end;
$$;

comment on function public.aceitar_convite(uuid) is
  'Aceita UM convite, por decisão explícita do convidado; exige que o email do convite seja o do auth.uid() (S11).';

revoke execute on function public.aceitar_convite(uuid) from public, anon;
grant execute on function public.aceitar_convite(uuid) to authenticated;


-- =====================================================================
-- 4. RECUSAR UM CONVITE — S11
--
-- Mesmas validações de identidade e estado; NÃO exige convite dentro do
-- prazo: recusar um convite expirado é inofensivo e deixa o registo
-- explícito (o admin vê que foi recusado, e não apenas expirado).
-- O convite recusado fica na tabela com recusado_em preenchido — é
-- histórico de decisão, não pendente (o índice único deixa reconvidar).
-- =====================================================================

create or replace function public.recusar_convite(p_convite_id uuid)
returns boolean
language plpgsql
security definer
set search_path = public
as $$
declare
  v_user uuid := auth.uid();
  v_email text := lower(coalesce(auth.email(), ''));
  v_convite public.convites%rowtype;
begin
  if v_user is null or v_email = '' then
    raise exception 'Sessão não autenticada.' using errcode = '42501';
  end if;

  select * into v_convite from public.convites where id = p_convite_id;
  if not found then
    raise exception 'Convite não encontrado.' using errcode = 'P0002';
  end if;

  if lower(v_convite.email) <> v_email then
    raise exception 'Este convite não está dirigido a este email.' using errcode = '42501';
  end if;

  if v_convite.aceite_em is not null then
    raise exception 'Este convite já tinha sido aceite.' using errcode = 'P0002';
  end if;

  if v_convite.recusado_em is not null then
    raise exception 'Este convite já tinha sido recusado.' using errcode = 'P0002';
  end if;

  update public.convites set recusado_em = now() where id = p_convite_id;

  return true;
end;
$$;

comment on function public.recusar_convite(uuid) is
  'Recusa UM convite, por decisão explícita do convidado; regista recusado_em; exige o email do auth.uid() (S11).';

revoke execute on function public.recusar_convite(uuid) from public, anon;
grant execute on function public.recusar_convite(uuid) to authenticated;


-- =====================================================================
-- 5. REMOVER O AUTO-ACEITE — aceitar_convites()
--
-- Aceitar todos os convites de uma vez, sem confirmação por convite, é
-- exactamente o que S11 corrige. Não há chamadas restantes: o cliente
-- passou a usar aceitar_convite/recusar_convite via server actions
-- (src/lib/actions/convites.ts) e a UI de convites pendentes.
-- =====================================================================

drop function if exists public.aceitar_convites();
