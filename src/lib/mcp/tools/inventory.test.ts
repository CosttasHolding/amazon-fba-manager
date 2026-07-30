import { describe, it, expect, vi, beforeEach } from "vitest";
import { handleMcpRequest, getToolDefinitions } from "@/lib/mcp/server";

vi.mock("@/lib/supabase/server", () => ({
  createClient: vi.fn(() => Promise.resolve({})),
}));

const mockEq = vi.fn();
const mockSelect = vi.fn();
const mockFrom = vi.fn();

const mockSupabase = {
  from: mockFrom,
};

function buildQuery(data: unknown) {
  const chain = {
    select: mockSelect.mockReturnThis(),
    eq: (...args: unknown[]) => {
      mockEq(...args);
      return chain;
    },
    then: (resolve: (v: unknown) => void) => resolve({ data, error: null }),
  };
  return chain;
}

const ctx = { supabase: mockSupabase as never, orgId: "org-1", userId: "user-1" };

describe("inventory MCP tools", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("get_inventory_alerts returns alerts", async () => {
    await import("@/lib/mcp/tools/inventory");

    const products = [
      { id: "p1", sku: "SKU-001", name: "Product A", stock_available: 5, reorder_point: 20, sales_velocity_30d: 30 },
    ];
    mockFrom.mockReturnValue(buildQuery(products));

    const tool = getToolDefinitions().find((t) => t.name === "get_inventory_alerts");
    expect(tool).toBeDefined();

    const response = await handleMcpRequest(
      { method: "tools/call", params: { name: "get_inventory_alerts", arguments: {} }, id: 1 },
      ctx
    );
    const r = response as { result: { content: { text: string }[] } };
    const parsed = JSON.parse(r.result.content[0].text);
    expect(parsed.alerts).toHaveLength(1);
    expect(parsed.alerts[0].sku).toBe("SKU-001");
    expect(parsed.alerts[0].urgency).toBe("critical");
  });
});
