import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  createServiceRoleClient: vi.fn(),
  hasOrgRole: vi.fn(),
  from: vi.fn(),
  serviceQuery: vi.fn(),
  serviceRpc: vi.fn(),
}));

vi.mock("server-only", () => ({}));
vi.mock("@/lib/supabase/server", () => ({ createServiceRoleClient: mocks.createServiceRoleClient }));
vi.mock("@/lib/api-handler", () => ({ hasOrgRole: mocks.hasOrgRole }));

import {
  revokeDriveConnectionSecret,
  saveDriveRefreshTokenForConnection,
} from "./connection-secrets";

function makeUserClient() {
  return { from: mocks.from };
}

describe("Drive connection secret helpers", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.hasOrgRole.mockResolvedValue(true);
    mocks.serviceQuery.mockResolvedValue({
      data: { id: "connection-1", provider: "google_drive", label: "Proyecto", root_folder_id: "root-folder" },
      error: null,
    });
    mocks.serviceRpc.mockResolvedValue({ data: "connection-1", error: null });
    mocks.from.mockReturnValue({
      select: vi.fn().mockReturnThis(),
      eq: vi.fn().mockReturnThis(),
      maybeSingle: mocks.serviceQuery,
    });
    mocks.createServiceRoleClient.mockReturnValue({ rpc: mocks.serviceRpc });
  });

  it("checks owner/admin membership before saving through the transactional RPC", async () => {
    await saveDriveRefreshTokenForConnection(
      makeUserClient() as never,
      "user-1",
      "org-1",
      "connection-1",
      "encrypted-token",
    );

    expect(mocks.hasOrgRole).toHaveBeenCalledWith(
      expect.anything(),
      "user-1",
      "org-1",
      ["owner", "admin"],
    );
    expect(mocks.hasOrgRole.mock.invocationCallOrder[0]).toBeLessThan(
      mocks.createServiceRoleClient.mock.invocationCallOrder[0],
    );
    expect(mocks.serviceRpc).toHaveBeenCalledWith("upsert_drive_connection", {
      p_org_id: "org-1",
      p_provider: "google_drive",
      p_label: "Proyecto",
      p_root_folder_id: "root-folder",
      p_created_by: "user-1",
      p_actor_id: "user-1",
      p_refresh_token_encrypted: "encrypted-token",
      p_connection_id: "connection-1",
    });
  });

  it("does not use service role when the caller is not an owner or admin", async () => {
    mocks.hasOrgRole.mockResolvedValue(false);

    await expect(saveDriveRefreshTokenForConnection(
      makeUserClient() as never,
      "user-1",
      "org-1",
      "connection-1",
      "encrypted-token",
    )).rejects.toThrow();

    expect(mocks.createServiceRoleClient).not.toHaveBeenCalled();
  });

  it("does not use service role for a connection from another organization", async () => {
    mocks.serviceQuery.mockResolvedValue({ data: null, error: null });

    await expect(saveDriveRefreshTokenForConnection(
      makeUserClient() as never,
      "user-1",
      "org-2",
      "connection-1",
      "encrypted-token",
    )).rejects.toThrow();

    expect(mocks.createServiceRoleClient).not.toHaveBeenCalled();
  });

  it("revokes through the transactional RPC after normal-client checks", async () => {
    await revokeDriveConnectionSecret(makeUserClient() as never, "user-1", "org-1", "connection-1");

    expect(mocks.serviceRpc).toHaveBeenCalledWith("revoke_drive_connection", {
      p_org_id: "org-1",
      p_connection_id: "connection-1",
      p_actor_id: "user-1",
    });
    expect(mocks.from.mock.invocationCallOrder[0]).toBeLessThan(
      mocks.createServiceRoleClient.mock.invocationCallOrder[0],
    );
  });

  it("propagates a transactional RPC rejection without claiming success", async () => {
    mocks.serviceRpc.mockResolvedValue({ data: null, error: { message: "rpc failed" } });

    await expect(revokeDriveConnectionSecret(makeUserClient() as never, "user-1", "org-1", "connection-1"))
      .rejects.toThrow();
  });
});
