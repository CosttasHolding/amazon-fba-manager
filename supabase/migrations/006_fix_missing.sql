-- ============================================================
-- FIX: Correccion de politicas RLS malformadas de 002_enhanced.sql
-- + Ejecucion completa de 003_finances.sql
-- Ejecutar esto en Supabase SQL Editor si 003 fallo
-- ============================================================

-- ============================================================
-- 1. FIX: Politicas RLS de 002_enhanced.sql (espacios faltantes)
-- ============================================================

CREATE POLICY IF NOT EXISTS "own_suppliers" ON suppliers FOR ALL USING(auth.uid() = user_id);
CREATE POLICY IF NOT EXISTS "own_product_suppliers" ON product_suppliers FOR ALL USING(user_id = auth.uid());
CREATE POLICY IF NOT EXISTS "own_user_settings" ON user_settings FOR ALL USING(user_id = auth.uid());
CREATE POLICY IF NOT EXISTS "own_supplier_quotes" ON supplier_quotes FOR ALL USING(user_id = auth.uid());
CREATE POLICY IF NOT EXISTS "own_saved_calculations" ON saved_calculations FOR ALL USING(user_id = auth.uid());
CREATE POLICY IF NOT EXISTS "own_research" ON product_research FOR ALL USING(user_id = auth.uid());
CREATE POLICY IF NOT EXISTS "own_po" ON purchase_orders FOR ALL USING(user_id = auth.uid());

-- ============================================================
-- 2. FIX: Triggers updated_at de 002_enhanced.sql
-- ============================================================

CREATE TRIGGER IF NOT EXISTS trg_suppliers_updated BEFORE UPDATE ON suppliers FOR EACH ROW EXECUTE FUNCTION update_updated_at();
CREATE TRIGGER IF NOT EXISTS trg_supplier_quotes_updated BEFORE UPDATE ON supplier_quotes FOR EACH ROW EXECUTE FUNCTION update_updated_at();
CREATE TRIGGER IF NOT EXISTS trg_research_updated BEFORE UPDATE ON product_research FOR EACH ROW EXECUTE FUNCTION update_updated_at();
CREATE TRIGGER IF NOT EXISTS trg_po_updated BEFORE UPDATE ON purchase_orders FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- ============================================================
-- 3. CONTENIDO COMPLETO DE 003_finances.sql
-- ============================================================

