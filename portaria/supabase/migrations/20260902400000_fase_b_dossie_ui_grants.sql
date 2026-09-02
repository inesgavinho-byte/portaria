-- Fase B do goal-portaria-1.0: registar o processo pela interface.
--
-- =====================================================================
-- O QUE MUDA E PORQUÊ
-- =====================================================================
-- Até aqui, acontecimentos de memória e posições de imputação só podiam ser
-- criados por migração, pelo `service_role`. A Fase B existe para acabar com
-- isso: a administradora passa a registar acontecimentos, posições e
-- imputações pela UI, com o utilizador autenticado a escrever directamente.
--
-- Os grants actuais (auditar antes de abrir, metodologia de 20260826020000):
--
--   contrato_memoria_eventos          SELECT (20260902330000, A-5)
--   imputacoes_posicoes               SELECT (20260826020000)
--   imputacoes_posicoes_evidencias    SELECT (20260826020000)
--
-- Escritores novos, todos com requireAdmin() na aplicação e gated pela RLS
-- `is_tenant_admin` (a política FOR ALL de 20260823175458 sobre
-- `contrato_memoria_eventos` já cobre INSERT/UPDATE; falta o grant):
--
--   src/lib/actions/dossier-eventos.ts       INSERT + UPDATE em
--                                            contrato_memoria_eventos
--   src/lib/actions/dossier-imputacoes.ts    INSERT + UPDATE em
--                                            imputacoes_posicoes;
--                                            INSERT em
--                                            imputacoes_posicoes_evidencias
--
-- Operações concedidas a `authenticated`: exactamente as da lista, nada mais.
-- `imputacoes_posicoes_evidencias` fica sem UPDATE nem DELETE: uma citação
-- anexada a uma posição não se edita por engano — a correcção da posição é
-- de estado (retirada/superada), e mantém o histórico. DELETE não é
-- concedido porque a UI de posições não remove evidências.
--
-- `anon`: nada. `service_role`: inalterado. RLS: activa, com políticas
-- explícitas por operação, `TO authenticated`, `is_tenant_admin` no USING e
-- no WITH CHECK.
--
-- Idempotente: revokes/grants fixam o estado final; políticas largadas pelo
-- nome antes de criadas.
-- =====================================================================

-- --------------------------------------------------------------------
-- 1. GRANTS
-- --------------------------------------------------------------------

-- Acontecimentos: a UI cria e corrige (B2/B4 do goal).
revoke all on table public.contrato_memoria_eventos from anon;
grant insert, update on table public.contrato_memoria_eventos to authenticated;

-- Posições: a UI registra e muda o estado (sustentada/aceite/retirada/
-- superada), mantendo o histórico — nunca apaga.
revoke all on table public.imputacoes_posicoes from anon;
grant insert, update on table public.imputacoes_posicoes to authenticated;

-- Evidências das posições: só anexar.
revoke all on table public.imputacoes_posicoes_evidencias from anon;
grant insert on table public.imputacoes_posicoes_evidencias to authenticated;

-- --------------------------------------------------------------------
-- 2. RLS — continua activa
-- --------------------------------------------------------------------

alter table public.contrato_memoria_eventos enable row level security;
alter table public.imputacoes_posicoes enable row level security;
alter table public.imputacoes_posicoes_evidencias enable row level security;

-- --------------------------------------------------------------------
-- 3. POLÍTICAS
-- --------------------------------------------------------------------
-- `contrato_memoria_eventos` já tem a política FOR ALL
-- ("admins manage contrato memoria eventos", 20260823175458) com USING e
-- WITH CHECK `is_tenant_admin` — nada a criar aqui.

-- Posições: INSERT e UPDATE explícitos, ao lado do SELECT existente.

drop policy if exists "tenant admins insert imputacoes posicoes"
  on public.imputacoes_posicoes;
create policy "tenant admins insert imputacoes posicoes"
  on public.imputacoes_posicoes
  for insert
  to authenticated
  with check (public.is_tenant_admin(tenant_id));

drop policy if exists "tenant admins update imputacoes posicoes"
  on public.imputacoes_posicoes;
create policy "tenant admins update imputacoes posicoes"
  on public.imputacoes_posicoes
  for update
  to authenticated
  using (public.is_tenant_admin(tenant_id))
  with check (public.is_tenant_admin(tenant_id));

-- Evidências das posições: só anexar.

drop policy if exists "tenant admins insert imputacoes posicoes evidencias"
  on public.imputacoes_posicoes_evidencias;
create policy "tenant admins insert imputacoes posicoes evidencias"
  on public.imputacoes_posicoes_evidencias
  for insert
  to authenticated
  with check (public.is_tenant_admin(tenant_id));
