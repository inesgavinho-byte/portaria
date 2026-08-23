-- Liga a memória da contratação aos objectos financeiros por ID, para que a
-- cronologia unificada do fornecedor possa deduplicar e classificar sem
-- qualquer correspondência textual.
--
-- Sem estas colunas, "Factura 2026/4 emitida" (memória) e "Despesa 2026/4
-- registada" (despesas) são o mesmo acontecimento sem relação estrutural, e a
-- única alternativa de dedupe seria coincidência de data+valor — insegura.

-- Chaves alternativas para FKs compostas que preservam isolamento de tenant.
ALTER TABLE public.despesas
  DROP CONSTRAINT IF EXISTS despesas_tenant_id_id_key;
ALTER TABLE public.despesas
  ADD CONSTRAINT despesas_tenant_id_id_key UNIQUE (tenant_id, id);

ALTER TABLE public.movimentos_bancarios
  DROP CONSTRAINT IF EXISTS movimentos_bancarios_tenant_id_id_key;
ALTER TABLE public.movimentos_bancarios
  ADD CONSTRAINT movimentos_bancarios_tenant_id_id_key UNIQUE (tenant_id, id);

ALTER TABLE public.contrato_memoria_eventos
  ADD COLUMN IF NOT EXISTS valor_cents integer,
  ADD COLUMN IF NOT EXISTS despesa_id uuid,
  ADD COLUMN IF NOT EXISTS movimento_id uuid,
  ADD COLUMN IF NOT EXISTS efeito text;

ALTER TABLE public.contrato_memoria_eventos
  DROP CONSTRAINT IF EXISTS contrato_memoria_eventos_valor_cents_check;
ALTER TABLE public.contrato_memoria_eventos
  ADD CONSTRAINT contrato_memoria_eventos_valor_cents_check
  CHECK (valor_cents IS NULL OR valor_cents >= 0);

ALTER TABLE public.contrato_memoria_eventos
  DROP CONSTRAINT IF EXISTS contrato_memoria_eventos_efeito_check;
ALTER TABLE public.contrato_memoria_eventos
  ADD CONSTRAINT contrato_memoria_eventos_efeito_check
  CHECK (efeito IS NULL OR efeito IN ('emissao', 'confirmacao_pagamento', 'retencao', 'suspensao'));

ALTER TABLE public.contrato_memoria_eventos
  DROP CONSTRAINT IF EXISTS contrato_memoria_eventos_despesa_fkey;
ALTER TABLE public.contrato_memoria_eventos
  ADD CONSTRAINT contrato_memoria_eventos_despesa_fkey
  FOREIGN KEY (tenant_id, despesa_id)
  REFERENCES public.despesas (tenant_id, id)
  ON DELETE SET NULL (despesa_id);

ALTER TABLE public.contrato_memoria_eventos
  DROP CONSTRAINT IF EXISTS contrato_memoria_eventos_movimento_fkey;
ALTER TABLE public.contrato_memoria_eventos
  ADD CONSTRAINT contrato_memoria_eventos_movimento_fkey
  FOREIGN KEY (tenant_id, movimento_id)
  REFERENCES public.movimentos_bancarios (tenant_id, id)
  ON DELETE SET NULL (movimento_id);

CREATE INDEX IF NOT EXISTS contrato_memoria_eventos_despesa_idx
  ON public.contrato_memoria_eventos (despesa_id) WHERE despesa_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS contrato_memoria_eventos_movimento_idx
  ON public.contrato_memoria_eventos (movimento_id) WHERE movimento_id IS NOT NULL;

COMMENT ON COLUMN public.contrato_memoria_eventos.valor_cents IS
  'Valor associado ao acontecimento, quando o próprio documento o declara (ex.: pagamento histórico declarado num mapa administrativo). Não é prova bancária.';
COMMENT ON COLUMN public.contrato_memoria_eventos.despesa_id IS
  'Despesa/factura a que o acontecimento se refere. Permite deduplicar memória e despesa sem matching textual.';
COMMENT ON COLUMN public.contrato_memoria_eventos.movimento_id IS
  'Movimento bancário a que o acontecimento se refere. Um pagamento declarado (sem prova bancária) mantém este campo nulo.';
COMMENT ON COLUMN public.contrato_memoria_eventos.efeito IS
  'Efeito do acontecimento sobre o objecto financeiro ligado: emissao, confirmacao_pagamento, retencao ou suspensao.';
