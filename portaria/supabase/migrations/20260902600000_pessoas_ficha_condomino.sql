-- =====================================================================
-- Migration: 20260902600000_pessoas_ficha_condomino.sql
-- Fase 1 do redesign do módulo Pessoas e Frações — a ficha do condómino.
--
-- =====================================================================
-- O QUE MUDA E PORQUÊ
-- =====================================================================
-- Até aqui o condómino não existia como entidade: nome, e-mail e telefone
-- do proprietário (e o nome do inquilino) viviam desnormalizados em cada
-- fração (0008_fracoes). Um proprietário com duas frações ficava partido
-- em dois registos soltos e não havia nenhuma vista agregada do condómino
-- (dívida, recibos, comunicações, ocorrências).
--
-- Este fix introduz:
--
--   pessoas         — o condómino enquanto contacto, único por tenant +
--                     nome normalizado (trim + minúsculas);
--   fracao_pessoas  — a relação pessoa ↔ fração com papel (proprietario /
--                     inquilino / representante) e datas de vigência
--                     (desde / ate) — a associação de um proprietário que
--                     vende não é apagada, é fechada.
--
-- O backfill povoa as duas tabelas a partir dos campos desnormalizados das
-- fracoes, que CONTINUAM a existir nesta fase como fallback (as páginas
-- existentes — comunicações, dossiê da fração — ainda os leem). A UI nova
-- (/condominos) lê de pessoas/fracao_pessoas; a sincronização na escrita
-- de frações (src/lib/actions/pessoas.ts) mantém os dois lados coerentes.
--
-- Privacidade: igual a fracoes (0008) — ADMIN-ONLY. Guarda contactos
-- pessoais que não devem ser navegáveis pelos condóminos com login.
--
-- Idempotente: índices com IF NOT EXISTS, inserts com ON CONFLICT DO
-- NOTHING/UPDATE, políticas largadas pelo nome antes de criadas.
-- =====================================================================

-- --------------------------------------------------------------------
-- 1. TABELAS
-- --------------------------------------------------------------------

create table if not exists public.pessoas (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references public.tenants(id) on delete cascade,
  nome text not null,
  email text,
  telefone text,
  notas text,
  criado_em timestamptz default now() not null,
  atualizado_em timestamptz default now() not null,

  -- Nome normalizado (trim + minúsculas) é a chave de dedupe: o mesmo
  -- condómino referido como "Maria Silva" e "maria silva" é uma pessoa só.
  constraint pessoas_nome_valido check (btrim(nome) <> '')
);

create unique index if not exists pessoas_tenant_nome_idx
  on public.pessoas (tenant_id, lower(btrim(nome)));

create table if not exists public.fracao_pessoas (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references public.tenants(id) on delete cascade,
  fracao_id uuid not null references public.fracoes(id) on delete cascade,
  pessoa_id uuid not null references public.pessoas(id) on delete cascade,
  papel text not null check (papel in ('proprietario', 'inquilino', 'representante')),
  desde date,
  ate date,
  criado_em timestamptz default now() not null,
  atualizado_em timestamptz default now() not null,

  -- Um papel só pode estar vigente uma vez por pessoa e fração; o histórico
  -- de papéis anteriores fecha-se com ate, não se apaga.
  unique (fracao_id, pessoa_id, papel)
);

create index if not exists fracao_pessoas_pessoa_idx
  on public.fracao_pessoas (pessoa_id);
create index if not exists fracao_pessoas_fracao_idx
  on public.fracao_pessoas (fracao_id, papel);

-- --------------------------------------------------------------------
-- 2. BACKFILL a partir dos campos desnormalizados das frações
-- --------------------------------------------------------------------
-- Proprietários primeiro: têm prioridade porque trazem e-mail e telefone.
-- min() é determinístico; se duas variantes do mesmo nome trouxerem
-- contactos diferentes, o ON CONFLICT do segundo grupo preenche os que
-- faltam sem esmagar o que já lá está.

insert into public.pessoas (tenant_id, nome, email, telefone)
select f.tenant_id,
       btrim(f.proprietario_nome),
       min(f.proprietario_email),
       min(f.proprietario_telefone)
from public.fracoes f
where f.proprietario_nome is not null and btrim(f.proprietario_nome) <> ''
group by f.tenant_id, btrim(f.proprietario_nome), lower(btrim(f.proprietario_nome))
on conflict (tenant_id, lower(btrim(nome))) do update
  set email = coalesce(public.pessoas.email, excluded.email),
      telefone = coalesce(public.pessoas.telefone, excluded.telefone),
      atualizado_em = now();

insert into public.pessoas (tenant_id, nome)
select f.tenant_id, btrim(f.inquilino_nome)
from public.fracoes f
where f.inquilino_nome is not null and btrim(f.inquilino_nome) <> ''
group by f.tenant_id, btrim(f.inquilino_nome), lower(btrim(f.inquilino_nome))
on conflict (tenant_id, lower(btrim(nome))) do nothing;

insert into public.fracao_pessoas (tenant_id, fracao_id, pessoa_id, papel)
select f.tenant_id, f.id, p.id, 'proprietario'
from public.fracoes f
join public.pessoas p
  on p.tenant_id = f.tenant_id
 and lower(p.nome) = lower(btrim(f.proprietario_nome))
where f.proprietario_nome is not null and btrim(f.proprietario_nome) <> ''
on conflict do nothing;

insert into public.fracao_pessoas (tenant_id, fracao_id, pessoa_id, papel)
select f.tenant_id, f.id, p.id, 'inquilino'
from public.fracoes f
join public.pessoas p
  on p.tenant_id = f.tenant_id
 and lower(p.nome) = lower(btrim(f.inquilino_nome))
where f.inquilino_nome is not null and btrim(f.inquilino_nome) <> ''
on conflict do nothing;

-- --------------------------------------------------------------------
-- 3. RLS — admin-only, padrão de 0008_fracoes
-- --------------------------------------------------------------------

alter table public.pessoas enable row level security;
drop policy if exists "admins manage pessoas" on public.pessoas;
create policy "admins manage pessoas"
  on public.pessoas for all
  to authenticated
  using (public.is_tenant_admin(tenant_id))
  with check (public.is_tenant_admin(tenant_id));

alter table public.fracao_pessoas enable row level security;
drop policy if exists "admins manage fracao_pessoas" on public.fracao_pessoas;
create policy "admins manage fracao_pessoas"
  on public.fracao_pessoas for all
  to authenticated
  using (public.is_tenant_admin(tenant_id))
  with check (public.is_tenant_admin(tenant_id));

-- Escritores: a UI escreve com o utilizador autenticado (requireAdmin na
-- aplicação); a RLS acima é o segundo cadeado. anon: nada.
revoke all on public.pessoas, public.fracao_pessoas from anon;
grant select, insert, update, delete
  on public.pessoas, public.fracao_pessoas to authenticated;

-- --------------------------------------------------------------------
-- 4. Documentação
-- --------------------------------------------------------------------

comment on table public.pessoas is
  'Condóminos (pessoas) do condomínio. Admin-only. O nome normalizado é '
  || 'único por tenant; a ligação às frações vive em fracao_pessoas.';
comment on table public.fracao_pessoas is
  'Relação pessoa ↔ fração com papel (proprietario/inquilino/representante) '
  || 'e vigência (desde/ate). Papéis terminados fecham-se com ate, nunca se apagam.';
