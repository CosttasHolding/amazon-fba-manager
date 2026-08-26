import { beforeEach, describe, expect, it, vi } from "vitest";
import { createMockRequest } from "@/lib/test-utils/mock-request";

const mocks = vi.hoisted(() => ({
  createClient: vi.fn(),
  getOrgId: vi.fn(),
  hasOrgRole: vi.fn(),
  revokeDriveConnectionSecret: vi.fn(),
  enforceDriveRateLimit: vi.fn(),
  lookup: vi.fn(),
  mutation: vi.fn(),
  from: vi.fn(),
}));

vi.mock("@/lib/supabase/server", () => ({ createClient: mocks.createClient }));
vi.mock("@/lib/org-resolver", () => ({ getOrgId: mocks.getOrgId }));
vi.mock("@/lib/api-handler", () => ({ hasOrgRole: mocks.hasOrgRole }));
vi.mock("@/lib/drive/connection-secrets", () => ({
  revokeDriveConnectionSecret: mocks.revokeDriveConnectionSecret,
}));
vi.mock("@/lib/drive/rate-limit", () => ({ enforceDriveRateLimit: mocks.enforceDriveRateLimit }));

import { DELETE } from "./route";

function makeQuery() {
  return {
    select: vi.fn().mockReturnThis(),
    update: vi.fn().mockReturnThis(),
    eq: vi.fn().mockReturnThis(),
    maybeSingle: mocks.lookup,
    then: (resolve: (value: { error: null }) => unknown) => Promise.resolve(resolve({ error: null })),
  };
}

function makeSupabase(user: { id: string } | null = { id: "user-1" }) {
  const query = makeQuery();
  mocks.from.mockReturnValue(query);
  return {
    auth: { getUser: vi.fn().mockResolvedValue({ data: { user } }) },
    from: mocks.from,
  };
}

function request() {
  return createMockRequest("http://localhost/api/drive/connections/connection-1", {
    method: "DELETE",
  });
}

describe("DELETE /api/drive/connections/[id]", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.getOrgId.mockResolvedValue("org-1");
    mocks.hasOrgRole.mockResolvedValue(true);
    mocks.lookup.mockResolvedValue({ data: { id: "connection-1" }, error: null });
    mocks.revokeDriveConnectionSecret.mockResolvedValue(undefined);
    mocks.enforceDriveRateLimit.mockResolvedValue(null);
  });

  it("blocks rate-limited requests before authentication", async () => {
    const blocked = new Response(JSON.stringify({ error: "rate-limited" }), { status: 429 });
    mocks.enforceDriveRateLimit.mockResolvedValue(blocked);

    const response = await DELETE(request(), { params: { id: "connection-1" } });

    expect(response.status).toBe(429);
    expect(mocks.createClient).not.toHaveBeenCalled();
  });

  it("rejects viewers before loading or revoking a connection", async () => {
    mocks.createClient.mockResolvedValue(makeSupabase());
    mocks.hasOrgRole.mockResolvedValue(false);

    const response = await DELETE(request(), { params: { id: "connection-1" } });

    expect(response.status).toBe(403);
    expect(mocks.revokeDriveConnectionSecret).not.toHaveBeenCalled();
    expect(mocks.from).not.toHaveBeenCalled();
  });

  it("rejects a foreign connection id before any secret service-role operation", async () => {
    mocks.createClient.mockResolvedValue(makeSupabase());
    mocks.lookup.mockResolvedValue({ data: null, error: null });

    const response = await DELETE(request(), { params: { id: "foreign-connection" } });

    expect(response.status).toBe(404);
    expect(mocks.revokeDriveConnectionSecret).not.toHaveBeenCalled();
  });

  it("revokes metadata and only the matching connection secret for an admin", async () => {
    mocks.createClient.mockResolvedValue(makeSupabase());

    const response = await DELETE(request(), { params: { id: "connection-1" } });

    expect(response.status).toBe(200);
    expect(await response.json()).toEqual({ data: { success: true } });
    expect(mocks.hasOrgRole).toHaveBeenCalledWith(
      expect.anything(),
      "user-1",
      "org-1",
      ["owner", "admin"],
    );
    expect(mocks.revokeDriveConnectionSecret).toHaveBeenCalledWith(
      expect.anything(),
      "user-1",
      "org-1",
      "connection-1",
    );
    expect(mocks.from.mock.results[0].value.eq).toHaveBeenCalledWith("id", "connection-1");
    expect(mocks.from.mock.results[0].value.eq).toHaveBeenCalledWith("org_id", "org-1");
    expect(mocks.from.mock.results[0].value.update).not.toHaveBeenCalled();
  });
});
