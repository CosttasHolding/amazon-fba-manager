# API.md - Guía Completa de API Routes

> Todas las API routes están en `src/app/api/`. Usan `createApiHandler` como wrapper estándar que provee auth, rate limiting, y resolución de org_id.

---

## 1. Patrón Estándar: `createApiHandler`

Cada endpoint sigue este patrón:

```typescript
// src/app/api/products/route.ts
import { createApiHandler, buildPagination, paginatedResponse } from "@/lib/api-handler";

export const GET = createApiHandler(async ({ supabase, user, orgId, req }) => {
  const { page, perPage, from, to } = buildPagination(req);

  const { data, error } = await supabase
    .from("products")
    .select("*", { count: "exact" })
    .eq("org_id", orgId)
    .range(from, to);

  return NextResponse.json(paginatedResponse(data, count, page, perPage));
});

export const POST = createApiHandler(async ({ supabase, user, orgId, req }) => {
  const body = await req.json();
  const parsed = productSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.errors[0].message }, { status: 400 });
  }
  const { data, error } = await supabase
    .from("products")
    .insert({ ...parsed.data, user_id: user.id, org_id: orgId })
    .select()
    .single();
  return NextResponse.json(data, { status: 201 });
});
```

### Qué hace `createApiHandler` (orden):

1. **Rate limiting** → 60 req/min por IP+route (configurable)
2. **Auth** → `createClient()` → `getUser()` → 401 si no hay user
3. **Org resolution** → Header `x-org-id` → membership lookup → auto-create org
4. **Handler execution** → Pasa `{ supabase, user, orgId, req }`
5. **Error handling** → Catch-all retorna 500 con mensaje genérico

### Contexto del handler:

```typescript
type HandlerContext = {
  supabase: SupabaseClient;           // Cliente server-side con cookies
  user: { id: string; email?: string }; // Usuario autenticado
  orgId: string | null;               // Org actual (resuelta automáticamente)
  req: NextRequest;                   // Request original
};
```

---

## 2. Catalogo Completo de Endpoints

### 2.1 Products (`/api/products/`)

| Método | Ruta | Propósito | Body/Params |
|--------|------|-----------|-------------|
| `GET` | `/api/products` | Lista paginada de productos | `?page=1&perPage=20&search=&status=&stockStatus=&sort=roi-desc` |
| `POST` | `/api/products` | Crear producto | `{ sku?, asin?, name, category?, ... }` (productSchema) |
| `GET` | `/api/products/[id]` | Obtener producto por ID | - |
| `PUT` | `/api/products/[id]` | Actualizar producto | `{ name?, sale_price?, ... }` |
| `DELETE` | `/api/products/[id]` | Eliminar producto | - |
| `GET` | `/api/products/summary` | Estadísticas agregadas | - |
| `GET` | `/api/products/[id]/suppliers` | Proveedores de un producto | - |
| `POST` | `/api/products/[id]/suppliers` | Vincular proveedor | `{ supplier_id, unit_cost?, moq?, ... }` |
| `DELETE` | `/api/products/[id]/suppliers` | Desvincular proveedor | `?supplier_id=` |

**Filtros disponibles (GET list):**
- `search` → Busca en name, sku, asin (ILIKE)
- `status` → Filtra por estado (active/paused/discontinued)
- `stockStatus` → Filtra por stock_status de la vista (normal/low_stock/out_of_stock/overstock)
- `sort` → Opciones: `name-asc`, `name-desc`, `roi-asc`, `roi-desc`, `price-asc`, `price-desc`, `stock-asc`, `stock-desc`, `created-asc`, `created-desc`, `profit-asc`, `profit-desc`

**Query:** Usa la vista `products_with_inventory` (JOIN de products + inventory + sales)

---

### 2.2 Sales (`/api/sales/`)

