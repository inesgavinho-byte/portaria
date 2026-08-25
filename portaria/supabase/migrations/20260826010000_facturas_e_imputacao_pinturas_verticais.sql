-- Facturas da fachada lateral e imputação controvertida do pagamento de 11/06.
--
-- ====================================================================
-- O QUE ESTE FICHEIRO REGISTA
-- ====================================================================
-- 1. A decomposição fiscal das três facturas, com ATCUD, contra o PDF original.
-- 2. O que o processo NÃO tem: facturas da frente e da tardoz.
-- 3. As características comuns às três facturas — adquirente, descrição,
--    vencimento, taxa de IVA — como factos documentais.
-- 4. As duas posições sobre a imputação do débito de 11/06/2026, cada uma
--    atribuída à parte que a sustenta.
--
-- Nada aqui qualifica seja o que for como infracção fiscal. Regista-se o que os
-- documentos dizem; a qualificação depende de elementos que o processo não tem
-- e de quem tenha competência para a fazer.
--
-- Idempotente: cada inserção é guardada por `not exists` sobre a chave natural
-- (contrato + título do acontecimento), e as evidências por `on conflict`.

-- ====================================================================
-- 0. A emissão da 2026/7 passa a referenciar a sua factura
-- ====================================================================
-- As emissões da 2026/4 e da 2026/8 já apontam para a respectiva despesa; a da
-- 2026/7 ficou sem ligação. Não é imputação de pagamento — é a factura a ser
-- ligada ao acontecimento que a emite, como nas outras duas.
update public.contrato_memoria_eventos e
set despesa_id = d.id,
    atualizado_em = now()
from public.contratos c
join public.fornecedores f on f.id = c.fornecedor_id and f.tenant_id = c.tenant_id
join public.despesas d on d.fornecedor_id = f.id and d.tenant_id = c.tenant_id
where e.contrato_id = c.id
  and e.tenant_id = c.tenant_id
  and f.nome = 'Pinturas Verticais'
  and d.numero_documento = '2026/7'
  and e.tipo = 'fatura'
  and e.efeito = 'emissao'
  and e.titulo like 'Emissão e envio da Factura 2026/7%'
  and e.despesa_id is null;

-- ====================================================================
-- 1. DECOMPOSIÇÃO FISCAL DE CADA FACTURA
-- ====================================================================

insert into public.contrato_memoria_eventos
  (tenant_id, contrato_id, data_evento, tipo, titulo, resumo, natureza, valor_cents, despesa_id, efeito)
select c.tenant_id, c.id, v.data_evento, 'fatura', v.titulo, v.resumo, 'facto', v.valor_cents, d.id, null
from public.contratos c
join public.fornecedores f on f.id = c.fornecedor_id and f.tenant_id = c.tenant_id
join public.despesas d on d.fornecedor_id = f.id and d.tenant_id = c.tenant_id
cross join (values
  ('2026/4', timestamptz '2026-05-26 00:00:00+00',
   'Factura 2026/4 — ATCUD e decomposição fiscal',
   'A Factura n.º 2026/4, com ATCUD J62NRRCP-4, é emitida em 26-05-2026: base tributável de 6.000,00 EUR, IVA à taxa de 6 por cento no valor de 360,00 EUR, total de 6.360,00 EUR.',
   636000),
  ('2026/7', timestamptz '2026-06-09 00:00:00+00',
   'Factura 2026/7 — ATCUD e decomposição fiscal',
   'A Factura n.º 2026/7, com ATCUD J62NRRCP-7, é emitida em 09-06-2026: base tributável de 6.000,00 EUR, IVA à taxa de 6 por cento no valor de 360,00 EUR, total de 6.360,00 EUR.',
   636000),
  ('2026/8', timestamptz '2026-06-15 00:00:00+00',
   'Factura 2026/8 — ATCUD e decomposição fiscal',
   'A Factura n.º 2026/8, com ATCUD J62NRRCP-8, é emitida em 15-06-2026: base tributável de 3.000,00 EUR, IVA à taxa de 6 por cento no valor de 180,00 EUR, total de 3.180,00 EUR.',
   318000)
) as v(numero, data_evento, titulo, resumo, valor_cents)
where f.nome = 'Pinturas Verticais'
  -- A condição vive aqui e não no ON porque `v` só entra no FROM depois.
  and d.numero_documento = v.numero
  and not exists (
    select 1 from public.contrato_memoria_eventos e
    where e.contrato_id = c.id and e.titulo = v.titulo
  );

