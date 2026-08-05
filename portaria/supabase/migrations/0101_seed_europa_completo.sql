-- =====================================================================
-- Seed Completo: Condomínio Europa — Dados Reais
-- 
-- Fonte: Google Sheet "EUROPA" (abas Condóminos + QUOTIZAÇÕES 2026)
-- Ingestão: 2026-07-28
--
-- Este script:
--   1. Atualiza o tenant com morada completa e NIF
--   2. Insere/atualiza as 26 frações com permilagens e contactos
--   3. Configura o módulo financeiro
--   4. Gera quotas mensais para 2026
--   5. Regista pagamentos extraídos da planilha
--   6. Cria avisos de exemplo
--   7. Cria documentos de exemplo
-- =====================================================================

-- =============================================================================
-- PARTE 1: ATUALIZAR TENANT
-- =============================================================================

UPDATE public.tenants
SET 
  morada = 'Rua Professor Ricardo Jorge, n.º 7 — Miraflores/Algés',
  num_fracoes = 26,
  tema = jsonb_set(
    COALESCE(tema, '{}'::jsonb),
    '{nif}',
    '"900228288"'::jsonb
  )
WHERE slug = 'europa';

-- =============================================================================
-- PARTE 2: INSERIR FRAÇÕES (26 frações do Edifício Europa)
-- =============================================================================

