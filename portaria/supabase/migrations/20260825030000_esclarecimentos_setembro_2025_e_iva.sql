-- Reconciliação do thread "Pedido de esclarecimento de dúvidas" (Set/2025),
-- registo das fichas técnicas dos materiais, comparação estruturada das três
-- versões do orçamento 010125 e formalização dos dois pedidos de esclarecimento.
--
-- Aplicada no projecto Supabase em dois passos, sob os nomes:
--   fontes_esclarecimentos_setembro_2025
--   eventos_esclarecimentos_setembro_2025_e_iva
--
-- ====================================================================
-- CORRECÇÃO DE UM REGISTO ANTERIOR
-- ====================================================================
-- O evento "Pedidos de esclarecimento técnico sem resposta do empreiteiro"
-- estava errado. O empreiteiro RESPONDEU. A sequência real é:
--   30-07-2025  o condómino do 5.º Dt.º (Eng. Jaime Correia) pede a descrição
--               dos procedimentos de impermeabilização das floreiras e as
--               fichas técnicas dos materiais
--   03-09-2025  a administração relaia o pedido ao empreiteiro, condicionando
--               o pagamento dos 40% à resposta
--   04-09-2025  o empreiteiro envia orçamento rectificado, ficha técnica e PDFs
--               dos fabricantes dos materiais de impermeabilização
--   05-09-2025  o Eng. Jaime Correia escreve que não obteve resposta — mas
--               escreve-o antes de a administração lhe reencaminhar a resposta,
--               o que só acontece nesse mesmo dia às 15:28
-- O evento é reescrito: o problema não foi a ausência de resposta, foi o
-- conteúdo da resposta e o momento em que chegou.
--
-- ====================================================================
-- O QUE OS DOCUMENTOS NOVOS PROVAM
-- ====================================================================
--
-- 1. O 010125-R foi produzido em 04-09-2025 e datado de 07-01-2025.
--    O ficheiro anexo ao email das 15:40 de 04-09-2025 tem MD5 c9936e04, o
--    mesmo do orçamento referido no contrato. Encabeça "Agualva-Cacém, 07 de
--    janeiro de 2025". Os trabalhos tinham começado a 01-09-2025.
--
-- 2. A impermeabilização das floreiras entrou no contrato nessa data.
--    Verificado por extracção de texto dos três ficheiros: o M004, argamassa
--    Hidrostop Flex SECIL TEK, e a instrução de duas demãos nas floreiras só
--    existem em c9936e04. As versões 66032d3a (a que a assembleia aceitou) e
--    b28f4a71 (reenviada em 11-06-2025) listam apenas M001 a M003.
--
-- 3. O sistema entregue não é o sistema pedido.
--    A pergunta A dos condóminos pedia impermeabilização total do interior das
--    floreiras: geotêxtil, isolante térmico, barreira anti-raízes e membrana. A
--    resposta foi uma argamassa cimentícia. Nenhum dos três orçamentos refere
--    ralo, tubo de queda, caleira, tela, membrana, pendente ou drenagem —
--    ausência verificada por varrimento de termos nos três documentos.
--
-- 4. As fichas técnicas que o empreiteiro entregou contradizem a aplicação.
--    Hidrostop Flex (SECIL TEK): "deve estar protegido sempre contra a
--    exposição à radiação U.V." Numa floreira, aplicado como camada exterior,
--    fica exposto.
--    Polyprep Conversor de Ferrugem 18-205 (CIN): "Não se recomenda a
--    repintura do Conversor de Ferrugem com produtos de base aquosa uma vez
--    que pode originar manchas na superfície." A tinta do mesmo sistema,
--    Nováqua HD 10-125, é aquosa e dilui-se em água. É a combinação aplicada
--    nos ferros das floreiras, onde em 30-03-2026 se reclamou tinta saltada.
--    weberep basic (Saint-Gobain): "Não resiste a eventuais movimentos
--    estruturais do suporte (nestes casos a fissuração é inevitável)."
--
-- 5. A pergunta sobre o IVA foi feita depois de o pagamento estar feito, e a
--    resposta inventou uma regra que a lei não tem.
--    04-09-2025, 16:18 — a administração informa que já pagou os 40%.
--    04-09-2025, 17:31 — a administração pergunta: "Agradeço que me informe se
--    o Iva a aplicar é, na totalidade, a 6%."
--    04-09-2025, 23:01 — o empreiteiro responde: "Quanto ao IVA a cobrar
--    falaremos e acertaremos em cada pagamento, mas numa obra desta natureza a
--    aplicação do IVA é calculada dentro dos seguintes parâmetros: 6% de IVA
--    sobre 60% dos valores apresentados, relativos a mão de obra; 23% de IVA
--    sobre 40% dos valores apresentados, relativos aos materiais."
--    Taxa efectiva 12,8%. Carlos Reis calcula 13.536,00 EUR para a primeira
--    tranche — 12.000 x 1,128 — e foram pagos 12.000,00 EUR.
--    Nenhum dos 45.000,00 EUR pagos até Fev/2026 leva IVA ou factura. O único
--    pagamento com IVA é o de 6.360,00 EUR de 11-06-2026: 6% sobre 6.000,00, e
--    é o primeiro com factura.
--
-- 6. O administrador mandou retirar uma pergunta técnica do pedido.
--    03-09-2025, 15:20 — Miguel Vassalo: "P.f. retire esse ponto das
--    perguntas. Não inclui esse ponto no meu e-mail de propósito porque isso
--    ficou de inicio excluído." A administração cumpre às 16:20. A pergunta
--    retirada era a da pintura das paredes e tectos das varandas — a mesma
--    exclusão que em 26-09-2025 a empreiteira invocaria para propor
--    contratação directa aos condóminos.
--
-- ====================================================================
-- OS 1.800 EUR
-- ====================================================================
-- 07-01-2025, 21:40 — Miguel Vassalo: "Já voltei a falar e vão reduzir o preço
-- da fachada sul para 30 m já com IVA."
-- 08-01-2025, 14:42 — a administração distribui o mapa de quotas extra com um
-- total de exactamente 30.000,00 EUR, em quatro prestações de 7.500,00 EUR.
-- As três versões do orçamento dizem, todas, que ao valor ACRESCE IVA.
-- Lido como o documento se apresenta: 30.000,00 + 6% = 31.800,00 EUR.
-- O que foi negociado nunca entrou em papel. É aí que vivem os 1.800,00 EUR.

do $$
declare
  v_tenant   uuid;
  v_contrato uuid := '95dad36e-c84d-42ce-aab4-7f376ca83f68';
  v_autor    uuid;
  v_f_jan    uuid;
  v_f_esc    uuid;
  v_f_ft     uuid;
  v_f_seg    uuid;
  v_f_doc    uuid;
  v_f_11     uuid;
  v_f_orig   uuid := '42654204-33cc-4bda-a4f0-ccf98df7964c'; -- MD5 66032d3a
  v_f_reenv  uuid := '15909449-e211-49a4-8cc8-b19ee6c328d8'; -- MD5 b28f4a71
  v_f_final  uuid := '5262c464-dff9-4175-9fba-e493ae32788e'; -- MD5 c9936e04
  v_f_dren   uuid := 'c1b3f100-ec54-47fc-b8a5-64b8785b708e';
  v_f_tec    uuid := '78ac98f1-d2be-4a8e-8522-29d418ef85df';
  v_f_cobr   uuid := '05241d92-2df0-4954-9fa4-baa19eef900d';
  v_ev       uuid;
  v_titulos  text[] := array[
    'Contribuição extraordinária de Janeiro dimensionada em 30.000 EUR já com IVA',
    'Três versões do orçamento 010125 divergem na cláusula de IVA, no prazo e nos materiais',
    'Condóminos condicionam o pagamento da adjudicação a esclarecimentos técnicos',
    'Administrador manda retirar do pedido de esclarecimentos a questão das varandas',
    'Empreiteiro responde com orçamento rectificado e fichas técnicas dos materiais',
    'O orçamento 010125-R foi produzido em Setembro e datado de Janeiro',
    'Sistema de impermeabilização entregue não corresponde ao sistema questionado',
    'Fichas técnicas entregues pelo empreiteiro contradizem a aplicação em floreiras',
    'Pergunta escrita sobre a taxa de IVA nunca respondida, pagamento feito antes',
    'Apólices de responsabilidade civil e acidentes de trabalho entregues',
    'Pedido de esclarecimentos à anterior administração — os 1.800 EUR de IVA da fachada sul',
    'Pedido de esclarecimentos à empreiteira — materiais aplicados e sistema de escoamento',
    'Empreiteiro fixa o IVA em duas taxas repartidas por 60 e 40 por cento',
    'Administração calcula 13.536 EUR com IVA e paga 12.000 EUR sem IVA',
    'Quarto beneficiário terceiro indicado e retirado no mesmo dia',
    'Âmbito do ponto 5 reduzido por resposta, sem correcção do orçamento',
    'Segundo pedido de 6.000 EUR ao mesmo beneficiário, recusado por falta de fundos',
    'Documentos obrigatórios da empreitada pedidos e nunca entregues',
    'Acompanhamento técnico declara defeituosa a imunização das armaduras de aço'
  ];
