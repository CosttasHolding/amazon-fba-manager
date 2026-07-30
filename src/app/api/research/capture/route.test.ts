import { describe, it, expect, vi, beforeEach } from "vitest";
import { POST } from "@/app/api/research/capture/route";
import { createMockRequest } from "@/lib/test-utils/mock-request";

const mockInsert = vi.fn();
const mockSelect = vi.fn();
const mockFrom = vi.fn();
const mockGetUser = vi.fn();

const mockSupabase = {
  auth: { getUser: mockGetUser },
  from: mockFrom,
};

vi.mock("@/lib/supabase/server", () => ({
  createClient: vi.fn(() => Promise.resolve(mockSupabase)),
}));

vi.mock("@/lib/api-handler", () => ({
  getOrgId: vi.fn(() => Promise.resolve("org-1")),
}));

function buildInsertQuery(data: unknown) {
  return {
    insert: mockInsert.mockReturnThis(),
    select: mockSelect.mockResolvedValue({ data, error: null }),
  };
}

describe("POST /api/research/capture", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("devuelve 401 sin autenticación", async () => {
    mockGetUser.mockResolvedValue({ data: { user: null }, error: { message: "No auth" } });

    const req = createMockRequest("http://localhost/api/research/capture", {
      method: "POST",
      body: JSON.stringify({ products: [], mode: "scraper", page_type: "search" }),
    });
    const res = await POST(req as never);
    expect(res.status).toBe(401);
  });

  it("guarda productos correctamente", async () => {
    mockGetUser.mockResolvedValue({ data: { user: { id: "user-1" } }, error: null });
    mockFrom.mockReturnValue(buildInsertQuery([{ id: "new-id", name: "Test Product" }]));

    const payload = {
      products: [{
        asin: "B0TEST1234",
        title: "Test Product",
        price: 29.99,
        currency: "USD",
        bsr: 1234,
        review_count: 567,
        average_rating: 4.2,
        estimated_monthly_sales: 1200,
        estimated_monthly_revenue: 35988,
        estimated_fba_fee: 8.5,
        seller_count_fba: 3,
        seller_count_fbm: 2,
        category: "Sports & Fitness",
        brand: "TestBrand",
        image_url: null,
        source: "scraper",
        capture_url: "https://amazon.com/dp/B0TEST1234",
        capture_timestamp: new Date().toISOString(),
      }],
      mode: "scraper",
      page_type: "search",
      search_keyword: "yoga mat",
    };

    const req = createMockRequest("http://localhost/api/research/capture", {
      method: "POST",
      body: JSON.stringify(payload),
    });
    const res = await POST(req as never);
    expect(res.status).toBe(201);
    expect(mockInsert).toHaveBeenCalled();
    const inserted = mockInsert.mock.calls[0][0];
    expect(inserted[0].asin_reference).toBe("B0TEST1234");
    expect(inserted[0].name).toBe("Test Product");
    expect(inserted[0].source).toBe("capture");
    expect(inserted[0].source_data.capture_mode).toBe("scraper");
  });

  it("valida que products sea array", async () => {
    mockGetUser.mockResolvedValue({ data: { user: { id: "user-1" } }, error: null });

    const req = createMockRequest("http://localhost/api/research/capture", {
      method: "POST",
      body: JSON.stringify({ products: "not-array", mode: "scraper", page_type: "search" }),
    });
    const res = await POST(req as never);
    expect(res.status).toBe(400);
  });

  it("rechaza array vacío", async () => {
    mockGetUser.mockResolvedValue({ data: { user: { id: "user-1" } }, error: null });

    const req = createMockRequest("http://localhost/api/research/capture", {
      method: "POST",
      body: JSON.stringify({ products: [], mode: "scraper", page_type: "search" }),
    });
    const res = await POST(req as never);
    expect(res.status).toBe(400);
  });
});