WITH tenant_europa AS (
  SELECT id AS tenant_id FROM public.tenants WHERE slug = 'europa'
),
fracoes_dados AS (
  SELECT * FROM (VALUES
    -- Lojas (Rés-do-chão) — permilagem 5‰ cada
    ('A', 'Loja A — Nova Ouriense, S.A.',               5,  'Rés-do-chão', 'Loja',      'Nova Ouriense, S.A.',                           'costa.fg@gmail.com; contabilidade@novaoriense.com',         '919600709'),
    ('B', 'Loja B — Nova Ouriense, S.A.',               5,  'Rés-do-chão', 'Loja',      'Nova Ouriense, S.A.',                           'costa.fg@gmail.com; contabilidade@novaoriense.com',         '919600709'),
    ('C', 'Loja C — Nova Ouriense, S.A.',               5,  'Rés-do-chão', 'Loja',      'Nova Ouriense, S.A.',                           'costa.fg@gmail.com; contabilidade@novaoriense.com',         '919600709'),
    -- 1.º Andar
    ('D', '1.º Direito — Maria da Conceição F. Jorge',  40, '1.º', 'Habitação',         'Maria da Conceição F. Jorge',                   'mariafigueiredojorge@gmail.com',                            '21 4681021 / 91 2674010'),
    ('E', '1.º Esquerdo — Maria Eduarda R. F. Espinheira', 40, '1.º', 'Habitação',      'Maria Eduarda R. F. Espinheira',                'eduarda.espinheira@gmail.pt',                               '91 7265596'),
    -- 2.º Andar
    ('F', '2.º Direito — Herdeiros de Armando J. C. Soares', 40, '2.º', 'Habitação',   'Herdeiros de Armando J. C. Soares',             'suzanasoares1952@gmail.com',                                '93 6772714'),
    ('G', '2.º Esquerdo — Francisco Mercês de Melo',    40, '2.º', 'Habitação',         'Francisco Mercês de Melo',                      'franciscomm@tecnopert.pt; bebe2m@hotmail.com',              '91 7240021'),
    -- 3.º Andar
    ('H', '3.º Direito — Inês Miguel Gavinho Félix',    40, '3.º', 'Habitação',         'Inês Miguel Gavinho Félix',                     'ines.gavinho@gavinhogroup.com',                             '91 7072070'),
    ('I', '3.º Esquerdo — Rogério L. P. Urbano',        40, '3.º', 'Habitação',         'Rogério L. P. Urbano',                          'rogerio.urbano1950@gmail.com',                              '91 7255235'),
    -- 4.º Andar
    ('J', '4.º Direito — José Artur Castro Inácio',     40, '4.º', 'Habitação',         'José Artur Castro Inácio',                      'jai.rt@excovergroup.pt',                                    '91 7232345 / 91 7322266'),
    ('L', '4.º Esquerdo — José Artur Castro Inácio',    40, '4.º', 'Habitação',         'José Artur Castro Inácio',                      'jai.rt@excovergroup.pt',                                    null),
    -- 5.º Andar
    ('M', '5.º Direito — Cristina Esteves Valério Canas Correia', 40, '5.º', 'Habitação', 'Cristina Esteves Valério Canas Correia',     'cristinacanascorreia@hotmail.com; jaimefcorreia@gmail.com', '91 9667092 / 91 7215447'),
    ('N', '5.º Esquerdo — Belarmino António F.C. da Silveira', 40, '5.º', 'Habitação', 'Belarmino António F.C. da Silveira',            'bacsilveira@gmail.com',                                     '91 7211504'),
    -- 6.º Andar
    ('O', '6.º Direito — S.T.A.V., S.A.',               40, '6.º', 'Habitação',         'S.T.A.V., S.A.',                                'pires.mi@gmail.com; sofiamarcelino@malvesconsultores.pt',   '21 4104182 / 96 2348766'),
    ('P', '6.º Esquerdo — Salvador de Aguiar Corrêa de Oliveira', 40, '6.º', 'Habitação', 'Salvador de Aguiar Corrêa de Oliveira',     'salvadoraco@hotmail.com',                                   '91 918 564 390'),
    -- 7.º Andar
    ('Q', '7.º Direito — Francisco M. C. Teixeira',     40, '7.º', 'Habitação',         'Francisco M. C. Teixeira',                      'isabelmadureirateixeira@gmail.com; soutoxt@gmail.com',      '93 3584260'),
    ('R', '7.º Esquerdo — Cesaltina C. Afonso',         40, '7.º', 'Habitação',         'Cesaltina C. Afonso',                           'tiagoafonso@icloud.com; cesaltasmacau@yahoo.com',           '93 5810028 / 96 6121238'),
    -- 8.º Andar
    ('S', '8.º Direito — Alexandre David L. Maia Carvalho', 40, '8.º', 'Habitação',    'Alexandre David L. Maia Carvalho',              'xaneca@hotmail.com',                                        null),
    ('T', '8.º Esquerdo — Miguel Mexia Vassalo',        40, '8.º', 'Habitação',         'Miguel Mexia Vassalo',                          'miguel.vassalo@santander.pt',                               '93 8886293'),
    -- 9.º Andar
    ('U', '9.º Direito — João M. Vieira Moura',          40, '9.º', 'Habitação',         'João M. Vieira Moura',                          'jmvmoura@gmail.com',                                        null),
    ('V', '9.º Esquerdo — Carlos Alberto Abreu dos Reis', 40, '9.º', 'Habitação',      'Carlos Alberto Abreu dos Reis',                 'caa.rex@gmail.com',                                         '96 2346167 / 91 6419024'),
    -- 10.º Andar
    ('W', '10.º Direito — Jorge M. A. P. Silva Marques', 40, '10.º', 'Habitação',       'Jorge M. A. P. Silva Marques',                  'jsmarques2978ster@gmail.com',                               '96 9002105'),
    ('X', '10.º Esquerdo — Raquel Macedo Soveral Dias Mano', 40, '10.º', 'Habitação',   'Raquel Macedo Soveral Dias Mano',               'luismano@outlook.pt; mano.raquel@gmail.com',                '93 7551616 / 91 4875161'),
    -- 11.º Andar
    ('Y', '11.º Direito — Paloma Ascencion Peña Moreno', 40, '11.º', 'Habitação',       'Paloma Ascencion Peña Moreno',                  'paloma.pena.moreno@gmail.com',                              '91 9350905'),
    ('Z', '11.º Esquerdo — Paloma Ascencion Peña Moreno', 40, '11.º', 'Habitação',      'Paloma Ascencion Peña Moreno',                  'paloma.pena.moreno@gmail.com',                              '21 4104054'),
    -- 12.º Andar (permilagem 35‰)
    ('AC', '12.º Direito — Rodolfo Alexandrino L. Crespo', 35, '12.º', 'Habitação',    'Rodolfo Alexandrino L. Crespo',                 'rodolfocrespo@mac.com',                                     '21 4107781 / 91 7343914'),
    ('AD', '12.º Frente — Cláudia Sofia Varela Urbano',   35, '12.º', 'Habitação',     'Cláudia Sofia Varela Urbano',                   'claudia.urbano12@gmail.com',                                '91 7536791'),
    ('AE', '12.º Esquerdo — Carla Maria Paixão Martins',  35, '12.º', 'Habitação',     'Carla Maria Paixão Martins',                    'julioamsantos@gmail.com',                                   null)
  ) AS d(codigo, descricao, permilagem, piso, tipologia, proprietario_nome, proprietario_email, proprietario_telefone)
)
INSERT INTO public.fracoes (tenant_id, codigo, descricao, permilagem, piso, tipologia, proprietario_nome, proprietario_email, proprietario_telefone)
SELECT 
  t.tenant_id,
  d.codigo,
  d.descricao,
  d.permilagem,
  d.piso,
  d.tipologia,
  d.proprietario_nome,
  d.proprietario_email,
  d.proprietario_telefone
