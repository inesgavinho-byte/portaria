-- 0022_indices_performance.sql
-- Índices afinados às queries quentes das páginas principais.
--
-- Auditoria (pg_indexes) — já existiam e cobrem exatamente a query, NÃO
-- foram duplicados:
--   fracoes    → fracoes_tenant_idx (tenant_id, codigo)
--   contratos  → contratos_tenant_idx (tenant_id, data_fim)
--   ocorrencias→ (tenant_id, estado, criado_em) e (criado_por, criado_em)
--
-- Acrescentam-se abaixo apenas índices que casam melhor com a query do
-- que os existentes (parciais / ordem correta). Nota: com o volume atual
-- os ganhos são marginais — o gargalo é a latência de rede (ver
-- diagnóstico), não o plano de execução.

-- Avisos: a lista e o Mural filtram sempre ativo = true e ordenam por
-- publicado_em desc. Índice parcial que casa exatamente com a query.
create index if not exists avisos_tenant_ativos_idx
  on public.avisos (tenant_id, publicado_em desc)
  where ativo;

-- Documentos: a lista sem filtro de categoria ordena por ano/upload_em;
-- o índice existente lidera por categoria e não serve essa ordenação.
create index if not exists documentos_tenant_ano_idx
  on public.documentos (tenant_id, ano desc, upload_em desc);

-- Convites pendentes (contagem no Centro de Trabalho): aceite_em is null
-- + expira_em no futuro.
create index if not exists convites_pendentes_expira_idx
  on public.convites (tenant_id, expira_em)
  where aceite_em is null;