| Método | Ruta | Propósito | Body/Params |
|--------|------|-----------|-------------|
| `GET` | `/api/sales` | Lista paginada de ventas | `?page=&perPage=&dateFrom=&dateTo=&search=` |
| `POST` | `/api/sales` | Crear venta | `{ productId, saleDate, unitsSold, revenue, amazonFees?, orderId? }` |
| `GET` | `/api/sales/summary` | Estadísticas de ventas | - |
| `POST` | `/api/sales/import` | Importar ventas CSV | FormData con archivo CSV |

**Computed field:** `net_profit = revenue - amazon_fees - (units_sold * unit_cost)` (calculado en el GET, no stored)

---

### 2.3 Inventory (`/api/inventory/`)

| Método | Ruta | Propósito | Body/Params |
|--------|------|-----------|-------------|
| `GET` | `/api/inventory` | Lista paginada de inventario | `?page=&perPage=&search=&status=&sort=` |
| `GET` | `/api/inventory/summary` | Resumen de stock | - |
| `GET` | `/api/inventory/movements` | Historial de movimientos | `?product_id=&type=&limit=` |
| `POST` | `/api/inventory/movements` | Crear movimiento | `{ productId, movementType, quantity, reference?, notes? }` |

**Importante:** Los movimientos de stock se procesan via trigger `update_inventory_from_movement()` que actualiza automáticamente la tabla `inventory`. No se hace UPDATE directo a `inventory`.

---

### 2.4 Suppliers (`/api/suppliers/`)

| Método | Ruta | Propósito | Body/Params |
|--------|------|-----------|-------------|
| `GET` | `/api/suppliers` | Lista paginada | `?page=&perPage=&search=&status=` |
| `POST` | `/api/suppliers` | Crear proveedor | `{ name, country?, rating?, ... }` |
| `GET` | `/api/suppliers/[id]` | Obtener proveedor | - |
| `PUT` | `/api/suppliers/[id]` | Actualizar proveedor | `{ name?, rating?, ... }` |
| `DELETE` | `/api/suppliers/[id]` | Eliminar proveedor | - |
| `GET` | `/api/suppliers/[id]/quotes` | Cotizaciones del proveedor | - |
| `POST` | `/api/suppliers/[id]/quotes` | Crear cotización | `{ quantity, unit_price, ... }` |
| `GET` | `/api/suppliers/[id]/products` | Productos vinculados | - |
| `POST` | `/api/suppliers/[id]/products` | Vincular producto | `{ product_id, unit_cost?, ... }` |

---

### 2.5 Orders (`/api/orders/`)

| Método | Ruta | Propósito | Body/Params |
|--------|------|-----------|-------------|
| `GET` | `/api/orders` | Lista paginada de POs | `?page=&perPage=&search=&status=` |
| `POST` | `/api/orders` | Crear PO | `{ supplier_id, product_id, quantity, unit_cost, ... }` |
| `GET` | `/api/orders/[id]` | Obtener PO | - |
| `PUT` | `/api/orders/[id]` | Actualizar PO | `{ status?, tracking_number?, ... }` |
| `DELETE` | `/api/orders/[id]` | Eliminar PO | - |

**PO Status Flow:** draft → sent → confirmed → in_production → shipped → in_transit → customs → delivered

---

### 2.6 Dashboard (`/api/dashboard`)

| Método | Ruta | Propósito | Params |
|--------|------|-----------|--------|
| `GET` | `/api/dashboard` | Datos completos del dashboard | `?locale=es` |

**Response:**
```json
{
  "metrics": {
    "totalRevenue": 125000,
    "revenueDelta": 12.5,
    "totalUnits": 3400,
    "unitsDelta": 8.2,
    "weightedRoi": 34.2,
    "roiDelta": -2.1,
    "avgMargin": 28.5,
    "marginDelta": 1.3
  },
  "topProducts": [...],
  "alerts": [...],
  "charts": {
    "salesChartData": [...],
    "salesChartDataWeekly": [...],
    "categoryChartData": [...],
    "profitChartData": [...]
  }
}
```

---

### 2.7 Research (`/api/research`)

