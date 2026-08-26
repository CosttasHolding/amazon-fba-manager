import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import { describe, expect, it, beforeAll } from "vitest";

const REQUIRED_ALLOW_VALUE = "I_UNDERSTAND_NON_PRODUCTION";
const CONNECTION_METADATA_SELECT = "id, org_id, label, root_folder_id, status";
const EXPECTED_DENIAL_CODES = new Set(["42501", "P0001"]);
const TEST_ATTEMPT_SUFFIX = `${Date.now()}-${Math.random().toString(16).slice(2)}`;

type IntegrationEnvironment = {
  allow?: string;
  url?: string;
  anonKey?: string;
  orgAUserToken?: string;
  orgBUserToken?: string;
  orgAId?: string;
  orgBId?: string;
  connectionAId?: string;
  connectionBId?: string;
};

type IntegrationConfig = {
  url: string;
  anonKey: string;
  orgAUserToken: string;
  orgBUserToken: string;
  orgAId: string;
  orgBId: string;
  connectionAId: string;
  connectionBId: string;
};

type ConnectionMetadata = {
  id: string;
  org_id: string;
  label: string;
  root_folder_id: string;
  status: string;
};

type MembershipMetadata = {
  user_id: string;
  org_id: string;
  role: string;
  status: string;
};

function resolveIntegrationConfig(environment: IntegrationEnvironment):
  | { config: IntegrationConfig; reason: null }
  | { config: null; reason: string } {
  if (environment.allow !== REQUIRED_ALLOW_VALUE) {
    return { config: null, reason: `DRIVE_TENANT_TEST_ALLOW must equal ${REQUIRED_ALLOW_VALUE}` };
  }

  const required = [
    ["DRIVE_TENANT_TEST_URL", environment.url],
    ["DRIVE_TENANT_TEST_ANON_KEY", environment.anonKey],
    ["DRIVE_TENANT_TEST_ORG_A_USER_TOKEN", environment.orgAUserToken],
    ["DRIVE_TENANT_TEST_ORG_B_USER_TOKEN", environment.orgBUserToken],
    ["DRIVE_TENANT_TEST_ORG_A_ID", environment.orgAId],
    ["DRIVE_TENANT_TEST_ORG_B_ID", environment.orgBId],
    ["DRIVE_TENANT_TEST_CONNECTION_A_ID", environment.connectionAId],
    ["DRIVE_TENANT_TEST_CONNECTION_B_ID", environment.connectionBId],
  ] as const;
  const missing = required.find(([, value]) => !value);
  if (missing) return { config: null, reason: `${missing[0]} is required` };

  let hostname: string;
  try {
    const parsedUrl = new URL(environment.url as string);
    hostname = parsedUrl.hostname.toLowerCase().replace(/^\[|\]$/g, "");
    if (parsedUrl.protocol !== "http:" && parsedUrl.protocol !== "https:") {
      return { config: null, reason: "DRIVE_TENANT_TEST_URL must use http or https" };
    }
  } catch {
    return { config: null, reason: "DRIVE_TENANT_TEST_URL is not a valid URL" };
  }

  const stagingSuffix = ".staging.supabase.co";
  const allowedHost = hostname === "localhost"
    || hostname === "127.0.0.1"
    || hostname === "::1"
    || (hostname.endsWith(stagingSuffix) && hostname.length > stagingSuffix.length);
  if (!allowedHost) {
    return { config: null, reason: "DRIVE_TENANT_TEST_URL must target localhost, loopback, or *.staging.supabase.co" };
  }

  return {
    config: {
      url: environment.url as string,
      anonKey: environment.anonKey as string,
      orgAUserToken: environment.orgAUserToken as string,
      orgBUserToken: environment.orgBUserToken as string,
      orgAId: environment.orgAId as string,
      orgBId: environment.orgBId as string,
      connectionAId: environment.connectionAId as string,
      connectionBId: environment.connectionBId as string,
    },
    reason: null,
  };
}

function createUserClient(url: string, anonKey: string, accessToken: string): SupabaseClient {
  return createClient(url, anonKey, {
    auth: { autoRefreshToken: false, persistSession: false },
    global: { headers: { Authorization: `Bearer ${accessToken}` } },
  });
}

