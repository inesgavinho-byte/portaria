-- Backfill de `movimentos_bancarios.fornecedor_id` para movimentos que ainda
-- não estão reconciliados com nenhuma despesa, mas cuja contraparte bancária
-- identifica exactamente um fornecedor do mesmo tenant.
--
-- Regra deliberadamente restritiva:
--   * apenas movimentos sem fornecedor e sem despesa associada;
--   * igualdade exacta (aparadas maiúsculas/minúsculas e espaços) entre
--     `contraparte` e `fornecedores.nome` — sem fuzzy matching;
--   * apenas quando existe UM único fornecedor candidato.
--
-- É uma derivação única para materializar uma relação estrutural. A partir
-- daqui a relação canónica é `fornecedor_id`, nunca o texto da contraparte.
--
-- `despesa_id` é mantido intacto: saber a quem se pagou não é saber que
-- factura se pagou. Nenhuma reconciliação é inventada.

WITH candidatos AS (
  SELECT m.id AS movimento_id,
         (array_agg(f.id))[1] AS fornecedor_id,
         count(*) AS candidatos
  FROM public.movimentos_bancarios m
  JOIN public.fornecedores f
    ON f.tenant_id = m.tenant_id
   AND lower(btrim(f.nome)) = lower(btrim(m.contraparte))
  WHERE m.fornecedor_id IS NULL
    AND m.despesa_id IS NULL
    AND m.contraparte IS NOT NULL
    AND btrim(m.contraparte) <> ''
  GROUP BY m.id
)
UPDATE public.movimentos_bancarios m
SET fornecedor_id = c.fornecedor_id
FROM candidatos c
WHERE m.id = c.movimento_id
  AND c.candidatos = 1;