| Método | Ruta | Propósito | Body/Params |
|--------|------|-----------|-------------|
| `GET` | `/api/research` | Lista research items | `?status=&search=` |
| `POST` | `/api/research` | Crear item | `{ name, niche?, status?, ... }` |
| `PUT` | `/api/research` | Actualizar item | `{ id, status?, priority?, ... }` |
| `DELETE` | `/api/research` | Eliminar item | `?id=` |

---

### 2.8 Calculator (`/api/calculator`)

| Método | Ruta | Propósito | Body/Params |
|--------|------|-----------|-------------|
| `POST` | `/api/calculator` | Calcular FBA fees | `{ price, weight, ... }` |
| `POST` | `/api/calculator/save` | Guardar cálculo | `{ name, ...calcData }` |

**Nota:** El cálculo principal es client-side (`lib/calculations.ts`). El endpoint sirve para guardar cálculos y obtener datos de productos.

---

### 2.9 Forecasting (`/api/forecasting`)

| Método | Ruta | Propósito | Params |
|--------|------|-----------|--------|
| `GET` | `/api/forecasting` | Sugerencias de reorden | - |

**Logic:** Calcula velocity, lead time, safety stock → genera sugerencias de reorder

---

### 2.10 PPC/Ads (`/api/ppc-campaigns`)

| Método | Ruta | Propósito | Body/Params |
|--------|------|-----------|-------------|
| `GET` | `/api/ppc-campaigns` | Lista campañas | `?status=&search=` |
| `POST` | `/api/ppc-campaigns` | Crear campaña | `{ campaign_name, campaign_type, ... }` |
| `PUT` | `/api/ppc-campaigns` | Actualizar campaña | `{ status?, daily_budget?, ... }` |
| `DELETE` | `/api/ppc-campaigns` | Eliminar campaña | `?id=` |

---

### 2.11 Finances (`/api/expenses`, `/api/amazon-payouts`)

| Método | Ruta | Propósito | Body/Params |
|--------|------|-----------|-------------|
| `GET` | `/api/expenses` | Lista gastos | `?page=&category=&dateFrom=&dateTo=` |
| `POST` | `/api/expenses` | Crear gasto | `{ category, description, amount, ... }` |
| `PUT` | `/api/expenses` | Actualizar gasto | `{ amount?, description?, ... }` |
| `DELETE` | `/api/expenses` | Eliminar gasto | `?id=` |
| `GET` | `/api/amazon-payouts` | Lista payouts | `?page=&status=` |
| `POST` | `/api/amazon-payouts` | Crear payout | `{ amount, payout_period_start, ... }` |

---

### 2.12 Returns y Reimbursements

| Método | Ruta | Propósito | Body/Params |
|--------|------|-----------|-------------|
| `GET` | `/api/returns` | Lista devoluciones | `?page=&status=` |
| `POST` | `/api/returns` | Crear devolución | `{ product_id, quantity, return_reason, ... }` |
| `PUT` | `/api/returns` | Actualizar devolución | `{ status?, disposition?, ... }` |
| `DELETE` | `/api/returns` | Eliminar devolución | `?id=` |
| `GET` | `/api/reimbursements` | Lista reembolsos | `?page=&status=` |
| `POST` | `/api/reimbursements` | Crear reembolso | `{ product_id, amount, reimbursement_type, ... }` |
| `GET` | `/api/reimbursements/detected` | Lista eventos Amazon detectados | `?page=&perPage=&status=` |
| `POST` | `/api/reimbursements/detected/[id]/link` | Vincular evento a reembolso existente | `{ reimbursement_id }` |
| `POST` | `/api/reimbursements/detected/[id]/dismiss` | Descartar detección | - |

---

### 2.13 Shipments (`/api/fba-shipments`)

