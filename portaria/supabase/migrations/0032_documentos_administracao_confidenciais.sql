-- 0032_documentos_administracao_confidenciais.sql
--
-- Biblioteca documental confidencial para a administração de cada condomínio.
-- É deliberadamente separada de public.documentos, cuja biblioteca é partilhada
-- com membros do tenant conforme as respetivas políticas de visibilidade.

create table public.documentos_administracao (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references public.tenants(id) on delete cascade,
  titulo text not null check (char_length(titulo) <= 200),
  descricao text check (descricao is null or char_length(descricao) <= 500),
  categoria public.documento_categoria not null default 'outro',
  ano integer check (ano is null or ano between 1900 and 2100),
  ficheiro_path text not null unique,
  ficheiro_tamanho bigint,
  ficheiro_tipo text,
  origem_partilhada_path text,
  upload_em timestamptz not null default now(),
  upload_por uuid not null references auth.users(id) on delete restrict
);

comment on table public.documentos_administracao is
  'Documentos confidenciais do condomínio, acessíveis exclusivamente a administradores do tenant.';
comment on column public.documentos_administracao.origem_partilhada_path is
  'Caminho de origem no bucket partilhado, quando o ficheiro foi migrado para esta biblioteca confidencial.';

create index documentos_administracao_tenant_upload_idx
  on public.documentos_administracao (tenant_id, upload_em desc);

-- Bucket privado. Os MIME permitidos refletem a whitelist da interface.
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'documentos-admin',
  'documentos-admin',
  false,
  26214400,
  array[
    'application/pdf',
    'application/msword',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    'application/vnd.ms-excel',
    'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    'image/jpeg',
    'image/png',
    'image/webp'
  ]
)
on conflict (id) do update
set public = excluded.public,
    file_size_limit = excluded.file_size_limit,
    allowed_mime_types = excluded.allowed_mime_types;

alter table public.documentos_administracao enable row level security;

create policy "admins see tenant documentos administracao"
  on public.documentos_administracao for select
  using (public.is_tenant_admin(tenant_id));

create policy "admins manage tenant documentos administracao"
  on public.documentos_administracao for all
  using (public.is_tenant_admin(tenant_id))
  with check (public.is_tenant_admin(tenant_id));

create policy "admins download documentos administracao"
  on storage.objects for select
  using (
    bucket_id = 'documentos-admin'
    and public.is_tenant_admin((storage.foldername(name))[1]::uuid)
  );

create policy "admins upload documentos administracao"
  on storage.objects for insert
  with check (
    bucket_id = 'documentos-admin'
    and public.is_tenant_admin((storage.foldername(name))[1]::uuid)
  );

create policy "admins delete documentos administracao"
  on storage.objects for delete
  using (
    bucket_id = 'documentos-admin'
    and public.is_tenant_admin((storage.foldername(name))[1]::uuid)
  );
