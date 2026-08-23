import { describe, it, expect, vi, beforeEach } from "vitest";
import { GET, POST } from "@/app/api/sales/route";
import { createMockRequest } from "@/lib/test-utils/mock-request";

const mockSupabase = {
  auth: { getUser: vi.fn() },
  from: vi.fn(),
};

function buildQueryChain(returnValue: unknown) {
  const chain = {
    select: vi.fn().mockReturnThis(),
    eq: vi.fn().mockReturnThis(),
    gte: vi.fn().mockReturnThis(),
    lte: vi.fn().mockReturnThis(),
    order: vi.fn().mockReturnThis(),
    range: vi.fn().mockResolvedValue(returnValue),
    insert: vi.fn().mockReturnThis(),
    single: vi.fn().mockResolvedValue(returnValue),
  maybeSingle: vi.fn().mockResolvedValue({ data: { org_id: "test-org-id" }, error: null }),
  };
  return chain;
}

vi.mock("@/lib/supabase/server", () => ({
  createClient: vi.fn(() => Promise.resolve(mockSupabase)),
}));

describe("GET /api/sales", () => {
  beforeEach(() => vi.clearAllMocks());

  it("devuelve ventas del usuario autenticado", async () => {
    mockSupabase.auth.getUser.mockResolvedValue({ data: { user: { id: "u1" } }, error: null });
    const chain = buildQueryChain({
      data: [{ id: "sale1", units_sold: 10, revenue: 100, products: { unit_cost: 5 } }],
      error: null,
      count: 1,
    });
    mockSupabase.from.mockReturnValue(chain);

    const req = createMockRequest("http://localhost/api/sales", { headers: { "x-org-id": "test-org-id" } });
    const res = await GET(req);
    const json = await res.json();

    expect(res.status).toBe(200);
    expect(json.data).toHaveLength(1);
    expect(json.data[0].profit).toBeDefined();
    expect(json.pagination).toBeDefined();
    expect(mockSupabase.from).toHaveBeenCalledWith("sales");
  });

  it("calcula profit correctamente", async () => {
    mockSupabase.auth.getUser.mockResolvedValue({ data: { user: { id: "u1" } }, error: null });
    const chain = buildQueryChain({
      data: [{ id: "s1", units_sold: 10, revenue: 100, amazon_fees: 15, products: { unit_cost: 5 } }],
      error: null,
      count: 1,
    });
    mockSupabase.from.mockReturnValue(chain);

    const req = createMockRequest("http://localhost/api/sales", { headers: { "x-org-id": "test-org-id" } });
    const res = await GET(req);
    const json = await res.json();

    // profit = revenue - amazon_fees - (units_sold * unit_cost) = 100 - 15 - 50 = 35
    expect(json.data[0].profit).toBe(35);
    expect(json.data[0].cost).toBe(50);
  });

  it("filtra por dateFrom", async () => {
    mockSupabase.auth.getUser.mockResolvedValue({ data: { user: { id: "u1" } }, error: null });
    const chain = buildQueryChain({ data: [], error: null, count: 0 });
    mockSupabase.from.mockReturnValue(chain);

    const req = createMockRequest("http://localhost/api/sales?dateFrom=2026-01-01", { headers: { "x-org-id": "test-org-id" } });
    const res = await GET(req);

    expect(res.status).toBe(200);
    expect(chain.gte).toHaveBeenCalledWith("sale_date", "2026-01-01");
  });

  it("filtra por dateTo", async () => {
    mockSupabase.auth.getUser.mockResolvedValue({ data: { user: { id: "u1" } }, error: null });
    const chain = buildQueryChain({ data: [], error: null, count: 0 });
    mockSupabase.from.mockReturnValue(chain);

    const req = createMockRequest("http://localhost/api/sales?dateTo=2026-12-31", { headers: { "x-org-id": "test-org-id" } });
    const res = await GET(req);

    expect(res.status).toBe(200);
    expect(chain.lte).toHaveBeenCalledWith("sale_date", "2026-12-31");
  });

  it("devuelve 401 sin autenticacion", async () => {
    mockSupabase.auth.getUser.mockResolvedValue({ data: { user: null }, error: new Error("No auth") });

    const req = createMockRequest("http://localhost/api/sales", { headers: { "x-org-id": "test-org-id" } });
    const res = await GET(req);

    expect(res.status).toBe(401);
  });

  it("devuelve 500 en error de DB", async () => {
    mockSupabase.auth.getUser.mockResolvedValue({ data: { user: { id: "u1" } }, error: null });
    const chain = buildQueryChain({ data: null, error: { message: "DB error" }, count: 0 });
    mockSupabase.from.mockReturnValue(chain);

    const req = createMockRequest("http://localhost/api/sales", { headers: { "x-org-id": "test-org-id" } });
    const res = await GET(req);

    expect(res.status).toBe(500);
  });
});

