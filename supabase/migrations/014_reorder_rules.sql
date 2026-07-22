-- 014_reorder_rules.sql
-- Tablas para reglas de reorden automatico (FASE 4)

CREATE TABLE IF NOT EXISTS reorder_rules (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  product_id UUID NOT NULL REFERENCES products(id) ON DELETE CASCADE,
  supplier_id UUID REFERENCES suppliers(id) ON DELETE SET NULL,
  min_stock INTEGER NOT NULL DEFAULT 10,
  max_stock INTEGER NOT NULL DEFAULT 100,
  auto_po BOOLEAN NOT NULL DEFAULT false,
  lead_time_days INTEGER NOT NULL DEFAULT 30,
  safety_stock_days INTEGER NOT NULL DEFAULT 14,
  notes TEXT,
  enabled BOOLEAN NOT NULL DEFAULT true,
  last_evaluated_at TIMESTAMPTZ,
  last_po_generated_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_reorder_rules_user ON reorder_rules(user_id);
CREATE INDEX IF NOT EXISTS idx_reorder_rules_product ON reorder_rules(product_id);
CREATE INDEX IF NOT EXISTS idx_reorder_rules_enabled ON reorder_rules(enabled);

ALTER TABLE reorder_rules ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users manage own reorder rules"
  ON reorder_rules FOR ALL
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

CREATE TRIGGER set_updated_at_reorder_rules
  BEFORE UPDATE ON reorder_rules
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
