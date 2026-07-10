-- 0015_notificacoes.sql
-- Preferência de notificações por email, por utilizador e por prédio.
--
-- Por defeito toda a gente recebe (default true) — o utilizador pode
-- desligar em Configuração › Notificações. O envio em si é feito pela
-- aplicação (ver src/lib/notificacoes.ts); aqui só guardamos a escolha.

alter table public.user_tenants
  add column if not exists notificacoes_email boolean not null default true;

comment on column public.user_tenants.notificacoes_email is
  'Se o utilizador recebe notificações por email deste prédio. Default: sim.';
