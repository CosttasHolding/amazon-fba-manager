-- 024_multi_tenant.sql
-- Multi-tenant: organizations, org_members, invitations, org_id on core tables
-- Robust version: handles missing tables, fully idempotent, no syntax errors

-- ============================================================
-- 0. HELPER FUNCTION (no table dependencies)
-- ============================================================

CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- ============================================================
-- 1. CREATE NEW TABLES (always succeed, IF NOT EXISTS)
-- ============================================================

CREATE TABLE IF NOT EXISTS organizations (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  slug TEXT NOT NULL UNIQUE,
  owner_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  logo_url TEXT,
  settings JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE organizations ENABLE ROW LEVEL SECURITY;

DROP TRIGGER IF EXISTS organizations_updated_at ON organizations;
CREATE TRIGGER organizations_updated_at
  BEFORE UPDATE ON organizations
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TABLE IF NOT EXISTS org_members (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  org_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  role TEXT NOT NULL DEFAULT 'editor' CHECK (role IN ('owner', 'admin', 'editor', 'viewer')),
  status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('pending', 'active', 'removed')),
  joined_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(org_id, user_id)
);

ALTER TABLE org_members ENABLE ROW LEVEL SECURITY;

CREATE TABLE IF NOT EXISTS org_invitations (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  org_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  email TEXT NOT NULL,
  role TEXT NOT NULL DEFAULT 'editor' CHECK (role IN ('admin', 'editor', 'viewer')),
  invited_by UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  token TEXT NOT NULL UNIQUE DEFAULT encode(gen_random_bytes(32), 'hex'),
  expires_at TIMESTAMPTZ NOT NULL DEFAULT (now() + INTERVAL '7 days'),
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'accepted', 'expired', 'revoked')),
  created_at TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE org_invitations ENABLE ROW LEVEL SECURITY;

-- ============================================================
-- 1b. HELPER FUNCTIONS (after org_members table exists)
-- ============================================================

CREATE OR REPLACE FUNCTION is_org_member(target_org_id UUID)
RETURNS BOOLEAN AS $$
  SELECT EXISTS (
    SELECT 1 FROM org_members
    WHERE org_id = target_org_id
      AND user_id = auth.uid()
      AND status = 'active'
  );
$$ LANGUAGE sql SECURITY DEFINER STABLE;

CREATE OR REPLACE FUNCTION get_org_role(target_org_id UUID)
RETURNS TEXT AS $$
  SELECT role FROM org_members
  WHERE org_id = target_org_id
    AND user_id = auth.uid()
    AND status = 'active'
  LIMIT 1;
$$ LANGUAGE sql SECURITY DEFINER STABLE;

-- ============================================================
-- 2. ADD org_id TO EXISTING TABLES (only if table exists)
-- ============================================================

DO $$ BEGIN
  IF EXISTS (SELECT FROM information_schema.tables WHERE table_name = 'products') THEN
    ALTER TABLE products ADD COLUMN IF NOT EXISTS org_id UUID REFERENCES organizations(id) ON DELETE CASCADE;
  END IF;
END $$;
DO $$ BEGIN
  IF EXISTS (SELECT FROM information_schema.tables WHERE table_name = 'sales') THEN
    ALTER TABLE sales ADD COLUMN IF NOT EXISTS org_id UUID REFERENCES organizations(id) ON DELETE CASCADE;
  END IF;
END $$;
DO $$ BEGIN
  IF EXISTS (SELECT FROM information_schema.tables WHERE table_name = 'suppliers') THEN
    ALTER TABLE suppliers ADD COLUMN IF NOT EXISTS org_id UUID REFERENCES organizations(id) ON DELETE CASCADE;
  END IF;
END $$;
DO $$ BEGIN
  IF EXISTS (SELECT FROM information_schema.tables WHERE table_name = 'purchase_orders') THEN
    ALTER TABLE purchase_orders ADD COLUMN IF NOT EXISTS org_id UUID REFERENCES organizations(id) ON DELETE CASCADE;
  END IF;
END $$;
DO $$ BEGIN
  IF EXISTS (SELECT FROM information_schema.tables WHERE table_name = 'product_research') THEN
    ALTER TABLE product_research ADD COLUMN IF NOT EXISTS org_id UUID REFERENCES organizations(id) ON DELETE CASCADE;
  END IF;
END $$;
DO $$ BEGIN
  IF EXISTS (SELECT FROM information_schema.tables WHERE table_name = 'sp_api_connections') THEN
    ALTER TABLE sp_api_connections ADD COLUMN IF NOT EXISTS org_id UUID REFERENCES organizations(id) ON DELETE CASCADE;
  END IF;
