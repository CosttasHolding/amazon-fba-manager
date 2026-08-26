import { beforeEach, describe, expect, it, vi } from "vitest";
import { createMockRequest } from "@/lib/test-utils/mock-request";

const mockCreateClient = vi.hoisted(() => vi.fn());
const mockGetOrgId = vi.hoisted(() => vi.fn());
const mockHasOrgRole = vi.hoisted(() => vi.fn());
const mockGetDriveClientForConnection = vi.hoisted(() => vi.fn());
const mockAssertFolderWithinRoot = vi.hoisted(() => vi.fn());
const mockEnforceDriveRateLimit = vi.hoisted(() => vi.fn());

vi.mock("@/lib/supabase/server", () => ({ createClient: mockCreateClient }));
vi.mock("@/lib/org-resolver", () => ({ getOrgId: mockGetOrgId }));
vi.mock("@/lib/api-handler", () => ({ hasOrgRole: mockHasOrgRole }));
vi.mock("@/lib/drive", () => ({
  getDriveClientForConnection: mockGetDriveClientForConnection,
}));
vi.mock("@/lib/drive/folder-guard", () => ({
  assertFolderWithinRoot: mockAssertFolderWithinRoot,
  FolderOutsideRootError: class FolderOutsideRootError extends Error {},
}));
vi.mock("@/lib/drive/rate-limit", () => ({ enforceDriveRateLimit: mockEnforceDriveRateLimit }));

import { POST } from "./route";

const DATA_TYPES = ["products", "sales", "orders", "inventory", "suppliers"] as const;

function makeQuery(data: unknown, eqCalls: Array<[string, string]>) {
  const query = {
    select: vi.fn(() => query),
    eq: vi.fn((column: string, value: string) => {
      eqCalls.push([column, value]);
      return query;
    }),
    order: vi.fn(() => query),
    maybeSingle: vi.fn(() => Promise.resolve({ data, error: null })),
    then: (resolve: (value: unknown) => unknown, reject: (reason: unknown) => unknown) =>
      Promise.resolve({ data, error: null }).then(resolve, reject),
  };
  return query;
}

describe("POST /api/drive/backup", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockGetOrgId.mockResolvedValue("org-1");
    mockHasOrgRole.mockResolvedValue(true);
    mockEnforceDriveRateLimit.mockResolvedValue(null);
    mockAssertFolderWithinRoot.mockResolvedValue(undefined);
    mockGetDriveClientForConnection.mockResolvedValue({
      drive: {
        files: {
          list: vi.fn().mockResolvedValue({ data: { files: [] } }),
          create: vi.fn()
            .mockResolvedValueOnce({ data: { id: "backup-folder" } })
            .mockResolvedValueOnce({ data: { id: "backup-file", name: "backup.xlsx" } }),
        },
      },
      connection: { rootFolderId: "connection-root" },
    });
  });

  it.each(DATA_TYPES)("filters %s data by org_id and writes below the connection root", async (type) => {
    const dataEqCalls: Array<[string, string]> = [];
    const supabase = {
      auth: { getUser: vi.fn().mockResolvedValue({ data: { user: { id: "user-1" } } }) },
      from: vi.fn((table: string) => {
        if (table === "org_members") {
          return makeQuery({ org_id: "org-1" }, []);
        }
        return makeQuery([], dataEqCalls);
      }),
    };
    mockCreateClient.mockResolvedValue(supabase);

    const response = await POST(
      createMockRequest("http://localhost/api/drive/backup", {
        method: "POST",
        body: JSON.stringify({ type }),
        headers: { "x-org-id": "org-1" },
      })
    );

    expect(response.status).toBe(200);
    expect(dataEqCalls).toEqual(expect.arrayContaining([["org_id", "org-1"]]));
    expect(dataEqCalls).not.toEqual(expect.arrayContaining([["user_id", "user-1"]]));
    expect(mockGetDriveClientForConnection).toHaveBeenCalledWith(
      expect.anything(),
      "user-1",
      "org-1",
      undefined,
    );
    expect(mockAssertFolderWithinRoot).toHaveBeenCalledWith(
      expect.anything(),
      "backup-folder",
      "connection-root",
    );
    expect(mockAssertFolderWithinRoot).toHaveBeenCalledTimes(2);
  });

  it("rejects a requested organization that is not the resolved tenant", async () => {
    const supabase = {
      auth: { getUser: vi.fn().mockResolvedValue({ data: { user: { id: "user-1" } } }) },
      from: vi.fn(),
    };
    mockCreateClient.mockResolvedValue(supabase);

    const response = await POST(
      createMockRequest("http://localhost/api/drive/backup", {
        method: "POST",
        body: JSON.stringify({ type: "products" }),
        headers: { "x-org-id": "org-other" },
      })
    );

    expect(response.status).toBe(403);
    expect(mockGetDriveClientForConnection).not.toHaveBeenCalled();
  });

  it("returns 401 without a user and does not create a Drive client", async () => {
    mockCreateClient.mockResolvedValue({
      auth: { getUser: vi.fn().mockResolvedValue({ data: { user: null } }) },
    });

    const response = await POST(
      createMockRequest("http://localhost/api/drive/backup", {
        method: "POST",
        body: JSON.stringify({ type: "products" }),
      }),
    );

    expect(response.status).toBe(401);
    expect(mockGetDriveClientForConnection).not.toHaveBeenCalled();
  });

  it("returns 403 for viewers and does not create a Drive client", async () => {
    mockCreateClient.mockResolvedValue({
      auth: { getUser: vi.fn().mockResolvedValue({ data: { user: { id: "user-1" } } }) },
    });
    mockHasOrgRole.mockResolvedValue(false);

    const response = await POST(
      createMockRequest("http://localhost/api/drive/backup", {
        method: "POST",
        body: JSON.stringify({ type: "products" }),
      }),
    );

    expect(response.status).toBe(403);
    expect(mockGetDriveClientForConnection).not.toHaveBeenCalled();
  });

  it("returns 400 for malformed JSON without calling Drive", async () => {
    mockCreateClient.mockResolvedValue({
      auth: { getUser: vi.fn().mockResolvedValue({ data: { user: { id: "user-1" } } }) },
    });

    const response = await POST(
      createMockRequest("http://localhost/api/drive/backup", {
        method: "POST",
        body: "{ malformed",
      }),
    );

    expect(response.status).toBe(400);
    expect(mockGetDriveClientForConnection).not.toHaveBeenCalled();
  });
});
