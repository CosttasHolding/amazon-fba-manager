-- ============================================================
-- FULL MIGRATION: Amazon FBA Manager v2 - Database Completo
-- Combina: 001_init + 002_enhanced + 006_fix (contiene 003)
--          + 004_repair_views + 005_repair_indexes
-- ============================================================

-- ============================================================
-- 001_init.sql - TABLAS BASE
-- ============================================================
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

CREATE TABLE profiles(id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,email TEXT NOT NULL,full_name TEXT,role TEXT CHECK(role IN('admin','user'))DEFAULT'user',created_at TIMESTAMPTZ DEFAULT now());

CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $func$
BEGIN
  INSERT INTO public.profiles (id, email, full_name)
  VALUES (NEW.id, NEW.email, COALESCE(NEW.raw_user_meta_data->>'full_name', ''));
  RETURN NEW;
END $func$;

CREATE TRIGGER on_auth_user_created AFTER INSERT ON auth.users FOR EACH ROW EXECUTE FUNCTION handle_new_user();

CREATE TABLE products(id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),user_id UUID NOT NULL REFERENCES profiles(id)ON DELETE CASCADE,sku TEXT NOT NULL,asin TEXT,name TEXT NOT NULL,category TEXT,weight_kg DECIMAL(10,3),marketplace TEXT DEFAULT'US'CHECK(marketplace IN('US','MX','CA','UK','DE','FR','IT','ES')),unit_cost DECIMAL(10,2)NOT NULL DEFAULT 0,shipping_cost DECIMAL(10,2)DEFAULT 0,prep_cost DECIMAL(10,2)DEFAULT 0,taxes DECIMAL(10,2)DEFAULT 0,sale_price DECIMAL(10,2)NOT NULL DEFAULT 0,referral_fee DECIMAL(10,2)DEFAULT 0,fba_fee DECIMAL(10,2)DEFAULT 0,storage_fee_monthly DECIMAL(10,2)DEFAULT 0,other_fees DECIMAL(10,2)DEFAULT 0,total_cost DECIMAL(10,2)GENERATED ALWAYS AS(unit_cost+shipping_cost+prep_cost+taxes)STORED,total_fees DECIMAL(10,2)GENERATED ALWAYS AS(referral_fee+fba_fee+storage_fee_monthly+other_fees)STORED,net_profit DECIMAL(10,2)GENERATED ALWAYS AS(sale_price-(unit_cost+shipping_cost+prep_cost+taxes)-(referral_fee+fba_fee+storage_fee_monthly+other_fees))STORED,roi DECIMAL(10,2)GENERATED ALWAYS AS(CASE WHEN(unit_cost+shipping_cost+prep_cost+taxes)>0 THEN ROUND(((sale_price-(unit_cost+shipping_cost+prep_cost+taxes)-(referral_fee+fba_fee+storage_fee_monthly+other_fees))/(unit_cost+shipping_cost+prep_cost+taxes))*100,2)ELSE 0 END)STORED,status TEXT CHECK(status IN('active','paused','discontinued'))DEFAULT'active',notes TEXT,pdf_url TEXT,created_at TIMESTAMPTZ DEFAULT now(),updated_at TIMESTAMPTZ DEFAULT now(),UNIQUE(user_id,sku));

CREATE TABLE inventory(id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),product_id UUID NOT NULL REFERENCES products(id)ON DELETE CASCADE,stock_available INT DEFAULT 0 CHECK(stock_available>=0),stock_inbound INT DEFAULT 0 CHECK(stock_inbound>=0),stock_reserved INT DEFAULT 0 CHECK(stock_reserved>=0),stock_warehouse INT DEFAULT 0 CHECK(stock_warehouse>=0),reorder_point INT DEFAULT 10,max_stock INT DEFAULT 500,updated_at TIMESTAMPTZ DEFAULT now(),UNIQUE(product_id));

CREATE TABLE stock_movements(id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),product_id UUID NOT NULL REFERENCES products(id)ON DELETE CASCADE,user_id UUID NOT NULL REFERENCES profiles(id),movement_type TEXT NOT NULL CHECK(movement_type IN('inbound_shipment','received_at_amazon','sale','return','removal','adjustment','damaged','transfer_to_warehouse')),quantity INT NOT NULL,previous_stock INT,new_stock INT,reference TEXT,notes TEXT,created_at TIMESTAMPTZ DEFAULT now());

