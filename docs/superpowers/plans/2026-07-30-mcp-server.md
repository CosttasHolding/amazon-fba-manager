# MCP Server Embebido — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Exponer datos de la app (productos, inventario, profitability, KPIs) como herramientas MCP via HTTP embebido en Next.js.

**Architecture:** Manejo manual de JSON-RPC sin depender de la clase `Server` del SDK (simplicidad en serverless). Cada tool es un archivo independiente que exporta `definition` + `handler`. El route handler reusa `createApiHandler` para auth.

**Tech Stack:** `@modelcontextprotocol/sdk` (tipos), Next.js 14 App Router, Supabase, Zod, TypeScript strict

## Global Constraints

- TypeScript strict: no `any`
- CSS variables: `bg-background`, never `bg-white`
- snake_case en DB, camelCase en frontend
- Zod para validación, sonner para toasts
- `calculations.ts` es inmutable
- Sin comentarios en código
- Tests con Vitest, mockear `@/lib/supabase/server`

---

## File Structure

### New Files

| File | Responsibility |
|------|---------------|
| `src/lib/mcp/types.ts` | ToolDefinition, ToolHandler, HandlerContext, McpToolRegistro |
| `src/lib/mcp/server.ts` | handleMcpRequest — rutea JSON-RPC a tool handlers |
| `src/lib/mcp/tools/products.ts` | get_products, get_product_by_sku |
| `src/lib/mcp/tools/products.test.ts` | Tests para products tools |
| `src/lib/mcp/tools/inventory.ts` | get_inventory_alerts, get_reorder_recommendations |
| `src/lib/mcp/tools/inventory.test.ts` | Tests para inventory tools |
| `src/lib/mcp/tools/profitability.ts` | get_profitability |
| `src/lib/mcp/tools/profitability.test.ts` | Tests para profitability tool |
| `src/lib/mcp/tools/dashboard.ts` | get_dashboard_kpi |
| `src/lib/mcp/tools/dashboard.test.ts` | Tests para dashboard tool |
| `src/app/api/mcp/route.ts` | POST handler con createApiHandler |
| `src/app/api/mcp/route.test.ts` | Integration test del protocolo MCP |

### Modified Files

| File | Change |
|------|--------|
| `package.json` | Agregar `@modelcontextportal/sdk` |

---

### Task 1: Instalar SDK + crear tipos MCP

**Files:**
- Modify: `package.json`
- Create: `src/lib/mcp/types.ts`

- [ ] **Step 1: Instalar @modelcontextprotocol/sdk**

```bash
npm install @modelcontextprotocol/sdk@^1.9.0
```

- [ ] **Step 2: Crear src/lib/mcp/types.ts**

```ts
import type { SupabaseClient } from "@supabase/supabase-js";

export interface HandlerContext {
  supabase: SupabaseClient;
  orgId: string;
  userId: string;
}

export interface ToolDefinition {
  name: string;
  description: string;
  inputSchema: {
    type: "object";
    properties?: Record<string, unknown>;
    required?: string[];
  };
}

export type ToolHandler = (
  args: Record<string, unknown>,
  ctx: HandlerContext
) => Promise<unknown>;

export interface ToolModule {
  definition: ToolDefinition;
  handler: ToolHandler;
}
```

- [ ] **Step 3: Commit**

```bash
git add package.json src/lib/mcp/types.ts
git commit -m "feat(mcp): add @modelcontextprotocol/sdk dep and types"
```

---

### Task 2: Crear server core (handleMcpRequest + tool registry)

**Files:**
- Create: `src/lib/mcp/server.ts`

**Interfaces:**
- Consumes: `ToolModule`, `HandlerContext` from `types.ts`
- Produces: `handleMcpRequest(body, ctx)` function, `registerTool(module)` function

- [ ] **Step 1: Write server.ts**