begin
  -- O tenant vem do próprio contrato, não de um literal: numa reconstrução
  -- limpa da cadeia o contrato do processo não existe e estes registos são
  -- um no-op. Em produção o contrato existe e o comportamento é o de sempre.
  select tenant_id into v_tenant from public.contratos where id = v_contrato;
  if v_tenant is null then
    return;
  end if;

  select criado_por into v_autor
    from contrato_memoria_eventos
   where contrato_id = v_contrato and criado_por is not null
   limit 1;

  -- ==================================================================
  -- FONTES
  -- ==================================================================
  select id into v_f_jan from ia_documental_fontes where checksum = '671845d6';
  if v_f_jan is null then
    insert into ia_documental_fontes
      (tenant_id, titulo, referencia, jurisdicao, ativa, checksum, conteudo_resumo, conteudo_markdown, criado_por)
    values (
      v_tenant,
      'Negociação da fachada sul e dimensionamento da contribuição — 07/08-01-2025',
      'Thread "FW: ." — Miguel Mexia Vassalo / administração, 5 mensagens',
      'PT', true, '671845d6',
      'Thread em que a proposta da Pinturas Verticais entra no processo pela mão de Miguel Vassalo, em que este comunica a redução da fachada sul para trinta mil já com IVA, e em que a administração dimensiona no dia seguinte a contribuição extraordinária em exactamente 30.000,00 EUR.',
      E'# Negociação da fachada sul e dimensionamento da contribuição\n\nThread "FW: .", cinco mensagens, 07 e 08 de Janeiro de 2025.\n\n## 07-01-2025, 20:41 — entrada da proposta no processo\n\nMiguel Vassalo reencaminha para si próprio, do endereço pessoal para o profissional, o ficheiro `Orcamento 010125 - Rua_Professor_Ricardo_Jorge_7_Miraflores - fachadas_em_separado.pdf` (370K). Por MD5 é `66032d3a2377280653ea4ee7470d9e81`: a versão de 68.700,00 EUR.\n\n## 07-01-2025, 21:26 — envio à administração\n\n> "Envio orçamento para pintura e reparação de fachadas do prédio. Parece-me que são os mais baratos."\n\nA Pinturas Verticais não constava da lista de cinco empresas consultadas pela administração.\n\n## 07-01-2025, 21:38 — resposta da administração\n\n> "Realmente, é um belíssimo preço! Hoje, foi um engenheiro da Vectobra ao prédio para dar o orçamento, mas duvido que seja mais barato."\n\n## 07-01-2025, 21:40 — a negociação verbal\n\n> "Já voltei a falar e vão reduzir o preço da fachada sul para 30 m já com IVA. Vamos ver."\n\nÉ o único registo, em todo o processo, de que os 30.000,00 EUR incluem IVA. É uma afirmação verbal reportada por email. Nenhum orçamento, contrato ou factura o repete.\n\n## 08-01-2025, 14:42 — dimensionamento da contribuição\n\n| Permilagem | Anual | Fev. | Mar. | Mai. | Jun. |\n| --- | --- | --- | --- | --- | --- |\n| 40 | 1.200,00 EUR | 300,00 | 300,00 | 300,00 | 300,00 |\n| 35 | 1.050,00 EUR | 262,50 | 262,50 | 262,50 | 262,50 |\n| 15 (lojas) | 450,00 EUR | 112,50 | 112,50 | 112,50 | 112,50 |\n| **Total** | **30.000,00 EUR** | 7.500,00 | 7.500,00 | 7.500,00 | 7.500,00 |\n\nO total angariado é exactamente o valor negociado, tratado como custo final da fachada sul. Não há linha para IVA.\n\nEsta cobrança é anterior e distinta da contribuição de 62.000,00 EUR deliberada na AGO n.º 24 e comunicada em 14-04-2025.',
      v_autor
    ) returning id into v_f_jan;
  end if;

  select id into v_f_esc from ia_documental_fontes where checksum = '88148939';
  if v_f_esc is null then
    insert into ia_documental_fontes
      (tenant_id, titulo, referencia, jurisdicao, ativa, checksum, conteudo_resumo, conteudo_markdown, criado_por)
    values (
      v_tenant,
      'Pedido de esclarecimento de dúvidas — 03 a 08-09-2025',
      'Thread "Edifício Europa - Pedido de esclarecimento de dúvidas", 13 mensagens',
      'PT', true, '88148939',
      'Thread em que os condóminos condicionam o pagamento da adjudicação a esclarecimentos técnicos, o administrador manda retirar uma das perguntas, o empreiteiro responde com orçamento rectificado e fichas técnicas, o pagamento é feito e a pergunta sobre a taxa de IVA fica sem resposta.',
      E'# Pedido de esclarecimento de dúvidas — Setembro de 2025\n\nTreze mensagens entre 03 e 08 de Setembro de 2025. Os trabalhos tinham começado a 01-09-2025.\n\n## 03-09-2025, 14:53 — a administração condiciona o pagamento\n\nMaria João Santos escreve ao empreiteiro confirmando ter recebido, por WhatsApp, pedido de pagamento de 12.000,00 EUR para IBAN de terceiro, e pede que a correspondência passe a ser por email. Coloca duas questões:\n\n> A- "No Plano de trabalhos, ponto 3, não fala em trabalhos de impermeabilização total do interior das floreiras (Geotêxtil, Isolante Térmico, Barreira anti raízes, Folha de proteção/Membrana de impermeabilização), sendo este plano considerado um trabalho fundamental para não causar infiltrações."\n\n> B- (pedido do condómino do 5.º Dt.º, de 30-07-2025) "Da leitura da vossa proposta, não vemos a descrição dos procedimentos de impermeabilização das floreiras e de reparação de elementos de betão á vista [...] Solicitamos, portanto, que antes do início dos trabalhos sejam apresentados ao condomínio a descrição destes procedimentos e as respetivas fichas técnicas dos materiais. Não vemos também qualquer menção à exclusão da pintura das paredes e tetos das varandas da frente do edifício."\n\nE conclui: "Aguardando resposta às questões colocadas, a fim de poder efetuar o pagamento da adjudicação."\n\n## 03-09-2025, 15:20 — o administrador manda retirar uma pergunta\n\n> "O tecto das varandas está excluído desde o inicio. P.f. retire esse ponto das perguntas. Não inclui esse ponto no meu e-mail de propósito porque isso ficou de inicio excluído, acresce que o texto gera confusão."\n\nÀs 16:20 a administração cumpre: "Agradeço que exclua, na sua prestação de esclarecimentos, o último parágrafo a azul, pois fui informada pelo Sr. Administrador - Dr. Miguel Vassalo - que o teto das varandas ficou excluído desde o início."\n\n## 04-09-2025, 15:40 — a resposta do empreiteiro\n\n> "Conforme solicitado, junto se envia orçamento retificado. Para além da Ficha Técnica no final da folha de orçamento, seguem em anexo PDFs dos fabricantes dos materiais de impermabilização."\n\nO anexo é `Orcamento 010125R - ... - fachadas_em_separado.pdf`, MD5 `c9936e0411f7161db90ea0220f76b4b4`, datado no cabeçalho de 07 de Janeiro de 2025. É esta a versão referida no contrato, e é a única das três que contém o material M004, argamassa Hidrostop Flex.\n\n## 04-09-2025, 16:07 e 16:18 — seguros e pagamento\n\nO empreiteiro envia as apólices de RC e Acidentes de Trabalho. Às 16:18 a administração responde: "Agradeço os documentos enviados e informo que já providenciei o pagamento dos 40% de adjudicação dos trabalhos na fachada tardoz."\n\n## 04-09-2025, 17:31 — a pergunta sobre o IVA\n\n> "Agradeço que me informe se o Iva a aplicar é, na totalidade, a 6%."\n\nA pergunta ocorre uma única vez no thread. Nenhuma das mensagens seguintes lhe responde. Foi feita setenta e três minutos depois de o pagamento estar feito.\n\nNa mesma mensagem, a administração transmite a posição do condómino do 4.º andar sobre a protecção de plantas e bens, e fixa que as técnicas de protecção ficam a cargo do empreiteiro, "pois é suposto numa proposta desta natureza estarem implícitas as boas práticas de proteção de bens e equipamentos que não sejam objeto de pinturas".\n\n## 05-09-2025, 15:28 — reencaminhamento ao acompanhamento técnico\n\nSó nesta data a administração reencaminha a resposta do empreiteiro ao Eng. Jaime Correia, e informa-o de que "O Dr. Miguel Vassalo informou-me que a pintura do teto das varandas está excluída desde o início das negociações com o empreiteiro."\n\n## 08-09-2025, 09:21 — mandato do acompanhamento técnico\n\nMiguel Vassalo responde ao Eng. Jaime Correia:\n\n> "1. A pintura do interior das varandas está, como bem refere excluída desde o início. Essa exclusão inclui as paredes interiores das varandas.\n> 2. Não temos meios técnicos na Adm do Predio para poder efetuar esse controle. [...] pedimos e agradecemos a sua preciosa ajuda nesse controle verificação.\n> 3. [...] Apenas lhe pedimos especial atenção a eventuais incrementos de custos, uma vez que com bem sabe temos os fundos á justa para a obra adjudicada."',
      v_autor
    ) returning id into v_f_esc;
  end if;

  select id into v_f_ft from ia_documental_fontes
   where referencia = 'Anexos ao email do empreiteiro de 04-09-2025, 15:40 — fichas técnicas dos fabricantes';
  if v_f_ft is null then
    insert into ia_documental_fontes
      (tenant_id, titulo, referencia, jurisdicao, ativa, conteudo_resumo, conteudo_markdown, criado_por)
    values (
      v_tenant,
      'Fichas técnicas dos materiais entregues pelo empreiteiro',
      'Anexos ao email do empreiteiro de 04-09-2025, 15:40 — fichas técnicas dos fabricantes',
      'PT', true,
      'Boletins técnicos dos fabricantes dos materiais especificados no orçamento 010125-R, entregues em resposta ao pedido de esclarecimentos dos condóminos. Contêm limitações de utilização que contradizem a aplicação prevista.',
      E'# Fichas técnicas dos materiais — anexos de 04-09-2025\n\n## Hidrostop Flex — SECIL TEK\n\nArgamassa de impermeabilização flexível monocomponente, de base cimentícia.\n\n- Domínio: impermeabilização de estruturas sujeitas a deformações moderadas, incluindo varandas, terraços, coberturas e fundações.\n- Consumo teórico: 1,5 kg/m² por mm de espessura.\n- Água de amassadura: 17,0 ± 1,0 % à talocha; 30,0 ± 1,0 % a rolo ou trincha.\n- Aderência inicial ≥ 0,5 N/mm² (EN 14891); impermeabilidade sob pressão 1,5 bar; resistência à fissuração 0,75 mm.\n- **Limitação determinante:** "O HIDROSTOP FLEX deve estar protegido sempre contra a exposição à radiação U.V."\n\nO orçamento 010125-R prevê duas demãos nas floreiras, sem qualquer camada de protecção sobre elas. Numa floreira exterior, aplicado como camada final, o produto fica exposto à radiação solar contra a indicação expressa do fabricante.\n\n## Polyprep Conversor de Ferrugem 18-205 — CIN\n\n- "A reacção entre o Conversor de Ferrugem e a ferrugem deve estar terminada antes da sobrepintura com qualquer outro produto. [...] caracterizada pelo desenvolvimento de uma cor azul-negro muito intensa."\n- **"Não se recomenda a repintura do Conversor de Ferrugem com produtos de base aquosa uma vez que pode originar manchas na superfície."**\n- "O Conversor de Ferrugem não funcionará sobre ferrugem solta ou estratificada."\n\n## Nováqua HD 10-125 — CIN (revisão Maio 2025)\n\nTinta aquosa. "Trincha e rolo anti-gota: primeira demão diluída a 10 % com água e demãos restantes diluídas a 5 % com água." Número de demãos: 2 a 3.\n\nÉ um produto de base aquosa. Aplicada sobre o Polyprep, cai na situação que o próprio fabricante desaconselha.\n\n## Primário Cinolite 54-850 — CIN\n\n- "Este primário não deve ser aplicado sobre tintas novas ou envelhecidas mal aderentes ao suporte, pois poderá actuar como decapante."\n\n## weberep basic — Saint-Gobain (MOD.FTW.038)\n\nArgamassa para reparação não estrutural de betão, com fibras. Consumo aprox. 16 kg/m² por cm.\n\n- **"Não resiste a eventuais movimentos estruturais do suporte (nestes casos a fissuração é inevitável)."**\n- "Não aplicar sobre zonas pintadas ou com revestimentos orgânicos."\n\n## weberep fer — Saint-Gobain (MOD.FTW.040)\n\nRevestimento anticorrosivo para armaduras em betão armado. Consumo aprox. 300 g/m² por camada.\n\n- "Não aplicar como revestimento de acabamento."\n- "Não aplicar sobre o betão ou argamassa existente."\n\n## Leitura de conjunto\n\nOs materiais entregues são adequados às patologias que nomeiam, mas nenhum deles é um sistema de drenagem. A pergunta A dos condóminos pedia geotêxtil, isolante térmico, barreira anti-raízes e membrana de impermeabilização. O que foi documentado foi uma argamassa cimentícia com exigência de protecção contra UV que o orçamento não prevê.',
      v_autor
    ) returning id into v_f_ft;
  end if;

  select id into v_f_seg from ia_documental_fontes
   where referencia = 'Anexos ao email do empreiteiro de 04-09-2025, 16:07 — apólices RC e Acidentes de Trabalho';
  if v_f_seg is null then
    insert into ia_documental_fontes
      (tenant_id, titulo, referencia, jurisdicao, ativa, conteudo_resumo, conteudo_markdown, criado_por)
    values (
      v_tenant,
      'Apólices de seguro da empreiteira — RC Geral e Acidentes de Trabalho',
      'Anexos ao email do empreiteiro de 04-09-2025, 16:07 — apólices RC e Acidentes de Trabalho',
      'PT', true,
      'Certificado de RC Geral da Allianz e condições particulares do seguro de Acidentes de Trabalho da Generali, ambos em nome de Reinaldo Ferreira - Trabalhos Verticais, Unipessoal, Lda.',
      E'# Apólices de seguro da empreiteira\n\nTomador em ambos os casos: REINALDO FERREIRA TRABALHOS VERTICAIS UNIPESSOAL LDA, NIF 515635952, Travessa dos Bons Amigos 1 S/CV Esq., 2735-082 Agualva-Cacém.\n\n## Responsabilidade Civil Geral — Allianz Portugal, apólice 207658959\n\n- Actividade segura: "Construção e reparação de edificios (Públicos e Privados)".\n- Em vigor desde 02-04-2025 até **02-04-2026**.\n- Limites, por sinistro / por duração / por lesado, âmbito Portugal:\n\n| Risco seguro | Limite |\n| --- | --- |\n| Exploração | 100.000,00 EUR |\n| Proprietário de Imóvel | 100.000,00 EUR |\n| Danos a Bens Vizinhos | 100.000,00 EUR |\n\n- Franquias: Exploração e Proprietário de Imóvel, 10 % com mínimo de 500,00 EUR; Danos a Bens Vizinhos, 10 % com mínimo de 1.250,00 EUR.\n- Certificado emitido em 02-04-2025.\n\n**Nota de vigência:** a cobertura termina em 02-04-2026. Os trabalhos da fachada lateral decorreram depois dessa data — a Factura 2026/4 é de 26-05-2026 e em 09-06-2026 o empreiteiro declara ultrapassada metade dos trabalhos. Não consta do processo comprovativo de renovação. Por confirmar.\n\n## Acidentes de Trabalho — Generali Seguros, apólice 0009218058\n\n- Produto: Acidentes de Trabalho Prémio Fixo. Qualidade: Entidade Patronal.\n- Data de efeito: 17-10-2024. Renovação anual a 22 de Agosto.\n- Prémio anual do contrato: 2.686,97 EUR. Taxa comercial 4,2150 %.\n- Periodicidade trimestral, débito em conta.\n- **N.º de objectos seguros: 5.**\n\n**Nota:** em 26-09-2025 a empreiteira declarou que os trabalhadores estavam a recibos verdes e sem declaração à Segurança Social. Um seguro de Acidentes de Trabalho na qualidade de entidade patronal cobre trabalhadores por conta de outrem. A articulação entre as duas coisas fica por esclarecer, e o número de cinco objectos seguros deve ser confrontado com o número de operários efectivamente em obra.',
      v_autor
    ) returning id into v_f_seg;
  end if;

  select id into v_f_doc from ia_documental_fontes where checksum = '30f29954';
  if v_f_doc is null then
    insert into ia_documental_fontes
      (tenant_id, titulo, referencia, jurisdicao, ativa, checksum, conteudo_resumo, conteudo_markdown, criado_por)
    values (
      v_tenant,
      'Pedido de documentos à empreiteira e aviso de seguro — 25/26-09-2025',
      'Thread "Edifício Europa - Pedido de documentos", 3 mensagens, e aviso Generali P 2025001/05679334',
      'PT', true, '30f29954',
      'A administração pede com urgência o orçamento adjudicado assinado, a lista de trabalhadores, as folhas da Segurança Social e os seguros obrigatórios. O empreiteiro envia apenas um aviso de seguro e declara que os restantes já foram enviados, o que a administração desmente por escrito.',
      E'# Pedido de documentos à empreiteira — 25 e 26 de Setembro de 2025\n\n## 25-09-2025, 22:41 — o pedido\n\n> "Agradeço que me envie, com urgência, o orçamento adjudicado, assinado bem como a lista de trabalhadores afetos à empreitada, folhas da Segurança Social e seguros obrigatórios."\n\nQuatro documentos pedidos. Os trabalhos decorriam desde 01-09-2025 e já tinham sido pagos 22.000,00 EUR.\n\n## 26-09-2025, 15:36 — a resposta\n\n> "Conforme solicitado, junto se envia documento do seguro atualizado. Os restantes já foram enviados em tempo e continuam válidos à presente data."\n\nÉ enviado um único documento: o aviso de prémio da Generali.\n\n## 26-09-2025, 15:44 — o desmentido da administração\n\n> "Quanto ao orçamento assinado, não temos qualquer exemplar com assinatura, pelo que agradeço o respetivo envio. Quanto às folhas da Segurança Social, nunca as recebi, pelo que agradeço o favor de as enviar por esta mesma via."\n\nA afirmação de que os restantes documentos já tinham sido enviados é contrariada, no mesmo dia e por escrito, por quem os teria recebido. Não consta do processo que o orçamento assinado, a lista de trabalhadores ou as folhas da Segurança Social tenham alguma vez sido entregues.\n\n## Aviso Generali P 2025001/05679334, emitido a 09-09-2025\n\n- Apólice 0009218058, Acidentes de Trabalho Prémio Fixo.\n- Período: 09-09-2025 a 21-11-2025. Limite de pagamento 24-09-2025.\n- Valor total a pagar: 183,03 EUR (prémio comercial 170,24 EUR, imposto de selo 8,52 EUR, outros encargos 4,27 EUR).\n- Entidade cobradora: Alegre Mediação Seguros Unipessoal Lda.\n- **N.º Pessoas Seguras: 3.**\n\nAs condições particulares de 17-10-2024 registavam cinco objectos seguros. O aviso relativo ao período em que a obra decorria regista três pessoas seguras. O número de trabalhadores efectivamente em obra não consta do processo, porque a lista pedida nunca foi entregue.',
      v_autor
    ) returning id into v_f_doc;
  end if;

  select id into v_f_11 from ia_documental_fontes where checksum = '054e41f2';
  if v_f_11 is null then
    insert into ia_documental_fontes
      (tenant_id, titulo, referencia, jurisdicao, ativa, checksum, conteudo_resumo, conteudo_markdown, criado_por)
    values (
      v_tenant,
      'Reclamação de ferrugem na floreira do 11.º Esq. e parecer técnico — 08/09-04-2026',
      'Thread "Edifício Europa - Reclamação Obras no 11.º Esq.", 3 mensagens, com 2 fotografias',
      'PT', true, '054e41f2',
      'O acompanhamento técnico do condomínio declara por escrito que a imunização da ferrugem das armaduras de aço não foi bem feita e prescreve a reexecução, identificando os materiais a aplicar.',
      E'# Reclamação de ferrugem na floreira do 11.º Esq.\n\n## 08-04-2026, 16:03 — a reclamação\n\n> "Informo, mais uma vez, que a proprietária do 11.º andar, enviou as fotos anexas da sua varanda do lado esquerdo que ilustram uma mancha ferrugenta na floreira, tendo a parte de cima da varanda manchas da mesma cor. Solicito a deslocação urgente de um operário ao 11.º andar [...] aguardo uma resposta contundente que não seja o habitual OK."\n\nDois anexos fotográficos. É a terceira reclamação sobre a mesma floreira: em 06-11-2025 sobre a parede, em 30-03-2026 sobre tinta saltada, agora sobre ferrugem.\n\n## 08-04-2026, 22:33 — o parecer do acompanhamento técnico\n\nEng. Jaime Correia, dirigindo-se directamente à empreiteira:\n\n> "As fotografias em anexo mostram que a imunização da ferrugem das armaduras de aço não foi bem feita, pelo que deverão picar e raspar a zona em causa, com pelo menos 15 cm para cada lado da zona visível com ferrugem e aplicar de novo o Weberep Fer e depois o Weberep express, seguido do esquema de pintura."\n\nÉ o primeiro documento do processo em que o acompanhamento técnico afirma, sem reservas, que uma parte da execução está mal feita, identifica a causa, delimita a área a intervencionar e prescreve o procedimento correctivo por referência aos materiais do fabricante.\n\n**Nota:** o engenheiro refere weberep fer seguido de weberep express. A lista de materiais do orçamento 010125-R contém weberep basic, não weberep express. A discrepância deve ser esclarecida: ou o engenheiro prescreve um produto diferente do contratado, ou foi aplicado em obra produto distinto do orçamentado.\n\n## 09-04-2026, 16:01 — agradecimento da administração\n\nNão consta do processo resposta da empreiteira, nem registo de que a reparação prescrita tenha sido executada.',
      v_autor
    ) returning id into v_f_11;
  end if;

