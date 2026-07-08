-- =====================================================================
-- Migration: 0003_estabilizacao.sql
-- Ronda de estabilização — correções de segurança em RLS
--
-- IMPORTANTE: Executar no SQL Editor do Supabase DEPOIS da 0001 e 0002.
-- É segura de correr quer a 0002 já tenha sido aplicada ou não
-- (usa drop policy if exists antes de recriar).
--
-- Corrige:
--   1. CRÍTICO: as páginas públicas devolviam 404 a visitantes anónimos
--      porque a tabela tenants não tinha política SELECT para anon.
--   2. ocorrencia_eventos: um admin podia inserir eventos com tenant_id
--      do seu tenant mas ocorrencia_id de OUTRO tenant (injeção de
--      eventos falsos na timeline alheia).
--   3. ocorrencia_fotografias: mesmo padrão no insert.
--   4. Storage ocorrencias: o download por criador não validava que a
--      pasta do tenant no path corresponde ao tenant da ocorrência.
-- =====================================================================


-- ----------------------------------------------------------------------
-- 1. TENANTS — leitura pública
--
-- Os dados de tenants alimentam as páginas públicas de cada prédio
-- (nome, morada, tema) e a resolução de tenant por slug. São dados que
-- cada site público já mostra a qualquer visitante.
--
-- Trade-off consciente: com esta política, qualquer cliente com a anon
-- key pode enumerar os tenants existentes. Se no futuro a tabela ganhar
-- colunas sensíveis (faturação, contactos privados), estas devem ir
-- para uma tabela separada — NUNCA para tenants.
-- ----------------------------------------------------------------------
drop policy if exists "users see their tenants" on public.tenants;

create policy "anyone reads tenants"
  on public.tenants for select
  using (true);


-- ----------------------------------------------------------------------
-- 2. OCORRENCIA_EVENTOS — admin só regista eventos em ocorrências
--    que pertencem ao tenant declarado
-- ----------------------------------------------------------------------
drop policy if exists "admins log eventos" on public.ocorrencia_eventos;

create policy "admins log eventos"
  on public.ocorrencia_eventos for insert
  with check (
    autor = auth.uid()
    and public.is_tenant_admin(tenant_id)
    and exists (
      select 1 from public.ocorrencias o
      where o.id = ocorrencia_id
        and o.tenant_id = ocorrencia_eventos.tenant_id
    )
  );


-- ----------------------------------------------------------------------
-- 3. OCORRENCIA_FOTOGRAFIAS — coerência tenant↔ocorrência no insert,
--    para criador e para admin
-- ----------------------------------------------------------------------
drop policy if exists "members add fotografias" on public.ocorrencia_fotografias;

create policy "members add fotografias"
  on public.ocorrencia_fotografias for insert
  with check (
    criado_por = auth.uid()
    and exists (
      select 1 from public.ocorrencias o
      where o.id = ocorrencia_id
        and o.tenant_id = ocorrencia_fotografias.tenant_id
        and (
          o.criado_por = auth.uid()
          or public.is_tenant_admin(o.tenant_id)
        )
    )
  );


-- ----------------------------------------------------------------------
-- 4. STORAGE — download por criador exige que a pasta do tenant no
--    path corresponda ao tenant da ocorrência
-- ----------------------------------------------------------------------
drop policy if exists "ocorrencias fotos download" on storage.objects;

create policy "ocorrencias fotos download"
  on storage.objects for select
  using (
    bucket_id = 'ocorrencias'
    and (
      public.is_tenant_admin((storage.foldername(name))[1]::uuid)
      or exists (
        select 1 from public.ocorrencias o
        where o.id = (storage.foldername(name))[2]::uuid
          and o.criado_por = auth.uid()
          and o.tenant_id = (storage.foldername(name))[1]::uuid
      )
    )
  );
