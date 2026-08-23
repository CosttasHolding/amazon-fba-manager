-- Protect legacy product/supplier relations used by service-role reports and alerts.

CREATE OR REPLACE FUNCTION public.validate_product_supplier_tenant()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  product_org_id uuid;
  supplier_org_id uuid;
BEGIN
  IF NEW.product_id IS NOT NULL THEN
    SELECT org_id INTO product_org_id FROM public.products WHERE id = NEW.product_id;
    IF product_org_id IS NULL OR product_org_id IS DISTINCT FROM NEW.org_id THEN
      RAISE EXCEPTION 'El producto no pertenece a la organización';
    END IF;
  END IF;

  IF TG_TABLE_NAME IN ('supplier_quotes', 'product_suppliers') AND NEW.supplier_id IS NOT NULL THEN
    SELECT org_id INTO supplier_org_id FROM public.suppliers WHERE id = NEW.supplier_id;
    IF supplier_org_id IS NULL OR supplier_org_id IS DISTINCT FROM NEW.org_id THEN
      RAISE EXCEPTION 'El proveedor no pertenece a la organización';
    END IF;
  END IF;

  RETURN NEW;
END;
$$;

DO $$
DECLARE
  target_table text;
  policy_record record;
  relation_check text;
  product_check text;
  supplier_check text;
  target_tables constant text[] := ARRAY['sales', 'stock_movements', 'inventory', 'supplier_quotes', 'product_suppliers'];
BEGIN
  FOREACH target_table IN ARRAY target_tables LOOP
    IF EXISTS (
      SELECT 1 FROM pg_class AS class_row
      JOIN pg_namespace AS namespace_row ON namespace_row.oid = class_row.relnamespace
      WHERE namespace_row.nspname = 'public'
        AND class_row.relname = target_table
        AND class_row.relkind IN ('r', 'p')
    ) THEN
      EXECUTE format('ALTER TABLE public.%I ENABLE ROW LEVEL SECURITY', target_table);

      FOR policy_record IN
        SELECT policyname FROM pg_policies
        WHERE schemaname = 'public' AND tablename = target_table
      LOOP
        EXECUTE format('DROP POLICY IF EXISTS %I ON public.%I', policy_record.policyname, target_table);
      END LOOP;

      product_check := format(
        'EXISTS (SELECT 1 FROM public.products AS product WHERE product.id = %I.product_id AND product.org_id = %I.org_id)',
        target_table, target_table
      );
      IF target_table = 'supplier_quotes' THEN
        product_check := format('(%I.product_id IS NULL OR %s)', target_table, product_check);
      END IF;
      relation_check := product_check;
      IF target_table IN ('supplier_quotes', 'product_suppliers') THEN
        supplier_check := format(
          'EXISTS (SELECT 1 FROM public.suppliers AS supplier WHERE supplier.id = %I.supplier_id AND supplier.org_id = %I.org_id)',
          target_table, target_table
        );
        relation_check := relation_check || ' AND ' || supplier_check;
      END IF;

      EXECUTE format(
        'CREATE POLICY %I ON public.%I FOR SELECT TO authenticated USING (org_id IS NOT NULL AND public.is_org_member(org_id) AND %s)',
        target_table || '_select_relation_member', target_table, relation_check
      );
      EXECUTE format(
        'CREATE POLICY %I ON public.%I FOR INSERT TO authenticated WITH CHECK (org_id IS NOT NULL AND public.is_org_member(org_id) AND public.get_org_role(org_id) IN (''owner'', ''admin'', ''editor'') AND %s)',
        target_table || '_insert_relation_editor', target_table, relation_check
      );
      EXECUTE format(
        'CREATE POLICY %I ON public.%I FOR UPDATE TO authenticated USING (org_id IS NOT NULL AND public.is_org_member(org_id) AND public.get_org_role(org_id) IN (''owner'', ''admin'', ''editor'') AND %s) WITH CHECK (org_id IS NOT NULL AND public.is_org_member(org_id) AND public.get_org_role(org_id) IN (''owner'', ''admin'', ''editor'') AND %s)',
        target_table || '_update_relation_editor', target_table, relation_check, relation_check
      );
      EXECUTE format(
        'CREATE POLICY %I ON public.%I FOR DELETE TO authenticated USING (org_id IS NOT NULL AND public.is_org_member(org_id) AND public.get_org_role(org_id) IN (''owner'', ''admin'', ''editor'') AND %s)',
        target_table || '_delete_relation_editor', target_table, relation_check
      );
    END IF;
  END LOOP;
END $$;

DROP TRIGGER IF EXISTS trg_validate_sales_product_tenant ON public.sales;
CREATE TRIGGER trg_validate_sales_product_tenant
  BEFORE INSERT OR UPDATE OF product_id, org_id ON public.sales
  FOR EACH ROW EXECUTE FUNCTION public.validate_product_supplier_tenant();

DROP TRIGGER IF EXISTS trg_validate_stock_movements_product_tenant ON public.stock_movements;
CREATE TRIGGER trg_validate_stock_movements_product_tenant
  BEFORE INSERT OR UPDATE OF product_id, org_id ON public.stock_movements
  FOR EACH ROW EXECUTE FUNCTION public.validate_product_supplier_tenant();

DROP TRIGGER IF EXISTS trg_validate_inventory_product_tenant ON public.inventory;
CREATE TRIGGER trg_validate_inventory_product_tenant
  BEFORE INSERT OR UPDATE OF product_id, org_id ON public.inventory
  FOR EACH ROW EXECUTE FUNCTION public.validate_product_supplier_tenant();

DROP TRIGGER IF EXISTS trg_validate_supplier_quotes_relation_tenant ON public.supplier_quotes;
CREATE TRIGGER trg_validate_supplier_quotes_relation_tenant
  BEFORE INSERT OR UPDATE OF product_id, supplier_id, org_id ON public.supplier_quotes
  FOR EACH ROW EXECUTE FUNCTION public.validate_product_supplier_tenant();

DROP TRIGGER IF EXISTS trg_validate_product_suppliers_relation_tenant ON public.product_suppliers;
CREATE TRIGGER trg_validate_product_suppliers_relation_tenant
  BEFORE INSERT OR UPDATE OF product_id, supplier_id, org_id ON public.product_suppliers
  FOR EACH ROW EXECUTE FUNCTION public.validate_product_supplier_tenant();
