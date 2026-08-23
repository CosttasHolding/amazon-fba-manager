-- Harden FBA shipment relations and mutation roles after migration 052.

DO $$
DECLARE
  policy_record record;
BEGIN
  FOR policy_record IN
    SELECT policyname, tablename
    FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename IN ('fba_shipments', 'fba_shipment_items', 'returns')
  LOOP
    EXECUTE format(
      'DROP POLICY IF EXISTS %I ON public.%I',
      policy_record.policyname,
      policy_record.tablename
    );
  END LOOP;
END $$;

CREATE POLICY fba_shipments_select_org_member
  ON public.fba_shipments FOR SELECT TO authenticated
  USING (org_id IS NOT NULL AND public.is_org_member(org_id));

CREATE POLICY fba_shipments_insert_org_editor
  ON public.fba_shipments FOR INSERT TO authenticated
  WITH CHECK (
    org_id IS NOT NULL
    AND public.is_org_member(org_id)
    AND public.get_org_role(org_id) IN ('owner', 'admin', 'editor')
    AND (
      po_id IS NULL
      OR EXISTS (
        SELECT 1 FROM public.purchase_orders AS purchase_order
        WHERE purchase_order.id = fba_shipments.po_id
          AND purchase_order.org_id = fba_shipments.org_id
      )
    )
  );

CREATE POLICY fba_shipments_update_org_editor
  ON public.fba_shipments FOR UPDATE TO authenticated
  USING (
    org_id IS NOT NULL
    AND public.is_org_member(org_id)
    AND public.get_org_role(org_id) IN ('owner', 'admin', 'editor')
  )
  WITH CHECK (
    org_id IS NOT NULL
    AND public.is_org_member(org_id)
    AND public.get_org_role(org_id) IN ('owner', 'admin', 'editor')
    AND (
      po_id IS NULL
      OR EXISTS (
        SELECT 1 FROM public.purchase_orders AS purchase_order
        WHERE purchase_order.id = fba_shipments.po_id
          AND purchase_order.org_id = fba_shipments.org_id
      )
    )
  );

CREATE POLICY fba_shipments_delete_org_editor
  ON public.fba_shipments FOR DELETE TO authenticated
  USING (
    org_id IS NOT NULL
    AND public.is_org_member(org_id)
    AND public.get_org_role(org_id) IN ('owner', 'admin', 'editor')
  );

CREATE POLICY fba_shipment_items_select_org_member
  ON public.fba_shipment_items FOR SELECT TO authenticated
  USING (
    org_id IS NOT NULL
    AND public.is_org_member(org_id)
    AND EXISTS (
      SELECT 1 FROM public.fba_shipments AS shipment
      WHERE shipment.id = fba_shipment_items.shipment_id
        AND shipment.org_id = fba_shipment_items.org_id
    )
  );

CREATE POLICY fba_shipment_items_insert_org_editor
  ON public.fba_shipment_items FOR INSERT TO authenticated
  WITH CHECK (
    org_id IS NOT NULL
    AND public.is_org_member(org_id)
    AND public.get_org_role(org_id) IN ('owner', 'admin', 'editor')
    AND EXISTS (
      SELECT 1 FROM public.fba_shipments AS shipment
      WHERE shipment.id = fba_shipment_items.shipment_id
        AND shipment.org_id = fba_shipment_items.org_id
    )
  );

CREATE POLICY fba_shipment_items_update_org_editor
  ON public.fba_shipment_items FOR UPDATE TO authenticated
  USING (
    org_id IS NOT NULL
    AND public.is_org_member(org_id)
    AND public.get_org_role(org_id) IN ('owner', 'admin', 'editor')
    AND EXISTS (
      SELECT 1 FROM public.fba_shipments AS shipment
      WHERE shipment.id = fba_shipment_items.shipment_id
        AND shipment.org_id = fba_shipment_items.org_id
    )
  )
  WITH CHECK (
    org_id IS NOT NULL
    AND public.is_org_member(org_id)
    AND public.get_org_role(org_id) IN ('owner', 'admin', 'editor')
    AND EXISTS (
      SELECT 1 FROM public.fba_shipments AS shipment
      WHERE shipment.id = fba_shipment_items.shipment_id
        AND shipment.org_id = fba_shipment_items.org_id
    )
  );

CREATE POLICY fba_shipment_items_delete_org_editor
  ON public.fba_shipment_items FOR DELETE TO authenticated
  USING (
    org_id IS NOT NULL
    AND public.is_org_member(org_id)
    AND public.get_org_role(org_id) IN ('owner', 'admin', 'editor')
    AND EXISTS (
      SELECT 1 FROM public.fba_shipments AS shipment
      WHERE shipment.id = fba_shipment_items.shipment_id
        AND shipment.org_id = fba_shipment_items.org_id
    )
  );

CREATE POLICY returns_select_org_member
  ON public.returns FOR SELECT TO authenticated
  USING (org_id IS NOT NULL AND public.is_org_member(org_id));

CREATE POLICY returns_insert_org_editor
  ON public.returns FOR INSERT TO authenticated
  WITH CHECK (
    org_id IS NOT NULL
    AND public.is_org_member(org_id)
    AND public.get_org_role(org_id) IN ('owner', 'admin', 'editor')
  );

CREATE POLICY returns_update_org_editor
  ON public.returns FOR UPDATE TO authenticated
  USING (org_id IS NOT NULL AND public.is_org_member(org_id) AND public.get_org_role(org_id) IN ('owner', 'admin', 'editor'))
  WITH CHECK (org_id IS NOT NULL AND public.is_org_member(org_id) AND public.get_org_role(org_id) IN ('owner', 'admin', 'editor'));

CREATE POLICY returns_delete_org_editor
  ON public.returns FOR DELETE TO authenticated
  USING (org_id IS NOT NULL AND public.is_org_member(org_id) AND public.get_org_role(org_id) IN ('owner', 'admin', 'editor'));
