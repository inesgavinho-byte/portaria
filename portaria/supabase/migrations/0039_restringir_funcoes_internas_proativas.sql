-- =============================================================================
-- Migration 0039: Restringir funções internas do módulo proativo
-- =============================================================================
-- Estas funções são acionadas por triggers ou pela rotina diária e não devem ser
-- expostas como RPC para utilizadores anon ou autenticados.

REVOKE ALL ON FUNCTION public.validar_transicao_despesa() FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.registar_historico_estado_despesa() FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.atualizar_timestamp_manutencao() FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.validar_tenant_manutencao() FROM PUBLIC, anon, authenticated;
