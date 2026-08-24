-- Estrutura o valor da proposta da fachada lateral no próprio evento de
-- memória, em vez de o extrair por expressão regular sobre o markdown da
-- fonte documental.
--
-- O evento já cita a proposta 010125-ADIT: "TOTAL 15.000,00; ao valor
-- apresentado acresce IVA, à taxa legal de 6%." O valor guardado é
-- 15.000,00 + IVA 6% = 15.900,00 EUR, com IVA incluído, para ser directamente
-- comparável com o total facturado — que é sempre com IVA.
--
-- Não introduz nenhum facto novo: apenas move para uma coluna o que a
-- evidência já sustentava.

UPDATE public.contrato_memoria_eventos e
SET valor_cents = 1590000
FROM public.contratos c,
     public.fornecedores f
WHERE e.contrato_id = c.id
  AND c.fornecedor_id = f.id
  AND f.nome = 'Pinturas Verticais'
  AND c.referencia = 'Orçamento 010125-R / adjudicação 03-06-2025'
  AND e.tipo = 'proposta'
  AND e.titulo = 'Recepção do orçamento da fachada lateral'
  AND e.valor_cents IS NULL;
