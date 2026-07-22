-- 021_security_fixes.sql
-- Critical security + integrity fixes

-- 1. Create missing update_updated_at_column() function (referenced by 012-014 but never defined)
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- 2. Add missing updated_at columns + triggers
ALTER TABLE stock_movements ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ DEFAULT now();
ALTER TABLE sales ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ DEFAULT now();
ALTER TABLE fba_shipment_items ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ DEFAULT now();
ALTER TABLE company_members ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ DEFAULT now();
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ DEFAULT now();
ALTER TABLE push_subscriptions ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ DEFAULT now();
ALTER TABLE saved_calculations ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ DEFAULT now();

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgname = 'trg_stock_movements_updated') THEN
    CREATE TRIGGER trg_stock_movements_updated BEFORE UPDATE ON stock_movements
      FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgname = 'trg_sales_updated') THEN
    CREATE TRIGGER trg_sales_updated BEFORE UPDATE ON sales
      FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgname = 'trg_shipment_items_updated') THEN
    CREATE TRIGGER trg_shipment_items_updated BEFORE UPDATE ON fba_shipment_items
      FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgname = 'trg_company_members_updated') THEN
    CREATE TRIGGER trg_company_members_updated BEFORE UPDATE ON company_members
      FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgname = 'trg_profiles_updated') THEN
    CREATE TRIGGER trg_profiles_updated BEFORE UPDATE ON profiles
      FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgname = 'trg_push_subscriptions_updated') THEN
    CREATE TRIGGER trg_push_subscriptions_updated BEFORE UPDATE ON push_subscriptions
      FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgname = 'trg_saved_calculations_updated') THEN
    CREATE TRIGGER trg_saved_calculations_updated BEFORE UPDATE ON saved_calculations
      FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
  END IF;
END $$;

-- 3. Fix foreign keys: ON DELETE behavior
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'purchase_orders_supplier_id_fkey') THEN
    ALTER TABLE purchase_orders
      ADD CONSTRAINT purchase_orders_supplier_id_fkey
        FOREIGN KEY (supplier_id) REFERENCES suppliers(id) ON DELETE SET NULL;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'purchase_orders_product_id_fkey') THEN
    ALTER TABLE purchase_orders
      ADD CONSTRAINT purchase_orders_product_id_fkey
        FOREIGN KEY (product_id) REFERENCES products(id) ON DELETE SET NULL;
  END IF;
END $$;

-- 4. Data integrity constraints
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'chk_reorder_min_lt_max') THEN
    ALTER TABLE reorder_rules ADD CONSTRAINT chk_reorder_min_lt_max CHECK (min_stock < max_stock);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'chk_ownership_pct_range') THEN
    ALTER TABLE members ADD CONSTRAINT chk_ownership_pct_range CHECK (ownership_pct >= 0 AND ownership_pct <= 100);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'chk_payout_period_valid') THEN
    ALTER TABLE amazon_payouts ADD CONSTRAINT chk_payout_period_valid CHECK (payout_period_end >= payout_period_start);
  END IF;
END $$;

-- 5. Missing indexes for performance
CREATE INDEX IF NOT EXISTS idx_mov_user ON stock_movements(user_id);
CREATE INDEX IF NOT EXISTS idx_company_members_user ON company_members(user_id);
CREATE INDEX IF NOT EXISTS idx_tasks_user_status ON tasks(user_id, status);
CREATE INDEX IF NOT EXISTS idx_tasks_due ON tasks(due_date)
  WHERE status != 'completed' AND due_date IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_notifications_user_created
  ON notifications(user_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_audit_log_user_created
  ON audit_log(user_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_comments_entity_created
  ON comments(entity, entity_id, created_at);

-- 6. Rate limits table for serverless-safe rate limiting
CREATE TABLE IF NOT EXISTS rate_limits (
  identifier TEXT PRIMARY KEY,
  count INT NOT NULL DEFAULT 1,
  reset_at TIMESTAMPTZ NOT NULL
);

-- 7. Fix products_with_inventory view to filter by current user (security_invoker)
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_views WHERE viewname = 'products_with_inventory') THEN
    DROP VIEW IF EXISTS products_with_inventory;
  END IF;
END $$;

CREATE OR REPLACE VIEW products_with_inventory
  WITH (security_invoker = true) AS
SELECT p.*,
  COALESCE(i.stock_available, 0) AS stock_available,
  COALESCE(i.stock_inbound, 0) AS stock_inbound,
  COALESCE(i.stock_reserved, 0) AS stock_reserved,
  COALESCE(i.stock_warehouse, 0) AS stock_warehouse,
  COALESCE(i.reorder_point, 10) AS reorder_point,
  COALESCE(i.max_stock, 500) AS max_stock,
  CASE
    WHEN COALESCE(i.stock_available, 0) = 0 THEN 'out_of_stock'
    WHEN COALESCE(i.stock_available, 0) <= COALESCE(i.reorder_point, 10) THEN 'low_stock'
    WHEN COALESCE(i.stock_available, 0) >= COALESCE(i.max_stock, 500) THEN 'overstock'
    ELSE 'normal'
  END AS stock_status,
  COALESCE(s.units_last_30d, 0) AS sales_velocity_30d,
  COALESCE(s.revenue_last_30d, 0) AS revenue_last_30d,
  CASE
    WHEN COALESCE(s.units_last_30d, 0) > 0
    THEN ROUND(COALESCE(i.stock_available, 0)::DECIMAL / (s.units_last_30d::DECIMAL / 30), 0)
    ELSE NULL
  END AS days_of_stock
FROM products p
LEFT JOIN inventory i ON i.product_id = p.id
LEFT JOIN (
  SELECT product_id, SUM(units_sold) AS units_last_30d, SUM(revenue) AS revenue_last_30d
  FROM sales
  WHERE sale_date >= CURRENT_DATE - INTERVAL '30 days'
  GROUP BY product_id
) s ON s.product_id = p.id;
