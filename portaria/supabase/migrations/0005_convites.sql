-- =====================================================================
-- Migration: 0005_convites.sql
-- Bloco B — convites de membros
--
-- IMPORTANTE: Executar no SQL Editor do Supabase depois da 0004.
--
-- Fluxo:
--   1. Admin cria convite (email + fração + role) — linha nesta tabela.
--   2. O email de convite é enviado pelo Supabase Auth
--      (auth.admin.inviteUserByEmail, chamado server-side).
--   3. O convidado abre o link, define password e a função
--      aceitar_convites() cria o membership em user_tenants.
--
-- A função é SECURITY DEFINER porque o convidado ainda não é membro:
-- as políticas de user_tenants (só admins inserem) não se aplicam a ele.
-- A segurança vem da própria função: só aceita convites dirigidos ao
-- email autenticado do próprio utilizador, dentro do prazo.
-- =====================================================================

create table public.convites (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references public.tenants(id) on delete cascade,
  email text not null,
  fracao text,
  role public.user_role default 'condomino' not null,
  criado_por uuid not null references auth.users(id),
  criado_em timestamptz default now() not null,
  expira_em timestamptz default (now() + interval '14 days') not null,
  aceite_em timestamptz
);

comment on table public.convites is
  'Convites de adesão a um tenant; aceites via aceitar_convites()';

-- Um convite pendente por email por tenant
create unique index convites_tenant_email_pendente_idx
  on public.convites (tenant_id, lower(email))
  where aceite_em is null;

create index convites_tenant_idx on public.convites (tenant_id, criado_em desc);


-- ----- RLS -----
alter table public.convites enable row level security;

-- Admins gerem os convites do seu tenant
create policy "admins manage convites"
  on public.convites for all
  using (public.is_tenant_admin(tenant_id))
  with check (public.is_tenant_admin(tenant_id));

-- O convidado (autenticado) vê os convites dirigidos ao seu email
create policy "invited users see own convites"
  on public.convites for select
  using (lower(email) = lower(coalesce(auth.email(), '')));


-- ----- Aceitação -----
create or replace function public.aceitar_convites()
returns integer
language plpgsql
security definer
set search_path = public
as $$
declare
  v_email text := lower(coalesce(auth.email(), ''));
  v_user uuid := auth.uid();
  v_count integer := 0;
  c record;
begin
  if v_user is null or v_email = '' then
    return 0;
  end if;

  for c in
    select id, tenant_id, fracao, role
    from public.convites
    where lower(email) = v_email
      and aceite_em is null
      and expira_em > now()
  loop
    insert into public.user_tenants (user_id, tenant_id, fracao, role)
    values (v_user, c.tenant_id, c.fracao, c.role)
    on conflict (user_id, tenant_id) do nothing;

    update public.convites set aceite_em = now() where id = c.id;
    v_count := v_count + 1;
  end loop;

  return v_count;
end;
$$;

revoke all on function public.aceitar_convites() from public;
grant execute on function public.aceitar_convites() to authenticated;
