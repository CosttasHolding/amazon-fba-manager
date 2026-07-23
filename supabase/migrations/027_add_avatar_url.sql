-- 027: Add missing columns to user_settings + avatar

-- 1. Profile columns
ALTER TABLE user_settings ADD COLUMN IF NOT EXISTS full_name TEXT;
ALTER TABLE user_settings ADD COLUMN IF NOT EXISTS company TEXT;
ALTER TABLE user_settings ADD COLUMN IF NOT EXISTS country TEXT;
ALTER TABLE user_settings ADD COLUMN IF NOT EXISTS avatar_url TEXT;

-- 2. FBA defaults columns
ALTER TABLE user_settings ADD COLUMN IF NOT EXISTS marketplace TEXT DEFAULT 'US';
ALTER TABLE user_settings ADD COLUMN IF NOT EXISTS default_fba_fee DECIMAL(10,2) DEFAULT 3.00;
ALTER TABLE user_settings ADD COLUMN IF NOT EXISTS default_referral_fee DECIMAL(5,2) DEFAULT 15.00;
ALTER TABLE user_settings ADD COLUMN IF NOT EXISTS default_shipping_cost DECIMAL(10,2) DEFAULT 0;
ALTER TABLE user_settings ADD COLUMN IF NOT EXISTS default_storage_cost DECIMAL(10,2) DEFAULT 0;

-- 3. Calculations columns
ALTER TABLE user_settings ADD COLUMN IF NOT EXISTS target_roi DECIMAL(10,2) DEFAULT 30.00;
ALTER TABLE user_settings ADD COLUMN IF NOT EXISTS tax_rate DECIMAL(5,2) DEFAULT 0;

-- 4. Storage bucket for avatars
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES ('avatars', 'avatars', true, 2097152, ARRAY['image/png', 'image/jpeg', 'image/webp'])
ON CONFLICT (id) DO NOTHING;

-- 5. RLS: users can manage their own avatar
DROP POLICY IF EXISTS "avatar_select" ON storage.objects;
CREATE POLICY "avatar_select" ON storage.objects
  FOR SELECT USING (bucket_id = 'avatars');

DROP POLICY IF EXISTS "avatar_insert" ON storage.objects;
CREATE POLICY "avatar_insert" ON storage.objects
  FOR INSERT WITH CHECK (bucket_id = 'avatars' AND auth.uid()::text = (storage.foldername(name))[1]);

DROP POLICY IF EXISTS "avatar_delete" ON storage.objects;
CREATE POLICY "avatar_delete" ON storage.objects
  FOR DELETE USING (bucket_id = 'avatars' AND auth.uid()::text = (storage.foldername(name))[1]);
