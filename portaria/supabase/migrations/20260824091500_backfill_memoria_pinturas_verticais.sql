-- Backfill de dados para a relação Pinturas Verticais / Edifício Europa.
--
-- Duas partes:
--   1. materializar as ligações estruturais entre a memória da contratação e
--      os objectos financeiros que ela já descreve em texto;
--   2. criar os acontecimentos de memória que só existiam nas fontes
--      documentais e sem os quais a cronologia da relação fica incoerente
--      (proposta original de 2025, pagamentos históricos declarados no mapa
--      administrativo e divergência do valor global da obra).
--
-- Nenhum facto é criado sem evidência: cada evento novo cita uma fonte real
-- já indexada em `ia_documental_fontes`.
--
-- Todas as referências usam chaves naturais (nome do fornecedor, referência
-- do contrato, número de documento, referência da fonte) — nenhum UUID gerado
-- é fixado no ficheiro. Idempotente: reexecutável sem duplicar.

-- ---------------------------------------------------------------------------
-- 1a. Eventos de factura → despesa correspondente (chave: número de documento)
-- ---------------------------------------------------------------------------
WITH pares AS (
  SELECT e.id AS evento_id,
         (array_agg(d.id))[1] AS despesa_id,
         count(*) AS candidatos
  FROM public.contrato_memoria_eventos e
  JOIN public.despesas d
    ON d.tenant_id = e.tenant_id
   AND d.contrato_id = e.contrato_id
   AND d.numero_documento IS NOT NULL
   AND strpos(e.titulo, d.numero_documento) > 0
  WHERE e.tipo = 'fatura'
    AND e.despesa_id IS NULL
  GROUP BY e.id
)
UPDATE public.contrato_memoria_eventos e
SET despesa_id = p.despesa_id,
    efeito = COALESCE(e.efeito, 'emissao'),
    valor_cents = COALESCE(e.valor_cents, d.valor_cents)
FROM pares p
JOIN public.despesas d ON d.id = p.despesa_id
WHERE e.id = p.evento_id
  AND p.candidatos = 1;

-- ---------------------------------------------------------------------------
-- 1b. Evento de pagamento cuja evidência primária é um extracto bancário →
--     movimento bancário do mesmo fornecedor e da mesma data.
--     A ligação é sustentada pela evidência já registada no evento, não por
--     coincidência de valores.
-- ---------------------------------------------------------------------------
WITH eventos_com_extrato AS (
  SELECT DISTINCT e.id AS evento_id,
         e.tenant_id,
         c.fornecedor_id,
         (e.data_evento AT TIME ZONE 'UTC')::date AS dia
  FROM public.contrato_memoria_eventos e
  JOIN public.contratos c ON c.id = e.contrato_id
  JOIN public.contrato_memoria_evidencias ev ON ev.evento_id = e.id AND ev.papel = 'primaria'
  JOIN public.ia_documental_fontes f ON f.id = ev.fonte_id
  WHERE e.tipo = 'pagamento'
    AND e.movimento_id IS NULL
    AND c.fornecedor_id IS NOT NULL
    AND f.referencia LIKE 'Extrato de %'
), pares AS (
  SELECT x.evento_id,
         (array_agg(m.id))[1] AS movimento_id,
         count(*) AS candidatos
  FROM eventos_com_extrato x
  JOIN public.movimentos_bancarios m
    ON m.tenant_id = x.tenant_id
   AND m.fornecedor_id = x.fornecedor_id
   AND m.data_movimento = x.dia
   AND m.tipo = 'debito'
   AND m.confirmado
  GROUP BY x.evento_id
)
UPDATE public.contrato_memoria_eventos e
SET movimento_id = p.movimento_id,
    efeito = COALESCE(e.efeito, 'confirmacao_pagamento'),
    valor_cents = COALESCE(e.valor_cents, m.valor_cents)
FROM pares p
JOIN public.movimentos_bancarios m ON m.id = p.movimento_id
WHERE e.id = p.evento_id
  AND p.candidatos = 1;

-- ---------------------------------------------------------------------------
-- 1c. Decisões que suspendem ou retêm o pagamento de uma factura concreta.
--     O efeito é o que permite classificar o saldo como condicionado sem
--     interpretar texto livre na interface.
-- ---------------------------------------------------------------------------
UPDATE public.contrato_memoria_eventos e
SET despesa_id = d.id,
    efeito = 'suspensao'
FROM public.despesas d,
     public.contratos c,
     public.fornecedores f
WHERE e.contrato_id = c.id
  AND c.fornecedor_id = f.id
  AND f.nome = 'Pinturas Verticais'
  AND d.contrato_id = c.id
  AND d.numero_documento = '2026/4'
  AND e.tipo = 'decisao'
  AND e.titulo = 'Pagamento suspenso até esclarecimento da legitimidade'
  AND e.efeito IS NULL;

