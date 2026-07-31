import { describe, it, expect, vi, beforeEach } from "vitest";
import { POST } from "@/app/api/research/analyze-deep/route";
import { createMockRequest } from "@/lib/test-utils/mock-request";

const mockGetUser = vi.fn();

vi.mock("@/lib/supabase/server", () => ({
  createClient: vi.fn(() => Promise.resolve({ auth: { getUser: mockGetUser } })),
}));

vi.mock("@/lib/ai/client", () => ({
  getOpenAI: vi.fn(() => ({
    chat: {
      completions: {
        create: vi.fn().mockResolvedValue({
          choices: [{
            message: {
              content: JSON.stringify({
                summary: "Producto con alto potencial",
                pain_points: ["Se rompe fácil"],
                differentiation_opportunities: ["Material más resistente"],
                market_fit: "high",
                market_fit_reason: "Alta demanda y poca competencia",
                risk_factors: ["Estacionalidad"],
                recommended_actions: ["Mejorar calidad"],
                estimated_difficulty: "easy",
              }),
            },
          }],
        }),
      },
    },
  })),
}));

describe("POST /api/research/analyze-deep", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockGetUser.mockResolvedValue({ data: { user: { id: "user-1" } }, error: null });
  });

  it("devuelve 401 sin autenticación", async () => {
    mockGetUser.mockResolvedValue({ data: { user: null }, error: { message: "No auth" } });

    const req = createMockRequest("http://localhost/api/research/analyze-deep", {
      method: "POST",
      body: JSON.stringify({ asin: "B0TEST1234", title: "Test Product" }),
    });
    const res = await POST(req as never);
    expect(res.status).toBe(401);
  });

  it("realiza deep dive correctamente", async () => {
    const req = createMockRequest("http://localhost/api/research/analyze-deep", {
      method: "POST",
      body: JSON.stringify({
        asin: "B0TEST1234",
        title: "Test Product",
        price: 29.99,
        bsr: 1234,
        review_count: 567,
        average_rating: 4.2,
        estimated_monthly_sales: 1200,
        category: "Sports",
        brand: "TestBrand",
      }),
    });
    const res = await POST(req as never);
    const json = await res.json();
    expect(res.status).toBe(200);
    expect(json).toHaveProperty("asin", "B0TEST1234");
    expect(json.analysis).toHaveProperty("summary");
    expect(json.analysis).toHaveProperty("market_fit");
    expect(json.analysis).toHaveProperty("estimated_difficulty");
    expect(json.analysis.pain_points).toBeInstanceOf(Array);
  });

  it("devuelve error si falta asin", async () => {
    const req = createMockRequest("http://localhost/api/research/analyze-deep", {
      method: "POST",
      body: JSON.stringify({}),
    });
    const res = await POST(req as never);
    expect(res.status).toBe(400);
  });

  it("devuelve error si falta title", async () => {
    const req = createMockRequest("http://localhost/api/research/analyze-deep", {
      method: "POST",
      body: JSON.stringify({ asin: "B0TEST1234" }),
    });
    const res = await POST(req as never);
    expect(res.status).toBe(400);
  });
});
