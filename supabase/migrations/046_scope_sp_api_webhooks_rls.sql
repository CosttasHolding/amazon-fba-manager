-- 046_scope_sp_api_webhooks_rls.sql
-- Las políticas anteriores permitían filas sin org_id y el INSERT de logs
-- tenía una comprobación incondicional, por lo que también aplicaba a authenticated.

ALTER TABLE sp_api_webhook_subscriptions ENABLE ROW LEVEL SECURITY;
ALTER TABLE sp_api_webhook_logs ENABLE ROW LEVEL SECURITY;

DO $$
DECLARE
  policy_record RECORD;
BEGIN
  FOR policy_record IN
    SELECT schemaname, tablename, policyname
    FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename IN ('sp_api_webhook_subscriptions', 'sp_api_webhook_logs')
  LOOP
    EXECUTE format(
      'DROP POLICY IF EXISTS %I ON %I.%I',
      policy_record.policyname,
      policy_record.schemaname,
      policy_record.tablename
    );
  END LOOP;
END $$;

CREATE POLICY "webhook_subscriptions_select_member"
  ON sp_api_webhook_subscriptions
  FOR SELECT
  TO authenticated
  USING (
    org_id IS NOT NULL
    AND user_id = auth.uid()
    AND public.is_org_member(org_id)
  );

CREATE POLICY "webhook_subscriptions_insert_member"
  ON sp_api_webhook_subscriptions
  FOR INSERT
  TO authenticated
  WITH CHECK (
    org_id IS NOT NULL
    AND user_id = auth.uid()
    AND public.is_org_member(org_id)
  );

CREATE POLICY "webhook_subscriptions_update_member"
  ON sp_api_webhook_subscriptions
  FOR UPDATE
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

CREATE POLICY "webhook_subscriptions_delete_member"
  ON sp_api_webhook_subscriptions
  FOR DELETE
  TO authenticated
  USING (
    org_id IS NOT NULL
    AND user_id = auth.uid()
    AND public.is_org_member(org_id)
  );

CREATE POLICY "webhook_logs_select_member"
  ON sp_api_webhook_logs
  FOR SELECT
  TO authenticated
  USING (
    org_id IS NOT NULL
    AND user_id = auth.uid()
    AND public.is_org_member(org_id)
  );

-- No authenticated INSERT policy is intentional. The webhook uses the
-- service-role client, which bypasses RLS; it is not a public policy.

CREATE INDEX IF NOT EXISTS idx_webhook_subscriptions_org_user
  ON sp_api_webhook_subscriptions(org_id, user_id)
  WHERE org_id IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_webhook_logs_org_created
  ON sp_api_webhook_logs(org_id, created_at DESC)
  WHERE org_id IS NOT NULL;
