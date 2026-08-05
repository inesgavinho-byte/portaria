-- =====================================================================
-- Migration: 0028_hardening_multitenant.sql
-- Hardening multi-tenant — correções de isolamento (P0 da auditoria)
--
-- NUMERAÇÃO: esta migração seria a "0027_hardening_multitenant" do plano,
-- mas 0027 já está ocupado por 0027_financeiro.sql. Usa-se 0028 (próximo
-- número livre). Os identificadores de auditoria (S1..S6, C2, S8) são
-- mantidos nos comentários de cada bloco.
--
-- Fonte: docs/security/rls-audit-0027.md (Tarefa 0.0).
--
-- IMPORTANTE:
--   • NÃO aplicar em produção sem autorização explícita (Decisão D-D).
--   • Idempotente: usa `drop policy if exists` + `create policy`, e
--     `create or replace function`. Pode ser reaplicada sem erro.
--   • Alguns caminhos de aplicação (server actions) TÊM de ser adaptados
--     ANTES de aplicar esta migração, senão quebram. Ver secção FOLLOW-UP
--     no fim do ficheiro.
--
-- Estrutura:
--   0. Funções auxiliares (user_tem_papel, try_uuid)
--   1. S1  — notificações: remover INSERT permissivo
--   2. S2  — grants das funções SECURITY DEFINER + validação de tenant
--   3. S3  — RAG: validação de membership em buscar_chunks/estado_conhecimento
--   4. S4  — votações: RPC transacional registar_voto + fechar INSERT/UPDATE
--   5. S5  — reservas: coerência tenant↔espaço↔utilizador
--   6. S6  — papéis reais no RLS (inquilino sem docs/atas/assembleias/votações)
--   7. C2  — ocorrências resolvidas no RAG: admin-only
--   8. S8  — user_permilagem: própria ou admin do tenant
-- =====================================================================


-- =====================================================================
-- 0. FUNÇÕES AUXILIARES
-- =====================================================================

-- 0.1 user_tem_papel — o utilizador atual tem um dos papéis indicados no
-- tenant? Usada nas políticas RLS para distinguir inquilino dos restantes.
-- SECURITY DEFINER + search_path fixo, como user_tenant_ids/is_tenant_admin.
-- Só revela informação sobre o PRÓPRIO utilizador (auth.uid()).
create or replace function public.user_tem_papel(
  p_tenant_id uuid,
  p_papeis public.user_role[]
)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.user_tenants
    where user_id = auth.uid()
      and tenant_id = p_tenant_id
      and role = any(p_papeis)
  );
$$;

comment on function public.user_tem_papel(uuid, public.user_role[]) is
  'True se auth.uid() tem um dos papéis indicados no tenant. Usada no RLS role-aware (S6).';

revoke execute on function public.user_tem_papel(uuid, public.user_role[]) from public, anon;
grant execute on function public.user_tem_papel(uuid, public.user_role[]) to authenticated;

-- 0.2 try_uuid — cast seguro para uuid (devolve null em vez de erro).
-- Necessário na política de storage (S6): o path do regulamento é
-- '{tenant_id}/regulamento/...', logo o 2.º segmento não é um uuid e um
-- cast direto rebentaria a avaliação da política.
create or replace function public.try_uuid(p_text text)
returns uuid
language plpgsql
immutable
as $$
begin
  return p_text::uuid;
exception when others then
  return null;
end;
$$;

comment on function public.try_uuid(text) is
  'Cast seguro text→uuid; devolve null em vez de erro. Usada em políticas de storage.';


-- =====================================================================
-- 1. S1 — NOTIFICAÇÕES: remover INSERT permissivo
--
-- Antes: `create policy "system insert notifications" ... with check (true)`
-- aplicava-se a anon+authenticated e não validava nada → qualquer visitante
-- injetava notificações em qualquer utilizador.
--
-- Correção: remover a política. As notificações legítimas são criadas por
-- triggers/funções SECURITY DEFINER (trigger_ocorrencia_notificar,
-- trigger_aviso_notificar, trigger_votacao_notificar, trigger_reserva_notificar,
-- notificar_todos, notificar_admins), que correm como owner e contornam o RLS.
-- Confirmado (grep) que NENHUMA server action insere em notificacoes via
-- cliente do utilizador — logo não é preciso política de INSERT para clientes.
-- =====================================================================

