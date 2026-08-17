-- =============================================================================
-- Migration 0037: Calendário administrativo, alertas e aprovação de despesas
-- =============================================================================
-- A automação cria alertas e rascunhos; nunca marca uma despesa como paga.

-- -----------------------------------------------------------------------------
-- 1. Fluxo de aprovação e histórico imutável de estados
-- -----------------------------------------------------------------------------
ALTER TABLE despesas
  DROP CONSTRAINT IF EXISTS despesas_estado_check;

ALTER TABLE despesas
  ADD CONSTRAINT despesas_estado_check CHECK (
    estado IN ('rascunho', 'pendente', 'em_aprovacao', 'aprovada', 'pago', 'vencido', 'cancelado', 'rejeitada', 'a_reconciliar')
  );

ALTER TABLE despesas
  ADD COLUMN IF NOT EXISTS aprovado_em timestamptz,
  ADD COLUMN IF NOT EXISTS aprovado_por uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS motivo_aprovacao text,
  ADD COLUMN IF NOT EXISTS rejeitado_em timestamptz,
  ADD COLUMN IF NOT EXISTS rejeitado_por uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS motivo_rejeicao text;

CREATE TABLE IF NOT EXISTS despesas_historico_estados (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  despesa_id uuid NOT NULL REFERENCES despesas(id) ON DELETE CASCADE,
  estado_anterior text,
  estado_novo text NOT NULL,
  motivo text,
  executado_por uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  executado_em timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_despesas_historico_despesa
  ON despesas_historico_estados(despesa_id, executado_em DESC);

ALTER TABLE despesas_historico_estados ENABLE ROW LEVEL SECURITY;

CREATE POLICY despesas_historico_admin_all ON despesas_historico_estados
  FOR ALL
  USING (EXISTS (
    SELECT 1 FROM user_tenants ut
    WHERE ut.user_id = auth.uid()
      AND ut.tenant_id = despesas_historico_estados.tenant_id
      AND ut.role = 'admin'
  ))
  WITH CHECK (EXISTS (
    SELECT 1 FROM user_tenants ut
    WHERE ut.user_id = auth.uid()
      AND ut.tenant_id = despesas_historico_estados.tenant_id
      AND ut.role = 'admin'
  ));

CREATE OR REPLACE FUNCTION public.validar_transicao_despesa()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  tem_comprovativo boolean;
BEGIN
  IF TG_OP = 'INSERT' THEN
    IF NEW.estado = 'pago' THEN
      RAISE EXCEPTION 'Uma despesa não pode ser criada diretamente como paga';
    END IF;
    RETURN NEW;
  END IF;

  IF NEW.estado IS DISTINCT FROM OLD.estado THEN
    IF NOT (
      (OLD.estado = 'rascunho' AND NEW.estado IN ('pendente', 'cancelado', 'a_reconciliar')) OR
      (OLD.estado = 'pendente' AND NEW.estado IN ('em_aprovacao', 'cancelado', 'a_reconciliar', 'vencido')) OR
      (OLD.estado = 'a_reconciliar' AND NEW.estado IN ('pendente', 'em_aprovacao', 'cancelado')) OR
      (OLD.estado = 'em_aprovacao' AND NEW.estado IN ('aprovada', 'rejeitada', 'a_reconciliar')) OR
      (OLD.estado = 'aprovada' AND NEW.estado IN ('pago', 'a_reconciliar', 'cancelado', 'vencido')) OR
      (OLD.estado = 'vencido' AND NEW.estado IN ('em_aprovacao', 'aprovada', 'a_reconciliar', 'cancelado')) OR
      (OLD.estado = 'pago' AND NEW.estado = 'a_reconciliar')
    ) THEN
      RAISE EXCEPTION 'Transição de despesa inválida: % para %', OLD.estado, NEW.estado;
    END IF;

    IF NEW.estado = 'pago' THEN
      SELECT EXISTS (
        SELECT 1 FROM despesas_documentos dd
        WHERE dd.despesa_id = NEW.id AND dd.papel = 'comprovativo'
      ) INTO tem_comprovativo;

      IF NEW.data_pagamento IS NULL OR NOT tem_comprovativo THEN
        RAISE EXCEPTION 'Uma despesa paga exige data e comprovativo associado';
      END IF;
    END IF;
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_validar_transicao_despesa ON despesas;
CREATE TRIGGER trg_validar_transicao_despesa
  BEFORE INSERT OR UPDATE ON despesas
  FOR EACH ROW EXECUTE FUNCTION public.validar_transicao_despesa();

CREATE OR REPLACE FUNCTION public.registar_historico_estado_despesa()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    INSERT INTO public.despesas_historico_estados (
      tenant_id, despesa_id, estado_anterior, estado_novo, executado_por
    ) VALUES (
      NEW.tenant_id, NEW.id, NULL, NEW.estado, NEW.criado_por
    );
  ELSIF NEW.estado IS DISTINCT FROM OLD.estado THEN
    INSERT INTO public.despesas_historico_estados (
      tenant_id, despesa_id, estado_anterior, estado_novo,
      motivo, executado_por
    ) VALUES (
      NEW.tenant_id, NEW.id, OLD.estado, NEW.estado,
      CASE
        WHEN NEW.estado = 'aprovada' THEN NEW.motivo_aprovacao
        WHEN NEW.estado = 'rejeitada' THEN NEW.motivo_rejeicao
        ELSE NULL
      END,
      auth.uid()
    );
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_historico_estado_despesa ON despesas;
CREATE TRIGGER trg_historico_estado_despesa
  AFTER INSERT OR UPDATE ON despesas
  FOR EACH ROW EXECUTE FUNCTION public.registar_historico_estado_despesa();

-- -----------------------------------------------------------------------------
-- 2. Alertas operacionais e agenda administrativa
-- -----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS alertas_operacionais (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  tipo text NOT NULL CHECK (tipo IN ('vencimento_despesa', 'vencimento_obrigacao', 'despesa_vencida', 'manutencao_proxima', 'sistema')),
  titulo text NOT NULL,
  descricao text,
  entidade_tipo text NOT NULL,
  entidade_id uuid,
  data_referencia date,
  severidade text NOT NULL DEFAULT 'normal' CHECK (severidade IN ('baixa', 'normal', 'alta', 'critica')),
  chave_idempotencia text NOT NULL,
  reconhecido_em timestamptz,
  reconhecido_por uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  criado_em timestamptz NOT NULL DEFAULT now(),
  UNIQUE (tenant_id, chave_idempotencia)
);

CREATE INDEX IF NOT EXISTS idx_alertas_operacionais_tenant_abertos
  ON alertas_operacionais(tenant_id, data_referencia, severidade)
  WHERE reconhecido_em IS NULL;

ALTER TABLE alertas_operacionais ENABLE ROW LEVEL SECURITY;

CREATE POLICY alertas_operacionais_admin_all ON alertas_operacionais
  FOR ALL
  USING (EXISTS (
    SELECT 1 FROM user_tenants ut
    WHERE ut.user_id = auth.uid()
      AND ut.tenant_id = alertas_operacionais.tenant_id
      AND ut.role = 'admin'
  ))
  WITH CHECK (EXISTS (
    SELECT 1 FROM user_tenants ut
    WHERE ut.user_id = auth.uid()
      AND ut.tenant_id = alertas_operacionais.tenant_id
      AND ut.role = 'admin'
  ));

-- -----------------------------------------------------------------------------
-- 3. Rotina diária idempotente: alertas e rascunhos de obrigações conhecidas
-- -----------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.adicionar_periodicidade(p_data date, p_periodicidade text)
RETURNS date
LANGUAGE sql
IMMUTABLE
SET search_path = public, pg_temp
AS $$
  SELECT CASE p_periodicidade
    WHEN 'mensal' THEN (p_data + interval '1 month')::date
    WHEN 'trimestral' THEN (p_data + interval '3 months')::date
    WHEN 'semestral' THEN (p_data + interval '6 months')::date
    WHEN 'anual' THEN (p_data + interval '1 year')::date
    ELSE p_data
  END;
$$;

CREATE OR REPLACE FUNCTION public.executar_rotina_administrativa()
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  hoje date := current_date;
  limite date := current_date + 7;
  obrigacao record;
  despesa record;
  alertas_criados integer := 0;
  rascunhos_criados integer := 0;
  notificacoes_criadas integer := 0;
BEGIN
  FOR obrigacao IN
    SELECT * FROM public.obrigacoes_recorrentes
    WHERE estado = 'ativa'
      AND proximo_vencimento IS NOT NULL
      AND proximo_vencimento <= limite
  LOOP
    INSERT INTO public.alertas_operacionais (
      tenant_id, tipo, titulo, descricao, entidade_tipo, entidade_id,
      data_referencia, severidade, chave_idempotencia
    ) VALUES (
      obrigacao.tenant_id,
      'vencimento_obrigacao',
      'Obrigação próxima: ' || obrigacao.titulo,
      'Vencimento previsto para ' || to_char(obrigacao.proximo_vencimento, 'DD/MM/YYYY') || '. Reveja a obrigação e a documentação antes de qualquer pagamento.',
      'obrigacao', obrigacao.id, obrigacao.proximo_vencimento,
      CASE WHEN obrigacao.proximo_vencimento < hoje THEN 'alta' ELSE 'normal' END,
      'obrigacao:' || obrigacao.id::text || ':vencimento:' || obrigacao.proximo_vencimento::text
    ) ON CONFLICT (tenant_id, chave_idempotencia) DO NOTHING;

    IF FOUND THEN
      alertas_criados := alertas_criados + 1;
      PERFORM public.notificar_admins(
        obrigacao.tenant_id, 'sistema',
        'Obrigação próxima: ' || obrigacao.titulo,
        'Vencimento previsto para ' || to_char(obrigacao.proximo_vencimento, 'DD/MM/YYYY') || '.',
        'obrigacao', obrigacao.id,
        jsonb_build_object('alerta_tipo', 'vencimento_obrigacao', 'data_referencia', obrigacao.proximo_vencimento)
      );
      notificacoes_criadas := notificacoes_criadas + 1;
    END IF;

    IF obrigacao.valor_estimado_cents IS NOT NULL
       AND obrigacao.proximo_vencimento <= limite
       AND NOT EXISTS (
         SELECT 1 FROM public.despesas d
         WHERE d.tenant_id = obrigacao.tenant_id
           AND d.obrigacao_id = obrigacao.id
           AND d.data_vencimento = obrigacao.proximo_vencimento
           AND d.estado <> 'cancelado'
       ) THEN
      INSERT INTO public.despesas (
        tenant_id, fornecedor_id, contrato_id, obrigacao_id, descricao,
        categoria, referencia, data_vencimento, valor_cents, estado, notas
      ) VALUES (
        obrigacao.tenant_id, obrigacao.fornecedor_id, obrigacao.contrato_id, obrigacao.id,
        obrigacao.titulo || ' — período ' || to_char(obrigacao.proximo_vencimento, 'MM/YYYY'),
        obrigacao.categoria, 'Gerado pela obrigação recorrente',
        obrigacao.proximo_vencimento, obrigacao.valor_estimado_cents, 'rascunho',
        'Rascunho gerado pela rotina administrativa. Validar fatura, valor e vencimento antes de submeter a aprovação.'
      );
      rascunhos_criados := rascunhos_criados + 1;

      UPDATE public.obrigacoes_recorrentes
      SET proximo_vencimento = public.adicionar_periodicidade(obrigacao.proximo_vencimento, obrigacao.periodicidade)
      WHERE id = obrigacao.id
        AND periodicidade <> 'pontual';
    END IF;
  END LOOP;

  FOR despesa IN
    SELECT * FROM public.despesas
    WHERE estado IN ('pendente', 'em_aprovacao', 'aprovada', 'a_reconciliar', 'vencido')
      AND data_vencimento IS NOT NULL
      AND data_vencimento <= limite
  LOOP
    INSERT INTO public.alertas_operacionais (
      tenant_id, tipo, titulo, descricao, entidade_tipo, entidade_id,
      data_referencia, severidade, chave_idempotencia
    ) VALUES (
      despesa.tenant_id,
      CASE WHEN despesa.data_vencimento < hoje THEN 'despesa_vencida' ELSE 'vencimento_despesa' END,
      CASE WHEN despesa.data_vencimento < hoje THEN 'Despesa vencida: ' ELSE 'Despesa próxima: ' END || despesa.descricao,
      'Vencimento ' || to_char(despesa.data_vencimento, 'DD/MM/YYYY') || '. Estado atual: ' || replace(despesa.estado, '_', ' ') || '.',
      'despesa', despesa.id, despesa.data_vencimento,
      CASE WHEN despesa.data_vencimento < hoje THEN 'alta' ELSE 'normal' END,
      'despesa:' || despesa.id::text || ':vencimento:' || despesa.data_vencimento::text
    ) ON CONFLICT (tenant_id, chave_idempotencia) DO NOTHING;

    IF FOUND THEN
      alertas_criados := alertas_criados + 1;
      PERFORM public.notificar_admins(
        despesa.tenant_id, 'sistema',
        CASE WHEN despesa.data_vencimento < hoje THEN 'Despesa vencida: ' ELSE 'Despesa próxima: ' END || despesa.descricao,
        'Vencimento ' || to_char(despesa.data_vencimento, 'DD/MM/YYYY') || '.',
        'despesa', despesa.id,
        jsonb_build_object('alerta_tipo', 'vencimento_despesa', 'data_referencia', despesa.data_vencimento)
      );
      notificacoes_criadas := notificacoes_criadas + 1;
    END IF;
  END LOOP;

  RETURN jsonb_build_object(
    'executado_em', now(),
    'alertas_criados', alertas_criados,
    'rascunhos_criados', rascunhos_criados,
    'notificacoes_criadas', notificacoes_criadas
  );
END;
$$;

REVOKE ALL ON FUNCTION public.executar_rotina_administrativa() FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.adicionar_periodicidade(date, text) FROM PUBLIC, anon, authenticated;

CREATE EXTENSION IF NOT EXISTS pg_cron;

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM cron.job WHERE jobname = 'portaria-rotina-administrativa-diaria') THEN
    PERFORM cron.schedule(
      'portaria-rotina-administrativa-diaria',
      '5 7 * * *',
      'SELECT public.executar_rotina_administrativa();'
    );
  END IF;
END;
$$;
