-- =====================================================================
-- Seed: Dados do Condomínio Europa — Frações e Proprietários
-- 
-- Fonte: Google Sheet "EUROPA" — aba Condóminos
-- Ingestão: 2026-07-28
--
-- NOTA: Executar APÓS a migration 0008_fracoes.sql estar aplicada.
-- Este script insere frações reais do Edifício Europa.
-- =====================================================================

-- Obter o tenant_id do Edifício Europa
with tenant_europa as (
  select id as tenant_id from public.tenants where slug = 'europa'
),

-- Inserir todas as frações do condomínio
fracoes_inseridas as (
  insert into public.fracoes (tenant_id, codigo, descricao, permilagem, piso, tipologia, proprietario_nome, proprietario_email, proprietario_telefone)
  select
    t.tenant_id,
    d.codigo,
    d.descricao,
    d.permilagem,
    d.piso,
    d.tipologia,
    d.proprietario_nome,
    d.proprietario_email,
    d.proprietario_telefone
  from tenant_europa t
  cross join lateral (values
    -- Lojas (Rés-do-chão)
    ('A', 'Loja A — Nova Ouriense, S.A.', 1.5, 'Rés-do-chão', 'Loja', 'Nova Ouriense, S.A.', 'costa.fg@gmail.com; contabilidade@novaoriense.com', '919600709'),
    ('B', 'Loja B — Nova Ouriense, S.A.', 1.5, 'Rés-do-chão', 'Loja', 'Nova Ouriense, S.A.', 'costa.fg@gmail.com; contabilidade@novaoriense.com', '919600709'),
    ('C', 'Loja C — Nova Ouriense, S.A.', 1.5, 'Rés-do-chão', 'Loja', 'Nova Ouriense, S.A.', 'costa.fg@gmail.com; contabilidade@novaoriense.com', '919600709'),

    -- 1.º Andar
    ('D', '1.º Direito — Maria da Conceição F. Jorge', 40, '1.º', 'Habitação', 'Maria da Conceição F. Jorge', 'mariafigueiredojorge@gmail.com', '21 4681021 / 91 2674010'),
    ('E', '1.º Esquerdo — Maria Eduarda R. F. Espinheira', 40, '1.º', 'Habitação', 'Maria Eduarda R. F. Espinheira', 'eduarda.espinheira@gmail.pt', '91 7265596'),

    -- 2.º Andar
    ('F', '2.º Direito — Herdeiros de Armando J. C. Soares', 40, '2.º', 'Habitação', 'Herdeiros de Armando J. C. Soares', 'suzanasoares1952@gmail.com', '93 6772714'),
    ('G', '2.º Esquerdo — Francisco Mercês de Melo', 40, '2.º', 'Habitação', 'Francisco Mercês de Melo', 'franciscomm@tecnopert.pt; bebe2m@hotmail.com', '91 7240021'),

    -- 3.º Andar
    ('H', '3.º Direito — Inês Miguel Gavinho Félix', 40, '3.º', 'Habitação', 'Inês Miguel Gavinho Félix', 'ines.gavinho@gavinhogroup.com', '91 7072070'),
    ('I', '3.º Esquerdo — Rogério L. P. Urbano', 40, '3.º', 'Habitação', 'Rogério L. P. Urbano', 'rogerio.urbano1950@gmail.com', '91 7255235'),

    -- 4.º Andar
    ('J', '4.º Direito — José Artur Inácio', 40, '4.º', 'Habitação', 'José Artur Inácio', 'jai.rt@excovergroup.pt', '91 7232345 / 91 7322266'),
    ('L', '4.º Esquerdo — José Artur Inácio', 40, '4.º', 'Habitação', 'José Artur Inácio', 'jai.rt@excovergroup.pt', null),

    -- 5.º Andar
    ('M', '5.º Direito — Cristina Canas Correia / Jaime Filipe Martins Canas Correia', 40, '5.º', 'Habitação', 'Cristina Canas Correia / Jaime Filipe Martins Canas Correia', 'cristinacanascorreia@hotmail.com; jaimefcorreia@gmail.com', '91 9667092 / 91 7215447'),
    ('N', '5.º Esquerdo — Belarmino Silveira', 40, '5.º', 'Habitação', 'Belarmino Silveira', 'bacsilveira@gmail.com', '91 7211504'),

    -- 6.º Andar
    ('O', '6.º Direito — S.T.A.V., S.A.', 40, '6.º', 'Habitação', 'S.T.A.V., S.A.', 'pires.mi@gmail.com; sofiamarcelino@malvesconsultores.pt', '21 4104182 / 96 2348766'),
    ('P', '6.º Esquerdo — Salvador de Aguiar Corrêa de Oliveira', 40, '6.º', 'Habitação', 'Salvador de Aguiar Corrêa de Oliveira', 'salvadoraco@hotmail.com', '91 918 564 390'),

    -- 7.º Andar
    ('Q', '7.º Direito — Francisco M. C. Teixeira', 40, '7.º', 'Habitação', 'Francisco M. C. Teixeira', 'isabelmadureirateixeira@gmail.com; soutoxt@gmail.com', '93 3584260'),
    ('R', '7.º Esquerdo — Cesaltina C. Afonso', 40, '7.º', 'Habitação', 'Cesaltina C. Afonso', 'tiagoafonso@icloud.com; cesaltasmacau@yahoo.com', '93 5810028 / 96 6121238'),

    -- 8.º Andar
    ('S', '8.º Direito — Alexandre Maia de Carvalho', 40, '8.º', 'Habitação', 'Alexandre Maia de Carvalho', 'xaneca@hotmail.com', null),
    ('T', '8.º Esquerdo — Miguel Mexia Vassalo', 40, '8.º', 'Habitação', 'Miguel Mexia Vassalo', 'miguel.vassalo@santander.pt', '93 8886293'),

    -- 9.º Andar
    ('U', '9.º Direito — João M. Vieira Moura', 40, '9.º', 'Habitação', 'João M. Vieira Moura', 'jmvmoura@gmail.com', null),
    ('V', '9.º Esquerdo — Carlos Alberto Abreu dos Reis', 40, '9.º', 'Habitação', 'Carlos Alberto Abreu dos Reis', 'caa.rex@gmail.com', '96 2346167 / 91 6419024'),

    -- 10.º Andar
    ('W', '10.º Direito — Jorge M. A. P. Silva Marques', 40, '10.º', 'Habitação', 'Jorge M. A. P. Silva Marques', 'jsmarques2978ster@gmail.com', '96 9002105'),
    ('X', '10.º Esquerdo — Luís Mano / Raquel Mano', 40, '10.º', 'Habitação', 'Luís Mano / Raquel Mano', 'luismano@outlook.pt; mano.raquel@gmail.com', '93 7551616 / 91 4875161'),

    -- 11.º Andar
    ('Y', '11.º Direito — Paloma Ascencion Peña Moreno', 40, '11.º', 'Habitação', 'Paloma Ascencion Peña Moreno', 'paloma.pena.moreno@gmail.com', '91 9350905'),
    ('Z', '11.º Esquerdo — Paloma Ascencion Peña Moreno', 40, '11.º', 'Habitação', 'Paloma Ascencion Peña Moreno', 'paloma.pena.moreno@gmail.com', '21 4104054'),

    -- 12.º Andar
    ('AC', '12.º Direito — Rodolfo Alexandrino L. Crespo', 35, '12.º', 'Habitação', 'Rodolfo Alexandrino L. Crespo', 'rodolfocrespo@mac.com', '21 4107781 / 91 7343914'),
    ('AD', '12.º Frente — Cláudia Sofia Varela Urbano', 35, '12.º', 'Habitação', 'Cláudia Sofia Varela Urbano', 'claudia.urbano12@gmail.com', '91 7536791'),
    ('AE', '12.º Esquerdo — Carla Maria Paixão Martins', 35, '12.º', 'Habitação', 'Carla Maria Paixão Martins', 'julioamsantos@gmail.com', null)
  ) as d(codigo, descricao, permilagem, piso, tipologia, proprietario_nome, proprietario_email, proprietario_telefone)
  where not exists (
    select 1 from public.fracoes f2
    where f2.tenant_id = t.tenant_id and f2.codigo = d.codigo
  )
  returning id, codigo, proprietario_nome
)

select 
  (select count(*) from fracoes_inseridas) as fracoes_inseridas,
  (select count(*) from public.fracoes f join tenant_europa t on f.tenant_id = t.tenant_id) as total_fracoes_europa;
