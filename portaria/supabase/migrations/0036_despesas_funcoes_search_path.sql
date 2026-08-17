-- =============================================================================
-- Migration 0036: Fixar search_path das funções de despesas e obrigações
-- =============================================================================
-- Elimina a resolução dinâmica de objetos nas funções de trigger criadas em 0035.

ALTER FUNCTION public.atualizar_timestamp_despesas_obrigacoes()
  SET search_path = public, pg_temp;

ALTER FUNCTION public.validar_tenant_despesa()
  SET search_path = public, pg_temp;

ALTER FUNCTION public.validar_tenant_documento_despesa()
  SET search_path = public, pg_temp;
