-- 013_automation.sql
-- Tablas para automatización: alertas programadas, historial y reportes

CREATE TABLE IF NOT EXISTS alert_rules (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  description TEXT,
  entity TEXT NOT NULL CHECK (entity IN ('inventory', 'sales', 'profitability', 'price', 'ppc')),
  condition_type TEXT NOT NULL CHECK (condition_type IN ('low_stock', 'out_of_stock', 'overstock', 'low_margin', 'sales_drop', 'price_change', 'roi_below', 'ppc_overbudget')),
  threshold NUMERIC,
  time_window TEXT CHECK (time_window IN ('1h', '24h', '7d', '30d')),
  comparison TEXT CHECK (comparison IN ('lt', 'gt', 'eq', 'lte', 'gte')),
  channel TEXT NOT NULL DEFAULT 'in_app' CHECK (channel IN ('in_app', 'email', 'both')),
  enabled BOOLEAN NOT NULL DEFAULT true,
  last_triggered_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_alert_rules_user ON alert_rules(user_id);
CREATE INDEX IF NOT EXISTS idx_alert_rules_enabled ON alert_rules(enabled);

CREATE TABLE IF NOT EXISTS alert_history (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  rule_id UUID REFERENCES alert_rules(id) ON DELETE SET NULL,
  rule_name TEXT NOT NULL,
  entity TEXT NOT NULL,
  condition_type TEXT NOT NULL,
  severity TEXT NOT NULL DEFAULT 'warning' CHECK (severity IN ('critical', 'warning', 'info')),
  title TEXT NOT NULL,
  message TEXT NOT NULL,
  metadata JSONB DEFAULT '{}'::jsonb,
  read BOOLEAN NOT NULL DEFAULT false,
  channel_sent TEXT[] DEFAULT '{}',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_alert_history_user ON alert_history(user_id);
CREATE INDEX IF NOT EXISTS idx_alert_history_created ON alert_history(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_alert_history_read ON alert_history(user_id, read);

CREATE TABLE IF NOT EXISTS scheduled_reports (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  template TEXT NOT NULL CHECK (template IN ('profitability', 'inventory', 'sales-summary', 'roi-ranking')),
  frequency TEXT NOT NULL CHECK (frequency IN ('daily', 'weekly', 'monthly')),
  day_of_week INTEGER CHECK (day_of_week BETWEEN 0 AND 6),
  day_of_month INTEGER CHECK (day_of_month BETWEEN 1 AND 31),
  time TIME NOT NULL DEFAULT '08:00',
  channel TEXT NOT NULL DEFAULT 'email' CHECK (channel IN ('email', 'in_app', 'both')),
  recipients TEXT[] DEFAULT '{}',
  format TEXT NOT NULL DEFAULT 'pdf' CHECK (format IN ('pdf', 'excel', 'both')),
  enabled BOOLEAN NOT NULL DEFAULT true,
  last_sent_at TIMESTAMPTZ,
  next_run_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_scheduled_reports_user ON scheduled_reports(user_id);
CREATE INDEX IF NOT EXISTS idx_scheduled_reports_next_run ON scheduled_reports(next_run_at) WHERE enabled = true;

ALTER TABLE alert_rules ENABLE ROW LEVEL SECURITY;
ALTER TABLE alert_history ENABLE ROW LEVEL SECURITY;
ALTER TABLE scheduled_reports ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users manage own alert rules"
  ON alert_rules FOR ALL
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

CREATE POLICY "Users see own alert history"
  ON alert_history FOR ALL
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

CREATE POLICY "Users manage own scheduled reports"
  ON scheduled_reports FOR ALL
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

CREATE TRIGGER set_updated_at_alert_rules
  BEFORE UPDATE ON alert_rules
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER set_updated_at_scheduled_reports
  BEFORE UPDATE ON scheduled_reports
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
