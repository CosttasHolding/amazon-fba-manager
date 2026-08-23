import { beforeEach, describe, expect, it, vi } from "vitest";
import type { NextRequest } from "next/server";

const mocks = vi.hoisted(() => ({
  createServiceRoleClient: vi.fn(),
  runSync: vi.fn(),
  ensureClient: vi.fn(),
  isTokenExpired: vi.fn(),
  refreshAccessToken: vi.fn(),
}));

vi.mock("@/lib/supabase/server", () => ({
  createServiceRoleClient: mocks.createServiceRoleClient,
}));

vi.mock("@/lib/sp-api", () => ({
  refreshAccessToken: mocks.refreshAccessToken,
}));

vi.mock("@/lib/sp-api/sync-runner", () => ({
  runSync: mocks.runSync,
  ensureClient: mocks.ensureClient,
  isTokenExpired: mocks.isTokenExpired,
}));

import { GET } from "./route";

describe("GET /api/cron/sync", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    delete process.env.CRON_SECRET;
  });

  it("falla cerrado si CRON_SECRET no está configurado", async () => {
    const response = await GET(new Request("http://localhost/api/cron/sync") as unknown as NextRequest);

    expect(response.status).toBe(401);
    expect(mocks.createServiceRoleClient).not.toHaveBeenCalled();
  });

  it("registra conexión sin membership activa y continúa con la siguiente", async () => {
    process.env.CRON_SECRET = "cron-secret";
    const connections = [
      {
        id: "connection-1",
        org_id: "org-1",
        user_id: "user-1",
        marketplace: "US",
        refresh_token: "refresh-1",
        access_token: "access-1",
        token_expires_at: "2099-01-01T00:00:00.000Z",
        seller_id: "seller-1",
      },
      {
        id: "connection-2",
        org_id: "org-2",
        user_id: "user-2",
        marketplace: "ES",
        refresh_token: "refresh-2",
        access_token: "access-2",
        token_expires_at: "2099-01-01T00:00:00.000Z",
        seller_id: "seller-2",
      },
    ];
    const connectionQuery = Promise.resolve({ data: connections, error: null }) as Promise<unknown> & Record<string, unknown>;
    connectionQuery.select = vi.fn(() => connectionQuery);
    connectionQuery.eq = vi.fn(() => connectionQuery);

    const membershipQuery = {
      select: vi.fn(() => membershipQuery),
      eq: vi.fn(() => membershipQuery),
      maybeSingle: vi.fn()
        .mockResolvedValueOnce({ data: null, error: null })
        .mockResolvedValueOnce({ data: { id: "membership-2" }, error: null }),
    };
    const logQuery = Promise.resolve({ data: { id: "log-1" }, error: null }) as Promise<unknown> & Record<string, unknown>;
    logQuery.select = vi.fn(() => logQuery);
    logQuery.single = vi.fn(() => logQuery);
    const updateQuery = Promise.resolve({ error: null }) as Promise<{ error: null }> & {
      eq: ReturnType<typeof vi.fn>;
    };
    updateQuery.eq = vi.fn(() => updateQuery);

    mocks.createServiceRoleClient.mockReturnValue({
      from: vi.fn((table: string) => {
        if (table === "sp_api_connections") return connectionQuery;
        if (table === "org_members") return membershipQuery;
        if (table === "sync_logs") return {
          insert: vi.fn(() => logQuery),
          update: vi.fn(() => updateQuery),
        };
        throw new Error(`Unexpected table: ${table}`);
      }),
    });
    mocks.isTokenExpired.mockReturnValue(false);
    mocks.runSync.mockResolvedValue({ success: true, processed: 1, failed: 0 });

    const response = await GET(new Request("http://localhost/api/cron/sync", {
      headers: { authorization: "Bearer cron-secret" },
    }) as unknown as NextRequest);
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body.results[0]).toEqual(expect.objectContaining({
      syncType: "all",
      success: false,
      error: "Connection user is not an active organization member",
    }));
    expect(body.results).toHaveLength(8);
    expect(mocks.runSync).toHaveBeenCalledTimes(7);
    expect(mocks.refreshAccessToken).not.toHaveBeenCalled();
    expect(membershipQuery.eq).toHaveBeenCalledWith("user_id", "user-1");
    expect(membershipQuery.eq).toHaveBeenCalledWith("org_id", "org-1");
    expect(membershipQuery.eq).toHaveBeenCalledWith("status", "active");
    expect(updateQuery.eq).toHaveBeenCalledWith("org_id", "org-2");
    expect(updateQuery.eq).toHaveBeenCalledWith("user_id", "user-2");
  });

  it("expone el error al actualizar el log con el scope tenant", async () => {
    process.env.CRON_SECRET = "cron-secret";
    const connection = {
      id: "connection-1",
      org_id: "org-1",
      user_id: "user-1",
      marketplace: "US",
      refresh_token: "refresh-1",
      access_token: "access-1",
      token_expires_at: "2099-01-01T00:00:00.000Z",
      seller_id: "seller-1",
    };
    const connectionQuery = Promise.resolve({ data: [connection], error: null }) as Promise<unknown> & Record<string, unknown>;
    connectionQuery.select = vi.fn(() => connectionQuery);
    connectionQuery.eq = vi.fn(() => connectionQuery);
    const membershipQuery = {
      select: vi.fn(() => membershipQuery),
      eq: vi.fn(() => membershipQuery),
      maybeSingle: vi.fn().mockResolvedValue({ data: { id: "membership-1" }, error: null }),
    };
    const logQuery = Promise.resolve({ data: { id: "log-1" }, error: null }) as Promise<unknown> & Record<string, unknown>;
    logQuery.select = vi.fn(() => logQuery);
    logQuery.single = vi.fn(() => logQuery);
    const updateQuery = Promise.resolve({ error: new Error("log update failed") }) as Promise<{ error: Error }> & {
      eq: ReturnType<typeof vi.fn>;
    };
    updateQuery.eq = vi.fn(() => updateQuery);

    mocks.createServiceRoleClient.mockReturnValue({
      from: vi.fn((table: string) => {
        if (table === "sp_api_connections") return connectionQuery;
        if (table === "org_members") return membershipQuery;
        if (table === "sync_logs") return {
          insert: vi.fn(() => logQuery),
          update: vi.fn(() => updateQuery),
        };
        throw new Error(`Unexpected table: ${table}`);
      }),
    });
    mocks.isTokenExpired.mockReturnValue(false);
    mocks.runSync.mockResolvedValue({ success: true, processed: 1, failed: 0 });

    const response = await GET(new Request("http://localhost/api/cron/sync", {
      headers: { authorization: "Bearer cron-secret" },
    }) as unknown as NextRequest);
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body.results).toEqual(expect.arrayContaining([
      expect.objectContaining({
        syncType: "products",
        success: false,
        error: "Sync log update failed: log update failed",
      }),
    ]));
    expect(updateQuery.eq).toHaveBeenCalledWith("id", "log-1");
    expect(updateQuery.eq).toHaveBeenCalledWith("org_id", "org-1");
    expect(updateQuery.eq).toHaveBeenCalledWith("user_id", "user-1");
  });
});
