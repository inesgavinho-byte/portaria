-- =====================================================================
-- Migration: 0025_notificacoes.sql
-- Sistema de notificações em tempo real
-- =====================================================================

-- ----------------------------------------------------------------------
-- 1. TABELA NOTIFICACOES
-- ----------------------------------------------------------------------
create table public.notificacoes (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references public.tenants(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,

  -- O que aconteceu
  tipo text not null check (tipo in (
    'ocorrencia_criada',
    'ocorrencia_atualizada',
    'ocorrencia_resolvida',
    'aviso_publicado',
    'votacao_aberta',
    'votacao_encerrada',
    'assembleia_agendada',
    'documento_publicado',
    'convite_aceite',
    'sistema'
  )),

  -- Título e corpo da notificação (pré-formatados)
  titulo text not null,
  corpo text,

  -- Link para a entidade relacionada
  entidade_tipo text, -- 'ocorrencia', 'aviso', 'votacao', 'assembleia', 'documento'
  entidade_id uuid,

  -- Metadados extra (ex: nome do autor, estado anterior/novo)
  metadata jsonb not null default '{}'::jsonb,

  -- Estado
  lida boolean not null default false,
  lida_em timestamptz,

  criado_em timestamptz default now() not null
);

comment on table public.notificacoes is
  'Notificações individuais por utilizador. Criadas via triggers ou server actions.';

-- Índices para performance
 create index notificacoes_user_idx
  on public.notificacoes(user_id, lida, criado_em desc);

create index notificacoes_tenant_idx
  on public.notificacoes(tenant_id, tipo, criado_em desc);

create index notificacoes_nao_lidas_idx
  on public.notificacoes(user_id, lida) where lida = false;

-- ----------------------------------------------------------------------
-- 2. RLS
-- ----------------------------------------------------------------------
alter table public.notificacoes enable row level security;

create policy "users read own notifications"
  on public.notificacoes for select
  using (user_id = auth.uid());

create policy "system insert notifications"
  on public.notificacoes for insert
  with check (true);

create policy "users mark own notifications read"
  on public.notificacoes for update
  using (user_id = auth.uid())
  with check (user_id = auth.uid());

create policy "users delete own notifications"
  on public.notificacoes for delete
  using (user_id = auth.uid());

-- ----------------------------------------------------------------------
-- 3. FUNÇÃO: Criar notificação para todos os membros do tenant
-- ----------------------------------------------------------------------
create or replace function public.notificar_todos(
  p_tenant_id uuid,
  p_tipo text,
  p_titulo text,
  p_corpo text default null,
  p_entidade_tipo text default null,
  p_entidade_id uuid default null,
  p_metadata jsonb default '{}'::jsonb,
  p_excluir_user_id uuid default null  -- opcional: excluir um user (ex: o autor)
)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.notificacoes (
    tenant_id, user_id, tipo, titulo, corpo,
    entidade_tipo, entidade_id, metadata
  )
  select
    p_tenant_id,
    ut.user_id,
    p_tipo,
    p_titulo,
    p_corpo,
    p_entidade_tipo,
    p_entidade_id,
    p_metadata
  from public.user_tenants ut
  where ut.tenant_id = p_tenant_id
    and (p_excluir_user_id is null or ut.user_id != p_excluir_user_id);
end;
$$;

-- ----------------------------------------------------------------------
-- 4. FUNÇÃO: Criar notificação para admins do tenant
-- ----------------------------------------------------------------------
create or replace function public.notificar_admins(
  p_tenant_id uuid,
  p_tipo text,
  p_titulo text,
  p_corpo text default null,
  p_entidade_tipo text default null,
  p_entidade_id uuid default null,
  p_metadata jsonb default '{}'::jsonb
)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.notificacoes (
    tenant_id, user_id, tipo, titulo, corpo,
    entidade_tipo, entidade_id, metadata
  )
  select
    p_tenant_id,
    ut.user_id,
    p_tipo,
    p_titulo,
    p_corpo,
    p_entidade_tipo,
    p_entidade_id,
    p_metadata
  from public.user_tenants ut
  where ut.tenant_id = p_tenant_id
    and ut.role = 'admin';
end;
$$;

-- ----------------------------------------------------------------------
-- 5. TRIGGER: Ocorrências → notificar admins quando criada
-- ----------------------------------------------------------------------
create or replace function public.trigger_ocorrencia_notificar()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if TG_OP = 'INSERT' then
    -- Notificar admins: nova ocorrência
    perform public.notificar_admins(
      NEW.tenant_id,
      'ocorrencia_criada',
      'Nova ocorrência: ' || NEW.titulo,
      coalesce(NEW.descricao, ''),
      'ocorrencia',
      NEW.id,
      jsonb_build_object('categoria', NEW.categoria, 'autor_id', NEW.criado_por)
    );
  elsif TG_OP = 'UPDATE' then
    if NEW.estado = 'resolvido' and OLD.estado != 'resolvido' then
      -- Notificar o criador da ocorrência que foi resolvida
      insert into public.notificacoes (
        tenant_id, user_id, tipo, titulo, corpo,
        entidade_tipo, entidade_id, metadata
      ) values (
        NEW.tenant_id,
        NEW.criado_por,
        'ocorrencia_resolvida',
        'Ocorrência resolvida: ' || NEW.titulo,
        'A tua ocorrência foi marcada como resolvida.',
        'ocorrencia',
        NEW.id,
        jsonb_build_object('estado_anterior', OLD.estado, 'estado_novo', NEW.estado)
      );
    end if;
  end if;

  return NEW;
end;
$$;

create trigger ocorrencia_notificar
  after insert or update on public.ocorrencias
  for each row
  execute function public.trigger_ocorrencia_notificar();

-- ----------------------------------------------------------------------
-- 6. TRIGGER: Avisos → notificar todos quando publicado
-- ----------------------------------------------------------------------
create or replace function public.trigger_aviso_notificar()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if NEW.ativo = true and (TG_OP = 'INSERT' or OLD.ativo = false) then
    perform public.notificar_todos(
      NEW.tenant_id,
      'aviso_publicado',
      NEW.titulo,
      left(NEW.conteudo, 200),
      'aviso',
      NEW.id,
      jsonb_build_object('prioridade', NEW.prioridade, 'autor_id', NEW.publicado_por),
      NEW.publicado_por
    );
  end if;

  return NEW;
end;
$$;

create trigger aviso_notificar
  after insert or update on public.avisos
  for each row
  execute function public.trigger_aviso_notificar();

-- ----------------------------------------------------------------------
-- 7. TRIGGER: Votações → notificar quando abre
-- ----------------------------------------------------------------------
create or replace function public.trigger_votacao_notificar()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if NEW.estado = 'aberta' and (TG_OP = 'INSERT' or OLD.estado != 'aberta') then
    perform public.notificar_todos(
      NEW.tenant_id,
      'votacao_aberta',
      'Votação aberta: ' || NEW.titulo,
      coalesce(NEW.descricao, ''),
      'votacao',
      NEW.id,
      jsonb_build_object('tipo_quorum', NEW.tipo_quorum, 'criado_por', NEW.criado_por),
      NEW.criado_por
    );
  end if;

  return NEW;
end;
$$;

create trigger votacao_notificar
  after insert or update on public.votacoes
  for each row
  execute function public.trigger_votacao_notificar();