| Método | Ruta | Propósito | Body/Params |
|--------|------|-----------|-------------|
| `GET` | `/api/fba-shipments` | Lista envíos | `?page=&status=` |
| `POST` | `/api/fba-shipments` | Crear envío | `{ shipment_name, shipping_method, ... }` |
| `GET` | `/api/fba-shipments/[id]` | Obtener envío | - |
| `PUT` | `/api/fba-shipments/[id]` | Actualizar envío | `{ status?, tracking_number?, ... }` |
| `DELETE` | `/api/fba-shipments/[id]` | Eliminar envío | - |

---

### 2.14 SP-API (`/api/sp-api/`)

| Método | Ruta | Propósito | Body/Params |
|--------|------|-----------|-------------|
| `POST` | `/api/sp-api/auth` | Generar OAuth URL | `{ marketplace }` |
| `GET` | `/api/sp-api/auth/callback` | Callback OAuth | `?code=&state=` |
| `GET` | `/api/sp-api/connections` | Listar conexiones | - |
| `DELETE` | `/api/sp-api/connections/[id]` | Eliminar conexión | - |
| `POST` | `/api/sp-api/sync` | Ejecutar sync | `{ connectionId, syncType }` |
| `POST` | `/api/sp-api/webhooks` | Recibir webhook | (payload de Amazon) |
| `GET` | `/api/sp-api/webhooks/subscribe` | Listar suscripciones | - |
| `POST` | `/api/sp-api/webhooks/subscribe` | Crear suscripción | `{ connectionId, notificationType }` |
| `DELETE` | `/api/sp-api/webhooks/subscribe` | Eliminar suscripción | `?subscriptionId=` |

**Sync Types:** products, orders, inventory, fees, returns, payouts, reimbursements

El sync `payouts` conserva las líneas detalladas en `amazon_settlement_lines` y crea gastos solo para transacciones distintas de `Order` que no sean reembolsos. Los gastos importados usan una clave `source_key` determinista por organización, liquidación y línea para permitir reintentos seguros y evitar duplicados concurrentes; mantienen el importe absoluto y la moneda del reporte.

El sync `reimbursements` conserva los eventos de `GET_FBA_REIMBURSEMENTS_DATA` en `amazon_reimbursement_events`. Amazon reporta reembolsos ya registrados/aprobados; la aplicación los muestra como `Amazon detectado, no registrado` hasta su reconciliación manual. El matching de movimientos usa una ventana de 30 días alrededor de `approval-date` y nunca modifica inventory automáticamente.

---

### 2.15 Google Drive (`/api/drive/`)

| Método | Ruta | Propósito | Body/Params |
|--------|------|-----------|-------------|
| `GET` | `/api/drive/auth` | Iniciar OAuth | - |
| `GET` | `/api/drive/auth/callback` | Callback OAuth | `?code=` |
| `GET` | `/api/drive/list` | Listar archivos | `?folderId=` |
| `GET` | `/api/drive/folders` | Listar carpetas | - |
| `POST` | `/api/drive/upload` | Subir archivo | FormData |
| `GET` | `/api/drive/download/[id]` | Descargar archivo | - |
| `DELETE` | `/api/drive/delete/[id]` | Eliminar archivo | - |
| `POST` | `/api/drive/rename/[id]` | Renombrar archivo | `{ name }` |
| `PUT` | `/api/drive/update/[id]` | Actualizar contenido | `{ content }` |
| `POST` | `/api/drive/backup` | Backup de data | `{ type }` |

---

### 2.16 Governance (`/api/members`, `/api/tasks`, `/api/board-decisions`)