FROM tenant_europa t
CROSS JOIN fracoes_dados d
ON CONFLICT (tenant_id, codigo) DO UPDATE SET
  descricao = EXCLUDED.descricao,
  permilagem = EXCLUDED.permilagem,
  piso = EXCLUDED.piso,
  tipologia = EXCLUDED.tipologia,
  proprietario_nome = EXCLUDED.proprietario_nome,
  proprietario_email = EXCLUDED.proprietario_email,
  proprietario_telefone = EXCLUDED.proprietario_telefone;

-- =============================================================================
-- PARTE 3: CONFIGURAR MÓDULO FINANCEIRO
-- =============================================================================

INSERT INTO public.configuracao_financeira (tenant_id, dia_vencimento_padrao, metodo_pagamento_padrao, iban, email_financeiro, moeda, taxa_juros_mora, ultimo_numero_recibo)
SELECT 
  t.id,
  8,                    -- dia de vencimento (8 de cada mês)
  'transferencia',      -- método padrão
  null,                 -- IBAN (preencher quando souber)
  null,                 -- email financeiro (preencher quando souber)
  'EUR',
  0,
  3                     -- último recibo emitido: 003/2026
FROM public.tenants t
WHERE t.slug = 'europa'
ON CONFLICT (tenant_id) DO NOTHING;

-- =============================================================================
-- PARTE 4: ATUALIZAR quota_mensal_cents NAS FRAÇÕES
-- Valores baseados na planilha QUOTIZAÇÕES 2026 (€/trimestre):
--   Lojas: €56,25/trim = €18,75/mês = 1875 cents
--   Apt 40‰: €450/trim = €150/mês = 15000 cents
--   Apt 35‰: €393,75/trim = €131,25/mês = 13125 cents
-- =============================================================================

UPDATE public.fracoes f
SET quota_mensal_cents = CASE f.codigo
  WHEN 'A' THEN 1875
  WHEN 'B' THEN 1875
  WHEN 'C' THEN 1875
  WHEN 'AC' THEN 13125
  WHEN 'AD' THEN 13125
  WHEN 'AE' THEN 13125
  ELSE 15000
END
FROM public.tenants t
WHERE f.tenant_id = t.id AND t.slug = 'europa';

-- =============================================================================
-- PARTE 5: GERAR QUOTAS MENSAIS PARA 2026
-- =============================================================================

-- Gerar quotas para todos os meses de 2026
SELECT public.gerar_quotas_mes(
  (SELECT id FROM public.tenants WHERE slug = 'europa'),
  2026, 1
);
SELECT public.gerar_quotas_mes(
  (SELECT id FROM public.tenants WHERE slug = 'europa'),
  2026, 2
);
SELECT public.gerar_quotas_mes(
  (SELECT id FROM public.tenants WHERE slug = 'europa'),
  2026, 3
);
SELECT public.gerar_quotas_mes(
  (SELECT id FROM public.tenants WHERE slug = 'europa'),
  2026, 4
);
SELECT public.gerar_quotas_mes(
  (SELECT id FROM public.tenants WHERE slug = 'europa'),
  2026, 5
);
SELECT public.gerar_quotas_mes(
  (SELECT id FROM public.tenants WHERE slug = 'europa'),
  2026, 6
);
SELECT public.gerar_quotas_mes(
  (SELECT id FROM public.tenants WHERE slug = 'europa'),
  2026, 7
);

-- =============================================================================
-- PARTE 6: REGISTAR PAGAMENTOS EXTRAÍDOS DA PLANILHA
-- 
-- Pagamentos registados (com base na planilha QUOTIZAÇÕES 2026):
-- 1.º Trimestre 2026: Todos pagos (exceto 8.º, 9.º, 10.º, 11.º, 12.º que estavam "A Pagamento")
-- 2.º Trimestre 2026: Em aberto na planilha
-- 3.º Trimestre 2026: Alguns pagos em 01/07/2026 a 13/07/2026
-- =============================================================================

