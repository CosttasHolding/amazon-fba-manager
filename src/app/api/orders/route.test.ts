import { describe, it, expect, vi, beforeEach } from "vitest";
import { GET, POST } from "@/app/api/orders/route";
import { createMockRequest } from "@/lib/test-utils/mock-request";

const mockOrder = vi.fn();
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
    order: vi.fn().mockReturnThis(),
    range: mockOrder.mockResolvedValue(returnValue),
    insert: mockInsert.mockReturnThis(),
    single: vi.fn().mockResolvedValue(returnValue),
  maybeSingle: vi.fn().mockResolvedValue({ data: { role: "editor" }, error: null }),
  };
  return chain;
}

vi.mock("@/lib/supabase/server", () => ({
  createClient: vi.fn(() => Promise.resolve(mockSupabase)),
}));

describe("GET /api/orders", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("devuelve ordenes del usuario autenticado", async () => {
    const user = { id: "user-123" };
    mockSupabase.auth.getUser.mockResolvedValue({ data: { user }, error: null });
    const chain = buildQueryChain({
      data: [{ id: "o1", po_number: "PO-001" }],
      error: null,
    });
    mockFrom.mockReturnValue(chain);

    const req = createMockRequest("http://localhost/api/orders", { headers: { "x-org-id": "test-org-id" } });
    const res = await GET(req);
    const json = await res.json();

    expect(res.status).toBe(200);
    expect(json.data).toEqual([{ id: "o1", po_number: "PO-001" }]);
    expect(json.pagination).toBeDefined();
    expect(mockFrom).toHaveBeenCalledWith("purchase_orders");
    expect(mockEq).toHaveBeenCalledWith("org_id", "test-org-id");
  });

  it("devuelve 401 sin autenticacion", async () => {
    mockSupabase.auth.getUser.mockResolvedValue({ data: { user: null }, error: new Error("No auth") });

    const req = createMockRequest("http://localhost/api/orders", { headers: { "x-org-id": "test-org-id" } });
    const res = await GET(req);
    const json = await res.json();

    expect(res.status).toBe(401);
    expect(json.error).toBe("Unauthorized");
  });

  it("devuelve 500 en error de base de datos", async () => {
    const user = { id: "user-123" };
    mockSupabase.auth.getUser.mockResolvedValue({ data: { user }, error: null });
    const chain = buildQueryChain({ data: null, error: { message: "DB error" } });
    mockFrom.mockReturnValue(chain);

    const req = createMockRequest("http://localhost/api/orders", { headers: { "x-org-id": "test-org-id" } });
    const res = await GET(req);
    const json = await res.json();

    expect(res.status).toBe(500);
    expect(json.error).toBe("Error interno del servidor");
  });
});

describe("POST /api/orders", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("crea orden con datos validos", async () => {
    const user = { id: "user-123" };
    mockSupabase.auth.getUser.mockResolvedValue({ data: { user }, error: null });
    const chain = buildQueryChain({ data: { id: "ord-1", quantity: 100 }, error: null });
    mockFrom.mockReturnValue(chain);

    const req = createMockRequest("http://localhost/api/orders", {
      method: "POST",
      body: JSON.stringify({ quantity: 100, unit_cost: 5.5 }),
      headers: { "x-org-id": "test-org-id" },
    });
    const res = await POST(req);
    const json = await res.json();

    expect(res.status).toBe(201);
    expect(json.data.id).toBe("ord-1");
    expect(mockFrom).toHaveBeenCalledWith("purchase_orders");
  });

  it("devuelve 400 con datos invalidos", async () => {
    const user = { id: "user-123" };
    mockSupabase.auth.getUser.mockResolvedValue({ data: { user }, error: null });

    const req = createMockRequest("http://localhost/api/orders", {
      method: "POST",
      body: JSON.stringify({ unit_cost: 10 }),
      headers: { "x-org-id": "test-org-id" },
    });
    const res = await POST(req);
    const json = await res.json();

    expect(res.status).toBe(400);
    expect(json.error).toBe("Datos inválidos");
    expect(json.details).toBeDefined();
  });

  it("devuelve 401 sin autenticacion", async () => {
    mockSupabase.auth.getUser.mockResolvedValue({ data: { user: null }, error: new Error("No auth") });

    const req = createMockRequest("http://localhost/api/orders", {
      method: "POST",
      body: JSON.stringify({ quantity: 10, unit_cost: 5 }),
      headers: { "x-org-id": "test-org-id" },
    });
    const res = await POST(req);

    expect(res.status).toBe(401);
  });
});