end $$;

do $$
declare
  v_tenant   uuid;
  v_contrato uuid := '95dad36e-c84d-42ce-aab4-7f376ca83f68';
  v_autor    uuid;
  v_f_jan    uuid;
  v_f_esc    uuid;
  v_f_ft     uuid;
  v_f_seg    uuid;
  v_f_doc    uuid;
  v_f_11     uuid;
  v_f_orig   uuid := '42654204-33cc-4bda-a4f0-ccf98df7964c'; -- MD5 66032d3a
  v_f_reenv  uuid := '15909449-e211-49a4-8cc8-b19ee6c328d8'; -- MD5 b28f4a71
  v_f_final  uuid := '5262c464-dff9-4175-9fba-e493ae32788e'; -- MD5 c9936e04
  v_f_dren   uuid := 'c1b3f100-ec54-47fc-b8a5-64b8785b708e';
  v_f_tec    uuid := '78ac98f1-d2be-4a8e-8522-29d418ef85df';
  v_f_cobr   uuid := '05241d92-2df0-4954-9fa4-baa19eef900d';
  v_ev       uuid;
  v_titulos  text[] := array[
    'Contribuição extraordinária de Janeiro dimensionada em 30.000 EUR já com IVA',
    'Três versões do orçamento 010125 divergem na cláusula de IVA, no prazo e nos materiais',
    'Condóminos condicionam o pagamento da adjudicação a esclarecimentos técnicos',
    'Administrador manda retirar do pedido de esclarecimentos a questão das varandas',
    'Empreiteiro responde com orçamento rectificado e fichas técnicas dos materiais',
    'O orçamento 010125-R foi produzido em Setembro e datado de Janeiro',
    'Sistema de impermeabilização entregue não corresponde ao sistema questionado',
    'Fichas técnicas entregues pelo empreiteiro contradizem a aplicação em floreiras',
    'Pergunta escrita sobre a taxa de IVA nunca respondida, pagamento feito antes',
    'Apólices de responsabilidade civil e acidentes de trabalho entregues',
    'Pedido de esclarecimentos à anterior administração — os 1.800 EUR de IVA da fachada sul',
    'Pedido de esclarecimentos à empreiteira — materiais aplicados e sistema de escoamento',
    'Empreiteiro fixa o IVA em duas taxas repartidas por 60 e 40 por cento',
    'Administração calcula 13.536 EUR com IVA e paga 12.000 EUR sem IVA',
    'Quarto beneficiário terceiro indicado e retirado no mesmo dia',
    'Âmbito do ponto 5 reduzido por resposta, sem correcção do orçamento',
    'Segundo pedido de 6.000 EUR ao mesmo beneficiário, recusado por falta de fundos',
    'Documentos obrigatórios da empreitada pedidos e nunca entregues',
    'Acompanhamento técnico declara defeituosa a imunização das armaduras de aço'
  ];
