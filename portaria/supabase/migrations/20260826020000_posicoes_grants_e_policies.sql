-- Menor privilégio nas tabelas de posições de imputação.
--
-- ====================================================================
-- O QUE ESTAVA POR APERTAR
-- ====================================================================
-- As tabelas criadas em 20260826000000 ficaram com a postura por omissão do
-- Supabase, medida em produção antes de escrever isto:
--
--   anon           DELETE, INSERT, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE
--   authenticated  DELETE, INSERT, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE
--   política       FOR ALL, target PUBLIC
--
-- A documentação actual do Supabase confirma as duas peças: «Grants determine
-- which Postgres roles (anon, authenticated, service_role) can reach a given
-- table over the Data API», e por omissão as tabelas novas em `public` são
-- concedidas a `anon`, `authenticated` e `service_role`. Grants e RLS são
-- camadas distintas — uma não substitui a outra.
--
-- Não havia porta aberta: a RLS estava activa e nenhuma política deixava passar
-- um `anon`, que nunca satisfaz `is_tenant_admin`. O que faltava era a segunda
-- camada. Se a RLS caísse por acidente numa migração futura, os grants sozinhos
-- permitiriam a `anon` ler e escrever — que é precisamente o cenário que a
-- documentação assinala como perigoso.
--
-- ====================================================================
-- O ESTADO PRETENDIDO
-- ====================================================================
--   anon           nada
--   authenticated  SELECT, e mais nada
--   service_role   inalterado — é o caminho servidor/migrações
--   política       FOR SELECT, TO authenticated, USING is_tenant_admin
--
-- Auditado antes de decidir: a aplicação lê estas tabelas num único sítio, o
-- `select` da rota do relatório do fornecedor, e não escreve em lado nenhum.
-- Não existe writer legítimo da aplicação, pelo que `authenticated` não leva
-- INSERT, UPDATE, DELETE, TRUNCATE, TRIGGER nem REFERENCES. As escrituras são
-- feitas por migração, pelo `service_role`, que mantém os seus privilégios.
--
-- Se um dia aparecer um writer, a regra é conceder a operação exacta e criar a
-- política própria dessa operação — não alargar de volta para `FOR ALL`.
--
-- ====================================================================
-- ÂMBITO
-- ====================================================================
-- Só estas duas tabelas. As restantes 60 do projecto têm a mesma postura por
-- omissão; endurecê-las é trabalho próprio, com o seu próprio teste de
-- regressão, e não entra por arrasto numa migração de outro assunto.
--
-- Nada aqui toca na configuração global da Data API.
--
-- Idempotente: `revoke` e `grant` fixam o estado final, `alter table ... enable`
-- não falha se já estiver activo, e cada política é largada pelo nome antes de
-- ser criada.

-- --------------------------------------------------------------------
-- 1. GRANTS
-- --------------------------------------------------------------------

revoke all on table public.imputacoes_posicoes from anon;
revoke all on table public.imputacoes_posicoes from authenticated;
revoke all on table public.imputacoes_posicoes_evidencias from anon;
revoke all on table public.imputacoes_posicoes_evidencias from authenticated;

grant select on table public.imputacoes_posicoes to authenticated;
grant select on table public.imputacoes_posicoes_evidencias to authenticated;

-- --------------------------------------------------------------------
-- 2. RLS — continua activa
-- --------------------------------------------------------------------

alter table public.imputacoes_posicoes enable row level security;
alter table public.imputacoes_posicoes_evidencias enable row level security;

-- --------------------------------------------------------------------
-- 3. POLÍTICAS — explícitas por operação e por papel
-- --------------------------------------------------------------------
-- `TO authenticated` não é decoração: a documentação recomenda-o em todas as
-- políticas, e tem efeito prático — a avaliação pára no papel antes de correr o
-- `USING` para um `anon`.
--
-- `FOR SELECT` não precisa de `WITH CHECK`: não há linha nova para validar.

drop policy if exists "admins manage imputacoes posicoes" on public.imputacoes_posicoes;
drop policy if exists "tenant admins read imputacoes posicoes" on public.imputacoes_posicoes;
create policy "tenant admins read imputacoes posicoes"
  on public.imputacoes_posicoes
  for select
  to authenticated
  using (public.is_tenant_admin(tenant_id));

drop policy if exists "admins manage imputacoes posicoes evidencias" on public.imputacoes_posicoes_evidencias;
drop policy if exists "tenant admins read imputacoes posicoes evidencias" on public.imputacoes_posicoes_evidencias;
create policy "tenant admins read imputacoes posicoes evidencias"
  on public.imputacoes_posicoes_evidencias
  for select
  to authenticated
  using (public.is_tenant_admin(tenant_id));
