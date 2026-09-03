-- =====================================================================
-- Migration: 20260903010000_pagamento_quotas_conta_corrente.sql
-- Fase 2 do redesign Pessoas e Frações — conta corrente com saldos reais.
--
-- =====================================================================
-- O QUE MUDA E PORQUÊ
-- =====================================================================
-- O trigger de 0027 (trg_atualizar_quota_pagamento) tem dois defeitos
-- estruturais:
--
--   1. Soma o pagamento INTEIRO para cada quota em quota_ids: um pagamento
--      de 60 EUR sobre duas quotas de 50 EUR marcava AMBAS como 'pago'
--      (o v_total_pago inclui o valor cheio do pagamento, para cada quota).
--   2. Ninguém guarda quanto foi pago POR quota: uma quota 'parcial' não
--      tem saldo conhecível — a UI contava-a pelo valor integral.
--
-- Este fix introduz alocação explícita:
--
--   pagamento_quotas      — quanto de cada pagamento cobre cada quota
--                           (a verdade dos saldos);
--   quotas_mensais.pago_cents — soma das alocações, mantida por trigger;
--   trigger de INSERT/UPDATE/DELETE em pagamentos — aloca o valor pelas
--                           quotas por ordem cronológica (ano, mês), fecha
--                           cada quota no remanescente e recalcula estado;
--                           no DELETE des-aloca e repõe estados (acaba com
--                           a reposição manual nas actions).
--
-- O backfill re-aloca os pagamentos existentes pela mesma regra e recalcula
-- pago_cents/estado de TODAS as quotas — corrige retroactivamente as quotas
-- mal marcadas pelo trigger antigo.
--
-- Idempotente: tabela/coluna com IF NOT EXISTS, backfill salta pagamentos
-- já alocados, funções CREATE OR REPLACE.
-- Nota de ferramenta: o runner de migrações parte statements de forma
-- ingênua — sem concatenação de literais em COMMENT.
-- =====================================================================

-- --------------------------------------------------------------------
-- 1. ESQUEMA
-- --------------------------------------------------------------------

alter table public.quotas_mensais
  add column if not exists pago_cents integer not null default 0;

do $$ begin
  alter table public.quotas_mensais
    add constraint quotas_pago_nao_negativo check (pago_cents >= 0);
exception when duplicate_object then null; end $$;

create table if not exists public.pagamento_quotas (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references public.tenants(id) on delete cascade,
  pagamento_id uuid not null references public.pagamentos(id) on delete cascade,
  quota_id uuid not null references public.quotas_mensais(id) on delete cascade,
  valor_cents integer not null,
  criado_em timestamptz default now() not null,

  constraint pq_valor_positivo check (valor_cents > 0),
  unique (pagamento_id, quota_id)
);

create index if not exists pagamento_quotas_quota_idx
  on public.pagamento_quotas (quota_id);

-- --------------------------------------------------------------------
-- 2. FUNÇÕES
-- --------------------------------------------------------------------

