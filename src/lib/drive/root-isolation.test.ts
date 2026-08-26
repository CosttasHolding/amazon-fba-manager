import { beforeEach, describe, expect, it, vi } from "vitest";
import type { drive_v3 } from "googleapis";

vi.mock("server-only", () => ({}));

const mocks = vi.hoisted(() => ({
  assertFolderWithinRoot: vi.fn(),
  FolderOutsideRootError: class FolderOutsideRootError extends Error {},
  createServiceRoleClient: vi.fn(),
}));

vi.mock("@/lib/drive/folder-guard", () => mocks);
vi.mock("@/lib/supabase/server", () => ({
  createServiceRoleClient: mocks.createServiceRoleClient,
}));

import { assertDriveRootIsolated, DriveRootIsolationError } from "./root-isolation";

function makeQuery(result: { data: unknown; error: unknown }) {
  const query = {
    select: vi.fn(() => query),
    eq: vi.fn(() => query),
    neq: vi.fn(() => query),
    maybeSingle: vi.fn(() => Promise.resolve(result)),
    then: (resolve: (value: typeof result) => unknown, reject: (reason: unknown) => unknown) =>
      Promise.resolve(result).then(resolve, reject),
  };
  return query;
}

function makeSupabase(membership: { data: unknown; error: unknown } = {
  data: { user_id: "user-1" },
  error: null,
}) {
  const membershipQuery = makeQuery(membership);
  const from = vi.fn((table: string) => {
    if (table !== "org_members") throw new Error(`Unexpected table ${table}`);
    return membershipQuery;
  });
  return { from } as never;
}

function setServiceConnections(result: { data: unknown; error: unknown }) {
  const connectionQuery = makeQuery(result);
  mocks.createServiceRoleClient.mockReturnValue({
    from: vi.fn((table: string) => {
      if (table !== "drive_connections") throw new Error(`Unexpected table ${table}`);
      return connectionQuery;
    }),
  });
}

const drive = { files: { get: vi.fn() } } as unknown as drive_v3.Drive;

describe("assertDriveRootIsolated", () => {
  beforeEach(() => {
    mocks.assertFolderWithinRoot.mockReset();
    mocks.createServiceRoleClient.mockReset();
    setServiceConnections({ data: [], error: null });
  });

  it("accepts unrelated roots", async () => {
    mocks.assertFolderWithinRoot.mockRejectedValue(new mocks.FolderOutsideRootError());
    const supabase = makeSupabase();
    setServiceConnections({
      data: [{ org_id: "org-2", root_folder_id: "root-b" }],
      error: null,
    });

    await expect(assertDriveRootIsolated(drive, supabase, "user-1", "org-1", "root-a"))
      .resolves.toBeUndefined();
  });

  it("rejects an exact root collision across organizations", async () => {
    const supabase = makeSupabase();
    setServiceConnections({
      data: [{ org_id: "org-2", root_folder_id: "root-a" }],
      error: null,
    });

    await expect(assertDriveRootIsolated(drive, supabase, "user-1", "org-1", "root-a"))
      .rejects.toBeInstanceOf(DriveRootIsolationError);
    expect(mocks.assertFolderWithinRoot).not.toHaveBeenCalled();
  });

  it("rejects the legacy root sentinel when another organization is active", async () => {
    const supabase = makeSupabase();

    await expect(assertDriveRootIsolated(drive, supabase, "user-1", "org-1", "root"))
      .rejects.toBeInstanceOf(DriveRootIsolationError);
    expect(mocks.createServiceRoleClient).not.toHaveBeenCalled();
  });

  it("rejects when the selected root is nested under another organization root", async () => {
    mocks.assertFolderWithinRoot.mockImplementation(async (_drive, folderId, rootId) => {
      if (folderId === "root-a" && rootId === "root-b") return;
      throw new mocks.FolderOutsideRootError();
    });
    const supabase = makeSupabase();
    setServiceConnections({
      data: [{ org_id: "org-2", root_folder_id: "root-b" }],
      error: null,
    });

    await expect(assertDriveRootIsolated(drive, supabase, "user-1", "org-1", "root-a"))
      .rejects.toBeInstanceOf(DriveRootIsolationError);
  });

  it("rejects when another organization root is nested under the selected root", async () => {
    mocks.assertFolderWithinRoot.mockImplementation(async (_drive, folderId, rootId) => {
      if (folderId === "root-b" && rootId === "root-a") return;
      throw new mocks.FolderOutsideRootError();
    });
    const supabase = makeSupabase();
    setServiceConnections({
      data: [{ org_id: "org-2", root_folder_id: "root-b" }],
      error: null,
    });

    await expect(assertDriveRootIsolated(drive, supabase, "user-1", "org-1", "root-a"))
      .rejects.toBeInstanceOf(DriveRootIsolationError);
  });

  it("does not compare roots from the same organization", async () => {
    const supabase = makeSupabase();
    setServiceConnections({
      data: [{ org_id: "org-1", root_folder_id: "root-a" }],
      error: null,
    });

    await expect(assertDriveRootIsolated(drive, supabase, "user-1", "org-1", "root-a"))
      .resolves.toBeUndefined();
    expect(mocks.assertFolderWithinRoot).not.toHaveBeenCalled();
  });

  it.each([
    { data: null, error: new Error("query failed") },
    { data: [{ org_id: "org-2" }], error: null },
    { data: [{ org_id: "org-2", root_folder_id: "" }], error: null },
  ])("fails closed for malformed or unavailable connection metadata", async (result) => {
    const supabase = makeSupabase();
    setServiceConnections(result);

    await expect(assertDriveRootIsolated(drive, supabase, "user-1", "org-1", "root-a"))
      .rejects.toBeInstanceOf(DriveRootIsolationError);
  });

  it("fails closed when the actor is not an active member", async () => {
    const supabase = makeSupabase({ data: null, error: null });

    await expect(assertDriveRootIsolated(drive, supabase, "user-2", "org-1", "root-a"))
      .rejects.toBeInstanceOf(DriveRootIsolationError);
    expect(mocks.createServiceRoleClient).not.toHaveBeenCalled();
  });

  it("fails closed when membership metadata does not identify the actor", async () => {
    const supabase = makeSupabase({ data: { user_id: "user-2" }, error: null });

    await expect(assertDriveRootIsolated(drive, supabase, "user-1", "org-1", "root-a"))
      .rejects.toBeInstanceOf(DriveRootIsolationError);
    expect(mocks.createServiceRoleClient).not.toHaveBeenCalled();
  });

  it("compares a root from an organization hidden by user-scoped RLS", async () => {
    mocks.assertFolderWithinRoot.mockImplementation(async (_drive, folderId, rootId) => {
      if (folderId === "root-a" && rootId === "root-b") return;
      throw new mocks.FolderOutsideRootError();
    });
    const supabase = makeSupabase();
    setServiceConnections({
      data: [{ org_id: "org-2", root_folder_id: "root-b" }],
      error: null,
    });

    await expect(assertDriveRootIsolated(drive, supabase, "user-1", "org-1", "root-a"))
      .rejects.toBeInstanceOf(DriveRootIsolationError);
  });
});
