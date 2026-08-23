-- 048_scope_legacy_tenant_tables_rls.sql
-- Close the RLS gap left by 039 without assigning ambiguous legacy rows.

DO $$
BEGIN
  IF EXISTS (
    SELECT 1
      FROM information_schema.tables
     WHERE table_schema = 'public'
       AND table_name IN ('products', 'inventory')
     GROUP BY table_schema
     HAVING COUNT(*) = 2
  ) AND EXISTS (
    SELECT 1
      FROM information_schema.columns
     WHERE table_schema = 'public'
       AND table_name IN ('products', 'inventory')
       AND column_name = 'org_id'
     GROUP BY table_schema
     HAVING COUNT(DISTINCT table_name) = 2
  ) THEN
    CREATE OR REPLACE FUNCTION public.auto_create_inventory()
    RETURNS TRIGGER
    LANGUAGE plpgsql
    AS $function$
    BEGIN
      INSERT INTO public.inventory(product_id, org_id)
      VALUES (NEW.id, NEW.org_id)
      ON CONFLICT (product_id) DO NOTHING;
      RETURN NEW;
    END;
    $function$;

    DROP TRIGGER IF EXISTS trg_auto_inv ON public.products;
    CREATE TRIGGER trg_auto_inv
      AFTER INSERT ON public.products
      FOR EACH ROW EXECUTE FUNCTION public.auto_create_inventory();
  END IF;
END $$;

DO $$
DECLARE
  target_table text;
  policy_record record;
  target_tables constant text[] := ARRAY[
    'stock_movements',
    'inventory',
    'ppc_campaigns',
    'ppc_daily_metrics',
    'amazon_payouts',
    'saved_calculations',
    'supplier_quotes',
    'product_suppliers'
  ];
BEGIN
  FOREACH target_table IN ARRAY target_tables LOOP
    IF EXISTS (
      SELECT 1
      FROM pg_class AS c
      JOIN pg_namespace AS n ON n.oid = c.relnamespace
      WHERE n.nspname = 'public'
        AND c.relname = target_table
        AND c.relkind IN ('r', 'p')
    ) AND EXISTS (
      SELECT 1
      FROM information_schema.columns
      WHERE table_schema = 'public'
        AND table_name = target_table
        AND column_name = 'org_id'
    ) THEN
      EXECUTE format('ALTER TABLE %I.%I ENABLE ROW LEVEL SECURITY', 'public', target_table);

      FOR policy_record IN
        SELECT policyname
        FROM pg_policies
        WHERE schemaname = 'public'
          AND tablename = target_table
      LOOP
        EXECUTE format(
          'DROP POLICY IF EXISTS %I ON %I.%I',
          policy_record.policyname,
          'public',
          target_table
        );
      END LOOP;

      EXECUTE format(
        'CREATE POLICY %I ON %I.%I FOR SELECT TO authenticated USING (org_id IS NOT NULL AND public.is_org_member(org_id))',
        target_table || '_select_org_member',
        'public',
        target_table
      );
      EXECUTE format(
        'CREATE POLICY %I ON %I.%I FOR INSERT TO authenticated WITH CHECK (org_id IS NOT NULL AND public.is_org_member(org_id))',
        target_table || '_insert_org_member',
        'public',
        target_table
      );
      EXECUTE format(
        'CREATE POLICY %I ON %I.%I FOR UPDATE TO authenticated USING (org_id IS NOT NULL AND public.is_org_member(org_id)) WITH CHECK (org_id IS NOT NULL AND public.is_org_member(org_id))',
        target_table || '_update_org_member',
        'public',
        target_table
      );
      EXECUTE format(
        'CREATE POLICY %I ON %I.%I FOR DELETE TO authenticated USING (org_id IS NOT NULL AND public.is_org_member(org_id))',
        target_table || '_delete_org_member',
        'public',
        target_table
      );
    END IF;
  END LOOP;
END $$;
