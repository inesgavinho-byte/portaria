-- =====================================================================
-- Migration: 20260902310000_a1_buscar_chunks_restaurar_c2_s6.sql
-- A-1 (alto, segurança) — restaurar os filtros C2 e S6 perdidos em
-- `buscar_chunks` e `estado_conhecimento`.
--
-- =====================================================================
-- A REGRESSÃO
-- =====================================================================
-- `0028_hardening_multitenant.sql` introduziu nestas duas RPCs de RAG
-- (ambas `SECURITY DEFINER`, logo imunes ao RLS de
-- `conhecimento_embeddings`) três salvaguardas:
--
--   • S3  — membership de auth.uid() em p_tenant_id;
--   • C2  — chunks de ocorrências resolvidas só para admins do tenant
--           (descrições de queixas de vizinhos não são coisa que um
--           condómino deva poder pesquisar semânticamente);
--   • S6  — inquilino só pesquisa regulamento/legislação, em linha com
--           a leitura directa da tabela.
--
-- `20260826030000_p0_security_hardening_views_rpc.sql` (bloco 4) reescreveu
-- as duas funções para lhes acrescentar grants mínimos e a assinatura com
-- `extensions.vector` sem dimensão fixa, mas partiu do corpo de 0023 e não
-- do de 0028: manteve o S3 e PERDEU o C2 e o S6. Resultado medido na cadeia
-- reconstruída (0001 → 20260902090000): qualquer membro volta a obter por
-- RPC conteúdo de ocorrências resolvidas — o teste C2 pré-existente
-- (tests/security/rls-p0.test.ts) falha contra esta cadeia.
--
-- =====================================================================
-- A CORREÇÃO
-- =====================================================================
-- Restaurar os filtros C2/S6 de 0028 MANTENDO o que 20260826030000 tinha de
-- bom e não deve ser perdido:
--   • assinatura `(uuid, extensions.vector, integer, double precision)`
--     (sem dimensão fixa no tipo, como está em produção);
--   • `set search_path = public, extensions` em buscar_chunks;
--   • grants mínimos (revoke a public/anon, grant a authenticated).
--
-- As políticas de leitura directa da tabela ("members read embeddings",
-- 0028) já aplicam C2/S6 e não são tocadas — esta migração alinha apenas o
-- caminho RPC, que corre como definer e ignora o RLS.
--
-- Idempotente: `create or replace function` + revokes/grants repetíveis.
-- =====================================================================

create or replace function public.buscar_chunks(
  p_tenant_id uuid,
  p_embedding extensions.vector,
  p_limite integer default 5,
  p_threshold double precision default 0.7
)
returns table (
  id uuid,
  origem text,
  origem_id text,
  conteudo text,
  metadata jsonb,
  similarity double precision
)
language sql
stable
security definer
set search_path = public, extensions
as $$
  select
    e.id,
    e.origem,
    e.origem_id,
    e.conteudo,
    e.metadata,
    1 - (e.embedding <=> p_embedding) as similarity
  from public.conhecimento_embeddings e
  where e.tenant_id = p_tenant_id
    and e.embedding is not null
    and 1 - (e.embedding <=> p_embedding) > p_threshold
    -- S3: o chamador tem de ser membro do tenant pedido (20260826030000)
    and exists (
      select 1 from public.user_tenants ut
      where ut.user_id = auth.uid()
        and ut.tenant_id = p_tenant_id
    )
    -- C2: chunks de ocorrências resolvidas só para admins (restaurado de 0028)
    and (
      e.origem <> 'ocorrencia_resolvida'
      or public.is_tenant_admin(p_tenant_id)
    )
    -- S6: inquilino só pesquisa regulamento/legislação (restaurado de 0028)
    and (
      public.user_tem_papel(p_tenant_id, array['admin','comissao','condomino']::public.user_role[])
      or e.origem in ('regulamento', 'legislacao')
    )
  order by e.embedding <=> p_embedding
  limit p_limite;
$$;

create or replace function public.estado_conhecimento(p_tenant_id uuid)
returns table (origem text, count bigint)
language sql
stable
security definer
set search_path = public, extensions
as $$
  select e.origem, count(*)::bigint
  from public.conhecimento_embeddings e
  where e.tenant_id = p_tenant_id
    -- S3: membership obrigatório (20260826030000)
    and exists (
      select 1 from public.user_tenants ut
      where ut.user_id = auth.uid()
        and ut.tenant_id = p_tenant_id
    )
    -- C2/S6: só conta o que o chamador poderia efectivamente ler
    -- (restaurado de 0028 — a contagem por origem não deve revelar a um
    -- condómino/inquilino a existência de conteúdo que não pode ler)
    and (
      e.origem <> 'ocorrencia_resolvida'
      or public.is_tenant_admin(p_tenant_id)
    )
    and (
      public.user_tem_papel(p_tenant_id, array['admin','comissao','condomino']::public.user_role[])
      or e.origem in ('regulamento', 'legislacao')
    )
  group by e.origem;
$$;

-- Grants mínimos — reafirma o estado de 20260826030000 (bloco 4). O
-- `create or replace` preserva ACLs, mas fixá-los aqui torna a migração
-- autónoma face a reescritas futuras.
revoke execute on function public.buscar_chunks(uuid, extensions.vector, integer, double precision) from public, anon;
grant execute on function public.buscar_chunks(uuid, extensions.vector, integer, double precision) to authenticated;

revoke execute on function public.estado_conhecimento(uuid) from public, anon;
grant execute on function public.estado_conhecimento(uuid) to authenticated;
