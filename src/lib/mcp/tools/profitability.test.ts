import { describe, it, expect, vi, beforeEach } from "vitest";
import { handleMcpRequest, getToolDefinitions } from "@/lib/mcp/server";

const mockOrder = vi.fn();
const mockEq = vi.fn();
const mockLimit = vi.fn();
const mockSelect = vi.fn();
const mockFrom = vi.fn();

const mockSupabase = {
  from: mockFrom,
};

function buildQuery(data: unknown[]) {
  const chain = {
    select: mockSelect.mockReturnThis(),
    eq: mockEq.mockReturnThis(),
    order: mockOrder.mockReturnThis(),
    limit: mockLimit.mockReturnThis(),
  };
  // Simulate thenable: limit is the terminal call
  const promise = Promise.resolve({ data, error: null });
  chain.limit = vi.fn(() => promise) as unknown as typeof mockLimit;
  return chain;
}

const ctx = { supabase: mockSupabase as never, orgId: "org-1", userId: "user-1" };

describe("profitability MCP tool", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("get_profitability returns top and bottom products", async () => {
    await import("@/lib/mcp/tools/profitability");

    const products = [
      { id: "p1", sku: "SKU-001", name: "Product A", roi: 50, margin: 25, sale_price: 30, net_profit: 10 },
      { id: "p2", sku: "SKU-002", name: "Product B", roi: 80, margin: 35, sale_price: 50, net_profit: 20 },
    ];
    mockFrom.mockReturnValue(buildQuery(products));

    const tool = getToolDefinitions().find((t) => t.name === "get_profitability");
    expect(tool).toBeDefined();

    const response = await handleMcpRequest(
      { method: "tools/call", params: { name: "get_profitability", arguments: { top: 10 } }, id: 1 },
      ctx
    );
    const r = response as { result: { content: { text: string }[] } };
    const parsed = JSON.parse(r.result.content[0].text);
    expect(parsed).toHaveProperty("topByRoi");
    expect(parsed).toHaveProperty("bottomByRoi");
    expect(mockEq).toHaveBeenCalledWith("org_id", "org-1");
  });
});
