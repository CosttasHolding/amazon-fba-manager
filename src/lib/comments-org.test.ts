import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

const migration = readFileSync(
  join(process.cwd(), "supabase/migrations/047_scope_comments_rls.sql"),
  "utf8"
);
const route = readFileSync(
  join(process.cwd(), "src/app/api/comments/route.ts"),
  "utf8"
);

describe("comments tenant scoping", () => {
  it("filtra el GET por la organización resuelta", () => {
    expect(route).toContain('.eq("org_id", orgId)');
  });

  it("restringe lectura y mutations a members con org_id no nulo", () => {
    expect(migration).toContain("org_id IS NOT NULL");
    expect(migration).toContain("public.is_org_member(org_id)");
    expect(migration).toContain("user_id = auth.uid()");
    expect(migration).not.toMatch(/USING\s*\(\s*true\s*\)/i);
  });
});
