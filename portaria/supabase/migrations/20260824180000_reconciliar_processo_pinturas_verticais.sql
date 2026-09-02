-- ⚠ SUSPENSA — NÃO APLICADA. NÃO INTEGRAR SEM REVISÃO.
--
-- Escrita em 24-08-2026 e travada no mesmo dia, antes de ser aplicada, quando
-- surgiu o histórico de comunicações da administração anterior (45 threads com
-- anexos, ainda por fornecer). Essa correspondência indica pelo menos três
-- pontos que podem corrigir as conclusões abaixo:
--
--   * existem mais orçamentos do que os dois conhecidos — 010125 (07-01-2025),
--     011225 (14-03-2025), três propostas concorrentes (30-01-2025) — pelo que
--     o "-R" de 010125-R será "revisto" e a cadeia de revisões pode reenquadrar
--     o que o 010125-ADIT é;
--   * a nomenclatura das fachadas não está fechada: há comunicação de início de
--     obras da "fachada sul" (31-07-2025), e não está estabelecido se "lateral"
--     e "empena direita" designam a mesma parede;
--   * existem comprovativos bancários e uma rectificação de IBAN e titular de
--     conta (05-09-2025) que podem explicar — ou desfazer — o conflito dos
--     titulares distintos do fornecedor.
--
-- Rever integralmente contra essas fontes antes de aplicar. O ficheiro fica
-- versionado para não se perder o trabalho de análise, não para ser executado
-- no estado em que está.

-- Reconciliação do processo Pinturas Verticais.
--
-- Constatação central: o orçamento 010125-ADIT, de 25-05-2026, não acrescenta
-- trabalho ao contrato. O seu âmbito — preparação e acessos, lavagem de alta
-- pressão, reparação de fissuras e cantarias, impermeabilização exterior,
-- tratamento e pintura de elementos metálicos, pintura geral e finalização —
-- é o mesmo do contrato 010125-R, aplicado à fachada lateral, que já constava
-- desse contrato pelo valor de 16.700 EUR.
--
-- O sufixo "ADIT" sugere aditamento, mas não existe adenda: nenhuma alteração
-- contratual assinada, nenhuma deliberação a alterar o contrato. O que o
-- documento é, materialmente, é uma reorçamentação de fase já contratada, por
-- 15.000 EUR + IVA em vez de 16.700 EUR.
--
-- Consequências que esta migration regista, sem eleger nenhuma versão como
-- verdadeira:
--   1. a fachada lateral está orçamentada duas vezes, sem adenda que
--      documente a alteração de preço;
--   2. a divergência 63.000 / 60.000 deixa de ser entre grandezas difusas e
--      passa a ser o mesmo âmbito a dois preços;
--   3. as parcelas da proposta original somam 63.400 EUR e não os 63.000 EUR
--      declarados como valor global.

-- ---------------------------------------------------------------------------
-- 1. Fachada lateral contratada e depois reorçamentada, sem adenda.
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
       timestamptz '2026-05-25 00:00:00+00',
       'conflito',
       'Fachada lateral reorçamentada sem adenda ao contrato',
       'A fachada lateral já constava do contrato 010125-R, adjudicado em 03-06-2025, pelo valor de 16.700 EUR. O orçamento 010125-ADIT, de 25-05-2026, volta a orçamentá-la por 15.000 EUR acrescidos de IVA a 6%, com o mesmo âmbito de trabalhos do contrato original. Não acrescenta trabalho: reorçamenta trabalho já contratado, 1.700 EUR abaixo. Apesar do sufixo ADIT, não existe no processo qualquer adenda ao contrato — nem alteração contratual assinada, nem deliberação que altere o contrato. Fica por resolver qual dos preços rege a fachada lateral: o contratado em 2025 ou o facturado em 2026. As três facturas emitidas seguem o segundo (6.360 + 6.360 + 3.180 = 15.900 EUR com IVA), mas a facturação não substitui, por si, o preço contratado.',
       'conflito'
FROM contrato
ON CONFLICT (tenant_id, contrato_id, data_evento, titulo) DO NOTHING;

INSERT INTO public.contrato_memoria_evidencias (evento_id, fonte_id, localizador, citacao, papel)
SELECT e.id, v.fonte_id, v.localizador, v.citacao, v.papel
FROM public.contrato_memoria_eventos e
JOIN (
  SELECT f.id AS fonte_id, f.tenant_id,
         'secção "Valores declarados na proposta"' AS localizador,
         'Fachada lateral: €16.700.' AS citacao,
         'primaria' AS papel
  FROM public.ia_documental_fontes f
  WHERE f.referencia = 'Orçamento n.º 010125-R, 07-01-2025; adjudicação assinada em 03-06-2025'
  UNION ALL
  SELECT f.id, f.tenant_id, 'orçamento 010125-ADIT, 25-05-2026',
         'Valor: 15.000,00 EUR + IVA 6%.', 'contradicao'
  FROM public.ia_documental_fontes f
  WHERE f.referencia = 'Orcamento 010125-ADIT - Rua_Professor_Ricardo_Jorge_7_Miraflores - fachada lateral.pdf'
) v ON v.tenant_id = e.tenant_id
WHERE e.titulo = 'Fachada lateral reorçamentada sem adenda ao contrato'
ON CONFLICT (evento_id, fonte_id, citacao) DO NOTHING;