function setupFailure(resource: string, message: string): Error {
  return new Error(`[non-production setup] ${resource} is unavailable: ${message}`);
}

async function selectMetadata(
  client: SupabaseClient,
  connectionIds: string[],
  orgId?: string,
): Promise<ConnectionMetadata[]> {
  let query = client
    .from("drive_connections")
    .select(CONNECTION_METADATA_SELECT)
    .in("id", connectionIds);
  if (orgId) query = query.eq("org_id", orgId);

  const { data, error } = await query;
  if (error) throw setupFailure("drive_connections", error.message);
  return (data ?? []) as ConnectionMetadata[];
}

async function requireMetadata(
  client: SupabaseClient,
  connectionId: string,
  orgId: string,
  fixtureName: string,
): Promise<ConnectionMetadata> {
  const rows = await selectMetadata(client, [connectionId], orgId);
  if (rows.length !== 1 || rows[0]?.id !== connectionId) {
    throw setupFailure(
      fixtureName,
      `pre-provision one visible drive_connections row for org ${orgId} and connection ${connectionId}`,
    );
  }
  return rows[0];
}

async function requireActiveAdminMembership(
  client: SupabaseClient,
  orgId: string,
  fixtureName: string,
): Promise<string> {
  const { data: authData, error: authError } = await client.auth.getUser();
  if (authError || !authData.user) {
    throw setupFailure(fixtureName, `could not resolve JWT user: ${authError?.message || "unknown error"}`);
  }

  const { data, error } = await client
    .from("org_members")
    .select("user_id, org_id, role, status")
    .eq("user_id", authData.user.id)
    .eq("org_id", orgId)
    .eq("status", "active")
    .in("role", ["owner", "admin"])
    .maybeSingle();
  if (error) throw setupFailure(fixtureName, error.message);

  const membership = data as MembershipMetadata | null;
  if (
    !membership
    || membership.user_id !== authData.user.id
    || membership.org_id !== orgId
    || membership.status !== "active"
    || !["owner", "admin"].includes(membership.role)
  ) {
    throw setupFailure(fixtureName, `pre-provision an active owner/admin membership for org ${orgId}`);
  }

  return authData.user.id;
}

async function restoreConnectionMetadata(
  client: SupabaseClient,
  connectionId: string,
  values: { label?: string; root_folder_id?: string },
  resource: string,
): Promise<void> {
  const restored = await client
    .from("drive_connections")
    .update(values)
    .eq("id", connectionId)
    .select("id, label, root_folder_id");
  if (restored.error || (restored.data ?? []).length !== 1) {
    throw setupFailure(resource, `could not restore the original fixture: ${restored.error?.message || "row not returned"}`);
  }
}

async function expectDeniedUpdate(
  error: { code?: string; message?: string } | null,
  data: unknown[] | null,
  resource: string,
  restore: (() => Promise<void>) | null = null,
): Promise<void> {
  const rows = data ?? [];
  if (rows.length > 0) {
    if (restore) await restore();
    throw new Error(`[tenant isolation] ${resource} unexpectedly returned a row`);
  }
  if (error && !EXPECTED_DENIAL_CODES.has(error.code ?? "")) {
    throw setupFailure(resource, error.message ?? "unexpected database error");
  }
  expect(rows).toHaveLength(0);
}

function expectNoVisibleRows(
  error: { code?: string; message?: string } | null,
  data: unknown[] | null,
  resource: string,
): void {
  if (error && !EXPECTED_DENIAL_CODES.has(error.code ?? "")) {
    throw setupFailure(resource, error.message ?? "unexpected database error");
  }
  expect(data ?? []).toHaveLength(0);
}

function expectPermissionDenied(
  error: { code?: string; message?: string } | null,
  data: unknown[] | null,
  resource: string,
): void {
  if (error?.code !== "42501") {
    throw setupFailure(resource, error?.message || "the authenticated client was not denied by grants/RLS");
  }
  expect(data).toBeNull();
}

