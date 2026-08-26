import { beforeAll, afterAll, describe, expect, it } from "vitest";
import { createClient, type SupabaseClient } from "@supabase/supabase-js";

const REQUIRED_ALLOW_VALUE = "I_UNDERSTAND_NON_PRODUCTION";

type IntegrationEnvironment = {
  url?: string;
  serviceRoleKey?: string;
  allow?: string;
};

function resolveIntegrationConfig(environment: IntegrationEnvironment):
  | { config: { url: string; key: string }; reason: null }
  | { config: null; reason: string } {
  if (environment.allow !== REQUIRED_ALLOW_VALUE) {
    return { config: null, reason: `DRIVE_DB_TEST_ALLOW must equal ${REQUIRED_ALLOW_VALUE}` };
  }
  if (!environment.url || !environment.serviceRoleKey) {
    return { config: null, reason: "DRIVE_DB_TEST_URL and DRIVE_DB_TEST_SERVICE_ROLE_KEY are required" };
  }

  let hostname: string;
  try {
    hostname = new URL(environment.url).hostname.toLowerCase().replace(/^\[|\]$/g, "");
  } catch {
    return { config: null, reason: "DRIVE_DB_TEST_URL is not a valid URL" };
  }

  const allowedHost = hostname === "localhost"
    || hostname === "127.0.0.1"
    || hostname === "::1"
    || hostname.endsWith(".staging.supabase.co");
  if (!allowedHost) {
    return { config: null, reason: "DRIVE_DB_TEST_URL must target localhost, loopback, or *.staging.supabase.co" };
  }

  return { config: { url: environment.url, key: environment.serviceRoleKey }, reason: null };
}

const integrationResolution = resolveIntegrationConfig({
  url: process.env.DRIVE_DB_TEST_URL,
  serviceRoleKey: process.env.DRIVE_DB_TEST_SERVICE_ROLE_KEY,
  allow: process.env.DRIVE_DB_TEST_ALLOW,
});

if (!integrationResolution.config) {
  console.info(`[drive integration] NOT RUN: ${integrationResolution.reason}.`);
}

describe("Drive integration configuration guard", () => {
  it("requires the exact explicit non-production opt-in", () => {
    expect(resolveIntegrationConfig({
      url: "https://project.staging.supabase.co",
      serviceRoleKey: "staging-key",
      allow: "I_UNDERSTAND_NON_PRODUCTION",
    }).config).toEqual({ url: "https://project.staging.supabase.co", key: "staging-key" });
    expect(resolveIntegrationConfig({
      url: "https://project.staging.supabase.co",
      serviceRoleKey: "staging-key",
      allow: "I_UNDERSTAND_NON_PRODUCTION_typo",
    }).config).toBeNull();
  });

  it("accepts only exact safe hosts and rejects lookalike domains", () => {
    const allowed = [
      "http://localhost:54321",
      "http://127.0.0.1:54321",
      "http://[::1]:54321",
      "https://project.staging.supabase.co",
    ];
    for (const url of allowed) {
      expect(resolveIntegrationConfig({ url, serviceRoleKey: "staging-key", allow: REQUIRED_ALLOW_VALUE }).config).not.toBeNull();
    }

    const rejected = [
      "https://staging.supabase.co.evil.example",
      "https://project.staging.supabase.co.evil.example",
      "https://project.test.supabase.co",
      "https://staging-project.example.com",
    ];
    for (const url of rejected) {
      expect(resolveIntegrationConfig({ url, serviceRoleKey: "staging-key", allow: REQUIRED_ALLOW_VALUE }).config).toBeNull();
    }
  });
});

const integrationConfig = integrationResolution.config;

if (!integrationConfig) {
  console.info(
    "[drive integration] NOT RUN: integration credentials are intentionally not read from production environment variables.",
  );
}

const integrationDescribe = integrationConfig ? describe : describe.skip;

