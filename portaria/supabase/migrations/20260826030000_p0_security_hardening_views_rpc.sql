-- =====================================================================
-- Migration: 20260826030000_p0_security_hardening_views_rpc.sql
-- P0 — Auditoria de segurança Supabase: fecha bypasses de RLS expostos
-- pelas views financeiras e por 13 funções SECURITY DEFINER hoje
-- executáveis por anon/PUBLIC.
--
-- Âmbito (ver docs/security/p0-2026-08-supabase-hardening.md):
--   1. vw_inadimplencia / vw_quotas_resumo_mes → security_invoker + grants
--   2. gerar_quotas_mes / obter_proximo_numero_recibo → authenticated + is_tenant_admin()
--   3. calcular_divida_fracao → authenticated + membership/admin da fração
--   4. buscar_chunks / estado_conhecimento → authenticated + membership no tenant
--   5. verificar_disponibilidade / contar_reservas_semana → sem acesso client-side
--      (não utilizada; interna a validar_reserva, respetivamente)
--   6. notificar_admins / notificar_todos / trigger_* / validar_reserva → só
--      internas (triggers/owner); revoke de PUBLIC/anon/authenticated
--   7. notificacoes: remove INSERT permissivo de cliente (WITH CHECK true)
--   8. search_path fixo nas 5 funções identificadas pelo advisor
--   9. default privileges: novas funções em public deixam de ter EXECUTE
--      automático para PUBLIC/anon/authenticated
--
-- Fora de âmbito (ver docs/security/p0-2026-08-supabase-hardening.md §15):
--   revogação em massa nos grants das 60 tabelas; conversão das 96 policies
--   PUBLIC; votações/reservas/storage/documentos (já tratados por
--   0028_hardening_multitenant.sql, não aplicada — âmbito próprio).
--
-- Idempotente: `create or replace function`, `drop policy/view if exists`,
-- `alter view ... set`, revokes repetíveis sem erro.
-- =====================================================================


-- =====================================================================
-- 1. VIEWS FINANCEIRAS — security invoker + grants mínimos
--
-- Views normais (não SECURITY DEFINER na sintaxe), mas owned by postgres:
-- por omissão do Postgres correm com os privilégios do owner, ignorando
-- RLS do chamador. `security_invoker = true` (Postgres 15+/Supabase atual)
-- faz a view correr como o chamador, sujeita ao RLS de `fracoes` (admin-only)
-- e `quotas_mensais` (admin vê tudo do tenant; condómino só a sua fração).
-- Não altera a definição funcional das queries.
-- =====================================================================

alter view public.vw_inadimplencia set (security_invoker = true);
alter view public.vw_quotas_resumo_mes set (security_invoker = true);

revoke all on public.vw_inadimplencia from anon;
revoke all on public.vw_quotas_resumo_mes from anon;

revoke all on public.vw_inadimplencia from authenticated;
revoke all on public.vw_quotas_resumo_mes from authenticated;
grant select on public.vw_inadimplencia to authenticated;
grant select on public.vw_quotas_resumo_mes to authenticated;


-- =====================================================================
-- 2. gerar_quotas_mes / obter_proximo_numero_recibo — CRÍTICO
--
-- SECURITY DEFINER, recebem p_tenant_id e escrevem/atualizam dados
-- financeiros sem verificar se o chamador é admin desse tenant. Chamadas
-- confirmadas (grep + leitura) só em server actions com requireAdmin()
-- (financeiro.ts: gerarQuotasMensais, emitirRecibo) — authenticated é a
-- superfície correta, mas a função TEM de validar internamente (nunca
-- confiar no RLS externo: é SECURITY DEFINER).
-- =====================================================================

create or replace function public.gerar_quotas_mes(
  p_tenant_id uuid,
  p_ano integer,
  p_mes integer,
  p_valor_base_cents integer default null
)
returns integer
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_count integer := 0;
  v_vencimento date;
  v_dia_venc integer;
