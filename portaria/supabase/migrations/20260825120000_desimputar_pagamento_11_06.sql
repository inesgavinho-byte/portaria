-- Retira a imputação do débito de 11/06/2026 à Factura 2026/4.
--
-- ====================================================================
-- O QUE ESTAVA ERRADO
-- ====================================================================
-- A migração 20260824160000_imputar_pagamento_11_06_factura_2026_4 escreveu
-- nos campos estruturais do movimento bancário:
--
--   movimentos_bancarios.despesa_id          = Factura 2026/4
--   movimentos_bancarios.estado_reconciliacao = 'reconciliado'
--   contrato_memoria_eventos.despesa_id      = Factura 2026/4
--
-- O erro não é de execução: é de natureza. Essa migração escreve no seu
-- próprio texto que «nenhum documento identifica a factura que o débito
-- liquidou» e classifica o acontecimento como INFERÊNCIA. Mas depois grava a
-- inferência nos campos que só devem conter atribuição estabelecida, e marca
-- `estado_reconciliacao = 'reconciliado'` — que afirma uma correspondência
-- concluída que nenhum documento suporta.
--
-- A imputação assentava no critério da obrigação vencida há mais tempo
-- (art. 784.º CC): a 09-06-2026 estavam por liquidar a 2026/4, de 26/05, e a
-- 2026/7, de 09/06, ambas de 6.360,00 EUR, e o débito seguinte foi atribuído à
-- mais antiga. É um critério legal defensável, não uma identificação
-- documental — e está activamente disputado: a interpelação do mandatário da
-- credora, de 31-07-2026, reclama as Facturas 2026/4 e 2026/8 e omite a
-- 2026/7, ou seja, sustenta a imputação contrária.
--
-- Com as duas leituras em aberto e nenhum documento a fixar qual foi
-- liquidada, a posição canónica passa a ser a única que o processo demonstra:
--
--   MOVIMENTO -> FORNECEDOR   confirmado
--   MOVIMENTO -> FACTURA      por identificar
--
-- ====================================================================
-- O QUE NÃO MUDA
-- ====================================================================
-- O movimento não é eliminado nem reatribuído à 2026/7. Data (11/06/2026),
-- valor (6.360,00 EUR), fornecedor e `confirmado = true` mantêm-se: o débito é
-- facto bancário provado pelo extrato, e continua a contar como saída
-- confirmada do fornecedor.
--
-- Os apuramentos não se alteram, porque nenhum deles depende de qual factura
-- recebeu o pagamento:
--
--   Facturado             15.900,00 EUR  (soma das três facturas)
--   Saídas confirmadas     6.360,00 EUR  (débito confirmado do fornecedor)
--   Em aberto              9.540,00 EUR  (facturado menos saídas confirmadas)
--   Condicionado/retido    3.180,00 EUR  (Factura 2026/8, por retenção)
--
-- A única diferença é deixar de afirmar qual das facturas foi liquidada.
--
-- As evidências do acontecimento mantêm-se todas e nenhuma é criada: extrato
-- bancário de Junho 2026 (primária), email de 09-06-2026 que mostra as duas
-- facturas em aberto (corroboração) e interpelação de 31-07-2026 (contradição).
-- O papel de contradição passa a ser exacto: a carta contradiz precisamente a
-- imputação que este ficheiro retira.
--
-- ====================================================================
-- IDEMPOTÊNCIA E CHAVES
-- ====================================================================
-- Nenhum UUID gerado é usado como mecanismo de identificação. O movimento
-- localiza-se pela sua referência externa única, com a data, o valor, o tipo e
-- o fornecedor como guardas; o acontecimento localiza-se pelo contrato, pelo
-- tipo, pelo efeito e pela ligação ao próprio movimento.
--
-- Cada comando é idempotente por construção: o `WHERE` identifica a linha e o
-- `SET` fixa o estado final, pelo que correr duas vezes dá o mesmo resultado.
-- A cláusula de estado no fim de cada `WHERE` evita reescrever `atualizado_em`
-- quando já não há nada a mudar.