begin
  -- Guarda idêntica à do bloco anterior: sem o contrato do processo, o
  -- bloco é um no-op numa reconstrução limpa da cadeia.
  select tenant_id into v_tenant from public.contratos where id = v_contrato;
  if v_tenant is null then
    return;
  end if;

  select id into v_f_jan   from ia_documental_fontes where checksum = '671845d6';
  select id into v_f_esc   from ia_documental_fontes where checksum = '88148939';
  select id into v_f_doc   from ia_documental_fontes where checksum = '30f29954';
  select id into v_f_11    from ia_documental_fontes where checksum = '054e41f2';
  select id into v_f_ft    from ia_documental_fontes where referencia = 'Anexos ao email do empreiteiro de 04-09-2025, 15:40 — fichas técnicas dos fabricantes';
  select id into v_f_seg   from ia_documental_fontes where referencia = 'Anexos ao email do empreiteiro de 04-09-2025, 16:07 — apólices RC e Acidentes de Trabalho';

  -- ==================================================================
  -- Limpeza idempotente
  -- ==================================================================
  delete from contrato_memoria_evidencias
   where evento_id in (select id from contrato_memoria_eventos
                        where contrato_id = v_contrato and titulo = any(v_titulos));
  delete from contrato_memoria_eventos
   where contrato_id = v_contrato and titulo = any(v_titulos);

  -- ==================================================================
  -- EVENTOS
  -- ==================================================================

  -- 1 -----------------------------------------------------------------
  insert into contrato_memoria_eventos
    (tenant_id, contrato_id, data_evento, tipo, titulo, resumo, natureza, valor_cents, criado_por)
  values (
    v_tenant, v_contrato, '2025-01-08T14:42:00+00', 'decisao',
    'Contribuição extraordinária de Janeiro dimensionada em 30.000 EUR já com IVA',
    'Em 07-01-2025 às 21:40 Miguel Vassalo comunica à administração que a empreiteira reduziria o preço da fachada sul para trinta mil já com IVA. Menos de dezoito horas depois, em 08-01-2025 às 14:42, a administração distribui o mapa de quotizações extraordinárias de 2025 com um total de exactamente 30.000,00 EUR, repartido em quatro prestações de 7.500,00 EUR a vencer em Fevereiro, Março, Maio e Junho. As fracções de permilagem 40 pagam 1.200,00 EUR anuais, as de permilagem 35 pagam 1.050,00 EUR e as lojas 450,00 EUR. O mapa não tem linha para IVA: o valor angariado junto dos condóminos é o valor negociado, tratado como custo final. Esta cobrança é anterior e distinta da contribuição de 62.000,00 EUR deliberada na AGO n.º 24 e comunicada em 14-04-2025.',
    'facto', 3000000, v_autor
  ) returning id into v_ev;
  insert into contrato_memoria_evidencias (evento_id, fonte_id, localizador, citacao, papel, criado_por) values
    (v_ev, v_f_jan, 'email de 07-01-2025, 21:40', 'Já voltei a falar e vão reduzir o preço da fachada sul para 30 m já com IVA. Vamos ver.', 'primaria', v_autor),
    (v_ev, v_f_jan, 'email de 08-01-2025, 14:42 — linha de totais', 'Se assim fôr teremos a seguinte distribuição de quotas extra: [...] 30 000,00 € | 7 500,00 € | 7 500,00 € | 7 500,00 € | 7 500,00 €', 'corroboracao', v_autor),
    (v_ev, v_f_cobr, 'email de 14-04-2025 — contribuição posterior e distinta', 'Quatro prestações a vencer no último dia de cada trimestre, de Jun/2025 a Mar/2026, totalizando 62.000,00 EUR.', 'corroboracao', v_autor);

  -- 2 -----------------------------------------------------------------
  insert into contrato_memoria_eventos
    (tenant_id, contrato_id, data_evento, tipo, titulo, resumo, natureza, criado_por)
  values (
    v_tenant, v_contrato, '2025-09-04T15:40:00+00', 'conflito',
    'Três versões do orçamento 010125 divergem na cláusula de IVA, no prazo e nos materiais',
    'Circulam no processo três ficheiros distintos sob a mesma referência 010125, distinguidos por checksum MD5. A versão 66032d3a, enviada em 07-01-2025 e comparada em 30-01-2025, é a que a assembleia aceitou: global de 68.700,00 EUR, traseiras a 35.700,00 EUR, prazo de dois meses, materiais M001 a M003 e a cláusula acresce IVA à taxa legal em vigor. A versão b28f4a71, reenviada em 11-06-2025 às 22:11, baixa o global para 63.000,00 EUR e as traseiras para 30.000,00 EUR, mantém o prazo de dois meses e os mesmos três materiais, mas substitui a cláusula por acresce IVA, a combinar. A versão c9936e04, o 010125-R referido no contrato, mantém os valores da anterior, encurta o prazo para 45 dias e acrescenta o material M004, argamassa de impermeabilização Hidrostop Flex SECIL TEK, com duas demãos nas floreiras. Três consequências. Primeira: as três versões, sem excepção, dizem que ao valor apresentado acresce IVA, pelo que os 30.000,00 EUR negociados com IVA incluído nunca entraram em documento. Segunda: a taxa de IVA não é matéria negociável entre as partes, resulta da lei, pelo que uma cláusula que a torna combinável não tem conteúdo legal válido. Terceira: a impermeabilização das floreiras só é especificada na versão final, ou seja, a versão que a assembleia aprovou não a continha.',
    'conflito', v_autor
  ) returning id into v_ev;
  insert into contrato_memoria_evidencias (evento_id, fonte_id, localizador, citacao, papel, criado_por) values
    (v_ev, v_f_orig,  'MD5 66032d3a — rodapé aos valores, prazos e materiais', 'TOTAL (*) 68.700,00 | fachada das traseiras 35.700,00. (*) Aos valores apresentados acresce IVA à taxa legal em vigor. O prazo expectável para a conclusão dos trabalhos após o início é de 2 meses. Materiais M001 rede de fibra de vidro VIPLÁS MI210; M002 massa aquosa ALLTEK EXTERIOR; M003 enchimento de juntas FISCHER PURFLEX.', 'primaria', v_autor),
    (v_ev, v_f_reenv, 'MD5 b28f4a71 — rodapé aos valores, prazos e materiais', 'TOTAL (*) 63.000,00 | fachada das traseiras 30.000,00. (*) Aos valores apresentados acresce IVA, a combinar. O prazo expectável para a conclusão dos trabalhos após o início é de 2 meses. Materiais M001 a M003, sem argamassa de impermeabilização.', 'contradicao', v_autor),
    (v_ev, v_f_final, 'MD5 c9936e04 — rodapé aos valores, prazos e materiais', 'TOTAL (*) 63.000,00 | fachada das traseiras 30.000,00. (*) Aos valores apresentados acresce IVA, a combinar. O prazo expectável para a conclusão dos trabalhos após o início é de 45 dias. M004 Argamassa de impermeabilização Hidrostop Flex SECIL TEK.', 'contradicao', v_autor),
    (v_ev, v_f_jan,   'email de 07-01-2025, 21:40 — o que foi negociado e não foi escrito', 'Já voltei a falar e vão reduzir o preço da fachada sul para 30 m já com IVA.', 'contradicao', v_autor);

  -- 3 -----------------------------------------------------------------
  insert into contrato_memoria_eventos
    (tenant_id, contrato_id, data_evento, tipo, titulo, resumo, natureza, criado_por)
  values (
    v_tenant, v_contrato, '2025-09-03T14:53:00+00', 'comunicacao',
    'Condóminos condicionam o pagamento da adjudicação a esclarecimentos técnicos',
    'A administração escreve ao empreiteiro condicionando expressamente o pagamento dos 40 por cento da adjudicação à prestação de esclarecimentos, e exigindo que a correspondência deixe de ser feita por WhatsApp e passe a ser por email com cópia aos administradores. Coloca duas questões técnicas. A primeira observa que o ponto 3 do plano de trabalhos não prevê impermeabilização total do interior das floreiras, nomeadamente geotêxtil, isolante térmico, barreira anti-raízes e membrana de impermeabilização, e qualifica esses trabalhos como fundamentais para não causar infiltrações. A segunda reproduz o pedido que o condómino do 5.º Dt.º, Eng. Jaime Correia, dirigira ao empreiteiro em 30-07-2025, pedindo a descrição dos procedimentos de impermeabilização das floreiras e de reparação dos elementos de betão à vista, e as respectivas fichas técnicas dos materiais, antes do início dos trabalhos. Os trabalhos tinham começado dois dias antes, em 01-09-2025.',
    'facto', v_autor
  ) returning id into v_ev;
  insert into contrato_memoria_evidencias (evento_id, fonte_id, localizador, citacao, papel, criado_por) values
    (v_ev, v_f_esc, 'email de 03-09-2025, 14:53 — questão A', 'No Plano de trabalhos, ponto 3, não fala em trabalhos de impermeabilização total do interior das floreiras (Geotêxtil, Isolante Térmico, Barreira anti raízes, Folha de proteção/Membrana de impermeabilização), sendo este plano considerado um trabalho fundamental para não causar infiltrações.', 'primaria', v_autor),
    (v_ev, v_f_esc, 'email de 03-09-2025, 14:53 — questão B, citando o pedido de 30-07-2025', 'Solicitamos, portanto, que antes do início dos trabalhos sejam apresentados ao condomínio a descrição destes procedimentos e as respetivas fichas técnicas dos materiais.', 'primaria', v_autor),
    (v_ev, v_f_esc, 'email de 03-09-2025, 14:53 — condição de pagamento', 'Aguardando resposta às questões colocadas, a fim de poder efetuar o pagamento da adjudicação.', 'corroboracao', v_autor);

  -- 4 -----------------------------------------------------------------
  insert into contrato_memoria_eventos
    (tenant_id, contrato_id, data_evento, tipo, titulo, resumo, natureza, criado_por)
  values (
    v_tenant, v_contrato, '2025-09-03T15:20:00+00', 'conflito',
    'Administrador manda retirar do pedido de esclarecimentos a questão das varandas',
    'Vinte e sete minutos depois de a administração enviar ao empreiteiro as questões dos condóminos, Miguel Vassalo escreve-lhe determinando que retire uma delas. A questão retirada é a do condómino do 5.º Dt.º sobre a ausência de menção à exclusão da pintura das paredes e tectos das varandas. Vassalo afirma que a exclusão vigora desde o início e que não incluiu esse ponto no seu email de propósito. Uma hora depois a administração cumpre, pedindo ao empreiteiro que exclua esse parágrafo da sua prestação de esclarecimentos, e em 05-09-2025 comunica ao acompanhamento técnico que a exclusão data do início das negociações. Não consta do processo qualquer documento anterior que registe essa exclusão: nenhuma das três versões do orçamento a menciona, e é precisamente essa ausência que o condómino apontava. A questão suprimida é a mesma que em 26-09-2025 a empreiteira invocaria para declarar as varandas fora do âmbito e propor a sua contratação directa aos condóminos.',
    'conflito', v_autor
  ) returning id into v_ev;
  insert into contrato_memoria_evidencias (evento_id, fonte_id, localizador, citacao, papel, criado_por) values
    (v_ev, v_f_esc, 'email de 03-09-2025, 15:20', 'O tecto das varandas está excluído desde o inicio. P.f. retire esse ponto das perguntas. Não inclui esse ponto no meu e-mail de propósito porque isso ficou de inicio excluído, acresce que o texto gera confusão.', 'primaria', v_autor),
    (v_ev, v_f_esc, 'email de 03-09-2025, 16:20 — cumprimento da instrução', 'Agradeço que exclua, na sua prestação de esclarecimentos, o último parágrafo a azul, pois fui informada pelo Sr. Administrador - Dr. Miguel Vassalo - que o teto das varandas ficou excluído desde o início.', 'corroboracao', v_autor),
    (v_ev, v_f_esc, 'email de 08-09-2025, 09:21 — extensão da exclusão às paredes', 'A pintura do interior das varandas está, como bem refere excluída desde o início. Essa exclusão inclui as paredes interiores das varandas.', 'corroboracao', v_autor),
    (v_ev, v_f_final, 'MD5 c9936e04 — âmbito documentado', 'Nenhuma das três versões do orçamento 010125 menciona a exclusão da pintura das varandas.', 'contradicao', v_autor);

  -- 5 -----------------------------------------------------------------
  insert into contrato_memoria_eventos
    (tenant_id, contrato_id, data_evento, tipo, titulo, resumo, natureza, criado_por)
  values (
    v_tenant, v_contrato, '2025-09-04T15:40:00+00', 'comunicacao',
    'Empreiteiro responde com orçamento rectificado e fichas técnicas dos materiais',
    'O empreiteiro responde ao pedido de esclarecimentos enviando um orçamento rectificado e, em anexo, os boletins técnicos dos fabricantes dos materiais de impermeabilização. Os documentos entregues são o Hidrostop Flex da SECIL TEK, o weberep basic e o weberep fer da Saint-Gobain, e da CIN o Primário Cinolite 54-850, o Polyprep Conversor de Ferrugem 18-205 e a tinta Nováqua HD 10-125. Este registo corrige um evento anterior que descrevia os pedidos de esclarecimento como tendo ficado sem resposta. Houve resposta, no dia seguinte ao pedido ter sido relaiado. O que não houve foi resposta em tempo útil ao pedido original de 30-07-2025, que pedia os documentos antes do início dos trabalhos: os trabalhos começaram a 01-09-2025 e a documentação chegou a 04-09-2025. O Eng. Jaime Correia escreveu em 05-09-2025 que não obtivera resposta porque a administração só lhe reencaminhou os documentos nesse mesmo dia, às 15:28.',
    'facto', v_autor
  ) returning id into v_ev;
  insert into contrato_memoria_evidencias (evento_id, fonte_id, localizador, citacao, papel, criado_por) values
    (v_ev, v_f_esc, 'email de 04-09-2025, 15:40', 'Conforme solicitado, junto se envia orçamento retificado. Para além da Ficha Técnica no final da folha de orçamento, seguem em anexo PDFs dos fabricantes dos materiais de impermabilização.', 'primaria', v_autor),
    (v_ev, v_f_ft,  'anexos do email de 04-09-2025, 15:40', 'Hidrostop Flex SECIL TEK; weberep basic e weberep fer Saint-Gobain; Primário Cinolite 54-850, Polyprep Conversor de Ferrugem 18-205 e Nováqua HD 10-125 da CIN.', 'corroboracao', v_autor),
    (v_ev, v_f_esc, 'email de 05-09-2025, 15:28 — reencaminhamento tardio', 'Questionei o empreiteiro acerca das questões que colocou e obtive a seguinte resposta.', 'corroboracao', v_autor),
    (v_ev, v_f_tec, 'email de 05-09-2025, 13:18 — anterior ao reencaminhamento', 'Não obtivemos ainda resposta ao pedido de esclarecimentos de dia 30-7.', 'contradicao', v_autor);

  -- 6 -----------------------------------------------------------------
  insert into contrato_memoria_eventos
    (tenant_id, contrato_id, data_evento, tipo, titulo, resumo, natureza, criado_por)
  values (
    v_tenant, v_contrato, '2025-09-04T15:41:00+00', 'conflito',
    'O orçamento 010125-R foi produzido em Setembro e datado de Janeiro',
    'O ficheiro anexo ao email de 04-09-2025 às 15:40, apresentado como orçamento rectificado, tem checksum MD5 c9936e04 e é exactamente o mesmo documento identificado no contrato como orçamento n.º 010125-R. No cabeçalho lê-se Agualva-Cacém, 07 de janeiro de 2025. Está portanto datado de oito meses antes da data em que foi efectivamente produzido e entregue. Duas consequências. A primeira é que o documento a que o contrato remete não existia à data que ostenta, e a versão que circulou em Janeiro e foi comparada em 30-01-2025 era outra, de 68.700,00 EUR. A segunda é que a especificação da impermeabilização das floreiras entrou no contrato nesta data e por esta via: a argamassa Hidrostop Flex e a instrução de duas demãos não constam de nenhuma das versões anteriores. Os trabalhos na fachada tardoz tinham começado a 01-09-2025, três dias antes.',
    'conflito', v_autor
  ) returning id into v_ev;
  insert into contrato_memoria_evidencias (evento_id, fonte_id, localizador, citacao, papel, criado_por) values
    (v_ev, v_f_esc,   'email de 04-09-2025, 15:40 — anexo Orcamento 010125R, MD5 c9936e04', 'Conforme solicitado, junto se envia orçamento retificado.', 'primaria', v_autor),
    (v_ev, v_f_final, 'MD5 c9936e04 — cabeçalho', 'Agualva-Cacém, 07 de janeiro de 2025 — ORÇAMENTO N.º 010125-R', 'contradicao', v_autor),
    (v_ev, v_f_reenv, 'MD5 b28f4a71 — versão imediatamente anterior, de 11-06-2025', 'Materiais M001 a M003, sem qualquer argamassa de impermeabilização.', 'corroboracao', v_autor);

  -- 7 -----------------------------------------------------------------
  insert into contrato_memoria_eventos
    (tenant_id, contrato_id, data_evento, tipo, titulo, resumo, natureza, criado_por)
  values (
    v_tenant, v_contrato, '2025-09-04T15:42:00+00', 'conflito',
    'Sistema de impermeabilização entregue não corresponde ao sistema questionado',
    'Os condóminos perguntaram por um sistema de impermeabilização total do interior das floreiras, nomeando quatro camadas: geotêxtil, isolante térmico, barreira anti-raízes e folha de protecção ou membrana de impermeabilização. O que o orçamento rectificado especifica é o tratamento dos ferros, a reparação das floreiras e a aplicação de duas demãos de uma argamassa de impermeabilização cimentícia. Não é o mesmo sistema, e a diferença não é de marca mas de concepção: uma argamassa impermeabiliza uma superfície, um sistema de drenagem conduz a água para fora dela. Verificado por varrimento de termos nos três documentos, nenhuma das versões do orçamento contém as palavras ralo, tubo de queda, caleira, tela, membrana, pendente ou drenagem. A empreitada não previu, em nenhum momento e em nenhuma versão, qualquer elemento de escoamento nas floreiras. As infiltrações reclamadas a partir de Novembro de 2025 no 10.º Esq., e em Fevereiro de 2026 no 3.º Dt.º e no 5.º Dt.º, incidem sobre este ponto.',
    'conflito', v_autor
  ) returning id into v_ev;
  insert into contrato_memoria_evidencias (evento_id, fonte_id, localizador, citacao, papel, criado_por) values
    (v_ev, v_f_esc,   'email de 03-09-2025, 14:53 — o sistema pedido', 'impermeabilização total do interior das floreiras (Geotêxtil, Isolante Térmico, Barreira anti raízes, Folha de proteção/Membrana de impermeabilização), sendo este plano considerado um trabalho fundamental para não causar infiltrações', 'primaria', v_autor),
    (v_ev, v_f_final, 'MD5 c9936e04 — fase 3, o sistema entregue', 'Tratamento dos ferros e reparação das floreiras, aplicação de duas demãos de argamassa de impermeabilização Hidrostop flex.', 'contradicao', v_autor),
    (v_ev, v_f_dren,  'email de 13-12-2025, 10:27 — consequência reclamada', 'Relembro que este problema já tinha sido comunicado e nada foi feito para resolver o mesmo.', 'corroboracao', v_autor);

  -- 8 -----------------------------------------------------------------
  insert into contrato_memoria_eventos
    (tenant_id, contrato_id, data_evento, tipo, titulo, resumo, natureza, criado_por)
  values (
    v_tenant, v_contrato, '2025-09-04T15:43:00+00', 'conflito',
    'Fichas técnicas entregues pelo empreiteiro contradizem a aplicação em floreiras',
    'Os boletins técnicos que o próprio empreiteiro juntou contêm limitações de utilização incompatíveis com o modo como os produtos foram especificados. A ficha do Hidrostop Flex determina que o produto deve estar protegido sempre contra a exposição à radiação ultravioleta. O orçamento prevê duas demãos nas floreiras sem qualquer camada de protecção sobre elas, o que expõe o produto à radiação solar contra a indicação expressa do fabricante. A ficha do Polyprep Conversor de Ferrugem desaconselha a sua repintura com produtos de base aquosa por poder originar manchas na superfície, e a tinta especificada no mesmo sistema, a Nováqua HD, é aquosa e dilui-se em água. É esta a combinação aplicada nos ferros das floreiras, onde em 30-03-2026 se reclamou tinta saltada na floreira do 11.º andar. A ficha do weberep basic adverte que a argamassa não resiste a movimentos estruturais do suporte, sendo nesses casos a fissuração inevitável, o que é relevante para a fissura reclamada na fachada tardoz em 12-01-2026. Estas são leituras dos documentos dos fabricantes, não um parecer pericial: nada aqui prova que a aplicação foi defeituosa, mas fixa quais as perguntas que um perito deve responder.',
    'conflito', v_autor
  ) returning id into v_ev;
  insert into contrato_memoria_evidencias (evento_id, fonte_id, localizador, citacao, papel, criado_por) values
    (v_ev, v_f_ft,    'ficha técnica Hidrostop Flex — domínio de utilização', 'O HIDROSTOP FLEX deve estar protegido sempre contra a exposição à radiação U.V.', 'primaria', v_autor),
    (v_ev, v_f_ft,    'boletim técnico Polyprep Conversor de Ferrugem 18-205, observação 3', 'Não se recomenda a repintura do Conversor de Ferrugem com produtos de base aquosa uma vez que pode originar manchas na superfície.', 'primaria', v_autor),
    (v_ev, v_f_ft,    'boletim técnico Nováqua HD 10-125 — diluição', 'Trincha e rolo anti-gota: primeira demão diluída a 10 % com água e demãos restantes diluídas a 5 % com água.', 'corroboracao', v_autor),
    (v_ev, v_f_ft,    'ficha técnica weberep basic — limites de utilização', 'Não resiste a eventuais movimentos estruturais do suporte (nestes casos a fissuração é inevitável).', 'corroboracao', v_autor),
    (v_ev, v_f_final, 'MD5 c9936e04 — fase 3, ausência de camada de protecção', 'Tratamento dos ferros e reparação das floreiras, aplicação de duas demãos de argamassa de impermeabilização Hidrostop flex.', 'contradicao', v_autor);

  -- 9 -----------------------------------------------------------------
  insert into contrato_memoria_eventos
    (tenant_id, contrato_id, data_evento, tipo, titulo, resumo, natureza, criado_por)
  values (
    v_tenant, v_contrato, '2025-09-04T23:01:00+00', 'conflito',
    'Empreiteiro fixa o IVA em duas taxas repartidas por 60 e 40 por cento',
    'Respondendo à pergunta da administração sobre se o IVA seria de 6 por cento na totalidade, o empreiteiro escreve que o IVA a cobrar será falado e acertado em cada pagamento, e que numa obra desta natureza se calcula aplicando 6 por cento sobre 60 por cento dos valores, relativos a mão de obra, e 23 por cento sobre os restantes 40 por cento, relativos a materiais. É esta a explicitação prática da cláusula acresce IVA, a combinar. A fórmula tem três problemas. Primeiro, a taxa aplicável a uma empreitada não se negoceia nem se acerta em cada pagamento: resulta da lei. Segundo, a verba 2.27 da Lista I anexa ao Código do IVA sujeita a 6 por cento a totalidade da empreitada de reabilitação, e não uma fracção dela, desde que o valor dos materiais incorporados não exceda 20 por cento do valor global da prestação. Ao afirmar que os materiais representam 40 por cento, o empreiteiro afasta o pressuposto da própria verba que invoca: se assim fosse, a taxa aplicável seria 23 por cento sobre a totalidade, e não sobre uma parte. Terceiro, a fórmula produz uma taxa efectiva de 12,8 por cento, a que corresponderia um total de 33.840,00 EUR na fachada das traseiras, contra os 30.000,00 EUR negociados com IVA incluído e cobrados aos condóminos.',
    'conflito', v_autor
  ) returning id into v_ev;
  insert into contrato_memoria_evidencias (evento_id, fonte_id, localizador, citacao, papel, criado_por) values
    (v_ev, v_f_esc, 'email de 04-09-2025, 17:31 — a pergunta da administração', 'Agradeço que me informe se o Iva a aplicar é, na totalidade, a 6%.', 'primaria', v_autor),
    (v_ev, v_f_esc, 'email de 04-09-2025, 23:01 — a resposta do empreiteiro', 'Quanto ao IVA a cobrar falaremos e acertaremos em cada pagamento, mas numa obra desta natureza a aplicação do IVA é calculada dentro dos seguintes parâmetros: 6% de IVA sobre 60% dos valores apresentados, relativos a mão de obra; 23% de IVA sobre 40% dos valores apresentados, relativos aos materiais.', 'primaria', v_autor),
    (v_ev, v_f_final, 'MD5 c9936e04 — cláusula que a fórmula concretiza', 'Aos valores apresentados acresce IVA, a combinar.', 'corroboracao', v_autor),
    (v_ev, v_f_jan, 'email de 07-01-2025, 21:40 — o que fora negociado', 'vão reduzir o preço da fachada sul para 30 m já com IVA', 'contradicao', v_autor);

  -- 10 ----------------------------------------------------------------
  insert into contrato_memoria_eventos
    (tenant_id, contrato_id, data_evento, tipo, titulo, resumo, natureza, valor_cents, criado_por)
  values (
    v_tenant, v_contrato, '2025-09-05T13:10:00+00', 'conflito',
    'Administração calcula 13.536 EUR com IVA e paga 12.000 EUR sem IVA',
    'Aplicando a fórmula que o empreiteiro comunicara na véspera, Carlos Reis calcula que a primeira tranche seria de 13.536,00 EUR e pede à administração que confirme junto do empreiteiro se é esse o valor a transferir, notando que a empresa não validou o valor com IVA. O valor confere: 12.000,00 EUR acrescidos de 12,8 por cento dão exactamente 13.536,00 EUR, o que confirma que a fórmula das duas taxas foi entendida e aplicada pela administração. O que foi efectivamente pago foram 12.000,00 EUR. E assim se manteve em todos os pagamentos seguintes: 12.000,00, 2.000,00, 4.000,00, 6.000,00, 6.000,00 e 3.000,00 EUR, somando 45.000,00 EUR em valores redondos, sem uma única linha de IVA e sem uma única factura. O primeiro e único pagamento do processo que incorpora IVA é o de 6.360,00 EUR de 11-06-2026, correspondente a 6.000,00 EUR acrescidos de 6 por cento, e é também o primeiro que tem factura associada, a 2026/4. Ou seja: quando existe factura, a taxa praticada é 6 por cento sobre a totalidade, e não 12,8 por cento. Fica por esclarecer o tratamento fiscal dos 45.000,00 EUR pagos sem factura.',
    'pendente', 1353600, v_autor
  ) returning id into v_ev;
  insert into contrato_memoria_evidencias (evento_id, fonte_id, localizador, citacao, papel, criado_por) values
    (v_ev, v_f_esc, 'email de 05-09-2025, 11:39', 'Miguel, o montante a transferir serão os €12.000,00 ou os 12 mil + IVA? Qual a sua opinião?', 'primaria', v_autor),
    (v_ev, v_f_esc, 'email de 05-09-2025, 13:10', 'Eles não validaram o valor a transferir com o IVA. No e-mail que eles enviaram questione por favor se sempre serão os € 13.536,00 a transferir para a conta indicada de Robert Gian Julio.', 'primaria', v_autor),
    (v_ev, v_f_esc, 'email de 04-09-2025, 23:01 — fórmula que gera o valor', '6% de IVA sobre 60% dos valores apresentados [...] 23% de IVA sobre 40% dos valores apresentados', 'corroboracao', v_autor);

  -- 11 ----------------------------------------------------------------
  insert into contrato_memoria_eventos
    (tenant_id, contrato_id, data_evento, tipo, titulo, resumo, natureza, criado_por)
  values (
    v_tenant, v_contrato, '2025-09-05T10:08:00+00', 'conflito',
    'Quarto beneficiário terceiro indicado e retirado no mesmo dia',
    'Em 05-09-2025 às 10:08 o empreiteiro envia à administração um IBAN em nome de Danilo Lopes Bandeca, para pagamento da adjudicação da fachada tardoz. Carlos Reis assinala às 11:39 a contradição com o pedido recebido na véspera, que apontava Robert Gian Júlio, e pede que lhe seja indicada a conta e a titularidade correctas. Às 13:03 o empreiteiro emite uma mensagem intitulada IMPORTANTE - Retificação de IBAN e titular da conta, declarando que por lapso foi enviado um IBAN e nome de titular errados e pedindo que se desconsidere o anterior, e indica então PT50 0007 0000 0068 3620 3052 3 em nome de Robert Gian Júlio. É este o quarto nome de pessoa singular associado a pagamentos da obra, a juntar a Robert Gian ou Guan Júlio, Wagner Ottoni Nascimento e Gustavo José Matias da Silva. Nenhum deles é a sociedade adjudicatária, e o pedido original chegara por WhatsApp, prática que a administração pedira expressamente para cessar em 03-09-2025.',
    'conflito', v_autor
  ) returning id into v_ev;
  insert into contrato_memoria_evidencias (evento_id, fonte_id, localizador, citacao, papel, criado_por) values
    (v_ev, v_f_esc, 'email de 05-09-2025, 10:08', 'Para os devidos efeitos, segue IBAN, em nome de Danilo Lopes Bandeca.', 'primaria', v_autor),
    (v_ev, v_f_esc, 'email de 05-09-2025, 11:39 — detecção pela administração', 'ontem à tarde veio um e-mail para se transferir para um ROBERT GIAN JULIO e neste e-mail está indicada uma conta para um DANILO LOPES BANDECA', 'corroboracao', v_autor),
    (v_ev, v_f_esc, 'email de 05-09-2025, 13:03 — rectificação', 'Por lapso, foi enviado um IBAN e nome do titular errado, para a obra em questão. Peço-lhes que desconsiderem o anterior e seja considerado o seguinte IBAN [...] Em nome de: Robert Gian Júlio', 'corroboracao', v_autor),
    (v_ev, v_f_esc, 'email de 03-09-2025, 14:53 — pedido de cessação do WhatsApp', 'agradeço que toda a correspondência seja trocada através deste endereço de e-mail c/cópia para os senhores administradores, e não pelo Whatsapp', 'corroboracao', v_autor);

  -- 12 ----------------------------------------------------------------
  insert into contrato_memoria_eventos
    (tenant_id, contrato_id, data_evento, tipo, titulo, resumo, natureza, criado_por)
  values (
    v_tenant, v_contrato, '2025-09-04T16:07:00+00', 'garantia',
    'Apólices de responsabilidade civil e acidentes de trabalho entregues',
    'O empreiteiro remete, a pedido reiterado da administração, a documentação dos seguros. A responsabilidade civil geral está coberta pela apólice 207658959 da Allianz Portugal, com actividade segura de construção e reparação de edifícios, em vigor de 02-04-2025 a 02-04-2026, com limites de 100.000,00 EUR por sinistro, por duração e por lesado nas coberturas de exploração, proprietário de imóvel e danos a bens vizinhos, com franquias de 10 por cento e mínimos de 500,00 EUR e, nos danos a bens vizinhos, de 1.250,00 EUR. Os acidentes de trabalho estão cobertos pela apólice 0009218058 da Generali, na qualidade de entidade patronal, com efeito a 17-10-2024, renovação anual a 22 de Agosto, prémio anual de 2.686,97 EUR e cinco objectos seguros. Duas pendências. A cobertura de responsabilidade civil termina em 02-04-2026, e os trabalhos da fachada lateral decorreram depois dessa data, sem que conste do processo comprovativo de renovação. E em 26-09-2025 a empreiteira declarou que os trabalhadores estavam a recibos verdes e sem declaração à Segurança Social, o que não se concilia com um seguro subscrito na qualidade de entidade patronal para cinco pessoas seguras.',
    'pendente', v_autor
  ) returning id into v_ev;
  insert into contrato_memoria_evidencias (evento_id, fonte_id, localizador, citacao, papel, criado_por) values
    (v_ev, v_f_esc, 'email de 04-09-2025, 16:07', 'Conforme solicitado, junto se envia documentação relativa aos seguros RC e Acidentes Pessoais.', 'primaria', v_autor),
    (v_ev, v_f_seg, 'apólice Allianz 207658959 — vigência e limites', 'Em vigor desde as 17:52 horas de 02/04/2025 até às 00:00 horas de 02/04/2026. Exploração 100.000,00; Proprietário de Imóvel 100.000,00; Danos a Bens Vizinhos 100.000,00.', 'corroboracao', v_autor),
    (v_ev, v_f_seg, 'apólice Generali 0009218058 — qualidade e objectos seguros', 'Qualidade em que efetua o seguro: Entidade Patronal. N.º Objetos seguros: 5.', 'corroboracao', v_autor);

  -- 13 ----------------------------------------------------------------
  insert into contrato_memoria_eventos
    (tenant_id, contrato_id, data_evento, tipo, titulo, resumo, natureza, criado_por)
  values (
    v_tenant, v_contrato, '2025-09-15T21:14:00+00', 'conflito',
    'Âmbito do ponto 5 reduzido por resposta, sem correcção do orçamento',
    'A administração pede ao empreiteiro que esclareça a que grades de ferro se refere o ponto 5 do orçamento da fachada tardoz, que está redigido como tratamento e pintura de estendais e grades em ferro. Antes do envio, Miguel Vassalo instrui a administração a colocar a questão de forma aberta. O empreiteiro responde que se trata do tratamento e pintura dos estendais a tardoz, conforme fotografia em anexo, omitindo as grades em ferro. A administração agradece a resposta e transmite-a à condómina que a suscitara, sem pedir a correcção do orçamento nem obter confirmação de que as grades ficam ou não incluídas. O ponto 5 do documento contratual continua a dizer estendais e grades em ferro. Fica assim por escrito uma redução de âmbito operada por interpretação e aceite por silêncio, relativa precisamente aos elementos ferrosos cuja corrosão a fase 3 mandava tratar nas floreiras.',
    'conflito', v_autor
  ) returning id into v_ev;
  insert into contrato_memoria_evidencias (evento_id, fonte_id, localizador, citacao, papel, criado_por) values
    (v_ev, v_f_final, 'MD5 c9936e04 — ponto 5 do mapa de trabalhos da fachada tardoz', 'Tratamento e pintura de estendais e grades em ferro', 'primaria', v_autor),
    (v_ev, v_f_esc,   'thread Pedido de esclarecimento, resposta de 15-09-2025, 21:14', 'Em resposta ao solicitado, esclarece-se que se trata do tratamento e pintura dos estendais a tardoz, conforme fotografia em anexo.', 'contradicao', v_autor),
    (v_ev, v_f_esc,   'thread Pedido de esclarecimento, email de 12-09-2025, 16:54', 'Sugiro que coloque uma questão aberta, i.e. A que grades de ferro se referem.', 'corroboracao', v_autor);

  -- 14 ----------------------------------------------------------------
  insert into contrato_memoria_eventos
    (tenant_id, contrato_id, data_evento, tipo, titulo, resumo, natureza, valor_cents, criado_por)
  values (
    v_tenant, v_contrato, '2025-12-11T15:26:00+00', 'conflito',
    'Segundo pedido de 6.000 EUR ao mesmo beneficiário, recusado por falta de fundos',
    'Dois dias depois de receber os 6.000,00 EUR da tranche final da fachada tardoz, o empreiteiro pede nova transferência de 6.000,00 EUR para o mesmo beneficiário terceiro, Gustavo José Matias da Silva, através de um IBAN distinto do usado a 09-12-2025, declarando corresponder a 40 por cento relativos a metade da parte da frente do edifício. A administração responde aos administradores que não está em condições de pagar, e transcreve o extracto: o saldo da conta do condomínio nesse dia é de 5.782,01 EUR. Dois pontos ficam registados. O primeiro é a fragmentação do objecto: metade de uma fachada não é uma unidade prevista em nenhuma versão do orçamento, que reparte por fachada inteira. O segundo é que o empreiteiro pede 40 por cento de adjudicação de uma fachada que ainda não fora adjudicada e cuja tranche final da anterior acabara de ser liquidada dois dias antes.',
    'conflito', 600000, v_autor
  ) returning id into v_ev;
  insert into contrato_memoria_evidencias (evento_id, fonte_id, localizador, citacao, papel, criado_por) values
    (v_ev, v_f_esc, 'thread Envio de dados para pagamento, email de 11-12-2025, 15:26', 'Conforme contratado, junto se enviam dados para tansferência do valor de 6.000,00€, correspondente a 40% relativos a metade da parte da frente do edifício', 'primaria', v_autor),
    (v_ev, v_f_esc, 'thread Envio de dados para pagamento, resposta da administração', 'Recebi este e-mail do empreiteiro mas, para já, não estamos em condições de pagar os 6.000,00€. [...] O saldo da conta, hoje, é de 5.782,01€.', 'corroboracao', v_autor);

  -- 15 ----------------------------------------------------------------
  insert into contrato_memoria_eventos
    (tenant_id, contrato_id, data_evento, tipo, titulo, resumo, natureza, criado_por)
  values (
    v_tenant, v_contrato, '2025-09-26T15:36:00+00', 'conflito',
    'Documentos obrigatórios da empreitada pedidos e nunca entregues',
    'Em 25-09-2025 a administração pede com urgência quatro documentos: o orçamento adjudicado assinado, a lista de trabalhadores afectos à empreitada, as folhas da Segurança Social e os seguros obrigatórios. O empreiteiro responde no dia seguinte enviando um único documento, um aviso de prémio de seguro, e declarando que os restantes já foram enviados em tempo e continuam válidos. Oito minutos depois a administração desmente-o por escrito, afirmando que não tem qualquer exemplar do orçamento com assinatura e que nunca recebeu as folhas da Segurança Social. Não consta do processo que algum destes três documentos tenha sido alguma vez entregue. À data do pedido os trabalhos decorriam há quase um mês e tinham sido pagos 22.000,00 EUR. O aviso de seguro entregue regista três pessoas seguras, contra os cinco objectos seguros das condições particulares de Outubro de 2024; sem a lista de trabalhadores, o número de operários efectivamente em obra não é verificável.',
    'conflito', v_autor
  ) returning id into v_ev;
  insert into contrato_memoria_evidencias (evento_id, fonte_id, localizador, citacao, papel, criado_por) values
    (v_ev, v_f_doc, 'email de 25-09-2025, 22:41', 'Agradeço que me envie, com urgência, o orçamento adjudicado, assinado bem como a lista de trabalhadores afetos à empreitada, folhas da Segurança Social e seguros obrigatórios.', 'primaria', v_autor),
    (v_ev, v_f_doc, 'email de 26-09-2025, 15:36', 'Conforme solicitado, junto se envia documento do seguro atualizado. Os restantes já foram enviados em tempo e continuam válidos à presente data.', 'contradicao', v_autor),
    (v_ev, v_f_doc, 'email de 26-09-2025, 15:44', 'Quanto ao orçamento assinado, não temos qualquer exemplar com assinatura [...] Quanto às folhas da Segurança Social, nunca as recebi.', 'primaria', v_autor),
    (v_ev, v_f_doc, 'aviso Generali P 2025001/05679334, período 09-09 a 21-11-2025', 'N.º Pessoas Seguras: 3', 'corroboracao', v_autor),
    (v_ev, v_f_seg, 'condições particulares Generali de 17-10-2024', 'N.º Objetos seguros: 5', 'contradicao', v_autor);

  -- 16 ----------------------------------------------------------------
  insert into contrato_memoria_eventos
    (tenant_id, contrato_id, data_evento, tipo, titulo, resumo, natureza, criado_por)
  values (
    v_tenant, v_contrato, '2026-04-08T22:33:00+00', 'conflito',
    'Acompanhamento técnico declara defeituosa a imunização das armaduras de aço',
    'Perante fotografias de mancha de ferrugem na floreira do 11.º Esq. e manchas da mesma cor na parte superior da varanda, o Eng. Jaime Correia escreve directamente à empreiteira que a imunização da ferrugem das armaduras de aço não foi bem feita, e prescreve a reexecução: picar e raspar a zona, com pelo menos quinze centímetros para cada lado da zona visível com ferrugem, aplicar de novo o Weberep Fer e depois o Weberep express, e refazer o esquema de pintura. É o primeiro documento do processo em que o acompanhamento técnico do condomínio qualifica sem reservas uma parte da execução como defeituosa, identifica a causa e delimita a correcção. Vale como parecer técnico sobre a fase 3 da empreitada, tratamento dos ferros das floreiras, e articula-se com as três reclamações sucessivas sobre a mesma floreira, em 06-11-2025, 30-03-2026 e agora. Fica ainda por esclarecer que o engenheiro prescreva weberep express quando a lista de materiais do orçamento regista weberep basic. Não consta do processo resposta da empreiteira nem registo de que a reparação tenha sido executada.',
    'conflito', v_autor
  ) returning id into v_ev;
  insert into contrato_memoria_evidencias (evento_id, fonte_id, localizador, citacao, papel, criado_por) values
    (v_ev, v_f_11, 'email do acompanhamento técnico de 08-04-2026, 22:33', 'As fotografias em anexo mostram que a imunização da ferrugem das armaduras de aço não foi bem feita, pelo que deverão picar e raspar a zona em causa, com pelo menos 15 cm para cada lado da zona visível com ferrugem e aplicar de novo o Weberep Fer e depois o Weberep express, seguido do esquema de pintura.', 'primaria', v_autor),
    (v_ev, v_f_11, 'email da administração de 08-04-2026, 16:03', 'as fotos anexas da sua varanda do lado esquerdo que ilustram uma mancha ferrugenta na floreira, tendo a parte de cima da varanda manchas da mesma cor', 'corroboracao', v_autor),
    (v_ev, v_f_final, 'MD5 c9936e04 — fase 3 e lista de materiais', 'Tratamento dos ferros e reparação das floreiras [...] M004 Argamassa de impermeabilização Hidrostop Flex SECIL TEK', 'corroboracao', v_autor),
    (v_ev, v_f_ft, 'boletim técnico Polyprep Conversor de Ferrugem 18-205', 'Não se recomenda a repintura do Conversor de Ferrugem com produtos de base aquosa uma vez que pode originar manchas na superfície.', 'corroboracao', v_autor);

  -- 17 — PEDIDO DE ESCLARECIMENTOS À ANTERIOR ADMINISTRAÇÃO ----------
  insert into contrato_memoria_eventos
    (tenant_id, contrato_id, data_evento, tipo, titulo, resumo, natureza, valor_cents, criado_por)
  values (
    v_tenant, v_contrato, '2026-08-24T12:00:00+00', 'decisao',
    'Pedido de esclarecimentos à anterior administração — os 1.800 EUR de IVA da fachada sul',
    'Os 30.000,00 EUR já com IVA não constam de documento nenhum. Foram negociados verbalmente e comunicados por email em 07-01-2025 às 21:40, e no dia seguinte a contribuição extraordinária foi dimensionada em exactamente 30.000,00 EUR, sem linha de IVA. Mas as três versões do orçamento 010125 dizem, todas, que ao valor apresentado acresce IVA. O que foi negociado nunca entrou em papel, e é nesse intervalo que vivem os 1.800,00 EUR correspondentes a 6 por cento sobre 30.000,00 EUR. A exposição pode ser maior: a fórmula que o empreiteiro comunicou em 04-09-2025, de 6 por cento sobre 60 por cento e 23 por cento sobre 40 por cento, produz uma taxa efectiva de 12,8 por cento e um total de 33.840,00 EUR na mesma fachada. A administração chegou a calcular 13.536,00 EUR para a primeira tranche e pagou 12.000,00 EUR. Todos os 45.000,00 EUR pagos até Fevereiro de 2026 o foram em valores redondos, sem IVA e sem factura. O único pagamento do processo com IVA é o de 6.360,00 EUR de 11-06-2026, que corresponde a 6 por cento sobre 6.000,00 EUR e é o primeiro a ter factura associada. Perguntas a dirigir a Miguel Mexia Vassalo e a Maria João Santos, enquanto administração cessante. Primeira, com quem foi feita a negociação de 07-01-2025 e existe registo escrito dessa conversa. Segunda, por que razão a redução acordada com IVA incluído nunca foi vertida para o orçamento, apesar de terem circulado duas versões revistas depois dessa data. Terceira, o que foi combinado ao abrigo da cláusula acresce IVA, a combinar, e por que motivo a fórmula das duas taxas comunicada pelo empreiteiro não foi contestada. Quarta, os 30.000,00 EUR cobrados aos condóminos em quatro prestações de 7.500,00 EUR destinavam-se a cobrir a fachada com IVA ou sem IVA. Quinta, foram alguma vez emitidas facturas das fachadas tardoz e da frente e, em caso afirmativo, com que base tributável e que taxa. Sexta, se não foram emitidas, com que fundamento se pagaram 45.000,00 EUR sem documento fiscal e a titulares que não são a sociedade adjudicatária. A pendência só se fecha com as facturas em falta.',
    'pendente', 180000, v_autor
  ) returning id into v_ev;
  insert into contrato_memoria_evidencias (evento_id, fonte_id, localizador, citacao, papel, criado_por) values
    (v_ev, v_f_jan,   'email de 07-01-2025, 21:40', 'Já voltei a falar e vão reduzir o preço da fachada sul para 30 m já com IVA. Vamos ver.', 'primaria', v_autor),
    (v_ev, v_f_jan,   'email de 08-01-2025, 14:42 — total do mapa de quotas extra', 'Se assim fôr teremos a seguinte distribuição de quotas extra: [...] total 30 000,00 €, em quatro prestações de 7 500,00 €.', 'corroboracao', v_autor),
    (v_ev, v_f_final, 'MD5 c9936e04 — quadro da fachada das traseiras e rodapé', 'TOTAL (*) 30.000,00. (*) Aos valores apresentados acresce IVA, a combinar.', 'contradicao', v_autor),
    (v_ev, v_f_orig,  'MD5 66032d3a — rodapé aos valores', 'Aos valores apresentados acresce IVA à taxa legal em vigor.', 'contradicao', v_autor),
    (v_ev, v_f_reenv, 'MD5 b28f4a71 — rodapé aos valores', 'Aos valores apresentados acresce IVA, a combinar.', 'contradicao', v_autor),
    (v_ev, v_f_esc,   'email de 04-09-2025, 17:31 — pergunta da administração', 'Agradeço que me informe se o Iva a aplicar é, na totalidade, a 6%.', 'corroboracao', v_autor),
    (v_ev, v_f_esc,   'email de 04-09-2025, 23:01 — fórmula do empreiteiro', '6% de IVA sobre 60% dos valores apresentados, relativos a mão de obra; 23% de IVA sobre 40% dos valores apresentados, relativos aos materiais.', 'corroboracao', v_autor),
    (v_ev, v_f_esc,   'email de 05-09-2025, 13:10 — cálculo da administração', 'questione por favor se sempre serão os € 13.536,00 a transferir', 'corroboracao', v_autor);

  -- 18 — PEDIDO DE ESCLARECIMENTOS À EMPREITEIRA ---------------------
  insert into contrato_memoria_eventos
    (tenant_id, contrato_id, data_evento, tipo, titulo, resumo, natureza, criado_por)
  values (
    v_tenant, v_contrato, '2026-08-24T12:00:00+00', 'decisao',
    'Pedido de esclarecimentos à empreiteira — materiais aplicados e sistema de escoamento',
    'Em 09-02-2026 a administração escreve que, se a entrada de água resultar de alteração ineficiente do sistema de escoamento das varandas, terá de ser pedida responsabilidade a quem alterou o sistema. A afirmação levanta uma questão que a documentação contratual não permite responder. O que os documentos mostram é o seguinte. A impermeabilização das floreiras só foi especificada na versão do orçamento produzida em 04-09-2025, três dias depois de os trabalhos terem começado, e consiste numa argamassa cimentícia, o Hidrostop Flex, e não no sistema de quatro camadas que os condóminos tinham perguntado. Nenhuma das três versões do orçamento contém as palavras ralo, tubo de queda, caleira, tela, membrana, pendente ou drenagem. A ficha técnica do Hidrostop Flex, entregue pela própria empreiteira, exige que o produto esteja sempre protegido contra a radiação ultravioleta, protecção que o orçamento não prevê. A ficha do conversor de ferrugem desaconselha a repintura com produtos aquosos, e a tinta do mesmo sistema é aquosa. Em 08-04-2026 o acompanhamento técnico declarou que a imunização da ferrugem das armaduras de aço não foi bem feita. E a cláusula de materiais permite substituição unilateral por rotura de stock, sem obrigação de comunicar. Perguntas a dirigir a Reinaldo Ferreira - Trabalhos Verticais, Unipessoal, Lda. Primeira, que produtos foram efectivamente aplicados nas floreiras, em que quantidade e em quantas demãos, e que camada de protecção anti-ultravioleta foi executada sobre o Hidrostop Flex. Segunda, houve substituição de algum material face ao especificado e, em caso afirmativo, qual, com que fundamento e ao abrigo de que cláusula. Terceira, foi removido, selado, tapado ou deslocado algum ralo, tubo de queda, pingadeira ou orifício de drenagem das floreiras ou das varandas, ou alterada alguma pendente. Quarta, o enchimento de juntas foi aplicado em algum ponto que servisse de escoamento, nomeadamente furos de drenagem de caixilharia ou juntas de pingadeira. Quinta, entrega dos registos de aplicação e das facturas de compra dos materiais efectivamente incorporados na obra, que permitem confrontar quantidades aplicadas com áreas tratadas. Sexta, foi aplicado weberep basic ou weberep express nas armaduras, e porque prescreve o acompanhamento técnico um produto que não consta da lista de materiais. Sétima, entrega do orçamento adjudicado assinado, da lista de trabalhadores afectos à empreitada e das folhas da Segurança Social, pedidos em 25-09-2025 e nunca entregues. Não se afirma que houve alteração de materiais ou do escoamento. Afirma-se que a documentação contratual não permite verificá-lo e que é a empreiteira quem detém a informação.',
    'pendente', v_autor
  ) returning id into v_ev;
  insert into contrato_memoria_evidencias (evento_id, fonte_id, localizador, citacao, papel, criado_por) values
    (v_ev, v_f_dren,  'email de 09-02-2026, 16:41', 'Se a entrada de água é devida a uma alteração ineficiente por alteração do sistema de escoamento das varandas, então temos de pedir responsabilidade a quem alterou o sistema.', 'primaria', v_autor),
    (v_ev, v_f_esc,   'email de 03-09-2025, 14:53 — o sistema perguntado', 'impermeabilização total do interior das floreiras (Geotêxtil, Isolante Térmico, Barreira anti raízes, Folha de proteção/Membrana de impermeabilização)', 'primaria', v_autor),
    (v_ev, v_f_final, 'MD5 c9936e04 — fase 3, o sistema especificado', 'Tratamento dos ferros e reparação das floreiras, aplicação de duas demãos de argamassa de impermeabilização Hidrostop flex.', 'contradicao', v_autor),
    (v_ev, v_f_ft,    'ficha técnica Hidrostop Flex — domínio de utilização', 'O HIDROSTOP FLEX deve estar protegido sempre contra a exposição à radiação U.V.', 'contradicao', v_autor),
    (v_ev, v_f_ft,    'boletim técnico Polyprep Conversor de Ferrugem 18-205, observação 3', 'Não se recomenda a repintura do Conversor de Ferrugem com produtos de base aquosa uma vez que pode originar manchas na superfície.', 'contradicao', v_autor),
    (v_ev, v_f_final, 'MD5 c9936e04 — cláusula de materiais', 'Todos os primários e tintas são de marca CIN ou DIRUP e de qualidade superior. Salvaguarda-se eventual rotura de stock, podendo, a acontecer, ser substituídas por outras marcas de qualidade igual ou superior.', 'contradicao', v_autor),
    (v_ev, v_f_11,    'parecer do acompanhamento técnico de 08-04-2026, 22:33', 'As fotografias em anexo mostram que a imunização da ferrugem das armaduras de aço não foi bem feita.', 'corroboracao', v_autor),
    (v_ev, v_f_doc,   'email de 26-09-2025, 15:44 — documentos em falta', 'Quanto ao orçamento assinado, não temos qualquer exemplar com assinatura [...] Quanto às folhas da Segurança Social, nunca as recebi.', 'corroboracao', v_autor);

  -- ==================================================================
  -- CORRECÇÃO DO EVENTO ad12fb01
  -- ==================================================================
  update contrato_memoria_eventos
     set titulo = 'Esclarecimentos técnicos pedidos antes da obra e prestados depois de a obra começar',
         resumo = 'O condómino do 5.º Dt.º, Eng. Jaime Correia, pediu em 30-07-2025 que fossem apresentados ao condomínio, antes do início dos trabalhos, a descrição dos procedimentos de impermeabilização das floreiras e de reparação dos elementos de betão à vista, e as respectivas fichas técnicas dos materiais. Os trabalhos começaram a 01-09-2025 sem que qualquer desses documentos tivesse sido apresentado. Só em 03-09-2025, e por a administração ter condicionado o pagamento dos 40 por cento à resposta, o pedido foi relaiado à empreiteira, que respondeu a 04-09-2025 enviando um orçamento rectificado e os boletins técnicos dos fabricantes. O engenheiro escreveu em 05-09-2025 que não obtivera resposta porque a administração só lhe reencaminhou os documentos nesse mesmo dia, às 15:28. Este evento foi rectificado: a redacção anterior descrevia os pedidos como tendo ficado sem resposta, o que os documentos desmentem. O incumprimento não foi a ausência de resposta, foi a sua tempestividade — a documentação que devia condicionar o início da obra chegou com a obra em curso e depois de o primeiro pagamento estar decidido.',
         natureza = 'conflito',
         atualizado_em = now()
   where id = 'ad12fb01-71c7-46d8-a5f9-632af72b532c';
end $$;
