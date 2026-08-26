import { beforeEach, describe, expect, it, vi } from "vitest";
import { createMockRequest } from "@/lib/test-utils/mock-request";

const mocks = vi.hoisted(() => ({
  OAuth2: vi.fn(),
  generateAuthUrl: vi.fn(),
  redirect: vi.fn(),
  createClient: vi.fn(),
  getOrgId: vi.fn(),
  getDriveRootFolderIdForOrg: vi.fn(),
  createDriveOAuthState: vi.fn(),
  isDriveOrgAllowed: vi.fn(),
  hasOrgRole: vi.fn(),
  enforceDriveRateLimit: vi.fn(),
}));

vi.mock("googleapis", () => ({
  google: { auth: { OAuth2: mocks.OAuth2 } },
}));
vi.mock("next/server", async () => {
  const actual = await vi.importActual<typeof import("next/server")>("next/server");
  return {
    ...actual,
    NextResponse: {
      json: actual.NextResponse.json.bind(actual.NextResponse),
      redirect: (...args: Parameters<typeof actual.NextResponse.redirect>) => {
        mocks.redirect(...args);
        return actual.NextResponse.redirect(...args);
      },
    },
  };
});
vi.mock("@/lib/supabase/server", () => ({ createClient: mocks.createClient }));
vi.mock("@/lib/org-resolver", () => ({ getOrgId: mocks.getOrgId }));
vi.mock("@/lib/drive", () => ({ isDriveOrgAllowed: mocks.isDriveOrgAllowed }));
vi.mock("@/lib/drive/org-root-config", () => ({
  getDriveRootFolderIdForOrg: mocks.getDriveRootFolderIdForOrg,
}));
vi.mock("@/lib/drive/oauth-state", () => ({ createDriveOAuthState: mocks.createDriveOAuthState }));
vi.mock("@/lib/api-handler", () => ({ hasOrgRole: mocks.hasOrgRole }));
vi.mock("@/lib/drive/rate-limit", () => ({ enforceDriveRateLimit: mocks.enforceDriveRateLimit }));

import { GET } from "./route";