drop policy if exists "system insert notifications" on public.notificacoes;
-- (sem política de INSERT de cliente: só triggers/definer/service_role inserem)


-- =====================================================================
-- 2. S2 — GRANTS DAS FUNÇÕES SECURITY DEFINER + validação de tenant no corpo
--
-- As 8 funções criadas em 0023–0026 nunca receberam revoke/grant, ficando
-- executáveis por PUBLIC e anon. Aqui:
--   • notificar_todos/notificar_admins: revogadas de public, anon E
--     authenticated (só triggers/service_role as usam — confirmado por grep).
--   • as restantes: revogadas de public/anon, concedidas a authenticated,
--     COM validação de membership no corpo (S3/S8 tratam duas delas em
--     blocos próprios; aqui ficam total_permilagem_tenant,
--     verificar_disponibilidade e contar_reservas_semana).
--
-- Nota: os grants são resolvidos dinamicamente (pg_get_function_identity_arguments)
-- para evitar depender do schema do tipo `vector` no signature de buscar_chunks.
-- =====================================================================

-- 2.1 total_permilagem_tenant — só devolve dados se o chamador for membro
create or replace function public.total_permilagem_tenant(p_tenant_id uuid)
returns integer
language sql
stable
security definer
set search_path = public
as $$
  select coalesce(sum(f.permilagem), 0)::integer
  from public.fracoes f
  where f.tenant_id = p_tenant_id
    and exists (
      select 1 from public.user_tenants ut
      where ut.user_id = auth.uid()
        and ut.tenant_id = p_tenant_id
    );
$$;

-- 2.2 verificar_disponibilidade — valida membership no tenant do espaço
create or replace function public.verificar_disponibilidade(
  p_espaco_id uuid,
  p_data_inicio timestamptz,
  p_data_fim timestamptz
)
returns boolean
language plpgsql
stable
security definer
set search_path = public
as $$
declare
  v_count integer;
  v_tenant uuid;
begin
  select tenant_id into v_tenant
  from public.espacos_comuns
  where id = p_espaco_id;

  -- Espaço inexistente ou chamador não é membro do tenant do espaço:
  -- devolve false sem revelar existência.
  if v_tenant is null then
    return false;
  end if;

  if not exists (
    select 1 from public.user_tenants ut
    where ut.user_id = auth.uid()
      and ut.tenant_id = v_tenant
  ) then
    return false;
  end if;

  select count(*) into v_count
  from public.reservas
  where espaco_id = p_espaco_id
    and estado in ('pendente', 'confirmada')
    and data_inicio < p_data_fim
    and data_fim > p_data_inicio;

  return v_count = 0;
end;
$$;

-- 2.3 contar_reservas_semana — só a própria contagem ou admin do tenant
create or replace function public.contar_reservas_semana(
  p_user_id uuid,
  p_espaco_id uuid,
  p_data_ref timestamptz
)
returns integer
language sql
stable
security definer
set search_path = public
as $$
  select count(*)::integer
  from public.reservas r
  where r.user_id = p_user_id
    and r.espaco_id = p_espaco_id
    and r.estado in ('pendente', 'confirmada')
    and r.data_inicio >= date_trunc('week', p_data_ref)
    and r.data_inicio < date_trunc('week', p_data_ref) + interval '1 week'
    and (
      p_user_id = auth.uid()
      or public.is_tenant_admin(
        (select e.tenant_id from public.espacos_comuns e where e.id = p_espaco_id)
      )
    );
$$;

-- 2.4 Grants (S2) — resolvidos por nome para robustez face ao tipo `vector`
do $$
declare
  r record;
