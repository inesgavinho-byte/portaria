-- Processo de consultas para a empreitada de reabilitação e pintura das
-- fachadas — Janeiro de 2025.
--
-- Indexa as propostas concorrentes recebidas e comparadas antes da
-- adjudicação, e o orçamento da Pinturas Verticais na versão que foi
-- efectivamente submetida a comparação. Sem estas fontes o processo de
-- consulta não existe no sistema e a adjudicação fica sem fundamentação
-- documental.
--
-- Nota de proveniência importante: o ficheiro da Pinturas Verticais
-- distribuído para comparação em 30-01-2025 é, por checksum MD5, exactamente
-- o mesmo enviado em 07-01-2025 — a versão de 68.700 EUR. Não é a versão
-- "-R" de 63.000 EUR que consta como referência do contrato. Esta fonte fica
-- registada em separado da fonte já existente do 010125-R, precisamente para
-- que as duas versões coexistam e a divergência permaneça visível.
--
-- Os valores registados são os que cada documento declara, sem normalização
-- entre bases de IVA: as propostas usam bases diferentes e compará-las exige
-- essa distinção explícita.

INSERT INTO public.ia_documental_fontes
  (tenant_id, titulo, referencia, jurisdicao, ativa, conteudo_resumo, conteudo_markdown, checksum, tamanho_bytes)
SELECT t.id, v.titulo, v.referencia, 'PT', true, v.resumo, v.markdown, v.checksum, v.bytes
FROM (SELECT DISTINCT c.tenant_id AS id FROM public.contratos c
      JOIN public.fornecedores f ON f.id = c.fornecedor_id
      WHERE f.nome = 'Pinturas Verticais') t,