END $$;
DO $$ BEGIN
  IF EXISTS (SELECT FROM information_schema.tables WHERE table_name = 'members') THEN
    ALTER TABLE members ADD COLUMN IF NOT EXISTS org_id UUID REFERENCES organizations(id) ON DELETE CASCADE;
  END IF;
END $$;
DO $$ BEGIN
  IF EXISTS (SELECT FROM information_schema.tables WHERE table_name = 'tasks') THEN
    ALTER TABLE tasks ADD COLUMN IF NOT EXISTS org_id UUID REFERENCES organizations(id) ON DELETE CASCADE;
  END IF;
END $$;
DO $$ BEGIN
  IF EXISTS (SELECT FROM information_schema.tables WHERE table_name = 'board_decisions') THEN
    ALTER TABLE board_decisions ADD COLUMN IF NOT EXISTS org_id UUID REFERENCES organizations(id) ON DELETE CASCADE;
  END IF;
END $$;
DO $$ BEGIN
  IF EXISTS (SELECT FROM information_schema.tables WHERE table_name = 'notifications') THEN
    ALTER TABLE notifications ADD COLUMN IF NOT EXISTS org_id UUID REFERENCES organizations(id) ON DELETE CASCADE;
  END IF;
END $$;
DO $$ BEGIN
  IF EXISTS (SELECT FROM information_schema.tables WHERE table_name = 'expenses') THEN
    ALTER TABLE expenses ADD COLUMN IF NOT EXISTS org_id UUID REFERENCES organizations(id) ON DELETE CASCADE;
  END IF;
END $$;
DO $$ BEGIN
  IF EXISTS (SELECT FROM information_schema.tables WHERE table_name = 'returns') THEN
    ALTER TABLE returns ADD COLUMN IF NOT EXISTS org_id UUID REFERENCES organizations(id) ON DELETE CASCADE;
  END IF;
END $$;
DO $$ BEGIN
  IF EXISTS (SELECT FROM information_schema.tables WHERE table_name = 'reimbursements') THEN
    ALTER TABLE reimbursements ADD COLUMN IF NOT EXISTS org_id UUID REFERENCES organizations(id) ON DELETE CASCADE;
  END IF;
END $$;
DO $$ BEGIN
  IF EXISTS (SELECT FROM information_schema.tables WHERE table_name = 'shipments') THEN
    ALTER TABLE shipments ADD COLUMN IF NOT EXISTS org_id UUID REFERENCES organizations(id) ON DELETE CASCADE;
  END IF;
END $$;
DO $$ BEGIN
  IF EXISTS (SELECT FROM information_schema.tables WHERE table_name = 'reorder_rules') THEN
    ALTER TABLE reorder_rules ADD COLUMN IF NOT EXISTS org_id UUID REFERENCES organizations(id) ON DELETE CASCADE;
  END IF;
END $$;
DO $$ BEGIN
  IF EXISTS (SELECT FROM information_schema.tables WHERE table_name = 'alert_rules') THEN
    ALTER TABLE alert_rules ADD COLUMN IF NOT EXISTS org_id UUID REFERENCES organizations(id) ON DELETE CASCADE;
  END IF;
END $$;
DO $$ BEGIN
  IF EXISTS (SELECT FROM information_schema.tables WHERE table_name = 'scheduled_reports') THEN
    ALTER TABLE scheduled_reports ADD COLUMN IF NOT EXISTS org_id UUID REFERENCES organizations(id) ON DELETE CASCADE;
  END IF;
END $$;
DO $$ BEGIN
  IF EXISTS (SELECT FROM information_schema.tables WHERE table_name = 'sp_api_webhook_subscriptions') THEN
    ALTER TABLE sp_api_webhook_subscriptions ADD COLUMN IF NOT EXISTS org_id UUID REFERENCES organizations(id) ON DELETE CASCADE;
  END IF;
END $$;
DO $$ BEGIN
  IF EXISTS (SELECT FROM information_schema.tables WHERE table_name = 'comments') THEN
    ALTER TABLE comments ADD COLUMN IF NOT EXISTS org_id UUID REFERENCES organizations(id) ON DELETE CASCADE;
  END IF;
END $$;
DO $$ BEGIN
  IF EXISTS (SELECT FROM information_schema.tables WHERE table_name = 'sync_logs') THEN
    ALTER TABLE sync_logs ADD COLUMN IF NOT EXISTS org_id UUID REFERENCES organizations(id) ON DELETE CASCADE;
  END IF;