-- Recalcula pago_cents e estado de uma quota a partir das alocações
-- vigentes. Quotas isentas mantêm o estado (são perdoadas, não cobradas);
-- o pago_cents delas fica como estiver — a decisão de isenção é humana.
create or replace function public.recalcular_quota(p_quota_id uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
DECLARE
  v_pago integer;
BEGIN
  SELECT COALESCE(SUM(a.valor_cents), 0) INTO v_pago
  FROM public.pagamento_quotas a
  WHERE a.quota_id = p_quota_id;

  UPDATE public.quotas_mensais
  SET pago_cents = v_pago,
      estado = CASE
        WHEN estado = 'isento' THEN 'isento'
        WHEN v_pago >= valor_cents THEN 'pago'
        WHEN v_pago > 0 THEN 'parcial'
        ELSE 'pendente'
      END
  WHERE id = p_quota_id;
END;
$$;

-- Aloca o valor de um pagamento pelas suas quotas por ordem cronológica
-- (ano, mês), enchendo cada uma até ao remanescente. O que sobra fica sem
-- alocação (crédito do condómino). Re-corre é seguro: limpa as próprias
-- alocações antes de redistribuir.
create or replace function public.alocar_pagamento_quotas()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
DECLARE
  v_restante integer := NEW.valor_cents;
  v_quota record;
  v_alocar integer;
BEGIN
  DELETE FROM public.pagamento_quotas WHERE pagamento_id = NEW.id;

  FOR v_quota IN
    SELECT q.id, q.valor_cents, q.pago_cents
    FROM public.quotas_mensais q
    WHERE q.id = ANY (NEW.quota_ids)
      AND q.estado <> 'isento'
    ORDER BY q.ano, q.mes
  LOOP
    EXIT WHEN v_restante <= 0;
    v_alocar := LEAST(v_quota.valor_cents - v_quota.pago_cents, v_restante);
    IF v_alocar > 0 THEN
      INSERT INTO public.pagamento_quotas (tenant_id, pagamento_id, quota_id, valor_cents)
      VALUES (NEW.tenant_id, NEW.id, v_quota.id, v_alocar);
      v_restante := v_restante - v_alocar;
    END IF;
  END LOOP;

  PERFORM public.recalcular_quota(q.id)
  FROM public.quotas_mensais q
  WHERE q.id = ANY (NEW.quota_ids);

  RETURN NEW;
END;
$$;

-- No DELETE, des-aloca e recalcula as quotas que o pagamento cobria.
create or replace function public.desalocar_pagamento_quotas()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
BEGIN
  PERFORM public.recalcular_quota(q.id)
  FROM unnest(OLD.quota_ids) AS qid
  JOIN public.quotas_mensais q ON q.id = qid;

  RETURN OLD;
END;
$$;

DROP TRIGGER IF EXISTS trg_atualizar_quota_pagamento ON public.pagamentos;
DROP TRIGGER IF EXISTS trg_alocar_pagamento ON public.pagamentos;
CREATE TRIGGER trg_alocar_pagamento
  AFTER INSERT OR UPDATE ON public.pagamentos
  FOR EACH ROW EXECUTE FUNCTION public.alocar_pagamento_quotas();

DROP TRIGGER IF EXISTS trg_desalocar_pagamento ON public.pagamentos;
CREATE TRIGGER trg_desalocar_pagamento
  AFTER DELETE ON public.pagamentos
  FOR EACH ROW EXECUTE FUNCTION public.desalocar_pagamento_quotas();

-- --------------------------------------------------------------------
-- 3. BACKFILL — re-aloca os pagamentos existentes e corrige estados
-- --------------------------------------------------------------------
-- Por ordem cronológica, para respeitar a semântica "enche a quota mais
-- antiga primeiro". Pagamentos já alocados (re-run da migração) saltam.

DO $$
DECLARE
  r record;
  v_restante integer;
  v_quota record;
  v_alocar integer;
BEGIN
  FOR r IN
    SELECT p.id, p.tenant_id, p.valor_cents, p.quota_ids
    FROM public.pagamentos p
    WHERE NOT EXISTS (
      SELECT 1 FROM public.pagamento_quotas a WHERE a.pagamento_id = p.id
    )
    ORDER BY p.data_pagamento, p.criado_em
  LOOP
    v_restante := r.valor_cents;
    FOR v_quota IN
      SELECT q.id, q.valor_cents
      FROM public.quotas_mensais q
      WHERE q.id = ANY (r.quota_ids)
        AND q.estado <> 'isento'
      ORDER BY q.ano, q.mes
    LOOP
      EXIT WHEN v_restante <= 0;
      v_alocar := LEAST(
        v_quota.valor_cents
          - COALESCE((SELECT SUM(a.valor_cents) FROM public.pagamento_quotas a
                      WHERE a.quota_id = v_quota.id), 0),
        v_restante
      );
      IF v_alocar > 0 THEN
        INSERT INTO public.pagamento_quotas (tenant_id, pagamento_id, quota_id, valor_cents)
        VALUES (r.tenant_id, r.id, v_quota.id, v_alocar);
        v_restante := v_restante - v_alocar;
      END IF;
    END LOOP;
  END LOOP;

  -- Estado verdadeiro para TODAS as quotas (corrige as mal marcadas por 0027).
  PERFORM public.recalcular_quota(q.id) FROM public.quotas_mensais q;
END;
$$;

-- --------------------------------------------------------------------
-- 4. RLS — admin-only, padrão de 0008/20260902600000
-- --------------------------------------------------------------------

alter table public.pagamento_quotas enable row level security;
drop policy if exists "admins manage pagamento_quotas" on public.pagamento_quotas;
create policy "admins manage pagamento_quotas"
  on public.pagamento_quotas for all
  to authenticated
  using (public.is_tenant_admin(tenant_id))
  with check (public.is_tenant_admin(tenant_id));

revoke all on public.pagamento_quotas from anon;
grant select, insert, update, delete on public.pagamento_quotas to authenticated;

-- --------------------------------------------------------------------
-- 5. Documentação
-- --------------------------------------------------------------------

comment on table public.pagamento_quotas is 'Alocacao de cada pagamento por quota — a verdade dos saldos. Preenchida pelo trigger trg_alocar_pagamento; nunca se edita a mao.';
comment on column public.quotas_mensais.pago_cents is 'Soma das alocacoes vigentes (pagamento_quotas). Mantido pelo trigger; o estado deriva disto.';
