-- ============================================================
-- REPAIR 005: Triggers, indexes, schema cleanup
-- ============================================================

-- 1. updated_at trigger for user_settings (was missing)
-- Reuses existing update_updated_at() from 001_init.sql
DROP TRIGGER IF EXISTS update_user_settings_updated_at ON user_settings;
CREATE TRIGGER update_user_settings_updated_at
  BEFORE UPDATE ON user_settings
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at();

-- 2. Composite indexes for frequently filtered queries
CREATE INDEX IF NOT EXISTS idx_sales_user_date ON sales(user_id, sale_date DESC);
CREATE INDEX IF NOT EXISTS idx_sales_user_product ON sales(user_id, product_id);
CREATE INDEX IF NOT EXISTS idx_expenses_user_date ON expenses(user_id, expense_date DESC);
CREATE INDEX IF NOT EXISTS idx_expenses_user_category ON expenses(user_id, category);
CREATE INDEX IF NOT EXISTS idx_returns_user_date ON returns(user_id, return_date DESC);
CREATE INDEX IF NOT EXISTS idx_reimbursements_user_status ON reimbursements(user_id, status);
CREATE INDEX IF NOT EXISTS idx_ppc_campaigns_user_status ON ppc_campaigns(user_id, status);
CREATE INDEX IF NOT EXISTS idx_amazon_payouts_user_date ON amazon_payouts(user_id, payout_period_start DESC);
CREATE INDEX IF NOT EXISTS idx_fba_shipments_user_status ON fba_shipments(user_id, status);
CREATE INDEX IF NOT EXISTS idx_product_research_user ON product_research(user_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_purchase_orders_user_status ON purchase_orders(user_id, status);

-- 3. Index for inventory lookups
CREATE INDEX IF NOT EXISTS idx_inventory_reorder ON inventory(stock_available, reorder_point) WHERE stock_available <= reorder_point;
