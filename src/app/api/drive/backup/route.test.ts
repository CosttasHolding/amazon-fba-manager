import { beforeEach, describe, expect, it, vi } from "vitest";
import { createMockRequest } from "@/lib/test-utils/mock-request";

const mockCreateClient = vi.hoisted(() => vi.fn());
const mockGetOrgId = vi.hoisted(() => vi.fn());
const mockHasOrgRole = vi.hoisted(() => vi.fn());
const mockGetDriveClient = vi.hoisted(() => vi.fn());
const mockGetDriveRootFolderId = vi.hoisted(() => vi.fn());

vi.mock("@/lib/supabase/server", () => ({ createClient: mockCreateClient }));
vi.mock("@/lib/org-resolver", () => ({ getOrgId: mockGetOrgId }));
vi.mock("@/lib/api-handler", () => ({ hasOrgRole: mockHasOrgRole }));
vi.mock("@/lib/drive", () => ({
  getDriveClient: mockGetDriveClient,
  getDriveRootFolderId: mockGetDriveRootFolderId,
}));

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
    mockGetDriveRootFolderId.mockResolvedValue("shared-root");
    mockGetDriveClient.mockResolvedValue({
      files: {
        list: vi.fn().mockResolvedValue({ data: { files: [] } }),
        create: vi.fn()
          .mockResolvedValueOnce({ data: { id: "backup-folder" } })
          .mockResolvedValueOnce({ data: { id: "backup-file", name: "backup.xlsx" } }),
      },
    });
  });

  it.each(DATA_TYPES)("filters %s data by org_id and writes below the shared Drive root", async (type) => {
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
    expect(mockGetDriveClient).toHaveBeenCalledWith("user-1");
    expect(mockGetDriveRootFolderId).toHaveBeenCalledWith(expect.anything(), "org-1");
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
    expect(mockGetDriveClient).not.toHaveBeenCalled();
  });
});
