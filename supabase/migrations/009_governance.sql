-- 009_governance.sql
-- Governance modules: company members, members (socios), tasks, succession, board decisions

-- 0. Add drive_refresh_token to user_settings
ALTER TABLE user_settings ADD COLUMN IF NOT EXISTS drive_refresh_token TEXT;

-- 1. Company members (multi-user support)
CREATE TABLE IF NOT EXISTS company_members (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  company_name TEXT NOT NULL DEFAULT 'Costtas Holding LLC',
  role_in_company TEXT DEFAULT 'member',
  joined_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(user_id)
);

ALTER TABLE company_members ENABLE ROW LEVEL SECURITY;

CREATE POLICY "company_members_select" ON company_members
  FOR SELECT USING (auth.role() = 'authenticated');

CREATE POLICY "company_members_insert" ON company_members
  FOR INSERT WITH CHECK (auth.role() = 'authenticated');

-- 2. Members (socios / LLC members)
CREATE TABLE IF NOT EXISTS members (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  full_name TEXT NOT NULL,
  email TEXT,
  ownership_pct NUMERIC(5,2) DEFAULT 0,
  status TEXT DEFAULT 'active' CHECK (status IN ('active','deceased','retired')),
  executor_name TEXT,
  executor_email TEXT,
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE members ENABLE ROW LEVEL SECURITY;

CREATE POLICY "members_select" ON members
  FOR SELECT USING (auth.role() = 'authenticated');

CREATE POLICY "members_insert" ON members
  FOR INSERT WITH CHECK (auth.role() = 'authenticated');

CREATE POLICY "members_update" ON members
  FOR UPDATE USING (auth.role() = 'authenticated');

CREATE POLICY "members_delete" ON members
  FOR DELETE USING (auth.role() = 'authenticated');

-- 3. Tasks (Kanban)
CREATE TABLE IF NOT EXISTS tasks (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  description TEXT,
  status TEXT DEFAULT 'pending' CHECK (status IN ('pending','in_progress','completed')),
  priority TEXT DEFAULT 'medium' CHECK (priority IN ('low','medium','high','urgent')),
  assigned_to UUID REFERENCES profiles(id),
  due_date TIMESTAMPTZ,
  module TEXT,
  related_to JSONB,
  completed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE tasks ENABLE ROW LEVEL SECURITY;

CREATE POLICY "tasks_select" ON tasks
  FOR SELECT USING (auth.role() = 'authenticated');

CREATE POLICY "tasks_insert" ON tasks
  FOR INSERT WITH CHECK (auth.role() = 'authenticated');

CREATE POLICY "tasks_update" ON tasks
  FOR UPDATE USING (auth.role() = 'authenticated');

CREATE POLICY "tasks_delete" ON tasks
  FOR DELETE USING (auth.role() = 'authenticated');

-- 4. Succession events
CREATE TABLE IF NOT EXISTS succession_events (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  member_id UUID REFERENCES members(id),
  event_type TEXT NOT NULL CHECK (event_type IN ('death','transfer','buyout','retirement')),
  status TEXT DEFAULT 'pending' CHECK (status IN ('pending','in_progress','completed','cancelled')),
  triggered_at TIMESTAMPTZ,
  valuation_amount NUMERIC(12,2),
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE succession_events ENABLE ROW LEVEL SECURITY;

CREATE POLICY "succession_events_select" ON succession_events
  FOR SELECT USING (auth.role() = 'authenticated');

CREATE POLICY "succession_events_insert" ON succession_events
  FOR INSERT WITH CHECK (auth.role() = 'authenticated');

CREATE POLICY "succession_events_update" ON succession_events
  FOR UPDATE USING (auth.role() = 'authenticated');

CREATE POLICY "succession_events_delete" ON succession_events
  FOR DELETE USING (auth.role() = 'authenticated');

-- 5. Board decisions
CREATE TABLE IF NOT EXISTS board_decisions (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  doc_reference TEXT,
  description TEXT,
  decision_date DATE,
  voted_by JSONB,
  status TEXT DEFAULT 'draft' CHECK (status IN ('draft','approved','rejected','executed')),
  file_url TEXT,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE board_decisions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "board_decisions_select" ON board_decisions
  FOR SELECT USING (auth.role() = 'authenticated');

CREATE POLICY "board_decisions_insert" ON board_decisions
  FOR INSERT WITH CHECK (auth.role() = 'authenticated');

CREATE POLICY "board_decisions_update" ON board_decisions
  FOR UPDATE USING (auth.role() = 'authenticated');

CREATE POLICY "board_decisions_delete" ON board_decisions
  FOR DELETE USING (auth.role() = 'authenticated');

-- Indexes
CREATE INDEX IF NOT EXISTS idx_members_user_id ON members(user_id);
CREATE INDEX IF NOT EXISTS idx_tasks_user_id ON tasks(user_id);
CREATE INDEX IF NOT EXISTS idx_tasks_status ON tasks(status);
CREATE INDEX IF NOT EXISTS idx_tasks_assigned_to ON tasks(assigned_to);
CREATE INDEX IF NOT EXISTS idx_succession_events_user_id ON succession_events(user_id);
CREATE INDEX IF NOT EXISTS idx_board_decisions_user_id ON board_decisions(user_id);

-- Updated_at triggers
DROP FUNCTION IF EXISTS trigger_set_updated_at() CASCADE;

CREATE OR REPLACE FUNCTION trigger_set_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER set_updated_at_members BEFORE UPDATE ON members
  FOR EACH ROW EXECUTE FUNCTION trigger_set_updated_at();

CREATE TRIGGER set_updated_at_tasks BEFORE UPDATE ON tasks
  FOR EACH ROW EXECUTE FUNCTION trigger_set_updated_at();

CREATE TRIGGER set_updated_at_succession_events BEFORE UPDATE ON succession_events
  FOR EACH ROW EXECUTE FUNCTION trigger_set_updated_at();

CREATE TRIGGER set_updated_at_board_decisions BEFORE UPDATE ON board_decisions
  FOR EACH ROW EXECUTE FUNCTION trigger_set_updated_at();
