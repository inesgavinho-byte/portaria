-- 0033_admins_move_documentos_para_arquivo_confidencial.sql
--
-- O Storage exige SELECT e UPDATE no objeto de origem para operações move.
-- Esta política não altera os direitos dos condóminos: apenas permite a admins
-- mover ficheiros que já pertencem ao seu próprio tenant para o bucket privado.

create policy "admins move tenant documentos"
  on storage.objects for update
  using (
    bucket_id = 'documentos'
    and public.is_tenant_admin((storage.foldername(name))[1]::uuid)
  )
  with check (
    bucket_id = 'documentos'
    and public.is_tenant_admin((storage.foldername(name))[1]::uuid)
  );
