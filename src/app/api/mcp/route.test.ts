import { describe, it, expect, vi, beforeEach } from "vitest";
import { POST } from "@/app/api/mcp/route";
import { createMockRequest } from "@/lib/test-utils/mock-request";

const mockEq = vi.fn();
const mockOr = vi.fn();
const mockRange = vi.fn();
const mockOrder = vi.fn();
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

function buildListQuery(data: unknown[]) {
  return {
    select: mockSelect.mockReturnThis(),
    eq: mockEq.mockReturnThis(),
    or: mockOr.mockReturnThis(),
    range: mockRange.mockReturnThis(),
    order: mockOrder.mockResolvedValue({ data, count: data.length, error: null }),
    maybeSingle: vi.fn().mockResolvedValue({ data: { org_id: "test-org-id" }, error: null }),
  };
}

describe("POST /api/mcp", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("devuelve 401 sin autenticación", async () => {
    mockGetUser.mockResolvedValue({ data: { user: null }, error: { message: "No auth" } });

    const req = createMockRequest("http://localhost/api/mcp", {
      method: "POST",
      body: JSON.stringify({ jsonrpc: "2.0", method: "initialize", id: 1 }),
    });
    const res = await POST(req);
    expect(res.status).toBe(401);
  });

  it("responde al initialize correctamente autenticado", async () => {
    mockGetUser.mockResolvedValue({ data: { user: { id: "user-1" } }, error: null });
    mockFrom.mockReturnValue(buildListQuery([]));

    const req = createMockRequest("http://localhost/api/mcp", {
      method: "POST",
      body: JSON.stringify({ jsonrpc: "2.0", method: "initialize", id: 1 }),
      headers: { "x-org-id": "org-1" },
    });
    const res = await POST(req);
    const json = await res.json();

    expect(res.status).toBe(200);
    expect(json.jsonrpc).toBe("2.0");
    expect(json.result).toHaveProperty("protocolVersion", "2024-11-05");
    expect(json.result).toHaveProperty("capabilities");
  });

  it("responde tools/list con tool definitions", async () => {
    mockGetUser.mockResolvedValue({ data: { user: { id: "user-1" } }, error: null });
    mockFrom.mockReturnValue(buildListQuery([]));

    const req = createMockRequest("http://localhost/api/mcp", {
      method: "POST",
      body: JSON.stringify({ jsonrpc: "2.0", method: "tools/list", id: 2 }),
      headers: { "x-org-id": "org-1" },
    });
    const res = await POST(req);
    const json = await res.json();

    expect(res.status).toBe(200);
    expect(json.result.tools).toBeInstanceOf(Array);
    expect(json.result.tools.length).toBeGreaterThanOrEqual(6);
    const names = json.result.tools.map((t: { name: string }) => t.name);
    expect(names).toContain("get_products");
    expect(names).toContain("get_inventory_alerts");
    expect(names).toContain("get_profitability");
    expect(names).toContain("get_dashboard_kpi");
  });

  it("devuelve error para method desconocido", async () => {
    mockGetUser.mockResolvedValue({ data: { user: { id: "user-1" } }, error: null });
    mockFrom.mockReturnValue(buildListQuery([]));

    const req = createMockRequest("http://localhost/api/mcp", {
      method: "POST",
      body: JSON.stringify({ jsonrpc: "2.0", method: "unknown_method", id: 3 }),
      headers: { "x-org-id": "org-1" },
    });
    const res = await POST(req);
    const json = await res.json();

    expect(json.error.code).toBe(-32601);
  });
});