```ts
import type { ToolModule, HandlerContext } from "./types";

export interface JsonRpcMessage {
  jsonrpc: "2.0";
  id?: string | number | null;
  method?: string;
  params?: Record<string, unknown>;
  result?: unknown;
  error?: { code: number; message: string; data?: unknown };
}

export interface JsonRpcResponse {
  jsonrpc: "2.0";
  id: string | number | null;
  result?: unknown;
  error?: { code: number; message: string; data?: unknown };
}

const tools: ToolModule[] = [];

export function registerTool(module: ToolModule): void {
  const existing = tools.findIndex((t) => t.definition.name === module.definition.name);
  if (existing >= 0) {
    tools[existing] = module;
  } else {
    tools.push(module);
  }
}

export function getToolDefinitions() {
  return tools.map((t) => t.definition);
}

function getToolHandler(name: string): ToolModule | undefined {
  return tools.find((t) => t.definition.name === name);
}

export async function handleMcpRequest(
  body: Record<string, unknown>,
  ctx: HandlerContext
): Promise<JsonRpcResponse | null> {
  const { method, params, id } = body as {
    method?: string;
    params?: Record<string, unknown>;
    id?: string | number;
  };

  const respond = (result: unknown): JsonRpcResponse => ({
    jsonrpc: "2.0",
    id: id ?? null,
    result,
  });

  const respondError = (code: number, message: string): JsonRpcResponse => ({
    jsonrpc: "2.0",
    id: id ?? null,
    error: { code, message },
  });

  if (method === "initialize") {
    return respond({
      protocolVersion: "2024-11-05",
      capabilities: { tools: {} },
      serverInfo: { name: "fba-manager-mcp", version: "1.0.0" },
    });
  }

  if (method === "notifications/initialized" || method === "notifications/cancelled") {
    return null;
  }

  if (method === "ping") {
    return respond({});
  }

  if (method === "tools/list") {
    return respond({ tools: getToolDefinitions() });
  }

  if (method === "tools/call") {
    const p = params as { name?: string; arguments?: Record<string, unknown> };
    if (!p?.name) {
      return respondError(-32602, "Missing tool name");
    }
    const tool = getToolHandler(p.name);
    if (!tool) {
      return respondError(-32601, `Unknown tool: ${p.name}`);
    }
    try {
      const result = await tool.handler(p.arguments ?? {}, ctx);
      return respond({ content: [{ type: "text", text: JSON.stringify(result) }] });
    } catch (err) {
      return respondError(-32603, err instanceof Error ? err.message : String(err));
    }
  }

  return respondError(-32601, `Method not found: ${method}`);
}
```

- [ ] **Step 2: Commit**

```bash
git add src/lib/mcp/server.ts
git commit -m "feat(mcp): add JSON-RPC server core with tool registry"
```

---

### Task 3: Crear products tool

**Files:**
- Create: `src/lib/mcp/tools/products.ts`
- Create: `src/lib/mcp/tools/products.test.ts`

**Interfaces:**
- Consumes: `ToolModule`, `HandlerContext` from `../types`, `registerTool` from `../server`
- Produces: module that self-registers on import via `registerTool`

- [ ] **Step 1: Write failing products.test.ts**

```ts
import { describe, it, expect, vi, beforeEach } from "vitest";
import { registerTool, getToolDefinitions } from "@/lib/mcp/server";
import type { ToolModule } from "@/lib/mcp/types";

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
    range: mockRange.mockReturnThis(),
    order: mockOrder.mockResolvedValue({ data, count: data.length, error: null }),
    limit: mockLimit.mockReturnThis(),
  };
  return chain;
}

function buildGetQuery(data: unknown) {
  const chain = {
    select: mockSelect.mockReturnThis(),
    eq: mockEq.mockReturnThis(),
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
    const products = [{ id: "p1", sku: "SKU-001", name: "Product A", status: "active", sale_price: 25, roi: 50 }];
    mockFrom.mockReturnValue(buildListQuery(products));

    const tool = getToolDefinitions().find((t) => t.name === "get_products");
    expect(tool).toBeDefined();
    expect(tool!.description).toBeTruthy();

    const result = await (await import("@/lib/mcp/tools/products")).default;
    const response = await result.handler({}, ctx);
    const parsed = JSON.parse(response as string);
    expect(parsed.data).toHaveLength(1);
    expect(parsed.data[0].sku).toBe("SKU-001");
    expect(mockFrom).toHaveBeenCalledWith("products_with_inventory");
    expect(mockEq).toHaveBeenCalledWith("org_id", "org-1");
  });

  it("get_product_by_sku returns single product", async () => {
    const product = { id: "p1", sku: "SKU-001", name: "Product A" };
    mockFrom.mockReturnValue(buildGetQuery(product));

    const tool = getToolDefinitions().find((t) => t.name === "get_product_by_sku");
    expect(tool).toBeDefined();

    const result = await tool!.handler({ sku: "SKU-001" }, ctx);
    const parsed = JSON.parse(result as string);
    expect(parsed.sku).toBe("SKU-001");
  });
});
```

