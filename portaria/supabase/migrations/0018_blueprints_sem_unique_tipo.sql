-- 0018_blueprints_sem_unique_tipo.sql
-- Com o editor nativo, os Blueprints deixam de ser 3 modelos fixos: o
-- admin pode criar quantos quiser, incluindo vários do mesmo tipo
-- (ex.: várias circulares). A restrição unique(tenant_id, tipo) deixa
-- de fazer sentido. A sementeira dos modelos base passa a correr apenas
-- quando o condomínio ainda não tem nenhum blueprint.

alter table public.blueprints
  drop constraint if exists blueprints_tenant_id_tipo_key;
