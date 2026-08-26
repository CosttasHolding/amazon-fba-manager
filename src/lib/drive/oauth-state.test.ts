import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  createServiceRoleClient: vi.fn(),
  insert: vi.fn(),
  membershipEq: vi.fn(),
  membershipIn: vi.fn(),
  membershipQuery: vi.fn(),
  membershipSelect: vi.fn(),
  rpc: vi.fn(),
}));

vi.mock("server-only", () => ({}));
vi.mock("@/lib/supabase/server", () => ({ createServiceRoleClient: mocks.createServiceRoleClient }));

import { consumeDriveOAuthState, createDriveOAuthState } from "./oauth-state";

describe("Drive OAuth state", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.insert.mockResolvedValue({ error: null });
    mocks.membershipQuery.mockResolvedValue({
      data: { user_id: "22222222-2222-4222-8222-222222222222" },
      error: null,
    });
    mocks.rpc.mockResolvedValue({ data: [], error: null });
    const membershipChain = {
      select: mocks.membershipSelect,
      eq: mocks.membershipEq,
      in: mocks.membershipIn,
      maybeSingle: mocks.membershipQuery,
    };
    mocks.membershipSelect.mockReturnValue(membershipChain);
    mocks.membershipEq.mockReturnValue(membershipChain);
    mocks.membershipIn.mockReturnValue(membershipChain);
    mocks.createServiceRoleClient.mockReturnValue({
      from: vi.fn((table: string) => table === "org_members" ? membershipChain : { insert: mocks.insert }),
      rpc: mocks.rpc,
    });
  });

  it("requires an active owner/admin membership before inserting the state", async () => {
    await createDriveOAuthState({
      state: "plain-oauth-state",
      userId: "22222222-2222-4222-8222-222222222222",
      orgId: "33333333-3333-4333-8333-333333333333",
      rootFolderId: "org-root",
    });

    expect(mocks.membershipSelect).toHaveBeenCalledWith("user_id");
    expect(mocks.membershipEq).toHaveBeenCalledWith("org_id", "33333333-3333-4333-8333-333333333333");
    expect(mocks.membershipEq).toHaveBeenCalledWith("user_id", "22222222-2222-4222-8222-222222222222");
    expect(mocks.membershipEq).toHaveBeenCalledWith("status", "active");
    expect(mocks.membershipIn).toHaveBeenCalledWith("role", ["owner", "admin"]);
    expect(mocks.membershipQuery.mock.invocationCallOrder[0]).toBeLessThan(
      mocks.insert.mock.invocationCallOrder[0],
    );
  });

  it("rejects state creation when the actor is not an active owner/admin", async () => {
    mocks.membershipQuery.mockResolvedValue({ data: null, error: null });

    await expect(createDriveOAuthState({
      state: "plain-oauth-state",
      userId: "22222222-2222-4222-8222-222222222222",
      orgId: "33333333-3333-4333-8333-333333333333",
      rootFolderId: "org-root",
    })).rejects.toThrow();
    expect(mocks.insert).not.toHaveBeenCalled();
  });

  it("stores only a SHA-256 hash with the state binding and expiry", async () => {
    const state = "plain-oauth-state";

    await createDriveOAuthState({
      state,
      userId: "22222222-2222-4222-8222-222222222222",
      orgId: "33333333-3333-4333-8333-333333333333",
      rootFolderId: "org-root",
    });

    expect(mocks.insert).toHaveBeenCalledWith({
      state_hash: "6258ecbefb05018d786bed113e6366aa7f5d725c3d69f9c30e617e8aadf21eea",
      user_id: "22222222-2222-4222-8222-222222222222",
      org_id: "33333333-3333-4333-8333-333333333333",
      root_folder_id: "org-root",
      expires_at: expect.any(String),
    });

    const stored = mocks.insert.mock.calls[0][0] as Record<string, unknown>;
    expect(stored).not.toHaveProperty("state", state);
    expect(new Date(stored.expires_at as string).getTime()).toBeGreaterThan(Date.now());
  });

  it("atomically consumes a hashed, unexpired state and returns its binding", async () => {
    mocks.rpc.mockResolvedValueOnce({
      data: [{
        user_id: "22222222-2222-4222-8222-222222222222",
        org_id: "33333333-3333-4333-8333-333333333333",
        root_folder_id: "org-root",
      }],
      error: null,
    });

    await expect(consumeDriveOAuthState("plain-oauth-state")).resolves.toEqual({
      userId: "22222222-2222-4222-8222-222222222222",
      orgId: "33333333-3333-4333-8333-333333333333",
      rootFolderId: "org-root",
    });
    expect(mocks.rpc).toHaveBeenCalledWith("consume_drive_oauth_state", {
      p_state_hash: "6258ecbefb05018d786bed113e6366aa7f5d725c3d69f9c30e617e8aadf21eea",
    });
  });

  it("returns null for replayed or expired states", async () => {
    await expect(consumeDriveOAuthState("plain-oauth-state")).resolves.toBeNull();
    expect(mocks.rpc).toHaveBeenCalledTimes(1);
  });
});