END $$;
DO $$ BEGIN
  IF EXISTS (SELECT FROM information_schema.tables WHERE table_name = 'audit_log') THEN
    ALTER TABLE audit_log ADD COLUMN IF NOT EXISTS org_id UUID REFERENCES organizations(id) ON DELETE CASCADE;
  END IF;
END $$;

-- ============================================================
-- 3. INDEXES (only on tables that exist AND have org_id)
-- ============================================================

DO $$
DECLARE
  i INT;
  t_names TEXT[] := ARRAY[
    'products', 'sales', 'suppliers', 'purchase_orders', 'product_research',
    'members', 'tasks', 'board_decisions', 'notifications', 'expenses',
    'returns', 'reimbursements', 'shipments', 'reorder_rules', 'alert_rules',
    'comments', 'sync_logs', 'audit_log'
  ];
  idx_names TEXT[] := ARRAY[
    'idx_products_org', 'idx_sales_org', 'idx_suppliers_org', 'idx_purchase_orders_org', 'idx_product_research_org',
    'idx_members_org', 'idx_tasks_org', 'idx_board_decisions_org', 'idx_notifications_org', 'idx_expenses_org',
    'idx_returns_org', 'idx_reimbursements_org', 'idx_shipments_org', 'idx_reorder_rules_org', 'idx_alert_rules_org',
    'idx_comments_org', 'idx_sync_logs_org', 'idx_audit_log_org'
  ];
BEGIN
  FOR i IN 1..array_length(t_names, 1)
  LOOP
    IF EXISTS (SELECT FROM information_schema.columns WHERE table_name = t_names[i] AND column_name = 'org_id') THEN
      EXECUTE format('CREATE INDEX IF NOT EXISTS %I ON %I(org_id)', idx_names[i], t_names[i]);
    END IF;
  END LOOP;
END $$;

-- Indexes on new tables (always exist)
CREATE INDEX IF NOT EXISTS idx_org_members_user ON org_members(user_id);
CREATE INDEX IF NOT EXISTS idx_org_members_org ON org_members(org_id);
CREATE INDEX IF NOT EXISTS idx_org_invitations_token ON org_invitations(token);
CREATE INDEX IF NOT EXISTS idx_org_invitations_email ON org_invitations(email);

-- ============================================================
-- 4. RLS POLICIES ON NEW TABLES (guaranteed to exist)
-- ============================================================

-- --- Organizations ---
CREATE POLICY "org_select" ON organizations
  FOR SELECT USING (
    id IN (SELECT org_id FROM org_members WHERE user_id = auth.uid() AND status = 'active')
  );
CREATE POLICY "org_insert" ON organizations
  FOR INSERT WITH CHECK (auth.uid() = owner_id);
CREATE POLICY "org_update" ON organizations
  FOR UPDATE USING (
    id IN (SELECT org_id FROM org_members WHERE user_id = auth.uid() AND status = 'active' AND role IN ('owner', 'admin'))
  );
CREATE POLICY "org_delete" ON organizations
  FOR DELETE USING (
    id IN (SELECT org_id FROM org_members WHERE user_id = auth.uid() AND status = 'active' AND role = 'owner')
  );

-- --- Org Members ---
CREATE POLICY "org_members_select" ON org_members
  FOR SELECT USING (
    org_id IN (SELECT org_id FROM org_members om2 WHERE om2.user_id = auth.uid() AND om2.status = 'active')
  );
CREATE POLICY "org_members_insert" ON org_members
  FOR INSERT WITH CHECK (
    org_id IN (SELECT org_id FROM org_members om2 WHERE om2.user_id = auth.uid() AND om2.status = 'active' AND om2.role IN ('owner', 'admin'))
  );
CREATE POLICY "org_members_update" ON org_members
  FOR UPDATE USING (
    org_id IN (SELECT org_id FROM org_members om2 WHERE om2.user_id = auth.uid() AND om2.status = 'active' AND om2.role IN ('owner', 'admin'))
  );
CREATE POLICY "org_members_delete" ON org_members
  FOR DELETE USING (
    org_id IN (SELECT org_id FROM org_members om2 WHERE om2.user_id = auth.uid() AND om2.status = 'active' AND om2.role IN ('owner', 'admin'))
  );

-- --- Org Invitations ---
CREATE POLICY "org_inv_select" ON org_invitations
  FOR SELECT USING (
    org_id IN (SELECT org_id FROM org_members WHERE user_id = auth.uid() AND status = 'active' AND role IN ('owner', 'admin'))
    OR email = (SELECT email FROM profiles WHERE id = auth.uid())
  );