-- ====================================================================
-- 2. FACTOS DOCUMENTAIS SOBRE O CONJUNTO
-- ====================================================================

insert into public.contrato_memoria_eventos
  (tenant_id, contrato_id, data_evento, tipo, titulo, resumo, natureza, valor_cents, despesa_id, efeito)
select c.tenant_id, c.id, v.data_evento, v.tipo, v.titulo, v.resumo, v.natureza, v.valor_cents, null, null
from public.contratos c
join public.fornecedores f on f.id = c.fornecedor_id and f.tenant_id = c.tenant_id
cross join (values
  (timestamptz '2026-06-15 00:00:00+00', 'fatura', 'facto',
   'As três facturas somam 15.900 EUR e reproduzem o plano 40/40/20 do 010125-ADIT',
   'As Facturas 2026/4, 2026/7 e 2026/8 somam 15.000,00 EUR de base e 900,00 EUR de IVA, num total de 15.900,00 EUR. Os montantes correspondem aritmeticamente ao plano de pagamento do orçamento 010125-ADIT — 40 por cento na adjudicação, 40 por cento a meio da obra e 20 por cento na conclusão — sobre os 15.000,00 EUR líquidos da fachada lateral. A correspondência é aritmética; nenhuma das facturas identifica no seu texto a que tranche respeita.',
   1590000::integer),
  (timestamptz '2026-06-15 00:00:00+00', 'fatura', 'facto',
   'Não existem no processo facturas da fachada da frente nem da tardoz',
   'O processo não contém qualquer factura relativa à fachada da frente, orçada em 15.000,00 EUR, nem à fachada da tardoz, orçada em 30.000,00 EUR. As três facturas conhecidas respeitam todas à fachada lateral.',
   null::integer),
  (timestamptz '2026-05-15 00:00:00+00', 'pagamento', 'facto',
   'Os 45.000 EUR de pagamentos históricos declarados não têm factura identificada',
   'O mapa administrativo de controlo declara 45.000,00 EUR pagos pelas fachadas da frente e da tardoz. Nenhum desses pagamentos tem no processo uma factura correspondente identificada.',
   4500000::integer),
  (timestamptz '2026-05-26 00:00:00+00', 'fatura', 'facto',
   'A Factura 2026/4 é a primeira factura conhecida da empreitada',
   'Não existe no processo qualquer factura desta empreitada anterior à 2026/4, de 26-05-2026, apesar de os trabalhos das fachadas da frente e da tardoz estarem declarados como executados e pagos desde 2025.',
   null::integer),
  (timestamptz '2026-06-15 00:00:00+00', 'fatura', 'facto',
   'As três facturas identificam o adquirente pela morada Rua Professor Ribeiro Jorge n.º 7',
   'As Facturas 2026/4, 2026/7 e 2026/8 identificam o adquirente como "EDIFICIO EUROPA, Rua Professor Ribeiro Jorge N.º 7".',
   null::integer),
  (timestamptz '2026-06-15 00:00:00+00', 'fatura', 'facto',
   'As três facturas descrevem o trabalho apenas como pintura do prédio',
   'As três facturas usam a descrição genérica "pintura do prédio". Nenhuma identifica a fachada, a tranche do plano de pagamento ou o período de execução a que respeita.',
   null::integer),
  (timestamptz '2026-06-15 00:00:00+00', 'fatura', 'facto',
   'As três facturas vencem na data de emissão',
   'Nas três facturas a data de vencimento coincide com a data de emissão, sem prazo de pagamento.',
   null::integer),
  (timestamptz '2026-06-15 00:00:00+00', 'conflito', 'conflito',
   'IVA facturado integralmente a 6 por cento contra a repartição comunicada em 2025',
   'As três facturas aplicam IVA à taxa de 6 por cento sobre a totalidade da base. Existe comunicação anterior da empreiteira a referir uma repartição entre 6 e 23 por cento. É uma divergência documental entre o que foi comunicado e o que foi facturado. Não se faz aqui qualquer qualificação sobre a taxa devida nem sobre a regularidade fiscal das facturas: isso depende do enquadramento da empreitada e de quem tenha competência para o apreciar.',
   null::integer),
  (timestamptz '2026-06-15 00:00:00+00', 'outro', 'pendente',
   'Morada do adquirente diverge do nome da rua usado nos orçamentos',
   'As facturas identificam o adquirente na "Rua Professor Ribeiro Jorge"; os orçamentos e os ficheiros do processo referem "Rua Professor Ricardo Jorge". Por esclarecer qual a designação correcta e se a divergência afecta a identificação do adquirente.',
   null::integer)
) as v(data_evento, tipo, natureza, titulo, resumo, valor_cents)
where f.nome = 'Pinturas Verticais'
  and not exists (
    select 1 from public.contrato_memoria_eventos e
    where e.contrato_id = c.id and e.titulo = v.titulo
  );

