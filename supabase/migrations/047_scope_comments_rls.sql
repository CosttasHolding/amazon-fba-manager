-- 047_scope_comments_rls.sql
-- Comments must belong to an organization and remain private to its members.

CREATE TABLE IF NOT EXISTS public.comments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  entity TEXT NOT NULL CHECK (entity IN ('product', 'order', 'shipment', 'supplier', 'task', 'member', 'board_decision')),
  entity_id UUID NOT NULL,
  content TEXT NOT NULL,
  parent_id UUID REFERENCES public.comments(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  org_id UUID REFERENCES public.organizations(id) ON DELETE CASCADE
);

ALTER TABLE public.comments
  ADD COLUMN IF NOT EXISTS org_id UUID REFERENCES public.organizations(id) ON DELETE CASCADE;

CREATE INDEX IF NOT EXISTS idx_comments_entity ON public.comments(entity, entity_id);
CREATE INDEX IF NOT EXISTS idx_comments_parent ON public.comments(parent_id);
CREATE INDEX IF NOT EXISTS idx_comments_user ON public.comments(user_id);
CREATE INDEX IF NOT EXISTS idx_comments_org ON public.comments(org_id);
CREATE INDEX IF NOT EXISTS idx_comments_entity_created
  ON public.comments(entity, entity_id, created_at);

CREATE OR REPLACE FUNCTION public.enforce_comment_parent_org()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
DECLARE
  parent_org_id UUID;
BEGIN
  IF NEW.parent_id IS NULL THEN
    RETURN NEW;
  END IF;

  SELECT org_id
    INTO parent_org_id
    FROM public.comments
   WHERE id = NEW.parent_id;

  IF parent_org_id IS NULL OR NEW.org_id IS NULL OR parent_org_id IS DISTINCT FROM NEW.org_id THEN
    RAISE EXCEPTION 'Comment parent must belong to the same organization'
      USING ERRCODE = 'check_violation';
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_comments_parent_org ON public.comments;
CREATE TRIGGER trg_comments_parent_org
  BEFORE INSERT OR UPDATE OF parent_id, org_id ON public.comments
  FOR EACH ROW EXECUTE FUNCTION public.enforce_comment_parent_org();

DROP TRIGGER IF EXISTS set_updated_at_comments ON public.comments;
DO $$
BEGIN
  IF to_regprocedure('public.update_updated_at_column()') IS NOT NULL THEN
    CREATE TRIGGER set_updated_at_comments
      BEFORE UPDATE ON public.comments
      FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
  END IF;
END $$;

DO $$
DECLARE
  policy_record RECORD;
BEGIN
  FOR policy_record IN
    SELECT policyname
      FROM pg_policies
     WHERE schemaname = 'public'
       AND tablename = 'comments'
  LOOP
    EXECUTE format(
      'DROP POLICY IF EXISTS %I ON public.comments',
      policy_record.policyname
    );
  END LOOP;
END $$;

DROP POLICY IF EXISTS "Users can read all comments" ON public.comments;
DROP POLICY IF EXISTS "Users can create comments" ON public.comments;
DROP POLICY IF EXISTS "Users can update own comments" ON public.comments;
DROP POLICY IF EXISTS "Users can delete own comments" ON public.comments;
DROP POLICY IF EXISTS "comments_select_org_member" ON public.comments;
DROP POLICY IF EXISTS "comments_insert_org_member" ON public.comments;
DROP POLICY IF EXISTS "comments_update_org_member" ON public.comments;
DROP POLICY IF EXISTS "comments_delete_org_member" ON public.comments;

CREATE POLICY "comments_select_org_member"
  ON public.comments FOR SELECT
  TO authenticated
  USING (
    org_id IS NOT NULL
    AND public.is_org_member(org_id)
  );

CREATE POLICY "comments_insert_org_member"
  ON public.comments FOR INSERT
  TO authenticated
  WITH CHECK (
    org_id IS NOT NULL
    AND user_id = auth.uid()
    AND public.is_org_member(org_id)
  );

CREATE POLICY "comments_update_org_member"
  ON public.comments FOR UPDATE
  TO authenticated
  USING (
    org_id IS NOT NULL
    AND user_id = auth.uid()
    AND public.is_org_member(org_id)
  )
  WITH CHECK (
    org_id IS NOT NULL
    AND user_id = auth.uid()
    AND public.is_org_member(org_id)
  );

CREATE POLICY "comments_delete_org_member"
  ON public.comments FOR DELETE
  TO authenticated
  USING (
    org_id IS NOT NULL
    AND user_id = auth.uid()
    AND public.is_org_member(org_id)
  );
