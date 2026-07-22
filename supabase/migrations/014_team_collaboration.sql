-- 014_team_collaboration.sql
-- Roles, audit log, comentarios para FASE 5

-- =============================================
-- 1. ROLES EN MEMBERS
-- =============================================
CREATE TYPE member_role AS ENUM ('admin', 'editor', 'viewer');

ALTER TABLE members ADD COLUMN IF NOT EXISTS role member_role NOT NULL DEFAULT 'editor';
ALTER TABLE members ADD COLUMN IF NOT EXISTS avatar_url TEXT;

-- =============================================
-- 2. AUDIT LOG
-- =============================================
CREATE TABLE IF NOT EXISTS audit_log (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  entity TEXT NOT NULL,
  entity_id UUID NOT NULL,
  action TEXT NOT NULL CHECK (action IN ('create', 'update', 'delete', 'view', 'export', 'share', 'archive')),
  changes JSONB DEFAULT '{}'::jsonb,
  ip_address TEXT,
  user_agent TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_audit_log_user ON audit_log(user_id);
CREATE INDEX IF NOT EXISTS idx_audit_log_entity ON audit_log(entity, entity_id);
CREATE INDEX IF NOT EXISTS idx_audit_log_created ON audit_log(created_at DESC);

ALTER TABLE audit_log ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can read own audit log"
  ON audit_log FOR SELECT
  USING (user_id = auth.uid());

CREATE POLICY "Service can insert audit log"
  ON audit_log FOR INSERT
  WITH CHECK (true);

-- =============================================
-- 3. COMENTARIOS
-- =============================================
CREATE TABLE IF NOT EXISTS comments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  entity TEXT NOT NULL CHECK (entity IN ('product', 'order', 'shipment', 'supplier', 'task', 'member', 'board_decision')),
  entity_id UUID NOT NULL,
  content TEXT NOT NULL,
  parent_id UUID REFERENCES comments(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_comments_entity ON comments(entity, entity_id);
CREATE INDEX IF NOT EXISTS idx_comments_parent ON comments(parent_id);
CREATE INDEX IF NOT EXISTS idx_comments_user ON comments(user_id);

ALTER TABLE comments ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can read all comments"
  ON comments FOR SELECT
  USING (true);

CREATE POLICY "Users can create comments"
  ON comments FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own comments"
  ON comments FOR UPDATE
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete own comments"
  ON comments FOR DELETE
  USING (auth.uid() = user_id);

CREATE TRIGGER set_updated_at_comments
  BEFORE UPDATE ON comments
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- =============================================
-- 4. TEAM DASHBOARD VIEW (opcional)
-- =============================================
-- Actualizar RLS de members para respetar roles
-- Los admins pueden todo, editors pueden editar, viewers solo lectura
DROP POLICY IF EXISTS "Anyone can read members" ON members;
DROP POLICY IF EXISTS "Users can insert members" ON members;
DROP POLICY IF EXISTS "Users can update own members" ON members;
DROP POLICY IF EXISTS "Users can delete own members" ON members;

CREATE POLICY "Members are readable by authenticated"
  ON members FOR SELECT
  USING (auth.role() = 'authenticated');

CREATE POLICY "Admins can insert members"
  ON members FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM members m
      WHERE m.user_id = auth.uid() AND m.role = 'admin'
    )
  );

CREATE POLICY "Admins and editors can update members"
  ON members FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM members m
      WHERE m.user_id = auth.uid() AND m.role IN ('admin', 'editor')
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM members m
      WHERE m.user_id = auth.uid() AND m.role IN ('admin', 'editor')
    )
  );

CREATE POLICY "Only admins can delete members"
  ON members FOR DELETE
  USING (
    EXISTS (
      SELECT 1 FROM members m
      WHERE m.user_id = auth.uid() AND m.role = 'admin'
    )
  );
