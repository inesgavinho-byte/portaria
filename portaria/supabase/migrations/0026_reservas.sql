-- =====================================================================
-- Migration: 0026_reservas.sql
-- Reservas de Espaços Comuns
-- =====================================================================

-- ----------------------------------------------------------------------
-- 1. ESPACOS_COMUNS
-- ----------------------------------------------------------------------
create table public.espacos_comuns (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references public.tenants(id) on delete cascade,
  nome text not null,
  descricao text,
  capacidade integer,
  imagem_url text,

  -- Regras de reserva
  duracao_minima_minutos integer not null default 60,
  duracao_maxima_minutos integer not null default 120,
  antecedencia_minima_horas integer not null default 24,
  reservas_por_semana integer not null default 3,

  -- Horário de funcionamento (null = fechado nesse dia)
  abertura_seg time,
  fecho_seg time,
  abertura_ter time,
  fecho_ter time,
  abertura_qua time,
  fecho_qua time,
  abertura_qui time,
  fecho_qui time,
  abertura_sex time,
  fecho_sex time,
  abertura_sab time,
  fecho_sab time,
  abertura_dom time,
  fecho_dom time,

  ativo boolean not null default true,
  criado_em timestamptz default now() not null,
  atualizado_em timestamptz default now() not null
);

comment on table public.espacos_comuns is
  'Espaços comuns do condomínio reserváveis pelos condóminos.';

create index espacos_comuns_tenant_idx on public.espacos_comuns(tenant_id, ativo);

