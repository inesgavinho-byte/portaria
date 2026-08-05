-- =====================================================================
-- Migration: 0029_p1_hardening.sql
-- Correções P1 da auditoria que vivem no RLS (Fase 1).
--
-- Depende de 0028 (não obrigatório, mas conceptualmente na mesma linha).
-- NÃO aplicar em produção sem autorização (Decisão D-D).
-- Idempotente (drop policy/trigger if exists + create or replace).
--
-- Blocos:
--   1. S7  — preferência de notificações: o próprio pode alterar só a sua
--            linha e SÓ a coluna notificacoes_email.
--   2. S10 — conversas_ia_mensagens: o cliente só insere role='user'.
-- =====================================================================


-- =====================================================================
-- 1. S7 — preferência de notificações (auto-serviço, guardado por coluna)
--
-- Antes: user_tenants só tinha UPDATE para admins → um condómino recebia
-- ok:true mas 0 linhas eram atualizadas (a action nem verificava). Agora o
-- próprio pode fazer UPDATE da sua linha; um trigger impede que altere algo
-- que não seja notificacoes_email (bloqueia auto-promoção a admin, troca de
-- tenant, etc.). Admins mantêm gestão total via "admins manage memberships".
-- =====================================================================

-- Guard: em auto-serviço (utilizador autenticado não-admin), só
-- notificacoes_email pode mudar. Service role (auth.uid() null) e admins
-- passam sem restrição.
create or replace function public.guard_user_tenants_self_update()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if auth.uid() is null then
    return NEW; -- service role / execução server-side privilegiada
  end if;

  if public.is_tenant_admin(OLD.tenant_id) then
    return NEW; -- admin do tenant gere memberships
  end if;

  if NEW.user_id   is distinct from OLD.user_id
  or NEW.tenant_id is distinct from OLD.tenant_id
  or NEW.role      is distinct from OLD.role
  or NEW.fracao    is distinct from OLD.fracao
  or NEW.fracao_id is distinct from OLD.fracao_id then
    raise exception 'Só a preferência de notificações pode ser alterada.'
      using errcode = '42501';
  end if;

  return NEW;
end;
$$;

drop trigger if exists user_tenants_self_update_guard on public.user_tenants;
create trigger user_tenants_self_update_guard
  before update on public.user_tenants
  for each row
  execute function public.guard_user_tenants_self_update();

-- Política de auto-serviço: o próprio pode fazer UPDATE da sua linha.
-- A restrição de coluna é imposta pelo trigger acima.
drop policy if exists "users update own membership pref" on public.user_tenants;
create policy "users update own membership pref"
  on public.user_tenants for update
  to authenticated
  using (user_id = auth.uid())
  with check (user_id = auth.uid());


-- =====================================================================
-- 2. S10 — mensagens de IA: o cliente só insere role='user'
--
-- Antes: a política de INSERT não validava `role`, permitindo ao utilizador
-- forjar mensagens role='assistant' no seu histórico. Agora o cliente só
-- insere role='user'; as respostas do assistente são escritas pelo servidor
-- via service role (ver src/lib/actions/ia-rag.ts). Não há política de
-- UPDATE nesta tabela, logo o role não pode ser alterado depois.
-- =====================================================================

drop policy if exists "users create own messages" on public.conversas_ia_mensagens;
create policy "users create own messages"
  on public.conversas_ia_mensagens for insert
  to authenticated
  with check (
    role = 'user'
    and exists (
      select 1 from public.conversas_ia c
      where c.id = conversa_id
        and c.user_id = auth.uid()
    )
  );
