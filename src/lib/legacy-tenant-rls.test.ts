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
    expect(backupRoute).toContain("getOrgRootFolderId(drive, orgId)");
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
});
