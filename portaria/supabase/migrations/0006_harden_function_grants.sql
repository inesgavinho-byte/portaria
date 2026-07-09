-- =====================================================================
-- Migration: 0006_harden_function_grants.sql
-- Hardening pós-advisors: funções SECURITY DEFINER não devem ser
-- executáveis por anon via /rest/v1/rpc.
--
-- Duas subtilezas do Postgres/Supabase:
--   1. Funções são criadas com EXECUTE para PUBLIC por default — anon
--      herda-o mesmo sem grant direto; é preciso revogar de PUBLIC.
--   2. Os default privileges do Supabase concedem EXECUTE diretamente
--      a anon/authenticated — é preciso revogar também de anon.
--
-- authenticated mantém EXECUTE deliberadamente: aceitar_convites é
-- chamada pelo convidado autenticado; user_tenant_ids/is_tenant_admin
-- são usadas na avaliação das políticas RLS de queries autenticadas
-- e só devolvem informação do próprio utilizador.
--
-- (No projeto real isto foi aplicado como duas entradas de histórico:
-- 0006_harden_function_grants + 0007_revoke_public_execute_rls_helpers.
-- Este ficheiro é a versão canónica consolidada.)
-- =====================================================================

revoke execute on function public.user_tenant_ids() from public, anon;
revoke execute on function public.is_tenant_admin(uuid) from public, anon;
revoke execute on function public.aceitar_convites() from public, anon;

grant execute on function public.user_tenant_ids() to authenticated;
grant execute on function public.is_tenant_admin(uuid) to authenticated;
grant execute on function public.aceitar_convites() to authenticated;
