import { describe, it, expect, vi, beforeEach } from "vitest";
import { handleMcpRequest, getToolDefinitions } from "@/lib/mcp/server";

const mockOrder = vi.fn();
const mockLimit = vi.fn();
const mockEq = vi.fn();
const mockSelect = vi.fn();
const mockFrom = vi.fn();

const mockSupabase = {
  from: mockFrom,
};

const ctx = { supabase: mockSupabase as never, orgId: "org-1", userId: "user-1" };

function buildThenable(result: unknown) {
  return Promise.resolve(result);
}

function buildProductsQuery(data: unknown[]) {
  const chain = {
    select: mockSelect.mockReturnThis(),
    eq: mockEq.mockReturnThis(),
    order: mockOrder.mockReturnThis(),
    limit: vi.fn(() => buildThenable({ data, error: null })),
  };
  return chain;
}

function buildSalesQuery(data: unknown[]) {
  const chain = {
    select: mockSelect.mockReturnThis(),
    eq: mockEq.mockReturnThis(),
    gte: vi.fn(() => buildThenable({ data, error: null })),
  };
  return chain;
}

describe("dashboard MCP tool", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("get_dashboard_kpi returns KPIs", async () => {
    await import("@/lib/mcp/tools/dashboard");

    const products = [
      { id: "p1", sku: "SKU-001", name: "Product A", status: "active", sale_price: 30, net_profit: 10, roi: 50, stock_available: 100, sales_velocity_30d: 10, reorder_point: 20 },
    ];
    const sales = [
      { sale_date: new Date().toISOString().split("T")[0], revenue: 100, units_sold: 5, product_id: "p1" },
    ];

    mockFrom
      .mockReturnValueOnce(buildProductsQuery(products))
      .mockReturnValueOnce(buildSalesQuery(sales));

    const tool = getToolDefinitions().find((t) => t.name === "get_dashboard_kpi");
    expect(tool).toBeDefined();

    const response = await handleMcpRequest(
      { method: "tools/call", params: { name: "get_dashboard_kpi", arguments: {} }, id: 1 },
      ctx
    );
    const r = response as { result: { content: { text: string }[] } };
    const parsed = JSON.parse(r.result.content[0].text);
    expect(parsed).toHaveProperty("revenue_30d");
    expect(parsed).toHaveProperty("active_products");
    expect(parsed.active_products).toBe(1);
  });
});
