-- Torna estrutural a relação MOVIMENTO BANCÁRIO → FORNECEDOR.
--
-- Antes desta migration a única ligação de um movimento à sua contraparte era
-- `despesa_id` (movimento → factura). Um débito confirmado no extrato cuja
-- factura exacta ainda não está reconciliada ficava, por isso, sem qualquer
-- relação com o fornecedor: a ficha do fornecedor não o via e os KPIs davam
-- "saídas confirmadas = 0" mesmo com prova bancária primária.
--
-- MOVIMENTO → FORNECEDOR e MOVIMENTO → FACTURA são relações distintas.
-- A primeira é frequentemente conhecida quando a segunda ainda não está;
-- passam a poder ser registadas de forma independente.

-- Chave alternativa necessária para uma FK composta que preserve isolamento
-- de tenant (impede apontar um movimento para um fornecedor de outro tenant).
ALTER TABLE public.fornecedores
  DROP CONSTRAINT IF EXISTS fornecedores_tenant_id_id_key;
ALTER TABLE public.fornecedores
  ADD CONSTRAINT fornecedores_tenant_id_id_key UNIQUE (tenant_id, id);

ALTER TABLE public.movimentos_bancarios
  ADD COLUMN IF NOT EXISTS fornecedor_id uuid;

ALTER TABLE public.movimentos_bancarios
  DROP CONSTRAINT IF EXISTS movimentos_bancarios_fornecedor_fkey;
ALTER TABLE public.movimentos_bancarios
  ADD CONSTRAINT movimentos_bancarios_fornecedor_fkey
  FOREIGN KEY (tenant_id, fornecedor_id)
  REFERENCES public.fornecedores (tenant_id, id)
  ON DELETE SET NULL (fornecedor_id);

CREATE INDEX IF NOT EXISTS idx_movimentos_bancarios_fornecedor
  ON public.movimentos_bancarios (fornecedor_id, data_movimento DESC)
  WHERE fornecedor_id IS NOT NULL;

COMMENT ON COLUMN public.movimentos_bancarios.fornecedor_id IS
  'Fornecedor a quem o movimento pertence. Independente de despesa_id: um movimento pode ter fornecedor conhecido e factura ainda por identificar.';

-- Backfill determinístico: movimentos já reconciliados com uma despesa herdam
-- o fornecedor dessa despesa. Nenhuma inferência envolvida.
UPDATE public.movimentos_bancarios m
SET fornecedor_id = d.fornecedor_id
FROM public.despesas d
WHERE m.despesa_id = d.id
  AND d.tenant_id = m.tenant_id
  AND d.fornecedor_id IS NOT NULL
  AND m.fornecedor_id IS NULL;

-- RLS inalterada: as policies existentes de movimentos_bancarios são
-- tenant-scoped e continuam a cobrir a nova coluna. Sem novos grants, sem
-- SECURITY DEFINER, sem auth.role().