-- ---------------------------------------------------------------------------
-- 2. Incoerência interna da proposta original: parcelas somam 63.400 EUR.
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
       timestamptz '2025-01-07 00:00:00+00',
       'conflito',
       'Parcelas da proposta 010125-R não somam o valor global declarado',
       'A proposta 010125-R declara um valor global de 63.000 EUR e reparte-o por fachada da frente 16.700 EUR, traseiras 30.000 EUR e lateral 16.700 EUR. As parcelas somam 63.400 EUR, 400 EUR acima do global declarado. A divergência está na transcrição indexada da proposta e deve ser confirmada contra o documento original antes de se fixar qualquer valor contratual.',
       'conflito'
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
WHERE e.titulo = 'Parcelas da proposta 010125-R não somam o valor global declarado'
ON CONFLICT (evento_id, fonte_id, citacao) DO NOTHING;

-- ---------------------------------------------------------------------------
-- 3. A divergência global passa a estar caracterizada com precisão.
-- ---------------------------------------------------------------------------
UPDATE public.contrato_memoria_eventos e
SET resumo = 'Três documentos declaram valores diferentes, mas nem todos são a mesma grandeza. A proposta 010125-R de 07-01-2025 indica 63.000 EUR e o mapa administrativo de controlo 2025/2026 indica 60.000 EUR: cobrem exactamente o mesmo âmbito — as três fachadas — a preços diferentes, com o mapa a reduzir a frente de 16.700 para 15.000 EUR e a lateral de 16.700 para 15.000 EUR, mantendo as traseiras em 30.000 EUR. É uma divergência de preço sobre o mesmo trabalho, não uma diferença de âmbito. Já os 62.000 EUR do mapa de contribuições extraordinárias são grandeza distinta: é o financiamento angariado junto dos condóminos, não o preço da empreitada, e não é comparável com os anteriores nem somável a eles. A divergência de preço permanece aberta: nenhum valor é adoptado como verdadeiro e nenhum é usado para calcular o saldo corrente da fachada lateral, apurado apenas a partir das facturas estruturadas e do débito bancário confirmado.',
    atualizado_em = now()
FROM public.contratos c, public.fornecedores f
WHERE e.contrato_id = c.id
  AND c.fornecedor_id = f.id
  AND f.nome = 'Pinturas Verticais'
  AND e.titulo = 'Divergência documental do valor global da obra';

-- ---------------------------------------------------------------------------
-- 4. Os acontecimentos de 25 e 26 de Maio deixam de ler como trabalho novo.
-- ---------------------------------------------------------------------------
UPDATE public.contrato_memoria_eventos e
SET resumo = e.resumo || ' Nota de reconciliação: esta fachada já constava do contrato 010125-R, adjudicado em 03-06-2025, por 16.700 EUR. O orçamento não acrescenta trabalho ao contrato — reorçamenta fase já contratada.',
    atualizado_em = now()
FROM public.contratos c, public.fornecedores f
WHERE e.contrato_id = c.id
  AND c.fornecedor_id = f.id
  AND f.nome = 'Pinturas Verticais'
  AND e.titulo = 'Recepção do orçamento da fachada lateral'
  AND e.resumo NOT LIKE '%Nota de reconciliação:%';

UPDATE public.contrato_memoria_eventos e
SET resumo = e.resumo || ' Nota de reconciliação: a mesma fachada já constava da adjudicação de 03-06-2025. Esta comunicação readjudica trabalho já adjudicado, a preço diferente, sem adenda ao contrato que documente a alteração.',
    atualizado_em = now()
FROM public.contratos c, public.fornecedores f
WHERE e.contrato_id = c.id
  AND c.fornecedor_id = f.id
  AND f.nome = 'Pinturas Verticais'
  AND e.titulo = 'Adjudicação da empena direita comunicada ao empreiteiro'
  AND e.resumo NOT LIKE '%Nota de reconciliação:%';

-- ---------------------------------------------------------------------------
-- 5. Notas internas do contrato: registar a constatação.
-- ---------------------------------------------------------------------------
UPDATE public.contratos c
SET notas_internas = c.notas_internas || E'\nRECONCILIAÇÃO 24-08-2026 — NATUREZA DO 010125-ADIT: o orçamento 010125-ADIT não é uma adenda. O seu âmbito coincide com o do contrato 010125-R e a fachada lateral já constava desse contrato por 16.700 EUR. Materialmente é uma reorçamentação de fase já contratada, por 15.000 EUR + IVA. Não existe no processo adenda ao contrato, alteração contratual assinada ou deliberação que altere o contrato. Em consequência: (a) a divergência 63.000/60.000 é o mesmo âmbito a dois preços, e não uma diferença de âmbito; (b) os 62.000 EUR de contribuição extraordinária são financiamento e não preço, não sendo comparáveis; (c) as parcelas da proposta original somam 63.400 EUR e não os 63.000 EUR declarados, carecendo de confirmação contra o documento original; (d) fica por decidir qual o preço que rege a fachada lateral, o contratado em 2025 ou o facturado em 2026 — a facturação não substitui por si o preço contratado.',
    atualizado_em = now()
FROM public.fornecedores f
WHERE c.fornecedor_id = f.id
  AND f.nome = 'Pinturas Verticais'
  AND c.referencia = 'Orçamento 010125-R / adjudicação 03-06-2025'
  AND c.notas_internas NOT LIKE '%RECONCILIAÇÃO 24-08-2026%';
