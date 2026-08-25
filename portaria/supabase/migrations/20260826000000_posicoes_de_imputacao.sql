-- Posições sobre a imputação de um pagamento a uma factura.
--
-- ====================================================================
-- PORQUE É PRECISA UMA ESTRUTURA NOVA
-- ====================================================================
-- Auditado o que existe: `contrato_memoria_eventos` sabe classificar um
-- acontecimento como facto, inferência, conflito ou pendente, e
-- `contrato_memoria_evidencias` sabe dar-lhe fontes com papel de primária,
-- corroboração ou contradição. É bom para narrar que existe divergência.
--
-- Não sabe representar QUEM sustenta O QUÊ. Uma divergência de imputação tem
-- partes, e cada parte tem uma posição própria, com o seu fundamento, a sua
-- evidência, a sua data e o seu estado. Espremer isso num único acontecimento
-- obriga a eleger uma leitura como a do sistema — que é exactamente o que não
-- se quer.
--
-- A alternativa que já foi tentada e falhou está registada em
-- 20260825120000_desimputar_pagamento_11_06: sobrecarregar
-- `movimentos_bancarios.despesa_id` com o resultado de uma posição jurídica.
-- Esse campo afirma reconciliação demonstrada. Uma posição não é isso.
--
-- ====================================================================
-- A REGRA QUE ESTA ESTRUTURA EXISTE PARA MANTER
-- ====================================================================
-- Uma posição NUNCA cria a ligação movimento -> factura. Vive ao lado dela.
-- `movimentos_bancarios.despesa_id` continua a significar uma só coisa: a
-- factura que o processo demonstra ter sido liquidada por aquele movimento.
-- Quando nenhuma o é, fica nulo, e as posições dizem o que cada parte sustenta.
--
-- Consequência prática: nenhum apuramento financeiro lê esta tabela. As saídas
-- confirmadas, o saldo em aberto e o condicionado saem do extrato e das
-- facturas, não de quem tem razão.
--
-- ====================================================================
-- GENÉRICA POR DESENHO
-- ====================================================================
-- Nada aqui é específico de Pinturas Verticais nem da factura 2026/4. Serve
-- qualquer par movimento/despesa em que as partes divirjam.

-- --------------------------------------------------------------------
-- Domínios
-- --------------------------------------------------------------------

-- Quem sustenta. `terceiro` cobre acompanhamento técnico, mandatário de outra
-- parte, perito — quem não é o condomínio nem a contraparte do contrato.
do $$ begin
  create type public.posicao_parte as enum ('condominio', 'contraparte', 'terceiro');
exception when duplicate_object then null; end $$;

-- O que sustenta. `reserva` é para quem declara expressamente não tomar
-- posição, que é informação e não ausência dela.
do $$ begin
  create type public.posicao_tipo as enum ('imputa', 'nao_imputa', 'reserva');
exception when duplicate_object then null; end $$;

-- Em que pé está. Uma posição retirada ou superada não se apaga: o processo
-- precisa de saber que existiu e quando deixou de ser sustentada.
do $$ begin
  create type public.posicao_estado as enum ('sustentada', 'aceite', 'retirada', 'superada');
exception when duplicate_object then null; end $$;

-- --------------------------------------------------------------------
-- Posições
-- --------------------------------------------------------------------

create table if not exists public.imputacoes_posicoes (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references public.tenants(id) on delete cascade,
  -- O facto sobre o qual se diverge: o movimento saiu, isso não está em causa.
  movimento_id uuid not null references public.movimentos_bancarios(id) on delete cascade,
  -- A factura candidata. Nula apenas quando a posição é de reserva.
  despesa_id uuid references public.despesas(id) on delete cascade,
  parte public.posicao_parte not null,
  -- Quem em concreto, quando importa: "Rui Machado da Silva, mandatário".
  parte_descricao text,
  tipo public.posicao_tipo not null,
  -- Porquê. Texto livre por desenho: um fundamento é um argumento, não um
  -- código.
  fundamento text not null,
  estado public.posicao_estado not null default 'sustentada',
  -- Quando a parte a assumiu, não quando foi registada.
  data_posicao timestamptz not null,
  observacoes text,
  criado_em timestamptz not null default now(),
  atualizado_em timestamptz not null default now(),
  criado_por uuid references auth.users(id) on delete set null,

  -- Imputar ou negar exige dizer a qual factura. Só a reserva pode ser vaga.
  constraint imputacoes_posicoes_despesa_exigida check (
    (tipo in ('imputa', 'nao_imputa') and despesa_id is not null)
    or (tipo = 'reserva')
  ),

  -- A mesma parte não sustenta duas vezes a mesma coisa sobre o mesmo par.
  -- `nulls not distinct` para que a reserva sem despesa também seja única.
  constraint imputacoes_posicoes_unica
    unique nulls not distinct (tenant_id, movimento_id, parte, tipo, despesa_id)
);

comment on table public.imputacoes_posicoes is
  'Posições das partes sobre a imputação de um movimento bancário a uma despesa. Nunca substitui movimentos_bancarios.despesa_id, que continua a significar reconciliação demonstrada.';

create index if not exists imputacoes_posicoes_movimento_idx
  on public.imputacoes_posicoes (tenant_id, movimento_id);
create index if not exists imputacoes_posicoes_despesa_idx
  on public.imputacoes_posicoes (tenant_id, despesa_id);

-- --------------------------------------------------------------------
-- Evidências das posições
-- --------------------------------------------------------------------
-- Mesma forma que `contrato_memoria_evidencias`, para o arquivo documental ser
-- um só: as fontes vivem em `ia_documental_fontes` e são partilhadas.

create table if not exists public.imputacoes_posicoes_evidencias (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references public.tenants(id) on delete cascade,
  posicao_id uuid not null references public.imputacoes_posicoes(id) on delete cascade,
  fonte_id uuid not null references public.ia_documental_fontes(id) on delete cascade,
  localizador text,
  citacao text not null,
  criado_em timestamptz not null default now(),
  criado_por uuid references auth.users(id) on delete set null,
  constraint imputacoes_posicoes_evidencias_unica unique (posicao_id, fonte_id, citacao)
);

create index if not exists imputacoes_posicoes_evidencias_posicao_idx
  on public.imputacoes_posicoes_evidencias (posicao_id);

-- --------------------------------------------------------------------
-- RLS — mesmo padrão das tabelas de memória
-- --------------------------------------------------------------------

alter table public.imputacoes_posicoes enable row level security;
alter table public.imputacoes_posicoes_evidencias enable row level security;

drop policy if exists "admins manage imputacoes posicoes" on public.imputacoes_posicoes;
create policy "admins manage imputacoes posicoes"
  on public.imputacoes_posicoes
  for all
  using (public.is_tenant_admin(tenant_id))
  with check (public.is_tenant_admin(tenant_id));

drop policy if exists "admins manage imputacoes posicoes evidencias" on public.imputacoes_posicoes_evidencias;
create policy "admins manage imputacoes posicoes evidencias"
  on public.imputacoes_posicoes_evidencias
  for all
  using (public.is_tenant_admin(tenant_id))
  with check (public.is_tenant_admin(tenant_id));
