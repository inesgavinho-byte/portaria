-- =====================================================================
-- Migration: 0007_perfil_condominio.sql
-- Slice 01 — Perfil do Condomínio
--
-- IMPORTANTE: Executar no SQL Editor do Supabase depois da 0006.
--
-- Divide os dados do perfil por sensibilidade:
--   - tenants (leitura PÚBLICA): contactos gerais do condomínio, que a
--     página pública de contactos já mostra.
--   - tenant_perfil (nova, ADMIN-ONLY): seguradora e administrador
--     responsável — dados internos que NUNCA devem ser públicos.
--     (Cumpre a nota da 0003: colunas sensíveis não entram em tenants.)
-- =====================================================================

-- 1. Contactos gerais — públicos, na própria tabela tenants
alter table public.tenants add column if not exists email text;
alter table public.tenants add column if not exists telefone text;

comment on column public.tenants.email is 'Contacto de email público do condomínio';
comment on column public.tenants.telefone is 'Contacto telefónico público do condomínio';


-- 2. Perfil interno — seguradora e administrador (1:1 com tenant)
create table public.tenant_perfil (
  tenant_id uuid primary key references public.tenants(id) on delete cascade,
  seguradora_nome text,
  seguradora_apolice text,
  seguradora_contacto text,
  seguradora_validade date,
  administrador_nome text,
  administrador_empresa text,
  administrador_email text,
  administrador_telefone text,
  atualizado_em timestamptz default now() not null
);

comment on table public.tenant_perfil is
  'Dados internos do condomínio (seguradora, administrador). Admin-only — nunca público.';

alter table public.tenant_perfil enable row level security;

-- Só admins do tenant leem e gerem o seu perfil interno
create policy "admins read tenant_perfil"
  on public.tenant_perfil for select
  using (public.is_tenant_admin(tenant_id));

create policy "admins manage tenant_perfil"
  on public.tenant_perfil for all
  using (public.is_tenant_admin(tenant_id))
  with check (public.is_tenant_admin(tenant_id));