-- ----------------------------------------------------------------------
-- 2. RESERVAS
-- ----------------------------------------------------------------------
create table public.reservas (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references public.tenants(id) on delete cascade,
  espaco_id uuid not null references public.espacos_comuns(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  fracao_id uuid references public.fracoes(id) on delete set null,

  data_inicio timestamptz not null,
  data_fim timestamptz not null,

  -- Estado da reserva
  estado text not null default 'confirmada'
    check (estado in ('pendente', 'confirmada', 'cancelada', 'concluida')),

  motivo text,
  num_pessoas integer,

  -- Metadados
  criado_em timestamptz default now() not null,
  atualizado_em timestamptz default now() not null,

  -- Garantir que não há sobreposição de reservas no mesmo espaço
  constraint reservas_sem_sobreposicao
    exclude using gist (
      espaco_id with =,
      tstzrange(data_inicio, data_fim) with &&
    )
    where (estado in ('pendente', 'confirmada'))
);

comment on table public.reservas is
  'Reservas de espaços comuns. Exclusão via gist garante não haver sobreposição.';

create index reservas_espaco_idx on public.reservas(espaco_id, data_inicio, estado);
create index reservas_user_idx on public.reservas(user_id, data_inicio desc);
create index reservas_fracao_idx on public.reservas(fracao_id, data_inicio desc);

-- ----------------------------------------------------------------------
-- 3. RLS
-- ----------------------------------------------------------------------
alter table public.espacos_comuns enable row level security;

-- Todos os membros do tenant podem ver espaços ativos
create policy "members read espacos"
  on public.espacos_comuns for select
  using (tenant_id in (select public.user_tenant_ids()) and ativo = true);

-- Admins podem gerir espaços
create policy "admins manage espacos"
  on public.espacos_comuns for all
  using (public.is_tenant_admin(tenant_id))
  with check (public.is_tenant_admin(tenant_id));

alter table public.reservas enable row level security;

-- Cada utilizador vê as suas próprias reservas + reservas do seu tenant (para ver disponibilidade)
create policy "users read own reservas"
  on public.reservas for select
  using (user_id = auth.uid() or tenant_id in (select public.user_tenant_ids()));

-- Cada utilizador cria as suas próprias reservas
create policy "users create own reservas"
  on public.reservas for insert
  with check (user_id = auth.uid());

-- Cada utilizador atualiza/apaga as suas próprias reservas (só se pendente/confirmada)
create policy "users update own reservas"
  on public.reservas for update
  using (user_id = auth.uid() and estado in ('pendente', 'confirmada'))
  with check (user_id = auth.uid());

create policy "users delete own reservas"
  on public.reservas for delete
  using (user_id = auth.uid() and estado in ('pendente', 'confirmada'));

-- Admins podem gerir todas as reservas
create policy "admins manage reservas"
  on public.reservas for all
  using (public.is_tenant_admin(tenant_id))
  with check (public.is_tenant_admin(tenant_id));

-- ----------------------------------------------------------------------
-- 4. FUNÇÃO: Verificar disponibilidade
-- ----------------------------------------------------------------------
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
begin
  select count(*) into v_count
  from public.reservas
  where espaco_id = p_espaco_id
    and estado in ('pendente', 'confirmada')
    and data_inicio < p_data_fim
    and data_fim > p_data_inicio;

  return v_count = 0;
end;
$$;

-- ----------------------------------------------------------------------
-- 5. FUNÇÃO: Contar reservas da semana
-- ----------------------------------------------------------------------
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
  from public.reservas
  where user_id = p_user_id
    and espaco_id = p_espaco_id
    and estado in ('pendente', 'confirmada')
    and data_inicio >= date_trunc('week', p_data_ref)
    and data_inicio < date_trunc('week', p_data_ref) + interval '1 week';
$$;

-- ----------------------------------------------------------------------
-- 6. FUNÇÃO: Validar reserva antes de inserir
-- ----------------------------------------------------------------------
create or replace function public.validar_reserva()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_espaco public.espacos_comuns%rowtype;
  v_duracao_minutos integer;
  v_antecedencia_horas integer;
  v_reservas_semana integer;
  v_dia_semana integer;
  v_abertura time;
  v_fecho time;
  v_hora_inicio time;
  v_hora_fim time;
begin
  -- Buscar espaço
  select * into v_espaco
  from public.espacos_comuns
  where id = NEW.espaco_id;

  if not found then
    raise exception 'Espaço não encontrado.';
  end if;

  if not v_espaco.ativo then
    raise exception 'Espaço não está ativo.';
  end if;

  -- Verificar duração
  v_duracao_minutos := extract(epoch from (NEW.data_fim - NEW.data_inicio)) / 60;

  if v_duracao_minutos < v_espaco.duracao_minima_minutos then
    raise exception 'Duração mínima: % minutos.', v_espaco.duracao_minima_minutos;
  end if;

  if v_duracao_minutos > v_espaco.duracao_maxima_minutos then
    raise exception 'Duração máxima: % minutos.', v_espaco.duracao_maxima_minutos;
  end if;

  -- Verificar antecedência
  v_antecedencia_horas := extract(epoch from (NEW.data_inicio - now())) / 3600;

  if v_antecedencia_horas < v_espaco.antecedencia_minima_horas then
    raise exception 'Reserva deve ser feita com pelo menos % horas de antecedência.', v_espaco.antecedencia_minima_horas;
  end if;

  -- Verificar limite semanal
  v_reservas_semana := public.contar_reservas_semana(NEW.user_id, NEW.espaco_id, NEW.data_inicio);

  if v_reservas_semana >= v_espaco.reservas_por_semana then
    raise exception 'Limite de % reservas por semana atingido.', v_espaco.reservas_por_semana;
  end if;

  -- Verificar horário de funcionamento
  v_dia_semana := extract(dow from NEW.data_inicio);
  v_hora_inicio := NEW.data_inicio::time;
  v_hora_fim := NEW.data_fim::time;

  case v_dia_semana
    when 0 then begin v_abertura := v_espaco.abertura_dom; v_fecho := v_espaco.fecho_dom; end;
    when 1 then begin v_abertura := v_espaco.abertura_seg; v_fecho := v_espaco.fecho_seg; end;
    when 2 then begin v_abertura := v_espaco.abertura_ter; v_fecho := v_espaco.fecho_ter; end;
    when 3 then begin v_abertura := v_espaco.abertura_qua; v_fecho := v_espaco.fecho_qua; end;
    when 4 then begin v_abertura := v_espaco.abertura_qui; v_fecho := v_espaco.fecho_qui; end;
    when 5 then begin v_abertura := v_espaco.abertura_sex; v_fecho := v_espaco.fecho_sex; end;
    when 6 then begin v_abertura := v_espaco.abertura_sab; v_fecho := v_espaco.fecho_sab; end;
  end case;

  if v_abertura is null or v_fecho is null then
    raise exception 'Espaço fechado neste dia.';
  end if;

  if v_hora_inicio < v_abertura or v_hora_fim > v_fecho then
    raise exception 'Fora do horário de funcionamento (% - %).', v_abertura, v_fecho;
  end if;

  return NEW;
end;
$$;

create trigger validar_reserva_trigger
  before insert or update on public.reservas
  for each row
  execute function public.validar_reserva();

-- ----------------------------------------------------------------------
-- 7. TRIGGER: Notificar quando reserva é criada/cancelada
-- ----------------------------------------------------------------------
create or replace function public.trigger_reserva_notificar()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if TG_OP = 'INSERT' then
    -- Notificar o utilizador que fez a reserva
    insert into public.notificacoes (
      tenant_id, user_id, tipo, titulo, corpo,
      entidade_tipo, entidade_id, metadata
    )
    select
      NEW.tenant_id,
      NEW.user_id,
      'sistema',
      'Reserva confirmada',
      (select nome from public.espacos_comuns where id = NEW.espaco_id) ||
      ' · ' || to_char(NEW.data_inicio, 'DD/MM/YYYY HH24:MI') || ' - ' || to_char(NEW.data_fim, 'HH24:MI'),
      'reserva',
      NEW.id,
      jsonb_build_object('espaco_id', NEW.espaco_id, 'data_inicio', NEW.data_inicio, 'data_fim', NEW.data_fim);

    -- Notificar admins
    perform public.notificar_admins(
      NEW.tenant_id,
      'sistema',
      'Nova reserva: ' || (select nome from public.espacos_comuns where id = NEW.espaco_id),
      'Por ' || (select email from auth.users where id = NEW.user_id),
      'reserva',
      NEW.id,
      jsonb_build_object('espaco_id', NEW.espaco_id, 'user_id', NEW.user_id)
    );
  elsif TG_OP = 'UPDATE' and NEW.estado = 'cancelada' and OLD.estado != 'cancelada' then
    insert into public.notificacoes (
      tenant_id, user_id, tipo, titulo, corpo,
      entidade_tipo, entidade_id, metadata
    )
    select
      NEW.tenant_id,
      NEW.user_id,
      'sistema',
      'Reserva cancelada',
      (select nome from public.espacos_comuns where id = NEW.espaco_id) ||
      ' · ' || to_char(NEW.data_inicio, 'DD/MM/YYYY HH24:MI'),
      'reserva',
      NEW.id,
      jsonb_build_object('espaco_id', NEW.espaco_id, 'data_inicio', NEW.data_inicio);
  end if;

  return NEW;
end;
$$;

create trigger reserva_notificar
  after insert or update on public.reservas
  for each row
  execute function public.trigger_reserva_notificar();
