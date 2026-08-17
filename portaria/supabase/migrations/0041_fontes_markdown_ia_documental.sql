-- 0041_fontes_markdown_ia_documental.sql
-- Fontes Markdown e pesquisa lexical local para reduzir o contexto enviado ao modelo.

ALTER TABLE public.ia_documental_fontes
  ADD COLUMN IF NOT EXISTS conteudo_markdown text,
  ADD COLUMN IF NOT EXISTS checksum text,
  ADD COLUMN IF NOT EXISTS tamanho_bytes integer;

CREATE TABLE IF NOT EXISTS public.ia_documental_fonte_blocos (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  fonte_id uuid NOT NULL REFERENCES public.ia_documental_fontes(id) ON DELETE CASCADE,
  ordem integer NOT NULL CHECK (ordem >= 0),
  conteudo text NOT NULL CHECK (char_length(conteudo) BETWEEN 1 AND 2500),
  busca tsvector GENERATED ALWAYS AS (to_tsvector('portuguese', conteudo)) STORED,
  criado_em timestamptz NOT NULL DEFAULT now(),
  UNIQUE (fonte_id, ordem)
);

CREATE INDEX IF NOT EXISTS ia_documental_fonte_blocos_busca_idx
  ON public.ia_documental_fonte_blocos USING gin (busca);
CREATE INDEX IF NOT EXISTS ia_documental_fonte_blocos_tenant_fonte_idx
  ON public.ia_documental_fonte_blocos (tenant_id, fonte_id, ordem);

ALTER TABLE public.ia_documental_fonte_blocos ENABLE ROW LEVEL SECURITY;
CREATE POLICY ia_documental_fonte_blocos_admin_all ON public.ia_documental_fonte_blocos
  FOR ALL USING (public.is_tenant_admin(tenant_id))
  WITH CHECK (public.is_tenant_admin(tenant_id));

COMMENT ON TABLE public.ia_documental_fonte_blocos IS
  'Blocos de fontes Markdown pesquisados localmente para enviar à IA apenas excertos relevantes, sem embeddings nem contexto integral.';