- [ ] **Step 2: Run test (should fail)**

```bash
npx vitest run src/lib/mcp/tools/products.test.ts
```

Expected: FAIL — module not found

- [ ] **Step 3: Create products.ts**

```ts
import type { ToolModule, HandlerContext } from "../types";
import { registerTool } from "../server";

const productsTool: ToolModule = {
  definition: {
    name: "get_products",
    description: "Lista productos con filtros y paginación",
    inputSchema: {
      type: "object",
      properties: {
        search: { type: "string", description: "Búsqueda por SKU o nombre" },
        status: { type: "string", description: "Filtrar por estado: active, inactive, discontinued" },
        stockStatus: { type: "string", description: "Filtrar por stock: normal, low_stock, out_of_stock, overstock" },
        limit: { type: "number", description: "Máximo de resultados (default 20, max 200)" },
        offset: { type: "number", description: "Offset para paginación (default 0)" },
      },
    },
  },
  handler: async (args, ctx) => {
    const { supabase, orgId } = ctx;
    const search = String(args.search ?? "");
    const status = String(args.status ?? "");
    const stockStatus = String(args.stockStatus ?? "");
    const limit = Math.min(200, Math.max(1, Number(args.limit) || 20));
    const offset = Math.max(0, Number(args.offset) || 0);

    let query = supabase
      .from("products_with_inventory")
      .select("*", { count: "exact" })
      .eq("org_id", orgId);

    if (search) {
      const clean = search.replace(/[%_]/g, "\\$&");
      query = query.or(`sku.ilike.%${clean}%,name.ilike.%${clean}%`);
    }
    if (status) query = query.eq("status", status);
    if (stockStatus) query = query.eq("stock_status", stockStatus);

    const { data, count, error } = await query
      .order("name", { ascending: true })
      .range(offset, offset + limit - 1);

    if (error) throw error;

    return { data: data || [], total: count || 0 };
  },
};

registerTool(productsTool);

const productBySkuTool: ToolModule = {
  definition: {
    name: "get_product_by_sku",
    description: "Obtiene detalle completo de un producto por SKU",
    inputSchema: {
      type: "object",
      properties: {
        sku: { type: "string", description: "SKU del producto" },
      },
      required: ["sku"],
    },
  },
  handler: async (args, ctx) => {
    const { supabase, orgId } = ctx;
    const sku = String(args.sku ?? "");

    const { data, error } = await supabase
      .from("products_with_inventory")
      .select("*")
      .eq("org_id", orgId)
      .eq("sku", sku)
      .single();

    if (error && error.code !== "PGRST116") throw error;

    return data || null;
  },
};

registerTool(productBySkuTool);
```

- [ ] **Step 4: Run test again (should pass)**

```bash
npx vitest run src/lib/mcp/tools/products.test.ts
```

Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add src/lib/mcp/tools/products.ts src/lib/mcp/tools/products.test.ts
git commit -m "feat(mcp): add products tools (get_products, get_product_by_sku)"
```

---

### Task 4: Crear inventory tool

**Files:**
- Create: `src/lib/mcp/tools/inventory.ts`
- Create: `src/lib/mcp/tools/inventory.test.ts`

- [ ] **Step 1: Write inventory.test.ts**

```ts
import { describe, it, expect, vi, beforeEach } from "vitest";
import { getToolDefinitions } from "@/lib/mcp/server";

const mockEq = vi.fn();
const mockSelect = vi.fn();
const mockFrom = vi.fn();

const mockSupabase = {
  from: mockFrom,
};

