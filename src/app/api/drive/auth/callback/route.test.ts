import { beforeEach, describe, expect, it, vi } from "vitest";
import { NextRequest, NextResponse } from "next/server";

const mocks = vi.hoisted(() => ({
  OAuth2: vi.fn(),
  drive: vi.fn(),
  getToken: vi.fn(),
  createClient: vi.fn(),
  getOrgId: vi.fn(),
  hasOrgRole: vi.fn(),
  isDriveOrgAllowed: vi.fn(),
  getDriveRedirectUri: vi.fn(),
  consumeDriveOAuthState: vi.fn(),
  encryptDriveToken: vi.fn(),
  saveDriveRefreshTokenForConnection: vi.fn(),
  upsertDriveConnectionForOrg: vi.fn(),
  enforceDriveRateLimit: vi.fn(),
  assertDriveRootIsolated: vi.fn(),
  DriveRootIsolationError: class DriveRootIsolationError extends Error {},
  connectionLookup: vi.fn(),
  mutation: vi.fn(),
  insert: vi.fn(),
  update: vi.fn(),
  from: vi.fn(),
}));

vi.mock("googleapis", () => ({
  google: { auth: { OAuth2: mocks.OAuth2 }, drive: mocks.drive },
}));
vi.mock("@/lib/supabase/server", () => ({ createClient: mocks.createClient }));
vi.mock("@/lib/org-resolver", () => ({ getOrgId: mocks.getOrgId }));
vi.mock("@/lib/api-handler", () => ({ hasOrgRole: mocks.hasOrgRole }));
vi.mock("@/lib/drive", () => ({ isDriveOrgAllowed: mocks.isDriveOrgAllowed }));
vi.mock("@/lib/drive/oauth", () => ({
  DRIVE_OAUTH_STATE_COOKIE: "drive_oauth_state",
  getDriveRedirectUri: mocks.getDriveRedirectUri,
}));
vi.mock("@/lib/drive/oauth-state", () => ({ consumeDriveOAuthState: mocks.consumeDriveOAuthState }));
vi.mock("@/lib/drive/crypto", () => ({ encryptDriveToken: mocks.encryptDriveToken }));
vi.mock("@/lib/drive/connection-secrets", () => ({
  saveDriveRefreshTokenForConnection: mocks.saveDriveRefreshTokenForConnection,
  upsertDriveConnectionForOrg: mocks.upsertDriveConnectionForOrg,
}));
vi.mock("@/lib/drive/rate-limit", () => ({ enforceDriveRateLimit: mocks.enforceDriveRateLimit }));
vi.mock("@/lib/drive/root-isolation", () => ({
  assertDriveRootIsolated: mocks.assertDriveRootIsolated,
  DriveRootIsolationError: mocks.DriveRootIsolationError,
}));

import { GET } from "./route";

function makeRequest(query = "code=oauth-code&state=expected") {
  return new NextRequest(`http://localhost/api/drive/auth/callback?${query}`, {
    headers: { Cookie: "drive_oauth_state=expected" },
  });
}

function makeQuery() {
  return {
    select: vi.fn().mockReturnThis(),
    eq: vi.fn().mockReturnThis(),
    order: vi.fn().mockReturnThis(),
    limit: vi.fn().mockReturnThis(),
    maybeSingle: mocks.connectionLookup,
    single: vi.fn().mockResolvedValue({ data: { id: "connection-1" }, error: null }),
    then: (resolve: (value: { error: null }) => unknown) => Promise.resolve(resolve({ error: null })),
  };
}

function makeSupabase(userId = "user-1") {
  const query = makeQuery();
  mocks.insert.mockReturnValue(query);
  mocks.update.mockReturnValue(query);
  mocks.from.mockImplementation((table: string) => {
    if (table === "drive_connections") {
      return {
        select: vi.fn(() => query),
        update: mocks.update,
        insert: mocks.insert,
      };
    }
    return query;
  });

  return {
    auth: { getUser: vi.fn().mockResolvedValue({ data: { user: { id: userId } } }) },
    from: mocks.from,
  };
}