begin
  if not public.is_tenant_admin(p_tenant_id) then
    raise exception 'Apenas administradores do condomínio podem gerar quotas.'
      using errcode = '42501';
  end if;

  select coalesce(dia_vencimento_padrao, 8)
  into v_dia_venc
  from public.configuracao_financeira
  where tenant_id = p_tenant_id;

  if v_dia_venc is null then
    v_dia_venc := 8;
  end if;

  v_vencimento := make_date(p_ano, p_mes, least(v_dia_venc, 28));

  insert into public.quotas_mensais (tenant_id, fracao_id, ano, mes, valor_cents, vencimento, estado)
  select
    f.tenant_id,
    f.id,
    p_ano,
    p_mes,
    coalesce(p_valor_base_cents, f.quota_mensal_cents, 0),
    v_vencimento,
    case when coalesce(p_valor_base_cents, f.quota_mensal_cents, 0) = 0 then 'isento' else 'pendente' end
  from public.fracoes f
  where f.tenant_id = p_tenant_id
    and not exists (
      select 1 from public.quotas_mensais qm
      where qm.fracao_id = f.id and qm.ano = p_ano and qm.mes = p_mes
    );

  get diagnostics v_count = row_count;
  return v_count;
end;
$$;

create or replace function public.obter_proximo_numero_recibo(p_tenant_id uuid)
returns text
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_numero integer;
  v_ano text;
begin
  if not public.is_tenant_admin(p_tenant_id) then
    raise exception 'Apenas administradores do condomínio podem emitir recibos.'
      using errcode = '42501';
  end if;

  update public.configuracao_financeira
  set ultimo_numero_recibo = ultimo_numero_recibo + 1
  where tenant_id = p_tenant_id
  returning ultimo_numero_recibo into v_numero;

  v_ano := to_char(now(), 'YYYY');

  return 'R-' || v_ano || '-' || lpad(v_numero::text, 6, '0');
end;
$$;

revoke execute on function public.gerar_quotas_mes(uuid, integer, integer, integer) from public, anon;
grant execute on function public.gerar_quotas_mes(uuid, integer, integer, integer) to authenticated;

revoke execute on function public.obter_proximo_numero_recibo(uuid) from public, anon;
grant execute on function public.obter_proximo_numero_recibo(uuid) to authenticated;


-- =====================================================================
-- 3. calcular_divida_fracao — CRÍTICO
--
-- SECURITY DEFINER, recebe fracao_id arbitrário e consulta quotas/pagamentos
-- sem autorização. Uso real confirmado: `totalEmDivida()` (financeiro.ts),
-- chamada por um condómino autenticado com `ctx.membership.fracao_id`
-- (a própria fração). A função passa a resolver o tenant da fração
-- internamente e a exigir que o chamador seja membro dessa fração OU admin
-- do tenant — nunca confiar no UUID como segredo.
-- =====================================================================

create or replace function public.calcular_divida_fracao(p_fracao_id uuid)
returns integer
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_tenant_id uuid;
  v_total_quotas integer;
  v_total_pagos integer;
begin
  select tenant_id into v_tenant_id
  from public.fracoes
  where id = p_fracao_id;

  if v_tenant_id is null then
    return 0;
  end if;

  if not exists (
    select 1 from public.user_tenants ut
    where ut.user_id = auth.uid()
      and ut.tenant_id = v_tenant_id
      and (ut.fracao_id = p_fracao_id or ut.role = 'admin')
  ) then
    raise exception 'Não autorizado a consultar esta fração.' using errcode = '42501';
  end if;

  select coalesce(sum(valor_cents), 0)
  into v_total_quotas
  from public.quotas_mensais
  where fracao_id = p_fracao_id
    and estado in ('pendente', 'parcial');

  select coalesce(sum(valor_cents), 0)
  into v_total_pagos
  from public.pagamentos
  where fracao_id = p_fracao_id;

  return greatest(v_total_quotas - v_total_pagos, 0);
