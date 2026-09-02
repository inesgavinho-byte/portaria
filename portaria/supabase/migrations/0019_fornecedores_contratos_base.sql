-- =====================================================================
-- Migration: 0019_fornecedores_contratos_base.sql
--
-- PORQUE EXISTE: `fornecedores` e `contratos` foram criadas directamente
-- em produção e nunca entraram no histórico versionado (a lacuna G-1
-- documentada em tests/security/README.md e a D3 da auditoria beta:
-- «migrações aplicadas à mão»). A reconstrução limpa da cadeia — o que o
-- CI faz em cada PR — falhava em 0020_mural_condominio, a primeira
-- migração que toca em `fornecedores`.
--
-- SEGURANÇA DA APLICAÇÃO: todo o DDL é idempotente e condicional
-- (create table if not exists, constraints criadas só se não existirem).
-- Em produção, onde as tabelas já existem, esta migração NÃO muda nada:
-- não cria nem altera políticas RLS, não concede nem revoga privilégios,
-- não toca em dados. A postura de RLS destas tabelas em produção é
-- anterior e permanece exactamente como está.
--
-- NOTA TÉCNICA: as constraints são criadas por nome em blocos DO que
-- apanham duplicate_object (42710) — o Postgres reporta "constraint
-- already exists" como duplicate_object, não como duplicate_table. As FK
-- NÃO são inline no create table: uma FK inline de coluna gera
-- automaticamente o nome <tabela>_<coluna>_fkey, que colidiria com a
-- constraint explícita de nome igual.
--
-- O schema é o mínimo que a cadeia de migrações posterior pressupõe
-- (0020 adiciona contacto_emergencia; 20260824* acrescentam colunas;
-- ia_documental_fontes referencia (tenant_id, id) de fornecedores).
-- =====================================================================

-- --------------------------------------------------------------------
-- Fornecedores
-- --------------------------------------------------------------------
create table if not exists public.fornecedores (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null,
  nome text not null,
  criado_em timestamptz not null default now()
);

-- A chave composta (tenant_id, id) é referenciada por chaves estrangeiras
-- de outras tabelas (ex.: ia_documental_fontes.fornecedor_id).
do $$ begin
  alter table public.fornecedores
    add constraint fornecedores_tenant_id_id_key unique (tenant_id, id);
exception when duplicate_object then null; end $$;

do $$ begin
  alter table public.fornecedores
    add constraint fornecedores_tenant_id_fkey
    foreign key (tenant_id) references public.tenants (id) on delete cascade;
exception when duplicate_object then null; end $$;

-- --------------------------------------------------------------------
-- Contratos
-- --------------------------------------------------------------------
create table if not exists public.contratos (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null,
  fornecedor_id uuid not null,
  referencia text,
  criado_em timestamptz not null default now()
);

do $$ begin
  alter table public.contratos
    add constraint contratos_fornecedor_id_fkey
    foreign key (fornecedor_id) references public.fornecedores (id)
    on delete cascade;
exception when duplicate_object then null; end $$;

do $$ begin
  alter table public.contratos
    add constraint contratos_tenant_id_fkey
    foreign key (tenant_id) references public.tenants (id) on delete cascade;
exception when duplicate_object then null; end $$;

-- --------------------------------------------------------------------
-- Postura de privilégios padrão do Supabase
--
-- Em produção, as tabelas criadas no SQL Editor herdam os ALTER DEFAULT
-- PRIVILEGES da instância: ALL a anon, authenticated e service_role. A
-- fronteira real é o RLS (doutrina do repositório), não os grants. O init
-- local do CLI não instala esses defaults, pelo que uma reconstrução limpa
-- ficava com os grants mínimos do Postgres e a aplicação sem acesso.
-- Aqui repõe-se a postura de produção: grants totais nas tabelas já
-- criadas (0001–0018) e defaults para as seguintes. As migrações de menor
-- privilégio posteriores (0028, 0029, 20260826020000, 2026090231–33) voltam
-- a restringir o que decidiram restringir, e correm DEPOIS deste bloco.
-- --------------------------------------------------------------------
grant all on all tables in schema public to anon, authenticated, service_role;

-- Substitui INCONDICIONALMENTE os default privileges de tabelas: o init
-- local do CLI cria um default restritivo (Dxt) que deixaria todas as
-- tabelas criadas entre aqui e o fim da cadeia sem SELECT/INSERT/UPDATE
-- para os papéis de aplicação, divergindo de produção. A migração
-- 20260826030000 volta a apertar estes defaults no fim da cadeia — é aí
-- que nasce a política «tabelas novas fechadas», e não aqui.
alter default privileges for role postgres in schema public
  grant all on tables to anon, authenticated, service_role;
