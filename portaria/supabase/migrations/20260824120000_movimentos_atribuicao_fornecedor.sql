-- Estado de triagem da atribuição MOVIMENTO → FORNECEDOR.
--
-- `fornecedor_id` responde "de quem é este movimento". Faltava responder
-- "já foi decidido?": sem essa distinção, um débito de Taxa Social Única ou
-- de imposto do selo — que nunca terá fornecedor — fica indistinguível de um
-- movimento por triar, e a fila de trabalho nunca fecha.
--
-- Três estados derivados, sem coluna redundante:
--   atribuído     → fornecedor_id IS NOT NULL
--   não aplicável → fornecedor_nao_aplicavel
--   pendente      → nenhum dos anteriores

ALTER TABLE public.movimentos_bancarios
  ADD COLUMN IF NOT EXISTS fornecedor_nao_aplicavel boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS fornecedor_atribuido_em timestamptz,
  ADD COLUMN IF NOT EXISTS fornecedor_atribuido_por uuid;

ALTER TABLE public.movimentos_bancarios
  DROP CONSTRAINT IF EXISTS movimentos_bancarios_atribuido_por_fkey;
ALTER TABLE public.movimentos_bancarios
  ADD CONSTRAINT movimentos_bancarios_atribuido_por_fkey
  FOREIGN KEY (fornecedor_atribuido_por) REFERENCES auth.users(id) ON DELETE SET NULL;

-- Um movimento não pode estar simultaneamente atribuído e marcado como sem
-- fornecedor: os dois estados são mutuamente exclusivos por definição.
ALTER TABLE public.movimentos_bancarios
  DROP CONSTRAINT IF EXISTS movimentos_bancarios_atribuicao_exclusiva;
ALTER TABLE public.movimentos_bancarios
  ADD CONSTRAINT movimentos_bancarios_atribuicao_exclusiva
  CHECK (NOT (fornecedor_id IS NOT NULL AND fornecedor_nao_aplicavel));

-- Índice da fila de triagem: só as linhas por decidir.
CREATE INDEX IF NOT EXISTS idx_movimentos_bancarios_atribuicao_pendente
  ON public.movimentos_bancarios (tenant_id, data_movimento DESC)
  WHERE fornecedor_id IS NULL AND NOT fornecedor_nao_aplicavel;

COMMENT ON COLUMN public.movimentos_bancarios.fornecedor_nao_aplicavel IS
  'Decidido que o movimento não tem fornecedor (encargo estatal, comissão bancária, transferência a condómino). Retira-o da fila de triagem sem lhe inventar um fornecedor.';
COMMENT ON COLUMN public.movimentos_bancarios.fornecedor_atribuido_em IS
  'Momento da última decisão de atribuição. A atribuição altera KPIs financeiros, por isso fica registada.';
COMMENT ON COLUMN public.movimentos_bancarios.fornecedor_atribuido_por IS
  'Autor da última decisão de atribuição.';

-- Marca como decidido o que o backfill estrutural já resolveu, para que a
-- fila de triagem comece a reflectir apenas trabalho real por fazer.
UPDATE public.movimentos_bancarios
SET fornecedor_atribuido_em = COALESCE(fornecedor_atribuido_em, atualizado_em)
WHERE fornecedor_id IS NOT NULL
  AND fornecedor_atribuido_em IS NULL;

-- RLS inalterada: as policies existentes são tenant-scoped e cobrem as novas
-- colunas. Sem novos grants, sem SECURITY DEFINER, sem auth.role().