begin
  -- Funções acessíveis a authenticated (com validação interna de tenant)
  for r in
    select 'public.' || p.proname || '(' ||
           pg_get_function_identity_arguments(p.oid) || ')' as sig
    from pg_proc p
    join pg_namespace n on n.oid = p.pronamespace
    where n.nspname = 'public'
      and p.proname in (
        'buscar_chunks', 'estado_conhecimento', 'total_permilagem_tenant',
        'user_permilagem', 'verificar_disponibilidade', 'contar_reservas_semana'
      )
  loop
    execute 'revoke execute on function ' || r.sig || ' from public, anon';
    execute 'grant execute on function ' || r.sig || ' to authenticated';
  end loop;

  -- Funções de notificação em massa: NÃO acessíveis a authenticated.
  -- Só as usam os triggers (definer, correm como owner) e service_role.
  for r in
    select 'public.' || p.proname || '(' ||
           pg_get_function_identity_arguments(p.oid) || ')' as sig
    from pg_proc p
    join pg_namespace n on n.oid = p.pronamespace
    where n.nspname = 'public'
      and p.proname in ('notificar_todos', 'notificar_admins')
  loop
    execute 'revoke execute on function ' || r.sig || ' from public, anon, authenticated';
  end loop;
end $$;


-- =====================================================================
-- 3. S3 — RAG: validação de membership dentro das funções definer
--
-- buscar_chunks/estado_conhecimento recebem p_tenant_id do chamador e
-- corriam como definer sem verificar se o chamador pertence ao tenant.
-- Agora exigem membership de auth.uid() em p_tenant_id (devolvem 0 linhas
-- caso contrário — sem revelar existência de conteúdo alheio).
-- buscar_chunks incorpora também C2 (ocorrência resolvida só admin) e a
-- restrição de inquilino (S6) por consistência com a leitura direta.
-- =====================================================================

create or replace function public.buscar_chunks(
  p_tenant_id uuid,
  p_embedding vector(1536),
  p_limite integer default 5,
  p_threshold float default 0.7
)
returns table (
  id uuid,
  origem text,
  origem_id text,
  conteudo text,
  metadata jsonb,
  similarity float
)
language sql
stable
security definer
set search_path = public
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
    -- S3: o chamador tem de ser membro do tenant pedido
    and exists (
      select 1 from public.user_tenants ut
      where ut.user_id = auth.uid()
        and ut.tenant_id = p_tenant_id
    )
    -- C2: chunks de ocorrências resolvidas só para admins
    and (
      e.origem <> 'ocorrencia_resolvida'
      or public.is_tenant_admin(p_tenant_id)
    )
    -- S6: inquilino só pesquisa regulamento/legislação
    and (
      public.user_tem_papel(p_tenant_id, array['admin','comissao','condomino']::public.user_role[])
      or e.origem in ('regulamento', 'legislacao')
    )
  order by e.embedding <=> p_embedding
  limit p_limite;
$$;

create or replace function public.estado_conhecimento(p_tenant_id uuid)
returns table (origem text, count bigint)
language sql
stable
security definer
set search_path = public
as $$
  select e.origem, count(*)::bigint
  from public.conhecimento_embeddings e
  where e.tenant_id = p_tenant_id
    -- S3: membership obrigatório
    and exists (
      select 1 from public.user_tenants ut
      where ut.user_id = auth.uid()
        and ut.tenant_id = p_tenant_id
    )
    -- C2/S6: só conta o que o chamador poderia efetivamente ler
    and (
      e.origem <> 'ocorrencia_resolvida'
      or public.is_tenant_admin(p_tenant_id)
    )
    and (
      public.user_tem_papel(p_tenant_id, array['admin','comissao','condomino']::public.user_role[])
      or e.origem in ('regulamento', 'legislacao')
    )
  group by e.origem;
$$;


-- =====================================================================
-- 4. S4 — VOTAÇÕES: integridade transacional
--
-- Problema: a política de INSERT em `votos` só exigia tenant do utilizador
-- (voto múltiplo por PostgREST), e a política de UPDATE em
-- `votacao_participantes` permitia repor votou_em=null e votar de novo.
-- Entre o INSERT do voto e o UPDATE de votou_em havia ainda janela de corrida.
--
-- Correção: uma RPC transacional `registar_voto` (SECURITY DEFINER) que
-- valida tudo e faz insert+update atomicamente com lock da linha do
-- participante (fecha o replay concorrente). Remove-se o INSERT direto de
-- `votos` e o UPDATE de membro em `votacao_participantes`.
-- =====================================================================

