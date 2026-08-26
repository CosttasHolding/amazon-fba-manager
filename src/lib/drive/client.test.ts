import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("server-only", () => ({}));

const mockCreateServiceRoleClient = vi.hoisted(() => vi.fn());
const mockDecryptDriveToken = vi.hoisted(() => vi.fn());
const mockOAuth2 = vi.hoisted(() => vi.fn());
const mockDrive = vi.hoisted(() => vi.fn());
const mockSetCredentials = vi.hoisted(() => vi.fn());
const mockAssertDriveRootIsolated = vi.hoisted(() => vi.fn());

vi.mock("@/lib/supabase/server", () => ({
  createServiceRoleClient: mockCreateServiceRoleClient,
}));
vi.mock("@/lib/drive/crypto", () => ({
  decryptDriveToken: mockDecryptDriveToken,
}));
vi.mock("@/lib/drive/root-isolation", () => ({
  assertDriveRootIsolated: mockAssertDriveRootIsolated,
}));
vi.mock("googleapis", () => ({
  google: {
    auth: { OAuth2: mockOAuth2 },
    drive: mockDrive,
  },
}));

import {
  getDriveClientForConnection,
  getDriveConnection,
} from "./client";

function createQuery(result: { data: unknown; error?: unknown }) {
  const query = {
    select: vi.fn(),
    eq: vi.fn(),
    order: vi.fn(),
    limit: vi.fn(),
    maybeSingle: vi.fn().mockResolvedValue(result),
  };

  query.select.mockReturnValue(query);
  query.eq.mockReturnValue(query);
  query.order.mockReturnValue(query);
  query.limit.mockReturnValue(query);
  return query;
}

describe("getDriveConnection", () => {
  it("selecciona la conexión activa más antigua dentro de la organización", async () => {
    const connectionQuery = createQuery({
      data: {
        id: "connection-1",
        org_id: "org-1",
        provider: "google_drive",
        label: "Principal",
        google_account_email: "owner@example.com",
        root_folder_id: "root-1",
        status: "active",
        created_at: "2026-01-01T00:00:00.000Z",
        updated_at: "2026-01-02T00:00:00.000Z",
      },
      error: null,
    });
    const supabase = { from: vi.fn().mockReturnValue(connectionQuery) } as never;

    await expect(getDriveConnection(supabase, "org-1")).resolves.toEqual({
      id: "connection-1",
      orgId: "org-1",
      provider: "google_drive",
      label: "Principal",
      googleAccountEmail: "owner@example.com",
      rootFolderId: "root-1",
      status: "active",
      createdAt: "2026-01-01T00:00:00.000Z",
      updatedAt: "2026-01-02T00:00:00.000Z",
    });

    expect(connectionQuery.select).toHaveBeenCalledWith(
      "id, org_id, provider, label, google_account_email, root_folder_id, status, created_at, updated_at",
    );
    expect(connectionQuery.eq).toHaveBeenCalledWith("org_id", "org-1");
    expect(connectionQuery.eq).toHaveBeenCalledWith("status", "active");
    expect(connectionQuery.order).toHaveBeenCalledWith("created_at", { ascending: true });
    expect(connectionQuery.limit).toHaveBeenCalledWith(1);
    expect(connectionQuery.select.mock.calls[0][0]).not.toContain("refresh_token_encrypted");
  });

  it("rechaza una fila de conexión explícita perteneciente a otra organización", async () => {
    const connectionQuery = createQuery({
      data: {
        id: "connection-2",
        org_id: "org-2",
        provider: "google_drive",
        label: "Otra org",
        google_account_email: "other@example.com",
        root_folder_id: "root-2",
        status: "active",
        created_at: "2026-01-01T00:00:00.000Z",
        updated_at: "2026-01-02T00:00:00.000Z",
      },
      error: null,
    });
    const supabase = { from: vi.fn().mockReturnValue(connectionQuery) } as never;

    await expect(getDriveConnection(supabase, "org-1", "connection-2")).resolves.toBeNull();

    expect(connectionQuery.eq).toHaveBeenCalledWith("id", "connection-2");
    expect(connectionQuery.eq).toHaveBeenCalledWith("org_id", "org-1");
    expect(connectionQuery.eq).toHaveBeenCalledWith("status", "active");
  });

  it.each(["revoked", "error"] as const)("rechaza una conexión %s", async (status) => {
    const connectionQuery = createQuery({
      data: {
        id: "connection-1",
        org_id: "org-1",
        provider: "google_drive",
        label: "Principal",
        google_account_email: null,
        root_folder_id: "root-1",
        status,
        created_at: "2026-01-01T00:00:00.000Z",
        updated_at: "2026-01-02T00:00:00.000Z",
      },
      error: null,
    });
    const supabase = { from: vi.fn().mockReturnValue(connectionQuery) } as never;

    await expect(getDriveConnection(supabase, "org-1", "connection-1")).resolves.toBeNull();
    expect(connectionQuery.eq).toHaveBeenCalledWith("status", "active");
  });

  it("falla cerrado ante un error de consulta", async () => {
    const connectionQuery = createQuery({ data: null, error: new Error("database failure") });
    const supabase = { from: vi.fn().mockReturnValue(connectionQuery) } as never;

    await expect(getDriveConnection(supabase, "org-1")).resolves.toBeNull();
  });
});