| Método | Ruta | Propósito | Body/Params |
|--------|------|-----------|-------------|
| `GET` | `/api/members` | Lista miembros | - |
| `POST` | `/api/members` | Crear miembro | `{ full_name, email?, ownership_pct?, ... }` |
| `GET` | `/api/members/[id]` | Obtener miembro | - |
| `PUT` | `/api/members/[id]` | Actualizar miembro | `{ full_name?, status?, ... }` |
| `DELETE` | `/api/members/[id]` | Eliminar miembro | - |
| `GET` | `/api/tasks` | Lista tareas | `?status=&module=` |
| `POST` | `/api/tasks` | Crear tarea | `{ title, status?, priority?, ... }` |
| `GET` | `/api/tasks/[id]` | Obtener tarea | - |
| `PUT` | `/api/tasks/[id]` | Actualizar tarea | `{ status?, priority?, ... }` |
| `DELETE` | `/api/tasks/[id]` | Eliminar tarea | - |
| `GET` | `/api/board-decisions` | Lista decisiones | - |
| `POST` | `/api/board-decisions` | Crear decisión | `{ title, status?, ... }` |
| `GET` | `/api/board-decisions/[id]` | Obtener decisión | - |
| `PUT` | `/api/board-decisions/[id]` | Actualizar decisión | `{ status?, voted_by?, ... }` |
| `DELETE` | `/api/board-decisions/[id]` | Eliminar decisión | - |

---

### 2.17 Organizations (`/api/orgs/`)

| Método | Ruta | Propósito | Body/Params |
|--------|------|-----------|-------------|
| `GET` | `/api/orgs` | Listar orgs del usuario | - |
| `POST` | `/api/orgs` | Crear org | `{ name, slug? }` |
| `GET` | `/api/orgs/members` | Miembros de la org | - |
| `POST` | `/api/orgs/members` | Agregar miembro | `{ userId, role }` |
| `PUT` | `/api/orgs/members` | Actualizar rol | `{ memberId, role }` |
| `DELETE` | `/api/orgs/members` | Remover miembro | `?memberId=` |
| `POST` | `/api/orgs/invite` | Enviar invitación | `{ email, role }` |
| `POST` | `/api/orgs/accept` | Aceptar invitación | `{ token }` |

---

### 2.18 Alerts y Automation (`/api/alerts/`, `/api/cron/`)

| Método | Ruta | Propósito | Body/Params |
|--------|------|-----------|-------------|
| `GET` | `/api/alerts/rules` | Reglas de alerta | - |
| `POST` | `/api/alerts/rules` | Crear regla | `{ name, entity, condition_type, threshold, ... }` |
| `PUT` | `/api/alerts/rules` | Actualizar regla | `{ enabled?, threshold?, ... }` |
| `DELETE` | `/api/alerts/rules` | Eliminar regla | `?id=` |
| `GET` | `/api/alerts/history` | Historial de alertas | `?limit=` |
| `GET` | `/api/cron/alerts` | Evaluar reglas (cron) | (autenticado con CRON_SECRET) |
| `GET` | `/api/cron/reports` | Generar reportes (cron) | (autenticado con CRON_SECRET) |
| `GET` | `/api/cron/sync` | Auto-sync SP-API (cron) | (autenticado con CRON_SECRET) |

---

### 2.19 Otras Rutas

