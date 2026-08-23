import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

const migration = readFileSync(
  join(process.cwd(), "supabase/migrations/048_scope_legacy_tenant_tables_rls.sql"),
  "utf8"
);
const commentsMigration = readFileSync(
  join(process.cwd(), "supabase/migrations/047_scope_comments_rls.sql"),
  "utf8"
);
const shipmentMigration = readFileSync(
  join(process.cwd(), "supabase/migrations/052_scope_fba_shipments_rls.sql"),
  "utf8"
);
const shipmentHardeningMigration = readFileSync(
  join(process.cwd(), "supabase/migrations/053_harden_fba_relations_rls.sql"),
  "utf8"
);
const productRelationMigration = readFileSync(
  join(process.cwd(), "supabase/migrations/054_validate_product_tenant_relations.sql"),
  "utf8"
);
const legacyRelationMigration = readFileSync(
  join(process.cwd(), "supabase/migrations/056_harden_product_relations_rls.sql"),
  "utf8"
);
const backupRoute = readFileSync(
  join(process.cwd(), "src/app/api/drive/backup/route.ts"),
  "utf8"
);

describe("legacy tenant isolation", () => {
  it("scopes every table from migration 039 with four fail-closed policies", () => {
    for (const table of [
      "stock_movements",
      "inventory",
      "ppc_campaigns",
      "ppc_daily_metrics",
      "amazon_payouts",
      "saved_calculations",
      "supplier_quotes",
      "product_suppliers",
    ]) {
      expect(migration).toContain(`'${table}'`);
    }

    expect(migration).toContain("ENABLE ROW LEVEL SECURITY");
    expect(migration).toContain("DROP POLICY IF EXISTS");
    expect(migration).toContain("org_id IS NOT NULL AND public.is_org_member(org_id)");
    expect(migration.match(/CREATE POLICY/g)).toHaveLength(4);
    expect(migration.match(/WITH CHECK/g)).toHaveLength(2);
    expect(migration).not.toContain("get_org_role");
  });

  it("uses the resolved organization for every backup query and Drive root", () => {
    expect(backupRoute).toContain("getDriveRootFolderId(drive, orgId)");
    expect(backupRoute).not.toContain('.eq("user_id", userId)');
    expect(backupRoute.match(/\.eq\("org_id", orgId\)/g)?.length).toBeGreaterThanOrEqual(5);
  });

  it("creates inventory with the product organization before enabling RLS", () => {
    expect(migration.indexOf("auto_create_inventory")).toBeGreaterThanOrEqual(0);
    expect(migration.indexOf("auto_create_inventory")).toBeLessThan(migration.indexOf("DO $$\nDECLARE"));
    expect(migration).toContain("INSERT INTO public.inventory(product_id, org_id)");
    expect(migration).toContain("VALUES (NEW.id, NEW.org_id)");
    expect(migration).toContain("ON CONFLICT (product_id) DO NOTHING");
    expect(migration).toContain("DROP TRIGGER IF EXISTS trg_auto_inv");
  });

  it("rejects comment parents from another organization", () => {
    expect(commentsMigration).toContain("BEFORE INSERT OR UPDATE OF parent_id, org_id");
    expect(commentsMigration).toContain("parent_org_id IS DISTINCT FROM NEW.org_id");
    expect(commentsMigration).toContain("ERRCODE = 'check_violation'");
  });

  it("backfills unambiguous shipments and replaces legacy user policies", () => {
    expect(shipmentMigration).toContain("'fba_shipments', 'fba_shipment_items'");
    expect(shipmentMigration).toContain("COUNT(DISTINCT org_id) = 1");
    expect(shipmentMigration).toContain("org_id IS NOT NULL AND public.is_org_member(org_id)");
    expect(shipmentMigration).toContain("DROP POLICY IF EXISTS");
    expect(shipmentMigration).toContain("idx_fba_shipments_org_created_at");
    expect(shipmentMigration).toContain("idx_fba_shipment_items_org");
  });

  it("prevents cross-tenant shipment relations and viewer mutations in RLS", () => {
    expect(shipmentHardeningMigration).toContain("purchase_order.org_id = fba_shipments.org_id");
    expect(shipmentHardeningMigration).toContain("shipment.org_id = fba_shipment_items.org_id");
    expect(shipmentHardeningMigration).toContain("get_org_role(org_id) IN ('owner', 'admin', 'editor')");
    expect(shipmentHardeningMigration).toContain("returns_insert_org_editor");
  });

  it("protects product references with RLS predicates and triggers", () => {
    expect(productRelationMigration).toContain("validate_fba_shipment_item_tenant");
    expect(productRelationMigration).toContain("product.org_id = fba_shipment_items.org_id");
    expect(productRelationMigration).toContain("product.org_id = returns.org_id");
    expect(productRelationMigration).toContain("trg_validate_return_product_tenant");
  });

  it("protects legacy sales, inventory and supplier relations", () => {
    for (const table of ["sales", "stock_movements", "inventory", "supplier_quotes", "product_suppliers"]) {
      expect(legacyRelationMigration).toContain(`'${table}'`);
    }
    expect(legacyRelationMigration).toContain("validate_product_supplier_tenant");
    expect(legacyRelationMigration).toContain("get_org_role(org_id) IN");
    expect(legacyRelationMigration).toContain("supplier.org_id =");
  });
});
