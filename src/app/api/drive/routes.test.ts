import { beforeEach, describe, expect, it, vi } from "vitest";
import { createMockRequest } from "@/lib/test-utils/mock-request";

const mocks = vi.hoisted(() => ({
  createClient: vi.fn(),
  getOrgId: vi.fn(),
  hasOrgRole: vi.fn(),
  getDriveClientForConnection: vi.fn(),
  assertFolderWithinRoot: vi.fn(),
  assertFileWithinRoot: vi.fn(),
  enforceDriveRateLimit: vi.fn(),
  FolderOutsideRootError: class FolderOutsideRootError extends Error {},
}));
type FolderGuard = typeof import("@/lib/drive/folder-guard").assertFolderWithinRoot;
const realFolderGuard = vi.hoisted(() => ({
  assertFolderWithinRoot: undefined as FolderGuard | undefined,
}));

vi.mock("@/lib/supabase/server", () => ({ createClient: mocks.createClient }));
vi.mock("@/lib/org-resolver", () => ({ getOrgId: mocks.getOrgId }));
vi.mock("@/lib/api-handler", () => ({ hasOrgRole: mocks.hasOrgRole }));
vi.mock("@/lib/drive", () => ({
  getDriveClientForConnection: mocks.getDriveClientForConnection,
}));
vi.mock("@/lib/drive/rate-limit", () => ({ enforceDriveRateLimit: mocks.enforceDriveRateLimit }));
vi.mock("@/lib/drive/folder-guard", async () => {
  const actual = await vi.importActual<typeof import("@/lib/drive/folder-guard")>("@/lib/drive/folder-guard");
  realFolderGuard.assertFolderWithinRoot = actual.assertFolderWithinRoot;
  return {
    FolderOutsideRootError: mocks.FolderOutsideRootError,
    assertFolderWithinRoot: mocks.assertFolderWithinRoot,
    assertFileWithinRoot: mocks.assertFileWithinRoot,
  };
});

import { POST as upload } from "./upload/route";
import { GET as list } from "./list/route";
import { POST as folders } from "./folders/route";
import { GET as download } from "./download/[id]/route";
import { PATCH as rename } from "./rename/[id]/route";
import { PUT as update } from "./update/[id]/route";
import { DELETE as remove } from "./delete/[id]/route";

const user = { id: "user-1" };

function makeDrive() {
  return {
    files: {
      list: vi.fn().mockResolvedValue({ data: { files: [], nextPageToken: null } }),
      create: vi.fn().mockResolvedValue({ data: { id: "file-1", name: "file.txt", mimeType: "text/plain" } }),
      update: vi.fn().mockResolvedValue({ data: { id: "file-1", name: "file.txt" } }),
      get: vi.fn().mockResolvedValue({ data: { mimeType: "text/plain", parents: ["root"] } }),
      delete: vi.fn().mockResolvedValue({}),
    },
  };
}

function makeConnection(rootFolderId = "connection-root") {
  return {
    id: "connection-1",
    label: "Proyecto",
    googleAccountEmail: "owner@example.com",
    rootFolderId,
    status: "active" as const,
  };
}

function makeUploadRequest(fileName = "report.txt", folderId?: string) {
  const form = new FormData();
  form.append("file", new Blob(["report"], { type: "text/plain" }), fileName);
  if (folderId) form.append("folderId", folderId);
  return { formData: () => Promise.resolve(form) };
}

