-- 0040_biblioteca_ia_documental.sql
-- Biblioteca confidencial organizada e assistente documental com revisão humana.

ALTER TABLE public.documentos_administracao
  ADD COLUMN IF NOT EXISTS tema text NOT NULL DEFAULT 'geral'
    CHECK (tema IN (
      'governacao_regulamento',
      'financeiro_fiscal',
      'contratos_fornecedores',
      'manutencao_obras',
      'tecnico_plantas',
      'seguros_riscos',
      'recursos_humanos',
      'transicao_correspondencia',
      'geral'
    )),
  ADD COLUMN IF NOT EXISTS palavras_chave text[] NOT NULL DEFAULT '{}';

CREATE INDEX IF NOT EXISTS documentos_administracao_tenant_tema_idx
  ON public.documentos_administracao (tenant_id, tema, ano DESC NULLS LAST, upload_em DESC);

CREATE TABLE IF NOT EXISTS public.ia_documental_configuracoes (
  tenant_id uuid PRIMARY KEY REFERENCES public.tenants(id) ON DELETE CASCADE,
  instrucoes text NOT NULL DEFAULT '',
  guardrails text NOT NULL DEFAULT '',
  exige_revisao_humana boolean NOT NULL DEFAULT true,
  modelo text NOT NULL DEFAULT 'gpt-4o',
  atualizado_em timestamptz NOT NULL DEFAULT now(),
  atualizado_por uuid REFERENCES auth.users(id) ON DELETE SET NULL
);

CREATE TABLE IF NOT EXISTS public.ia_documental_fontes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  titulo text NOT NULL CHECK (char_length(titulo) <= 240),
  referencia text,
  url text,
  conteudo_resumo text,
  jurisdicao text NOT NULL DEFAULT 'PT',
  ativa boolean NOT NULL DEFAULT true,
  criado_em timestamptz NOT NULL DEFAULT now(),
  atualizado_em timestamptz NOT NULL DEFAULT now(),
  criado_por uuid REFERENCES auth.users(id) ON DELETE SET NULL
);

CREATE INDEX IF NOT EXISTS ia_documental_fontes_tenant_ativas_idx
  ON public.ia_documental_fontes (tenant_id, ativa, titulo);

CREATE TABLE IF NOT EXISTS public.ia_documental_sessoes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  blueprint_id uuid REFERENCES public.blueprints(id) ON DELETE SET NULL,
  titulo text NOT NULL CHECK (char_length(titulo) <= 240),
  estado text NOT NULL DEFAULT 'recolha'
    CHECK (estado IN ('recolha', 'rascunho', 'em_revisao', 'aprovado', 'arquivado')),
  dados_recolhidos jsonb NOT NULL DEFAULT '{}'::jsonb,
  rascunho_html text,
  avisos jsonb NOT NULL DEFAULT '[]'::jsonb,
  fontes_utilizadas jsonb NOT NULL DEFAULT '[]'::jsonb,
  criado_por uuid NOT NULL REFERENCES auth.users(id) ON DELETE RESTRICT,
  aprovado_por uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  aprovado_em timestamptz,
  criado_em timestamptz NOT NULL DEFAULT now(),
  atualizado_em timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS ia_documental_sessoes_tenant_estado_idx
  ON public.ia_documental_sessoes (tenant_id, estado, atualizado_em DESC);

CREATE TABLE IF NOT EXISTS public.ia_documental_mensagens (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  sessao_id uuid NOT NULL REFERENCES public.ia_documental_sessoes(id) ON DELETE CASCADE,
  papel text NOT NULL CHECK (papel IN ('administrador', 'assistente', 'sistema')),
  conteudo text NOT NULL CHECK (char_length(conteudo) <= 20000),
  citacoes jsonb NOT NULL DEFAULT '[]'::jsonb,
  criado_em timestamptz NOT NULL DEFAULT now(),
  criado_por uuid REFERENCES auth.users(id) ON DELETE SET NULL
);

CREATE INDEX IF NOT EXISTS ia_documental_mensagens_sessao_idx
  ON public.ia_documental_mensagens (sessao_id, criado_em);

ALTER TABLE public.ia_documental_configuracoes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.ia_documental_fontes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.ia_documental_sessoes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.ia_documental_mensagens ENABLE ROW LEVEL SECURITY;

CREATE POLICY ia_documental_configuracoes_admin_all ON public.ia_documental_configuracoes
  FOR ALL USING (public.is_tenant_admin(tenant_id))
  WITH CHECK (public.is_tenant_admin(tenant_id));

CREATE POLICY ia_documental_fontes_admin_all ON public.ia_documental_fontes
  FOR ALL USING (public.is_tenant_admin(tenant_id))
  WITH CHECK (public.is_tenant_admin(tenant_id));

CREATE POLICY ia_documental_sessoes_admin_all ON public.ia_documental_sessoes
  FOR ALL USING (public.is_tenant_admin(tenant_id))
  WITH CHECK (public.is_tenant_admin(tenant_id));

CREATE POLICY ia_documental_mensagens_admin_all ON public.ia_documental_mensagens
  FOR ALL USING (public.is_tenant_admin(tenant_id))
  WITH CHECK (public.is_tenant_admin(tenant_id));

COMMENT ON TABLE public.ia_documental_configuracoes IS
  'Instruções e guardrails configuráveis do assistente documental; não guarda segredos de fornecedor de IA.';
COMMENT ON TABLE public.ia_documental_fontes IS
  'Fontes legais e internas configuradas pela administração para consulta e citação do assistente documental.';
COMMENT ON TABLE public.ia_documental_sessoes IS
  'Sessões de elaboração documental assistida, sujeitas a aprovação humana antes de exportação.';
COMMENT ON TABLE public.ia_documental_mensagens IS
  'Histórico auditável da conversa de cada sessão documental assistida.';