-- 3.1 EXPENSES
CREATE TABLE IF NOT EXISTS expenses(
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  product_id UUID REFERENCES products(id) ON DELETE SET NULL,
  category TEXT NOT NULL CHECK(category IN('ppc','software','va_services','samples','photography','shipping_forwarder','customs','prep_center','storage_3pl','travel','other')),
  subcategory TEXT,
  description TEXT NOT NULL,
  amount DECIMAL(10,2) NOT NULL CHECK(amount >= 0),
  currency TEXT DEFAULT 'USD',
  exchange_rate DECIMAL(10,4) DEFAULT 1,
  amount_usd DECIMAL(10,2) GENERATED ALWAYS AS(amount / NULLIF(exchange_rate,0)) STORED,
  expense_date DATE NOT NULL DEFAULT CURRENT_DATE,
  recurring BOOLEAN DEFAULT false,
  recurring_frequency TEXT CHECK(recurring_frequency IN('weekly','monthly','quarterly','yearly')),
  vendor TEXT,
  receipt_url TEXT,
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- 3.2 AMAZON_PAYOUTS
CREATE TABLE IF NOT EXISTS amazon_payouts(
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  payout_period_start DATE NOT NULL,
  payout_period_end DATE NOT NULL,
  amount DECIMAL(10,2) NOT NULL,
  currency TEXT DEFAULT 'USD',
  status TEXT CHECK(status IN('pending','transferred','failed')) DEFAULT 'pending',
  amazon_reference TEXT,
  bank_account_last4 TEXT,
  transfer_date DATE,
  marketplace TEXT DEFAULT 'US',
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- 3.3 FBA_SHIPMENTS
CREATE TABLE IF NOT EXISTS fba_shipments(
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  po_id UUID REFERENCES purchase_orders(id) ON DELETE SET NULL,
  shipment_name TEXT NOT NULL,
  shipment_id TEXT,
  amazon_reference_id TEXT,
  destination_fulfillment_center TEXT,
  destination_address TEXT,
  status TEXT CHECK(status IN('working','ready_to_ship','shipped','in_transit','delivered','checked_in','receiving','closed','cancelled')) DEFAULT 'working',
  shipping_method TEXT CHECK(shipping_method IN('small_parcel','ltl','ftl','air','sea')),
  carrier TEXT,
  tracking_number TEXT,
  box_count INTEGER DEFAULT 0,
  total_units INTEGER DEFAULT 0,
  total_weight_kg DECIMAL(10,3),
  shipping_cost DECIMAL(10,2) DEFAULT 0,
  ship_date DATE,
  estimated_arrival DATE,
  actual_arrival DATE,
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- 3.4 FBA_SHIPMENT_ITEMS
CREATE TABLE IF NOT EXISTS fba_shipment_items(
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  shipment_id UUID NOT NULL REFERENCES fba_shipments(id) ON DELETE CASCADE,
  product_id UUID NOT NULL REFERENCES products(id) ON DELETE CASCADE,
  quantity INTEGER NOT NULL CHECK(quantity > 0),
  quantity_received INTEGER DEFAULT 0,
  msKU TEXT,
  fnSKU TEXT,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- 3.5 RETURNS
CREATE TABLE IF NOT EXISTS returns(
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  product_id UUID NOT NULL REFERENCES products(id) ON DELETE CASCADE,
  order_id TEXT,
  amazon_return_id TEXT,
  quantity INTEGER NOT NULL CHECK(quantity > 0),
  return_reason TEXT CHECK(return_reason IN('defective','damaged_by_carrier','customer_damaged','different_from_description','expired_item','fraud','missing_parts','no_longer_wanted','not_as_described','ordered_wrong_item','quality_not_acceptable','arrived_late','undeliverable','unauthorized_purchase','other')),
  customer_comment TEXT,
  refund_amount DECIMAL(10,2),
  status TEXT CHECK(status IN('requested','received_at_customer','in_transit','received_at_fc','inspected','refunded','reimbursed','disposed')) DEFAULT 'requested',
  disposition TEXT CHECK(disposition IN('sellable','unsellable','pending')),
  return_date DATE,
  received_date DATE,
  inspected_date DATE,
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- 3.6 REIMBURSEMENTS
CREATE TABLE IF NOT EXISTS reimbursements(
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  product_id UUID REFERENCES products(id) ON DELETE SET NULL,
  return_id UUID REFERENCES returns(id) ON DELETE SET NULL,
  amazon_case_id TEXT,
  reimbursement_type TEXT CHECK(reimbursement_type IN('lost_inbound','damaged_inbound','lost_warehouse','damaged_warehouse','customer_return','removal_order','other')),
  quantity INTEGER NOT NULL CHECK(quantity > 0),
  amount DECIMAL(10,2) NOT NULL,
  currency TEXT DEFAULT 'USD',
  status TEXT CHECK(status IN('pending','submitted','approved','rejected','paid')) DEFAULT 'pending',
  issue_date DATE,
  submitted_date DATE,
  approved_date DATE,
  paid_date DATE,
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- 3.7 PPC_CAMPAIGNS
CREATE TABLE IF NOT EXISTS ppc_campaigns(
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  product_id UUID REFERENCES products(id) ON DELETE SET NULL,
  campaign_name TEXT NOT NULL,
  campaign_id TEXT,
  campaign_type TEXT CHECK(campaign_type IN('sp_auto','sp_manual_keyword','sp_manual_product','sb','sd')),
  marketplace TEXT DEFAULT 'US',
  status TEXT CHECK(status IN('enabled','paused','archived')) DEFAULT 'enabled',
  daily_budget DECIMAL(10,2) DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- 3.8 PPC_DAILY_METRICS
CREATE TABLE IF NOT EXISTS ppc_daily_metrics(
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  campaign_id UUID NOT NULL REFERENCES ppc_campaigns(id) ON DELETE CASCADE,
  metric_date DATE NOT NULL,
  impressions INTEGER DEFAULT 0,
  clicks INTEGER DEFAULT 0,
  spend DECIMAL(10,2) DEFAULT 0,
  sales DECIMAL(10,2) DEFAULT 0,
  orders INTEGER DEFAULT 0,
  units INTEGER DEFAULT 0,
  acos DECIMAL(5,2) GENERATED ALWAYS AS(CASE WHEN sales > 0 THEN ROUND((spend / sales) * 100, 2) ELSE 0 END) STORED,
  roas DECIMAL(5,2) GENERATED ALWAYS AS(CASE WHEN spend > 0 THEN ROUND(sales / spend, 2) ELSE 0 END) STORED,
  ctr DECIMAL(5,4) GENERATED ALWAYS AS(CASE WHEN impressions > 0 THEN ROUND(clicks::DECIMAL / impressions, 4) ELSE 0 END) STORED,
  cpc DECIMAL(10,4) GENERATED ALWAYS AS(CASE WHEN clicks > 0 THEN ROUND(spend / clicks, 4) ELSE 0 END) STORED,
  created_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(campaign_id, metric_date)
);

-- 3.9 INDEXES
CREATE INDEX IF NOT EXISTS idx_expenses_user ON expenses(user_id);
CREATE INDEX IF NOT EXISTS idx_expenses_date ON expenses(expense_date DESC);
CREATE INDEX IF NOT EXISTS idx_expenses_category ON expenses(category);
CREATE INDEX IF NOT EXISTS idx_expenses_product ON expenses(product_id);
CREATE INDEX IF NOT EXISTS idx_payouts_user ON amazon_payouts(user_id);
CREATE INDEX IF NOT EXISTS idx_payouts_period ON amazon_payouts(payout_period_start DESC);
CREATE INDEX IF NOT EXISTS idx_shipments_user ON fba_shipments(user_id);
CREATE INDEX IF NOT EXISTS idx_shipments_status ON fba_shipments(status);
CREATE INDEX IF NOT EXISTS idx_shipment_items_shipment ON fba_shipment_items(shipment_id);
CREATE INDEX IF NOT EXISTS idx_returns_user ON returns(user_id);
CREATE INDEX IF NOT EXISTS idx_returns_product ON returns(product_id);
CREATE INDEX IF NOT EXISTS idx_returns_status ON returns(status);
CREATE INDEX IF NOT EXISTS idx_reimbursements_user ON reimbursements(user_id);
CREATE INDEX IF NOT EXISTS idx_reimbursements_status ON reimbursements(status);
CREATE INDEX IF NOT EXISTS idx_ppc_campaigns_user ON ppc_campaigns(user_id);
CREATE INDEX IF NOT EXISTS idx_ppc_campaigns_product ON ppc_campaigns(product_id);
CREATE INDEX IF NOT EXISTS idx_ppc_metrics_campaign ON ppc_daily_metrics(campaign_id);
CREATE INDEX IF NOT EXISTS idx_ppc_metrics_date ON ppc_daily_metrics(metric_date DESC);

-- 3.10 RLS
ALTER TABLE expenses ENABLE ROW LEVEL SECURITY;
ALTER TABLE amazon_payouts ENABLE ROW LEVEL SECURITY;
ALTER TABLE fba_shipments ENABLE ROW LEVEL SECURITY;
ALTER TABLE fba_shipment_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE returns ENABLE ROW LEVEL SECURITY;
ALTER TABLE reimbursements ENABLE ROW LEVEL SECURITY;
ALTER TABLE ppc_campaigns ENABLE ROW LEVEL SECURITY;
ALTER TABLE ppc_daily_metrics ENABLE ROW LEVEL SECURITY;

CREATE POLICY IF NOT EXISTS "own_expenses" ON expenses FOR ALL USING(auth.uid() = user_id);
CREATE POLICY IF NOT EXISTS "own_payouts" ON amazon_payouts FOR ALL USING(auth.uid() = user_id);
CREATE POLICY IF NOT EXISTS "own_shipments" ON fba_shipments FOR ALL USING(auth.uid() = user_id);
CREATE POLICY IF NOT EXISTS "own_shipment_items" ON fba_shipment_items FOR ALL USING(shipment_id IN(SELECT id FROM fba_shipments WHERE user_id = auth.uid()));
CREATE POLICY IF NOT EXISTS "own_returns" ON returns FOR ALL USING(auth.uid() = user_id);
CREATE POLICY IF NOT EXISTS "own_reimbursements" ON reimbursements FOR ALL USING(auth.uid() = user_id);
CREATE POLICY IF NOT EXISTS "own_ppc_campaigns" ON ppc_campaigns FOR ALL USING(auth.uid() = user_id);
CREATE POLICY IF NOT EXISTS "own_ppc_metrics" ON ppc_daily_metrics FOR ALL USING(campaign_id IN(SELECT id FROM ppc_campaigns WHERE user_id = auth.uid()));

-- 3.11 TRIGGERS
CREATE TRIGGER IF NOT EXISTS trg_expenses_updated BEFORE UPDATE ON expenses FOR EACH ROW EXECUTE FUNCTION update_updated_at();
CREATE TRIGGER IF NOT EXISTS trg_payouts_updated BEFORE UPDATE ON amazon_payouts FOR EACH ROW EXECUTE FUNCTION update_updated_at();
CREATE TRIGGER IF NOT EXISTS trg_shipments_updated BEFORE UPDATE ON fba_shipments FOR EACH ROW EXECUTE FUNCTION update_updated_at();
CREATE TRIGGER IF NOT EXISTS trg_returns_updated BEFORE UPDATE ON returns FOR EACH ROW EXECUTE FUNCTION update_updated_at();
CREATE TRIGGER IF NOT EXISTS trg_reimbursements_updated BEFORE UPDATE ON reimbursements FOR EACH ROW EXECUTE FUNCTION update_updated_at();
CREATE TRIGGER IF NOT EXISTS trg_ppc_campaigns_updated BEFORE UPDATE ON ppc_campaigns FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- 3.12 VISTA: Financial summary por periodo
CREATE OR REPLACE VIEW monthly_financial_summary AS
SELECT
  user_id,
  DATE_TRUNC('month', expense_date)::DATE AS month,
  SUM(CASE WHEN category = 'ppc' THEN amount ELSE 0 END) AS ppc_spend,
  SUM(CASE WHEN category = 'software' THEN amount ELSE 0 END) AS software_spend,
  SUM(CASE WHEN category = 'va_services' THEN amount ELSE 0 END) AS va_spend,
  SUM(CASE WHEN category = 'samples' THEN amount ELSE 0 END) AS samples_spend,
  SUM(CASE WHEN category = 'photography' THEN amount ELSE 0 END) AS photo_spend,
  SUM(CASE WHEN category = 'shipping_forwarder' THEN amount ELSE 0 END) AS forwarder_spend,
  SUM(CASE WHEN category = 'customs' THEN amount ELSE 0 END) AS customs_spend,
  SUM(CASE WHEN category = 'prep_center' THEN amount ELSE 0 END) AS prep_spend,
  SUM(CASE WHEN category = 'storage_3pl' THEN amount ELSE 0 END) AS storage_spend,
  SUM(CASE WHEN category = 'travel' THEN amount ELSE 0 END) AS travel_spend,
  SUM(CASE WHEN category = 'other' THEN amount ELSE 0 END) AS other_spend,
  SUM(amount) AS total_expenses
FROM expenses
GROUP BY user_id, DATE_TRUNC('month', expense_date);

-- 3.13 VISTA: Product profitability real
CREATE OR REPLACE VIEW products_real_profit AS
SELECT
  p.id,
  p.user_id,
  p.sku,
  p.name,
  p.net_profit AS unit_profit_estimated,
  COALESCE(s.total_revenue, 0) AS total_revenue,
  COALESCE(s.total_units, 0) AS total_units_sold,
  COALESCE(r.total_returns, 0) AS total_returns,
  COALESCE(r.total_refund_amount, 0) AS total_refund_amount,
  COALESCE(e.total_expenses, 0) AS total_expenses,
  COALESCE(re.total_reimbursements, 0) AS total_reimbursements,
  (COALESCE(s.total_revenue, 0) - COALESCE(r.total_refund_amount, 0) - COALESCE(e.total_expenses, 0) + COALESCE(re.total_reimbursements, 0)) AS real_net_profit
FROM products p
LEFT JOIN (
  SELECT product_id, SUM(revenue) AS total_revenue, SUM(units_sold) AS total_units
  FROM sales GROUP BY product_id
) s ON s.product_id = p.id
LEFT JOIN (
  SELECT product_id, SUM(quantity) AS total_returns, SUM(refund_amount) AS total_refund_amount
  FROM returns GROUP BY product_id
) r ON r.product_id = p.id
LEFT JOIN (
  SELECT product_id, SUM(amount) AS total_expenses FROM expenses WHERE product_id IS NOT NULL GROUP BY product_id
) e ON e.product_id = p.id
LEFT JOIN (
  SELECT product_id, SUM(amount) AS total_reimbursements FROM reimbursements WHERE status = 'paid' GROUP BY product_id
) re ON re.product_id = p.id;