-- drop-first porque o tipo de retorno mudou (void -> text) e para idempotência
drop function if exists public.registar_voto(uuid, uuid);
create or replace function public.registar_voto(
  p_votacao_id uuid,
  p_opcao_id uuid
)
returns text
language plpgsql
security definer
set search_path = public
as $$
declare
  v_user   uuid := auth.uid();
  v_tenant uuid;
  v_estado public.votacao_estado;
  v_part_id uuid;
  v_votou  timestamptz;
  v_hash   text;
begin
  if v_user is null then
    raise exception 'Não autenticado.' using errcode = '28000';
  end if;

  -- Lock da linha do participante: serializa votos concorrentes do mesmo
  -- utilizador (o 2.º chamador vê votou_em preenchido e é rejeitado).
  select vp.id, vp.votou_em, v.tenant_id, v.estado
    into v_part_id, v_votou, v_tenant, v_estado
  from public.votacao_participantes vp
  join public.votacoes v on v.id = vp.votacao_id
  where vp.votacao_id = p_votacao_id
    and vp.user_id = v_user
  for update of vp;

  if not found then
    raise exception 'Não está autorizado a votar nesta votação.' using errcode = '42501';
  end if;

  -- Membership no tenant da votação
  if not exists (
    select 1 from public.user_tenants ut
    where ut.user_id = v_user and ut.tenant_id = v_tenant
  ) then
    raise exception 'Acesso negado.' using errcode = '42501';
  end if;

  if v_estado <> 'aberta' then
    raise exception 'Esta votação não está aberta.' using errcode = '22023';
  end if;

  if v_votou is not null then
    raise exception 'Já votou nesta votação.' using errcode = '22023';
  end if;

  -- A opção tem de pertencer a esta votação (e, por FK, ao mesmo tenant)
  if not exists (
    select 1 from public.votacao_opcoes o
    where o.id = p_opcao_id
      and o.votacao_id = p_votacao_id
  ) then
    raise exception 'Opção inválida.' using errcode = '22023';
  end if;

  v_hash := encode(
    sha256(convert_to(
      p_votacao_id::text || ':' || p_opcao_id::text || ':' || gen_random_uuid()::text,
      'UTF8'
    )),
    'hex'
  );

  insert into public.votos (votacao_id, tenant_id, opcao_id, voto_hash)
  values (p_votacao_id, v_tenant, p_opcao_id, v_hash);

  update public.votacao_participantes
    set votou_em = now()
  where id = v_part_id;

  -- Devolve o hash de comprovativo (a UI mostra-o ao votante). A
  -- verificabilidade real por hash é decidida na Tarefa 1.4 (D6/C5).
  return v_hash;
end;
$$;

comment on function public.registar_voto(uuid, uuid) is
  'Registo transacional de voto: valida votação aberta, participação, opção e '
  'unicidade, com lock do participante. Substitui o INSERT direto em votos (S4).';

revoke execute on function public.registar_voto(uuid, uuid) from public, anon;
grant execute on function public.registar_voto(uuid, uuid) to authenticated;

-- Fechar o INSERT direto de votos por cliente (só registar_voto insere)
drop policy if exists "system inserts votos" on public.votos;

-- Fechar o UPDATE de membro em votacao_participantes (reset de votou_em).
-- registar_voto (definer) atualiza votou_em; admins mantêm gestão via
-- "admins manage participacoes".
drop policy if exists "users update own participacao" on public.votacao_participantes;


-- =====================================================================
-- 5. S5 — RESERVAS: coerência tenant↔espaço↔utilizador
--
-- O INSERT só validava user_id=auth.uid(). Agora exige também que o tenant
-- seja do utilizador e que o espaço pertença a esse tenant (bloqueia reserva
-- cruzada entre condomínios). O mesmo no with check do UPDATE.
-- =====================================================================