CREATE TABLE sales(id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),product_id UUID NOT NULL REFERENCES products(id)ON DELETE CASCADE,user_id UUID NOT NULL REFERENCES profiles(id),sale_date DATE NOT NULL,units_sold INT NOT NULL CHECK(units_sold>0),revenue DECIMAL(10,2)NOT NULL,amazon_fees DECIMAL(10,2)DEFAULT 0,net_revenue DECIMAL(10,2)GENERATED ALWAYS AS(revenue-amazon_fees)STORED,order_id TEXT,source TEXT DEFAULT'manual'CHECK(source IN('manual','import','api')),created_at TIMESTAMPTZ DEFAULT now());

CREATE INDEX idx_prod_user ON products(user_id);CREATE INDEX idx_prod_status ON products(status);CREATE INDEX idx_inv_product ON inventory(product_id);CREATE INDEX idx_mov_product ON stock_movements(product_id);CREATE INDEX idx_sales_product ON sales(product_id);CREATE INDEX idx_sales_date ON sales(sale_date DESC);

CREATE OR REPLACE FUNCTION auto_create_inventory() RETURNS TRIGGER
LANGUAGE plpgsql AS $func$
BEGIN
  INSERT INTO inventory(product_id) VALUES (NEW.id) ON CONFLICT(product_id) DO NOTHING;
  RETURN NEW;
END $func$;

CREATE TRIGGER trg_auto_inv AFTER INSERT ON products FOR EACH ROW EXECUTE FUNCTION auto_create_inventory();

CREATE OR REPLACE FUNCTION update_inventory_from_movement() RETURNS TRIGGER
LANGUAGE plpgsql AS $func$
DECLARE
  v_avail INT;
BEGIN
  SELECT stock_available INTO v_avail FROM inventory WHERE product_id = NEW.product_id;
  NEW.previous_stock := v_avail;
  CASE NEW.movement_type
    WHEN 'inbound_shipment' THEN
      UPDATE inventory SET stock_inbound = stock_inbound + NEW.quantity, stock_warehouse = GREATEST(stock_warehouse - NEW.quantity, 0), updated_at = now() WHERE product_id = NEW.product_id;
    WHEN 'received_at_amazon' THEN
      UPDATE inventory SET stock_available = stock_available + NEW.quantity, stock_inbound = GREATEST(stock_inbound - NEW.quantity, 0), updated_at = now() WHERE product_id = NEW.product_id;
    WHEN 'sale' THEN
      UPDATE inventory SET stock_available = GREATEST(stock_available - ABS(NEW.quantity), 0), updated_at = now() WHERE product_id = NEW.product_id;
    WHEN 'return' THEN
      UPDATE inventory SET stock_available = stock_available + ABS(NEW.quantity), updated_at = now() WHERE product_id = NEW.product_id;
    WHEN 'removal' THEN
      UPDATE inventory SET stock_available = GREATEST(stock_available - ABS(NEW.quantity), 0), stock_warehouse = stock_warehouse + ABS(NEW.quantity), updated_at = now() WHERE product_id = NEW.product_id;
    WHEN 'adjustment' THEN
      UPDATE inventory SET stock_available = GREATEST(stock_available + NEW.quantity, 0), updated_at = now() WHERE product_id = NEW.product_id;
    WHEN 'damaged' THEN
      UPDATE inventory SET stock_available = GREATEST(stock_available - ABS(NEW.quantity), 0), updated_at = now() WHERE product_id = NEW.product_id;
    WHEN 'transfer_to_warehouse' THEN
      UPDATE inventory SET stock_warehouse = stock_warehouse + ABS(NEW.quantity), updated_at = now() WHERE product_id = NEW.product_id;
  END CASE;
  SELECT stock_available INTO NEW.new_stock FROM inventory WHERE product_id = NEW.product_id;
  RETURN NEW;
END $func$;

CREATE TRIGGER trg_update_inv BEFORE INSERT ON stock_movements FOR EACH ROW EXECUTE FUNCTION update_inventory_from_movement();

CREATE OR REPLACE FUNCTION update_updated_at() RETURNS TRIGGER
LANGUAGE plpgsql AS $func$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END $func$;

CREATE TRIGGER trg_prod_updated BEFORE UPDATE ON products FOR EACH ROW EXECUTE FUNCTION update_updated_at();

DROP VIEW IF EXISTS products_with_inventory;

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

ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;ALTER TABLE products ENABLE ROW LEVEL SECURITY;ALTER TABLE inventory ENABLE ROW LEVEL SECURITY;ALTER TABLE stock_movements ENABLE ROW LEVEL SECURITY;ALTER TABLE sales ENABLE ROW LEVEL SECURITY;