const integrationResolution = resolveIntegrationConfig({
  allow: process.env.DRIVE_TENANT_TEST_ALLOW,
  url: process.env.DRIVE_TENANT_TEST_URL,
  anonKey: process.env.DRIVE_TENANT_TEST_ANON_KEY,
  orgAUserToken: process.env.DRIVE_TENANT_TEST_ORG_A_USER_TOKEN,
  orgBUserToken: process.env.DRIVE_TENANT_TEST_ORG_B_USER_TOKEN,
  orgAId: process.env.DRIVE_TENANT_TEST_ORG_A_ID,
  orgBId: process.env.DRIVE_TENANT_TEST_ORG_B_ID,
  connectionAId: process.env.DRIVE_TENANT_TEST_CONNECTION_A_ID,
  connectionBId: process.env.DRIVE_TENANT_TEST_CONNECTION_B_ID,
});

if (!integrationResolution.config) {
  console.info(`[drive tenant integration] SKIP: ${integrationResolution.reason}.`);
}

describe("Drive tenant integration configuration guard", () => {
  it("requires all staging inputs and the exact non-production opt-in", () => {
    const result = resolveIntegrationConfig({
      allow: REQUIRED_ALLOW_VALUE,
      url: "https://project.staging.supabase.co",
      anonKey: "anon-key",
      orgAUserToken: "token-a",
      orgBUserToken: "token-b",
      orgAId: "org-a",
      orgBId: "org-b",
      connectionAId: "connection-a",
      connectionBId: "connection-b",
    });
    expect(result.config).toMatchObject({ url: "https://project.staging.supabase.co", anonKey: "anon-key" });
    expect(resolveIntegrationConfig({ allow: "I_UNDERSTAND_NON_PRODUCTION_typo" }).config).toBeNull();
    expect(resolveIntegrationConfig({ allow: REQUIRED_ALLOW_VALUE, url: "https://project.staging.supabase.co" }).reason)
      .toBe("DRIVE_TENANT_TEST_ANON_KEY is required");
  });

  it("rejects production and lookalike hosts", () => {
    const base = {
      allow: REQUIRED_ALLOW_VALUE,
      anonKey: "anon-key",
      orgAUserToken: "token-a",
      orgBUserToken: "token-b",
      orgAId: "org-a",
      orgBId: "org-b",
      connectionAId: "connection-a",
      connectionBId: "connection-b",
    };
    for (const url of [
      "http://localhost:54321",
      "http://127.0.0.1:54321",
      "http://[::1]:54321",
      "https://project.staging.supabase.co",
    ]) {
      expect(resolveIntegrationConfig({ ...base, url }).config).not.toBeNull();
    }
    for (const url of [
      "https://project.supabase.co",
      "https://project.staging.supabase.co.evil.example",
      "https://staging-project.example.com",
    ]) {
      expect(resolveIntegrationConfig({ ...base, url }).config).toBeNull();
    }
  });
});

describe("Drive root isolation contract without Google roots", () => {
  it("keeps cross-tenant root visibility behind the server-only helper", () => {
    const source = readFileSync(resolve(process.cwd(), "src/lib/drive/root-isolation.ts"), "utf8");
    expect(source).toContain("createServiceRoleClient()");
    expect(source).toContain('.from("drive_connections")');
    expect(source).toContain('.select("org_id, root_folder_id")');
    expect(source).toContain('.eq("status", "active")');
    expect(source).toContain('.eq("user_id", userId)');
    expect(source).toContain('.eq("org_id", orgId)');
    expect(source).toContain("assertFolderWithinRoot");
  });
});

const integrationDescribe = integrationResolution.config ? describe : describe.skip;