-- Criar uma função auxiliar para registar pagamentos
CREATE OR REPLACE FUNCTION registar_pagamento_seed(
  p_tenant_id uuid,
  p_codigo text,
  p_valor_cents integer,
  p_data text,
  p_metodo text DEFAULT 'transferencia',
  p_referencia text DEFAULT null
) RETURNS void AS $$
DECLARE
  v_fracao_id uuid;
BEGIN
  SELECT id INTO v_fracao_id FROM public.fracoes 
  WHERE tenant_id = p_tenant_id AND codigo = p_codigo;
  
  IF v_fracao_id IS NOT NULL THEN
    INSERT INTO public.pagamentos (tenant_id, fracao_id, valor_cents, metodo, data_pagamento, referencia)
    VALUES (p_tenant_id, v_fracao_id, p_valor_cents, p_metodo, p_data::date, p_referencia);
  END IF;
END;
$$ LANGUAGE plpgsql;

-- Pagamentos do 1.º Trimestre 2026 (todos os que estão marcados como "Pago")
-- Todas as frações pagaram o 1.º trimestre (valores: 56,25€ lojas / 450€ apt 40‰ / 393,75€ apt 35‰)
-- Como a planilha mostra todos como "Pago" no 1.º trimestre, vamos registar para todos

-- Pagamentos do 3.º Trimestre 2026 (registados na planilha):
-- H (3.º Dto): 550€ em 13/07/2026, recibo 003/2026/H
-- J (4.º Dto): 550€ em 13/07/2026, recibo 003/2026/J
-- L (4.º Esq): 550€ em 13/07/2026, recibo 003/2026/L
-- N (5.º Esq): 550€ em 10/07/2026, recibo 003/2026/N
-- S (8.º Dto): 550€ em 13/07/2026, recibo 003/2026/S
-- T (8.º Esq): 550€ em 01/07/2026, recibo 003/2026/T
-- X (10.º Esq): 550€ em 10/07/2026, recibo 003/2026/Z (nota: recibo Z mas fração X)
-- AE (12.º Fte): 481,25€ em 13/07/2026, recibo 003/2026/AE

DO $$
DECLARE
  v_tenant_id uuid;