function buildQuery(data: unknown) {
  return {
    select: mockSelect.mockReturnThis(),
    eq: mockEq.mockResolvedValue({ data, error: null }),
  };
}

const ctx = { supabase: mockSupabase as never, orgId: "org-1", userId: "user-1" };

describe("inventory MCP tools", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("get_inventory_alerts returns alerts", async () => {
    const products = [
      { id: "p1", sku: "SKU-001", name: "Product A", stock_available: 5, reorder_point: 20, sales_velocity_30d: 30 },
    ];
    mockFrom.mockReturnValue(buildQuery(products));

    const tool = getToolDefinitions().find((t) => t.name === "get_inventory_alerts");
    expect(tool).toBeDefined();

    const result = await tool!.handler({}, ctx);
    const parsed = JSON.parse(result as string);
    expect(parsed.alerts).toHaveLength(1);
    expect(parsed.alerts[0].sku).toBe("SKU-001");
    expect(parsed.alerts[0].urgency).toBe("critical");
  });
});
```

- [ ] **Step 2: Run test (should fail)**

```bash
npx vitest run src/lib/mcp/tools/inventory.test.ts
```

Expected: FAIL

- [ ] **Step 3: Create inventory.ts**

```ts
import type { ToolModule, HandlerContext } from "../types";
import { registerTool } from "../server";

function calcDaysOfStock(stock: number, velocity30d: number): number {
  const daily = velocity30d / 30;
  return daily > 0 ? Math.round(stock / daily) : 999;
}

function calcReorderPoint(dailyVelocity: number, leadTime: number): number {
  const safety = Math.ceil(dailyVelocity * leadTime * 0.5);
  return Math.ceil(dailyVelocity * leadTime) + safety;
}

function calcUrgency(daysOfStock: number, leadTime: number): "critical" | "warning" | "ok" {
  return daysOfStock <= leadTime ? "critical" : daysOfStock <= leadTime * 2 ? "warning" : "ok";
}

const inventoryAlertsTool: ToolModule = {
  definition: {
    name: "get_inventory_alerts",
    description: "Productos con stock por debajo del reorder point",
    inputSchema: {
      type: "object",
      properties: {
        severity: {
          type: "string",
          description: "Filtrar por severidad: critical (stock < 50% reorder_point) o warning (stock < 100%)",
          enum: ["critical", "warning"],
        },
      },
    },
  },
  handler: async (args, ctx) => {
    const { supabase, orgId } = ctx;
    const severity = String(args.severity ?? "");

    const { data, error } = await supabase
      .from("products_with_inventory")
      .select("id,sku,name,stock_available,reorder_point,sales_velocity_30d")
      .eq("org_id", orgId)
      .eq("status", "active");

    if (error) throw error;

    const products = (data || []) as {
      id: string;
      sku: string;
      name: string;
      stock_available: number;
      reorder_point: number;
      sales_velocity_30d: number;
    }[];

    const alerts = products
      .filter((p) => p.reorder_point > 0 && p.stock_available <= p.reorder_point)
      .map((p) => {
        const daily = (p.sales_velocity_30d || 0) / 30;
        const dos = calcDaysOfStock(p.stock_available, p.sales_velocity_30d || 0);
        const urgency = calcUrgency(dos, 30);
        return {
          sku: p.sku,
          name: p.name,
          stock_available: p.stock_available,
          reorder_point: p.reorder_point,
          days_of_stock: dos,
          daily_velocity: Number(daily.toFixed(2)),
          urgency,
        };
      })
      .filter((a) => !severity || a.urgency === severity)
      .sort((a, b) => a.days_of_stock - b.days_of_stock);

    return { alerts };
  },
};

registerTool(inventoryAlertsTool);