-- ====================================================================
-- 3. EVIDÊNCIAS — os PDFs originais das facturas
-- ====================================================================

-- `contrato_memoria_evidencias` não tem `tenant_id`: herda-o do acontecimento,
-- que é o dono da relação. O isolamento faz-se pela RLS do evento.
insert into public.contrato_memoria_evidencias
  (evento_id, fonte_id, localizador, citacao, papel)
select e.id, fo.id, v.localizador, v.citacao, v.papel
from public.contrato_memoria_eventos e
join public.contratos c on c.id = e.contrato_id
join public.fornecedores f on f.id = c.fornecedor_id and f.tenant_id = c.tenant_id
cross join (values
  ('Factura 2026/4 — ATCUD e decomposição fiscal', 'Factura 2026/4 — documento original',
   'factura 2026/4, ATCUD J62NRRCP-4', 'Base 6.000,00 EUR; IVA 6% 360,00 EUR; total 6.360,00 EUR.', 'primaria'),
  ('Factura 2026/7 — ATCUD e decomposição fiscal', 'Factura Pinturas Verticais 2026/7 — 09/06/2026',
   'factura 2026/7, 09/06/2026', 'Total da Factura 6.360,00 €.', 'primaria'),
  ('Factura 2026/8 — ATCUD e decomposição fiscal', 'Factura 2026/8 — documento original',
   'factura 2026/8, ATCUD J62NRRCP-8', 'Base 3.000,00 EUR; IVA 6% 180,00 EUR; total 3.180,00 EUR.', 'primaria'),
  ('As três facturas somam 15.900 EUR e reproduzem o plano 40/40/20 do 010125-ADIT',
   'Orçamento 010125-ADIT — fachada lateral — 25/05/2026',
   'condições de pagamento', '40% adjudicação, 40% meio da obra, 20% conclusão, sobre 15.000,00 EUR + IVA 6%.', 'primaria'),
  ('Os 45.000 EUR de pagamentos históricos declarados não têm factura identificada',
   'Mapa de controlo de pagamentos Pinturas Verticais — 2025/2026',
   'mapa de 15-05-2026', 'Valor total da obra: 60.000,00 EUR. Valor pago: 45.000,00 EUR.', 'primaria'),
  ('A Factura 2026/4 é a primeira factura conhecida da empreitada',
   'Factura 2026/4 — documento original',
   'factura 2026/4, 26-05-2026', 'Factura n.º 2026/4, emitida em 26-05-2026.', 'primaria')
) as v(evento_titulo, fonte_titulo, localizador, citacao, papel)
join public.ia_documental_fontes fo on fo.titulo = v.fonte_titulo
where f.nome = 'Pinturas Verticais'
  and e.titulo = v.evento_titulo
  and fo.tenant_id = e.tenant_id
on conflict (evento_id, fonte_id, citacao) do nothing;

-- ====================================================================
-- 4. AS DUAS POSIÇÕES SOBRE A IMPUTAÇÃO DE 11/06/2026
-- ====================================================================
-- O facto não muda e não é objecto de posição: saíram 6.360,00 EUR da conta do
-- condomínio para a empreiteira em 11-06-2026. O movimento continua sem
-- `despesa_id`, porque nenhum documento identifica a factura liquidada.
--
-- O que as posições registam é a divergência sobre qual delas foi. Nenhuma é
-- adoptada pelo sistema, e nenhuma toca no apuramento financeiro.

