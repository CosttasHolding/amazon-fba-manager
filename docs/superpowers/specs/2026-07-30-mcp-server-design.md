# Diseño: MCP Server Embebido para Amazon FBA Manager

**Fecha:** 2026-07-30
**Objetivo:** Exponer datos de la app como herramientas MCP (Model Context Protocol) vía HTTP
**Enfoque:** Embebido en Next.js, mismo deploy en Vercel
**Estado:** Aprobado por el usuario

---

## Resumen

El MCP Server embebido permite que cualquier cliente MCP (OpenCode Desktop, Cline, Claude Desktop, Cursor, etc.) consulte datos reales de la app — productos, inventario, profitability y KPIs del dashboard — usando el protocolo estándar MCP sobre HTTP. Corre dentro de la misma API route de Next.js, sin infraestructura separada, y reusa toda la capa de auth y tipos existente.

---

## Arquitectura

```
Cliente MCP (OpenCode Desktop, etc.)
    │ POST /api/mcp (JSON-RPC)
    ▼
Next.js App Router
    │
    app/api/mcp/route.ts       ← Reusa createApiHandler, envía JSON-RPC al server
    │
    lib/mcp/server.ts          ← Procesa JSON-RPC: initialize, tools/list, tools/call
    │
    lib/mcp/tools/
        products.ts            ← get_products, get_product_by_sku
        inventory.ts           ← get_inventory_alerts, get_reorder_recommendations
        profitability.ts       ← get_profitability
        dashboard.ts           ← get_dashboard_kpi
```

**Data flow:**

1. Cliente MCP hace POST a `/api/mcp` con mensaje JSON-RPC
2. `createApiHandler` autentica via cookie Supabase + extrae orgId
3. `handleMcpRequest` parsea el method y lo rutea al tool handler
4. El tool handler llama a lib functions existentes con `supabase` + `orgId`
5. Responde con JSON-RPC response

---

## Sección 1: Tools Tier 1

### 1.1 `get_products`

- **Input:** `{ search?, status?, stockStatus?, limit?, offset? }`
- **Output:** `{ data: Product[], total: number }`
- **Reusa:** Query a `products_with_inventory` (patrón de `src/app/api/products/route.ts`)

### 1.2 `get_product_by_sku`

- **Input:** `{ sku: string }`
- **Output:** `Product | null`
- **Reusa:** Query a `products_with_inventory` con filtro sku

### 1.3 `get_inventory_alerts`

- **Input:** `{ severity?: "critical" | "warning" }`
- **Output:** `{ alerts: { sku, name, stock_available, reorder_point, days_of_stock, urgency }[] }`
- **Reusa:** Lógica de `src/lib/forecasting.ts`

### 1.4 `get_reorder_recommendations`

- **Input:** `{ limit?: number }`
- **Output:** `{ recommendations: ForecastSuggestion[] }`
- **Reusa:** `getForecastSuggestions` de `src/lib/forecasting.ts`

### 1.5 `get_profitability`

- **Input:** `{ top?: number }`
- **Output:** `{ topByRoi: Product[], topByMargin: Product[], bottomByRoi: Product[] }`

### 1.6 `get_dashboard_kpi`

- **Input:** `{}`
- **Output:** `{ revenue_30d, units_sold_30d, total_fees, active_products, top_products }`
- **Reusa:** `getDashboardData` de `src/lib/dashboard/get-dashboard-data.ts`

---

## Sección 2: Protocolo

Manejamos JSON-RPC manualmente (sin usar la clase `Server` del SDK) para simplicidad en serverless:

| Método JSON-RPC | Handler |
|---|---|
| `initialize` | Devuelve protocolVersion + capabilities |
| `notifications/initialized` | No responde (notification) |
| `ping` | Devuelve `pong` |
| `tools/list` | Devuelve tool definitions |
| `tools/call` | Ejecuta tool, devuelve `{ content: [{ type: "text", text }] }` |

---

## Sección 3: Auth

Reusamos `createApiHandler` de `src/lib/api-handler.ts`. El route handler envuelve toda la lógica MCP:

```ts
export const POST = createApiHandler(async ({ supabase, orgId, user, req }) => {
  const body = await req.json();
  const result = await handleMcpRequest(body, { supabase, orgId, userId: user.id });
  return NextResponse.json(result);
});
```

`createApiHandler` ya verifica sesión de Supabase via cookie, rate limiting (60 req/min), y extrae orgId.

---

## Sección 4: Manejo de Errores

- Auth error → 401 por `createApiHandler`
- Params inválidos → JSON-RPC `-32602`
- Tool execution error → JSON-RPC `-32603`
- Method no encontrado → JSON-RPC `-32601`

---

## Sección 5: Testing

- Unit tests para cada tool handler: mockear supabase, verificar formato de output
- Test de integración del protocolo: initialize → tools/list → tools/call

---

## Sección 6: Migración a Tier 2/3

Cada tool es un archivo separado que exporta `definition + handler`. Para agregar una tool nueva:
1. Crear archivo en `tools/`
2. Importar y registrar en `server.ts`

---

## Dependencias a agregar

```json
{
  "dependencies": {
    "@modelcontextprotocol/sdk": "^1.9.0"
  }
}
```

---

## Archivos a modificar/crear

| Archivo | Acción |
|---------|--------|
| `package.json` | Agregar `@modelcontextprotocol/sdk` |
| `src/app/api/mcp/route.ts` | Crear — route handler con auth |
| `src/lib/mcp/server.ts` | Crear — handleMcpRequest + tool registry |
| `src/lib/mcp/types.ts` | Crear — ToolDefinition, ToolHandler tipos |
| `src/lib/mcp/tools/products.ts` | Crear — get_products, get_product_by_sku |
| `src/lib/mcp/tools/inventory.ts` | Crear — get_inventory_alerts, get_reorder_recommendations |
| `src/lib/mcp/tools/profitability.ts` | Crear — get_profitability |
| `src/lib/mcp/tools/dashboard.ts` | Crear — get_dashboard_kpi |
