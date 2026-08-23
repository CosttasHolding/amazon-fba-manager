-- Enforce product-to-tenant relations for direct Supabase writes and service-role jobs.

CREATE OR REPLACE FUNCTION public.validate_fba_shipment_tenant()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  related_org_id uuid;
BEGIN
  IF NEW.po_id IS NOT NULL THEN
    SELECT org_id INTO related_org_id
    FROM public.purchase_orders
    WHERE id = NEW.po_id;

    IF related_org_id IS NULL OR related_org_id IS DISTINCT FROM NEW.org_id THEN
      RAISE EXCEPTION 'La orden de compra no pertenece a la organización del envío';
    END IF;
  END IF;
  RETURN NEW;
END;
$$;

CREATE OR REPLACE FUNCTION public.validate_fba_shipment_item_tenant()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  shipment_org_id uuid;
  product_org_id uuid;
BEGIN
  SELECT org_id INTO shipment_org_id FROM public.fba_shipments WHERE id = NEW.shipment_id;
  SELECT org_id INTO product_org_id FROM public.products WHERE id = NEW.product_id;

  IF shipment_org_id IS NULL OR shipment_org_id IS DISTINCT FROM NEW.org_id
     OR product_org_id IS NULL OR product_org_id IS DISTINCT FROM NEW.org_id THEN
    RAISE EXCEPTION 'El item no pertenece a la organización del envío';
  END IF;
  RETURN NEW;
END;
$$;

CREATE OR REPLACE FUNCTION public.validate_return_product_tenant()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  product_org_id uuid;
BEGIN
  SELECT org_id INTO product_org_id FROM public.products WHERE id = NEW.product_id;
  IF product_org_id IS NULL OR product_org_id IS DISTINCT FROM NEW.org_id THEN
    RAISE EXCEPTION 'El producto no pertenece a la organización de la devolución';
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_validate_fba_shipment_tenant ON public.fba_shipments;
CREATE TRIGGER trg_validate_fba_shipment_tenant
  BEFORE INSERT OR UPDATE OF po_id, org_id ON public.fba_shipments
  FOR EACH ROW EXECUTE FUNCTION public.validate_fba_shipment_tenant();

DROP TRIGGER IF EXISTS trg_validate_fba_shipment_item_tenant ON public.fba_shipment_items;
CREATE TRIGGER trg_validate_fba_shipment_item_tenant
  BEFORE INSERT OR UPDATE OF shipment_id, product_id, org_id ON public.fba_shipment_items
  FOR EACH ROW EXECUTE FUNCTION public.validate_fba_shipment_item_tenant();

DROP TRIGGER IF EXISTS trg_validate_return_product_tenant ON public.returns;
CREATE TRIGGER trg_validate_return_product_tenant
  BEFORE INSERT OR UPDATE OF product_id, org_id ON public.returns
  FOR EACH ROW EXECUTE FUNCTION public.validate_return_product_tenant();

DROP POLICY IF EXISTS fba_shipment_items_select_org_member ON public.fba_shipment_items;
DROP POLICY IF EXISTS fba_shipment_items_insert_org_editor ON public.fba_shipment_items;
DROP POLICY IF EXISTS fba_shipment_items_update_org_editor ON public.fba_shipment_items;
DROP POLICY IF EXISTS fba_shipment_items_delete_org_editor ON public.fba_shipment_items;

CREATE POLICY fba_shipment_items_select_org_member
  ON public.fba_shipment_items FOR SELECT TO authenticated
  USING (
    org_id IS NOT NULL AND public.is_org_member(org_id)
    AND EXISTS (SELECT 1 FROM public.fba_shipments shipment WHERE shipment.id = fba_shipment_items.shipment_id AND shipment.org_id = fba_shipment_items.org_id)
    AND EXISTS (SELECT 1 FROM public.products product WHERE product.id = fba_shipment_items.product_id AND product.org_id = fba_shipment_items.org_id)
  );

