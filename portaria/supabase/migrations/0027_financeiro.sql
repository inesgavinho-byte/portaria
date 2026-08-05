-- =============================================================================
-- Migration 0027: Gestão Financeira — Quotas, Pagamentos e Recibos
-- =============================================================================

-- 1. Extensão para sequências (se ainda não existir)
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- 2. Adicionar quota_mensal_cents às frações (base para cálculo automático)
ALTER TABLE fracoes
  ADD COLUMN IF NOT EXISTS quota_mensal_cents integer DEFAULT 0;

-- 3. Tabela de configuração financeira (uma linha por tenant)
CREATE TABLE IF NOT EXISTS configuracao_financeira (
  tenant_id         uuid PRIMARY KEY REFERENCES tenants(id) ON DELETE CASCADE,
  dia_vencimento_padrao integer NOT NULL DEFAULT 8,
  metodo_pagamento_padrao text NOT NULL DEFAULT 'transferencia',
  iban              text,
  mbway_telefone    text,
  email_financeiro  text,
  moeda             text NOT NULL DEFAULT 'EUR',
  taxa_juros_mora   numeric(5,2) DEFAULT 0,
  ultimo_numero_recibo integer NOT NULL DEFAULT 0,
  atualizado_em     timestamptz NOT NULL DEFAULT now()
);

-- RLS
ALTER TABLE configuracao_financeira ENABLE ROW LEVEL SECURITY;

CREATE POLICY cf_admin_all ON configuracao_financeira
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM user_tenants ut
      WHERE ut.user_id = auth.uid()
        AND ut.tenant_id = configuracao_financeira.tenant_id
        AND ut.role = 'admin'
    )
  );

CREATE POLICY cf_condomino_read ON configuracao_financeira
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM user_tenants ut
      WHERE ut.user_id = auth.uid()
        AND ut.tenant_id = configuracao_financeira.tenant_id
    )
  );

-- Trigger de atualização
CREATE OR REPLACE FUNCTION atualizar_timestamp_config_financeira()
RETURNS TRIGGER AS $$
BEGIN
  NEW.atualizado_em = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_config_financeira_atualizado ON configuracao_financeira;
CREATE TRIGGER trg_config_financeira_atualizado
  BEFORE UPDATE ON configuracao_financeira
  FOR EACH ROW EXECUTE FUNCTION atualizar_timestamp_config_financeira();

-- 4. Tabela de quotas mensais
CREATE TABLE IF NOT EXISTS quotas_mensais (
  id                uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id         uuid NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  fracao_id         uuid NOT NULL REFERENCES fracoes(id) ON DELETE CASCADE,
  ano               integer NOT NULL,
  mes               integer NOT NULL CHECK (mes BETWEEN 1 AND 12),
  valor_cents       integer NOT NULL DEFAULT 0,
  estado            text NOT NULL DEFAULT 'pendente' CHECK (estado IN ('pendente','pago','parcial','isento')),
  vencimento        date,
  notas             text,
  criado_por        uuid REFERENCES auth.users(id),
  criado_em         timestamptz NOT NULL DEFAULT now(),
  atualizado_em     timestamptz NOT NULL DEFAULT now(),
  UNIQUE (tenant_id, fracao_id, ano, mes)
);

CREATE INDEX idx_quotas_tenant ON quotas_mensais(tenant_id);
CREATE INDEX idx_quotas_fracao ON quotas_mensais(fracao_id);
CREATE INDEX idx_quotas_periodo ON quotas_mensais(ano, mes);
CREATE INDEX idx_quotas_estado ON quotas_mensais(estado);
CREATE INDEX idx_quotas_vencimento ON quotas_mensais(vencimento);

-- RLS
ALTER TABLE quotas_mensais ENABLE ROW LEVEL SECURITY;

CREATE POLICY qm_admin_all ON quotas_mensais
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM user_tenants ut
      WHERE ut.user_id = auth.uid()
        AND ut.tenant_id = quotas_mensais.tenant_id
        AND ut.role = 'admin'
    )
  );

CREATE POLICY qm_condomino_read ON quotas_mensais
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM user_tenants ut
      WHERE ut.user_id = auth.uid()
        AND ut.tenant_id = quotas_mensais.tenant_id
        AND ut.fracao_id = quotas_mensais.fracao_id
    )
  );

-- Trigger de atualização
DROP TRIGGER IF EXISTS trg_quotas_atualizado ON quotas_mensais;
CREATE TRIGGER trg_quotas_atualizado
  BEFORE UPDATE ON quotas_mensais
  FOR EACH ROW EXECUTE FUNCTION atualizar_timestamp_config_financeira();

