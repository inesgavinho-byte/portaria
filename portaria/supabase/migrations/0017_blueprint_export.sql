-- 0017_blueprint_export.sql
-- Exportação de Blueprints para PDF, guardada na biblioteca de Documentos.
--
--   * Nova categoria de documento 'circular' — agrupa os PDFs gerados a
--     partir de Blueprints (circulares, convocatórias, atas).
--   * documentos.blueprint_id — liga o PDF gerado ao modelo de origem.

alter type public.documento_categoria add value if not exists 'circular';

alter table public.documentos
  add column if not exists blueprint_id uuid
    references public.blueprints(id) on delete set null;

comment on column public.documentos.blueprint_id is
  'Blueprint que gerou este documento (quando exportado para PDF).';
