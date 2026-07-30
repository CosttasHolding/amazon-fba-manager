import { describe, it, expect } from "vitest";
import { POST } from "@/app/api/research/scoring/route";
import { createMockRequest } from "@/lib/test-utils/mock-request";

describe("POST /api/research/scoring", () => {
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