drop policy if exists "users create own reservas" on public.reservas;
create policy "users create own reservas"
  on public.reservas for insert
  to authenticated
  with check (
    user_id = auth.uid()
    and tenant_id in (select public.user_tenant_ids())
    and exists (
      select 1 from public.espacos_comuns e
      where e.id = espaco_id
        and e.tenant_id = reservas.tenant_id
    )
  );

drop policy if exists "users update own reservas" on public.reservas;
create policy "users update own reservas"
  on public.reservas for update
  to authenticated
  using (
    user_id = auth.uid()
    and estado in ('pendente', 'confirmada')
  )
  with check (
    user_id = auth.uid()
    and tenant_id in (select public.user_tenant_ids())
    and exists (
      select 1 from public.espacos_comuns e
      where e.id = espaco_id
        and e.tenant_id = reservas.tenant_id
    )
  );


-- =====================================================================
-- 6. S6 — PAPÉIS REAIS NO RLS
--
-- O inquilino era, no RLS, um membro de pleno direito. Aqui excluímo-lo da
-- leitura de documentos sensíveis (conta/ata/contrato/apolice), assembleias,
-- pontos e votações — usando user_tem_papel().
--
-- DECISÃO sobre `comissao`: o comportamento pretendido da comissão NÃO está
-- especificado no código (Tarefa 0.7 / Decisão da Inês). Mantém-se o status
-- quo: comissao é tratada como condómino (membro pleno), NÃO como inquilino.
-- Não se inventam privilégios adicionais para comissao.
-- =====================================================================

-- 6.1 documentos: inquilino só vê categorias não sensíveis
drop policy if exists "members see tenant documentos" on public.documentos;
create policy "members see tenant documentos"
  on public.documentos for select
  to authenticated
  using (
    tenant_id in (select public.user_tenant_ids())
    and (
      public.user_tem_papel(tenant_id, array['admin','comissao','condomino']::public.user_role[])
      or categoria not in ('conta', 'ata', 'contrato', 'apolice')
    )
  );

-- 6.2 storage documentos: alinhar download com a política de tabela.
-- Convenção de path: {tenant_id}/{documento_id}/{filename}.
-- try_uuid trata o path do regulamento ({tenant}/regulamento/...), cujo
-- 2.º segmento não é uuid — nesse caso não há documento sensível a bloquear.
-- (O download do regulamento em si é servido por service role, não por aqui.)
drop policy if exists "members download tenant documentos" on storage.objects;
create policy "members download tenant documentos"
  on storage.objects for select
  to authenticated
  using (
    bucket_id = 'documentos'
    and (storage.foldername(name))[1]::uuid in (select public.user_tenant_ids())
    and (
      public.user_tem_papel(
        (storage.foldername(name))[1]::uuid,
        array['admin','comissao','condomino']::public.user_role[]
      )
      or not exists (
        select 1 from public.documentos d
        where d.id = public.try_uuid((storage.foldername(name))[2])
          and d.categoria in ('conta', 'ata', 'contrato', 'apolice')
      )
    )
  );

-- 6.3 assembleias: inquilino não vê
drop policy if exists "members see published assembleias" on public.assembleias;
create policy "members see published assembleias"
  on public.assembleias for select
  to authenticated
  using (
    estado <> 'rascunho'
    and tenant_id in (select public.user_tenant_ids())
    and public.user_tem_papel(tenant_id, array['admin','comissao','condomino']::public.user_role[])
  );

-- 6.4 assembleia_pontos: inquilino não vê
drop policy if exists "members see published pontos" on public.assembleia_pontos;
create policy "members see published pontos"
  on public.assembleia_pontos for select
  to authenticated
  using (
    exists (
      select 1 from public.assembleias a
      where a.id = assembleia_id
        and a.estado <> 'rascunho'
        and a.tenant_id in (select public.user_tenant_ids())
    )
    and public.user_tem_papel(tenant_id, array['admin','comissao','condomino']::public.user_role[])
  );

-- 6.5 votacoes: inquilino não vê
drop policy if exists "members see active votacoes" on public.votacoes;
create policy "members see active votacoes"
  on public.votacoes for select
  to authenticated
  using (
    estado in ('aberta', 'encerrada')
    and tenant_id in (select public.user_tenant_ids())
    and public.user_tem_papel(tenant_id, array['admin','comissao','condomino']::public.user_role[])
  );

