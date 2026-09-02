-- =====================================================================
-- Migration: 20260902510000_embeddings_bge_m3.sql
-- L-44 (Opção D — processamento local): os embeddings da plataforma
-- passam de OpenAI text-embedding-3-small (vector(1536)) para o modelo
-- LOCAL bge-m3 (mlx-community/bge-m3-mlx-8bit, 1024 dimensões), servido
-- pela infraestrutura própria da GAVINHO (porta 8099, padrão DECIMA).
-- Decisão registada em docs/legal/decisao-ia-l44.md (2026-09-02).
-- =====================================================================
-- PORQUÊ
-- =====================================================================
-- Todos os vetores existentes foram gerados pela OpenAI (espaço vetorial
-- de outro modelo). Comparar vetores de modelos diferentes com distância
-- coseno não tem significado semântico: os 1536 dims têm de desaparecer.
-- NÃO há conversão nem re-projeção possível — é reindexação total.
--
-- CONSEQUÊNCIA OPERACIONAL (obrigatória, pós-migração): por condomínio,
-- correr a reindexação (reindexarTenant em /ia/configuracao: regulamento,
-- documentos e ocorrências resolvidas) e, na Conselheira, recarregar a
-- legislação canónica (semearLegislacao) e o regulamento
-- (carregarRegulamento). Até lá, a pesquisa semântica devolve resultados
-- vazios/indisponibilidade — degradação graciosa, sem erro.
--
-- NOTA: conhecimento_base (legislação/regulamento da Conselheira) tem a
-- sua própria coluna embedding e NÃO consta da cadeia de migrações do
-- repositório (só existe em produção, criado fora da cadeia) — se em
-- produção a coluna for vector(1536), aplica-se aí a mesma nulificação e
-- alteração de tipo, fora desta migração.
-- =====================================================================
-- O QUE FAZ
-- =====================================================================
-- 1. Nulifica TODOS os vetores antigos (inválidos — outro modelo).
-- 2. Altera a coluna para extensions.vector(1024).
--    O índice HNSW (0024) é reconstruído automaticamente pelo ALTER TYPE.
-- 3. Reafirma buscar_chunks com a assinatura (uuid, extensions.vector,
--    integer, double precision) — dimensão implícita no tipo da coluna —
--    mantendo o corpo de 20260902310000 (S3 + C2 + S6, search_path e
--    grants), para a migração ser autónoma face a reescritas futuras.
-- 4. Reafirma os grants de estado_conhecimento (não tem parâmetro
--    vetorial; o corpo de 20260902310000 mantém-se).
--
-- Idempotente: re-corrida não altera nada (nulificação sem linhas,
-- ALTER TYPE para o mesmo tipo, create or replace, grants repetíveis).
-- =====================================================================

-- 1) Vetores antigos são inválidos (outro modelo/espaço) — nulificar antes
--    do ALTER TYPE (um vector(1536) não cabe em vector(1024)).
update public.conhecimento_embeddings
set embedding = null
where embedding is not null;

-- 2) Coluna passa a bge-m3 (1024 dims). USING explícito: o cast
--    vector → vector(1024) é por atribuição, não implícito.
alter table public.conhecimento_embeddings
  alter column embedding type extensions.vector(1024)
  using embedding::extensions.vector(1024);

comment on column public.conhecimento_embeddings.embedding is
  'Vetor de 1024 dimensões (bge-m3 MLX local — decisão L-44). Vetores de modelos diferentes não são comparáveis: mudar de modelo exige reindexação total.';

-- 3) buscar_chunks — reafirmada com o corpo de 20260902310000 (S3
--    membership, C2 ocorrências-só-admin, S6 inquilino-só-regulamento/
--    legislação). A assinatura não tipa a dimensão: quem garante os 1024
--    é o tipo da coluna (vector(1024)); um vetor de outra dimensão devolve
--    erro de operador <=>, nunca comparação sem sentido.
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

-- 4) Grants mínimos — o `create or replace` preserva ACLs, mas fixá-los
--    aqui torna a migração autónoma (padrão de 20260826030000/20260902310000),
--    para buscar_chunks e estado_conhecimento.
revoke execute on function public.buscar_chunks(uuid, extensions.vector, integer, double precision) from public, anon;
grant execute on function public.buscar_chunks(uuid, extensions.vector, integer, double precision) to authenticated;

revoke execute on function public.estado_conhecimento(uuid) from public, anon;
grant execute on function public.estado_conhecimento(uuid) to authenticated;