(VALUES
 ('Processo de consultas — propostas para impermeabilização e pintura das fachadas',
  'Email da administração de 30-01-2025 — 11 anexos',
  'Email de Maria João Santos para Miguel Mexia Vassalo, com cópia a Carlos Reis, em 30-01-2025 às 16:23, remetendo as propostas recebidas para elaboração de mapa comparativo.',
  E'# Processo de consultas — 30-01-2025\n\nEmail de Maria João Santos (administração, europa.1495.153@gmail.com) para Miguel Mexia Vassalo, com cópia a Carlos Reis, em 30-01-2025 às 16:23.\n\n> "Conforme combinado, junto as propostas mencionadas em epígrafe para que elabore um mapa comparativo. Há, pelo menos, duas empresas que ainda não enviaram as propostas, nem responderam ao e-mail que enviei. De qualquer das formas, também já temos 4 que são suficientes para comparar. Se, entretanto, as outras empresas enviarem, consideraremos os valores que vierem."\n\n## Anexos (11)\n\n- Orçamento_Pinturas Verticais.pdf\n- Orçamento_Derbipor.pdf\n- Orçamento_Vectobra.pdf\n- Orçamento Remodeladora Fachada da Frente 1, 2 e 3\n- Orçamento Remodeladora Fachada Lateral 1, 2 e 3\n- Orçamento Remodeladora Fachada Tardoz 1 e 2\n\n## Observações\n\nQuatro empresas consultadas com resposta: Pinturas Verticais, Derbipor, Vectobra e Remodeladora. Pelo menos duas outras empresas consultadas não responderam. A comparação foi delegada em Miguel Mexia Vassalo.',
  '625e75121d2b2ed0367065ecf60d2f2a', 92324),

 ('Orçamento Pinturas Verticais 010125 — versão submetida a comparação',
  'Orçamento_Pinturas Verticais.pdf (anexo ao email de 30-01-2025)',
  'Orçamento 010125 de 07-01-2025 na versão distribuída para comparação: total global 68.700 EUR, com fachadas orçamentadas em separado. Acresce IVA.',
  E'# Orçamento n.º 010125 — Pinturas Verticais — 07-01-2025\n\nVersão submetida ao processo de consultas em 30-01-2025. Por checksum MD5 (66032d3a2377280653ea4ee7470d9e81) é o mesmo ficheiro enviado em 07-01-2025.\n\nEmitente: Pinturas Verticais – Alpinismo Industrial, alvará 108238-PAR. Assinado por Reinaldo Ferreira.\n\n## Valores declarados\n\n| Âmbito | Valor |\n| --- | --- |\n| Global (execução conjunta) | 68.700,00 EUR |\n| Apenas fachada da frente | 16.700,00 EUR |\n| Apenas fachada das traseiras | 35.700,00 EUR |\n| Apenas fachada lateral | 16.700,00 EUR |\n\nAos valores apresentados acresce IVA à taxa legal em vigor. As parcelas somam 69.100 EUR, 400 EUR acima do global declarado: o global incorpora desconto de conjunto.\n\n## Cláusula de execução global\n\n> "Os trabalhos e valores apresentados são de execução global e não serão adjudicados separadamente, salvo alteração por acordo entre as partes, com acerto dos valores apresentados."\n\n## Condições\n\n- Pagamento: 40% na adjudicação, 40% no meio da obra, 20% na conclusão.\n- Prazo expectável de conclusão: 2 meses após o início.\n- Validade da proposta: 30 dias.\n- Adjudicação só considerada após entrega do duplicado da proposta assinado.\n- Garantia de 5 anos, com termo de garantia emitido após a conclusão.\n- Meios de elevação por rappel, apresentado pelo próprio emitente como factor de poupança.\n- Licença de ocupação da via pública por conta do empreiteiro.\n- Seguro de acidentes de trabalho incluído no valor orçamentado.\n\n## Incoerência interna\n\nA tabela "Apenas fachada lateral" descreve trabalhos na fachada das traseiras — lavagem, impermeabilização e pintura "da fachada das traseiras". O âmbito da fachada lateral não é correctamente especificado nesta proposta.',
  '66032d3a2377280653ea4ee7470d9e81', 378272),

 ('Orçamento Vectobra — reabilitação das fachadas',
  'Orçamento_Vectobra.pdf (anexo ao email de 30-01-2025)',
  'Proposta concorrente da Vectobra: 111.192,38 EUR acrescido de IVA a 6%, para fachada principal, traseira e empena.',
  E'# Orçamento Vectobra\n\nEmitente: Vectobra, NIF 501 592 008, alvará n.º 6183 – Classe 4, Baixa da Banheira.\n\n## Valores\n\n| Âmbito | Valor |\n| --- | --- |\n| Fachada principal | 40.898,35 EUR |\n| Fachada traseira | 38.342,20 EUR |\n| Empena | 31.951,83 EUR |\n| **Total** | **111.192,38 EUR** |\n\n> "Aos valores apresentados ACRESCERÁ o IVA à taxa legal em vigor 6% (Anexo I do código do IVA - IVA taxa reduzida), valor dos materiais <20% do valor da obra."\n\nMedição de referência: 3.393 m² de fachada.\n\n## Condições\n\n- Prazo de execução: 130 dias úteis a contar do início dos trabalhos.\n- Garantia de 5 anos, conjunta Vectobra/Robbialac, com certificado de garantia.\n- Tintas Robbialac.',
  '77c74db3493108557a515d07d47b3672', 4784346),

 ('Orçamento Derbipor — reabilitação das fachadas',
  'Orçamento_Derbipor.pdf (anexo ao email de 30-01-2025)',
  'Proposta concorrente da Derbipor: valor global de 144.890,00 EUR sem IVA.',
  E'# Orçamento Derbipor\n\n## Valores\n\n> VALOR GLOBAL DA PROPOSTA S/ IVA: **144.890,00 EUR**\n\nParcelas declaradas no mapa de trabalhos: 54.940,00 EUR; 25.730,00 EUR; 49.920,00 EUR; 14.300,00 EUR. Somam 144.890,00 EUR. A associação de cada parcela à respectiva fachada não é extraível com segurança do documento e carece de leitura manual.\n\n## Nota sobre o valor com IVA\n\nO documento apresenta "VALOR GLOBAL DA PROPOSTA C/ IVA 6%: 153.538,40 EUR". Sobre 144.890,00 EUR, o IVA a 6% dá 153.583,40 EUR. Há uma divergência de 45,00 EUR entre o valor impresso e o cálculo, compatível com transposição de dígitos. O valor sem IVA é o que fica como referência.\n\n## Âmbito\n\nInclui montagem e desmontagem de estrutura de bailéus nas fachadas tardoz e lateral e elevador de fachada na fachada principal, lavagem a alta pressão e argamassa aditivada de fibras para reparação. Prevê intervenção na fachada sem intervencionar as floreiras.',
  '772f6d8c9278153fa7d4f6009e67171f', 1506879),

 ('Orçamento Remodeladora — fachada tardoz (opção 2)',
  'Orçamento Remodeladora Fachada Tardoz 2.pdf (anexo ao email de 30-01-2025)',
  'Proposta concorrente da Remodeladora para a fachada tardoz, com IVA repartido entre mão de obra a 6% e materiais a 23%.',
  E'# Orçamento Remodeladora — fachada tardoz (opção 2)\n\nDocumento parcialmente digitalizado; a extracção de texto é imperfeita e os valores devem ser confirmados por leitura manual.\n\n## Valores legíveis\n\n- Opção A: 81.080 EUR + IVA. O total com IVA impresso não é legível com segurança.\n- Opção B: 60.080 EUR + IVA, com total com IVA incluído de 71.029,40 EUR.\n\n## Estrutura de IVA — relevante para comparação\n\n> "IVA da mão de obra 6%, IVA dos materiais 23%"\n\nA Remodeladora reparte o IVA entre mão de obra e materiais, ao contrário da Pinturas Verticais, da Vectobra e da Derbipor, que aplicam 6% à totalidade. A taxa reduzida de 6% em empreitadas de reabilitação depende de os materiais não excederem 20% do valor da obra, condição que a Vectobra declara expressamente cumprir. As propostas não são, por isso, directamente comparáveis sem uniformizar a base de IVA.\n\n## Outras condições\n\n- Previsão de desconto de 2.250 EUR ao valor total caso não seja necessária determinada componente exterior.\n- Garantia dos trabalhos: 5 anos após a conclusão.\n- Condições de pagamento apresentadas com andaimes.',
  '82d9f3f056fb1294c98b764aa2e34e71', 717591),

 ('Orçamento Remodeladora — fachada tardoz (opção 1)',
  'Orçamento Remodeladora Fachada Tardoz 1.pdf (anexo ao email de 30-01-2025)',
  'Proposta concorrente da Remodeladora para a fachada tardoz. Documento digitalizado sem texto extraível.',
  E'# Orçamento Remodeladora — fachada tardoz (opção 1)\n\nDocumento digitalizado. Não tem camada de texto extraível, pelo que os valores e condições não foram indexados.\n\nCarece de leitura manual ou de reconhecimento óptico de caracteres antes de poder ser usado como evidência de valor. Fica registado no processo de consultas para que o conjunto das propostas recebidas esteja completo.',
  '55c2a05f9cb46957f8c5ea0eb239b229', 839839),

 ('Orçamento Remodeladora — fachada lateral (opção 3)',
  'Orçamento Remodeladora Fachada Lateral 3.pdf (anexo ao email de 30-01-2025)',
  'Proposta concorrente da Remodeladora para a fachada lateral. Documento digitalizado, com valores não extraíveis.',
  E'# Orçamento Remodeladora — fachada lateral (opção 3)\n\nDocumento maioritariamente digitalizado. Da camada de texto disponível apenas se extraem condições, não valores:\n\n- Previsão de desconto de 1.500 EUR ao valor total caso não seja necessária determinada componente exterior.\n- Garantia dos trabalhos: 5 anos após a conclusão.\n- Condições de pagamento apresentadas com andaimes.\n\nOs valores carecem de leitura manual. Fica registado no processo de consultas para que o conjunto das propostas recebidas esteja completo.',
  '69feffcd650291781220bbf74e9effd9', 466654)
) AS v(titulo, referencia, resumo, markdown, checksum, bytes)
WHERE NOT EXISTS (
  SELECT 1 FROM public.ia_documental_fontes f2
  WHERE f2.tenant_id = t.id AND f2.referencia = v.referencia
);

