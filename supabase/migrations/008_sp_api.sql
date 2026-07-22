-- ============================================================
-- 008_sp_api.sql - SP-API INTEGRATION
-- ============================================================

CREATE TABLE IF NOT EXISTS sp_api_connections(
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  marketplace TEXT NOT NULL,
  seller_id TEXT NOT NULL,
  refresh_token TEXT NOT NULL,
  access_token TEXT,
  token_expires_at TIMESTAMPTZ,
  status TEXT DEFAULT 'active' CHECK(status IN('active','expired','revoked')),
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

CREATE UNIQUE INDEX IF NOT EXISTS idx_sp_api_user_marketplace ON sp_api_connections(user_id, marketplace);
CREATE INDEX IF NOT EXISTS idx_sp_api_connections_status ON sp_api_connections(status);

CREATE TABLE IF NOT EXISTS sync_logs(
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  connection_id UUID REFERENCES sp_api_connections(id) ON DELETE SET NULL,
  sync_type TEXT NOT NULL CHECK(sync_type IN('products','orders','inventory','fees','returns','payouts')),
  status TEXT DEFAULT 'pending' CHECK(status IN('pending','running','completed','failed')),
  items_processed INTEGER DEFAULT 0,
  items_failed INTEGER DEFAULT 0,
  error_message TEXT,
  started_at TIMESTAMPTZ,
  completed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_sync_logs_user ON sync_logs(user_id, created_at DESC);

DROP TRIGGER IF EXISTS update_sp_api_connections_updated_at ON sp_api_connections;
CREATE TRIGGER update_sp_api_connections_updated_at
  BEFORE UPDATE ON sp_api_connections
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at();