integrationDescribe("Drive connection RPC integration", () => {
  let admin: SupabaseClient;
  let ownerId: string;
  let orgOneId: string;
  let orgTwoId: string;
  let orgOneConnectionId: string;
  let orgTwoConnectionId: string;
  const suffix = `${Date.now()}-${Math.random().toString(16).slice(2)}`;

  async function readSecret(connectionId: string, orgId: string): Promise<string | null> {
    const { data, error } = await admin
      .from("drive_connection_secrets")
      .select("connection_id, org_id, refresh_token_encrypted")
      .eq("connection_id", connectionId)
      .eq("org_id", orgId)
      .maybeSingle();
    expect(error).toBeNull();
    if (!data) return null;
    expect(data.connection_id).toBe(connectionId);
    expect(data.org_id).toBe(orgId);
    expect(typeof data.refresh_token_encrypted).toBe("string");
    expect(data.refresh_token_encrypted.length).toBeGreaterThan(0);
    return data.refresh_token_encrypted;
  }

  beforeAll(async () => {
    if (!integrationConfig) throw new Error("Drive integration configuration is unavailable");
    admin = createClient(integrationConfig.url, integrationConfig.key, {
      auth: { autoRefreshToken: false, persistSession: false },
    });

    const { data: profile, error: profileError } = await admin
      .from("profiles")
      .select("id")
      .limit(1)
      .single();
    if (profileError || !profile) throw new Error(`Could not find staging profile: ${profileError?.message || "unknown error"}`);
    ownerId = profile.id;

    const { data: organizations, error: organizationError } = await admin
      .from("organizations")
      .insert([
        { name: `Drive RPC Test One ${suffix}`, slug: `drive-rpc-one-${suffix}`, owner_id: ownerId },
        { name: `Drive RPC Test Two ${suffix}`, slug: `drive-rpc-two-${suffix}`, owner_id: ownerId },
      ])
      .select("id");
    if (organizationError || !organizations || organizations.length !== 2) {
      throw new Error(`Could not create staging organizations: ${organizationError?.message || "unknown error"}`);
    }
    [orgOneId, orgTwoId] = organizations.map((organization) => organization.id);

    const { error: membershipError } = await admin.from("org_members").insert([
      { org_id: orgOneId, user_id: ownerId, role: "owner", status: "active" },
      { org_id: orgTwoId, user_id: ownerId, role: "owner", status: "active" },
    ]);
    if (membershipError) throw new Error(`Could not create staging memberships: ${membershipError.message}`);
  });

  afterAll(async () => {
    if (!admin || !orgOneId || !orgTwoId) return;
    const { error } = await admin.from("organizations").delete().in("id", [orgOneId, orgTwoId]);
    if (error) console.error(`[drive integration] cleanup failed: ${error.message}`);
  });

  it("keeps two organizations isolated and verifies every upserted ciphertext", async () => {
    const first = await admin.rpc("upsert_drive_connection", {
      p_org_id: orgOneId,
      p_provider: "google_drive",
      p_label: "Proyecto",
      p_root_folder_id: `drive-rpc-root-one-${suffix}`,
      p_created_by: ownerId,
      p_actor_id: ownerId,
      p_refresh_token_encrypted: `encrypted-one-${suffix}`,
    });
    expect(first.error).toBeNull();
    expect(typeof first.data).toBe("string");
    orgOneConnectionId = first.data as string;
    expect(await readSecret(orgOneConnectionId, orgOneId)).toBe(`encrypted-one-${suffix}`);

    const second = await admin.rpc("upsert_drive_connection", {
      p_org_id: orgTwoId,
      p_provider: "google_drive",
      p_label: "Proyecto",
      p_root_folder_id: `drive-rpc-root-two-${suffix}`,
      p_created_by: ownerId,
      p_actor_id: ownerId,
      p_refresh_token_encrypted: `encrypted-two-${suffix}`,
    });
    expect(second.error).toBeNull();
    expect(typeof second.data).toBe("string");
    orgTwoConnectionId = second.data as string;
    expect(orgTwoConnectionId).not.toBe(orgOneConnectionId);
    expect(await readSecret(orgTwoConnectionId, orgTwoId)).toBe(`encrypted-two-${suffix}`);
    expect(await readSecret(orgOneConnectionId, orgOneId)).toBe(`encrypted-one-${suffix}`);
    expect(await readSecret(orgOneConnectionId, orgTwoId)).toBeNull();
    expect(await readSecret(orgTwoConnectionId, orgOneId)).toBeNull();

    const repeated = await admin.rpc("upsert_drive_connection", {
      p_org_id: orgOneId,
      p_provider: "google_drive",
      p_label: "Proyecto",
      p_root_folder_id: `drive-rpc-root-one-${suffix}`,
      p_created_by: ownerId,
      p_actor_id: ownerId,
      p_refresh_token_encrypted: `encrypted-one-repeated-${suffix}`,
    });
    expect(repeated.error).toBeNull();
    expect(repeated.data).toBe(orgOneConnectionId);
    expect(await readSecret(orgOneConnectionId, orgOneId)).toBe(`encrypted-one-repeated-${suffix}`);
    expect(await readSecret(orgTwoConnectionId, orgTwoId)).toBe(`encrypted-two-${suffix}`);

    const concurrent = await Promise.all([
      admin.rpc("upsert_drive_connection", {
        p_org_id: orgOneId,
        p_provider: "google_drive",
        p_label: "Proyecto",
        p_root_folder_id: `drive-rpc-root-one-${suffix}`,
        p_created_by: ownerId,
        p_actor_id: ownerId,
        p_refresh_token_encrypted: `encrypted-one-concurrent-a-${suffix}`,
      }),
      admin.rpc("upsert_drive_connection", {
        p_org_id: orgOneId,
        p_provider: "google_drive",
        p_label: "Proyecto",
        p_root_folder_id: `drive-rpc-root-one-${suffix}`,
        p_created_by: ownerId,
        p_actor_id: ownerId,
        p_refresh_token_encrypted: `encrypted-one-concurrent-b-${suffix}`,
      }),
    ]);
    expect(concurrent.every((result) => !result.error)).toBe(true);
    expect(new Set(concurrent.map((result) => result.data)).size).toBe(1);
    const concurrentSecret = await readSecret(orgOneConnectionId, orgOneId);
    expect([
      `encrypted-one-concurrent-a-${suffix}`,
      `encrypted-one-concurrent-b-${suffix}`,
    ]).toContain(concurrentSecret);
  });

  it("rolls back invalid upserts and revokes only one organization secret", async () => {
    const invalid = await admin.rpc("upsert_drive_connection", {
      p_org_id: orgOneId,
      p_provider: "google_drive",
      p_label: `Rollback ${suffix}`,
      p_root_folder_id: `drive-rpc-rollback-${suffix}`,
      p_created_by: ownerId,
      p_actor_id: ownerId,
      p_refresh_token_encrypted: "",
    });
    expect(invalid.error).not.toBeNull();

    const { data: rollbackRows } = await admin
      .from("drive_connections")
      .select("id")
      .eq("org_id", orgOneId)
      .eq("label", `Rollback ${suffix}`);
    expect(rollbackRows).toHaveLength(0);

    const revoked = await admin.rpc("revoke_drive_connection", {
      p_org_id: orgOneId,
      p_connection_id: orgOneConnectionId,
      p_actor_id: ownerId,
    });
    expect(revoked.error).toBeNull();

    const { data: revokedRow } = await admin
      .from("drive_connections")
      .select("status")
      .eq("id", orgOneConnectionId)
      .eq("org_id", orgOneId)
      .single();
    expect(revokedRow?.status).toBe("revoked");
    expect(await readSecret(orgOneConnectionId, orgOneId)).toBeNull();
    expect(await readSecret(orgTwoConnectionId, orgTwoId)).toBe(`encrypted-two-${suffix}`);
  });
});
