import { describe, it, expect, vi, beforeEach } from "vitest";
import { GET, POST } from "@/app/api/products/route";
import { createMockRequest } from "@/lib/test-utils/mock-request";

const mockRange = vi.fn();
const mockOrder = vi.fn();
const mockOr = vi.fn();
const mockEq = vi.fn();
const mockSelect = vi.fn();
const mockInsert = vi.fn();
const mockFrom = vi.fn();

const mockSupabase = {
  auth: {
    getUser: vi.fn(),
  },
  from: mockFrom,
};

function buildQueryChain(returnValue: unknown) {
  const chain = {
    select: mockSelect.mockReturnThis(),
    eq: mockEq.mockReturnThis(),
    or: mockOr.mockReturnThis(),
    range: mockRange.mockReturnThis(),
    order: mockOrder.mockResolvedValue(returnValue),
    insert: mockInsert.mockReturnThis(),
    single: vi.fn().mockResolvedValue(returnValue),
  maybeSingle: vi.fn().mockResolvedValue({ data: { org_id: "test-org-id" }, error: null }),
  };
  return chain;
}

vi.mock("@/lib/supabase/server", () => ({
  createClient: vi.fn(() => Promise.resolve(mockSupabase)),
}));

describe("GET /api/products", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("devuelve productos paginados del usuario autenticado", async () => {
    const user = { id: "user-123" };
    mockSupabase.auth.getUser.mockResolvedValue({ data: { user }, error: null });
    const chain = buildQueryChain({
      data: [{ id: "p1", name: "Product A" }],
      count: 1,
      error: null,
    });
    mockFrom.mockReturnValue(chain);

    const req = createMockRequest("http://localhost/api/products", { headers: { "x-org-id": "test-org-id" } });
    const res = await GET(req);
    const json = await res.json();

    expect(res.status).toBe(200);
    expect(json.data).toEqual([{ id: "p1", name: "Product A" }]);
    expect(json.pagination.total).toBe(1);
    expect(mockFrom).toHaveBeenCalledWith("products_with_inventory");
    expect(mockEq).toHaveBeenCalledWith("org_id", "test-org-id");
  });

  it("aplica filtros de busqueda y status", async () => {
    const user = { id: "user-123" };
    mockSupabase.auth.getUser.mockResolvedValue({ data: { user }, error: null });
    const chain = buildQueryChain({
      data: [],
      count: 0,
      error: null,
    });
    mockFrom.mockReturnValue(chain);

    const req = createMockRequest("http://localhost/api/products?search=abc&status=active&stockStatus=normal&page=2&perPage=10", { headers: { "x-org-id": "test-org-id" } });
    await GET(req);

    expect(mockOr).toHaveBeenCalled();
    expect(mockEq).toHaveBeenCalledWith("status", "active");
    expect(mockEq).toHaveBeenCalledWith("stock_status", "normal");
    expect(mockRange).toHaveBeenCalledWith(10, 19);
  });

  it("devuelve 401 sin autenticacion", async () => {
    mockSupabase.auth.getUser.mockResolvedValue({ data: { user: null }, error: new Error("No auth") });

    const req = createMockRequest("http://localhost/api/products", { headers: { "x-org-id": "test-org-id" } });
    const res = await GET(req);
    const json = await res.json();

    expect(res.status).toBe(401);
    expect(json.error).toBe("Unauthorized");
  });

  it("devuelve 500 en error de base de datos", async () => {
    const user = { id: "user-123" };
    mockSupabase.auth.getUser.mockResolvedValue({ data: { user }, error: null });
    const chain = buildQueryChain({});
    chain.order = mockOrder.mockRejectedValue(new Error("DB connection failed"));
    mockFrom.mockReturnValue(chain);

    const req = createMockRequest("http://localhost/api/products", { headers: { "x-org-id": "test-org-id" } });
    const res = await GET(req);
    const json = await res.json();

    expect(res.status).toBe(500);
    expect(json.error).toBe("Error interno del servidor");
  });
});

describe("POST /api/products", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("crea producto con datos validos", async () => {
    const user = { id: "user-123" };
    mockSupabase.auth.getUser.mockResolvedValue({ data: { user }, error: null });
    const chain = buildQueryChain({
      data: { id: "prod-1", sku: "SKU-001" },
      error: null,
    });
    mockFrom.mockReturnValue(chain);

    const req = createMockRequest("http://localhost/api/products", {
      method: "POST",
      body: JSON.stringify({
        sku: "SKU-001",
        name: "Test Product",
        unitCost: 10,
        salePrice: 30,
        status: "active",
        marketplace: "US",
      }),
      headers: { "x-org-id": "test-org-id" },
    });
    const res = await POST(req);
    const json = await res.json();

    expect(res.status).toBe(201);
    expect(json.data.id).toBe("prod-1");
    expect(mockFrom).toHaveBeenCalledWith("products");
  });

  it("acepta producto sin SKU (SKU opcional)", async () => {
    const user = { id: "user-123" };
    mockSupabase.auth.getUser.mockResolvedValue({ data: { user }, error: null });
    const chain = buildQueryChain({
      data: { id: "prod-1", sku: null, name: "No SKU Product" },
      error: null,
    });
    mockFrom.mockReturnValue(chain);

    const req = createMockRequest("http://localhost/api/products", {
      method: "POST",
      body: JSON.stringify({ name: "No SKU Product", unitCost: 10, salePrice: 30, status: "active", marketplace: "US" }),
      headers: { "x-org-id": "test-org-id" },
    });
    const res = await POST(req);

    expect(res.status).toBe(201);
  });

  it("devuelve 401 sin autenticacion", async () => {
    mockSupabase.auth.getUser.mockResolvedValue({ data: { user: null }, error: new Error("No auth") });

    const req = createMockRequest("http://localhost/api/products", {
      method: "POST",
      body: JSON.stringify({ sku: "SKU-001", name: "Test", unitCost: 10, salePrice: 30, status: "active", marketplace: "US" }),
      headers: { "x-org-id": "test-org-id" },
    });
    const res = await POST(req);

    expect(res.status).toBe(401);
  });

  it("devuelve 500 en error de base de datos", async () => {
    const user = { id: "user-123" };
    mockSupabase.auth.getUser.mockResolvedValue({ data: { user }, error: null });
    const chain = {
      insert: mockInsert.mockReturnThis(),
      select: vi.fn().mockReturnThis(),
      single: vi.fn().mockRejectedValue(new Error("Duplicate SKU")),
    };
    mockFrom.mockReturnValue(chain);

    const req = createMockRequest("http://localhost/api/products", {
      method: "POST",
      body: JSON.stringify({
        sku: "SKU-001",
        name: "Test Product",
        unitCost: 10,
        salePrice: 30,
        status: "active",
        marketplace: "US",
      }),
      headers: { "x-org-id": "test-org-id" },
    });
    const res = await POST(req);
    const json = await res.json();

    expect(res.status).toBe(500);
    expect(json.error).toBe("Error interno del servidor");
  });
});
