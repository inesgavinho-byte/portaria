-- =====================================================================
-- Migration: 0030_reservas_minimizacao.sql
-- S9 (P1) — minimização de dados nas reservas (RGPD art. 5.º-1-c).
--
-- Antes: qualquer membro lia TODAS as reservas do tenant (incluindo
-- user_id, motivo, num_pessoas de terceiros), para poder ver disponibilidade.
-- Agora: um membro só lê as SUAS reservas (linhas completas); a
-- disponibilidade (intervalos ocupados, sem dados pessoais) é obtida por uma
-- função que projeta apenas espaço/início/fim/estado. Admins mantêm acesso
-- operacional total via "admins manage reservas".
--
-- NÃO aplicar em produção sem autorização (D-D). Idempotente.
-- =====================================================================

-- 1. Restringir a leitura direta às próprias reservas
drop policy if exists "users read own reservas" on public.reservas;
create policy "users read own reservas"
  on public.reservas for select
  to authenticated
  using (user_id = auth.uid());
-- (admins continuam a ver tudo via a política "admins manage reservas")

-- 2. Função de disponibilidade — só campos não pessoais, scoped ao tenant
--    do chamador. SECURITY DEFINER para ler reservas de terceiros sem expor
--    dados pessoais; a projeção é a garantia de minimização.
create or replace function public.disponibilidade_reservas(
  p_espaco_id uuid default null,
  p_from timestamptz default null,
  p_to timestamptz default null
)
returns table (
  espaco_id uuid,
  data_inicio timestamptz,
  data_fim timestamptz,
  estado text
)
language sql
stable
security definer
set search_path = public
as $$
  select r.espaco_id, r.data_inicio, r.data_fim, r.estado
  from public.reservas r
  join public.espacos_comuns e on e.id = r.espaco_id
  where e.tenant_id in (select public.user_tenant_ids())  -- só tenants do chamador
    and r.estado in ('pendente', 'confirmada')
    and (p_espaco_id is null or r.espaco_id = p_espaco_id)
    and (p_from is null or r.data_inicio >= p_from)
    and (p_to   is null or r.data_fim   <= p_to);
$$;

comment on function public.disponibilidade_reservas(uuid, timestamptz, timestamptz) is
  'Disponibilidade de espaços (só espaço/início/fim/estado; sem user_id/motivo/'
  'num_pessoas). Scoped aos tenants do chamador. S9 — minimização de dados.';

revoke execute on function public.disponibilidade_reservas(uuid, timestamptz, timestamptz) from public, anon;
grant execute on function public.disponibilidade_reservas(uuid, timestamptz, timestamptz) to authenticated;
