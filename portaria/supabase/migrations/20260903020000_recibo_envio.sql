-- =====================================================================
-- Migration: 20260903020000_recibo_envio.sql
-- Fase 3 do redesign Pessoas e Frações — o recibo ganha ciclo de envio.
--
-- =====================================================================
-- O QUE MUDA E PORQUÊ
-- =====================================================================
-- Até aqui o recibo só sabia nascer (emitido) e morrer (anulado): não
-- existia registo de SE e COMO chegou ao condómino — a pergunta "a
-- administração enviou o recibo?" não tinha resposta no sistema.
--
--   recibos.enviado_em   — quando foi enviado (null = ainda por enviar);
--   recibos.canal_envio  — email, correio, entrega em mão, portal...
--                          (mesmos valores do canal das comunicações).
--
-- Sem migration de dados: recibos existentes ficam "por enviar" — marcar
-- o envio é acto humano (a admin confirma o que realmente aconteceu).
--
-- Idempotente: IF NOT EXISTS; check condicional por DO block.
-- Nota de ferramenta: sem concatenação de literais em COMMENT.
-- =====================================================================

alter table public.recibos
  add column if not exists enviado_em timestamptz;

alter table public.recibos
  add column if not exists canal_envio text;

do $$ begin
  alter table public.recibos
    add constraint recibos_canal_envio_valido
    check (canal_envio in (
      'email', 'correio_simples', 'correio_registado',
      'entrega_em_mao', 'portal', 'outro'
    ));
exception when duplicate_object then null; end $$;

create index if not exists recibos_por_enviar_idx
  on public.recibos (tenant_id, emitido_em desc)
  where estado = 'emitido' and enviado_em is null;

comment on column public.recibos.enviado_em is 'Quando o recibo chegou ao condómino. Null = ainda por enviar — marcar é acto da administração, nunca automático.';
comment on column public.recibos.canal_envio is 'Como o recibo foi enviado (mesmos valores do canal das comunicacoes).';
