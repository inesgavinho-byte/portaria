-- 0034_corrigir_movimento_para_documentos_admin.sql
--
-- Corrige a política de UPDATE usada pelo Storage.move entre buckets. Em uma
-- migração entre buckets, USING avalia o objeto de origem e WITH CHECK avalia
-- o objeto de destino; por isso o destino documentos-admin deve ser permitido.

 drop policy if exists "admins move tenant documentos" on storage.objects;

create policy "admins move tenant documentos to arquivo confidencial"
  on storage.objects for update
  using (
    bucket_id = 'documentos'
    and public.is_tenant_admin((storage.foldername(name))[1]::uuid)
  )
  with check (
    (
      bucket_id = 'documentos-admin'
      and public.is_tenant_admin((storage.foldername(name))[1]::uuid)
    )
    or (
      bucket_id = 'documentos'
      and public.is_tenant_admin((storage.foldername(name))[1]::uuid)
    )
  );