const reorderRecommendationsTool: ToolModule = {
  definition: {
    name: "get_reorder_recommendations",
    description: "Recomendaciones de reorden para productos activos",
    inputSchema: {
      type: "object",
      properties: {
        limit: { type: "number", description: "Máximo de recomendaciones (default 20)" },
      },
    },
  },
  handler: async (args, ctx) => {
    const { supabase, orgId } = ctx;
    const limit = Math.max(1, Number(args.limit) || 20);

    const { data, error } = await supabase
      .from("products_with_inventory")
      .select("*, product_suppliers(lead_time_days, unit_cost, suppliers(name))")
      .eq("org_id", orgId)
      .eq("status", "active");

    if (error) throw error;

    const allProducts = (data || []) as {
      id: string;
      sku: string;
      name: string;
      stock_available: number;
      sales_velocity_30d: number;
      product_suppliers: Record<string, unknown>[] | null;
    }[];

    const recommendations = allProducts
      .map((p) => {
        const stock = p.stock_available || 0;
        const velocity = p.sales_velocity_30d || 0;
        const daily = velocity / 30;
        const dos = daily > 0 ? Math.round(stock / daily) : 999;
        const supplier = (p.product_suppliers || [])[0];
        const leadTime = (supplier?.lead_time_days as number) || 30;
        const reorderPoint = calcReorderPoint(daily, leadTime);
        const suggested = Math.max(0, reorderPoint - stock);

        return {
          product_id: p.id,
          sku: p.sku,
          name: p.name,
          stock_available: stock,
          sales_velocity_30d: velocity,
          daily_velocity: Number(daily.toFixed(2)),
          days_of_stock: dos,
          lead_time_days: leadTime,
          reorder_point: reorderPoint,
          suggested_qty: suggested,
          supplier_name: (supplier?.suppliers as Record<string, string | undefined>)?.name ?? null,
          urgency: calcUrgency(dos, leadTime),
        };
      })
      .filter((r) => r.urgency !== "ok" || r.suggested_qty > 0)
      .sort((a, b) => a.days_of_stock - b.days_of_stock)
      .slice(0, limit);

    return { recommendations };
  },
};

registerTool(reorderRecommendationsTool);
```

- [ ] **Step 4: Run test (should pass)**

```bash
npx vitest run src/lib/mcp/tools/inventory.test.ts
```

Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add src/lib/mcp/tools/inventory.ts src/lib/mcp/tools/inventory.test.ts
git commit -m "feat(mcp): add inventory tools (get_inventory_alerts, get_reorder_recommendations)"
```

---

### Task 5: Crear profitability tool

**Files:**
- Create: `src/lib/mcp/tools/profitability.ts`
- Create: `src/lib/mcp/tools/profitability.test.ts`

- [ ] **Step 1: Write profitability.test.ts**

```ts
import { describe, it, expect, vi, beforeEach } from "vitest";
import { getToolDefinitions } from "@/lib/mcp/server";

const mockOrder = vi.fn();
const mockEq = vi.fn();
const mockLimit = vi.fn();
const mockSelect = vi.fn();
const mockFrom = vi.fn();

const mockSupabase = {
  from: mockFrom,
};

function buildQuery(data: unknown[]) {
  return {
    select: mockSelect.mockReturnThis(),
    eq: mockEq.mockReturnThis(),
    order: mockOrder.mockReturnThis(),
    limit: mockLimit.mockResolvedValue({ data, error: null }),
  };
}

const ctx = { supabase: mockSupabase as never, orgId: "org-1", userId: "user-1" };

describe("profitability MCP tool", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("get_profitability returns top and bottom products", async () => {
    const products = [
      { id: "p1", sku: "SKU-001", name: "Product A", roi: 50, margin: 25, sale_price: 30, net_profit: 10 },
      { id: "p2", sku: "SKU-002", name: "Product B", roi: 80, margin: 35, sale_price: 50, net_profit: 20 },
    ];
    mockFrom.mockReturnValue(buildQuery(products));

    const tool = getToolDefinitions().find((t) => t.name === "get_profitability");
    expect(tool).toBeDefined();

    const result = await tool!.handler({ top: 10 }, ctx);
    const parsed = JSON.parse(result as string);
    expect(parsed).toHaveProperty("topByRoi");
    expect(parsed).toHaveProperty("bottomByRoi");
    expect(mockEq).toHaveBeenCalledWith("org_id", "org-1");
  });
});
```

- [ ] **Step 2: Run test (should fail)**

```bash
npx vitest run src/lib/mcp/tools/profitability.test.ts
```

Expected: FAIL

- [ ] **Step 3: Create profitability.ts**

