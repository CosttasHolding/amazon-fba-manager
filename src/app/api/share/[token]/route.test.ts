import { beforeEach, describe, expect, it, vi } from "vitest";
import type { NextRequest } from "next/server";

const mockServiceClient = { from: vi.fn() };

vi.mock("@/lib/supabase/server", () => ({
  createServiceRoleClient: vi.fn(() => mockServiceClient),
}));

function queryChain(value: unknown) {
  const result = Promise.resolve(value) as Promise<unknown> & Record<string, ReturnType<typeof vi.fn>>;
  result.select = vi.fn(() => result);
  result.eq = vi.fn(() => result);
  result.not = vi.fn(() => result);
  result.gte = vi.fn(() => result);
  result.order = vi.fn(() => result);
  result.single = vi.fn(() => result);
  return result;
}

import { GET } from "@/app/api/share/[token]/route";

describe("GET /api/share/[token]", () => {
  beforeEach(() => vi.clearAllMocks());

  it("rechaza links legacy sin org_id y no consulta datos tenant", async () => {
    const linkQuery = queryChain({
      data: {
        token: "legacy-token",
        user_id: "user-1",
        org_id: null,
        active: true,
      },
      error: null,
    });
    mockServiceClient.from.mockReturnValue(linkQuery);

    const response = await GET(
      new Request("http://localhost/api/share/legacy-token") as unknown as NextRequest,
      { params: Promise.resolve({ token: "legacy-token" }) },
    );

    expect(response.status).toBe(404);
    expect(linkQuery.not).toHaveBeenCalledWith("org_id", "is", null);
    expect(mockServiceClient.from).toHaveBeenCalledTimes(1);
  });

  it("filtra productos y ventas por el org_id del link", async () => {
    const linkQuery = queryChain({
      data: {
        token: "token-1",
        user_id: "user-1",
        org_id: "org-1",
        title: "Compartido",
        active: true,
        expires_at: null,
      },
      error: null,
    });
    const productsQuery = queryChain({ data: [], error: null });
    const salesQuery = queryChain({ data: [], error: null });
    mockServiceClient.from.mockImplementation((table: string) => {
      if (table === "shared_links") return linkQuery;
      if (table === "products_with_inventory") return productsQuery;
      if (table === "sales") return salesQuery;
      throw new Error(`Unexpected table ${table}`);
    });

    const response = await GET(
      new Request("http://localhost/api/share/token-1") as unknown as NextRequest,
      { params: Promise.resolve({ token: "token-1" }) },
    );

    expect(response.status).toBe(200);
    expect(productsQuery.eq).toHaveBeenCalledWith("org_id", "org-1");
    expect(salesQuery.eq).toHaveBeenCalledWith("org_id", "org-1");
  });
});