describe("GET /api/drive/auth", () => {
  const env = process.env as Record<string, string | undefined>;

  beforeEach(() => {
    vi.clearAllMocks();
    delete process.env.GOOGLE_OAUTH_CLIENT_ID;
    delete process.env.GOOGLE_OAUTH_CLIENT_SECRET;
    delete process.env.GOOGLE_OAUTH_REDIRECT_URI;
    mocks.getOrgId.mockResolvedValue("org-1");
    mocks.getDriveRootFolderIdForOrg.mockReturnValue("org-root");
    mocks.createDriveOAuthState.mockResolvedValue(undefined);
    mocks.isDriveOrgAllowed.mockReturnValue(true);
    mocks.hasOrgRole.mockResolvedValue(true);
    mocks.enforceDriveRateLimit.mockResolvedValue(null);
    mocks.generateAuthUrl.mockReturnValue("https://accounts.google.com/o/oauth2/auth");
    mocks.OAuth2.mockImplementation(function () {
      return { generateAuthUrl: mocks.generateAuthUrl };
    });
  });

  it("blocks rate-limited requests before authentication", async () => {
    const blocked = new Response(JSON.stringify({ error: "rate-limited" }), { status: 429 });
    mocks.enforceDriveRateLimit.mockResolvedValue(blocked);

    const response = await GET(createMockRequest("http://localhost/api/drive/auth"));

    expect(response.status).toBe(429);
    expect(mocks.createClient).not.toHaveBeenCalled();
  });

  it("rejects unauthenticated users", async () => {
    mocks.createClient.mockResolvedValue({
      auth: { getUser: vi.fn().mockResolvedValue({ data: { user: null } }) },
    });

    const response = await GET(createMockRequest("http://localhost/api/drive/auth"));

    expect(response.status).toBe(401);
  });

  it("rejects authenticated users outside the Drive allowlist", async () => {
    mocks.createClient.mockResolvedValue({
      auth: { getUser: vi.fn().mockResolvedValue({ data: { user: { id: "user-1" } } }) },
    });
    mocks.isDriveOrgAllowed.mockReturnValue(false);

    const response = await GET(createMockRequest("http://localhost/api/drive/auth"));

    expect(response.status).toBe(403);
  });

  it("rejects users without an active organization", async () => {
    mocks.createClient.mockResolvedValue({
      auth: { getUser: vi.fn().mockResolvedValue({ data: { user: { id: "user-1" } } }) },
    });
    mocks.getOrgId.mockResolvedValue(null);

    const response = await GET(createMockRequest("http://localhost/api/drive/auth"));

    expect(response.status).toBe(400);
    expect(mocks.hasOrgRole).not.toHaveBeenCalled();
  });

  it("rejects viewers before generating an OAuth URL", async () => {
    process.env.GOOGLE_OAUTH_CLIENT_ID = "client-id";
    process.env.GOOGLE_OAUTH_CLIENT_SECRET = "client-secret";
    mocks.createClient.mockResolvedValue({
      auth: { getUser: vi.fn().mockResolvedValue({ data: { user: { id: "user-1" } } }) },
    });
    mocks.hasOrgRole.mockResolvedValue(false);

    const response = await GET(createMockRequest("http://localhost/api/drive/auth"));

    expect(response.status).toBe(403);
    expect(mocks.hasOrgRole).toHaveBeenCalledWith(
      expect.anything(),
      "user-1",
      "org-1",
      ["owner", "admin"],
    );
  });

  it("rejects a missing bootstrap root before generating an OAuth URL", async () => {
    process.env.GOOGLE_OAUTH_CLIENT_ID = "client-id";
    process.env.GOOGLE_OAUTH_CLIENT_SECRET = "client-secret";
    mocks.getDriveRootFolderIdForOrg.mockReturnValue(null);
    mocks.createClient.mockResolvedValue({
      auth: { getUser: vi.fn().mockResolvedValue({ data: { user: { id: "user-1" } } }) },
    });

    const response = await GET(createMockRequest("http://localhost/api/drive/auth"));

    expect(response.status).toBe(500);
    expect(await response.json()).toEqual({ error: "Google Drive no configurado" });
    expect(mocks.createDriveOAuthState).not.toHaveBeenCalled();
  });

  it.each(["GOOGLE_OAUTH_CLIENT_ID", "GOOGLE_OAUTH_CLIENT_SECRET"] as const)(
    "fails closed when %s is missing before generating an OAuth URL",
    async (missingVariable) => {
      process.env.GOOGLE_OAUTH_CLIENT_ID = "client-id";
      process.env.GOOGLE_OAUTH_CLIENT_SECRET = "client-secret";
      process.env.GOOGLE_OAUTH_REDIRECT_URI = "https://app.example.com/api/drive/auth/callback";
      delete process.env[missingVariable];
      const getUser = vi.fn().mockResolvedValue({ data: { user: { id: "user-1" } } });
      mocks.createClient.mockResolvedValue({ auth: { getUser } });

      const response = await GET(createMockRequest("http://localhost/api/drive/auth"));

      expect(response.status).toBe(500);
      expect(await response.json()).toEqual({ error: "Google Drive OAuth no configurado" });
      expect(getUser).toHaveBeenCalledTimes(1);
    },
  );

  it("persists the authenticated user, organization and per-organization root in OAuth state", async () => {
    process.env.GOOGLE_OAUTH_CLIENT_ID = "client-id";
    process.env.GOOGLE_OAUTH_CLIENT_SECRET = "client-secret";
    process.env.GOOGLE_OAUTH_REDIRECT_URI = "https://app.example.com/api/drive/auth/callback";
    mocks.createClient.mockResolvedValue({
      auth: { getUser: vi.fn().mockResolvedValue({ data: { user: { id: "user-1" } } }) },
    });

    const response = await GET(createMockRequest("http://localhost/api/drive/auth"));

    expect(response.status).toBe(307);
    expect(mocks.getDriveRootFolderIdForOrg).toHaveBeenCalledWith("org-1");
    expect(mocks.createDriveOAuthState).toHaveBeenCalledWith({
      state: expect.stringMatching(/^[0-9a-f]{64}$/),
      userId: "user-1",
      orgId: "org-1",
      rootFolderId: "org-root",
    });
    expect(response.headers.get("set-cookie")).toContain("drive_oauth_state=");
  });

  it("persists OAuth state before creating the redirect", async () => {
    process.env.GOOGLE_OAUTH_CLIENT_ID = "client-id";
    process.env.GOOGLE_OAUTH_CLIENT_SECRET = "client-secret";
    process.env.GOOGLE_OAUTH_REDIRECT_URI = "https://app.example.com/api/drive/auth/callback";
    const events: string[] = [];
    mocks.createClient.mockResolvedValue({
      auth: { getUser: vi.fn().mockResolvedValue({ data: { user: { id: "user-1" } } }) },
    });
    mocks.createDriveOAuthState.mockImplementation(async () => {
      events.push("state");
    });
    mocks.redirect.mockImplementation(() => {
      events.push("redirect");
    });

    await GET(createMockRequest("http://localhost/api/drive/auth"));

    expect(mocks.redirect).toHaveBeenCalledWith("https://accounts.google.com/o/oauth2/auth");
    expect(events).toEqual(["state", "redirect"]);
    expect(mocks.createDriveOAuthState.mock.invocationCallOrder[0]).toBeLessThan(
      mocks.redirect.mock.invocationCallOrder[0],
    );
  });

  it.each([
    { nodeEnv: "production", secure: true },
    { nodeEnv: "development", secure: false },
  ])("sets the OAuth cookie attributes for $nodeEnv", async ({ nodeEnv, secure }) => {
    const originalNodeEnv = env.NODE_ENV;
    env.NODE_ENV = nodeEnv;
    process.env.GOOGLE_OAUTH_CLIENT_ID = "client-id";
    process.env.GOOGLE_OAUTH_CLIENT_SECRET = "client-secret";
    process.env.GOOGLE_OAUTH_REDIRECT_URI = "https://app.example.com/api/drive/auth/callback";
    mocks.createClient.mockResolvedValue({
      auth: { getUser: vi.fn().mockResolvedValue({ data: { user: { id: "user-1" } } }) },
    });

    try {
      const response = await GET(createMockRequest("http://localhost/api/drive/auth"));
      const cookie = response.headers.get("set-cookie") || "";

      expect(cookie).toContain("HttpOnly");
      expect(cookie).toContain("SameSite=lax");
      expect(cookie).toContain("Path=/api/drive/auth");
      if (secure) expect(cookie).toContain("Secure");
      else expect(cookie).not.toContain("Secure");
    } finally {
      if (originalNodeEnv === undefined) delete env.NODE_ENV;
      else env.NODE_ENV = originalNodeEnv;
    }
  });

  it("rejects a missing explicit redirect URI without using the request origin", async () => {
    process.env.GOOGLE_OAUTH_CLIENT_ID = "client-id";
    process.env.GOOGLE_OAUTH_CLIENT_SECRET = "client-secret";
    mocks.createClient.mockResolvedValue({
      auth: { getUser: vi.fn().mockResolvedValue({ data: { user: { id: "user-1" } } }) },
    });

    const response = await GET(createMockRequest("https://request-origin.example/api/drive/auth"));

    expect(response.status).toBe(500);
    expect(await response.json()).toEqual({ error: "Google Drive OAuth redirect URI no configurado" });
    expect(mocks.createDriveOAuthState).not.toHaveBeenCalled();
  });

  it("does not expose unexpected OAuth or database errors", async () => {
    mocks.createClient.mockRejectedValue(new Error("internal oauth secret"));

    const response = await GET(createMockRequest("http://localhost/api/drive/auth"));

    expect(response.status).toBe(500);
    expect(await response.json()).toEqual({ error: "No se pudo iniciar la conexión de Google Drive" });
  });
});