-- 6.6 votacao_opcoes: inquilino não vê
drop policy if exists "members see opcoes of visible votacoes" on public.votacao_opcoes;
create policy "members see opcoes of visible votacoes"
  on public.votacao_opcoes for select
  to authenticated
  using (
    exists (
      select 1 from public.votacoes v
      where v.id = votacao_id
        and v.estado in ('aberta', 'encerrada')
        and v.tenant_id in (select public.user_tenant_ids())
    )
    and public.user_tem_papel(tenant_id, array['admin','comissao','condomino']::public.user_role[])
  );


-- =====================================================================
-- 7. C2 — OCORRÊNCIAS RESOLVIDAS NO RAG: admin-only
--
-- A política "members read embeddings" dava a TODOS os membros acesso aos
-- chunks de ocorrências resolvidas (descrições de queixas de vizinhos).
-- Nova política de membro: exclui ocorrencia_resolvida e restringe inquilino
-- a regulamento/legislação. Admins continuam a ver tudo via a política
-- existente "admins manage embeddings" (for all).
--
-- Reforço no caminho RAG: buscar_chunks/estado_conhecimento (bloco 3) já
-- aplicam a mesma regra, pois correm como definer e ignoram este RLS.
-- =====================================================================

drop policy if exists "members read embeddings" on public.conhecimento_embeddings;
create policy "members read embeddings"
  on public.conhecimento_embeddings for select
  to authenticated
  using (
    tenant_id in (select public.user_tenant_ids())
    and origem <> 'ocorrencia_resolvida'
    and (
      public.user_tem_papel(tenant_id, array['admin','comissao','condomino']::public.user_role[])
      or origem in ('regulamento', 'legislacao')
    )
  );


-- =====================================================================
-- 8. S8 — user_permilagem: própria ou admin do tenant
--
-- Aceitava qualquer p_user_id → leitura da permilagem (dimensão da fração)
-- de terceiros. Agora só devolve se p_user_id=auth.uid() OU o chamador é
-- admin do tenant. Não-autorizado → sem linha → null (não distingue
-- existência). Grant tratado no bloco 2.
-- =====================================================================

create or replace function public.user_permilagem(p_user_id uuid, p_tenant_id uuid)
returns integer
language sql
stable
security definer
set search_path = public
as $$
  select coalesce(f.permilagem, 0)::integer
  from public.user_tenants ut
  left join public.fracoes f on f.id = ut.fracao_id
  where ut.user_id = p_user_id
    and ut.tenant_id = p_tenant_id
    and (
      p_user_id = auth.uid()
      or public.is_tenant_admin(p_tenant_id)
    )
  limit 1;
$$;


-- =====================================================================
-- FOLLOW-UP OBRIGATÓRIO ANTES DE APLICAR (server actions — fora desta tarefa)
--
-- Esta migração fecha caminhos que a aplicação ainda usa pelo cliente do
-- utilizador. Antes de aplicar (mesmo em staging), adaptar:
--
--   1. votar() [src/lib/actions/votacoes.ts] — deixar de inserir em `votos`
--      e de atualizar `votacao_participantes` diretamente; passar a chamar
--      supabase.rpc('registar_voto', { p_votacao_id, p_opcao_id }).
--      (Sem isto, votar() rebenta: RLS bloqueia o INSERT/UPDATE.)
--
--   2. sugerirResolucao() [src/lib/actions/ia-rag.ts] — trocar
--      getCurrentUserInTenant() por requireAdmin() (C2): só admins podem
--      obter sugestões baseadas em ocorrências resolvidas. Com a migração,
--      um não-admin já recebe 0 chunks de ocorrencia_resolvida, mas a action
--      deve recusar explicitamente.
--
-- Nada aqui foi aplicado em produção. Validação recomendada: `supabase db
-- reset` local + suite tests/security/rls-p0 (Tarefas 0.10 / 2.6).
-- =====================================================================
