-- ============================================================
-- MIGRACION 002: Tablas ampliadas para FBA Manager v2
-- Fecha: 2026-04-22
-- ============================================================

-- ============================================================
-- 1. Tablas existentes (documentacion para nuevos deploys)
-- ============================================================

-- suppliers (ya existe en produccion)
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

-- product_suppliers (ya existe en produccion)
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

-- user_settings (ya existe en produccion)
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

-- ============================================================
-- 2. NUEVA: supplier_quotes
-- ============================================================
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

-- ============================================================
-- 3. NUEVA: saved_calculations
-- ============================================================
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

-- ============================================================
-- 4. NUEVA: product_research (para sprint 4)
-- ============================================================
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

-- ============================================================
-- 5. NUEVA: purchase_orders (para sprint 5)
-- ============================================================
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

-- ============================================================
-- 6. Indexes
-- ============================================================
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

-- ============================================================
-- 7. RLS
-- ============================================================
ALTER TABLE suppliers ENABLE ROW LEVEL SECURITY;
ALTER TABLE product_suppliers ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE supplier_quotes ENABLE ROW LEVEL SECURITY;
ALTER TABLE saved_calculations ENABLE ROW LEVEL SECURITY;
ALTER TABLE product_research ENABLE ROW LEVEL SECURITY;
ALTER TABLE purchase_orders ENABLE ROW LEVEL SECURITY;

CREATE POLICY IF NOT EXISTS "own_suppliers" ON suppliers FOR ALL USING(auth.uid() = user_id);
CREATE POLICY IF NOT EXISTS "own_product_suppliers" ON product_suppliers FOR ALL USING(user_id = auth.uid());
CREATE POLICY IF NOT EXISTS "own_user_settings" ON user_settings FOR ALL USING(user_id = auth.uid());
CREATE POLICY IF NOT EXISTS "own_supplier_quotes" ON supplier_quotes FOR ALL USING(user_id = auth.uid());
CREATE POLICY IF NOT EXISTS "own_saved_calculations" ON saved_calculations FOR ALL USING(user_id = auth.uid());
CREATE POLICY IF NOT EXISTS "own_research" ON product_research FOR ALL USING(user_id = auth.uid());
CREATE POLICY IF NOT EXISTS "own_po" ON purchase_orders FOR ALL USING(user_id = auth.uid());

-- ============================================================
-- 8. Triggers updated_at
-- ============================================================
CREATE TRIGGER IF NOT EXISTS trg_suppliers_updated BEFORE UPDATE ON suppliers FOR EACH ROW EXECUTE FUNCTION update_updated_at();
CREATE TRIGGER IF NOT EXISTS trg_supplier_quotes_updated BEFORE UPDATE ON supplier_quotes FOR EACH ROW EXECUTE FUNCTION update_updated_at();
CREATE TRIGGER IF NOT EXISTS trg_research_updated BEFORE UPDATE ON product_research FOR EACH ROW EXECUTE FUNCTION update_updated_at();
CREATE TRIGGER IF NOT EXISTS trg_po_updated BEFORE UPDATE ON purchase_orders FOR EACH ROW EXECUTE FUNCTION update_updated_at();