UPDATE public.contrato_memoria_eventos e
SET despesa_id = d.id,
    efeito = 'retencao'
FROM public.despesas d,
     public.contratos c,
     public.fornecedores f
WHERE e.contrato_id = c.id
  AND c.fornecedor_id = f.id
  AND f.nome = 'Pinturas Verticais'
  AND d.contrato_id = c.id
  AND d.numero_documento = '2026/8'
  AND e.tipo = 'decisao'
  AND e.titulo = 'Assembleia determina retenção do pagamento final até entrega da obra'
  AND e.efeito IS NULL;

-- ---------------------------------------------------------------------------
-- 2a. Proposta original de 07-01-2025 (orçamento 010125-R)
-- ---------------------------------------------------------------------------
WITH contrato AS (
  SELECT c.id, c.tenant_id
  FROM public.contratos c
  JOIN public.fornecedores f ON f.id = c.fornecedor_id
  WHERE f.nome = 'Pinturas Verticais'
    AND c.referencia = 'Orçamento 010125-R / adjudicação 03-06-2025'
)
INSERT INTO public.contrato_memoria_eventos
  (tenant_id, contrato_id, data_evento, tipo, titulo, resumo, natureza, valor_cents)
SELECT contrato.tenant_id,
       contrato.id,
       timestamptz '2025-01-07 00:00:00+00',
       'proposta',
       'Proposta 010125-R para reabilitação e pintura das fachadas',
       'A proposta 010125-R, de 07-01-2025, apresenta a reabilitação, impermeabilização e pintura do edifício com valor global declarado de 63.000 EUR (frente 16.700 EUR, traseiras 30.000 EUR, lateral 16.700 EUR), IVA a acrescer, pagamento em 40% na adjudicação, 40% a meio e 20% na conclusão, prazo expectável de 45 dias e garantia de 5 anos. A adjudicação foi assinada em 03-06-2025. O próprio documento contém uma inconsistência interna de data de início (01-06-2025 na primeira página, 01-09-2025 na secção de prazos).',
       'facto',
       6300000
FROM contrato
ON CONFLICT (tenant_id, contrato_id, data_evento, titulo) DO NOTHING;

INSERT INTO public.contrato_memoria_evidencias (evento_id, fonte_id, localizador, citacao, papel)
SELECT e.id, f.id, 'secção "Valores declarados na proposta"',
       'Valor global: €63.000 — frente €16.700, traseiras €30.000, lateral €16.700.',
       'primaria'
FROM public.contrato_memoria_eventos e
JOIN public.ia_documental_fontes f
  ON f.tenant_id = e.tenant_id
 AND f.referencia = 'Orçamento n.º 010125-R, 07-01-2025; adjudicação assinada em 03-06-2025'
WHERE e.titulo = 'Proposta 010125-R para reabilitação e pintura das fachadas'
ON CONFLICT (evento_id, fonte_id, citacao) DO NOTHING;

-- ---------------------------------------------------------------------------
-- 2b. Pagamentos históricos declarados no mapa administrativo 2025/2026.
--     São declarações documentais, não movimentos bancários primários:
--     `movimento_id` fica nulo e a natureza é `pendente` (por confirmar no
--     banco). Nunca entram em "saídas confirmadas".
-- ---------------------------------------------------------------------------
WITH contrato AS (
  SELECT c.id, c.tenant_id
  FROM public.contratos c
  JOIN public.fornecedores f ON f.id = c.fornecedor_id
  WHERE f.nome = 'Pinturas Verticais'
    AND c.referencia = 'Orçamento 010125-R / adjudicação 03-06-2025'
), pagamentos (ordem, dia, valor_cents, valor_texto) AS (
  VALUES (1, date '2025-09-05', 1200000, '12.000,00'),
         (2, date '2025-10-20', 1200000, '12.000,00'),
         (3, date '2025-10-20',  200000, '2.000,00'),
         (4, date '2025-11-14',  400000, '4.000,00'),
         (5, date '2025-12-09',  600000, '6.000,00'),
         (6, date '2025-12-09',  600000, '6.000,00'),
         (7, date '2026-02-24',  300000, '3.000,00')
)
INSERT INTO public.contrato_memoria_eventos
  (tenant_id, contrato_id, data_evento, tipo, titulo, resumo, natureza, valor_cents)
SELECT contrato.tenant_id,
       contrato.id,
       (p.dia::timestamp AT TIME ZONE 'UTC'),
       'pagamento',
       format('Pagamento histórico declarado no mapa administrativo (n.º %s)', p.ordem),
       format(
         'O mapa administrativo de controlo 2025/2026 declara um pagamento de %s EUR em %s, relativo aos trabalhos das fachadas da frente e das traseiras. Trata-se de mapa administrativo e não de extracto bancário: o pagamento permanece por confirmar em prova bancária primária e não entra em saídas bancárias confirmadas. O mesmo mapa associa os pagamentos históricos a titulares de conta distintos da sociedade fornecedora.',
         p.valor_texto,
         to_char(p.dia, 'DD-MM-YYYY')
       ),
       'pendente',
       p.valor_cents
