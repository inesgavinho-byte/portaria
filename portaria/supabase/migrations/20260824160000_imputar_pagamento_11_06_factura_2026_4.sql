-- Imputa o débito bancário de 6.360,00 EUR de 11/06/2026 à Factura 2026/4.
--
-- Decisão da administração, tomada em 24-08-2026, aplicando o critério de
-- imputação à obrigação vencida há mais tempo: em 09/06/2026 estavam por
-- liquidar a Factura 2026/4, de 26/05, e a Factura 2026/7, de 09/06, ambas de
-- 6.360,00 EUR, e o débito é imputado à mais antiga.
--
-- Natureza da informação: nenhum documento identifica a factura que o débito
-- liquidou. O débito é facto bancário; a imputação é uma inferência
-- sustentada por um critério, e fica classificada como tal — não é promovida
-- a facto documental.
--
-- O estado da despesa NÃO é alterado. A transição para `pago` exige, por
-- desenho, passagem por aprovação e um comprovativo em `despesas_documentos`;
-- forçá-la aqui contornaria um controlo existente. A factura passa a `pago`
-- pelo fluxo próprio quando o comprovativo for anexado.

-- 1. Reconciliação do movimento com a factura.
UPDATE public.movimentos_bancarios m
SET despesa_id = d.id,
    estado_reconciliacao = 'reconciliado',
    notas = COALESCE(m.notas, '') ||
      ' | Imputado à Factura 2026/4 por decisão da administração de 24-08-2026, pelo critério da obrigação vencida há mais tempo. Nenhum documento identifica a factura liquidada.',
    atualizado_em = now()
FROM public.despesas d
JOIN public.contratos c ON c.id = d.contrato_id
JOIN public.fornecedores f ON f.id = c.fornecedor_id
WHERE f.nome = 'Pinturas Verticais'
  AND d.numero_documento = '2026/4'
  AND d.tenant_id = m.tenant_id
  AND m.fornecedor_id = f.id
  AND m.data_movimento = date '2026-06-11'
  AND m.tipo = 'debito'
  AND m.confirmado
  AND m.valor_cents = d.valor_cents
  AND m.despesa_id IS NULL;

-- 2. O acontecimento de memória deixa de dizer que a factura está por
--    identificar, e passa a registar a imputação e o seu fundamento.
UPDATE public.contrato_memoria_eventos e
SET titulo = 'Pagamento bancário de 6.360 EUR imputado à Factura 2026/4',
    resumo = 'O extrato bancário confirma um débito de 6.360,00 EUR para Reinaldo Ferreira / Trabalhos Verticais em 11/06/2026. Em 09/06 estavam por liquidar as Facturas 2026/4, de 26/05, e 2026/7, de 09/06, ambas de 6.360,00 EUR, pelo que o extrato não permite, por si, identificar qual foi paga. Por decisão da administração de 24-08-2026, o débito é imputado à Factura 2026/4, por ser a obrigação vencida há mais tempo. O débito é facto bancário; a imputação é uma inferência sustentada neste critério e não uma identificação documental.',
    natureza = 'inferencia',
    despesa_id = d.id,
    atualizado_em = now()
FROM public.despesas d
JOIN public.contratos c ON c.id = d.contrato_id
JOIN public.fornecedores f ON f.id = c.fornecedor_id
WHERE e.contrato_id = c.id
  AND f.nome = 'Pinturas Verticais'
  AND d.numero_documento = '2026/4'
  AND e.tipo = 'pagamento'
  AND e.efeito = 'confirmacao_pagamento'
  AND e.titulo = 'Pagamento bancário de 6.360 EUR — factura exacta por identificar';