integrationDescribe("Drive tenant isolation with two authenticated users", () => {
  const config = integrationResolution.config as IntegrationConfig;
  let clientA: SupabaseClient;
  let clientB: SupabaseClient;
  let connectionA: ConnectionMetadata;
  let connectionB: ConnectionMetadata;
  let userAId: string;
  let userBId: string;

  beforeAll(async () => {
    expect(config.orgAId).not.toBe(config.orgBId);
    expect(config.connectionAId).not.toBe(config.connectionBId);
    clientA = createUserClient(config.url, config.anonKey, config.orgAUserToken);
    clientB = createUserClient(config.url, config.anonKey, config.orgBUserToken);
    userAId = await requireActiveAdminMembership(clientA, config.orgAId, "org A JWT membership fixture");
    userBId = await requireActiveAdminMembership(clientB, config.orgBId, "org B JWT membership fixture");
    expect(userAId).not.toBe(userBId);
    connectionA = await requireMetadata(clientA, config.connectionAId, config.orgAId, "org A connection fixture");
    connectionB = await requireMetadata(clientB, config.connectionBId, config.orgBId, "org B connection fixture");
    expect(connectionA.org_id).toBe(config.orgAId);
    expect(connectionB.org_id).toBe(config.orgBId);
    if (connectionA.root_folder_id === connectionB.root_folder_id) {
      throw setupFailure("root fixtures", "org A and org B must use different root_folder_id values");
    }
  });

  it("exposes metadata only inside each user's organization", async () => {
    const [aRows, bRows, aFilteredRows, bFilteredRows] = await Promise.all([
      selectMetadata(clientA, [config.connectionAId, config.connectionBId]),
      selectMetadata(clientB, [config.connectionAId, config.connectionBId]),
      selectMetadata(clientA, [config.connectionAId, config.connectionBId], config.orgAId),
      selectMetadata(clientB, [config.connectionAId, config.connectionBId], config.orgBId),
    ]);

    expect(aRows.map((row) => row.id)).toEqual([config.connectionAId]);
    expect(bRows.map((row) => row.id)).toEqual([config.connectionBId]);
    expect(aFilteredRows.map((row) => row.id)).toEqual([config.connectionAId]);
    expect(bFilteredRows.map((row) => row.id)).toEqual([config.connectionBId]);
    expect(aFilteredRows.some((row) => row.id === config.connectionBId)).toBe(false);
    expect(bFilteredRows.some((row) => row.id === config.connectionAId)).toBe(false);
  });

  it("rejects foreign updates and direct root changes without changing fixtures", async () => {
    const unauthorizedLabel = `tenant-isolation-unauthorized-label-${TEST_ATTEMPT_SUFFIX}`;
    const foreignUpdate = await clientA
      .from("drive_connections")
      .update({ label: unauthorizedLabel })
      .eq("id", config.connectionBId)
      .select("id, label");
    await expectDeniedUpdate(
      foreignUpdate.error,
      foreignUpdate.data,
      "foreign drive_connections metadata update",
      () => restoreConnectionMetadata(clientB, config.connectionBId, { label: connectionB.label }, "org B connection label"),
    );

    const unauthorizedRoot = `tenant-isolation-unauthorized-root-${TEST_ATTEMPT_SUFFIX}`;
    const rootUpdate = await clientA
      .from("drive_connections")
      .update({ root_folder_id: unauthorizedRoot })
      .eq("id", config.connectionAId)
      .select("id, root_folder_id");
    await expectDeniedUpdate(
      rootUpdate.error,
      rootUpdate.data,
      "own drive_connections root update",
      () => restoreConnectionMetadata(clientA, config.connectionAId, { root_folder_id: connectionA.root_folder_id }, "org A connection root"),
    );

    const unchanged = await selectMetadata(clientA, [config.connectionAId], config.orgAId);
    expect(unchanged[0]?.label).toBe(connectionA.label);
    expect(unchanged[0]?.root_folder_id).toBe(connectionA.root_folder_id);
  });

  it("denies authenticated access to secrets across organizations", async () => {
    const [aSecretRead, bSecretRead] = await Promise.all([
      clientA
        .from("drive_connection_secrets")
        .select("connection_id, org_id, refresh_token_encrypted")
        .eq("org_id", config.orgBId)
        .eq("connection_id", config.connectionBId),
      clientB
        .from("drive_connection_secrets")
        .select("connection_id, org_id, refresh_token_encrypted")
        .eq("org_id", config.orgAId)
        .eq("connection_id", config.connectionAId),
    ]);

    expectNoVisibleRows(aSecretRead.error, aSecretRead.data, "org A foreign drive_connection_secrets read");
    expectNoVisibleRows(bSecretRead.error, bSecretRead.data, "org B foreign drive_connection_secrets read");
  });

  it("denies direct authenticated OAuth state writes", async () => {
    const stateHash = `tenant-isolation-state-${TEST_ATTEMPT_SUFFIX}`;
    const insertAttempt = await clientA
      .from("drive_oauth_states")
      .insert({
        state_hash: stateHash,
        user_id: crypto.randomUUID(),
        org_id: config.orgAId,
        root_folder_id: `tenant-isolation-oauth-root-${TEST_ATTEMPT_SUFFIX}`,
        expires_at: new Date(Date.now() + 60_000).toISOString(),
      })
      .select("state_hash");
    if ((insertAttempt.data ?? []).length > 0) {
      const cleanup = await clientA
        .from("drive_oauth_states")
        .delete()
        .eq("state_hash", stateHash)
        .select("state_hash");
      if (cleanup.error || (cleanup.data ?? []).length !== 1) {
        throw setupFailure("drive_oauth_states insert cleanup", cleanup.error?.message || "row was not removed");
      }
      throw new Error("[tenant isolation] authenticated OAuth state INSERT unexpectedly succeeded");
    }
    expectPermissionDenied(insertAttempt.error, insertAttempt.data, "authenticated drive_oauth_states INSERT");

    const updateAttempt = await clientA
      .from("drive_oauth_states")
      .update({ root_folder_id: `tenant-isolation-oauth-update-root-${TEST_ATTEMPT_SUFFIX}` })
      .eq("state_hash", stateHash)
      .select("state_hash");
    expectPermissionDenied(updateAttempt.error, updateAttempt.data, "authenticated drive_oauth_states UPDATE");

    const deleteAttempt = await clientA
      .from("drive_oauth_states")
      .delete()
      .eq("state_hash", stateHash)
      .select("state_hash");
    expectPermissionDenied(deleteAttempt.error, deleteAttempt.data, "authenticated drive_oauth_states DELETE");
  });

  it("denies connection RPC calls from JWT clients", async () => {
    const unauthorisedActorId = crypto.randomUUID();
    const upsertAttempt = await clientA.rpc("upsert_drive_connection", {
      p_org_id: config.orgAId,
      p_provider: "google_drive",
      p_label: `tenant-isolation-rpc-label-${TEST_ATTEMPT_SUFFIX}`,
      p_root_folder_id: `tenant-isolation-rpc-root-${TEST_ATTEMPT_SUFFIX}`,
      p_created_by: userAId,
      p_actor_id: unauthorisedActorId,
      p_refresh_token_encrypted: "non-production-test-ciphertext",
    });
    if (!upsertAttempt.error && typeof upsertAttempt.data === "string") {
      const cleanup = await clientA
        .from("drive_connections")
        .delete()
        .eq("id", upsertAttempt.data)
        .select("id");
      if (cleanup.error || (cleanup.data ?? []).length !== 1) {
        throw setupFailure("upsert_drive_connection cleanup", cleanup.error?.message || "row was not removed");
      }
      throw new Error("[tenant isolation] authenticated upsert_drive_connection RPC unexpectedly succeeded");
    }
    expectPermissionDenied(upsertAttempt.error, upsertAttempt.data, "authenticated upsert_drive_connection RPC");

    const revokeAttempt = await clientB.rpc("revoke_drive_connection", {
      p_org_id: config.orgBId,
      p_connection_id: crypto.randomUUID(),
      p_actor_id: unauthorisedActorId,
    });
    expectPermissionDenied(revokeAttempt.error, revokeAttempt.data, "authenticated revoke_drive_connection RPC");
  });

  it("denies direct authenticated access to OAuth states for both users", async () => {
    const [aOAuthRead, bOAuthRead] = await Promise.all([
      clientA.from("drive_oauth_states").select("state_hash").limit(1),
      clientB.from("drive_oauth_states").select("state_hash").limit(1),
    ]);

    expect(aOAuthRead.error?.code).toBe("42501");
    expect(bOAuthRead.error?.code).toBe("42501");
    expect(aOAuthRead.data).toBeNull();
    expect(bOAuthRead.data).toBeNull();
  });
});
