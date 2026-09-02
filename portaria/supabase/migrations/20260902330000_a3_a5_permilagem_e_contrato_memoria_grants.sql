-- =====================================================================
-- Migration: 20260902330000_a3_a5_permilagem_e_contrato_memoria_grants.sql
-- A-3 (baixo) e A-5 (info) — menor privilégio em duas superfícies RPC/tabela
-- apontadas pela matriz de testes de segurança (tests/security/README.md).
--
-- =====================================================================
-- BLOCO 1 — A-3: total_permilagem_tenant (S2/S3, padrão 0028)
-- =====================================================================
-- O achado A-3 descrevia a função como sem validação de membership. A
-- inspecção à cadeia reconstruída (0001 → 20260902090000) mostra que o corpo
-- de `0028_hardening_multitenant.sql` (bloco 2.1) — que valida membership de
-- auth.uid() em p_tenant_id e devolve 0 a não-membros — está efectivamente
-- em vigor, tal como os grants mínimos do bloco 2.4 de 0028. A suite nunca
-- mediu o valor devolvido (só o tipo), pelo que o achado não distinguiu
-- "0 a não-membros" de "fuga agregada".
--
-- Esta migração reafirma esse estado em vez de o inventar: fixa o corpo
-- validado e os grants mínimos numa migração própria para que uma reescrita
-- futura (o mecanismo exacto da regressão A-1, em que 20260826030000 partiu
-- do corpo de 0023 e perdeu filtros de 0028) não volte a perdê-los sem que
-- a cadeia o registe.
--
-- Uso em src/: nenhuma chamada a `total_permilagem_tenant` (confirmado por
-- grep) — a assinatura mantém-se na mesma, por precaução.
--
-- Idempotente: `create or replace` + revoke/grant repetíveis.
-- =====================================================================

create or replace function public.total_permilagem_tenant(p_tenant_id uuid)
returns integer
language sql
stable
security definer
set search_path = public
as $$
  select coalesce(sum(f.permilagem), 0)::integer
  from public.fracoes f
  where f.tenant_id = p_tenant_id
    -- S2/S3: só devolve o agregado a quem é membro do tenant pedido;
    -- não-membros recebem 0, sem revelar existência de dados.
    and exists (
      select 1 from public.user_tenants ut
      where ut.user_id = auth.uid()
        and ut.tenant_id = p_tenant_id
    );
$$;

revoke execute on function public.total_permilagem_tenant(uuid) from public, anon;
grant execute on function public.total_permilagem_tenant(uuid) to authenticated;

-- =====================================================================
-- BLOCO 2 — A-5: contrato_memoria_eventos / contrato_memoria_evidencias
-- =====================================================================
-- Estas tabelas (20260823175458) ficaram com os grants por omissão do
-- Supabase: `anon` e `authenticated` com SELECT/INSERT/UPDATE/DELETE/
-- TRUNCATE/REFERENCES/TRIGGER — medido no stack local reconstruído a
-- partir do CLI (estado de produção não verificado, mas a postura por
-- omissão é a mesma documentada e corrigida para `imputacoes_posicoes*`
-- em 20260826020000). A RLS (`is_tenant_admin`, TO authenticated) devolve
-- 0 linhas a `anon`, pelo que nunca houve exposição — o que faltava era a
-- segunda camada, pelo mesmo motivo que lá: se uma migração futura deixasse
-- cair a RLS por acidente, os grants sozinhos abririam a porta.
--
-- Segue-se o padrão de 20260826020000 com a mesma metodologia — auditar o
-- uso real antes de decidir o que `authenticated` mantém:
--
--   contrato_memoria_eventos     a aplicação só faz SELECT
--     (src/app/(app)/fornecedores/[id]/page.tsx e /relatorio/page.tsx,
--      src/app/(app)/contratos/[id]/page.tsx,
--      src/lib/actions/dossier-evidencias.ts — leituras);
--   contrato_memoria_evidencias  SELECT + INSERT + DELETE
--     (dossier-evidencias.ts: juntarEvidencia insere e removerEvidencia
--      apaga, ambos com requireAdmin() pelo cliente do utilizador — as
--      escritas passam pelo grant `authenticated` e ficam gated pela
--      política `admins manage`, pelo que INSERT/DELETE têm de se manter).
--
-- `service_role` (caminho servidor/migrações) não é tocado. RLS fica como
-- está — activa, com políticas `TO authenticated`.
--
-- Idempotente: revokes/grants fixam o estado final.
-- =====================================================================

-- contrato_memoria_eventos — só leitura para authenticated, nada para anon
revoke all on table public.contrato_memoria_eventos from anon;
revoke all on table public.contrato_memoria_eventos from authenticated;
grant select on table public.contrato_memoria_eventos to authenticated;

-- contrato_memoria_evidencias — leitura e escrita do dossiê para
-- authenticated (RLS limita a admins); nada para anon
revoke all on table public.contrato_memoria_evidencias from anon;
revoke all on table public.contrato_memoria_evidencias from authenticated;
grant select, insert, delete on table public.contrato_memoria_evidencias to authenticated;
