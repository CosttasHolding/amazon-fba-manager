import { describe, it, expect, vi, beforeEach } from "vitest";
import { POST } from "@/app/api/research/capture/route";
import { createMockRequest } from "@/lib/test-utils/mock-request";

const mockGetUser = vi.fn();
const mockFrom = vi.fn();
const mockSelectIds = vi.fn();
const mockEqOrg = vi.fn();
const mockEqAsin = vi.fn();
const mockMaybeSingle = vi.fn();
const mockInsert = vi.fn();
const mockInsertSelect = vi.fn();
const mockUpdate = vi.fn();
const mockUpdateEq = vi.fn();
const mockUpdateSelect = vi.fn();

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

function setupDbMocks({ existing = null, resultData = [] }: { existing?: { id: string } | null; resultData?: unknown[] }) {
  mockMaybeSingle.mockResolvedValue({ data: existing, error: null });
  mockEqAsin.mockReturnValue({ maybeSingle: mockMaybeSingle });
  mockEqOrg.mockReturnValue({ eq: mockEqAsin });
  mockSelectIds.mockReturnValue({ eq: mockEqOrg });
  mockInsertSelect.mockResolvedValue({ data: resultData, error: null });
  mockInsert.mockReturnValue({ select: mockInsertSelect });
  mockUpdateSelect.mockResolvedValue({ data: resultData, error: null });
  mockUpdateEq.mockReturnValue({ select: mockUpdateSelect });
  mockUpdate.mockReturnValue({ eq: mockUpdateEq });
  mockFrom.mockReturnValue({ select: mockSelectIds, insert: mockInsert, update: mockUpdate });
}

const validPayload = {
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
    setupDbMocks({ resultData: [{ id: "new-id", name: "Test Product" }] });

    const req = createMockRequest("http://localhost/api/research/capture", {
      method: "POST",
      body: JSON.stringify(validPayload),
    });
    const res = await POST(req as never);
    expect(res.status).toBe(201);
    expect(mockInsert).toHaveBeenCalled();
    const inserted = mockInsert.mock.calls[0][0];
    expect(inserted.asin_reference).toBe("B0TEST1234");
    expect(inserted.name).toBe("Test Product");
    expect(inserted.source).toBe("capture");
    expect(inserted.source_data.capture_mode).toBe("scraper");
  });

  it("actualiza producto existente con el mismo ASIN (dedupe)", async () => {
    mockGetUser.mockResolvedValue({ data: { user: { id: "user-1" } }, error: null });
    setupDbMocks({ existing: { id: "existing-id" }, resultData: [{ id: "existing-id", name: "Test Product" }] });

    const req = createMockRequest("http://localhost/api/research/capture", {
      method: "POST",
      body: JSON.stringify(validPayload),
    });
    const res = await POST(req as never);
    expect(res.status).toBe(201);
    expect(mockUpdate).toHaveBeenCalled();
    expect(mockInsert).not.toHaveBeenCalled();
    expect(mockUpdateEq).toHaveBeenCalledWith("id", "existing-id");
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

  it("rechaza producto sin asin", async () => {
    mockGetUser.mockResolvedValue({ data: { user: { id: "user-1" } }, error: null });

    const req = createMockRequest("http://localhost/api/research/capture", {
      method: "POST",
      body: JSON.stringify({ products: [{ title: "Sin ASIN" }], mode: "scraper" }),
    });
    const res = await POST(req as never);
    expect(res.status).toBe(400);
  });

  it("rechaza más de 100 productos", async () => {
    mockGetUser.mockResolvedValue({ data: { user: { id: "user-1" } }, error: null });

    const products = Array.from({ length: 101 }, (_, i) => ({ asin: `B0TEST${i}`, title: `P${i}` }));
    const req = createMockRequest("http://localhost/api/research/capture", {
      method: "POST",
      body: JSON.stringify({ products, mode: "scraper" }),
    });
    const res = await POST(req as never);
    expect(res.status).toBe(400);
  });

  it("calcula y guarda el score enriquecido con source_data completo", async () => {
    mockGetUser.mockResolvedValue({ data: { user: { id: "user-1" } }, error: null });
    setupDbMocks({ resultData: [{ id: "new-id", name: "Test Product" }] });

    const req = createMockRequest("http://localhost/api/research/capture", {
      method: "POST",
      body: JSON.stringify(validPayload),
    });
    const res = await POST(req as never);
    expect(res.status).toBe(201);
    const inserted = mockInsert.mock.calls[0][0];
    expect(inserted.score).toBeGreaterThan(0);
    expect(inserted.source_data.score_details).toBeDefined();
    expect(inserted.source_data.score_details.demanda).toBeDefined();
    expect(inserted.source_data.score_details.rentabilidad).toBeDefined();
  });

  it("guarda score null cuando no hay datos del producto", async () => {
    mockGetUser.mockResolvedValue({ data: { user: { id: "user-1" } }, error: null });
    setupDbMocks({ resultData: [{ id: "new-id", name: "Sin datos" }] });

    const req = createMockRequest("http://localhost/api/research/capture", {
      method: "POST",
      body: JSON.stringify({ products: [{ asin: "B0EMPTY123", title: "Sin datos" }], mode: "scraper" }),
    });
    const res = await POST(req as never);
    expect(res.status).toBe(201);
    const inserted = mockInsert.mock.calls[0][0];
    expect(inserted.score).toBeNull();
  });

  it("refresca el score al actualizar un ASIN existente", async () => {
    mockGetUser.mockResolvedValue({ data: { user: { id: "user-1" } }, error: null });
    setupDbMocks({ existing: { id: "existing-id" }, resultData: [{ id: "existing-id", name: "Test Product" }] });

    const req = createMockRequest("http://localhost/api/research/capture", {
      method: "POST",
      body: JSON.stringify(validPayload),
    });
    const res = await POST(req as never);
    expect(res.status).toBe(201);
    const updated = mockUpdate.mock.calls[0][0];
    expect(updated.score).toBeGreaterThan(0);
    expect(updated.source_data.score_details).toBeDefined();
  });

  it("completa niche con la categoria y deriva competition_level de la captura", async () => {
    mockGetUser.mockResolvedValue({ data: { user: { id: "user-1" } }, error: null });
    setupDbMocks({ resultData: [{ id: "new-id", name: "Test Product" }] });

    const req = createMockRequest("http://localhost/api/research/capture", {
      method: "POST",
      body: JSON.stringify(validPayload),
    });
    const res = await POST(req as never);
    expect(res.status).toBe(201);
    const inserted = mockInsert.mock.calls[0][0];
    expect(inserted.niche).toBe("Sports & Fitness");
    expect(inserted.competition_level).toBeDefined();
    expect(["very_low", "low", "medium", "high", "very_high"]).toContain(inserted.competition_level);
    const compScore = inserted.source_data.score_details.competencia.score;
    expect(compScore).toBeGreaterThanOrEqual(0);
    expect(compScore).toBeLessThanOrEqual(100);
  });

  it("guarda competition_level null cuando no hay datos", async () => {
    mockGetUser.mockResolvedValue({ data: { user: { id: "user-1" } }, error: null });
    setupDbMocks({ resultData: [{ id: "new-id", name: "Sin datos" }] });

    const req = createMockRequest("http://localhost/api/research/capture", {
      method: "POST",
      body: JSON.stringify({ products: [{ asin: "B0EMPTY123", title: "Sin datos" }], mode: "scraper" }),
    });
    const res = await POST(req as never);
    expect(res.status).toBe(201);
    const inserted = mockInsert.mock.calls[0][0];
    expect(inserted.competition_level).toBeNull();
  });
});
