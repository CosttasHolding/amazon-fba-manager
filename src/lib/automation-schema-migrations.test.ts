import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

const migration044 = readFileSync(
  join(process.cwd(), "supabase/migrations/044_scope_alert_history_and_shared_links_by_org.sql"),
  "utf8"
);
const migration047 = readFileSync(
  join(process.cwd(), "supabase/migrations/047_scope_comments_rls.sql"),
  "utf8"
);
const migration049 = readFileSync(
  join(process.cwd(), "supabase/migrations/049_create_automation_tables_if_missing.sql"),
  "utf8"
);

describe("automation schema compatibility migrations", () => {
  it("bootstraps alert history and shared links before their tenant policies", () => {
    expect(migration044).toContain("CREATE TABLE IF NOT EXISTS public.alert_history");
    expect(migration044).toContain("CREATE TABLE IF NOT EXISTS public.shared_links");
    expect(migration044).toContain("ADD COLUMN IF NOT EXISTS org_id UUID REFERENCES public.organizations");
    expect(migration044.indexOf("CREATE TABLE IF NOT EXISTS public.alert_history")).toBeLessThan(
      migration044.indexOf("CREATE POLICY \"Users see alert history in own orgs\"")
    );
    expect(migration044).toContain("org_id IS NOT NULL");
    expect(migration044).toContain("is_org_member(org_id)");
    expect(migration044).not.toMatch(/CREATE POLICY\s+"Anyone can read active shared link/i);
  });

  it("bootstraps comments before the parent trigger and tenant policies", () => {
    expect(migration047).toContain("CREATE TABLE IF NOT EXISTS public.comments");
    expect(migration047).toContain("CREATE INDEX IF NOT EXISTS idx_comments_org");
    expect(migration047.indexOf("CREATE TABLE IF NOT EXISTS public.comments")).toBeLessThan(
      migration047.indexOf("CREATE OR REPLACE FUNCTION public.enforce_comment_parent_org")
    );
    expect(migration047).toContain("org_id IS NOT NULL");
    expect(migration047).toContain("public.is_org_member(org_id)");
  });

  it("creates all automation tables with fail-closed authenticated policies", () => {
    for (const table of ["alert_rules", "reorder_rules", "scheduled_reports"]) {
      expect(migration049).toContain(`CREATE TABLE IF NOT EXISTS public.${table}`);
      expect(migration049).toContain(`ALTER TABLE public.${table}`);
      expect(migration049).toContain(`ALTER TABLE public.${table} ENABLE ROW LEVEL SECURITY`);
      expect(migration049).toContain(`CREATE POLICY ${table}_org_member`);
    }

    expect(migration049).toContain("TO authenticated");
    expect(migration049).toContain("org_id IS NOT NULL");
    expect(migration049).toContain("user_id = auth.uid()");
    expect(migration049).toContain("public.is_org_member(org_id)");
    expect(migration049).toContain("to_regprocedure('public.update_updated_at_column()') IS NOT NULL");
    expect(migration049).toContain("DROP TRIGGER IF EXISTS");
    expect(migration049).not.toMatch(/WITH CHECK\s*\(\s*true\s*\)/i);
  });
});
