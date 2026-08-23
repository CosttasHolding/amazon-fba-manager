import { describe, it, expect, vi, beforeEach } from "vitest";
import { GET, POST } from "@/app/api/suppliers/route";
import { createMockRequest } from "@/lib/test-utils/mock-request";

const mockSupabase = {
  auth: { getUser: vi.fn() },
  from: vi.fn(),
};

function buildQueryChain(returnValue: unknown): Record<string, unknown> {
  const chain: Record<string, unknown> = {};
  const terminal = Promise.resolve(returnValue);
  chain.select = vi.fn().mockReturnValue(chain);
  chain.eq = vi.fn().mockReturnValue(chain);
  chain.or = vi.fn().mockReturnValue(chain);
  chain.order = vi.fn().mockReturnValue(chain);
  chain.range = vi.fn().mockReturnValue(chain);
  chain.insert = vi.fn().mockReturnValue(chain);
  chain.single = vi.fn().mockResolvedValue(returnValue);
  chain.maybeSingle = vi.fn().mockResolvedValue({ data: { org_id: "test-org-id" }, error: null });
  chain.then = terminal.then.bind(terminal);
  chain.catch = terminal.catch.bind(terminal);
  chain.finally = terminal.finally.bind(terminal);
  return chain;
}

vi.mock("@/lib/supabase/server", () => ({
  createClient: vi.fn(() => Promise.resolve(mockSupabase)),
}));

describe("GET /api/suppliers", () => {
  beforeEach(() => vi.clearAllMocks());

  it("devuelve proveedores del usuario autenticado", async () => {
    mockSupabase.auth.getUser.mockResolvedValue({ data: { user: { id: "u1" } }, error: null });
    const chain = buildQueryChain({ data: [{ id: "s1", name: "Acme" }], error: null, count: 1 });
    mockSupabase.from.mockReturnValue(chain);

    const req = createMockRequest("http://localhost/api/suppliers", { headers: { "x-org-id": "test-org-id" } });
    const res = await GET(req);
    const json = await res.json();

    expect(res.status).toBe(200);
    expect(json.data).toEqual([{ id: "s1", name: "Acme" }]);
    expect(json.pagination).toBeDefined();
    expect(json.pagination.total).toBe(1);
    expect(mockSupabase.from).toHaveBeenCalledWith("suppliers");
  });

  it("filtra por busqueda", async () => {
    mockSupabase.auth.getUser.mockResolvedValue({ data: { user: { id: "u1" } }, error: null });
    const chain = buildQueryChain({ data: [], error: null, count: 0 });
    mockSupabase.from.mockReturnValue(chain);

    const req = createMockRequest("http://localhost/api/suppliers?search=Acme", { headers: { "x-org-id": "test-org-id" } });
    const res = await GET(req);

    expect(res.status).toBe(200);
    expect(chain.or).toHaveBeenCalled();
  });

  it("filtra por status", async () => {
    mockSupabase.auth.getUser.mockResolvedValue({ data: { user: { id: "u1" } }, error: null });
    const chain = buildQueryChain({ data: [], error: null, count: 0 });
    mockSupabase.from.mockReturnValue(chain);

    const req = createMockRequest("http://localhost/api/suppliers?status=active", { headers: { "x-org-id": "test-org-id" } });
    const res = await GET(req);

    expect(res.status).toBe(200);
    expect(chain.eq).toHaveBeenCalledWith("status", "active");
  });

  it("devuelve 401 sin autenticacion", async () => {
    mockSupabase.auth.getUser.mockResolvedValue({ data: { user: null }, error: new Error("No auth") });

    const req = createMockRequest("http://localhost/api/suppliers", { headers: { "x-org-id": "test-org-id" } });
    const res = await GET(req);

    expect(res.status).toBe(401);
  });

  it("devuelve 500 en error de DB", async () => {
    mockSupabase.auth.getUser.mockResolvedValue({ data: { user: { id: "u1" } }, error: null });
    const chain = buildQueryChain({ data: null, error: { message: "DB error" } });
    mockSupabase.from.mockReturnValue(chain);

    const req = createMockRequest("http://localhost/api/suppliers", { headers: { "x-org-id": "test-org-id" } });
    const res = await GET(req);

    expect(res.status).toBe(500);
  });
});

describe("POST /api/suppliers", () => {
  beforeEach(() => vi.clearAllMocks());

  it("crea proveedor con datos validos", async () => {
    mockSupabase.auth.getUser.mockResolvedValue({ data: { user: { id: "u1" } }, error: null });
    const chain = buildQueryChain({ data: { id: "s1", name: "Acme Corp" }, error: null });
    mockSupabase.from.mockReturnValue(chain);

    const req = createMockRequest("http://localhost/api/suppliers", {
      method: "POST",
      body: JSON.stringify({ name: "Acme Corp", status: "active" }),
      headers: { "x-org-id": "test-org-id" },
    });
    const res = await POST(req);
    const json = await res.json();

    expect(res.status).toBe(201);
    expect(json.data.name).toBe("Acme Corp");
    expect(chain.insert).toHaveBeenCalled();
  });

  it("devuelve 400 sin nombre", async () => {
    mockSupabase.auth.getUser.mockResolvedValue({ data: { user: { id: "u1" } }, error: null });

    const req = createMockRequest("http://localhost/api/suppliers", {
      method: "POST",
      body: JSON.stringify({ status: "active" }),
      headers: { "x-org-id": "test-org-id" },
    });
    const res = await POST(req);
    const json = await res.json();

    expect(res.status).toBe(400);
    expect(json.error).toBe("Datos inválidos");
    expect(json.details).toBeDefined();
  });

  it("devuelve 400 con email invalido", async () => {
    mockSupabase.auth.getUser.mockResolvedValue({ data: { user: { id: "u1" } }, error: null });

    const req = createMockRequest("http://localhost/api/suppliers", {
      method: "POST",
      body: JSON.stringify({ name: "Test", contact_email: "not-an-email" }),
      headers: { "x-org-id": "test-org-id" },
    });
    const res = await POST(req);

    expect(res.status).toBe(400);
  });

  it("devuelve 401 sin autenticacion", async () => {
    mockSupabase.auth.getUser.mockResolvedValue({ data: { user: null }, error: new Error("No auth") });

    const req = createMockRequest("http://localhost/api/suppliers", {
      method: "POST",
      body: JSON.stringify({ name: "Test" }),
      headers: { "x-org-id": "test-org-id" },
    });
    const res = await POST(req);

    expect(res.status).toBe(401);
  });

  it("devuelve 500 en error de DB al insertar", async () => {
    mockSupabase.auth.getUser.mockResolvedValue({ data: { user: { id: "u1" } }, error: null });
    const chain = buildQueryChain({ data: null, error: { message: "DB insert error" } });
    mockSupabase.from.mockReturnValue(chain);

    const req = createMockRequest("http://localhost/api/suppliers", {
      method: "POST",
      body: JSON.stringify({ name: "Test Supplier" }),
      headers: { "x-org-id": "test-org-id" },
    });
    const res = await POST(req);

    expect(res.status).toBe(500);
  });
});
