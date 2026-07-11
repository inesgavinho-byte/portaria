-- 0021_inquilino_regulamento.sql
-- Role 'inquilino' e armazenamento do regulamento (texto integral + PDF).

alter type public.user_role add value if not exists 'inquilino';

alter table public.tenant_perfil
  add column if not exists regulamento_texto text,
  add column if not exists regulamento_pdf_path text;

comment on column public.tenant_perfil.regulamento_texto is
  'Texto integral do regulamento (extraído do PDF), para a página /regulamento.';
comment on column public.tenant_perfil.regulamento_pdf_path is
  'Caminho do PDF original do regulamento no bucket documentos, para download.';
