import { describe, it, expect, vi, beforeEach } from "vitest";
import { handleMcpRequest, getToolDefinitions } from "@/lib/mcp/server";

const mockRange = vi.fn();
const mockOrder = vi.fn();
const mockEq = vi.fn();
const mockOr = vi.fn();
const mockLimit = vi.fn();
const mockSelect = vi.fn();
const mockSingle = vi.fn();
const mockFrom = vi.fn();

const mockSupabase = {
  from: mockFrom,
};

function buildListQuery(data: unknown[]) {
  const chain = {
    select: mockSelect.mockReturnThis(),
    eq: mockEq.mockReturnThis(),
    or: mockOr.mockReturnThis(),
    range: mockRange.mockResolvedValue({ data, count: data.length, error: null }),
    order: mockOrder.mockReturnThis(),
    limit: mockLimit.mockReturnThis(),
    single: vi.fn().mockResolvedValue({ data: null, error: { code: "PGRST116" } }),
  };
  return chain;
}

function buildGetQuery(data: unknown) {
  const chain = {
    select: mockSelect.mockReturnThis(),
    eq: mockEq.mockReturnThis(),
    order: mockOrder.mockReturnThis(),
    range: mockRange.mockReturnThis(),
    limit: mockLimit.mockReturnThis(),
    single: mockSingle.mockResolvedValue({ data, error: data ? null : { code: "PGRST116" } }),
  };
  return chain;
}

const ctx = { supabase: mockSupabase as never, orgId: "org-1", userId: "user-1" };

describe("products MCP tools", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("get_products returns paginated products", async () => {
    await import("@/lib/mcp/tools/products");

    const products = [{ id: "p1", sku: "SKU-001", name: "Product A", status: "active", sale_price: 25, roi: 50 }];
    mockFrom.mockReturnValue(buildListQuery(products));

    const tool = getToolDefinitions().find((t) => t.name === "get_products");
    expect(tool).toBeDefined();
    expect(tool!.description).toBeTruthy();

    const response = await handleMcpRequest(
      { method: "tools/call", params: { name: "get_products", arguments: {} }, id: 1 },
      ctx
    );
    const r = response as { result: { content: { text: string }[] } };
    const parsed = JSON.parse(r.result.content[0].text);
    expect(parsed.data).toHaveLength(1);
    expect(parsed.data[0].sku).toBe("SKU-001");
    expect(mockEq).toHaveBeenCalledWith("org_id", "org-1");
  });

  it("get_product_by_sku returns single product", async () => {
    await import("@/lib/mcp/tools/products");

    const product = { id: "p1", sku: "SKU-001", name: "Product A" };
    mockFrom.mockReturnValue(buildGetQuery(product));

    const response = await handleMcpRequest(
      { method: "tools/call", params: { name: "get_product_by_sku", arguments: { sku: "SKU-001" } }, id: 2 },
      ctx
    );
    const r = response as { result: { content: { text: string }[] } };
    const parsed = JSON.parse(r.result.content[0].text);
    expect(parsed.sku).toBe("SKU-001");
    expect(mockSingle).toHaveBeenCalled();
  });
});