-- 5. Tabela de pagamentos
CREATE TABLE IF NOT EXISTS pagamentos (
  id                uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id         uuid NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  fracao_id         uuid NOT NULL REFERENCES fracoes(id) ON DELETE CASCADE,
  quota_ids         uuid[] DEFAULT '{}',
  valor_cents       integer NOT NULL,
  metodo            text NOT NULL DEFAULT 'transferencia' CHECK (metodo IN ('transferencia','mbway','dinheiro','debito_direto','outro')),
  data_pagamento    date NOT NULL DEFAULT CURRENT_DATE,
  referencia        text,
  comprovativo_url  text,
  notas             text,
  registado_por     uuid REFERENCES auth.users(id),
  criado_em         timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX idx_pagamentos_tenant ON pagamentos(tenant_id);
CREATE INDEX idx_pagamentos_fracao ON pagamentos(fracao_id);
CREATE INDEX idx_pagamentos_data ON pagamentos(data_pagamento);

-- RLS
ALTER TABLE pagamentos ENABLE ROW LEVEL SECURITY;

CREATE POLICY pg_admin_all ON pagamentos
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM user_tenants ut
      WHERE ut.user_id = auth.uid()
        AND ut.tenant_id = pagamentos.tenant_id
        AND ut.role = 'admin'
    )
  );

CREATE POLICY pg_condomino_read ON pagamentos
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM user_tenants ut
      WHERE ut.user_id = auth.uid()
        AND ut.tenant_id = pagamentos.tenant_id
        AND ut.fracao_id = pagamentos.fracao_id
    )
  );

-- 6. Tabela de recibos
CREATE TABLE IF NOT EXISTS recibos (
  id                uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id         uuid NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  fracao_id         uuid NOT NULL REFERENCES fracoes(id) ON DELETE CASCADE,
  pagamento_id      uuid REFERENCES pagamentos(id) ON DELETE SET NULL,
  numero            text NOT NULL,
  valor_cents       integer NOT NULL,
  periodo_inicio    date,
  periodo_fim       date,
  pdf_url           text,
  estado            text NOT NULL DEFAULT 'emitido' CHECK (estado IN ('emitido','anulado')),
  emitido_em        timestamptz NOT NULL DEFAULT now(),
  anulado_em        timestamptz,
  anulado_por       uuid REFERENCES auth.users(id),
  motivo_anulacao   text,
  UNIQUE (tenant_id, numero)
);

CREATE INDEX idx_recibos_tenant ON recibos(tenant_id);
CREATE INDEX idx_recibos_fracao ON recibos(fracao_id);
CREATE INDEX idx_recibos_numero ON recibos(numero);
CREATE INDEX idx_recibos_estado ON recibos(estado);

-- RLS
ALTER TABLE recibos ENABLE ROW LEVEL SECURITY;

CREATE POLICY rc_admin_all ON recibos
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM user_tenants ut
      WHERE ut.user_id = auth.uid()
        AND ut.tenant_id = recibos.tenant_id
        AND ut.role = 'admin'
    )
  );

CREATE POLICY rc_condomino_read ON recibos
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM user_tenants ut
      WHERE ut.user_id = auth.uid()
        AND ut.tenant_id = recibos.tenant_id
        AND ut.fracao_id = recibos.fracao_id
    )
  );

-- =============================================================================
-- FUNÇÕES AUXILIARES
-- =============================================================================

-- Função: gerar quotas mensais para todas as frações ativas de um tenant
CREATE OR REPLACE FUNCTION gerar_quotas_mes(
  p_tenant_id uuid,
  p_ano integer,
  p_mes integer,
  p_valor_base_cents integer DEFAULT NULL
)
RETURNS integer AS $$
DECLARE
  v_count integer := 0;
  v_vencimento date;
  v_dia_venc integer;
BEGIN
  -- Obter dia de vencimento padrão
  SELECT COALESCE(dia_vencimento_padrao, 8)
  INTO v_dia_venc
  FROM configuracao_financeira
  WHERE tenant_id = p_tenant_id;

  IF v_dia_venc IS NULL THEN
    v_dia_venc := 8;
  END IF;

  -- Calcular data de vencimento (último dia do mês se o dia não existir)
  v_vencimento := make_date(p_ano, p_mes, LEAST(v_dia_venc, 28));

  -- Inserir quotas para cada fração ativa do tenant
  INSERT INTO quotas_mensais (tenant_id, fracao_id, ano, mes, valor_cents, vencimento, estado)
  SELECT
    f.tenant_id,
    f.id,
    p_ano,
    p_mes,
    COALESCE(p_valor_base_cents, f.quota_mensal_cents, 0),
    v_vencimento,
    CASE WHEN COALESCE(p_valor_base_cents, f.quota_mensal_cents, 0) = 0 THEN 'isento' ELSE 'pendente' END
  FROM fracoes f
  WHERE f.tenant_id = p_tenant_id
    AND NOT EXISTS (
      SELECT 1 FROM quotas_mensais qm
      WHERE qm.fracao_id = f.id AND qm.ano = p_ano AND qm.mes = p_mes
    );

  GET DIAGNOSTICS v_count = ROW_COUNT;
  RETURN v_count;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Função: calcular dívida total de uma fração
