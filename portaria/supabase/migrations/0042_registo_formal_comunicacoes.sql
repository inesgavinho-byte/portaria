-- 0042_registo_formal_comunicacoes.sql
-- Registo operacional de comunicações administrativas e entregas por fração.

CREATE TABLE public.comunicacoes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  tipo text NOT NULL DEFAULT 'geral' CHECK (tipo IN (
    'circular', 'convocatoria', 'ata', 'quotas', 'obras_manutencao',
    'cobranca', 'entrega_documental', 'aviso', 'geral', 'outro'
  )),
  assunto text NOT NULL CHECK (char_length(btrim(assunto)) BETWEEN 1 AND 240),
  descricao text,
  estado text NOT NULL DEFAULT 'rascunho' CHECK (estado IN (
    'rascunho', 'preparada', 'em_envio', 'concluida', 'arquivada', 'cancelada'
  )),
  data_comunicacao date NOT NULL DEFAULT current_date,
  data_limite date,
  criado_por uuid NOT NULL REFERENCES auth.users(id) ON DELETE RESTRICT,
  criado_em timestamptz NOT NULL DEFAULT now(),
  atualizado_em timestamptz NOT NULL DEFAULT now(),
  CHECK (data_limite IS NULL OR data_limite >= data_comunicacao)
);

COMMENT ON TABLE public.comunicacoes IS
  'Registo formal e auditável de comunicações administrativas, sem envio automático nesta primeira versão.';

CREATE INDEX comunicacoes_tenant_estado_data_idx
  ON public.comunicacoes (tenant_id, estado, data_comunicacao DESC, criado_em DESC);

CREATE TABLE public.comunicacao_destinatarios (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  comunicacao_id uuid NOT NULL REFERENCES public.comunicacoes(id) ON DELETE CASCADE,
  fracao_id uuid NOT NULL REFERENCES public.fracoes(id) ON DELETE RESTRICT,
  papel_destinatario text NOT NULL DEFAULT 'proprietario' CHECK (papel_destinatario IN (
    'proprietario', 'inquilino', 'ambos', 'representante', 'outro'
  )),
  destinatario_nome text,
  destinatario_email text,
  destinatario_telefone text,
  canal text NOT NULL DEFAULT 'email' CHECK (canal IN (
    'email', 'correio_simples', 'correio_registado', 'entrega_em_mao', 'portal', 'outro'
  )),
  estado text NOT NULL DEFAULT 'pendente' CHECK (estado IN (
    'pendente', 'enviado', 'entregue', 'devolvido', 'sem_contacto', 'dispensado'
  )),
  enviado_em timestamptz,
  entregue_em timestamptz,
  referencia_envio text,
  observacoes text,
  criado_em timestamptz NOT NULL DEFAULT now(),
  atualizado_em timestamptz NOT NULL DEFAULT now(),
  UNIQUE (comunicacao_id, fracao_id),
  CHECK (entregue_em IS NULL OR enviado_em IS NULL OR entregue_em >= enviado_em)
);

COMMENT ON TABLE public.comunicacao_destinatarios IS
  'Entrega individual por fração. Os contactos são fotografias históricas, não substitutos da ficha da fração.';

CREATE INDEX comunicacao_destinatarios_fracao_data_idx
  ON public.comunicacao_destinatarios (tenant_id, fracao_id, atualizado_em DESC);
CREATE INDEX comunicacao_destinatarios_comunicacao_estado_idx
  ON public.comunicacao_destinatarios (comunicacao_id, estado);

CREATE TABLE public.comunicacao_documentos (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  comunicacao_id uuid NOT NULL REFERENCES public.comunicacoes(id) ON DELETE CASCADE,
  documento_id uuid REFERENCES public.documentos(id) ON DELETE RESTRICT,
  documento_administracao_id uuid REFERENCES public.documentos_administracao(id) ON DELETE RESTRICT,
  nota text,
  criado_em timestamptz NOT NULL DEFAULT now(),
  CHECK (num_nonnulls(documento_id, documento_administracao_id) <= 1),
  UNIQUE NULLS NOT DISTINCT (comunicacao_id, documento_id, documento_administracao_id)
);

COMMENT ON TABLE public.comunicacao_documentos IS
  'Ligação de uma comunicação a documentos publicados ou ao arquivo administrativo confidencial.';

CREATE INDEX comunicacao_documentos_comunicacao_idx
  ON public.comunicacao_documentos (comunicacao_id, criado_em);

ALTER TABLE public.comunicacoes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.comunicacao_destinatarios ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.comunicacao_documentos ENABLE ROW LEVEL SECURITY;

CREATE POLICY comunicacoes_admin_all ON public.comunicacoes
  FOR ALL USING (public.is_tenant_admin(tenant_id))
  WITH CHECK (public.is_tenant_admin(tenant_id));

CREATE POLICY comunicacao_destinatarios_admin_all ON public.comunicacao_destinatarios
  FOR ALL USING (public.is_tenant_admin(tenant_id))
  WITH CHECK (public.is_tenant_admin(tenant_id));

CREATE POLICY comunicacao_documentos_admin_all ON public.comunicacao_documentos
  FOR ALL USING (public.is_tenant_admin(tenant_id))
  WITH CHECK (public.is_tenant_admin(tenant_id));

CREATE OR REPLACE FUNCTION public.atualizar_comunicacao_atualizado_em()
RETURNS trigger
LANGUAGE plpgsql
SECURITY INVOKER
SET search_path = public
AS $$
BEGIN
  NEW.atualizado_em = now();
  RETURN NEW;
END;
$$;

CREATE TRIGGER comunicacoes_atualizado_em
  BEFORE UPDATE ON public.comunicacoes
  FOR EACH ROW EXECUTE FUNCTION public.atualizar_comunicacao_atualizado_em();

CREATE TRIGGER comunicacao_destinatarios_atualizado_em
  BEFORE UPDATE ON public.comunicacao_destinatarios
  FOR EACH ROW EXECUTE FUNCTION public.atualizar_comunicacao_atualizado_em();

REVOKE ALL ON FUNCTION public.atualizar_comunicacao_atualizado_em() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.atualizar_comunicacao_atualizado_em() TO authenticated;