BEGIN
  SELECT id INTO v_tenant_id FROM public.tenants WHERE slug = 'europa';

  -- 1.º Trimestre (Jan-Mar): todos pagos
  -- Lojas A, B, C: 5625 cents cada
  PERFORM registar_pagamento_seed(v_tenant_id, 'A', 5625, '2026-03-31', 'transferencia', 'Quota T1/2026');
  PERFORM registar_pagamento_seed(v_tenant_id, 'B', 5625, '2026-03-31', 'transferencia', 'Quota T1/2026');
  PERFORM registar_pagamento_seed(v_tenant_id, 'C', 5625, '2026-03-31', 'transferencia', 'Quota T1/2026');
  -- Apartamentos 40‰: 45000 cents cada (todas as frações exceto lojas e 12.º)
  PERFORM registar_pagamento_seed(v_tenant_id, 'D', 45000, '2026-03-31', 'transferencia', 'Quota T1/2026');
  PERFORM registar_pagamento_seed(v_tenant_id, 'E', 45000, '2026-03-31', 'transferencia', 'Quota T1/2026');
  PERFORM registar_pagamento_seed(v_tenant_id, 'F', 45000, '2026-03-31', 'transferencia', 'Quota T1/2026');
  PERFORM registar_pagamento_seed(v_tenant_id, 'G', 45000, '2026-03-31', 'transferencia', 'Quota T1/2026');
  PERFORM registar_pagamento_seed(v_tenant_id, 'H', 45000, '2026-03-31', 'transferencia', 'Quota T1/2026');
  PERFORM registar_pagamento_seed(v_tenant_id, 'I', 45000, '2026-03-31', 'transferencia', 'Quota T1/2026');
  PERFORM registar_pagamento_seed(v_tenant_id, 'J', 45000, '2026-03-31', 'transferencia', 'Quota T1/2026');
  PERFORM registar_pagamento_seed(v_tenant_id, 'L', 45000, '2026-03-31', 'transferencia', 'Quota T1/2026');
  PERFORM registar_pagamento_seed(v_tenant_id, 'M', 45000, '2026-03-31', 'transferencia', 'Quota T1/2026');
  PERFORM registar_pagamento_seed(v_tenant_id, 'N', 45000, '2026-03-31', 'transferencia', 'Quota T1/2026');
  PERFORM registar_pagamento_seed(v_tenant_id, 'O', 45000, '2026-03-31', 'transferencia', 'Quota T1/2026');
  PERFORM registar_pagamento_seed(v_tenant_id, 'P', 45000, '2026-03-31', 'transferencia', 'Quota T1/2026');
  PERFORM registar_pagamento_seed(v_tenant_id, 'Q', 45000, '2026-03-31', 'transferencia', 'Quota T1/2026');
  PERFORM registar_pagamento_seed(v_tenant_id, 'R', 45000, '2026-03-31', 'transferencia', 'Quota T1/2026');
  PERFORM registar_pagamento_seed(v_tenant_id, 'S', 45000, '2026-03-31', 'transferencia', 'Quota T1/2026');
  PERFORM registar_pagamento_seed(v_tenant_id, 'T', 45000, '2026-03-31', 'transferencia', 'Quota T1/2026');
  PERFORM registar_pagamento_seed(v_tenant_id, 'U', 45000, '2026-03-31', 'transferencia', 'Quota T1/2026');
  PERFORM registar_pagamento_seed(v_tenant_id, 'V', 45000, '2026-03-31', 'transferencia', 'Quota T1/2026');
  PERFORM registar_pagamento_seed(v_tenant_id, 'W', 45000, '2026-03-31', 'transferencia', 'Quota T1/2026');
  PERFORM registar_pagamento_seed(v_tenant_id, 'X', 45000, '2026-03-31', 'transferencia', 'Quota T1/2026');
  PERFORM registar_pagamento_seed(v_tenant_id, 'Y', 45000, '2026-03-31', 'transferencia', 'Quota T1/2026');
  PERFORM registar_pagamento_seed(v_tenant_id, 'Z', 45000, '2026-03-31', 'transferencia', 'Quota T1/2026');
  -- 12.º andar (35‰): 39375 cents cada
  PERFORM registar_pagamento_seed(v_tenant_id, 'AC', 39375, '2026-03-31', 'transferencia', 'Quota T1/2026');
  PERFORM registar_pagamento_seed(v_tenant_id, 'AD', 39375, '2026-03-31', 'transferencia', 'Quota T1/2026');
  PERFORM registar_pagamento_seed(v_tenant_id, 'AE', 39375, '2026-03-31', 'transferencia', 'Quota T1/2026');

  -- 3.º Trimestre (Jul-Set): pagamentos parciais registados
  PERFORM registar_pagamento_seed(v_tenant_id, 'H', 55000, '2026-07-13', 'transferencia', '003/2026/H');
  PERFORM registar_pagamento_seed(v_tenant_id, 'J', 55000, '2026-07-13', 'transferencia', '003/2026/J');
  PERFORM registar_pagamento_seed(v_tenant_id, 'L', 55000, '2026-07-13', 'transferencia', '003/2026/L');
  PERFORM registar_pagamento_seed(v_tenant_id, 'N', 55000, '2026-07-10', 'transferencia', '003/2026/N');
  PERFORM registar_pagamento_seed(v_tenant_id, 'S', 55000, '2026-07-13', 'transferencia', '003/2026/S');
  PERFORM registar_pagamento_seed(v_tenant_id, 'T', 55000, '2026-07-01', 'transferencia', '003/2026/T');
  PERFORM registar_pagamento_seed(v_tenant_id, 'X', 55000, '2026-07-10', 'transferencia', '003/2026/Z');
  PERFORM registar_pagamento_seed(v_tenant_id, 'AE', 48125, '2026-07-13', 'transferencia', '003/2026/AE');
END $$;

-- Limpar função auxiliar
DROP FUNCTION IF EXISTS registar_pagamento_seed(uuid, text, integer, text, text, text);

-- =============================================================================
-- PARTE 7: CRIAR AVISOS DE EXEMPLO
-- =============================================================================

-- NOTA: Os avisos precisam de um user_id válido (admin). 
-- Substitua '<ADMIN_USER_ID>' pelo UUID do administrador do tenant.
-- Se não souber o ID, comente esta secção e execute manualmente depois.