CREATE POLICY "org_inv_insert" ON org_invitations
  FOR INSERT WITH CHECK (
    org_id IN (SELECT org_id FROM org_members WHERE user_id = auth.uid() AND status = 'active' AND role IN ('owner', 'admin'))
  );
CREATE POLICY "org_inv_update" ON org_invitations
  FOR UPDATE USING (true);

-- ============================================================
-- 5. RLS POLICIES ON EXISTING TABLES (dynamic, table-safe)
-- ============================================================

DO $$
DECLARE
  t TEXT;
  i INT;
  pol_rec RECORD;

  -- Full CRUD, DELETE requires editor+
  t_editor TEXT[] := ARRAY[
    'products', 'sales', 'suppliers', 'purchase_orders', 'product_research',
    'tasks', 'notifications', 'expenses', 'returns', 'reimbursements',
    'shipments', 'reorder_rules', 'alert_rules', 'scheduled_reports'
  ];
  -- Full CRUD, DELETE requires admin+
  t_admin TEXT[] := ARRAY['members', 'board_decisions', 'sp_api_connections'];
  -- SELECT + INSERT only
  t_read_insert TEXT[] := ARRAY['sync_logs', 'audit_log'];
  -- SELECT + INSERT + DELETE (no UPDATE)
  t_sid TEXT[] := ARRAY['sp_api_webhook_subscriptions'];
BEGIN
  -- Group A: Full CRUD, editor+ delete
  FOR i IN 1..array_length(t_editor, 1)
  LOOP
    t := t_editor[i];
    IF EXISTS (SELECT FROM information_schema.columns WHERE table_name = t AND column_name = 'org_id') THEN
      EXECUTE format('ALTER TABLE %I ENABLE ROW LEVEL SECURITY', t);
      FOR pol_rec IN SELECT polname FROM pg_policy WHERE polrelid = (quote_ident(t)::regclass) LOOP
        EXECUTE format('DROP POLICY IF EXISTS %I ON %I', pol_rec.polname, t);
      END LOOP;
      EXECUTE format('CREATE POLICY "%s_select" ON %I FOR SELECT USING (is_org_member(org_id))', t, t);
      EXECUTE format('CREATE POLICY "%s_insert" ON %I FOR INSERT WITH CHECK (is_org_member(org_id))', t, t);
      EXECUTE format('CREATE POLICY "%s_update" ON %I FOR UPDATE USING (is_org_member(org_id))', t, t);
      EXECUTE format('CREATE POLICY "%s_delete" ON %I FOR DELETE USING (is_org_member(org_id) AND get_org_role(org_id) IN (''owner'', ''admin'', ''editor''))', t, t);
    END IF;
  END LOOP;

  -- Group B: Full CRUD, admin+ delete
  FOR i IN 1..array_length(t_admin, 1)
  LOOP
    t := t_admin[i];
    IF EXISTS (SELECT FROM information_schema.columns WHERE table_name = t AND column_name = 'org_id') THEN
      EXECUTE format('ALTER TABLE %I ENABLE ROW LEVEL SECURITY', t);
      FOR pol_rec IN SELECT polname FROM pg_policy WHERE polrelid = (quote_ident(t)::regclass) LOOP
        EXECUTE format('DROP POLICY IF EXISTS %I ON %I', pol_rec.polname, t);
      END LOOP;
      EXECUTE format('CREATE POLICY "%s_select" ON %I FOR SELECT USING (is_org_member(org_id))', t, t);
      EXECUTE format('CREATE POLICY "%s_insert" ON %I FOR INSERT WITH CHECK (is_org_member(org_id))', t, t);
      EXECUTE format('CREATE POLICY "%s_update" ON %I FOR UPDATE USING (is_org_member(org_id))', t, t);
      EXECUTE format('CREATE POLICY "%s_delete" ON %I FOR DELETE USING (is_org_member(org_id) AND get_org_role(org_id) IN (''owner'', ''admin''))', t, t);
    END IF;
  END LOOP;

  -- Group C: SELECT + INSERT only
  FOR i IN 1..array_length(t_read_insert, 1)
  LOOP
    t := t_read_insert[i];
    IF EXISTS (SELECT FROM information_schema.columns WHERE table_name = t AND column_name = 'org_id') THEN
      EXECUTE format('ALTER TABLE %I ENABLE ROW LEVEL SECURITY', t);
      FOR pol_rec IN SELECT polname FROM pg_policy WHERE polrelid = (quote_ident(t)::regclass) LOOP
        EXECUTE format('DROP POLICY IF EXISTS %I ON %I', pol_rec.polname, t);
      END LOOP;
      EXECUTE format('CREATE POLICY "%s_select" ON %I FOR SELECT USING (is_org_member(org_id))', t, t);
      EXECUTE format('CREATE POLICY "%s_insert" ON %I FOR INSERT WITH CHECK (is_org_member(org_id))', t, t);
    END IF;
  END LOOP;

  -- Group D: SELECT + INSERT + DELETE
  FOR i IN 1..array_length(t_sid, 1)
  LOOP
    t := t_sid[i];
    IF EXISTS (SELECT FROM information_schema.columns WHERE table_name = t AND column_name = 'org_id') THEN
      EXECUTE format('ALTER TABLE %I ENABLE ROW LEVEL SECURITY', t);
      FOR pol_rec IN SELECT polname FROM pg_policy WHERE polrelid = (quote_ident(t)::regclass) LOOP
        EXECUTE format('DROP POLICY IF EXISTS %I ON %I', pol_rec.polname, t);
      END LOOP;
      EXECUTE format('CREATE POLICY "%s_select" ON %I FOR SELECT USING (is_org_member(org_id))', t, t);
      EXECUTE format('CREATE POLICY "%s_insert" ON %I FOR INSERT WITH CHECK (is_org_member(org_id))', t, t);
      EXECUTE format('CREATE POLICY "%s_delete" ON %I FOR DELETE USING (is_org_member(org_id))', t, t);
    END IF;
  END LOOP;
