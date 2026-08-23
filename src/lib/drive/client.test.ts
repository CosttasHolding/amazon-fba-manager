import { beforeEach, describe, expect, it, vi } from "vitest";

const mockCreateClient = vi.hoisted(() => vi.fn());

vi.mock("@/lib/supabase/server", () => ({
  createClient: mockCreateClient,
}));

import { getDriveClient, getDriveRootFolderId, getOrgRootFolderId } from "./client";

describe("getDriveClient", () => {
  beforeEach(() => {
    delete process.env.GOOGLE_OAUTH_CLIENT_ID;
    delete process.env.GOOGLE_OAUTH_CLIENT_SECRET;
    delete process.env.GOOGLE_DRIVE_FOLDER_ID;
    delete process.env.GOOGLE_DRIVE_SHARED_ORG_IDS;
    process.env.GOOGLE_SERVICE_ACCOUNT_KEY = '{"client_email":"global@example.com"}';
    mockCreateClient.mockReset();
  });

  it("falla cerrado sin OAuth aunque exista una cuenta de servicio global", async () => {
    await expect(getDriveClient("user-1")).rejects.toThrow("Drive no conectado");
    expect(mockCreateClient).not.toHaveBeenCalled();
  });

  it("falla cerrado si el usuario no tiene refresh token", async () => {
    process.env.GOOGLE_OAUTH_CLIENT_ID = "client-id";
    process.env.GOOGLE_OAUTH_CLIENT_SECRET = "client-secret";
    mockCreateClient.mockResolvedValue({
      auth: { getUser: vi.fn().mockResolvedValue({ data: { user: null } }) },
    });

    await expect(getDriveClient()).rejects.toThrow("Drive no conectado");
    expect(mockCreateClient).toHaveBeenCalledTimes(1);
  });

  it("crea la raíz estable de la organización bajo el root configurado", async () => {
    process.env.GOOGLE_DRIVE_FOLDER_ID = "configured-root";
    const list = vi.fn().mockResolvedValue({ data: { files: [] } });
    const create = vi.fn().mockResolvedValue({ data: { id: "org-root-1" } });
    const drive = { files: { list, create } } as never;

    await expect(getOrgRootFolderId(drive, "org-1")).resolves.toBe("org-root-1");

    expect(list).toHaveBeenCalledWith(expect.objectContaining({
      q: expect.stringContaining("'configured-root' in parents"),
      fields: "files(id)",
    }));
    expect(create).toHaveBeenCalledWith(expect.objectContaining({
      requestBody: expect.objectContaining({
        name: "Amazon FBA Manager - org-1",
        parents: ["configured-root"],
      }),
    }));
  });

  it("escapa valores de org en la query de Drive", async () => {
    process.env.GOOGLE_DRIVE_FOLDER_ID = "configured-root";
    const list = vi.fn().mockResolvedValue({ data: { files: [{ id: "org-root-2" }] } });
    const drive = { files: { list, create: vi.fn() } } as never;

    await getOrgRootFolderId(drive, "org'1");

    expect(list.mock.calls[0][0].q).toContain("Amazon FBA Manager - org\\'1");
  });

  it("usa el root configurado para las organizaciones autorizadas en workspace compartido", async () => {
    process.env.GOOGLE_DRIVE_FOLDER_ID = "shared-root";
    process.env.GOOGLE_DRIVE_SHARED_ORG_IDS = "org-1, org-2";
    const list = vi.fn();
    const drive = { files: { list, create: vi.fn() } } as never;

    await expect(getDriveRootFolderId(drive, "org-2")).resolves.toBe("shared-root");
    expect(list).not.toHaveBeenCalled();
  });

  it("rechaza organizaciones fuera de la allowlist del workspace compartido", async () => {
    process.env.GOOGLE_DRIVE_SHARED_ORG_IDS = "org-1,org-2";
    const list = vi.fn();
    const drive = { files: { list, create: vi.fn() } } as never;

    await expect(getDriveRootFolderId(drive, "org-3")).resolves.toBeNull();
    expect(list).not.toHaveBeenCalled();
  });
});
