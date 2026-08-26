import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";

const migration = readFileSync(
  resolve(process.cwd(), "supabase/migrations/057_drive_connections.sql"),
  "utf8",
);

describe("Drive connection transaction SQL contract", () => {
  it("enforces one named connection per organization and provider", () => {
    expect(migration).toContain("UNIQUE (org_id, provider, label)");
  });

  it("uses an atomic upsert and secret write", () => {
    expect(migration).toContain("CREATE OR REPLACE FUNCTION public.upsert_drive_connection");
    expect(migration).toContain("ON CONFLICT (org_id, provider, label)");
    expect(migration).toMatch(/ON CONFLICT\s+\(connection_id\)\s+DO UPDATE/);
    expect(migration).toContain("refresh_token_encrypted");
  });

  it("uses row locking and an atomic revoke", () => {
    expect(migration).toContain("FOR UPDATE");
    expect(migration).toContain("CREATE OR REPLACE FUNCTION public.revoke_drive_connection");
    expect(migration).toContain("DELETE FROM public.drive_connection_secrets");
  });

  it("exposes both functions only to service_role", () => {
    expect(migration).toContain("REVOKE ALL ON FUNCTION public.upsert_drive_connection");
    expect(migration).toContain("REVOKE ALL ON FUNCTION public.revoke_drive_connection");
    expect(migration).toContain("GRANT EXECUTE ON FUNCTION public.upsert_drive_connection");
    expect(migration).toContain("GRANT EXECUTE ON FUNCTION public.revoke_drive_connection");
  });
});