CREATE POLICY fba_shipment_items_insert_org_editor
  ON public.fba_shipment_items FOR INSERT TO authenticated
  WITH CHECK (
    org_id IS NOT NULL AND public.is_org_member(org_id)
    AND public.get_org_role(org_id) IN ('owner', 'admin', 'editor')
    AND EXISTS (SELECT 1 FROM public.fba_shipments shipment WHERE shipment.id = fba_shipment_items.shipment_id AND shipment.org_id = fba_shipment_items.org_id)
    AND EXISTS (SELECT 1 FROM public.products product WHERE product.id = fba_shipment_items.product_id AND product.org_id = fba_shipment_items.org_id)
  );

CREATE POLICY fba_shipment_items_update_org_editor
  ON public.fba_shipment_items FOR UPDATE TO authenticated
  USING (
    org_id IS NOT NULL AND public.is_org_member(org_id)
    AND public.get_org_role(org_id) IN ('owner', 'admin', 'editor')
    AND EXISTS (SELECT 1 FROM public.fba_shipments shipment WHERE shipment.id = fba_shipment_items.shipment_id AND shipment.org_id = fba_shipment_items.org_id)
    AND EXISTS (SELECT 1 FROM public.products product WHERE product.id = fba_shipment_items.product_id AND product.org_id = fba_shipment_items.org_id)
  )
  WITH CHECK (
    org_id IS NOT NULL AND public.is_org_member(org_id)
    AND public.get_org_role(org_id) IN ('owner', 'admin', 'editor')
    AND EXISTS (SELECT 1 FROM public.fba_shipments shipment WHERE shipment.id = fba_shipment_items.shipment_id AND shipment.org_id = fba_shipment_items.org_id)
    AND EXISTS (SELECT 1 FROM public.products product WHERE product.id = fba_shipment_items.product_id AND product.org_id = fba_shipment_items.org_id)
  );

CREATE POLICY fba_shipment_items_delete_org_editor
  ON public.fba_shipment_items FOR DELETE TO authenticated
  USING (
    org_id IS NOT NULL AND public.is_org_member(org_id)
    AND public.get_org_role(org_id) IN ('owner', 'admin', 'editor')
    AND EXISTS (SELECT 1 FROM public.fba_shipments shipment WHERE shipment.id = fba_shipment_items.shipment_id AND shipment.org_id = fba_shipment_items.org_id)
    AND EXISTS (SELECT 1 FROM public.products product WHERE product.id = fba_shipment_items.product_id AND product.org_id = fba_shipment_items.org_id)
  );

DROP POLICY IF EXISTS returns_insert_org_editor ON public.returns;
DROP POLICY IF EXISTS returns_update_org_editor ON public.returns;

CREATE POLICY returns_insert_org_editor
  ON public.returns FOR INSERT TO authenticated
  WITH CHECK (
    org_id IS NOT NULL AND public.is_org_member(org_id)
    AND public.get_org_role(org_id) IN ('owner', 'admin', 'editor')
    AND EXISTS (SELECT 1 FROM public.products product WHERE product.id = returns.product_id AND product.org_id = returns.org_id)
  );

CREATE POLICY returns_update_org_editor
  ON public.returns FOR UPDATE TO authenticated
  USING (
    org_id IS NOT NULL AND public.is_org_member(org_id)
    AND public.get_org_role(org_id) IN ('owner', 'admin', 'editor')
    AND EXISTS (SELECT 1 FROM public.products product WHERE product.id = returns.product_id AND product.org_id = returns.org_id)
  )
  WITH CHECK (
    org_id IS NOT NULL AND public.is_org_member(org_id)
    AND public.get_org_role(org_id) IN ('owner', 'admin', 'editor')
    AND EXISTS (SELECT 1 FROM public.products product WHERE product.id = returns.product_id AND product.org_id = returns.org_id)
  );