CREATE POLICY"own_profile"ON profiles FOR ALL USING(auth.uid()=id);CREATE POLICY"own_products"ON products FOR ALL USING(auth.uid()=user_id);CREATE POLICY"own_inv"ON inventory FOR ALL USING(product_id IN(SELECT id FROM products WHERE user_id=auth.uid()));CREATE POLICY"own_mov"ON stock_movements FOR ALL USING(user_id=auth.uid());CREATE POLICY"own_sales"ON sales FOR ALL USING(user_id=auth.uid());

INSERT INTO storage.buckets(id,name,public)VALUES('product-files','product-files',false);CREATE POLICY"own_files"ON storage.objects FOR ALL USING(bucket_id='product-files'AND auth.uid()::text=(storage.foldername(name))[1]);

-- ============================================================
-- 002_enhanced.sql - TABLAS AMPLIADAS
-- ============================================================

CREATE TABLE IF NOT EXISTS suppliers(
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  alibaba_url TEXT,
  contact_name TEXT,
  contact_email TEXT,
  contact_whatsapp TEXT,
  country TEXT DEFAULT 'China',
  city TEXT,
  rating INTEGER CHECK(rating BETWEEN 1 AND 5),
  payment_terms TEXT,
  min_order_qty INTEGER,
  lead_time_days INTEGER,
  currency TEXT DEFAULT 'USD',
  reliability_score INTEGER CHECK(reliability_score BETWEEN 1 AND 5),
  notes TEXT,
  last_order_date DATE,
  status TEXT CHECK(status IN('active','inactive'))DEFAULT'active',
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE IF NOT EXISTS product_suppliers(
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  product_id UUID NOT NULL REFERENCES products(id) ON DELETE CASCADE,
  supplier_id UUID NOT NULL REFERENCES suppliers(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  unit_cost DECIMAL(10,4),
  moq INTEGER,
  lead_time_days INTEGER,
  is_primary BOOLEAN DEFAULT false,
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE IF NOT EXISTS user_settings(
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE UNIQUE,
  default_marketplace TEXT DEFAULT 'US',
  currency TEXT DEFAULT 'USD',
  default_referral_fee_pct DECIMAL(5,2) DEFAULT 15.00,
  default_ppc_budget DECIMAL(10,2) DEFAULT 0,
  theme TEXT DEFAULT 'dark',
  language TEXT DEFAULT 'es',
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE IF NOT EXISTS supplier_quotes(
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  supplier_id UUID NOT NULL REFERENCES suppliers(id) ON DELETE CASCADE,
  product_id UUID REFERENCES products(id) ON DELETE SET NULL,
  user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  quantity INTEGER NOT NULL CHECK(quantity > 0),
  unit_price DECIMAL(10,4) NOT NULL,
  total_price DECIMAL(10,2) GENERATED ALWAYS AS(quantity * unit_price)STORED,
  currency TEXT DEFAULT 'USD',
  valid_until DATE,
  shipping_method TEXT CHECK(shipping_method IN('air','sea','express')),
  shipping_cost DECIMAL(10,2),
  notes TEXT,
  status TEXT CHECK(status IN('pending','accepted','rejected','expired'))DEFAULT'pending',
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE IF NOT EXISTS saved_calculations(
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  product_id UUID REFERENCES products(id) ON DELETE SET NULL,
  sale_price DECIMAL(10,2),
  unit_cost DECIMAL(10,2),
  shipping_cost DECIMAL(10,2),
  prep_cost DECIMAL(10,2),
  taxes DECIMAL(10,2),
  weight_kg DECIMAL(10,3),
  fba_fee DECIMAL(10,2),
  referral_fee DECIMAL(10,2),
  other_fees DECIMAL(10,2),
  ppc_budget DECIMAL(10,2),
  net_profit DECIMAL(10,2),
  roi DECIMAL(10,2),
  margin DECIMAL(10,2),
  total_cost DECIMAL(10,2),
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE IF NOT EXISTS product_research(
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  niche TEXT,
  asin_reference TEXT,
  amazon_category TEXT,
  estimated_monthly_sales INTEGER,
  average_price DECIMAL(10,2),
  review_count_competitor INTEGER,
  average_rating DECIMAL(3,2),
  bsr INTEGER,
  competition_level TEXT CHECK(competition_level IN('low','medium','high')),
  estimated_cogs DECIMAL(10,2),
  estimated_selling_price DECIMAL(10,2),
  estimated_roi DECIMAL(5,2),
  differentiation_notes TEXT,
  keywords TEXT[],
  status TEXT CHECK(status IN('idea','validating','approved','rejected','in_progress','launched'))DEFAULT'idea',
  priority INTEGER DEFAULT 3 CHECK(priority BETWEEN 1 AND 5),
  source TEXT,
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE IF NOT EXISTS purchase_orders(
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  supplier_id UUID REFERENCES suppliers(id),
  po_number TEXT UNIQUE,
  product_id UUID REFERENCES products(id),
  quantity INTEGER NOT NULL CHECK(quantity > 0),
  unit_cost DECIMAL(10,4) NOT NULL,
  total_cost DECIMAL(10,2) GENERATED ALWAYS AS(quantity * unit_cost)STORED,
  currency TEXT DEFAULT 'USD',
  exchange_rate DECIMAL(10,4) DEFAULT 1,
  shipping_method TEXT CHECK(shipping_method IN('air','sea','express')),
  shipping_cost DECIMAL(10,2),
  status TEXT CHECK(status IN('draft','sent','confirmed','in_production','shipped','in_transit','customs','delivered','cancelled'))DEFAULT'draft',
  order_date DATE,
  production_deadline DATE,
  ship_date DATE,
  estimated_arrival DATE,
  actual_arrival DATE,
  tracking_number TEXT,
  forwarder_name TEXT,
  customs_cost DECIMAL(10,2),
  prep_center_cost DECIMAL(10,2),
  amazon_shipment_id TEXT,
  payment_deposit DECIMAL(10,2),
  payment_balance DECIMAL(10,2),
  payment_deposit_date DATE,
  payment_balance_date DATE,
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_suppliers_user ON suppliers(user_id);
CREATE INDEX IF NOT EXISTS idx_product_suppliers_product ON product_suppliers(product_id);
CREATE INDEX IF NOT EXISTS idx_product_suppliers_supplier ON product_suppliers(supplier_id);
CREATE INDEX IF NOT EXISTS idx_supplier_quotes_supplier ON supplier_quotes(supplier_id);
CREATE INDEX IF NOT EXISTS idx_supplier_quotes_user ON supplier_quotes(user_id);
CREATE INDEX IF NOT EXISTS idx_saved_calc_user ON saved_calculations(user_id);
CREATE INDEX IF NOT EXISTS idx_research_user ON product_research(user_id);
CREATE INDEX IF NOT EXISTS idx_research_status ON product_research(status);
CREATE INDEX IF NOT EXISTS idx_po_user ON purchase_orders(user_id);
CREATE INDEX IF NOT EXISTS idx_po_status ON purchase_orders(status);

ALTER TABLE suppliers ENABLE ROW LEVEL SECURITY;
ALTER TABLE product_suppliers ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE supplier_quotes ENABLE ROW LEVEL SECURITY;
ALTER TABLE saved_calculations ENABLE ROW LEVEL SECURITY;
ALTER TABLE product_research ENABLE ROW LEVEL SECURITY;
ALTER TABLE purchase_orders ENABLE ROW LEVEL SECURITY;

CREATE POLICY "own_suppliers" ON suppliers FOR ALL USING(auth.uid() = user_id);
CREATE POLICY "own_product_suppliers" ON product_suppliers FOR ALL USING(user_id = auth.uid());
CREATE POLICY "own_user_settings" ON user_settings FOR ALL USING(user_id = auth.uid());
CREATE POLICY "own_supplier_quotes" ON supplier_quotes FOR ALL USING(user_id = auth.uid());
CREATE POLICY "own_saved_calculations" ON saved_calculations FOR ALL USING(user_id = auth.uid());
CREATE POLICY "own_research" ON product_research FOR ALL USING(user_id = auth.uid());
CREATE POLICY "own_po" ON purchase_orders FOR ALL USING(user_id = auth.uid());

CREATE TRIGGER trg_suppliers_updated BEFORE UPDATE ON suppliers FOR EACH ROW EXECUTE FUNCTION update_updated_at();
CREATE TRIGGER trg_supplier_quotes_updated BEFORE UPDATE ON supplier_quotes FOR EACH ROW EXECUTE FUNCTION update_updated_at();
CREATE TRIGGER trg_research_updated BEFORE UPDATE ON product_research FOR EACH ROW EXECUTE FUNCTION update_updated_at();
CREATE TRIGGER trg_po_updated BEFORE UPDATE ON purchase_orders FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- ============================================================
-- 003_finances.sql - FINANZAS, SHIPMENTS, RETURNS, PPC
-- (desde 006_fix_missing.sql que es el consolidado)
-- ============================================================

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

ALTER TABLE expenses ENABLE ROW LEVEL SECURITY;
ALTER TABLE amazon_payouts ENABLE ROW LEVEL SECURITY;
ALTER TABLE fba_shipments ENABLE ROW LEVEL SECURITY;
ALTER TABLE fba_shipment_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE returns ENABLE ROW LEVEL SECURITY;
ALTER TABLE reimbursements ENABLE ROW LEVEL SECURITY;
ALTER TABLE ppc_campaigns ENABLE ROW LEVEL SECURITY;
ALTER TABLE ppc_daily_metrics ENABLE ROW LEVEL SECURITY;

CREATE POLICY "own_expenses" ON expenses FOR ALL USING(auth.uid() = user_id);
CREATE POLICY "own_payouts" ON amazon_payouts FOR ALL USING(auth.uid() = user_id);
CREATE POLICY "own_shipments" ON fba_shipments FOR ALL USING(auth.uid() = user_id);
CREATE POLICY "own_shipment_items" ON fba_shipment_items FOR ALL USING(shipment_id IN(SELECT id FROM fba_shipments WHERE user_id = auth.uid()));
CREATE POLICY "own_returns" ON returns FOR ALL USING(auth.uid() = user_id);
CREATE POLICY "own_reimbursements" ON reimbursements FOR ALL USING(auth.uid() = user_id);
CREATE POLICY "own_ppc_campaigns" ON ppc_campaigns FOR ALL USING(auth.uid() = user_id);
CREATE POLICY "own_ppc_metrics" ON ppc_daily_metrics FOR ALL USING(campaign_id IN(SELECT id FROM ppc_campaigns WHERE user_id = auth.uid()));

CREATE TRIGGER trg_expenses_updated BEFORE UPDATE ON expenses FOR EACH ROW EXECUTE FUNCTION update_updated_at();
CREATE TRIGGER trg_payouts_updated BEFORE UPDATE ON amazon_payouts FOR EACH ROW EXECUTE FUNCTION update_updated_at();
CREATE TRIGGER trg_shipments_updated BEFORE UPDATE ON fba_shipments FOR EACH ROW EXECUTE FUNCTION update_updated_at();
CREATE TRIGGER trg_returns_updated BEFORE UPDATE ON returns FOR EACH ROW EXECUTE FUNCTION update_updated_at();
CREATE TRIGGER trg_reimbursements_updated BEFORE UPDATE ON reimbursements FOR EACH ROW EXECUTE FUNCTION update_updated_at();
CREATE TRIGGER trg_ppc_campaigns_updated BEFORE UPDATE ON ppc_campaigns FOR EACH ROW EXECUTE FUNCTION update_updated_at();

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
  SELECT product_id, user_id, SUM(revenue) AS total_revenue, SUM(units_sold) AS total_units
  FROM sales GROUP BY product_id, user_id
) s ON s.product_id = p.id AND s.user_id = p.user_id
LEFT JOIN (
  SELECT product_id, user_id, SUM(quantity) AS total_returns, SUM(refund_amount) AS total_refund_amount
  FROM returns GROUP BY product_id, user_id
) r ON r.product_id = p.id AND r.user_id = p.user_id
LEFT JOIN (
  SELECT product_id, user_id, SUM(amount) AS total_expenses
  FROM expenses WHERE product_id IS NOT NULL
  GROUP BY product_id, user_id
) e ON e.product_id = p.id AND e.user_id = p.user_id
LEFT JOIN (
  SELECT product_id, user_id, SUM(amount) AS total_reimbursements
  FROM reimbursements WHERE status = 'paid'
  GROUP BY product_id, user_id
) re ON re.product_id = p.id AND re.user_id = p.user_id;

-- ============================================================
-- 005_repair_indexes.sql - INDICES COMPUESTOS
-- ============================================================

DROP TRIGGER IF EXISTS update_user_settings_updated_at ON user_settings;
CREATE TRIGGER update_user_settings_updated_at
  BEFORE UPDATE ON user_settings
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at();

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
CREATE INDEX IF NOT EXISTS idx_inventory_reorder ON inventory(stock_available, reorder_point) WHERE stock_available <= reorder_point;

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
