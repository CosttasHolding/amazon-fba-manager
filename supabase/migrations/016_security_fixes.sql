-- 016_security_fixes.sql
-- Fix critical RLS issues and drop stale policies

-- =============================================
-- 1. FIX audit_log INSERT policy
-- =============================================
-- Old policy allows ANY authenticated user to forge audit entries
DROP POLICY IF EXISTS "Service can insert audit log" ON audit_log;

CREATE POLICY "Users can insert own audit log"
  ON audit_log FOR INSERT
  WITH CHECK (auth.uid() = user_id);

-- =============================================
-- 2. DROP stale members policies from 009
-- =============================================
-- 009 created policies named: members_select, members_insert, members_update, members_delete
-- 014 tried to drop "Anyone can read members" etc. (wrong names) so 009 policies remain active
DROP POLICY IF EXISTS "members_select" ON members;
DROP POLICY IF EXISTS "members_insert" ON members;
DROP POLICY IF EXISTS "members_update" ON members;
DROP POLICY IF EXISTS "members_delete" ON members;

-- =============================================
-- 3. DROP stale company_members policies from 009
-- =============================================
-- Add missing UPDATE and DELETE policies for company_members
DROP POLICY IF EXISTS "company_members_select" ON company_members;
DROP POLICY IF EXISTS "company_members_insert" ON company_members;

CREATE POLICY "Authenticated users can read company_members"
  ON company_members FOR SELECT
  USING (auth.role() = 'authenticated');

CREATE POLICY "Authenticated users can insert company_members"
  ON company_members FOR INSERT
  WITH CHECK (auth.role() = 'authenticated');

CREATE POLICY "Authenticated users can update company_members"
  ON company_members FOR UPDATE
  USING (auth.role() = 'authenticated');

CREATE POLICY "Authenticated users can delete company_members"
  ON company_members FOR DELETE
  USING (auth.role() = 'authenticated');
