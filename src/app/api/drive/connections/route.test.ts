import { beforeEach, describe, expect, it, vi } from "vitest";
import { createMockRequest } from "@/lib/test-utils/mock-request";

const mocks = vi.hoisted(() => ({
  createClient: vi.fn(),
  getOrgId: vi.fn(),
  from: vi.fn(),
  query: vi.fn(),
  enforceDriveRateLimit: vi.fn(),
  isDriveOrgAllowed: vi.fn(),
}));

vi.mock("@/lib/supabase/server", () => ({ createClient: mocks.createClient }));
vi.mock("@/lib/org-resolver", () => ({ getOrgId: mocks.getOrgId }));
vi.mock("@/lib/drive/rate-limit", () => ({ enforceDriveRateLimit: mocks.enforceDriveRateLimit }));
vi.mock("@/lib/drive", () => ({ isDriveOrgAllowed: mocks.isDriveOrgAllowed }));

import { GET } from "./route";

function makeSupabase(user: { id: string } | null = { id: "user-1" }) {
  mocks.query.mockReturnValue({ data: [
    {
      id: "connection-1",
      org_id: "org-1",
      provider: "google_drive",
      label: "Proyecto",
      google_account_email: "owner@example.com",
      root_folder_id: "root-folder",
      status: "active",
      created_at: "2026-08-25T00:00:00Z",
      updated_at: "2026-08-25T00:00:00Z",
      refresh_token_encrypted: "must-not-leak",
    },
  ], error: null });
  const query = {
    select: vi.fn().mockReturnThis(),
    eq: vi.fn().mockReturnThis(),
    order: vi.fn().mockReturnThis(),
    then: (resolve: (value: unknown) => unknown) => Promise.resolve(resolve(mocks.query())),
  };
  mocks.from.mockReturnValue(query);

  return {
    auth: { getUser: vi.fn().mockResolvedValue({ data: { user: user } }) },
    from: mocks.from,
  };
}

describe("GET /api/drive/connections", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.getOrgId.mockResolvedValue("org-1");
    mocks.enforceDriveRateLimit.mockResolvedValue(null);
    mocks.isDriveOrgAllowed.mockReturnValue(true);
  });

  it("blocks rate-limited requests before authentication", async () => {
    const blocked = new Response(JSON.stringify({ error: "rate-limited" }), { status: 429 });
    mocks.enforceDriveRateLimit.mockResolvedValue(blocked);

    const response = await GET(createMockRequest("http://localhost/api/drive/connections"));

    expect(response.status).toBe(429);
    expect(mocks.createClient).not.toHaveBeenCalled();
  });

  it("requires authentication", async () => {
    mocks.createClient.mockResolvedValue(makeSupabase(null));

    const response = await GET(createMockRequest("http://localhost/api/drive/connections"));

    expect(response.status).toBe(401);
    expect(mocks.from).not.toHaveBeenCalled();
  });

  it("requires an active organization", async () => {
    mocks.createClient.mockResolvedValue(makeSupabase());
    mocks.getOrgId.mockResolvedValue(null);

    const response = await GET(createMockRequest("http://localhost/api/drive/connections"));

    expect(response.status).toBe(400);
    expect(mocks.from).not.toHaveBeenCalled();
  });

  it("returns only org-scoped connection metadata without secret fields", async () => {
    mocks.createClient.mockResolvedValue(makeSupabase());

    const response = await GET(createMockRequest("http://localhost/api/drive/connections"));
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(mocks.from).toHaveBeenCalledWith("drive_connections");
    expect(body.data).toEqual([{
      id: "connection-1",
      org_id: "org-1",
      provider: "google_drive",
      label: "Proyecto",
      google_account_email: "owner@example.com",
      root_folder_id: "root-folder",
      status: "active",
      created_at: "2026-08-25T00:00:00Z",
      updated_at: "2026-08-25T00:00:00Z",
    }]);
    expect(JSON.stringify(body)).not.toContain("must-not-leak");
    expect(mocks.from.mock.results[0].value.order).toHaveBeenCalledWith("created_at", { ascending: true });
  });

  it("rejects an organization removed from the Drive allowlist", async () => {
    mocks.createClient.mockResolvedValue(makeSupabase());
    mocks.isDriveOrgAllowed.mockReturnValue(false);

    const response = await GET(createMockRequest("http://localhost/api/drive/connections"));

    expect(response.status).toBe(403);
    expect(mocks.from).not.toHaveBeenCalled();
  });

  it("uses the active org filter and excludes rows from another organization", async () => {
    mocks.createClient.mockResolvedValue(makeSupabase());
    mocks.getOrgId.mockResolvedValue("org-2");
    mocks.query.mockReturnValue({
      data: [{ id: "connection-2", org_id: "org-2", provider: "google_drive", label: "Proyecto", root_folder_id: "root-2", status: "revoked", created_at: "2026-08-24", updated_at: "2026-08-25" }],
      error: null,
    });

    const response = await GET(createMockRequest("http://localhost/api/drive/connections", { headers: { "x-org-id": "org-2" } }));
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body.data).toEqual([expect.objectContaining({ id: "connection-2", org_id: "org-2" })]);
    expect(mocks.from.mock.results[0].value.eq).toHaveBeenCalledWith("org_id", "org-2");
  });
});