end;
$$;

revoke execute on function public.calcular_divida_fracao(uuid) from public, anon;
grant execute on function public.calcular_divida_fracao(uuid) to authenticated;


-- =====================================================================
-- 4. buscar_chunks / estado_conhecimento — RAG
--
-- SECURITY DEFINER, recebem p_tenant_id sem validar associação ao tenant.
-- Uso real confirmado (ia-rag.ts): sempre com o tenant do próprio contexto
-- autenticado. Passam a exigir membership de auth.uid() em p_tenant_id —
-- caso contrário devolvem 0 linhas, sem revelar existência de conteúdo
-- alheio. Assinatura de buscar_chunks preservada tal como está em produção
-- (vector sem dimensão fixa, resolvido via search_path=public,extensions).
-- =====================================================================

create or replace function public.buscar_chunks(
  p_tenant_id uuid,
  p_embedding extensions.vector,
  p_limite integer default 5,
  p_threshold double precision default 0.7
)
returns table (
  id uuid,
  origem text,
  origem_id text,
  conteudo text,
  metadata jsonb,
  similarity double precision
)
language sql
stable
security definer
set search_path = public, extensions
as $$
  select
    e.id,
    e.origem,
    e.origem_id,
    e.conteudo,
    e.metadata,
    1 - (e.embedding <=> p_embedding) as similarity
  from public.conhecimento_embeddings e
  where e.tenant_id = p_tenant_id
    and e.embedding is not null
    and 1 - (e.embedding <=> p_embedding) > p_threshold
    and exists (
      select 1 from public.user_tenants ut
      where ut.user_id = auth.uid()
        and ut.tenant_id = p_tenant_id
    )
  order by e.embedding <=> p_embedding
  limit p_limite;
$$;

create or replace function public.estado_conhecimento(p_tenant_id uuid)
returns table (origem text, count bigint)
language sql
stable
security definer
set search_path = public
as $$
  select e.origem, count(*)::bigint
  from public.conhecimento_embeddings e
  where e.tenant_id = p_tenant_id
    and exists (
      select 1 from public.user_tenants ut
      where ut.user_id = auth.uid()
        and ut.tenant_id = p_tenant_id
    )
  group by e.origem;
$$;

revoke execute on function public.buscar_chunks(uuid, extensions.vector, integer, double precision) from public, anon;
grant execute on function public.buscar_chunks(uuid, extensions.vector, integer, double precision) to authenticated;

revoke execute on function public.estado_conhecimento(uuid) from public, anon;
grant execute on function public.estado_conhecimento(uuid) to authenticated;


-- =====================================================================
-- 5. FUNÇÕES SEM CHAMADA LEGÍTIMA DIRETA DO CLIENTE
--
-- Confirmado por grep em src/ (nenhuma chamada `.rpc(...)`) + leitura do
-- corpo das funções:
--   • verificar_disponibilidade — NÃO UTILIZADA. Foi substituída por
--     disponibilidade_reservas (0030_reservas_minimizacao.sql, âmbito
--     próprio/não aplicada) e não é chamada por nenhuma trigger.
--   • contar_reservas_semana — chamada apenas por validar_reserva()
--     (trigger), nunca por RPC direto do cliente.
--   • notificar_admins / notificar_todos — chamadas apenas por triggers
--     (trigger_aviso_notificar, trigger_ocorrencia_notificar,
--     trigger_reserva_notificar), nunca por RPC direto do cliente.
--   • trigger_aviso_notificar / trigger_ocorrencia_notificar /
--     trigger_reserva_notificar / validar_reserva — funções de trigger
--     puras (confirmado em information_schema.triggers).
--
-- Todas continuam a funcionar: são chamadas por outras funções SECURITY
-- DEFINER (correm como owner, que tem sempre EXECUTE nas suas próprias
-- funções) ou pelo mecanismo de trigger do Postgres (não passa por
-- privilégio EXECUTE de PUBLIC/anon/authenticated). Só o endpoint
-- /rest/v1/rpc/<fn> fica fechado.
-- =====================================================================