describe("GET /api/drive/auth/callback", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    process.env.GOOGLE_OAUTH_CLIENT_ID = "client-id";
    process.env.GOOGLE_OAUTH_CLIENT_SECRET = "client-secret";
    process.env.GOOGLE_OAUTH_REDIRECT_URI = "https://app.example.com/api/drive/auth/callback";
    mocks.getOrgId.mockImplementation((_supabase, _userId, request) => {
      const selectedOrgId = request?.headers?.get?.("x-org-id");
      return Promise.resolve(selectedOrgId || "org-1");
    });
    mocks.hasOrgRole.mockResolvedValue(true);
    mocks.isDriveOrgAllowed.mockReturnValue(true);
    mocks.getToken.mockResolvedValue({ tokens: { refresh_token: "refresh-token" } });
    mocks.getDriveRedirectUri.mockReturnValue("https://app.example.com/api/drive/auth/callback");
    mocks.consumeDriveOAuthState.mockResolvedValue({
      userId: "user-1",
      orgId: "org-1",
      rootFolderId: "stored-root",
    });
    mocks.encryptDriveToken.mockReturnValue("encrypted-token");
    mocks.saveDriveRefreshTokenForConnection.mockResolvedValue(undefined);
    mocks.upsertDriveConnectionForOrg.mockResolvedValue("connection-1");
    mocks.enforceDriveRateLimit.mockResolvedValue(null);
    mocks.connectionLookup.mockResolvedValue({ data: null, error: null });
    mocks.OAuth2.mockImplementation(function () {
      return { getToken: mocks.getToken, setCredentials: vi.fn() };
    });
    mocks.drive.mockReturnValue({ files: {} });
    mocks.assertDriveRootIsolated.mockResolvedValue(undefined);
  });

  it("blocks rate-limited callbacks before OAuth validation and authentication", async () => {
    const blocked = NextResponse.json({ error: "rate-limited" }, { status: 429 });
    mocks.enforceDriveRateLimit.mockResolvedValue(blocked);

    const response = await GET(makeRequest());

    expect(response.status).toBe(429);
    expect(mocks.createClient).not.toHaveBeenCalled();
    expect(mocks.getToken).not.toHaveBeenCalled();
  });

  it("clears the OAuth cookie when the callback is rate-limited", async () => {
    const blocked = NextResponse.json({ error: "rate-limited" }, { status: 429 });
    mocks.enforceDriveRateLimit.mockResolvedValue(blocked);

    const response = await GET(makeRequest());

    expect(response.headers.get("set-cookie")).toContain("drive_oauth_state=");
  });

  it("rejects a callback without an OAuth code without exchanging or persisting", async () => {
    const response = await GET(new NextRequest("http://localhost/api/drive/auth/callback"));

    expect(response.status).toBe(307);
    expect(response.headers.get("location")).toContain("error=no-code");
    expect(mocks.OAuth2).not.toHaveBeenCalled();
    expect(mocks.createClient).not.toHaveBeenCalled();
  });

  it("rejects a callback with invalid state without exchanging or persisting", async () => {
    const response = await GET(new NextRequest(
      "http://localhost/api/drive/auth/callback?code=oauth-code&state=wrong",
      { headers: { Cookie: "drive_oauth_state=expected" } },
    ));

    expect(response.status).toBe(307);
    expect(response.headers.get("location")).toContain("error=invalid-state");
    expect(mocks.OAuth2).not.toHaveBeenCalled();
    expect(mocks.createClient).not.toHaveBeenCalled();
  });

  it("rejects an unauthenticated callback before exchanging the code", async () => {
    mocks.createClient.mockResolvedValue({
      auth: { getUser: vi.fn().mockResolvedValue({ data: { user: null } }) },
    });

    const response = await GET(makeRequest());

    expect(response.headers.get("location")).toContain("/login");
    expect(mocks.getToken).not.toHaveBeenCalled();
    expect(mocks.upsertDriveConnectionForOrg).not.toHaveBeenCalled();
  });

  it("rejects a callback without an active organization before exchanging the code", async () => {
    mocks.createClient.mockResolvedValue(makeSupabase());
    mocks.getOrgId.mockResolvedValue(null);

    const response = await GET(makeRequest());

    expect(response.headers.get("location")).toContain("error=no-organization");
    expect(mocks.getToken).not.toHaveBeenCalled();
    expect(mocks.upsertDriveConnectionForOrg).not.toHaveBeenCalled();
  });

  it("rejects a viewer before exchanging the code", async () => {
    mocks.createClient.mockResolvedValue(makeSupabase());
    mocks.hasOrgRole.mockResolvedValue(false);

    const response = await GET(makeRequest());

    expect(response.headers.get("location")).toContain("error=insufficient-permissions");
    expect(mocks.hasOrgRole).toHaveBeenCalledWith(
      expect.anything(),
      "user-1",
      "org-1",
      ["owner", "admin"],
    );
    expect(mocks.getToken).not.toHaveBeenCalled();
  });

  it("rejects a callback outside the Drive allowlist before exchanging the code", async () => {
    mocks.createClient.mockResolvedValue(makeSupabase());
    mocks.isDriveOrgAllowed.mockReturnValue(false);

    const response = await GET(makeRequest());

    expect(response.headers.get("location")).toContain("error=drive-not-enabled");
    expect(mocks.getToken).not.toHaveBeenCalled();
  });

  it("rejects a callback without a bootstrap root before exchanging the code", async () => {
    mocks.createClient.mockResolvedValue(makeSupabase());
    mocks.consumeDriveOAuthState.mockResolvedValue({
      userId: "user-1",
      orgId: "org-1",
      rootFolderId: "",
    });

    const response = await GET(makeRequest());

    expect(response.headers.get("location")).toContain("error=invalid-state");
    expect(mocks.getToken).not.toHaveBeenCalled();
  });

  it.each(["GOOGLE_OAUTH_CLIENT_ID", "GOOGLE_OAUTH_CLIENT_SECRET"] as const)(
    "fails closed when %s is missing before exchanging code or loading a user token",
    async (missingVariable) => {
      delete process.env[missingVariable];

      const response = await GET(makeRequest());

      expect(response.headers.get("location")).toContain("error=oauth-not-configured");
      expect(mocks.OAuth2).not.toHaveBeenCalled();
      expect(mocks.createClient).not.toHaveBeenCalled();
    },
  );

  it("rejects a missing explicit redirect URI before exchanging the code", async () => {
    mocks.createClient.mockResolvedValue(makeSupabase());
    mocks.getDriveRedirectUri.mockImplementation(() => {
      throw new Error("Google Drive OAuth redirect URI no configurado");
    });

    const response = await GET(makeRequest());

    expect(response.headers.get("location")).toContain("error=oauth-redirect-not-configured");
    expect(mocks.getToken).not.toHaveBeenCalled();
  });

  it("rejects a state bound to another user before exchanging the code", async () => {
    mocks.createClient.mockResolvedValue(makeSupabase("user-1"));
    mocks.consumeDriveOAuthState.mockResolvedValue({
      userId: "user-2",
      orgId: "org-1",
      rootFolderId: "stored-root",
    });

    const response = await GET(makeRequest());

    expect(response.headers.get("location")).toContain("error=invalid-state");
    expect(mocks.getToken).not.toHaveBeenCalled();
  });

  it("uses the organization bound to state when the active context changes", async () => {
    mocks.createClient.mockResolvedValue(makeSupabase("user-1"));
    mocks.consumeDriveOAuthState.mockResolvedValue({
      userId: "user-1",
      orgId: "org-1",
      rootFolderId: "stored-root",
    });

    const response = await GET(makeRequest());

    expect(response.headers.get("location")).toContain("/drive?connected=true");
    expect(mocks.getToken).toHaveBeenCalledWith("oauth-code");
    expect(mocks.upsertDriveConnectionForOrg).toHaveBeenCalledWith(
      expect.anything(),
      "user-1",
      "org-1",
      "stored-root",
      "encrypted-token",
    );
  });

  it("rejects replayed or expired state before exchanging the code", async () => {
    mocks.createClient.mockResolvedValue(makeSupabase());
    mocks.consumeDriveOAuthState.mockResolvedValue(null);

    const response = await GET(makeRequest());

    expect(response.headers.get("location")).toContain("error=invalid-state");
    expect(mocks.consumeDriveOAuthState).toHaveBeenCalledWith("expected");
    expect(mocks.getToken).not.toHaveBeenCalled();
  });

  it("persists metadata and an encrypted refresh token without using user_settings", async () => {
    mocks.createClient.mockResolvedValue(makeSupabase());

    const response = await GET(makeRequest());

    expect(response.headers.get("location")).toContain("/drive?connected=true");
    expect(mocks.getToken).toHaveBeenCalledWith("oauth-code");
    expect(mocks.encryptDriveToken).toHaveBeenCalledWith("refresh-token");
    expect(mocks.upsertDriveConnectionForOrg).toHaveBeenCalledWith(
      expect.anything(),
      "user-1",
      "org-1",
      "stored-root",
      "encrypted-token",
    );
    expect(mocks.from).not.toHaveBeenCalled();
  });

  it("rejects a nested root before persisting the OAuth connection", async () => {
    mocks.createClient.mockResolvedValue(makeSupabase());
    mocks.assertDriveRootIsolated.mockRejectedValue(new mocks.DriveRootIsolationError());

    const response = await GET(makeRequest());

    expect(response.headers.get("location")).toContain("error=drive-not-enabled");
    expect(mocks.assertDriveRootIsolated).toHaveBeenCalledWith(
      expect.anything(),
      expect.anything(),
      "user-1",
      "org-1",
      "stored-root",
    );
    expect(mocks.upsertDriveConnectionForOrg).not.toHaveBeenCalled();
  });

  it("consumes OAuth state before exchanging the authorization code", async () => {
    mocks.createClient.mockResolvedValue(makeSupabase());

    await GET(makeRequest());

    expect(mocks.consumeDriveOAuthState.mock.invocationCallOrder[0]).toBeLessThan(
      mocks.getToken.mock.invocationCallOrder[0],
    );
  });

  it("rejects a successful exchange without a refresh token and does not persist", async () => {
    mocks.getToken.mockResolvedValue({ tokens: { access_token: "access-token" } });
    mocks.createClient.mockResolvedValue(makeSupabase());

    const response = await GET(makeRequest());

    expect(response.headers.get("location")).toContain("error=no-refresh-token");
    expect(mocks.encryptDriveToken).not.toHaveBeenCalled();
    expect(mocks.from).not.toHaveBeenCalled();
    expect(mocks.upsertDriveConnectionForOrg).not.toHaveBeenCalled();
  });

  it("redirects save failures without exposing token or provider details", async () => {
    mocks.createClient.mockResolvedValue(makeSupabase());
    mocks.upsertDriveConnectionForOrg.mockRejectedValue(new Error("rpc-failed"));

    const response = await GET(makeRequest());
    const location = response.headers.get("location") || "";

    expect(location).toContain("error=save-failed");
    expect(location).not.toContain("refresh-token");
    expect(location).not.toContain("encrypted-token");
    expect(location).not.toContain("google_drive");
  });

  it("clears the OAuth cookie on success and terminal errors", async () => {
    mocks.createClient.mockResolvedValue(makeSupabase());
    const success = await GET(makeRequest());
    expect(success.headers.get("set-cookie")).toContain("drive_oauth_state=");

    mocks.consumeDriveOAuthState.mockResolvedValue(null);
    const error = await GET(makeRequest());
    expect(error.headers.get("set-cookie")).toContain("drive_oauth_state=");
  });
});
