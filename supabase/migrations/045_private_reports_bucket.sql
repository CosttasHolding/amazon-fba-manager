-- Los objetos históricos guardados en paths legacy no cumplen el layout
-- org_id/user_id y quedan inaccesibles hasta regenerar los reportes.
-- No se reabre acceso público para recuperarlos.

INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'reportes',
  'reportes',
  false,
  52428800,
  ARRAY['application/pdf', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet', 'text/csv']
)
ON CONFLICT (id) DO UPDATE SET public = false;

DROP POLICY IF EXISTS "Public read report files" ON storage.objects;
DROP POLICY IF EXISTS "Users manage their own report files" ON storage.objects;
DROP POLICY IF EXISTS "Members manage own report files" ON storage.objects;

CREATE POLICY "Members manage own report files"
  ON storage.objects FOR ALL
  TO authenticated
  USING (
    bucket_id = 'reportes'
    AND (storage.foldername(name))[2] = auth.uid()::text
    AND EXISTS (
      SELECT 1
      FROM public.org_members AS membership
      WHERE membership.org_id::text = (storage.foldername(name))[1]
        AND membership.user_id = auth.uid()
        AND membership.status = 'active'
    )
  )
  WITH CHECK (
    bucket_id = 'reportes'
    AND (storage.foldername(name))[2] = auth.uid()::text
    AND EXISTS (
      SELECT 1
      FROM public.org_members AS membership
      WHERE membership.org_id::text = (storage.foldername(name))[1]
        AND membership.user_id = auth.uid()
        AND membership.status = 'active'
    )
  );
