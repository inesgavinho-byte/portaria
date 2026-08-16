-- 0031_email_hostinger_inbox.sql
--
-- Caixa de entrada integrada para fornecedores de correio externos.
--
-- Princípios de desenho:
--   * cada caixa pertence a um único condomínio;
--   * só administradores do condomínio acedem ao correio e aos anexos;
--   * a mensagem externa é deduplicada por caixa, pasta e UID do fornecedor;
--   * anexos recebidos ficam isolados de "documentos" até triagem humana;
--   * o receptor técnico usa service role, mas os utilizadores finais continuam
--     protegidos por RLS.

create type public.email_mensagem_estado as enum (
  'novo',
  'em_analise',
  'arquivado',
  'promovido_documento'
);

create table public.email_caixas (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references public.tenants(id) on delete cascade,
  endereco text not null,
  fornecedor text not null default 'hostinger',
  mailbox_resource_id text,
  ativa boolean not null default true,
  ultimo_evento_em timestamptz,
  criado_em timestamptz not null default now(),
  atualizado_em timestamptz not null default now(),
  constraint email_caixas_endereco_unico unique (tenant_id, endereco),
  constraint email_caixas_fornecedor_check check (fornecedor in ('hostinger', 'importacao_historica'))
);

comment on table public.email_caixas is
  'Caixas de correio ligadas a um condomínio. Nunca contém tokens, passwords ou segredos de webhooks.';
comment on column public.email_caixas.mailbox_resource_id is
  'Identificador técnico do fornecedor, usado apenas pelo receptor server-side.';

create index email_caixas_tenant_ativa_idx
  on public.email_caixas (tenant_id, ativa)
  where ativa;

create table public.email_mensagens (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references public.tenants(id) on delete cascade,
  caixa_id uuid not null references public.email_caixas(id) on delete cascade,
  pasta text not null default 'INBOX',
  fornecedor_uid bigint not null,
  message_id_externo text,
  em_resposta_a text,
  assunto text not null default '',
  remetente jsonb not null default '{}'::jsonb,
  destinatarios jsonb not null default '[]'::jsonb,
  cc jsonb not null default '[]'::jsonb,
  recebido_em timestamptz,
  flags text[] not null default '{}',
  corpo_texto text,
  corpo_html text,
  tamanho_bytes bigint,
  estado public.email_mensagem_estado not null default 'novo',
  entidade_tipo text,
  entidade_id uuid,
  triado_por uuid references auth.users(id) on delete set null,
  triado_em timestamptz,
  criado_em timestamptz not null default now(),
  atualizado_em timestamptz not null default now(),
  constraint email_mensagens_uid_unico unique (caixa_id, pasta, fornecedor_uid)
);

comment on table public.email_mensagens is
  'Mensagens importadas por integração ou arquivo histórico. Não são documentos publicados até triagem da administração.';
comment on column public.email_mensagens.remetente is
  'Objeto do fornecedor com nome e endereço de e-mail do remetente.';
comment on column public.email_mensagens.entidade_tipo is
  'Associação opcional criada na triagem: documento, ocorrencia, fornecedor, contrato, assembleia ou financeiro.';

create index email_mensagens_caixa_recebido_idx
  on public.email_mensagens (caixa_id, recebido_em desc nulls last);
create index email_mensagens_tenant_estado_idx
  on public.email_mensagens (tenant_id, estado, recebido_em desc nulls last);
create unique index email_mensagens_caixa_message_id_unico_idx
  on public.email_mensagens (caixa_id, message_id_externo)
  where message_id_externo is not null;

create table public.email_anexos (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references public.tenants(id) on delete cascade,
  mensagem_id uuid not null references public.email_mensagens(id) on delete cascade,
  fornecedor_anexo_id text not null,
  nome text not null,
  content_type text,
  tamanho_bytes bigint,
  ficheiro_path text,
  inline boolean not null default false,
  criado_em timestamptz not null default now(),
  constraint email_anexos_unico unique (mensagem_id, fornecedor_anexo_id)
);

comment on table public.email_anexos is
  'Anexos de e-mail ainda não promovidos à biblioteca documental oficial.';

create index email_anexos_mensagem_idx
  on public.email_anexos (mensagem_id);

-- O bucket é privado. A convenção de path é:
-- {tenant_id}/{mensagem_id}/{anexo_id}/{nome_sanitizado}
insert into storage.buckets (id, name, public)
values ('email-anexos', 'email-anexos', false)
on conflict (id) do nothing;

alter table public.email_caixas enable row level security;
alter table public.email_mensagens enable row level security;
alter table public.email_anexos enable row level security;

create policy "admins see tenant email caixas"
  on public.email_caixas for select
  using (public.is_tenant_admin(tenant_id));

create policy "admins manage tenant email caixas"
  on public.email_caixas for all
  using (public.is_tenant_admin(tenant_id))
  with check (public.is_tenant_admin(tenant_id));

create policy "admins see tenant email mensagens"
  on public.email_mensagens for select
  using (public.is_tenant_admin(tenant_id));

create policy "admins manage tenant email mensagens"
  on public.email_mensagens for all
  using (public.is_tenant_admin(tenant_id))
  with check (public.is_tenant_admin(tenant_id));

create policy "admins see tenant email anexos"
  on public.email_anexos for select
  using (public.is_tenant_admin(tenant_id));

create policy "admins manage tenant email anexos"
  on public.email_anexos for all
  using (public.is_tenant_admin(tenant_id))
  with check (public.is_tenant_admin(tenant_id));

create policy "admins download tenant email anexos"
  on storage.objects for select
  using (
    bucket_id = 'email-anexos'
    and public.is_tenant_admin((storage.foldername(name))[1]::uuid)
  );

create policy "admins upload tenant email anexos"
  on storage.objects for insert
  with check (
    bucket_id = 'email-anexos'
    and public.is_tenant_admin((storage.foldername(name))[1]::uuid)
  );

create policy "admins delete tenant email anexos"
  on storage.objects for delete
  using (
    bucket_id = 'email-anexos'
    and public.is_tenant_admin((storage.foldername(name))[1]::uuid)
  );

-- Mantém atualizado_em coerente nas entidades que podem ser alteradas pela administração.
create or replace function public.atualizar_email_atualizado_em()
returns trigger
language plpgsql
security invoker
set search_path = public
as $$
begin
  new.atualizado_em = now();
  return new;
end;
$$;

create trigger email_caixas_atualizado_em
  before update on public.email_caixas
  for each row execute function public.atualizar_email_atualizado_em();

create trigger email_mensagens_atualizado_em
  before update on public.email_mensagens
  for each row execute function public.atualizar_email_atualizado_em();
