-- =============================================================================
-- Migration 0038: Ativos, planos e tarefas de manutenção preventiva
-- =============================================================================

CREATE TABLE IF NOT EXISTS ativos_manutencao (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  fornecedor_id uuid REFERENCES fornecedores(id) ON DELETE SET NULL,
  contrato_id uuid REFERENCES contratos(id) ON DELETE SET NULL,
  nome text NOT NULL,
  categoria text NOT NULL CHECK (categoria IN ('elevadores', 'cobertura', 'fachada', 'bombas', 'extintores', 'portas', 'eletricidade', 'agua', 'outro')),
  localizacao text,
  codigo_interno text,
  estado text NOT NULL DEFAULT 'ativo' CHECK (estado IN ('ativo', 'inativo', 'substituido')),
  notas text,
  criado_por uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  criado_em timestamptz NOT NULL DEFAULT now(),
  atualizado_em timestamptz NOT NULL DEFAULT now(),
  UNIQUE (tenant_id, nome)
);

CREATE TABLE IF NOT EXISTS planos_manutencao (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  ativo_id uuid NOT NULL REFERENCES ativos_manutencao(id) ON DELETE CASCADE,
  fornecedor_id uuid REFERENCES fornecedores(id) ON DELETE SET NULL,
  contrato_id uuid REFERENCES contratos(id) ON DELETE SET NULL,
  titulo text NOT NULL,
  periodicidade text NOT NULL CHECK (periodicidade IN ('mensal', 'trimestral', 'semestral', 'anual', 'pontual')),
  ultima_execucao date,
  proxima_execucao date NOT NULL,
  antecedencia_alerta_dias integer NOT NULL DEFAULT 14 CHECK (antecedencia_alerta_dias BETWEEN 1 AND 90),
  instrucoes text,
  estado text NOT NULL DEFAULT 'ativo' CHECK (estado IN ('ativo', 'suspenso', 'terminado')),
  criado_por uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  criado_em timestamptz NOT NULL DEFAULT now(),
  atualizado_em timestamptz NOT NULL DEFAULT now(),
  UNIQUE (tenant_id, ativo_id, titulo)
);

CREATE TABLE IF NOT EXISTS tarefas_manutencao (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  plano_id uuid NOT NULL REFERENCES planos_manutencao(id) ON DELETE CASCADE,
  ativo_id uuid NOT NULL REFERENCES ativos_manutencao(id) ON DELETE CASCADE,
  fornecedor_id uuid REFERENCES fornecedores(id) ON DELETE SET NULL,
  titulo text NOT NULL,
  data_planeada date NOT NULL,
  data_conclusao date,
  estado text NOT NULL DEFAULT 'planeada' CHECK (estado IN ('planeada', 'agendada', 'em_curso', 'concluida', 'cancelada')),
  observacoes text,
  concluida_por uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  criado_em timestamptz NOT NULL DEFAULT now(),
  atualizado_em timestamptz NOT NULL DEFAULT now(),
  UNIQUE (plano_id, data_planeada)
);

CREATE INDEX IF NOT EXISTS idx_ativos_manutencao_tenant_estado ON ativos_manutencao(tenant_id, estado);
CREATE INDEX IF NOT EXISTS idx_planos_manutencao_tenant_execucao ON planos_manutencao(tenant_id, estado, proxima_execucao);
CREATE INDEX IF NOT EXISTS idx_tarefas_manutencao_tenant_planeada ON tarefas_manutencao(tenant_id, estado, data_planeada);

ALTER TABLE ativos_manutencao ENABLE ROW LEVEL SECURITY;
ALTER TABLE planos_manutencao ENABLE ROW LEVEL SECURITY;
ALTER TABLE tarefas_manutencao ENABLE ROW LEVEL SECURITY;

CREATE POLICY ativos_manutencao_admin_all ON ativos_manutencao
  FOR ALL USING (EXISTS (SELECT 1 FROM user_tenants ut WHERE ut.user_id = auth.uid() AND ut.tenant_id = ativos_manutencao.tenant_id AND ut.role = 'admin'))
  WITH CHECK (EXISTS (SELECT 1 FROM user_tenants ut WHERE ut.user_id = auth.uid() AND ut.tenant_id = ativos_manutencao.tenant_id AND ut.role = 'admin'));

CREATE POLICY planos_manutencao_admin_all ON planos_manutencao
  FOR ALL USING (EXISTS (SELECT 1 FROM user_tenants ut WHERE ut.user_id = auth.uid() AND ut.tenant_id = planos_manutencao.tenant_id AND ut.role = 'admin'))
  WITH CHECK (EXISTS (SELECT 1 FROM user_tenants ut WHERE ut.user_id = auth.uid() AND ut.tenant_id = planos_manutencao.tenant_id AND ut.role = 'admin'));

CREATE POLICY tarefas_manutencao_admin_all ON tarefas_manutencao
  FOR ALL USING (EXISTS (SELECT 1 FROM user_tenants ut WHERE ut.user_id = auth.uid() AND ut.tenant_id = tarefas_manutencao.tenant_id AND ut.role = 'admin'))
  WITH CHECK (EXISTS (SELECT 1 FROM user_tenants ut WHERE ut.user_id = auth.uid() AND ut.tenant_id = tarefas_manutencao.tenant_id AND ut.role = 'admin'));

CREATE OR REPLACE FUNCTION public.atualizar_timestamp_manutencao()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
BEGIN
  NEW.atualizado_em = now();
  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_ativos_manutencao_atualizado BEFORE UPDATE ON ativos_manutencao FOR EACH ROW EXECUTE FUNCTION public.atualizar_timestamp_manutencao();