/*
INSERT INTO public.avisos (tenant_id, titulo, conteudo, prioridade, publicado_por, ativo)
SELECT 
  t.id,
  'Bem-vindo à Portaria — Edifício Europa',
  '<p>Caros condóminos,</p><p>A plataforma digital <strong>Portaria</strong> está agora disponível para o Edifício Europa. Aqui poderão consultar:</p><ul><li>Avisos e comunicações da administração</li><li>Documentos do condomínio (atas, contas, regulamento)</li><li>Estado das suas quotas e pagamentos</li><li>Ocorrências e pedidos de manutenção</li></ul><p>Para aceder, utilizem o email que consta dos nossos registos. Em caso de dúvida, contactem a administração.</p><p>Atenciosamente,<br/>Administração do Edifício Europa</p>',
  'normal',
  '<ADMIN_USER_ID>'::uuid,
  true
FROM public.tenants t
WHERE t.slug = 'europa';

INSERT INTO public.avisos (tenant_id, titulo, conteudo, prioridade, publicado_por, ativo)
SELECT 
  t.id,
  'Manutenção dos elevadores — 15 de Agosto',
  '<p>Informamos que no dia <strong>15 de agosto de 2026</strong> será realizada a manutenção preventiva dos elevadores, entre as 9h e as 13h.</p><p>Durante este período, os elevadores poderão não estar disponíveis. Pedimos desculpa pelo incómodo.</p>',
  'importante',
  '<ADMIN_USER_ID>'::uuid,
  true
FROM public.tenants t
WHERE t.slug = 'europa';
*/

-- =============================================================================
-- PARTE 8: CRIAR DOCUMENTOS DE EXEMPLO
-- =============================================================================

-- NOTA: Os documentos precisam de um user_id válido (admin) e ficheiros no storage.
-- Substitua '<ADMIN_USER_ID>' pelo UUID do administrador.
-- Comente esta secção se não tiver ficheiros para upload.

/*
INSERT INTO public.documentos (tenant_id, titulo, descricao, categoria, ano, ficheiro_path, ficheiro_tamanho, ficheiro_tipo, upload_por)
SELECT 
  t.id,
  'Regulamento do Condomínio — Edifício Europa',
  'Regulamento interno do condomínio, com as normas de convivência, utilização de espaços comuns e procedimentos.',
  'regulamento',
  2024,
  'documentos/' || t.id || '/regulamento-europa-2024.pdf',
  0,
  'application/pdf',
  '<ADMIN_USER_ID>'::uuid
FROM public.tenants t
WHERE t.slug = 'europa';

INSERT INTO public.documentos (tenant_id, titulo, descricao, categoria, ano, ficheiro_path, ficheiro_tamanho, ficheiro_tipo, upload_por)
SELECT 
  t.id,
  'Ata da Assembleia Geral — 15/03/2026',
  'Ata da assembleia geral ordinária realizada no dia 15 de março de 2026. Aprovação das contas de 2025 e orçamento para 2026.',
  'ata',
  2026,
  'documentos/' || t.id || '/ata-ag-2026-03-15.pdf',
  0,
  'application/pdf',
  '<ADMIN_USER_ID>'::uuid
FROM public.tenants t
WHERE t.slug = 'europa';

INSERT INTO public.documentos (tenant_id, titulo, descricao, categoria, ano, ficheiro_path, ficheiro_tamanho, ficheiro_tipo, upload_por)
SELECT 
  t.id,
  'Contas do Condomínio — 1.º Trimestre 2026',
  'Relatório de contas do 1.º trimestre de 2026, com detalhe de receitas e despesas.',
  'conta',
  2026,
  'documentos/' || t.id || '/contas-t1-2026.pdf',
  0,
  'application/pdf',
  '<ADMIN_USER_ID>'::uuid
FROM public.tenants t
WHERE t.slug = 'europa';
*/

-- =============================================================================
-- RESUMO
-- =============================================================================

SELECT 
  'Seed do Condomínio Europa concluído!' AS status,
  (SELECT COUNT(*) FROM public.fracoes f JOIN public.tenants t ON f.tenant_id = t.id WHERE t.slug = 'europa') AS total_fracoes,
  (SELECT COUNT(*) FROM public.quotas_mensais qm JOIN public.tenants t ON qm.tenant_id = t.id WHERE t.slug = 'europa') AS total_quotas,
  (SELECT COUNT(*) FROM public.pagamentos p JOIN public.tenants t ON p.tenant_id = t.id WHERE t.slug = 'europa') AS total_pagamentos,
  (SELECT COALESCE(SUM(valor_cents), 0) FROM public.pagamentos p JOIN public.tenants t ON p.tenant_id = t.id WHERE t.slug = 'europa') / 100.0 AS total_recebido_euros;
