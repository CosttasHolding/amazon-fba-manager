import { beforeEach, describe, expect, it, vi } from "vitest";
import { createMockRequest } from "@/lib/test-utils/mock-request";

const mocks = vi.hoisted(() => ({
  createClient: vi.fn(),
  getOrgId: vi.fn(),
  enforceDriveRateLimit: vi.fn(),
  getDriveClientForConnection: vi.fn(),
}));

vi.mock("@/lib/supabase/server", () => ({ createClient: mocks.createClient }));
vi.mock("@/lib/org-resolver", () => ({ getOrgId: mocks.getOrgId }));
vi.mock("@/lib/drive/rate-limit", () => ({ enforceDriveRateLimit: mocks.enforceDriveRateLimit }));
vi.mock("@/lib/drive", () => ({ getDriveClientForConnection: mocks.getDriveClientForConnection }));

import { GET } from "./route";

type FolderMetadata = {
  parents: string[];
  trashed?: boolean;
};

function makeDrive(folderMetadata: Record<string, FolderMetadata>) {
  return {
    files: {
      get: vi.fn(async ({ fileId }: { fileId: string }) => ({ data: folderMetadata[fileId] })),
      list: vi.fn().mockResolvedValue({
        data: {
          files: [{
            id: "file-a",
            name: "report.pdf",
            mimeType: "application/pdf",
            size: "42",
            modifiedTime: "2026-08-25T00:00:00Z",
            createdTime: "2026-08-24T00:00:00Z",
            parents: ["folder-a"],
            webViewLink: "https://drive.google.com/file/d/file-a/view",
          }],
          nextPageToken: null,
        },
      }),
    },
  };
}

function makeConnection() {
  return {
    id: "connection-a",
    label: "Org A Drive",
    googleAccountEmail: "org-a@example.com",
    rootFolderId: "root-a",
    status: "active" as const,
  };
}

function configureRoute(drive: ReturnType<typeof makeDrive>) {
  const supabase = {
    auth: { getUser: vi.fn().mockResolvedValue({ data: { user: { id: "user-a" } } }) },
  };
  mocks.createClient.mockResolvedValue(supabase);
  mocks.getOrgId.mockResolvedValue("org-a");
  mocks.enforceDriveRateLimit.mockResolvedValue(null);
  mocks.getDriveClientForConnection.mockResolvedValue({ drive, connection: makeConnection() });
}

describe("GET /api/drive/list folder containment", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("rejects a folder under another root before calling Drive list", async () => {
    const drive = makeDrive({
      "folder-b": { parents: ["root-b"] },
      "root-b": { parents: [] },
    });
    configureRoute(drive);

    const response = await GET(createMockRequest(
      "http://localhost/api/drive/list?folderId=folder-b",
    ));

    expect(response.status).toBe(403);
    expect(drive.files.get).toHaveBeenNthCalledWith(1, {
      fileId: "folder-b",
      fields: "id,parents,trashed",
    });
    expect(drive.files.get).toHaveBeenNthCalledWith(2, {
      fileId: "root-b",
      fields: "id,parents,trashed",
    });
    expect(drive.files.list).not.toHaveBeenCalled();
  });

  it("lists a folder under the connection root and returns its webViewLink", async () => {
    const drive = makeDrive({
      "folder-a": { parents: ["root-a"] },
      "file-a": { parents: ["folder-a"] },
    });
    configureRoute(drive);

    const response = await GET(createMockRequest(
      "http://localhost/api/drive/list?folderId=folder-a",
    ));
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(drive.files.list).toHaveBeenCalledWith(expect.objectContaining({
      q: "'folder-a' in parents and trashed = false",
    }));
    expect(body.data.files).toEqual([expect.objectContaining({
      id: "file-a",
      webViewLink: "https://drive.google.com/file/d/file-a/view",
    })]);
  });

  it("rejects a listed file with an outside multi-parent branch", async () => {
    const drive = makeDrive({
      "file-a": { parents: ["root-a", "root-b"] },
      "root-b": { parents: [] },
    });
    configureRoute(drive);

    const response = await GET(createMockRequest(
      "http://localhost/api/drive/list",
    ));

    expect(response.status).toBe(403);
    expect(drive.files.list).toHaveBeenCalledTimes(1);
  });

  it("rejects a listed file whose parent graph contains a cycle", async () => {
    const drive = makeDrive({
      "file-a": { parents: ["folder-a"] },
      "folder-a": { parents: ["file-a"] },
    });
    configureRoute(drive);

    const response = await GET(createMockRequest(
      "http://localhost/api/drive/list",
    ));

    expect(response.status).toBe(403);
  });

  it("rejects a listed file marked as trashed by metadata", async () => {
    const drive = makeDrive({
      "file-a": { parents: ["root-a"], trashed: true },
    });
    configureRoute(drive);

    const response = await GET(createMockRequest(
      "http://localhost/api/drive/list",
    ));

    expect(response.status).toBe(403);
  });

  it("rejects a listed file with missing metadata", async () => {
    const drive = makeDrive({});
    configureRoute(drive);

    const response = await GET(createMockRequest(
      "http://localhost/api/drive/list",
    ));

    expect(response.status).toBe(403);
  });
});