-- ---------------------------------------------------------------------------
-- Acontecimento: o processo de consultas que fundamenta a adjudicação.
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
       timestamptz '2025-01-30 00:00:00+00',
       'proposta',
       'Processo de consultas — quatro propostas recebidas e comparadas',
       'A administração consultou o mercado e reuniu quatro propostas para a reabilitação e pintura das fachadas, remetendo-as em 30-01-2025 para elaboração de mapa comparativo. Pelo menos duas outras empresas consultadas não responderam. Valores declarados, sem IVA: Pinturas Verticais 68.700 EUR para as três fachadas em execução global; Vectobra 111.192,38 EUR; Derbipor 144.890 EUR. A Remodeladora apresentou propostas por fachada, em documentos maioritariamente digitalizados cujos valores carecem de leitura manual, e com estrutura de IVA distinta das restantes, repartida entre mão de obra a 6% e materiais a 23%. A proposta da Pinturas Verticais é a mais baixa por margem larga, o que é coerente com o método de acesso por rappel que a própria proposta apresenta como factor de poupança, por oposição aos bailéus e elevador de fachada previstos pela Derbipor. Registe-se que a versão da proposta da Pinturas Verticais submetida a comparação é a de 68.700 EUR, e não a versão revista de 63.000 EUR que consta como referência do contrato adjudicado.',
       'facto'
