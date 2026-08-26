import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";

const migration = readFileSync(
  resolve(process.cwd(), "supabase/migrations/058_harden_drive_tenant_boundaries.sql"),
  "utf8",
);

describe("Drive security migration 058 contract", () => {
  it("creates the single-use OAuth state table with tenant constraints", () => {
    expect(migration).toContain("CREATE TABLE public.drive_oauth_states");
    expect(migration).toContain("state_hash TEXT PRIMARY KEY");
    expect(migration).toContain("user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE");
    expect(migration).toContain("org_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE");
    expect(migration).toContain("FOREIGN KEY (org_id, user_id)");
    expect(migration).toContain("REFERENCES public.org_members(org_id, user_id)");
    expect(migration).toContain("root_folder_id TEXT NOT NULL");
    expect(migration).toContain("expires_at TIMESTAMPTZ NOT NULL");
    expect(migration).toContain("created_at TIMESTAMPTZ NOT NULL DEFAULT now()");
    expect(migration).toContain("(org_id, expires_at)");
  });

  it("denies authenticated access and exposes atomic state consumption only to service role", () => {
    expect(migration).toContain("ALTER TABLE public.drive_oauth_states ENABLE ROW LEVEL SECURITY");
    expect(migration).toContain("drive_oauth_states_authenticated_deny");
    expect(migration).toContain("USING (false)");
    expect(migration).toContain("WITH CHECK (false)");
    expect(migration).toContain("CREATE OR REPLACE FUNCTION public.consume_drive_oauth_state");
    expect(migration).toContain("expires_at > now()");
    expect(migration).toContain("DELETE FROM public.drive_oauth_states");
    expect(migration).toContain("GRANT EXECUTE ON FUNCTION public.consume_drive_oauth_state(TEXT)");
  });

  it("blocks non-service-role root changes and authorizes both RPC actors", () => {
    expect(migration).toContain("drive_connections_root_folder_immutable");
    expect(migration).toContain("auth.role() <> 'service_role'");
    expect(migration).toContain("p_actor_id UUID");
    expect(migration).toMatch(/CREATE OR REPLACE FUNCTION public\.upsert_drive_connection[\s\S]*?p_created_by UUID,\s+p_actor_id UUID[\s\S]*?user_id = p_actor_id[\s\S]*?role IN \('owner', 'admin'\)/);
    expect(migration).toMatch(/p_actor_id UUID[\s\S]*?role IN \('owner', 'admin'\)/);
    expect(migration).toContain("DROP FUNCTION IF EXISTS public.upsert_drive_connection(UUID, TEXT, TEXT, TEXT, UUID, TEXT, UUID)");
    expect(migration).toContain("DROP FUNCTION IF EXISTS public.revoke_drive_connection(UUID, UUID)");
    expect(migration).toContain("REVOKE ALL ON FUNCTION public.upsert_drive_connection(UUID, TEXT, TEXT, TEXT, UUID, UUID, TEXT, UUID)");
    expect(migration).toContain("GRANT EXECUTE ON FUNCTION public.upsert_drive_connection(UUID, TEXT, TEXT, TEXT, UUID, UUID, TEXT, UUID)");
    expect(migration).toContain("REVOKE ALL ON FUNCTION public.revoke_drive_connection(UUID, UUID, UUID)");
    expect(migration).toContain("GRANT EXECUTE ON FUNCTION public.revoke_drive_connection(UUID, UUID, UUID)");
    expect(migration).toContain("TO service_role");
    expect(migration).not.toContain("GOOGLE_DRIVE_FOLDER_ID");
  });
});