| Método | Ruta | Propósito |
|--------|------|-----------|
| `GET` | `/api/settings` | Obtener configuración de usuario |
| `PUT` | `/api/settings` | Actualizar configuración |
| `POST` | `/api/export` | Exportar data a Excel |
| `GET` | `/api/import/template` | Descargar template CSV |
| `POST` | `/api/import` | Importar CSV |
| `GET` | `/api/notifications` | Generar + obtener notificaciones |
| `POST` | `/api/push/subscribe` | Suscribir a push notifications |
| `POST` | `/api/push/unsubscribe` | Desuscribir de push |
| `GET` | `/api/comments` | Obtener comentarios | `?entity=&entity_id=` |
| `POST` | `/api/comments` | Crear comentario | `{ entity, entity_id, content }` |
| `DELETE` | `/api/comments` | Eliminar comentario | `?id=` |
| `GET` | `/api/audit-log` | Obtener audit log | `?entity=&action=` |
| `POST` | `/api/audit-log` | Crear entrada | `{ entity, entity_id, action, changes }` |
| `GET` | `/api/share` | Listar links compartidos | - |
| `POST` | `/api/share` | Crear link | `{ title?, expiresAt? }` |
| `GET` | `/api/share/[token]` | Obtener data de link público | - |
| `GET` | `/api/analytics/comparison` | Comparación de períodos | `?period=&compareWith=` |
| `GET` | `/api/analytics/fees` | Resumen de fees de settlement | `?startDate=&endDate=&marketplace=&productId=&feeType=` |
| `GET` | `/api/forecasting` | Sugerencias de reorden | - |
| `POST` | `/api/automation/weekly-summary` | Resumen semanal | - |
| `POST` | `/api/automation/notifications` | Auto-generar notificaciones | - |
| `POST` | `/api/automation/forecasting` | Auto-forecasting interno: conteos por `x-org-id` | `x-org-id` UUID |
| `GET` | `/api/schedules` | Reportes programados | - |
| `POST` | `/api/schedules` | Crear reporte programado | `{ name, template, frequency, ... }` |
| `PUT` | `/api/schedules` | Actualizar reporte | `{ enabled?, ... }` |
| `DELETE` | `/api/schedules` | Eliminar reporte | `?id=` |
| `GET` | `/api/reorder-rules` | Reglas de reorden | - |
| `POST` | `/api/reorder-rules` | Crear regla | `{ product_id, min_stock, ... }` |
| `PUT` | `/api/reorder-rules` | Actualizar regla | `{ min_stock?, ... }` |
| `DELETE` | `/api/reorder-rules` | Eliminar regla | `?id=` |

---

### 2.20 Analytics de fees

`GET /api/analytics/fees` lee `amazon_settlement_lines` con el `org_id` resuelto por el contexto autenticado. Si no se envían fechas, limita la lectura a los últimos 90 días; si solo se envía una fecha, completa el otro extremo para mantener el rango acotado. Las filas con `posted_at` nulo quedan fuera de los rangos fechados. `amount` conserva su signo de base de datos, por lo que cargos y ajustes negativos se suman algebraicamente.

La respuesta agrupa las mismas líneas en paralelo por moneda: `summary.currency` contiene el código si solo hay una moneda, `mixed` si hay varias y `null` si no hay líneas; en el caso `mixed`, `summary.totalFees` es `null`. `byFeeType` suma por `fee_type` y `currency`, `byDate` suma por `posted_at` y `currency` en formato ISO, y `byProduct` agrupa por `product_id` y `currency`, solo incluye líneas con `product_id` no nulo y conserva el primer `sku` y `asin` disponibles de cada grupo. Las líneas sin fecha o sin producto no se inventan ni se asignan a un grupo artificial; siguen contando en `summary` y, cuando existe, en `byFeeType`. No se devuelve `feePerUnit` porque `amazon_settlement_lines` no contiene unidades.

---

## 3. Autenticación en API Routes

### Flujo completo:

```
1. Rate Limiting (in-memory, 60/min por IP+route)
   ↓
2. createClient() → supabase.auth.getUser()
   ↓ (si no hay user)
3. Return { error: "Unauthorized" }, status: 401
   ↓ (si hay user)
4. Resolver org_id:
   a. Header x-org-id (del frontend)
   b. Lookup en org_members
   c. Auto-crear org si no existe
   ↓
5. Ejecutar handler({ supabase, user, orgId, req })
   ↓ (si hay error)
6. Return { error: "Error interno del servidor" }, status: 500
```

### Excepciones (rutas que NO usan createApiHandler):

| Ruta | Motivo |
|------|--------|
| `/api/push/subscribe` | Usa createClient() directo (diferente pattern) |
| `/api/push/unsubscribe` | Igual |
| `/api/share/[token]` | Ruta pública (no requiere auth) |

---

## 4. Paginación

### Request:

```
GET /api/products?page=2&perPage=20
```

### Response:

```json
{
  "data": [...],
  "pagination": {
    "total": 156,
    "page": 2,
    "perPage": 20,
    "totalPages": 8
  }
}
```

### Implementación (`buildPagination`):

