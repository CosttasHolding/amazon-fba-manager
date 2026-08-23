import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

const migration = readFileSync(
  join(process.cwd(), "supabase/migrations/046_scope_sp_api_webhooks_rls.sql"),
  "utf8"
);

describe("migración 046 de RLS para webhooks", () => {
  it("exige org_id, usuario autenticado y membership en policies authenticated", () => {
    expect(migration).toContain("org_id IS NOT NULL");
    expect(migration).toContain("user_id = auth.uid()");
    expect(migration).toContain("public.is_org_member(org_id)");
    expect(migration).toContain("TO authenticated");
  });

  it("no deja un INSERT de logs authenticated con WITH CHECK(true)", () => {
    expect(migration).not.toMatch(/ON sp_api_webhook_logs[\s\S]*WITH CHECK\s*\(\s*true\s*\)/i);
    expect(migration).toContain("No authenticated INSERT policy is intentional");
  });
});
