import { describe, it, expect, vi, beforeEach } from "vitest";
import { POST } from "@/app/api/research/scoring/route";
import { createMockRequest } from "@/lib/test-utils/mock-request";

const mockGetUser = vi.fn();

vi.mock("@/lib/supabase/server", () => ({
  createClient: vi.fn(() => Promise.resolve({ auth: { getUser: mockGetUser } })),
}));

describe("POST /api/research/scoring", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockGetUser.mockResolvedValue({ data: { user: { id: "user-1" } }, error: null });
  });

  it("devuelve 401 sin autenticación", async () => {
    mockGetUser.mockResolvedValue({ data: { user: null }, error: { message: "No auth" } });

    const req = createMockRequest("http://localhost/api/research/scoring", {
      method: "POST",
      body: JSON.stringify({ estimated_monthly_sales: 5000 }),
    });
    const res = await POST(req as never);
    expect(res.status).toBe(401);
  });

  it("calcula score para un producto", async () => {
    const req = createMockRequest("http://localhost/api/research/scoring", {
      method: "POST",
      body: JSON.stringify({
        estimated_monthly_sales: 5000,
        bsr: 500,
        review_count: 50,
        seller_count_fba: 2,
        price: 29.99,
        estimated_fba_fee: 8.5,
        estimated_cogs: 8,
      }),
    });
    const res = await POST(req as never);
    const json = await res.json();
    expect(res.status).toBe(200);
    expect(json).toHaveProperty("total");
    expect(json).toHaveProperty("dimensions");
    expect(json.dimensions).toHaveProperty("demanda");
    expect(json.dimensions).toHaveProperty("competencia");
    expect(json.dimensions).toHaveProperty("rentabilidad");
    expect(json.dimensions).toHaveProperty("oportunidad");
    expect(json.total).toBeGreaterThan(0);
  });

  it("devuelve score 0 si no hay datos", async () => {
    const req = createMockRequest("http://localhost/api/research/scoring", {
      method: "POST",
      body: JSON.stringify({}),
    });
    const res = await POST(req as never);
    const json = await res.json();
    expect(json.total).toBe(0);
  });
});
