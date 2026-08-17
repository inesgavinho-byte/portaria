-- =============================================================================
-- Migration 0035: Despesas, obrigações recorrentes e documentos financeiros
-- =============================================================================
-- Este módulo complementa quotas/pagamentos dos condóminos. Não substitui nem
-- altera as tabelas de receitas existentes.

CREATE TABLE IF NOT EXISTS obrigacoes_recorrentes (
  id                  uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id           uuid NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  fornecedor_id       uuid REFERENCES fornecedores(id) ON DELETE SET NULL,
  contrato_id         uuid REFERENCES contratos(id) ON DELETE SET NULL,
  titulo              text NOT NULL,
  categoria           text NOT NULL DEFAULT 'outro'
                        CHECK (categoria IN ('seguranca_social','salario','elevadores','seguro','manutencao','obras','servicos','impostos','outro')),
  periodicidade       text NOT NULL DEFAULT 'mensal'
                        CHECK (periodicidade IN ('mensal','trimestral','semestral','anual','pontual')),
  valor_estimado_cents integer CHECK (valor_estimado_cents IS NULL OR valor_estimado_cents > 0),
  proximo_vencimento  date,
  estado              text NOT NULL DEFAULT 'ativa'
                        CHECK (estado IN ('ativa','suspensa','terminada')),
  notas               text,
  criado_por          uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  criado_em           timestamptz NOT NULL DEFAULT now(),
  atualizado_em       timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_obrigacoes_tenant_estado
  ON obrigacoes_recorrentes(tenant_id, estado, proximo_vencimento);
CREATE INDEX IF NOT EXISTS idx_obrigacoes_fornecedor
  ON obrigacoes_recorrentes(fornecedor_id);

ALTER TABLE obrigacoes_recorrentes ENABLE ROW LEVEL SECURITY;

CREATE POLICY obrigacoes_admin_all ON obrigacoes_recorrentes
  FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM user_tenants ut
      WHERE ut.user_id = auth.uid()
        AND ut.tenant_id = obrigacoes_recorrentes.tenant_id
        AND ut.role = 'admin'
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM user_tenants ut
      WHERE ut.user_id = auth.uid()
        AND ut.tenant_id = obrigacoes_recorrentes.tenant_id
        AND ut.role = 'admin'
    )
  );

CREATE TABLE IF NOT EXISTS despesas (
  id                    uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id             uuid NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  fornecedor_id         uuid REFERENCES fornecedores(id) ON DELETE SET NULL,
  contrato_id           uuid REFERENCES contratos(id) ON DELETE SET NULL,
  obrigacao_id          uuid REFERENCES obrigacoes_recorrentes(id) ON DELETE SET NULL,
  descricao             text NOT NULL,
  categoria             text NOT NULL DEFAULT 'outro'
                          CHECK (categoria IN ('seguranca_social','salario','elevadores','seguro','manutencao','obras','servicos','impostos','outro')),
  numero_documento      text,
  referencia            text,
  data_documento        date,
  data_vencimento       date,
  valor_cents           integer NOT NULL CHECK (valor_cents > 0),
  estado                text NOT NULL DEFAULT 'a_reconciliar'
                          CHECK (estado IN ('rascunho','pendente','pago','vencido','cancelado','a_reconciliar')),
  data_pagamento        date,
  metodo_pagamento      text CHECK (metodo_pagamento IS NULL OR metodo_pagamento IN ('transferencia','debito_direto','mbway','dinheiro','outro')),
  referencia_pagamento  text,
  notas                 text,
  criado_por            uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  criado_em             timestamptz NOT NULL DEFAULT now(),
  atualizado_em         timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT despesas_pagamento_consistente CHECK (
    (estado <> 'pago') OR (data_pagamento IS NOT NULL)
  )
);

CREATE INDEX IF NOT EXISTS idx_despesas_tenant_estado_vencimento
  ON despesas(tenant_id, estado, data_vencimento);
CREATE INDEX IF NOT EXISTS idx_despesas_fornecedor ON despesas(fornecedor_id);
CREATE INDEX IF NOT EXISTS idx_despesas_contrato ON despesas(contrato_id);
CREATE INDEX IF NOT EXISTS idx_despesas_obrigacao ON despesas(obrigacao_id);
CREATE UNIQUE INDEX IF NOT EXISTS idx_despesas_documento_unico
  ON despesas(tenant_id, fornecedor_id, numero_documento)
  WHERE numero_documento IS NOT NULL;

ALTER TABLE despesas ENABLE ROW LEVEL SECURITY;

