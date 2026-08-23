-- 049_create_automation_tables_if_missing.sql
-- Restore automation tables without assigning ambiguous legacy rows.

CREATE TABLE IF NOT EXISTS public.alert_rules (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  description TEXT,
  entity TEXT NOT NULL CHECK (entity IN ('inventory', 'sales', 'profitability', 'price', 'ppc')),
  condition_type TEXT NOT NULL CHECK (condition_type IN ('low_stock', 'out_of_stock', 'overstock', 'low_margin', 'sales_drop', 'price_change', 'roi_below', 'ppc_overbudget')),
  threshold NUMERIC,
  time_window TEXT CHECK (time_window IN ('1h', '24h', '7d', '30d')),
  comparison TEXT CHECK (comparison IN ('lt', 'gt', 'eq', 'lte', 'gte')),
  channel TEXT NOT NULL DEFAULT 'in_app' CHECK (channel IN ('in_app', 'email', 'both')),
  enabled BOOLEAN NOT NULL DEFAULT true,
  last_triggered_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  org_id UUID REFERENCES public.organizations(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS public.reorder_rules (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  product_id UUID NOT NULL REFERENCES public.products(id) ON DELETE CASCADE,
  supplier_id UUID REFERENCES public.suppliers(id) ON DELETE SET NULL,
  min_stock INTEGER NOT NULL DEFAULT 10,
  max_stock INTEGER NOT NULL DEFAULT 100,
  auto_po BOOLEAN NOT NULL DEFAULT false,
  lead_time_days INTEGER NOT NULL DEFAULT 30,
  safety_stock_days INTEGER NOT NULL DEFAULT 14,
  notes TEXT,
  enabled BOOLEAN NOT NULL DEFAULT true,
  last_evaluated_at TIMESTAMPTZ,
  last_po_generated_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  org_id UUID REFERENCES public.organizations(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS public.scheduled_reports (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  template TEXT NOT NULL CHECK (template IN ('profitability', 'inventory', 'sales-summary', 'roi-ranking')),
  frequency TEXT NOT NULL CHECK (frequency IN ('daily', 'weekly', 'monthly')),
  day_of_week INTEGER CHECK (day_of_week BETWEEN 0 AND 6),
  day_of_month INTEGER CHECK (day_of_month BETWEEN 1 AND 31),
  time TIME NOT NULL DEFAULT '08:00',
  channel TEXT NOT NULL DEFAULT 'email' CHECK (channel IN ('email', 'in_app', 'both')),
  recipients TEXT[] DEFAULT '{}',
  format TEXT NOT NULL DEFAULT 'pdf' CHECK (format IN ('pdf', 'excel', 'both')),
  enabled BOOLEAN NOT NULL DEFAULT true,
  last_sent_at TIMESTAMPTZ,
  next_run_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  org_id UUID REFERENCES public.organizations(id) ON DELETE CASCADE
);

ALTER TABLE public.alert_rules
  ADD COLUMN IF NOT EXISTS org_id UUID REFERENCES public.organizations(id) ON DELETE CASCADE;

ALTER TABLE public.reorder_rules
  ADD COLUMN IF NOT EXISTS org_id UUID REFERENCES public.organizations(id) ON DELETE CASCADE;

ALTER TABLE public.scheduled_reports
  ADD COLUMN IF NOT EXISTS org_id UUID REFERENCES public.organizations(id) ON DELETE CASCADE;

DO $$
DECLARE
  target_table TEXT;
  target_attnum SMALLINT;
  target_tables CONSTANT TEXT[] := ARRAY['alert_rules', 'reorder_rules', 'scheduled_reports'];
BEGIN
  FOREACH target_table IN ARRAY target_tables LOOP
    SELECT attnum
      INTO target_attnum
      FROM pg_attribute
     WHERE attrelid = to_regclass(format('public.%I', target_table))
       AND attname = 'org_id'
       AND NOT attisdropped;

    IF NOT EXISTS (
      SELECT 1
        FROM pg_constraint
       WHERE conrelid = to_regclass(format('public.%I', target_table))
         AND confrelid = to_regclass('public.organizations')
         AND contype = 'f'
         AND conkey = ARRAY[target_attnum]::smallint[]
    ) THEN
      EXECUTE format(
        'ALTER TABLE public.%I ADD CONSTRAINT %I FOREIGN KEY (org_id) REFERENCES public.organizations(id) ON DELETE CASCADE NOT VALID',
        target_table,
        target_table || '_org_id_fkey'
      );
    END IF;
  END LOOP;
END $$;

DO $$
BEGIN
  IF to_regclass('public.alert_history') IS NOT NULL
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

CREATE INDEX IF NOT EXISTS idx_alert_rules_user ON public.alert_rules(user_id);
CREATE INDEX IF NOT EXISTS idx_alert_rules_enabled ON public.alert_rules(enabled);
CREATE INDEX IF NOT EXISTS idx_alert_rules_org ON public.alert_rules(org_id);

CREATE INDEX IF NOT EXISTS idx_reorder_rules_user ON public.reorder_rules(user_id);
CREATE INDEX IF NOT EXISTS idx_reorder_rules_product ON public.reorder_rules(product_id);
CREATE INDEX IF NOT EXISTS idx_reorder_rules_enabled ON public.reorder_rules(enabled);
CREATE INDEX IF NOT EXISTS idx_reorder_rules_org ON public.reorder_rules(org_id);

CREATE INDEX IF NOT EXISTS idx_scheduled_reports_user ON public.scheduled_reports(user_id);
CREATE INDEX IF NOT EXISTS idx_scheduled_reports_next_run
  ON public.scheduled_reports(next_run_at) WHERE enabled = true;
CREATE INDEX IF NOT EXISTS idx_scheduled_reports_org ON public.scheduled_reports(org_id);

ALTER TABLE public.alert_rules ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.reorder_rules ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.scheduled_reports ENABLE ROW LEVEL SECURITY;

DO $$
DECLARE
  target_table TEXT;
  policy_record RECORD;
BEGIN
  FOREACH target_table IN ARRAY ARRAY['alert_rules', 'reorder_rules', 'scheduled_reports'] LOOP
    FOR policy_record IN
      SELECT policyname
        FROM pg_policies
       WHERE schemaname = 'public'
         AND tablename = target_table
    LOOP
      EXECUTE format(
        'DROP POLICY IF EXISTS %I ON public.%I',
        policy_record.policyname,
        target_table
      );
    END LOOP;
  END LOOP;
END $$;

CREATE POLICY alert_rules_org_member
  ON public.alert_rules FOR ALL
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

CREATE POLICY reorder_rules_org_member
  ON public.reorder_rules FOR ALL
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

CREATE POLICY scheduled_reports_org_member
  ON public.scheduled_reports FOR ALL
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

DROP TRIGGER IF EXISTS set_updated_at_alert_rules ON public.alert_rules;
DROP TRIGGER IF EXISTS set_updated_at_reorder_rules ON public.reorder_rules;
DROP TRIGGER IF EXISTS set_updated_at_scheduled_reports ON public.scheduled_reports;
DROP TRIGGER IF EXISTS trg_alert_rules_updated ON public.alert_rules;
DROP TRIGGER IF EXISTS trg_reorder_rules_updated ON public.reorder_rules;
DROP TRIGGER IF EXISTS trg_scheduled_reports_updated ON public.scheduled_reports;

DO $$
BEGIN
  IF to_regprocedure('public.update_updated_at_column()') IS NOT NULL THEN
    CREATE TRIGGER trg_alert_rules_updated
      BEFORE UPDATE ON public.alert_rules
      FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
    CREATE TRIGGER trg_reorder_rules_updated
      BEFORE UPDATE ON public.reorder_rules
      FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
    CREATE TRIGGER trg_scheduled_reports_updated
      BEFORE UPDATE ON public.scheduled_reports
      FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
  END IF;
END $$;
