-- Migracion 017: Tabla notifications para persistir alertas del sistema
-- Permite marcar como enviadas/leidas, evitar duplicados, historial real

CREATE TABLE IF NOT EXISTS notifications (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  type TEXT NOT NULL CHECK (type IN ('out_of_stock', 'low_stock', 'overstock', 'low_margin', 'reorder_point', 'po_created', 'custom', 'import_complete', 'import_error', 'system')),
  priority TEXT NOT NULL CHECK (priority IN ('critical', 'warning', 'info', 'success')),
  title TEXT NOT NULL,
  message TEXT NOT NULL,
  product_id UUID,
  product_name TEXT,
  product_sku TEXT,
  read BOOLEAN DEFAULT false,
  sent_external BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- RLS
ALTER TABLE notifications ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own notifications"
  ON notifications FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own notifications"
  ON notifications FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own notifications"
  ON notifications FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own notifications"
  ON notifications FOR DELETE
  USING (auth.uid() = user_id);

-- Service role can do everything (for automation endpoints)
CREATE POLICY "Service role full access"
  ON notifications FOR ALL
  USING (true)
  WITH CHECK (true);

-- Indexes
CREATE INDEX idx_notifications_user_read_created
  ON notifications (user_id, read, created_at DESC);

CREATE INDEX idx_notifications_external_pending
  ON notifications (sent_external, created_at DESC)
  WHERE sent_external = false;

-- Trigger updated_at
CREATE OR REPLACE FUNCTION update_notifications_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER notifications_updated_at
  BEFORE UPDATE ON notifications
  FOR EACH ROW
  EXECUTE FUNCTION update_notifications_updated_at();
