-- 0043_auditoria_destinatarios_comunicacao.sql
-- Completa a data de criação dos destinatários para ordenação e auditoria.

ALTER TABLE public.comunicacao_destinatarios
  ADD COLUMN IF NOT EXISTS criado_em timestamptz NOT NULL DEFAULT now();