FROM contrato, pagamentos p
ON CONFLICT (tenant_id, contrato_id, data_evento, titulo) DO NOTHING;

WITH pagamentos (dia, valor_cents, valor_texto) AS (
  VALUES (date '2025-09-05', 1200000, '12.000,00'),
         (date '2025-10-20', 1200000, '12.000,00'),
         (date '2025-10-20',  200000, '2.000,00'),
         (date '2025-11-14',  400000, '4.000,00'),
         (date '2025-12-09',  600000, '6.000,00'),
         (date '2026-02-24',  300000, '3.000,00')
)
INSERT INTO public.contrato_memoria_evidencias (evento_id, fonte_id, localizador, citacao, papel)
SELECT e.id, f.id, 'mapa 2025/2026, quadro de pagamentos',
       format('Pagamento declarado de %s EUR em %s.', p.valor_texto, to_char(p.dia, 'DD-MM-YYYY')),
       'primaria'
FROM public.contrato_memoria_eventos e
JOIN public.ia_documental_fontes f
  ON f.tenant_id = e.tenant_id
 AND f.referencia = 'Mapa de pagamentos_2025_2026.pdf'
JOIN pagamentos p
  ON p.dia = (e.data_evento AT TIME ZONE 'UTC')::date
 AND p.valor_cents = e.valor_cents
WHERE e.tipo = 'pagamento'
  AND e.titulo LIKE 'Pagamento histórico declarado no mapa administrativo%'
ON CONFLICT (evento_id, fonte_id, citacao) DO NOTHING;

-- ---------------------------------------------------------------------------
-- 2c. Divergência documental do valor global (63.000 / 60.000 / 62.000).
--     Registada como conflito: nenhum valor é eleito vencedor, os valores não
--     são somados e nenhum deles é usado para calcular o saldo corrente.
-- ---------------------------------------------------------------------------
WITH contrato AS (
  SELECT c.id, c.tenant_id
  FROM public.contratos c
  JOIN public.fornecedores f ON f.id = c.fornecedor_id
  WHERE f.nome = 'Pinturas Verticais'
    AND c.referencia = 'Orçamento 010125-R / adjudicação 03-06-2025'
)
INSERT INTO public.contrato_memoria_eventos
  (tenant_id, contrato_id, data_evento, tipo, titulo, resumo, natureza)
SELECT contrato.tenant_id,
       contrato.id,
       timestamptz '2026-05-15 00:00:00+00',
       'conflito',
       'Divergência documental do valor global da obra',
       'Três documentos declaram bases de valor diferentes para a mesma obra: a proposta 010125-R de 07-01-2025 indica 63.000 EUR; o mapa administrativo de controlo 2025/2026 indica 60.000 EUR de valor total adjudicado; e o mapa de contribuições extraordinárias da administração cessante indica 62.000 EUR de contribuição extraordinária do condomínio. São grandezas de natureza diferente e não são somáveis. A divergência permanece aberta: nenhum destes valores é adoptado como valor verdadeiro nem é usado para calcular o saldo corrente da fachada lateral, que é apurado apenas a partir das facturas estruturadas e do débito bancário confirmado.',
       'conflito'
FROM contrato
ON CONFLICT (tenant_id, contrato_id, data_evento, titulo) DO NOTHING;

INSERT INTO public.contrato_memoria_evidencias (evento_id, fonte_id, localizador, citacao, papel)
SELECT e.id, v.fonte_id, v.localizador, v.citacao, v.papel
FROM public.contrato_memoria_eventos e
JOIN (
  SELECT f.id AS fonte_id, f.tenant_id,
         'secção "Valores declarados na proposta"' AS localizador,
         'Valor global: €63.000.' AS citacao,
         'primaria' AS papel
  FROM public.ia_documental_fontes f
  WHERE f.referencia = 'Orçamento n.º 010125-R, 07-01-2025; adjudicação assinada em 03-06-2025'
  UNION ALL
  SELECT f.id, f.tenant_id, 'mapa 2025/2026, quadro-resumo',
         'Valor total da obra indicado: 60.000 EUR.', 'contradicao'
  FROM public.ia_documental_fontes f
  WHERE f.referencia = 'Mapa de pagamentos_2025_2026.pdf'
  UNION ALL
  SELECT f.id, f.tenant_id, 'mapa de contribuições extraordinárias',
         'Total da contribuição extraordinária: 62.000,00 EUR.', 'contradicao'
  FROM public.ia_documental_fontes f
  WHERE f.referencia = 'Mapa de controlo de pagamentos de obras 2026'
) v ON v.tenant_id = e.tenant_id
WHERE e.titulo = 'Divergência documental do valor global da obra'
ON CONFLICT (evento_id, fonte_id, citacao) DO NOTHING;