```ts
import type { ToolModule, HandlerContext } from "../types";
import { registerTool } from "../server";

const profitabilityTool: ToolModule = {
  definition: {
    name: "get_profitability",
    description: "Resumen de rentabilidad: mejores y peores SKUs por ROI y margen",
    inputSchema: {
      type: "object",
      properties: {
        top: { type: "number", description: "Cuantos productos devolver (default 10)" },
      },
    },
  },
  handler: async (args, ctx) => {
    const { supabase, orgId } = ctx;
    const top = Math.max(1, Math.min(100, Number(args.top) || 10));

    const { data, error } = await supabase
      .from("products_with_inventory")
      .select("id,sku,name,status,sale_price,unit_cost,net_profit,roi,margin,revenue_last_30d")
      .eq("org_id", orgId)
      .eq("status", "active");

    if (error) throw error;

    const products = (data || []).filter((p: Record<string, unknown>) => p.roi !== null);

    const byRoi = [...products].sort(
      (a: Record<string, unknown>, b: Record<string, unknown>) => Number(b.roi) - Number(a.roi)
    );
    const byMargin = [...products].sort(
      (a: Record<string, unknown>, b: Record<string, unknown>) => Number(b.margin) - Number(a.margin)
    );

    return {
      topByRoi: byRoi.slice(0, top),
      topByMargin: byMargin.slice(0, top),
      bottomByRoi: byRoi.reverse().slice(0, top),
    };
  },
};

registerTool(profitabilityTool);
```

- [ ] **Step 4: Run test (should pass)**

```bash
npx vitest run src/lib/mcp/tools/profitability.test.ts
```

Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add src/lib/mcp/tools/profitability.ts src/lib/mcp/tools/profitability.test.ts
git commit -m "feat(mcp): add profitability tool (get_profitability)"
```

---

### Task 6: Crear dashboard tool

**Files:**
- Create: `src/lib/mcp/tools/dashboard.ts`
- Create: `src/lib/mcp/tools/dashboard.test.ts`

- [ ] **Step 1: Write dashboard.test.ts**

```ts
import { describe, it, expect, vi, beforeEach } from "vitest";
import { getToolDefinitions } from "@/lib/mcp/server";

const mockGte = vi.fn();
const mockOrder = vi.fn();
const mockLimit = vi.fn();
const mockEq = vi.fn();
const mockSelect = vi.fn();
const mockFrom = vi.fn();

const mockSupabase = {
  from: mockFrom,
};

const ctx = { supabase: mockSupabase as never, orgId: "org-1", userId: "user-1" };

function buildProductsQuery(data: unknown[]) {
  return {
    select: mockSelect.mockReturnThis(),
    eq: mockEq.mockReturnThis(),
    order: mockOrder.mockReturnThis(),
    limit: mockLimit.mockResolvedValue({ data, error: null }),
  };
}

function buildSalesQuery(data: unknown[]) {
  return {
    select: mockSelect.mockReturnThis(),
    eq: mockEq.mockReturnThis(),
    gte: mockGte.mockResolvedValue({ data, error: null }),
  };
}

describe("dashboard MCP tool", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("get_dashboard_kpi returns KPIs", async () => {
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

    const result = await tool!.handler({}, ctx);
    const parsed = JSON.parse(result as string);
    expect(parsed).toHaveProperty("revenue_30d");
    expect(parsed).toHaveProperty("active_products");
    expect(parsed.active_products).toBe(1);
  });
});
```

- [ ] **Step 2: Run test (should fail)**

```bash
npx vitest run src/lib/mcp/tools/dashboard.test.ts
```

Expected: FAIL

- [ ] **Step 3: Create dashboard.ts**

```ts
import type { ToolModule, HandlerContext } from "../types";
import { registerTool } from "../server";

