-- =============================================================================
-- 20260905120000: Recibo automático — pagamento confirmado → PDF → email
--
-- * recibos.pdf_path: path do PDF no bucket privado "documentos"
--   ({tenant_id}/recibos/{recibo_id}/recibo-{numero}.pdf). Null = ainda sem
--   PDF gerado. (pdf_url mantém-se intocado — nunca foi preenchido.)
-- * configuracao_financeira.recibo_auto_email: quando true (default), um
--   pagamento confirmado emite recibo, gera o PDF e envia-o por email com
--   link de download assinado (7 dias).
--
-- Sem novas policies: as colunas herdam o RLS existente de recibos
-- (admins) e configuracao_financeira (admin write, condómino read).
-- =============================================================================

alter table public.recibos
  add column if not exists pdf_path text;

comment on column public.recibos.pdf_path is
  'Path do PDF do recibo no bucket "documentos". Null = PDF ainda nao gerado.';

alter table public.configuracao_financeira
  add column if not exists recibo_auto_email boolean not null default true;

comment on column public.configuracao_financeira.recibo_auto_email is
  'Emissao e envio automaticos de recibo (PDF por email) quando um pagamento e confirmado.';
