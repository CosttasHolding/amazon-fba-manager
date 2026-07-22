-- 015_reports_bucket.sql
-- Storage bucket para reportes programados

INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES ('reportes', 'reportes', true, 52428800, ARRAY['application/pdf', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet', 'text/csv'])
ON CONFLICT (id) DO NOTHING;

CREATE POLICY "Users manage their own report files"
  ON storage.objects FOR ALL
  USING (bucket_id = 'reportes' AND auth.uid()::text = (storage.foldername(name))[1])
  WITH CHECK (bucket_id = 'reportes' AND auth.uid()::text = (storage.foldername(name))[1]);

CREATE POLICY "Public read report files"
  ON storage.objects FOR SELECT
  USING (bucket_id = 'reportes');
