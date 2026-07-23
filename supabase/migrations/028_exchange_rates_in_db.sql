-- 028: Move all localStorage data to user_settings (shared across devices)

-- Exchange rates (org-level, shared)
ALTER TABLE user_settings ADD COLUMN IF NOT EXISTS rate_usd_cny DECIMAL(12,6) DEFAULT 7.2;
ALTER TABLE user_settings ADD COLUMN IF NOT EXISTS rate_usd_ars DECIMAL(12,6) DEFAULT 1200;
ALTER TABLE user_settings ADD COLUMN IF NOT EXISTS rates_updated_at TIMESTAMPTZ;

-- High contrast preference
ALTER TABLE user_settings ADD COLUMN IF NOT EXISTS high_contrast BOOLEAN DEFAULT false;

-- Current org selection (per user)
ALTER TABLE user_settings ADD COLUMN IF NOT EXISTS current_org_id UUID;
