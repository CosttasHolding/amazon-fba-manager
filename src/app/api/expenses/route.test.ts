import { beforeEach, describe, expect, it, vi } from "vitest";
import { POST } from "@/app/api/expenses/route";
import { createMockRequest } from "@/lib/test-utils/mock-request";

const mockSupabase = {
  auth: { getUser: vi.fn() },
  from: vi.fn(),
};

function queryChain(result: unknown) {
  const chain = {
    select: vi.fn().mockReturnThis(),
    eq: vi.fn().mockReturnThis(),
    maybeSingle: vi.fn().mockResolvedValue(result),
    insert: vi.fn().mockReturnThis(),
    single: vi.fn().mockResolvedValue(result),
  };
  return chain;
}

vi.mock("@/lib/supabase/server", () => ({
  createClient: vi.fn(() => Promise.resolve(mockSupabase)),
}));

describe("POST /api/expenses", () => {
  beforeEach(() => vi.clearAllMocks());

  it("rechaza un product_id de otra organización", async () => {
    mockSupabase.auth.getUser.mockResolvedValue({ data: { user: { id: "user-1" } }, error: null });
    const membershipQuery = queryChain({ data: { org_id: "org-1" }, error: null });
    const productQuery = queryChain({ data: null, error: null });
    mockSupabase.from.mockImplementation((table: string) => {
      if (table === "org_members") return membershipQuery;
      if (table === "products") return productQuery;
      throw new Error(`Unexpected table ${table}`);
    });

    const response = await POST(createMockRequest("http://localhost/api/expenses", {
      method: "POST",
      headers: { "x-org-id": "org-1" },
      body: JSON.stringify({
        product_id: "00000000-0000-0000-0000-000000000001",
        category: "other",
        description: "Importe externo",
        amount: 10,
      }),
    }));

    expect(response.status).toBe(400);
    expect(mockSupabase.from).toHaveBeenCalledWith("products");
    expect(productQuery.eq).toHaveBeenCalledWith("org_id", "org-1");
  });
});
