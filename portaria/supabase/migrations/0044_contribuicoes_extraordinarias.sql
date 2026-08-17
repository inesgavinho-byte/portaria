-- 0044_contribuicoes_extraordinarias.sql
-- Contribuições extraordinárias vinculadas a obras ou deliberações específicas.

CREATE TABLE public.contribuicoes_extraordinarias (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  titulo text NOT NULL CHECK (char_length(btrim(titulo)) BETWEEN 1 AND 240),
  descricao text,
  referencia text,
  estado text NOT NULL DEFAULT 'rascunho' CHECK (estado IN ('rascunho', 'ativa', 'encerrada', 'arquivada', 'cancelada')),
  total_cents integer NOT NULL CHECK (total_cents >= 0),
  documento_administracao_id uuid REFERENCES public.documentos_administracao(id) ON DELETE RESTRICT,
  criado_por uuid NOT NULL REFERENCES auth.users(id) ON DELETE RESTRICT,
  criado_em timestamptz NOT NULL DEFAULT now(),
  atualizado_em timestamptz NOT NULL DEFAULT now()
);

COMMENT ON TABLE public.contribuicoes_extraordinarias IS
  'Receitas extraordinárias por obra ou deliberação, separadas das quotas ordinárias.';

CREATE INDEX contribuicoes_extraordinarias_tenant_estado_idx
  ON public.contribuicoes_extraordinarias (tenant_id, estado, criado_em DESC);

CREATE TABLE public.contribuicao_prestacoes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  contribuicao_id uuid NOT NULL REFERENCES public.contribuicoes_extraordinarias(id) ON DELETE CASCADE,
  ordem smallint NOT NULL CHECK (ordem > 0),
  designacao text NOT NULL CHECK (char_length(btrim(designacao)) BETWEEN 1 AND 160),
  vencimento date NOT NULL,
  valor_cents integer NOT NULL CHECK (valor_cents >= 0),
  estado text NOT NULL DEFAULT 'prevista' CHECK (estado IN ('prevista', 'liquidada', 'parcial', 'anulada')),
  liquidado_em date,
  fonte text,
  criado_em timestamptz NOT NULL DEFAULT now(),
  atualizado_em timestamptz NOT NULL DEFAULT now(),
  UNIQUE (contribuicao_id, ordem)
);

COMMENT ON TABLE public.contribuicao_prestacoes IS
  'Prestações de uma contribuição extraordinária, com vencimento e estado global próprios.';

CREATE INDEX contribuicao_prestacoes_contribuicao_idx
  ON public.contribuicao_prestacoes (contribuicao_id, ordem);

CREATE TABLE public.contribuicao_prestacao_fracoes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  prestacao_id uuid NOT NULL REFERENCES public.contribuicao_prestacoes(id) ON DELETE CASCADE,
  fracao_id uuid NOT NULL REFERENCES public.fracoes(id) ON DELETE RESTRICT,
  valor_cents integer NOT NULL CHECK (valor_cents >= 0),
  liquidado_cents integer NOT NULL DEFAULT 0 CHECK (liquidado_cents >= 0 AND liquidado_cents <= valor_cents),
  estado text NOT NULL DEFAULT 'pendente' CHECK (estado IN ('pendente', 'liquidada', 'parcial', 'dispensada', 'anulada')),
  liquidado_em date,
  referencia text,
  observacoes text,
  criado_em timestamptz NOT NULL DEFAULT now(),
  atualizado_em timestamptz NOT NULL DEFAULT now(),
  UNIQUE (prestacao_id, fracao_id)
);

COMMENT ON TABLE public.contribuicao_prestacao_fracoes IS
  'Posição individual por fração em cada prestação extraordinária; não substitui movimento bancário ou recibo.';

CREATE INDEX contribuicao_prestacao_fracoes_fracao_idx
  ON public.contribuicao_prestacao_fracoes (tenant_id, fracao_id, prestacao_id);
CREATE INDEX contribuicao_prestacao_fracoes_prestacao_estado_idx
  ON public.contribuicao_prestacao_fracoes (prestacao_id, estado);

ALTER TABLE public.contribuicoes_extraordinarias ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.contribuicao_prestacoes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.contribuicao_prestacao_fracoes ENABLE ROW LEVEL SECURITY;

CREATE POLICY contribuicoes_extraordinarias_admin_all ON public.contribuicoes_extraordinarias
  FOR ALL USING (public.is_tenant_admin(tenant_id))
  WITH CHECK (public.is_tenant_admin(tenant_id));

CREATE POLICY contribuicao_prestacoes_admin_all ON public.contribuicao_prestacoes
  FOR ALL USING (public.is_tenant_admin(tenant_id))
  WITH CHECK (public.is_tenant_admin(tenant_id));

CREATE POLICY contribuicao_prestacao_fracoes_admin_all ON public.contribuicao_prestacao_fracoes
  FOR ALL USING (public.is_tenant_admin(tenant_id))
  WITH CHECK (public.is_tenant_admin(tenant_id));

CREATE OR REPLACE FUNCTION public.atualizar_contribuicoes_extraordinarias_atualizado_em()
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

CREATE TRIGGER contribuicoes_extraordinarias_atualizado_em
  BEFORE UPDATE ON public.contribuicoes_extraordinarias
  FOR EACH ROW EXECUTE FUNCTION public.atualizar_contribuicoes_extraordinarias_atualizado_em();

CREATE TRIGGER contribuicao_prestacoes_atualizado_em
  BEFORE UPDATE ON public.contribuicao_prestacoes
  FOR EACH ROW EXECUTE FUNCTION public.atualizar_contribuicoes_extraordinarias_atualizado_em();

CREATE TRIGGER contribuicao_prestacao_fracoes_atualizado_em
  BEFORE UPDATE ON public.contribuicao_prestacao_fracoes
  FOR EACH ROW EXECUTE FUNCTION public.atualizar_contribuicoes_extraordinarias_atualizado_em();

REVOKE ALL ON FUNCTION public.atualizar_contribuicoes_extraordinarias_atualizado_em() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.atualizar_contribuicoes_extraordinarias_atualizado_em() TO authenticated;