const dashboardTool: ToolModule = {
  definition: {
    name: "get_dashboard_kpi",
    description: "KPIs principales: revenue 30d, unidades vendidas, productos activos",
    inputSchema: {
      type: "object",
      properties: {},
    },
  },
  handler: async (_args, ctx) => {
    const { supabase, orgId } = ctx;

    const [productResult, salesResult] = await Promise.all([
      supabase
        .from("products_with_inventory")
        .select("id,sku,name,status,sale_price,net_profit,roi,stock_available,sales_velocity_30d,reorder_point,unit_cost,category,revenue_last_30d")
        .eq("org_id", orgId)
        .order("net_profit", { ascending: false })
        .limit(500),
      supabase
        .from("sales")
        .select("sale_date,revenue,units_sold,product_id")
        .eq("org_id", orgId)
        .gte("sale_date", new Date(Date.now() - 84 * 86400000).toISOString().split("T")[0]),
    ]);

    if (productResult.error) throw productResult.error;
    if (salesResult.error) throw salesResult.error;

    const allProducts = (productResult.data || []) as Record<string, unknown>[];
    const sales = (salesResult.data || []) as Record<string, unknown>[];

    const activeProducts = allProducts.filter((p) => p.status === "active");

    const sixtyDaysAgo = new Date(Date.now() - 60 * 86400000).toISOString().split("T")[0];
    const recentSales = sales.filter((s) => String(s.sale_date) >= sixtyDaysAgo);

    const revenue30d = recentSales.reduce((sum, s) => sum + Number(s.revenue || 0), 0);
    const unitsSold30d = recentSales.reduce((sum, s) => sum + Number(s.units_sold || 0), 0);

    const topProducts = activeProducts
      .slice(0, 5)
      .map((p) => ({
        id: p.id,
        name: p.name,
        sku: p.sku,
        sale_price: p.sale_price,
        net_profit: p.net_profit,
        roi: p.roi,
        stock_available: p.stock_available,
        sales_velocity_30d: p.sales_velocity_30d,
      }));

    return {
      revenue_30d: revenue30d,
      units_sold_30d: unitsSold30d,
      active_products: activeProducts.length,
      top_products: topProducts,
    };
  },
};

registerTool(dashboardTool);
```

- [ ] **Step 4: Run test (should pass)**

```bash
npx vitest run src/lib/mcp/tools/dashboard.test.ts
```

Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add src/lib/mcp/tools/dashboard.ts src/lib/mcp/tools/dashboard.test.ts
git commit -m "feat(mcp): add dashboard tool (get_dashboard_kpi)"
```

---

### Task 7: Crear API route + auto-register all tools

**Files:**
- Create: `src/app/api/mcp/route.ts`

**Interfaces:**
- Consumes: `createApiHandler` from `@/lib/api-handler`, `handleMcpRequest` from `@/lib/mcp/server`
- Produces: `POST /api/mcp` endpoint

- [ ] **Step 1: Create route.ts**

```ts
export const dynamic = "force-dynamic";

import { NextResponse } from "next/server";
import { createApiHandler } from "@/lib/api-handler";
import { handleMcpRequest } from "@/lib/mcp/server";

import "@/lib/mcp/tools/products";
import "@/lib/mcp/tools/inventory";
import "@/lib/mcp/tools/profitability";
import "@/lib/mcp/tools/dashboard";

export const POST = createApiHandler(async ({ supabase, orgId, user, req }) => {
  const body = await req.json();

  const result = await handleMcpRequest(body, {
    supabase,
    orgId: orgId ?? "",
    userId: user.id,
  });

  if (result === null) {
    return new NextResponse(null, { status: 202 });
  }

  return NextResponse.json(result);
});
```

- [ ] **Step 2: Commit**

```bash
git add src/app/api/mcp/route.ts
git commit -m "feat(mcp): add /api/mcp POST route with auth"
```

---

### Task 8: Integration test + verify build

**Files:**
- Create: `src/app/api/mcp/route.test.ts`

- [ ] **Step 1: Write route.test.ts**

```ts
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
```

- [ ] **Step 2: Run tests**

```bash
npx vitest run src/lib/mcp/ src/app/api/mcp/
```

Expected: PASS (all tests)

- [ ] **Step 3: Verificar build**

```bash
npm run build
```

Expected: Build sin errores

- [ ] **Step 4: Commit**

```bash
git add src/app/api/mcp/route.test.ts
git commit -m "test(mcp): add integration test for MCP protocol"
```

---

## Verification

1. `npm run lint` — 0 errors
2. `npx vitest run` — all tests pass
3. `npm run build` — build exits 0