CREATE OR REPLACE FUNCTION calcular_divida_fracao(p_fracao_id uuid)
RETURNS integer AS $$
DECLARE
  v_total_quotas integer;
  v_total_pagos integer;
BEGIN
  SELECT COALESCE(SUM(valor_cents), 0)
  INTO v_total_quotas
  FROM quotas_mensais
  WHERE fracao_id = p_fracao_id
    AND estado IN ('pendente', 'parcial');

  SELECT COALESCE(SUM(valor_cents), 0)
  INTO v_total_pagos
  FROM pagamentos
  WHERE fracao_id = p_fracao_id;

  RETURN GREATEST(v_total_quotas - v_total_pagos, 0);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Função: obter próximo número de recibo sequencial
CREATE OR REPLACE FUNCTION obter_proximo_numero_recibo(p_tenant_id uuid)
RETURNS text AS $$
DECLARE
  v_numero integer;
  v_ano text;
BEGIN
  -- Incrementar e obter o novo número
  UPDATE configuracao_financeira
  SET ultimo_numero_recibo = ultimo_numero_recibo + 1
  WHERE tenant_id = p_tenant_id
  RETURNING ultimo_numero_recibo INTO v_numero;

  v_ano := to_char(now(), 'YYYY');

  RETURN 'R-' || v_ano || '-' || LPAD(v_numero::text, 6, '0');
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Função: atualizar estado da quota após pagamento
CREATE OR REPLACE FUNCTION atualizar_estado_quota_apos_pagamento()
RETURNS TRIGGER AS $$
DECLARE
  v_quota_id uuid;
  v_total_pago integer;
  v_quota_valor integer;
BEGIN
  -- Para cada quota vinculada a este pagamento
  FOREACH v_quota_id IN ARRAY NEW.quota_ids
  LOOP
    SELECT valor_cents INTO v_quota_valor
    FROM quotas_mensais WHERE id = v_quota_id;

    -- Calcular total pago para esta quota
    SELECT COALESCE(SUM(valor_cents), 0)
    INTO v_total_pago
    FROM pagamentos
    WHERE v_quota_id = ANY(quota_ids);

    -- Atualizar estado
    IF v_total_pago >= v_quota_valor THEN
      UPDATE quotas_mensais SET estado = 'pago' WHERE id = v_quota_id;
    ELSIF v_total_pago > 0 THEN
      UPDATE quotas_mensais SET estado = 'parcial' WHERE id = v_quota_id;
    END IF;
  END LOOP;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_atualizar_quota_pagamento ON pagamentos;
CREATE TRIGGER trg_atualizar_quota_pagamento
  AFTER INSERT ON pagamentos
  FOR EACH ROW EXECUTE FUNCTION atualizar_estado_quota_apos_pagamento();

-- =============================================================================
-- VIEW ÚTEIS
-- =============================================================================

-- View resumo de quotas por mês (para dashboard)
CREATE OR REPLACE VIEW vw_quotas_resumo_mes AS
SELECT
  qm.tenant_id,
  qm.ano,
  qm.mes,
  COUNT(*) FILTER (WHERE qm.estado = 'pendente') AS pendentes,
  COUNT(*) FILTER (WHERE qm.estado = 'pago') AS pagas,
  COUNT(*) FILTER (WHERE qm.estado = 'parcial') AS parciais,
  COUNT(*) FILTER (WHERE qm.estado = 'isento') AS isentos,
  COALESCE(SUM(qm.valor_cents) FILTER (WHERE qm.estado IN ('pendente','parcial')), 0) AS total_a_receber,
  COALESCE(SUM(qm.valor_cents) FILTER (WHERE qm.estado = 'pago'), 0) AS total_recebido
FROM quotas_mensais qm
GROUP BY qm.tenant_id, qm.ano, qm.mes;

-- View de inadimplência por fração
CREATE OR REPLACE VIEW vw_inadimplencia AS
SELECT
  f.id AS fracao_id,
  f.tenant_id,
  f.codigo,
  f.proprietario_nome,
  COALESCE(SUM(qm.valor_cents) FILTER (WHERE qm.estado IN ('pendente','parcial')), 0) AS divida_total,
  COUNT(*) FILTER (WHERE qm.estado = 'pendente') AS meses_pendentes,
  MAX(qm.vencimento) FILTER (WHERE qm.estado = 'pendente') AS ultimo_vencimento
FROM fracoes f
LEFT JOIN quotas_mensais qm ON qm.fracao_id = f.id
GROUP BY f.id, f.tenant_id, f.codigo, f.proprietario_nome;