describe("Drive routes", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.createClient.mockResolvedValue({
      auth: { getUser: vi.fn().mockResolvedValue({ data: { user } }) },
    });
    mocks.getOrgId.mockResolvedValue("org-1");
    mocks.hasOrgRole.mockResolvedValue(true);
    mocks.enforceDriveRateLimit.mockResolvedValue(null);
    mocks.assertFolderWithinRoot.mockResolvedValue(undefined);
    mocks.assertFileWithinRoot.mockResolvedValue(undefined);
    mocks.getDriveClientForConnection.mockResolvedValue({
      drive: makeDrive(),
      connection: makeConnection(),
    });
  });

  it("returns the connection metadata, file links and pagination from list", async () => {
    const drive = makeDrive();
    drive.files.list.mockResolvedValue({
      data: {
        files: [{
          id: "file-1",
          name: "report.txt",
          mimeType: "text/plain",
          size: "12",
          modifiedTime: "2026-08-24T00:00:00Z",
          createdTime: "2026-08-23T00:00:00Z",
          parents: ["connection-root"],
          webViewLink: "https://drive.google.com/file/d/file-1/view",
          iconLink: "https://drive.google.com/icon.png",
        }],
        nextPageToken: "next-page",
      },
    });
    mocks.getDriveClientForConnection.mockResolvedValue({ drive, connection: makeConnection() });

    const response = await list(createMockRequest("http://localhost/api/drive/list?pageToken=page-1"));
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(mocks.getDriveClientForConnection).toHaveBeenCalledWith(
      expect.anything(),
      "user-1",
      "org-1",
      undefined,
    );
    expect(body.data.connection).toEqual({
      id: "connection-1",
      label: "Proyecto",
      google_account_email: "owner@example.com",
      status: "active",
    });
    expect(JSON.stringify(body)).not.toMatch(/refresh_token|encrypted|ciphertext|access_token/i);
    expect(body.data.files[0]).toMatchObject({
      id: "file-1",
      name: "report.txt",
      webViewLink: "https://drive.google.com/file/d/file-1/view",
      iconLink: "https://drive.google.com/icon.png",
      isFolder: false,
    });
    expect(body.data.nextPageToken).toBe("next-page");
    expect(drive.files.list).toHaveBeenCalledWith({
      q: "'connection-root' in parents and trashed = false",
      fields: "files(id,name,mimeType,size,modifiedTime,createdTime,parents,webViewLink,iconLink),nextPageToken",
      orderBy: "folder,name_natural",
      pageSize: 1000,
      pageToken: "page-1",
      supportsAllDrives: true,
      includeItemsFromAllDrives: true,
    });
  });

  it("returns 401 without a user and does not resolve a connection or provider", async () => {
    mocks.createClient.mockResolvedValue({
      auth: { getUser: vi.fn().mockResolvedValue({ data: { user: null } }) },
    });

    const response = await list(createMockRequest("http://localhost/api/drive/list"));

    expect(response.status).toBe(401);
    expect(mocks.getDriveClientForConnection).not.toHaveBeenCalled();
  });

  it("returns 429 before authentication for a mutation when rate limited", async () => {
    const blocked = new Response(JSON.stringify({ error: "rate-limited" }), { status: 429 });
    mocks.enforceDriveRateLimit.mockResolvedValue(blocked);

    const response = await upload(makeUploadRequest() as never);

    expect(response.status).toBe(429);
    expect(mocks.createClient).not.toHaveBeenCalled();
  });

  it("returns 400 without an active organization and does not resolve a connection or provider", async () => {
    mocks.getOrgId.mockResolvedValue(null);

    const response = await list(createMockRequest("http://localhost/api/drive/list"));

    expect(response.status).toBe(400);
    expect(mocks.getDriveClientForConnection).not.toHaveBeenCalled();
  });

  it("returns 429 before authentication or provider work when rate limited", async () => {
    const blocked = new Response(JSON.stringify({ error: "rate-limited" }), { status: 429 });
    mocks.enforceDriveRateLimit.mockResolvedValue(blocked);

    const response = await list(createMockRequest("http://localhost/api/drive/list"));

    expect(response.status).toBe(429);
    expect(mocks.createClient).not.toHaveBeenCalled();
    expect(mocks.getDriveClientForConnection).not.toHaveBeenCalled();
  });

  it("uses an explicit connection id and rejects a connection from another organization before Google", async () => {
    const providerError = new Error("Drive no conectado: conexión no encontrada");
    mocks.getDriveClientForConnection.mockRejectedValue(providerError);

    const response = await list(createMockRequest(
      "http://localhost/api/drive/list?connectionId=foreign-connection",
    ));
    const body = await response.json();

    expect(response.status).toBe(403);
    expect(body).toEqual({ error: "Drive no conectado" });
    expect(mocks.getDriveClientForConnection).toHaveBeenCalledWith(
      expect.anything(),
      "user-1",
      "org-1",
      "foreign-connection",
    );
  });

  it.each(["Drive no conectado: conexión no encontrada", "Drive no conectado: autorización revocada"])(
    "returns a controlled response for a missing or revoked connection",
    async (message) => {
      mocks.getDriveClientForConnection.mockRejectedValue(new Error(message));

      const response = await list(createMockRequest("http://localhost/api/drive/list"));
      const body = await response.json();

      expect(response.status).toBe(403);
      expect(body).toEqual({ error: "Drive no conectado" });
      expect(JSON.stringify(body)).not.toContain(message);
    },
  );

  it("resolves the root alias to the connection root without sending root to Google", async () => {
    const drive = makeDrive();
    mocks.getDriveClientForConnection.mockResolvedValue({
      drive,
      connection: makeConnection("org-specific-root"),
    });

    const response = await list(createMockRequest("http://localhost/api/drive/list?folderId=root"));

    expect(response.status).toBe(200);
    expect(mocks.assertFolderWithinRoot).not.toHaveBeenCalled();
    expect(drive.files.list).toHaveBeenCalledWith(expect.objectContaining({
      q: "'org-specific-root' in parents and trashed = false",
    }));
    expect(JSON.stringify(drive.files.list.mock.calls[0][0])).not.toContain('"root"');
  });

  it("rejects a folder under another connection root before listing", async () => {
    mocks.assertFolderWithinRoot.mockRejectedValue(new mocks.FolderOutsideRootError());

    const response = await list(createMockRequest("http://localhost/api/drive/list?folderId=foreign-folder"));

    expect(response.status).toBe(403);
    expect(mocks.assertFolderWithinRoot).toHaveBeenCalledWith(
      expect.anything(),
      "foreign-folder",
      "connection-root",
    );
    const { drive } = await mocks.getDriveClientForConnection.mock.results[0].value;
    expect(drive.files.list).not.toHaveBeenCalled();
  });

  it.each(["upload", "list", "download", "rename", "update", "delete"] as const)(
    "rejects a foreign root for %s before the Drive operation",
    async (operation) => {
      const drive = makeDrive();
      mocks.getDriveClientForConnection.mockResolvedValue({ drive, connection: makeConnection() });
      if (operation === "upload" || operation === "list") {
        mocks.assertFolderWithinRoot.mockRejectedValue(new mocks.FolderOutsideRootError());
      } else {
        mocks.assertFileWithinRoot.mockRejectedValue(new mocks.FolderOutsideRootError());
      }

      const response = operation === "upload"
        ? await upload(makeUploadRequest("report.txt", "foreign-folder") as never)
        : operation === "list"
          ? await list(createMockRequest("http://localhost/api/drive/list?folderId=foreign-folder"))
          : operation === "download"
            ? await download(createMockRequest("http://localhost/api/drive/download/file-1"), {
              params: { id: "file-1" },
            })
            : operation === "rename"
              ? await rename(createMockRequest("http://localhost/api/drive/rename/file-1", {
                method: "PATCH",
                body: JSON.stringify({ name: "renamed.txt" }),
              }), { params: { id: "file-1" } })
              : operation === "update"
                ? await update(createMockRequest("http://localhost/api/drive/update/file-1", {
                  method: "PUT",
                  body: JSON.stringify({ content: "updated" }),
                }), { params: { id: "file-1" } })
                : await remove(createMockRequest("http://localhost/api/drive/delete/file-1", {
                  method: "DELETE",
                }), { params: { id: "file-1" } });

      expect(response.status).toBe(403);
      expect(drive.files.list).not.toHaveBeenCalled();
      expect(drive.files.create).not.toHaveBeenCalled();
      expect(drive.files.update).not.toHaveBeenCalled();
      expect(drive.files.get).not.toHaveBeenCalled();
      expect(drive.files.delete).not.toHaveBeenCalled();
    },
  );

  it("rejects folder creation for viewers", async () => {
    mocks.hasOrgRole.mockResolvedValue(false);

    const response = await folders(createMockRequest("http://localhost/api/drive/folders", {
      method: "POST",
      body: JSON.stringify({ name: "Reports" }),
    }));

    expect(response.status).toBe(403);
    expect(mocks.getDriveClientForConnection).not.toHaveBeenCalled();
  });

  it.each(["upload", "folders", "rename", "update", "delete"] as const)(
    "rejects viewer %s mutations before any Drive call",
    async (mutation) => {
      mocks.hasOrgRole.mockResolvedValue(false);

      const response = mutation === "upload"
        ? await upload(makeUploadRequest() as never)
        : mutation === "folders"
          ? await folders(createMockRequest("http://localhost/api/drive/folders", {
            method: "POST",
            body: JSON.stringify({ name: "Reports" }),
          }))
          : mutation === "rename"
            ? await rename(createMockRequest("http://localhost/api/drive/rename/file-1", {
              method: "PATCH",
              body: JSON.stringify({ name: "renamed.txt" }),
            }), { params: { id: "file-1" } })
            : mutation === "update"
              ? await update(createMockRequest("http://localhost/api/drive/update/file-1", {
                method: "PUT",
                body: JSON.stringify({ content: "updated" }),
              }), { params: { id: "file-1" } })
              : await remove(createMockRequest("http://localhost/api/drive/delete/file-1", {
                method: "DELETE",
              }), { params: { id: "file-1" } });

      expect(response.status).toBe(403);
      expect(mocks.getDriveClientForConnection).not.toHaveBeenCalled();
    },
  );

  it("rejects invalid names before renaming a file", async () => {
    const response = await rename(
      createMockRequest("http://localhost/api/drive/rename/file-1", {
        method: "PATCH",
        body: JSON.stringify({ name: "\n" }),
      }),
      { params: { id: "file-1" } },
    );

    expect(response.status, await response.text()).toBe(400);
    expect(mocks.getDriveClientForConnection).not.toHaveBeenCalled();
  });

  it("rejects text updates larger than one megabyte", async () => {
    const response = await update(
      createMockRequest("http://localhost/api/drive/update/file-1", {
        method: "PUT",
        body: JSON.stringify({ content: "a".repeat(1_000_001) }),
      }),
      { params: { id: "file-1" } },
    );

    expect(response.status, await response.text()).toBe(400);
    expect(mocks.getDriveClientForConnection).not.toHaveBeenCalled();
  });

  it("rejects deleting a folder", async () => {
    const drive = makeDrive();
    drive.files.get.mockResolvedValue({ data: { mimeType: "application/vnd.google-apps.folder" } });
    mocks.getDriveClientForConnection.mockResolvedValue({ drive, connection: makeConnection() });

    const response = await remove(
      createMockRequest("http://localhost/api/drive/delete/folder-1", { method: "DELETE" }),
      { params: { id: "folder-1" } },
    );

    expect(response.status).toBe(400);
    expect(drive.files.delete).not.toHaveBeenCalled();
  });

  it("uploads below the resolved root with the expected Drive arguments", async () => {
    const drive = makeDrive();
    drive.files.create.mockResolvedValue({
      data: {
        id: "uploaded-1",
        name: "report.txt",
        mimeType: "text/plain",
        size: "6",
        modifiedTime: "2026-08-25T00:00:00Z",
      },
    });
    mocks.getDriveClientForConnection.mockResolvedValue({ drive, connection: makeConnection() });

    const response = await upload(makeUploadRequest("report.txt", "folder-1") as never);
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body.data).toMatchObject({ id: "uploaded-1", name: "report.txt" });
    expect(mocks.getDriveClientForConnection).toHaveBeenCalledWith(expect.anything(), "user-1", "org-1", undefined);
    expect(mocks.assertFolderWithinRoot).toHaveBeenCalledWith(drive, "folder-1", "connection-root");
    expect(drive.files.create).toHaveBeenCalledWith({
      requestBody: { name: "report.txt", parents: ["folder-1"] },
      media: { mimeType: "text/plain", body: expect.anything() },
      fields: "id,name,mimeType,size,modifiedTime,createdTime,parents,webViewLink,iconLink",
    });
    expect(mocks.assertFolderWithinRoot.mock.invocationCallOrder[0]).toBeLessThan(
      drive.files.create.mock.invocationCallOrder[0],
    );
  });

  it("uses real ancestor metadata in the route containment check before upload", async () => {
    const drive = makeDrive();
    const metadata = {
      "nested-folder": { parents: ["child-folder"] },
      "child-folder": { parents: ["connection-root"] },
    };
    drive.files.get.mockImplementation(async ({ fileId }: { fileId: string }) => ({
      data: metadata[fileId as keyof typeof metadata],
    }));
    mocks.assertFolderWithinRoot.mockImplementation(async (candidateDrive, folderId, rootId) => {
      await realFolderGuard.assertFolderWithinRoot!(candidateDrive, folderId, rootId);
    });
    mocks.getDriveClientForConnection.mockResolvedValue({ drive, connection: makeConnection() });

    const response = await upload(makeUploadRequest("report.txt", "nested-folder") as never);

    expect(response.status).toBe(200);
    expect(drive.files.get).toHaveBeenNthCalledWith(1, {
      fileId: "nested-folder",
      fields: "id,parents,trashed",
    });
    expect(drive.files.get).toHaveBeenNthCalledWith(2, {
      fileId: "child-folder",
      fields: "id,parents,trashed",
    });
    expect(drive.files.create).toHaveBeenCalled();
  });

  it("creates a folder below the resolved root with the expected Drive arguments", async () => {
    const drive = makeDrive();
    drive.files.create.mockResolvedValue({
      data: { id: "folder-2", name: "Reports", mimeType: "application/vnd.google-apps.folder", createdTime: "2026-08-25T00:00:00Z" },
    });
    mocks.getDriveClientForConnection.mockResolvedValue({ drive, connection: makeConnection() });

    const response = await folders(createMockRequest("http://localhost/api/drive/folders", {
      method: "POST",
      body: JSON.stringify({ name: "Reports", parentId: "folder-1" }),
    }));
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body.data.id).toBe("folder-2");
    expect(mocks.getDriveClientForConnection).toHaveBeenCalledWith(expect.anything(), "user-1", "org-1", undefined);
    expect(mocks.assertFolderWithinRoot).toHaveBeenCalledWith(drive, "folder-1", "connection-root");
    expect(drive.files.create).toHaveBeenCalledWith({
      requestBody: {
        name: "Reports",
        mimeType: "application/vnd.google-apps.folder",
        parents: ["folder-1"],
      },
      fields: "id,name,mimeType,createdTime",
    });
    expect(mocks.assertFolderWithinRoot.mock.invocationCallOrder[0]).toBeLessThan(
      drive.files.create.mock.invocationCallOrder[0],
    );
  });

  it("renames a contained file with the expected Drive arguments", async () => {
    const drive = makeDrive();
    mocks.getDriveClientForConnection.mockResolvedValue({ drive, connection: makeConnection() });

    const response = await rename(createMockRequest("http://localhost/api/drive/rename/file-1", {
      method: "PATCH",
      body: JSON.stringify({ name: "renamed.txt" }),
    }), { params: { id: "file-1" } });

    expect(response.status).toBe(200);
    expect(mocks.getDriveClientForConnection).toHaveBeenCalledWith(expect.anything(), "user-1", "org-1", undefined);
    expect(mocks.assertFileWithinRoot).toHaveBeenCalledWith(drive, "file-1", "connection-root");
    expect(drive.files.update).toHaveBeenCalledWith({
      fileId: "file-1",
      requestBody: { name: "renamed.txt" },
      fields: "id,name",
    });
    expect(mocks.assertFileWithinRoot.mock.invocationCallOrder[0]).toBeLessThan(
      drive.files.update.mock.invocationCallOrder[0],
    );
  });

  it("updates a contained file with the expected Drive arguments", async () => {
    const drive = makeDrive();
    mocks.getDriveClientForConnection.mockResolvedValue({ drive, connection: makeConnection() });

    const response = await update(createMockRequest("http://localhost/api/drive/update/file-1", {
      method: "PUT",
      body: JSON.stringify({ content: "updated" }),
    }), { params: { id: "file-1" } });

    expect(response.status).toBe(200);
    expect(mocks.getDriveClientForConnection).toHaveBeenCalledWith(expect.anything(), "user-1", "org-1", undefined);
    expect(mocks.assertFileWithinRoot).toHaveBeenCalledWith(drive, "file-1", "connection-root");
    expect(drive.files.update).toHaveBeenCalledWith({
      fileId: "file-1",
      media: { mimeType: "text/plain; charset=utf-8", body: expect.anything() },
    });
    expect(mocks.assertFileWithinRoot.mock.invocationCallOrder[0]).toBeLessThan(
      drive.files.update.mock.invocationCallOrder[0],
    );
  });

  it("deletes a contained file with the expected Drive arguments", async () => {
    const drive = makeDrive();
    mocks.getDriveClientForConnection.mockResolvedValue({ drive, connection: makeConnection() });

    const response = await remove(createMockRequest("http://localhost/api/drive/delete/file-1", {
      method: "DELETE",
    }), { params: { id: "file-1" } });

    expect(response.status).toBe(200);
    expect(mocks.getDriveClientForConnection).toHaveBeenCalledWith(expect.anything(), "user-1", "org-1", undefined);
    expect(mocks.assertFileWithinRoot).toHaveBeenCalledWith(drive, "file-1", "connection-root");
    expect(drive.files.get).toHaveBeenCalledWith({ fileId: "file-1", fields: "mimeType" });
    expect(drive.files.delete).toHaveBeenCalledWith({ fileId: "file-1" });
    expect(mocks.assertFileWithinRoot.mock.invocationCallOrder[0]).toBeLessThan(
      drive.files.get.mock.invocationCallOrder[0],
    );
  });

  it("rejects uploads larger than ten megabytes", async () => {
    const form = new FormData();
    form.append("file", new Blob([new Uint8Array(10 * 1024 * 1024 + 1)], { type: "text/plain" }), "large.txt");
    const request = { formData: () => Promise.resolve(form) };

    const response = await upload(request as never);

    expect(response.status, await response.text()).toBe(400);
    expect(mocks.getDriveClientForConnection).not.toHaveBeenCalled();
  });
});