revoke execute on function public.verificar_disponibilidade(uuid, timestamptz, timestamptz) from public, anon, authenticated;
revoke execute on function public.contar_reservas_semana(uuid, uuid, timestamptz) from public, anon, authenticated;
revoke execute on function public.notificar_admins(uuid, text, text, text, text, uuid, jsonb) from public, anon, authenticated;
revoke execute on function public.notificar_todos(uuid, text, text, text, text, uuid, jsonb, uuid) from public, anon, authenticated;
revoke execute on function public.trigger_aviso_notificar() from public, anon, authenticated;
revoke execute on function public.trigger_ocorrencia_notificar() from public, anon, authenticated;
revoke execute on function public.trigger_reserva_notificar() from public, anon, authenticated;
revoke execute on function public.validar_reserva() from public, anon, authenticated;


-- =====================================================================
-- 6. NOTIFICAÇÕES — fechar INSERT de cliente
--
-- "system insert notifications" tinha `with check (true)` para PUBLIC:
-- qualquer visitante (mesmo anon) injetava notificações arbitrárias.
-- Confirmado por grep (src/) que NENHUMA server action insere em
-- `notificacoes` pelo cliente — as inserções legítimas vêm de triggers
-- SECURITY DEFINER (bloco 5), que correm como owner e ignoram RLS/grants.
-- Leitura/update/delete das notificações próprias (políticas já restritas
-- a `user_id = auth.uid()`) não são tocadas.
-- =====================================================================

drop policy if exists "system insert notifications" on public.notificacoes;

revoke insert on public.notificacoes from anon;
revoke insert on public.notificacoes from authenticated;


-- =====================================================================
-- 7. SEARCH_PATH MUTÁVEL
--
-- As 3 funções acima (gerar_quotas_mes, calcular_divida_fracao,
-- obter_proximo_numero_recibo) já ficaram com search_path fixo pelo
-- create or replace dos blocos 2/3. Faltam as 2 funções de trigger
-- simples, que não precisam de mudar de corpo.
-- =====================================================================

alter function public.atualizar_timestamp_config_financeira() set search_path = public, pg_temp;
alter function public.atualizar_estado_quota_apos_pagamento() set search_path = public, pg_temp;


-- =====================================================================
-- 8. DEFAULT PRIVILEGES — evitar regressão em novas funções
--
-- Hoje, novas funções criadas em public por `postgres` (o role que corre as
-- migrations neste projeto, incluindo esta) recebem EXECUTE automático para
-- PUBLIC (default do Postgres) e para anon/authenticated (default ACL
-- configurado pelo Supabase). A partir desta migração, cada RPC nova tem de
-- receber `grant execute` explícito. service_role não é afetado.
--
-- EXCEÇÃO DOCUMENTADA: `supabase_admin` também tem default ACLs próprias
-- (audit confirmou EXECUTE automático para anon/authenticated nas suas
-- funções também), mas `ALTER DEFAULT PRIVILEGES FOR ROLE supabase_admin`
-- só pode ser executado pelo próprio `supabase_admin` (superuser) ou por
-- quem for membro dele — `postgres` (o role que aplica migrations neste
-- projeto) não o é e nunca cria objetos como esse role em uso normal.
-- Testado: tentar isto como `postgres` falha com
-- "permission denied to change default privileges". Corrigir requer sessão
-- autenticada como `supabase_admin` (SQL editor do dashboard Supabase) —
-- fora do alcance de uma migration normal. Não é um risco prático: as
-- migrations do projeto correm sempre como `postgres`, nunca como
-- `supabase_admin`.
-- =====================================================================

alter default privileges for role postgres in schema public
  revoke execute on functions from public;
alter default privileges for role postgres in schema public
  revoke execute on functions from anon;
alter default privileges for role postgres in schema public
  revoke execute on functions from authenticated;