-- ====================================================================
-- 1. O MOVIMENTO PERDE A ATRIBUIÇÃO A UMA FACTURA
-- ====================================================================
UPDATE public.movimentos_bancarios m
SET despesa_id = NULL,
    estado_reconciliacao = 'parcial',
    notas = COALESCE(NULLIF(m.notas, ''), '') ||
      CASE WHEN COALESCE(m.notas, '') = '' THEN '' ELSE ' | ' END ||
      'Imputação à Factura 2026/4 retirada em 25-08-2026: assentava no critério ' ||
      'da obrigação vencida há mais tempo, não em identificação documental, e ' ||
      'está disputada pela interpelação de 31-07-2026, que reclama as Facturas ' ||
      '2026/4 e 2026/8 e trata a 2026/7 como liquidada. Débito confirmado no ' ||
      'extrato e atribuído ao fornecedor; factura exacta por identificar.',
    atualizado_em = now()
FROM public.fornecedores f
WHERE f.id = m.fornecedor_id
  AND f.tenant_id = m.tenant_id
  AND f.nome = 'Pinturas Verticais'
  AND m.referencia_externa = 'BANK-2026-06-11-REINALDO-2026-06-11-636000'
  AND m.data_movimento = date '2026-06-11'
  AND m.valor_cents = 636000
  AND m.tipo = 'debito'
  AND m.confirmado
  -- Só actua se houver algo por corrigir, para não tocar em `atualizado_em`
  -- numa segunda passagem.
  AND (m.despesa_id IS NOT NULL OR m.estado_reconciliacao <> 'parcial');

-- ====================================================================
-- 2. O ACONTECIMENTO DE MEMÓRIA DEIXA DE AFIRMAR A IMPUTAÇÃO
-- ====================================================================
-- Volta ao título que tinha antes de 24-08-2026 e passa de INFERÊNCIA a
-- PENDENTE: já não é uma leitura sustentada por um critério, é uma questão em
-- aberto que só um documento novo — a designação da dívida pelo devedor ou o
-- reconhecimento pela credora — pode fechar.
--
-- `movimento_id` mantém-se: a ligação ao facto bancário é o que este
-- acontecimento tem de demonstrado. `despesa_id` passa a nulo, que é a
-- afirmação correcta.
UPDATE public.contrato_memoria_eventos e
SET titulo = 'Pagamento bancário de 6.360 EUR — factura exacta por identificar',
    resumo = 'O extrato confirma o débito de 6.360,00 EUR para Pinturas Verticais; ' ||
      'como em 09/06 as Facturas 2026/4 e 2026/7, ambas do mesmo valor, estavam ' ||
      'ainda por pagar, a documentação disponível não permite determinar qual foi ' ||
      'liquidada. A imputação está disputada: a interpelação de 31-07-2026 reclama ' ||
      'as Facturas 2026/4 e 2026/8 e trata a 2026/7 como liquidada. O montante em ' ||
      'dívida é o mesmo nas duas leituras, 9.540,00 EUR; o que difere é qual das ' ||
      'facturas fica por liquidar e a partir de que data correriam juros.',
    natureza = 'pendente',
    despesa_id = NULL,
    atualizado_em = now()
FROM public.contratos c
JOIN public.fornecedores f ON f.id = c.fornecedor_id AND f.tenant_id = c.tenant_id,
     public.movimentos_bancarios m
-- A tabela alvo do UPDATE não pode ser referenciada no ON de um join do FROM,
-- pelo que a ligação `e.movimento_id = m.id` vive no WHERE.
WHERE e.contrato_id = c.id
  AND e.tenant_id = c.tenant_id
  AND f.nome = 'Pinturas Verticais'
  AND m.id = e.movimento_id
  AND m.tenant_id = e.tenant_id
  AND m.referencia_externa = 'BANK-2026-06-11-REINALDO-2026-06-11-636000'
  AND e.tipo = 'pagamento'
  AND e.efeito = 'confirmacao_pagamento'
  AND (e.despesa_id IS NOT NULL OR e.natureza <> 'pendente');