CREATE TRIGGER trg_planos_manutencao_atualizado BEFORE UPDATE ON planos_manutencao FOR EACH ROW EXECUTE FUNCTION public.atualizar_timestamp_manutencao();
CREATE TRIGGER trg_tarefas_manutencao_atualizado BEFORE UPDATE ON tarefas_manutencao FOR EACH ROW EXECUTE FUNCTION public.atualizar_timestamp_manutencao();

CREATE OR REPLACE FUNCTION public.validar_tenant_manutencao()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
BEGIN
  IF TG_TABLE_NAME = 'planos_manutencao' AND NOT EXISTS (
    SELECT 1 FROM public.ativos_manutencao a WHERE a.id = NEW.ativo_id AND a.tenant_id = NEW.tenant_id
  ) THEN
    RAISE EXCEPTION 'Ativo não pertence ao condomínio do plano';
  END IF;

  IF TG_TABLE_NAME = 'tarefas_manutencao' AND NOT EXISTS (
    SELECT 1 FROM public.planos_manutencao p WHERE p.id = NEW.plano_id AND p.tenant_id = NEW.tenant_id
  ) THEN
    RAISE EXCEPTION 'Plano não pertence ao condomínio da tarefa';
  END IF;

  IF NEW.fornecedor_id IS NOT NULL AND NOT EXISTS (
    SELECT 1 FROM public.fornecedores f WHERE f.id = NEW.fornecedor_id AND f.tenant_id = NEW.tenant_id
  ) THEN
    RAISE EXCEPTION 'Fornecedor não pertence ao condomínio';
  END IF;

  IF TG_TABLE_NAME <> 'tarefas_manutencao' AND NEW.contrato_id IS NOT NULL AND NOT EXISTS (
    SELECT 1 FROM public.contratos c WHERE c.id = NEW.contrato_id AND c.tenant_id = NEW.tenant_id
  ) THEN
    RAISE EXCEPTION 'Contrato não pertence ao condomínio';
  END IF;

  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_validar_tenant_plano_manutencao BEFORE INSERT OR UPDATE ON planos_manutencao FOR EACH ROW EXECUTE FUNCTION public.validar_tenant_manutencao();
CREATE TRIGGER trg_validar_tenant_tarefa_manutencao BEFORE INSERT OR UPDATE ON tarefas_manutencao FOR EACH ROW EXECUTE FUNCTION public.validar_tenant_manutencao();

CREATE OR REPLACE FUNCTION public.gerar_tarefas_manutencao_proximas()
RETURNS integer
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  plano record;
  criadas integer := 0;
BEGIN
  FOR plano IN
    SELECT p.*, a.nome AS ativo_nome
    FROM public.planos_manutencao p
    JOIN public.ativos_manutencao a ON a.id = p.ativo_id
    WHERE p.estado = 'ativo'
      AND p.proxima_execucao <= current_date + p.antecedencia_alerta_dias
  LOOP
    INSERT INTO public.tarefas_manutencao (
      tenant_id, plano_id, ativo_id, fornecedor_id, titulo, data_planeada, estado, observacoes
    ) VALUES (
      plano.tenant_id, plano.id, plano.ativo_id, plano.fornecedor_id,
      plano.titulo || ' — ' || plano.ativo_nome, plano.proxima_execucao, 'planeada', plano.instrucoes
    ) ON CONFLICT (plano_id, data_planeada) DO NOTHING;

    IF FOUND THEN
      criadas := criadas + 1;
      INSERT INTO public.alertas_operacionais (
        tenant_id, tipo, titulo, descricao, entidade_tipo, entidade_id,
        data_referencia, severidade, chave_idempotencia
      ) VALUES (
        plano.tenant_id, 'manutencao_proxima', 'Manutenção próxima: ' || plano.titulo,
        'Ativo: ' || plano.ativo_nome || '. Data planeada: ' || to_char(plano.proxima_execucao, 'DD/MM/YYYY') || '.',
        'manutencao', plano.id, plano.proxima_execucao,
        CASE WHEN plano.proxima_execucao < current_date THEN 'alta' ELSE 'normal' END,
        'manutencao:' || plano.id::text || ':execucao:' || plano.proxima_execucao::text
      ) ON CONFLICT (tenant_id, chave_idempotencia) DO NOTHING;

      PERFORM public.notificar_admins(
        plano.tenant_id, 'sistema', 'Manutenção próxima: ' || plano.titulo,
        'Ativo: ' || plano.ativo_nome || '. Data planeada: ' || to_char(plano.proxima_execucao, 'DD/MM/YYYY') || '.',
        'manutencao', plano.id,
        jsonb_build_object('alerta_tipo', 'manutencao_proxima', 'data_referencia', plano.proxima_execucao)
      );
    END IF;
  END LOOP;
  RETURN criadas;
END;
$$;

-- Preservar a rotina financeira da migration 0037 e compô-la numa rotina diária
-- única, já referida pelo job pg_cron existente.
ALTER FUNCTION public.executar_rotina_administrativa() RENAME TO executar_rotina_financeira_base;

CREATE OR REPLACE FUNCTION public.executar_rotina_administrativa()
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  resultado_financeiro jsonb;
  tarefas_criadas integer;
BEGIN
  resultado_financeiro := public.executar_rotina_financeira_base();
  tarefas_criadas := public.gerar_tarefas_manutencao_proximas();
  RETURN resultado_financeiro || jsonb_build_object('tarefas_manutencao_criadas', tarefas_criadas);
END;
$$;

REVOKE ALL ON FUNCTION public.gerar_tarefas_manutencao_proximas() FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.executar_rotina_financeira_base() FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.executar_rotina_administrativa() FROM PUBLIC, anon, authenticated;