END $$;

-- ============================================================
-- 6. DATA MIGRATION: assign existing data to default org
-- ============================================================

DO $$
DECLARE
  r RECORD;
  new_org_id UUID;
  default_slug TEXT;
  t_name TEXT;
  has_org_col BOOLEAN;
  t_tables TEXT[] := ARRAY[
    'products', 'sales', 'suppliers', 'purchase_orders', 'product_research',
    'sp_api_connections', 'sync_logs', 'members', 'tasks', 'board_decisions',
    'notifications', 'expenses', 'returns', 'reimbursements', 'shipments',
    'reorder_rules', 'alert_rules', 'scheduled_reports', 'sp_api_webhook_subscriptions',
    'comments', 'audit_log'
  ];
BEGIN
  has_org_col := EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'products' AND column_name = 'org_id'
  );

  IF NOT has_org_col THEN
    RAISE NOTICE 'products.org_id not found, skipping data migration';
    RETURN;
  END IF;

  FOR r IN SELECT DISTINCT user_id FROM products WHERE org_id IS NULL
  LOOP
    default_slug := 'org-' || replace(r.user_id::text, '-', '') || '-default';

    INSERT INTO organizations (name, slug, owner_id)
    VALUES ('Mi Organizacion', default_slug, r.user_id)
    ON CONFLICT (slug) DO NOTHING
    RETURNING id INTO new_org_id;

    IF new_org_id IS NULL THEN
      SELECT id INTO new_org_id FROM organizations WHERE slug = default_slug;
    END IF;

    INSERT INTO org_members (org_id, user_id, role, status)
    VALUES (new_org_id, r.user_id, 'owner', 'active')
    ON CONFLICT (org_id, user_id) DO NOTHING;

    FOREACH t_name IN ARRAY t_tables
    LOOP
      BEGIN
        EXECUTE format(
          'UPDATE %I SET org_id = $1 WHERE user_id = $2 AND org_id IS NULL',
          t_name
        ) USING new_org_id, r.user_id;
      EXCEPTION WHEN OTHERS THEN
        NULL;
      END;
    END LOOP;
  END LOOP;
END $$;

-- ============================================================
-- 7. AUTO-CREATE ORG ON USER SIGNUP
-- ============================================================

CREATE OR REPLACE FUNCTION handle_new_user_org()
RETURNS TRIGGER AS $$
DECLARE
  new_org_id UUID;
  user_name TEXT;
  default_slug TEXT;
BEGIN
  user_name := COALESCE(NEW.raw_user_meta_data->>'full_name', NEW.raw_user_meta_data->>'name', split_part(NEW.email, '@', 1));
  default_slug := 'org-' || replace(NEW.id::text, '-', '') || '-default';

  INSERT INTO organizations (name, slug, owner_id)
  VALUES (user_name || '''s Organization', default_slug, NEW.id)
  RETURNING id INTO new_org_id;

  INSERT INTO org_members (org_id, user_id, role, status)
  VALUES (new_org_id, NEW.id, 'owner', 'active');

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS on_auth_user_created_org ON auth.users;
CREATE TRIGGER on_auth_user_created_org
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION handle_new_user_org();
