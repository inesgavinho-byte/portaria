-- =====================================================================
-- Migration: 20260824175000_contratos_notas_internas.sql
-- Correcção da cadeia de migrações: a coluna que faltava.
--
-- =====================================================================
-- O PROBLEMA
-- =====================================================================
-- A 20260824180000_reconciliar_processo_pinturas_verticais.sql faz UPDATE a
-- `public.contratos.notas_internas`, mas NENHUMA migração cria a coluna.
-- Em produção ela existe (criada fora da cadeia versionada), pelo que a
-- migração lá passou; numa reconstrução limpa (init local do CLI, CI) a
-- cadeia rebenta com SQLSTATE 42703 — é o CI vermelho do main desde o
-- merge do PR #97.
--
-- O ficheiro corre com timestamp anterior à 180000 para a ordem lexicográfica
-- da cadeia garantir que a coluna existe antes do primeiro uso. Idempotente:
-- IF NOT EXISTS, um no-op puro onde a coluna já existe (produção).
-- =====================================================================

alter table public.contratos
  add column if not exists notas_internas text;

comment on column public.contratos.notas_internas is
  'Notas internas do contrato: constatações e reconciliações registadas '
  || 'pela administração (append-only por convenção).';
