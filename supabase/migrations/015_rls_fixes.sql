-- ============================================================
-- 015_rls_fixes.sql - Enable RLS on sp_api_connections & sync_logs
-- Fix RLS on governance tables to respect user_id
-- ============================================================

-- 1. sp_api_connections: ENABLE RLS + user_id policies
ALTER TABLE sp_api_connections ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own SP-API connections"
  ON sp_api_connections FOR SELECT
  USING (user_id = auth.uid());

CREATE POLICY "Users can insert own SP-API connections"
  ON sp_api_connections FOR INSERT
  WITH CHECK (user_id = auth.uid());

CREATE POLICY "Users can update own SP-API connections"
  ON sp_api_connections FOR UPDATE
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

CREATE POLICY "Users can delete own SP-API connections"
  ON sp_api_connections FOR DELETE
  USING (user_id = auth.uid());

-- 2. sync_logs: ENABLE RLS + user_id policies
ALTER TABLE sync_logs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own sync logs"
  ON sync_logs FOR SELECT
  USING (user_id = auth.uid());

CREATE POLICY "Users can insert own sync logs"
  ON sync_logs FOR INSERT
  WITH CHECK (user_id = auth.uid());

CREATE POLICY "Users can delete own sync logs"
  ON sync_logs FOR DELETE
  USING (user_id = auth.uid());

-- 3. Sync log trigger for updated_at
DROP TRIGGER IF EXISTS update_sync_logs_updated_at ON sync_logs;
CREATE TRIGGER update_sync_logs_updated_at
  BEFORE UPDATE ON sync_logs
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at();