```typescript
// src/lib/api-handler.ts
export function buildPagination(req, defaultPerPage = 20) {
  const page = Math.max(1, parseInt(searchParams.get("page") || "1"));
  const perPage = Math.min(200, Math.max(1, parseInt(searchParams.get("perPage") || "20")));
  const from = (page - 1) * perPage;
  const to = from + perPage - 1;
  return { page, perPage, from, to };
}
```

**Limites:** page mínima 1, perPage máximo 200

---

## 5. Sorting

### Patrón (`parseSort`):

```typescript
// src/lib/sort-parser.ts
const PRODUCTS_SORT_MAP = {
  "name-asc": { column: "name", ascending: true },
  "name-desc": { column: "name", ascending: false },
  "roi-asc": { column: "roi", ascending: true },
  "roi-desc": { column: "roi", ascending: false },
  "price-asc": { column: "sale_price", ascending: true },
  "price-desc": { column: "sale_price", ascending: false },
  // ... más opciones
};

export function parseSort(sort, mapping, defaultSort) {
  return mapping[sort] || defaultSort;
}
```

### Uso en endpoint:

```typescript
const sort = parseSort(searchParams.get("sort"), PRODUCTS_SORT_MAP, { column: "created_at", ascending: false });
const { data } = await supabase.from("products").select("*").order(sort.column, { ascending: sort.ascending });
```

---

## 6. Rate Limiting

### Configuración:

```typescript
// src/lib/rate-limit.ts
rateLimit(identifier, limit = 60, windowMs = 60000)
```

- **Almacenamiento:** In-memory Map con auto-limpieza
- **Key:** IP + route path
- **Default:** 60 requests por 60 segundos
- **Response 429:** `{ error: "Demasiadas solicitudes..." }` + `Retry-After` header
- **Cleanup:** Elimina entradas expiradas cuando Map supera 1000 entries

---

## 7. Manejo de Errores

### Patrón estándar:

```typescript
// En createApiHandler
catch (err) {
  console.error("API Error:", err);  // Log interno (nunca al client)
  return NextResponse.json(
    { error: "Error interno del servidor" },  // Mensaje genérico
    { status: 500 }
  );
}
```

### Errores de validación:

```typescript
const parsed = productSchema.safeParse(body);
if (!parsed.success) {
  return NextResponse.json(
    { error: parsed.error.errors[0].message },  // Primer error de Zod
    { status: 400 }
  );
}
```

### Errores de negocio:

```typescript
// Verificar existencia
const { data: product } = await supabase.from("products").select("id").eq("id", productId).single();
if (!product) {
  return NextResponse.json({ error: "Producto no encontrado" }, { status: 404 });
}
```

---

## 8. Patrones Especiales

### Server Actions (alternativa a API routes):

```typescript
// src/lib/actions/products.ts
"use server";
export async function createProduct(data: ProductFormData) {
  const supabase = await createClient();
  const { data: product, error } = await supabase
    .from("products")
    .insert(data)
    .select()
    .single();
  if (error) throw new Error(error.message);
  return product;
}
```

**Uso:** Algunas páginas usan server actions en vez de fetch a API routes (products, sales, suppliers, orders, members, tasks, decisions).

### Cron Jobs:

```typescript
// verifican CRON_SECRET o AUTOMATION_SECRET
const authHeader = req.headers.get("authorization");
if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
  return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
}
```

### Export (POST):

```typescript
// src/app/api/export/route.ts
// Recibe: { data: any[], columns: { key, label }[], filename: string }
// Retorna: Archivo Excel como blob
```

### Import (POST):

```typescript
// src/app/api/import/route.ts
// Recibe: FormData con archivo CSV
// Procesa: Parse → Validate → Batch insert
// Retorna: { imported: number, errors: string[] }
```

---

## Archivos Relacionados

| Tema | Ver |
|------|-----|
| Arquitectura general | `ARCHITECTURE.md` |
| Tablas que consultan estos endpoints | `DATABASE.md` |
| Lógica de negocio | `MODULES.md` |
| Convenciones de código | `CONVENTIONS.md` |