CREATE POLICY despesas_admin_all ON despesas
  FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM user_tenants ut
      WHERE ut.user_id = auth.uid()
        AND ut.tenant_id = despesas.tenant_id
        AND ut.role = 'admin'
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM user_tenants ut
      WHERE ut.user_id = auth.uid()
        AND ut.tenant_id = despesas.tenant_id
        AND ut.role = 'admin'
    )
  );

CREATE TABLE IF NOT EXISTS despesas_documentos (
  id                        uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id                 uuid NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  despesa_id                uuid NOT NULL REFERENCES despesas(id) ON DELETE CASCADE,
  documento_administracao_id uuid NOT NULL REFERENCES documentos_administracao(id) ON DELETE CASCADE,
  papel                     text NOT NULL DEFAULT 'outro'
                            CHECK (papel IN ('fatura','comprovativo','nota_credito','correspondencia','outro')),
  criado_por                uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  criado_em                 timestamptz NOT NULL DEFAULT now(),
  UNIQUE(despesa_id, documento_administracao_id)
);

CREATE INDEX IF NOT EXISTS idx_despesas_documentos_despesa ON despesas_documentos(despesa_id);

ALTER TABLE despesas_documentos ENABLE ROW LEVEL SECURITY;

CREATE POLICY despesas_documentos_admin_all ON despesas_documentos
  FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM user_tenants ut
      WHERE ut.user_id = auth.uid()
        AND ut.tenant_id = despesas_documentos.tenant_id
        AND ut.role = 'admin'
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM user_tenants ut
      WHERE ut.user_id = auth.uid()
        AND ut.tenant_id = despesas_documentos.tenant_id
        AND ut.role = 'admin'
    )
  );

CREATE OR REPLACE FUNCTION atualizar_timestamp_despesas_obrigacoes()
RETURNS TRIGGER AS $$
BEGIN
  NEW.atualizado_em = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_obrigacoes_atualizado ON obrigacoes_recorrentes;
CREATE TRIGGER trg_obrigacoes_atualizado
  BEFORE UPDATE ON obrigacoes_recorrentes
  FOR EACH ROW EXECUTE FUNCTION atualizar_timestamp_despesas_obrigacoes();

DROP TRIGGER IF EXISTS trg_despesas_atualizado ON despesas;
CREATE TRIGGER trg_despesas_atualizado
  BEFORE UPDATE ON despesas
  FOR EACH ROW EXECUTE FUNCTION atualizar_timestamp_despesas_obrigacoes();

-- Impedir relações cruzadas entre tenants mesmo quando uma ação administrativa
-- recebe identificadores válidos de fornecedores, contratos ou documentos.
CREATE OR REPLACE FUNCTION validar_tenant_despesa()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.fornecedor_id IS NOT NULL AND NOT EXISTS (
    SELECT 1 FROM fornecedores f WHERE f.id = NEW.fornecedor_id AND f.tenant_id = NEW.tenant_id
  ) THEN
    RAISE EXCEPTION 'Fornecedor não pertence ao condomínio da despesa';
  END IF;

  IF NEW.contrato_id IS NOT NULL AND NOT EXISTS (
    SELECT 1 FROM contratos c WHERE c.id = NEW.contrato_id AND c.tenant_id = NEW.tenant_id
  ) THEN
    RAISE EXCEPTION 'Contrato não pertence ao condomínio da despesa';
  END IF;

  IF NEW.obrigacao_id IS NOT NULL AND NOT EXISTS (
    SELECT 1 FROM obrigacoes_recorrentes o WHERE o.id = NEW.obrigacao_id AND o.tenant_id = NEW.tenant_id
  ) THEN
    RAISE EXCEPTION 'Obrigação não pertence ao condomínio da despesa';
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_validar_tenant_despesa ON despesas;
CREATE TRIGGER trg_validar_tenant_despesa
  BEFORE INSERT OR UPDATE ON despesas
  FOR EACH ROW EXECUTE FUNCTION validar_tenant_despesa();

CREATE OR REPLACE FUNCTION validar_tenant_documento_despesa()
RETURNS TRIGGER AS $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM despesas d WHERE d.id = NEW.despesa_id AND d.tenant_id = NEW.tenant_id
  ) THEN
    RAISE EXCEPTION 'Despesa não pertence ao condomínio do documento';
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM documentos_administracao da
    WHERE da.id = NEW.documento_administracao_id AND da.tenant_id = NEW.tenant_id
  ) THEN
    RAISE EXCEPTION 'Documento não pertence ao condomínio da despesa';
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_validar_tenant_documento_despesa ON despesas_documentos;
CREATE TRIGGER trg_validar_tenant_documento_despesa
  BEFORE INSERT OR UPDATE ON despesas_documentos
  FOR EACH ROW EXECUTE FUNCTION validar_tenant_documento_despesa();