describe("getDriveClientForConnection", () => {
  const metadata = {
    id: "connection-1",
    org_id: "org-1",
    provider: "google_drive",
    label: "Principal",
    google_account_email: "owner@example.com",
    root_folder_id: "root-1",
    status: "active",
    created_at: "2026-01-01T00:00:00.000Z",
    updated_at: "2026-01-02T00:00:00.000Z",
  };

  function createConnectionSupabase(options: {
    membership: { data: unknown; error?: unknown };
    connection?: { data: unknown; error?: unknown };
  }) {
    const connectionQuery = createQuery(options.connection ?? { data: metadata, error: null });
    const membershipQuery = createQuery(options.membership);
    const from = vi.fn((table: string) => {
      if (table === "drive_connections") return connectionQuery;
      if (table === "org_members") return membershipQuery;
      throw new Error(`Unexpected table ${table}`);
    });
    return { supabase: { from } as never, connectionQuery, membershipQuery };
  }

  beforeEach(() => {
    mockCreateServiceRoleClient.mockReset();
    mockDecryptDriveToken.mockReset();
    mockOAuth2.mockReset();
    mockDrive.mockReset();
    mockSetCredentials.mockReset();
    mockAssertDriveRootIsolated.mockReset();
    process.env.GOOGLE_OAUTH_CLIENT_ID = "client-id";
    process.env.GOOGLE_OAUTH_CLIENT_SECRET = "client-secret";
    process.env.GOOGLE_OAUTH_REDIRECT_URI = "https://app.example.com/api/drive/auth/callback";
    mockOAuth2.mockImplementation(function () {
      return { setCredentials: mockSetCredentials };
    });
    mockDrive.mockReturnValue({ files: {} });
    mockAssertDriveRootIsolated.mockResolvedValue(undefined);
  });

  it("rechaza acceso no autenticado o sin membership antes de consultar service role", async () => {
    const { supabase } = createConnectionSupabase({ membership: { data: null, error: null } });

    await expect(
      getDriveClientForConnection(supabase, "user-1", "org-1", "connection-1"),
    ).rejects.toThrow("Drive no conectado");
    expect(mockCreateServiceRoleClient).not.toHaveBeenCalled();
  });

  it("rechaza un userId vacío antes de consultar membership o service role", async () => {
    const { supabase, membershipQuery } = createConnectionSupabase({
      membership: { data: { user_id: "user-1" }, error: null },
    });

    await expect(
      getDriveClientForConnection(supabase, "", "org-1", "connection-1"),
    ).rejects.toThrow("Drive no conectado");
    expect(membershipQuery.eq).not.toHaveBeenCalled();
    expect(mockCreateServiceRoleClient).not.toHaveBeenCalled();
  });

  it("rechaza una organización retirada del allowlist antes de cargar su conexión", async () => {
    const previousAllowlist = process.env.GOOGLE_DRIVE_SHARED_ORG_IDS;
    process.env.GOOGLE_DRIVE_SHARED_ORG_IDS = "org-2";
    const { supabase } = createConnectionSupabase({
      membership: { data: { user_id: "user-1" }, error: null },
    });

    try {
      await expect(
        getDriveClientForConnection(supabase, "user-1", "org-1", "connection-1"),
      ).rejects.toThrow("Drive no conectado");
      expect(mockCreateServiceRoleClient).not.toHaveBeenCalled();
    } finally {
      if (previousAllowlist === undefined) delete process.env.GOOGLE_DRIVE_SHARED_ORG_IDS;
      else process.env.GOOGLE_DRIVE_SHARED_ORG_IDS = previousAllowlist;
    }
  });

  it("rechaza metadata de otra organización antes de descifrar o retornar un secreto", async () => {
    const { supabase } = createConnectionSupabase({
      connection: {
        data: { ...metadata, org_id: "org-2" },
        error: null,
      },
      membership: { data: { user_id: "user-1" }, error: null },
    });
    mockCreateServiceRoleClient.mockReturnValue({
      from: vi.fn().mockReturnValue(createQuery({
        data: { refresh_token_encrypted: "ciphertext-from-org-2" },
        error: null,
      })),
    });
    mockDecryptDriveToken.mockReturnValue("must-not-be-used");

    await expect(
      getDriveClientForConnection(supabase, "user-1", "org-1", "connection-1"),
    ).rejects.toThrow("Drive no conectado");
    expect(mockCreateServiceRoleClient).not.toHaveBeenCalled();
    expect(mockDecryptDriveToken).not.toHaveBeenCalled();
  });

  it("consulta el secreto con connection_id y org_id después de validar membership", async () => {
    const { supabase, membershipQuery } = createConnectionSupabase({
      membership: { data: { user_id: "user-1" }, error: null },
    });
    const secretQuery = createQuery({ data: null, error: null });
    mockCreateServiceRoleClient.mockReturnValue({ from: vi.fn().mockReturnValue(secretQuery) });

    await expect(
      getDriveClientForConnection(supabase, "user-1", "org-1", "connection-1"),
    ).rejects.toThrow("Drive no conectado");

    expect(membershipQuery.eq).toHaveBeenCalledWith("user_id", "user-1");
    expect(membershipQuery.eq).toHaveBeenCalledWith("org_id", "org-1");
    expect(membershipQuery.eq).toHaveBeenCalledWith("status", "active");
    expect(secretQuery.select).toHaveBeenCalledWith("refresh_token_encrypted");
    expect(secretQuery.eq).toHaveBeenCalledWith("connection_id", "connection-1");
    expect(secretQuery.eq).toHaveBeenCalledWith("org_id", "org-1");
  });

  it("crea el cliente Google con el token descifrado y el redirect URI configurado", async () => {
    const { supabase } = createConnectionSupabase({
      membership: { data: { user_id: "user-1" }, error: null },
    });
    const secretQuery = createQuery({ data: { refresh_token_encrypted: "ciphertext" }, error: null });
    mockCreateServiceRoleClient.mockReturnValue({ from: vi.fn().mockReturnValue(secretQuery) });
    mockDecryptDriveToken.mockReturnValue("refresh-token");
    const drive = { files: {} };
    mockDrive.mockReturnValue(drive);

    await expect(
      getDriveClientForConnection(supabase, "user-1", "org-1", "connection-1"),
    ).resolves.toEqual({
      drive,
      connection: {
        id: "connection-1",
        orgId: "org-1",
        provider: "google_drive",
        label: "Principal",
        googleAccountEmail: "owner@example.com",
        rootFolderId: "root-1",
        status: "active",
        createdAt: "2026-01-01T00:00:00.000Z",
        updatedAt: "2026-01-02T00:00:00.000Z",
      },
    });

    expect(mockDecryptDriveToken).toHaveBeenCalledWith("ciphertext");
    expect(mockOAuth2).toHaveBeenCalledWith(
      "client-id",
      "client-secret",
      "https://app.example.com/api/drive/auth/callback",
    );
    expect(mockSetCredentials).toHaveBeenCalledWith({ refresh_token: "refresh-token" });
    expect(mockAssertDriveRootIsolated).toHaveBeenCalledWith(
      drive,
      supabase,
      "user-1",
      "org-1",
      "root-1",
    );
  });

  it("does not return a client when the connection root overlaps another organization", async () => {
    const { supabase } = createConnectionSupabase({
      membership: { data: { user_id: "user-1" }, error: null },
    });
    const secretQuery = createQuery({ data: { refresh_token_encrypted: "ciphertext" }, error: null });
    mockCreateServiceRoleClient.mockReturnValue({ from: vi.fn().mockReturnValue(secretQuery) });
    mockDecryptDriveToken.mockReturnValue("refresh-token");
    mockAssertDriveRootIsolated.mockRejectedValue(new Error("root isolation failed"));

    await expect(
      getDriveClientForConnection(supabase, "user-1", "org-1", "connection-1"),
    ).rejects.toThrow("Drive no conectado");
    expect(mockAssertDriveRootIsolated).toHaveBeenCalled();
  });
});