describe("POST /api/sales", () => {
  beforeEach(() => vi.clearAllMocks());

  it("crea venta con datos validos", async () => {
    mockSupabase.auth.getUser.mockResolvedValue({ data: { user: { id: "u1" } }, error: null });

    // Product check query
    const productChain = buildQueryChain({ data: { id: "p1" }, error: null });
    // Insert query
    const insertChain = buildQueryChain({
      data: { id: "sale1", product_id: "p1", revenue: 100 },
      error: null,
    });

    let callCount = 0;
    mockSupabase.from.mockImplementation(() => {
      callCount++;
      return callCount === 1 ? productChain : insertChain;
    });

    const req = createMockRequest("http://localhost/api/sales", {
      method: "POST",
      body: JSON.stringify({
        product_id: "00000000-0000-0000-0000-000000000001",
        sale_date: "2026-07-15",
        units_sold: 10,
        revenue: 100,
        amazon_fees: 15,
      }),
      headers: { "x-org-id": "test-org-id" },
    });
    const res = await POST(req);
    const json = await res.json();

    expect(res.status).toBe(201);
    expect(json.data.product_id).toBe("p1");
  });

  it("devuelve 400 con datos invalidos", async () => {
    mockSupabase.auth.getUser.mockResolvedValue({ data: { user: { id: "u1" } }, error: null });

    const req = createMockRequest("http://localhost/api/sales", {
      method: "POST",
      body: JSON.stringify({ revenue: 100 }),
      headers: { "x-org-id": "test-org-id" },
    });
    const res = await POST(req);
    const json = await res.json();

    expect(res.status).toBe(400);
    expect(json.error).toBe("Datos inválidos");
  });

  it("devuelve 400 con revenue 0", async () => {
    mockSupabase.auth.getUser.mockResolvedValue({ data: { user: { id: "u1" } }, error: null });

    const req = createMockRequest("http://localhost/api/sales", {
      method: "POST",
      body: JSON.stringify({
        product_id: "00000000-0000-0000-0000-000000000001",
        sale_date: "2026-07-15",
        units_sold: 10,
        revenue: 0,
      }),
      headers: { "x-org-id": "test-org-id" },
    });
    const res = await POST(req);
    const json = await res.json();

    expect(res.status).toBe(400);
    expect(json.error).toContain("revenue");
  });

  it("devuelve 404 si producto no existe", async () => {
    mockSupabase.auth.getUser.mockResolvedValue({ data: { user: { id: "u1" } }, error: null });
    const chain = buildQueryChain({ data: null, error: null });
    mockSupabase.from.mockReturnValue(chain);

    const req = createMockRequest("http://localhost/api/sales", {
      method: "POST",
      body: JSON.stringify({
        product_id: "00000000-0000-0000-0000-000000000099",
        sale_date: "2026-07-15",
        units_sold: 10,
        revenue: 100,
      }),
      headers: { "x-org-id": "test-org-id" },
    });
    const res = await POST(req);
    const json = await res.json();

    expect(res.status).toBe(404);
    expect(json.error).toContain("Producto");
  });

  it("devuelve 401 sin autenticacion", async () => {
    mockSupabase.auth.getUser.mockResolvedValue({ data: { user: null }, error: new Error("No auth") });

    const req = createMockRequest("http://localhost/api/sales", {
      method: "POST",
      body: JSON.stringify({
        product_id: "00000000-0000-0000-0000-000000000001",
        sale_date: "2026-07-15",
        units_sold: 10,
        revenue: 100,
      }),
      headers: { "x-org-id": "test-org-id" },
    });
    const res = await POST(req);

    expect(res.status).toBe(401);
  });
});
