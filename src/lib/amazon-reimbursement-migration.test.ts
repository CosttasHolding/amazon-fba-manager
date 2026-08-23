import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

const migration = readFileSync(
  join(process.cwd(), "supabase/migrations/051_amazon_reimbursement_detection.sql"),
  "utf8",
);

describe("Amazon reimbursement detection migration", () => {
  it("defines tenant-scoped append-only evidence and movement candidates", () => {
    expect(migration).toContain("CREATE TABLE IF NOT EXISTS public.amazon_reimbursement_events");
    expect(migration).toContain("UNIQUE (org_id, source_key)");
    expect(migration).toContain("CREATE TABLE IF NOT EXISTS public.amazon_reimbursement_movement_matches");
    expect(migration).toContain("ALTER TABLE public.amazon_reimbursement_events ENABLE ROW LEVEL SECURITY");
    expect(migration).toContain("public.is_org_member(org_id)");
  });

  it("enforces tenant boundaries in database triggers", () => {
    expect(migration).toContain("validate_amazon_reimbursement_event_tenant");
    expect(migration).toContain("validate_amazon_reimbursement_movement_tenant");
    expect(migration).toContain("validate_reimbursement_tenant_links");
    expect(migration).toContain("validate_stock_movement_tenant_product");
    expect(migration).toContain("connection_org_id IS DISTINCT FROM NEW.org_id");
    expect(migration).toContain("movement_org_id IS DISTINCT FROM NEW.org_id");
    expect(migration).toContain("event_product_id IS NOT NULL AND movement_product_id IS DISTINCT FROM event_product_id");
  });

  it("extends sync types and restricts manual reimbursement writes to editors", () => {
    expect(migration).toContain("'reimbursements'))");
    expect(migration).toContain("get_org_role(org_id) IN ('owner', 'admin', 'editor')");
    expect(migration).toContain("protect_amazon_reimbursement_event_evidence");
    expect(migration).toContain("replace_amazon_reimbursement_movement_matches");
    expect(migration).not.toContain("CREATE POLICY reimbursements_insert\n      ON public.reimbursements\n      FOR INSERT TO authenticated\n      WITH CHECK (true)");
  });
});