insert into public.imputacoes_posicoes
  (tenant_id, movimento_id, despesa_id, parte, parte_descricao, tipo, fundamento, estado, data_posicao, observacoes)
select m.tenant_id, m.id, d.id, v.parte::public.posicao_parte, v.parte_descricao,
       v.tipo::public.posicao_tipo, v.fundamento, v.estado::public.posicao_estado, v.data_posicao, v.observacoes
from public.movimentos_bancarios m
join public.fornecedores f on f.id = m.fornecedor_id and f.tenant_id = m.tenant_id
join public.despesas d on d.fornecedor_id = f.id and d.tenant_id = m.tenant_id and d.numero_documento = '2026/4'
cross join (values
  ('condominio', 'Administração do Condomínio do Edifício Europa', 'imputa',
   'Regra supletiva de imputação de pagamento invocada pelo Condomínio: não tendo sido designada a dívida a que o pagamento se destinava, e sendo ambas exigíveis, de igual valor e onerosidade, imputa-se à obrigação vencida há mais tempo. A 09-06-2026 estavam por liquidar a Factura 2026/4, de 26-05, e a Factura 2026/7, de 09-06, e o débito de 11-06 é de metade exacta do total então em dívida.',
   'sustentada', timestamptz '2026-08-24 00:00:00+00',
   'Posição jurídica do Condomínio. Não constitui identificação documental da factura liquidada e não altera a reconciliação do movimento.'),
  ('contraparte', 'Pinturas Verticais, por Rui Machado da Silva, mandatário', 'nao_imputa',
   'A interpelação extrajudicial de 31-07-2026 reclama o pagamento das Facturas 2026/4 e 2026/8 e omite a 2026/7, tratando-a como liquidada. Daí decorre que a credora sustenta que o débito de 11-06-2026 liquidou a 2026/7 e que a 2026/4 permanece em dívida.',
   'sustentada', timestamptz '2026-07-31 00:00:00+00',
   'Posição da contraparte, deduzida do teor expresso da interpelação. O montante reclamado — 9.540,00 EUR — coincide com o saldo apurado pelo Condomínio.')
) as v(parte, parte_descricao, tipo, fundamento, estado, data_posicao, observacoes)
where f.nome = 'Pinturas Verticais'
  and m.referencia_externa = 'BANK-2026-06-11-REINALDO-2026-06-11-636000'
on conflict on constraint imputacoes_posicoes_unica do nothing;

-- Evidências das posições.
insert into public.imputacoes_posicoes_evidencias
  (tenant_id, posicao_id, fonte_id, localizador, citacao)
select p.tenant_id, p.id, fo.id, v.localizador, v.citacao
from public.imputacoes_posicoes p
join public.movimentos_bancarios m on m.id = p.movimento_id
cross join (values
  ('condominio', 'Email — Factura 2026/7 / 40% meio da obra — 09/06/2026',
   'encaminhamento de 09/06/2026, 18:27',
   'Recordo que se encontra por pagar a fatura (n.º 4) [...] O valor total das mesmas é de 12.720,00€.'),
  ('condominio', 'Extrato bancário — Junho 2026',
   'p. 2, movimento de 11/06',
   'TRF P/ Reinaldo Ferreira Trab Vert Lda — 6 360,00.'),
  ('contraparte', 'Interpelação extrajudicial para cobrança de dívida — 31-07-2026',
   'carta de 31-07-2026',
   'reclamar o pagamento do valor total de € 9540,00 [...] titulado pelas facturas 2026/4, de 26/05/2026 e 2026/8, de 15/06/2026')
) as v(parte, fonte_titulo, localizador, citacao)
join public.ia_documental_fontes fo on fo.titulo = v.fonte_titulo and fo.tenant_id = p.tenant_id
where m.referencia_externa = 'BANK-2026-06-11-REINALDO-2026-06-11-636000'
  and p.parte::text = v.parte
on conflict on constraint imputacoes_posicoes_evidencias_unica do nothing;
