CREATE TABLE IF NOT EXISTS sp_api_webhook_subscriptions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  connection_id UUID NOT NULL REFERENCES sp_api_connections(id) ON DELETE CASCADE,
  notification_type TEXT NOT NULL CHECK (notification_type IN (
    'ORDER_STATUS_CHANGED',
    'INVENTORY_EVENT',
    'FULFILLMENT_ORDER_STATUS_CHANGED',
    'FEES_INVENTORY_HEALTH_CHANGED',
    'ANY_OFFER_CHANGED',
    'PRICING_HEALTH_CHANGED',
    'PRODUCT_TYPE_CHANGED',
    'REPORT_PROCESSING_FINISHED'
  )),
  amazon_destination_id TEXT,
  amazon_subscription_id TEXT,
  status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'active', 'paused', 'error')),
  error_message TEXT,
  last_received_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

CREATE UNIQUE INDEX IF NOT EXISTS idx_webhook_sub_conn_type ON sp_api_webhook_subscriptions(connection_id, notification_type);
CREATE INDEX IF NOT EXISTS idx_webhook_sub_user ON sp_api_webhook_subscriptions(user_id);
CREATE INDEX IF NOT EXISTS idx_webhook_sub_status ON sp_api_webhook_subscriptions(status);

CREATE TABLE IF NOT EXISTS sp_api_webhook_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  connection_id UUID REFERENCES sp_api_connections(id) ON DELETE SET NULL,
  subscription_id UUID REFERENCES sp_api_webhook_subscriptions(id) ON DELETE SET NULL,
  notification_type TEXT NOT NULL,
  amazon_notification_id TEXT,
  payload JSONB,
  status TEXT DEFAULT 'received' CHECK (status IN ('received', 'processing', 'processed', 'failed')),
  error_message TEXT,
  processing_time_ms INTEGER,
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_webhook_logs_user ON sp_api_webhook_logs(user_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_webhook_logs_type ON sp_api_webhook_logs(notification_type);
CREATE INDEX IF NOT EXISTS idx_webhook_logs_status ON sp_api_webhook_logs(status);

ALTER TABLE sp_api_webhook_subscriptions ENABLE ROW LEVEL SECURITY;
ALTER TABLE sp_api_webhook_logs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own webhook subscriptions" ON sp_api_webhook_subscriptions
  FOR SELECT USING (user_id = auth.uid());
CREATE POLICY "Users can insert own webhook subscriptions" ON sp_api_webhook_subscriptions
  FOR INSERT WITH CHECK (user_id = auth.uid());
CREATE POLICY "Users can update own webhook subscriptions" ON sp_api_webhook_subscriptions
  FOR UPDATE USING (user_id = auth.uid());
CREATE POLICY "Users can delete own webhook subscriptions" ON sp_api_webhook_subscriptions
  FOR DELETE USING (user_id = auth.uid());

CREATE POLICY "Users can view own webhook logs" ON sp_api_webhook_logs
  FOR SELECT USING (user_id = auth.uid());
CREATE POLICY "Service role can insert webhook logs" ON sp_api_webhook_logs
  FOR INSERT WITH CHECK (true);

DROP TRIGGER IF EXISTS update_sp_api_webhook_subscriptions_updated_at ON sp_api_webhook_subscriptions;
CREATE TRIGGER update_sp_api_webhook_subscriptions_updated_at
  BEFORE UPDATE ON sp_api_webhook_subscriptions
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();
