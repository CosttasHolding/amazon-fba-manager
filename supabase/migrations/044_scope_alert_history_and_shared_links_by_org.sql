-- Bootstrap the tables when an earlier migration was not applied.
-- alert_rules is created by 049, so its FK is added conditionally below.
CREATE TABLE IF NOT EXISTS public.alert_history (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  rule_id UUID,
  rule_name TEXT NOT NULL,
  entity TEXT NOT NULL,
  condition_type TEXT NOT NULL,
  severity TEXT NOT NULL DEFAULT 'warning' CHECK (severity IN ('critical', 'warning', 'info')),
  title TEXT NOT NULL,
  message TEXT NOT NULL,
  metadata JSONB DEFAULT '{}'::jsonb,
  read BOOLEAN NOT NULL DEFAULT false,
  channel_sent TEXT[] DEFAULT '{}',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  org_id UUID REFERENCES public.organizations(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS public.shared_links (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  token TEXT NOT NULL UNIQUE DEFAULT encode(gen_random_bytes(16), 'hex'),
  title TEXT NOT NULL DEFAULT 'Dashboard Compartido',
  active BOOLEAN NOT NULL DEFAULT true,
  expires_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  org_id UUID REFERENCES public.organizations(id) ON DELETE CASCADE
);

ALTER TABLE public.alert_history
  ADD COLUMN IF NOT EXISTS org_id UUID REFERENCES public.organizations(id) ON DELETE CASCADE;

ALTER TABLE public.shared_links
  ADD COLUMN IF NOT EXISTS org_id UUID REFERENCES public.organizations(id) ON DELETE CASCADE;

DO $$
BEGIN
  IF to_regclass('public.alert_rules') IS NOT NULL
     AND NOT EXISTS (
       SELECT 1
       FROM pg_constraint
       WHERE conrelid = 'public.alert_history'::regclass
         AND confrelid = to_regclass('public.alert_rules')
         AND contype = 'f'
         AND conkey = ARRAY[
           (SELECT attnum
              FROM pg_attribute
             WHERE attrelid = 'public.alert_history'::regclass
               AND attname = 'rule_id'
               AND NOT attisdropped)
         ]::smallint[]
     ) THEN
    ALTER TABLE public.alert_history
      ADD CONSTRAINT alert_history_rule_id_fkey
      FOREIGN KEY (rule_id) REFERENCES public.alert_rules(id) ON DELETE SET NULL
      NOT VALID;
  END IF;
END $$;

CREATE INDEX IF NOT EXISTS idx_alert_history_user ON public.alert_history(user_id);
CREATE INDEX IF NOT EXISTS idx_alert_history_created ON public.alert_history(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_alert_history_read ON public.alert_history(user_id, read);
CREATE INDEX IF NOT EXISTS idx_alert_history_org_created
  ON public.alert_history(org_id, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_shared_links_token ON public.shared_links(token);
CREATE INDEX IF NOT EXISTS idx_shared_links_user_id ON public.shared_links(user_id);
CREATE INDEX IF NOT EXISTS idx_shared_links_org ON public.shared_links(org_id);

ALTER TABLE public.alert_history ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.shared_links ENABLE ROW LEVEL SECURITY;

DROP TRIGGER IF EXISTS set_updated_at_shared_links ON public.shared_links;
DO $$
BEGIN
  IF to_regprocedure('public.update_updated_at_column()') IS NOT NULL THEN
    CREATE TRIGGER set_updated_at_shared_links
      BEFORE UPDATE ON public.shared_links
      FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
  END IF;
END $$;

DROP POLICY IF EXISTS "Users see own alert history" ON public.alert_history;
DROP POLICY IF EXISTS "Users see alert history in own orgs" ON public.alert_history;
CREATE POLICY "Users see alert history in own orgs"
  ON public.alert_history FOR ALL
  USING (
    org_id IS NOT NULL
    AND user_id = auth.uid()
    AND is_org_member(org_id)
  )
  WITH CHECK (
    org_id IS NOT NULL
    AND user_id = auth.uid()
    AND is_org_member(org_id)
  );

DROP POLICY IF EXISTS "Users can manage own shared links" ON public.shared_links;
DROP POLICY IF EXISTS "Anyone can read active shared link by token" ON public.shared_links;
DROP POLICY IF EXISTS "Members manage own shared links" ON public.shared_links;
CREATE POLICY "Members manage own shared links"
  ON public.shared_links FOR ALL
  TO authenticated
  USING (
    org_id IS NOT NULL
    AND user_id = auth.uid()
    AND is_org_member(org_id)
  )
  WITH CHECK (
    org_id IS NOT NULL
    AND user_id = auth.uid()
    AND is_org_member(org_id)
  );