FROM contrato
ON CONFLICT (tenant_id, contrato_id, data_evento, titulo) DO NOTHING;

INSERT INTO public.contrato_memoria_evidencias (evento_id, fonte_id, localizador, citacao, papel)
SELECT e.id, v.fonte_id, v.localizador, v.citacao, v.papel
FROM public.contrato_memoria_eventos e
JOIN (
  SELECT f.id AS fonte_id, f.tenant_id, 'email de 30-01-2025, 16:23' AS localizador,
         'Conforme combinado, junto as propostas mencionadas em epígrafe para que elabore um mapa comparativo.' AS citacao,
         'primaria' AS papel
  FROM public.ia_documental_fontes f WHERE f.referencia = 'Email da administração de 30-01-2025 — 11 anexos'
  UNION ALL
  SELECT f.id, f.tenant_id, 'mapa de trabalhos e valores',
         'TOTAL 68.700,00. São: Sessenta e oito mil e setecentos Euros.', 'primaria'
  FROM public.ia_documental_fontes f WHERE f.referencia = 'Orçamento_Pinturas Verticais.pdf (anexo ao email de 30-01-2025)'
  UNION ALL
  SELECT f.id, f.tenant_id, 'quadro-resumo',
         'TOTAL 111 192,38 €. Aos valores apresentados ACRESCERÁ o IVA à taxa legal em vigor 6%.', 'corroboracao'
  FROM public.ia_documental_fontes f WHERE f.referencia = 'Orçamento_Vectobra.pdf (anexo ao email de 30-01-2025)'
  UNION ALL
  SELECT f.id, f.tenant_id, 'quadro-resumo',
         'VALOR GLOBAL DA PROPOSTA S/ IVA: 144.890,00€.', 'corroboracao'
  FROM public.ia_documental_fontes f WHERE f.referencia = 'Orçamento_Derbipor.pdf (anexo ao email de 30-01-2025)'
  UNION ALL
  SELECT f.id, f.tenant_id, 'condições de IVA',
         'IVA da mão de obra 6%, IVA dos materiais 23%.', 'corroboracao'
  FROM public.ia_documental_fontes f WHERE f.referencia = 'Orçamento Remodeladora Fachada Tardoz 2.pdf (anexo ao email de 30-01-2025)'
) v ON v.tenant_id = e.tenant_id
WHERE e.titulo = 'Processo de consultas — quatro propostas recebidas e comparadas'
ON CONFLICT (evento_id, fonte_id, citacao) DO NOTHING;
