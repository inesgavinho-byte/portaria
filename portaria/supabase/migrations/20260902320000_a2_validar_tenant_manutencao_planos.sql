-- =====================================================================
-- Migration: 20260902320000_a2_validar_tenant_manutencao_planos.sql
-- A-2 (alto, funcionalidade) — `validar_tenant_manutencao` rebentava com
-- todo o INSERT em `planos_manutencao`.
--
-- =====================================================================
-- A REGRESSÃO
-- =====================================================================
-- O trigger `validar_tenant_manutencao` (0038) é partilhado por duas
-- tabelas com colunas diferentes:
--
--   planos_manutencao  (tenant_id, ativo_id, fornecedor_id, contrato_id, …)
--   tarefas_manutencao (tenant_id, plano_id, ativo_id, fornecedor_id, …)
--
-- A condição da branch das tarefas referencia `NEW.plano_id`:
--
--   IF TG_TABLE_NAME = 'tarefas_manutencao' AND NOT EXISTS (
--     SELECT 1 FROM planos_manutencao p
--     WHERE p.id = NEW.plano_id AND p.tenant_id = NEW.tenant_id)
--
-- Num IF de plpgsql a expressão é preparada como um todo e a resolução do
-- campo `plano_id` no record NEW é feita contra o tuplo da linha corrente —
-- que, em `planos_manutencao`, não tem esse campo. Resultado medido na
-- cadeia reconstruída: todo o INSERT (e UPDATE) em `planos_manutencao`
-- falha com `42703 — record "new" has no field "plano_id"`. Sem plano não
-- há tarefas: o módulo de manutenção preventiva fica inutilizado.
--
-- O padrão correcto para um trigger partilhado é cada tabela só referenciar,
-- dentro da sua branch, colunas que efectivamente tem — sem depender da
-- avaliação short-circuit do AND, que não é garantida.
--
-- =====================================================================
-- A CORREÇÃO
-- =====================================================================
-- • Branch explícita por TG_TABLE_NAME; `NEW.plano_id` só é lido na branch
--   de `tarefas_manutencao`; `NEW.contrato_id` (inexistente em tarefas) só
--   na branch de `planos_manutencao`.
-- • As validações e as mensagens de excepção mantêm-se exactamente as de
--   0038 (ativo↔plano, plano↔tarefa, fornecedor↔tenant, contrato↔tenant).
-- • `validar_tenant_manutencao` não é exposta a clientes: 0039 já lhe
--   revogou EXECUTE (public/anon/authenticated); o `create or replace`
--   preserva as ACLs, e nada aqui as altera.
--
-- Nota de âmbito: o 4.º IF de 0038 valida `NEW.contrato_id` contra
-- `public.contratos`, tabela que existe em produção mas não é criada por
-- nenhuma migração do histórico (G-1 em tests/security/README.md). Esta
-- migração mantém a validação tal como está — só é exercida quando
-- contrato_id é não nulo — e não a elimina nem a enfraquece.
--
-- Idempotente: `create or replace function`.
-- =====================================================================

create or replace function public.validar_tenant_manutencao()
returns trigger
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_tenant_id     uuid;
  v_fornecedor_id uuid;
  v_contrato_id   uuid;
begin
  v_tenant_id := NEW.tenant_id;

  if TG_TABLE_NAME = 'planos_manutencao' then
    -- O ativo do plano tem de pertencer ao mesmo condomínio (0038)
    if not exists (
      select 1 from public.ativos_manutencao a
      where a.id = NEW.ativo_id
        and a.tenant_id = v_tenant_id
    ) then
      raise exception 'Ativo não pertence ao condomínio do plano';
    end if;

    v_fornecedor_id := NEW.fornecedor_id;
    v_contrato_id   := NEW.contrato_id;

  elsif TG_TABLE_NAME = 'tarefas_manutencao' then
    -- O plano da tarefa tem de pertencer ao mesmo condomínio (0038).
    -- NEW.plano_id só existe nesta tabela — lido apenas nesta branch.
    if not exists (
      select 1 from public.planos_manutencao p
      where p.id = NEW.plano_id
        and p.tenant_id = v_tenant_id
    ) then
      raise exception 'Plano não pertence ao condomínio da tarefa';
    end if;

    v_fornecedor_id := NEW.fornecedor_id;

  else
    -- Tabela não prevista: não inventa validação.
    return NEW;
  end if;

  -- Fornecedor, quando indicado, tem de pertencer ao condomínio (0038)
  if v_fornecedor_id is not null and not exists (
    select 1 from public.fornecedores f
    where f.id = v_fornecedor_id
      and f.tenant_id = v_tenant_id
  ) then
    raise exception 'Fornecedor não pertence ao condomínio';
  end if;

  -- Contrato, quando indicado, tem de pertencer ao condomínio (0038) —
  -- só aplicável a planos (tarefas não têm contrato_id)
  if v_contrato_id is not null and not exists (
    select 1 from public.contratos c
    where c.id = v_contrato_id
      and c.tenant_id = v_tenant_id
  ) then
    raise exception 'Contrato não pertence ao condomínio';
  end if;

  return NEW;
end;
$$;
