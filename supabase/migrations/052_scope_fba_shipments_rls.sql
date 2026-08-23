-- Scope legacy FBA shipment tables by organization.
-- Ambiguous legacy rows remain inaccessible instead of being assigned to a tenant.

UPDATE public.fba_shipment_items AS item_row
SET org_id = product_row.org_id
FROM public.products AS product_row
WHERE item_row.product_id = product_row.id
  AND item_row.org_id IS NULL
  AND product_row.org_id IS NOT NULL;

UPDATE public.fba_shipments AS shipment_row
SET org_id = purchase_order.org_id
FROM public.purchase_orders AS purchase_order
WHERE shipment_row.po_id = purchase_order.id
  AND shipment_row.org_id IS NULL
  AND purchase_order.org_id IS NOT NULL;

UPDATE public.fba_shipments AS shipment_row
SET org_id = source.org_id
FROM (
  SELECT shipment_id, (array_agg(org_id))[1] AS org_id
  FROM public.fba_shipment_items
  WHERE org_id IS NOT NULL
  GROUP BY shipment_id
  HAVING COUNT(DISTINCT org_id) = 1
) AS source
WHERE shipment_row.id = source.shipment_id
  AND shipment_row.org_id IS NULL;

UPDATE public.fba_shipment_items AS item_row
SET org_id = shipment_row.org_id
FROM public.fba_shipments AS shipment_row
WHERE item_row.shipment_id = shipment_row.id
  AND item_row.org_id IS NULL
  AND shipment_row.org_id IS NOT NULL;

DO $$
DECLARE
  target_table text;
  policy_record record;
  target_tables constant text[] := ARRAY['fba_shipments', 'fba_shipment_items'];
BEGIN
  FOREACH target_table IN ARRAY target_tables LOOP
    IF EXISTS (
      SELECT 1
      FROM pg_class AS class_row
      JOIN pg_namespace AS namespace_row ON namespace_row.oid = class_row.relnamespace
      WHERE namespace_row.nspname = 'public'
        AND class_row.relname = target_table
        AND class_row.relkind IN ('r', 'p')
    ) AND EXISTS (
      SELECT 1
      FROM information_schema.columns
      WHERE table_schema = 'public'
        AND table_name = target_table
        AND column_name = 'org_id'
    ) THEN
      EXECUTE format('ALTER TABLE public.%I ENABLE ROW LEVEL SECURITY', target_table);

      FOR policy_record IN
        SELECT policyname
        FROM pg_policies
        WHERE schemaname = 'public'
          AND tablename = target_table
      LOOP
        EXECUTE format('DROP POLICY IF EXISTS %I ON public.%I', policy_record.policyname, target_table);
      END LOOP;

      EXECUTE format(
        'CREATE POLICY %I ON public.%I FOR SELECT TO authenticated USING (org_id IS NOT NULL AND public.is_org_member(org_id))',
        target_table || '_select_org_member', target_table
      );
      EXECUTE format(
        'CREATE POLICY %I ON public.%I FOR INSERT TO authenticated WITH CHECK (org_id IS NOT NULL AND public.is_org_member(org_id))',
        target_table || '_insert_org_member', target_table
      );
      EXECUTE format(
        'CREATE POLICY %I ON public.%I FOR UPDATE TO authenticated USING (org_id IS NOT NULL AND public.is_org_member(org_id)) WITH CHECK (org_id IS NOT NULL AND public.is_org_member(org_id))',
        target_table || '_update_org_member', target_table
      );
      EXECUTE format(
        'CREATE POLICY %I ON public.%I FOR DELETE TO authenticated USING (org_id IS NOT NULL AND public.is_org_member(org_id))',
        target_table || '_delete_org_member', target_table
      );
    END IF;
  END LOOP;
END $$;

CREATE INDEX IF NOT EXISTS idx_fba_shipments_org_created_at
  ON public.fba_shipments(org_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_fba_shipment_items_org
  ON public.fba_shipment_items(org_id);
