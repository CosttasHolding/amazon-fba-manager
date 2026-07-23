-- 027: Add avatar_url to user_settings + avatars storage bucket

-- 1. Column
ALTER TABLE user_settings ADD COLUMN IF NOT EXISTS avatar_url TEXT;

-- 2. Storage bucket for avatars
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES ('avatars', 'avatars', true, 2097152, ARRAY['image/png', 'image/jpeg', 'image/webp'])
ON CONFLICT (id) DO NOTHING;

-- 3. RLS: users can manage their own avatar
DROP POLICY IF EXISTS "avatar_select" ON storage.objects;
CREATE POLICY "avatar_select" ON storage.objects
  FOR SELECT USING (bucket_id = 'avatars');

DROP POLICY IF EXISTS "avatar_insert" ON storage.objects;
CREATE POLICY "avatar_insert" ON storage.objects
  FOR INSERT WITH CHECK (bucket_id = 'avatars' AND auth.uid()::text = (storage.foldername(name))[1]);

DROP POLICY IF EXISTS "avatar_delete" ON storage.objects;
CREATE POLICY "avatar_delete" ON storage.objects
  FOR DELETE USING (bucket_id = 'avatars' AND auth.uid()::text = (storage.foldername(name))[1]);
