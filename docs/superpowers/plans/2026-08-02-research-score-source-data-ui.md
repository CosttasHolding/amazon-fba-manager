# Research: score enriquecido + source_data en cards kanban — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Calcular y persistir un score enriquecido al capturar productos con la extensión, y mostrarlo junto a BSR/ventas/revenue/margen/listing health en las cards del kanban de research.

**Architecture:** El `POST /api/research/capture` calcula `calculateScore()` (función pura existente) con el source_data completo y guarda `score` en una columna nueva + `score_details` en el JSONB. El GET `/api/research` ya trae `*` (source_data + score incluidos), así que el frontend solo agrega un bloque de badges en la card kanban. Sin cambios de API ni de DB más allá de la columna.

**Tech Stack:** Next.js 14 (App Router), Supabase, Zod, React 18, Vitest, i18n flat-keys (es/en/ar).

## Global Constraints

- TypeScript strict — nunca `any`; `Record<string, unknown>` para JSONB.
- CSS variables — siempre `bg-background`, nunca `bg-white`.
- `calculateScore` y `scoring.ts` NO se modifican (solo se consume).
- Sin comentarios en el código a menos que se pidan.
- Zod para validación de entrada.
- sonner para toast, nunca alerts nativos.
- Commits solo tras verificar `npx tsc --noEmit`, `npm run lint`, `npm run test:run`, `npm run build`.

---

### Task 1: Migración columna `score` + tipo `ProductResearch`

**Files:**
- Create: `supabase/migrations/030_add_score.sql`
- Modify: `src/types/index.ts:405`

**Interfaces:**
- Produces: columna `product_research.score INTEGER`; campo `score?: number | null` en `ProductResearch`.

- [ ] **Step 1: Crear la migración**

`supabase/migrations/030_add_score.sql`:
```sql
ALTER TABLE product_research ADD COLUMN score INTEGER;
```

- [ ] **Step 2: Agregar el campo al tipo**

En `src/types/index.ts`, dentro de `interface ProductResearch`, junto a `source_data` (línea 405):
```ts
  score?: number | null;
```

- [ ] **Step 3: Verificar**

Run: `npx tsc --noEmit`
Expected: 0 errores.

- [ ] **Step 4: Commit**

```bash
git add supabase/migrations/030_add_score.sql src/types/index.ts
git commit -m "feat(research): columna score en product_research + campo en tipo ProductResearch"
```

---

### Task 2: Capture route — calcular y persistir el score

**Files:**
- Modify: `src/app/api/research/capture/route.ts`
- Test: `src/app/api/research/capture/route.test.ts`

**Interfaces:**
- Consumes: `calculateScore` y `ScoringInput` de `src/lib/research/scoring.ts` / `src/lib/research/types.ts`.
- Produces: los records insertados/actualizados incluyen `score: number | null` y `source_data.score_details`.

- [ ] **Step 1: Importar el scoring**

En `src/app/api/research/capture/route.ts`, agregar al inicio:
```ts
import { calculateScore } from "@/lib/research/scoring";
import type { ScoringInput } from "@/lib/research/types";
```

- [ ] **Step 2: Escribir el test (RED)**

En `src/app/api/research/capture/route.test.ts`, agregar este test antes del cierre del `describe`:

```ts
it("calcula y guarda el score enriquecido con source_data completo", async () => {
  mockGetUser.mockResolvedValue({ data: { user: { id: "user-1" } }, error: null });
  setupDbMocks({ resultData: [{ id: "new-id", name: "Test Product" }] });

  const req = createMockRequest("http://localhost/api/research/capture", {
    method: "POST",
    body: JSON.stringify(validPayload),
  });
  const res = await POST(req as never);
  expect(res.status).toBe(201);
  const inserted = mockInsert.mock.calls[0][0];
  expect(inserted.score).toBeGreaterThan(0);
  expect(inserted.source_data.score_details).toBeDefined();
  expect(inserted.source_data.score_details.demanda).toBeDefined();
  expect(inserted.source_data.score_details.rentabilidad).toBeDefined();
});

it("guarda score null cuando no hay datos del producto", async () => {
  mockGetUser.mockResolvedValue({ data: { user: { id: "user-1" } }, error: null });
  setupDbMocks({ resultData: [{ id: "new-id", name: "Sin datos" }] });

  const req = createMockRequest("http://localhost/api/research/capture", {
    method: "POST",
    body: JSON.stringify({ products: [{ asin: "B0EMPTY123", title: "Sin datos" }], mode: "scraper" }),
  });
  const res = await POST(req as never);
  expect(res.status).toBe(201);
  const inserted = mockInsert.mock.calls[0][0];
  expect(inserted.score).toBeNull();
});

it("refresca el score al actualizar un ASIN existente", async () => {
  mockGetUser.mockResolvedValue({ data: { user: { id: "user-1" } }, error: null });
  setupDbMocks({ existing: { id: "existing-id" }, resultData: [{ id: "existing-id", name: "Test Product" }] });

  const req = createMockRequest("http://localhost/api/research/capture", {
    method: "POST",
    body: JSON.stringify(validPayload),
  });
  const res = await POST(req as never);
  expect(res.status).toBe(201);
  const updated = mockUpdate.mock.calls[0][0];
  expect(updated.score).toBeGreaterThan(0);
  expect(updated.source_data.score_details).toBeDefined();
});
```

- [ ] **Step 3: Correr tests para ver que fallan**

Run: `npx vitest run src/app/api/research/capture/route.test.ts`
Expected: FAIL — `inserted.score` es `undefined` (el route no lo calcula todavía).

- [ ] **Step 4: Implementar el cálculo en el route**

Reemplazar el bloque `const records = products.map(...)` (líneas 57-78) por:

```ts
function toScoringInput(p: z.infer<typeof capturedProductSchema>): ScoringInput {
  return {
    estimated_monthly_sales: p.estimated_monthly_sales ?? null,
    estimated_monthly_revenue: p.estimated_monthly_revenue ?? null,
    bsr: p.bsr ?? null,
    review_count: p.review_count ?? null,
    average_rating: p.average_rating ?? null,
    seller_count_fba: p.seller_count_fba ?? null,
    price: p.price ?? null,
    estimated_fba_fee: p.estimated_fba_fee ?? null,
    estimated_cogs: null,
  };
}

const records = products.map((p) => {
  const input = toScoringInput(p);
  const hasData =
    input.estimated_monthly_sales !== null ||
    input.estimated_monthly_revenue !== null ||
    input.bsr !== null ||
    input.review_count !== null ||
    input.average_rating !== null ||
    input.seller_count_fba !== null ||
    input.price !== null ||
    input.estimated_fba_fee !== null;
  const scoring = calculateScore(input);

  return {
    user_id: user.id,
    org_id: orgId,
    name: p.title || "Unknown",
    asin_reference: p.asin,
    amazon_category: p.category ?? "",
    estimated_monthly_sales: p.estimated_monthly_sales ?? null,
    average_price: p.price ?? null,
    review_count_competitor: p.review_count ?? null,
    average_rating: p.average_rating ?? null,
    bsr: p.bsr ?? null,
    score: hasData ? scoring.total : null,
    source: "capture",
    status: "idea",
    priority: 3,
    source_data: {
      ...p,
      capture_mode: mode,
      page_type,
      search_keyword,
      captured_at: p.capture_timestamp,
      score_details: hasData ? scoring.dimensions : undefined,
    },
  };
});
```

- [ ] **Step 5: Correr tests para ver que pasan**

Run: `npx vitest run src/app/api/research/capture/route.test.ts`
Expected: PASS (los 6 tests existentes + 3 nuevos).

- [ ] **Step 6: Verificación completa + commit**

Run: `npx tsc --noEmit; npm run lint; npm run test:run; npm run build`
Expected: tsc 0 errores; lint solo warnings pre-existentes; tests 250/250; build OK.

```bash
git add src/app/api/research/capture/route.ts src/app/api/research/capture/route.test.ts
git commit -m "feat(research): calcular y persistir score enriquecido al capturar productos"
```

---

### Task 3: Keys i18n para los badges de la card

**Files:**
- Modify: `src/lib/i18n/es.json`, `src/lib/i18n/en.json`, `src/lib/i18n/ar.json`

**Interfaces:**
- Produces: claves `research.card.*` consumidas por `t("research.card." + key, locale)`.

- [ ] **Step 1: Agregar las claves en es.json**

Insertar antes de `"research.empty_action"` (línea ~1129), en orden alfabético dentro del bloque `research.`:

```json
  "research.card.bsr": "BSR",
  "research.card.health": "Health",
  "research.card.margin": "Margen",
  "research.card.revenue_month": "/m",
  "research.card.sales_month": "ventas/m",
  "research.card.score": "Score",
```

- [ ] **Step 2: Agregar las claves en en.json**

Insertar las mismas claves antes de `"research.empty_action"` en `en.json`:

```json
  "research.card.bsr": "BSR",
  "research.card.health": "Health",
  "research.card.margin": "Margin",
  "research.card.revenue_month": "/mo",
  "research.card.sales_month": "sales/mo",
  "research.card.score": "Score",
```

- [ ] **Step 3: Agregar las claves en ar.json**

Insertar las mismas claves antes de `"research.empty_action"` en `ar.json`:

```json
  "research.card.bsr": "BSR",
  "research.card.health": "Health",
  "research.card.margin": "الهامش",
  "research.card.revenue_month": "/شهريا",
  "research.card.sales_month": "مبيعات/شهريا",
  "research.card.score": "النتيجة",
```

- [ ] **Step 4: Verificar**

Run: `node -e "const es=require('./src/lib/i18n/es.json');const en=require('./src/lib/i18n/en.json');const ar=require('./src/lib/i18n/ar.json');const ks=['bsr','health','margin','revenue_month','sales_month','score'];ks.forEach(k=>{const key='research.card.'+k;if(!(key in es)||!(key in en)||!(key in ar))throw new Error('falta '+key)});console.log('OK')"`
Expected: `OK`.

- [ ] **Step 5: Commit**

```bash
git add src/lib/i18n/es.json src/lib/i18n/en.json src/lib/i18n/ar.json
git commit -m "feat(research): keys i18n research.card.* para badges de cards"
```

---

### Task 4: Cards kanban — bloque de badges con score + source_data

**Files:**
- Modify: `src/app/(dashboard)/research/page.tsx` (card kanban, líneas ~350-393)
- Test: `src/lib/research/card-data.test.ts` (NUEVO — helpers puros extraídos)

**Interfaces:**
- Consumes: `ProductResearch.score`, `ProductResearch.source_data`; claves `research.card.*`.
- Produces: helpers `numField(sd, key)` y `fmtCompact(n, locale)` en `src/lib/research/card-data.ts`.

- [ ] **Step 1: Escribir el test de los helpers (RED)**

Crear `src/lib/research/card-data.ts`:

```ts
export type SourceData = Record<string, unknown> | null | undefined;

export function numField(sd: SourceData, key: string): number | null {
  const raw = sd?.[key];
  if (typeof raw === "number") return raw;
  if (typeof raw === "string" && raw.trim() !== "" && !Number.isNaN(Number(raw))) return Number(raw);
  return null;
}

export function fmtCompact(n: number, locale: string): string {
  return new Intl.NumberFormat(locale, { notation: "compact", maximumFractionDigits: 1 }).format(n);
}
```

Crear `src/lib/research/card-data.test.ts`:

```ts
import { describe, it, expect } from "vitest";
import { numField, fmtCompact } from "@/lib/research/card-data";

describe("numField", () => {
  it("lee números", () => {
    expect(numField({ bsr: 52 }, "bsr")).toBe(52);
  });

  it("lee strings numéricos", () => {
    expect(numField({ net_margin_percent: "80" }, "net_margin_percent")).toBe(80);
  });

  it("devuelve null si el campo falta o es inválido", () => {
    expect(numField({}, "bsr")).toBeNull();
    expect(numField(null, "bsr")).toBeNull();
    expect(numField({ bsr: "N/A" }, "bsr")).toBeNull();
  });
});

describe("fmtCompact", () => {
  it("formatea números grandes con sufijo", () => {
    expect(fmtCompact(1200, "en-US")).toBe("1.2K");
    expect(fmtCompact(91992, "en-US")).toBe("91.9K");
  });

  it("no inventa sufijo para números chicos", () => {
    expect(fmtCompact(50, "en-US")).toBe("50");
  });
});
```

- [ ] **Step 2: Correr tests para ver que fallan**

Run: `npx vitest run src/lib/research/card-data.test.ts`
Expected: FAIL — el módulo `card-data.ts` no existe todavía.

- [ ] **Step 3: Crear el módulo (los archivos ya quedaron escritos en Step 1)**

Verifica que `src/lib/research/card-data.ts` tenga exactamente el contenido del Step 1 y que el test lo importe. Correr de nuevo:

Run: `npx vitest run src/lib/research/card-data.test.ts`
Expected: PASS (7 tests).

- [ ] **Step 4: Usar los helpers en la card kanban**

En `src/app/(dashboard)/research/page.tsx`:
1. Importar los helpers al inicio:
```ts
import { numField, fmtCompact } from "@/lib/research/card-data";
```
2. Agregar una función de score color (junto a las otras constantes, después de `PRIORITY_COLORS`):
```ts
function scoreBadgeClass(score: number): string {
  if (score >= 70) return "text-emerald-500 bg-emerald-500/10 border-emerald-500/20";
  if (score >= 40) return "text-amber-500 bg-amber-500/10 border-amber-500/20";
  return "text-rose-500 bg-rose-500/10 border-rose-500/20";
}
```
3. Agregar una función helper `sourceBadges(item)` después de `scoreBadgeClass`:
```ts
function sourceBadges(item: ProductResearch, locale: string) {
  const sd = item.source_data as Record<string, unknown> | null | undefined;
  const bsr = item.bsr ?? numField(sd, "bsr");
  const sales = numField(sd, "estimated_monthly_sales");
  const revenue = numField(sd, "estimated_monthly_revenue");
  const margin = numField(sd, "net_margin_percent");
  const health = numField(sd, "listing_health_score");

  const badges: { text: string; className: string }[] = [];
  if (bsr !== null && bsr > 0) {
    badges.push({ text: `${t("research.card.bsr", locale)} #${bsr}`, className: "text-primary bg-primary/10" });
  }
  if (sales !== null && sales > 0) {
    badges.push({ text: `~${fmtCompact(sales, locale)} ${t("research.card.sales_month", locale)}`, className: "text-violet-500 bg-violet-500/10" });
  }
  if (revenue !== null && revenue > 0) {
    badges.push({ text: `$${fmtCompact(revenue, locale)}${t("research.card.revenue_month", locale)}`, className: "text-cyan-500 bg-cyan-500/10" });
  }
  if (margin !== null) {
    badges.push({ text: `${t("research.card.margin", locale)} ${margin}%`, className: "text-emerald-500 bg-emerald-500/10" });
  }
  if (health !== null) {
    badges.push({ text: `${t("research.card.health", locale)} ${health}`, className: "text-sky-500 bg-sky-500/10" });
  }
  return badges;
}
```

4. En la card kanban, dentro del `div` de badges existente (líneas ~357-373), después del bloque de `competition_level`, agregar:

```tsx
{item.score !== null && (
  <span className={cn("inline-flex items-center gap-1 text-[10px] px-1.5 py-0.5 rounded border", scoreBadgeClass(item.score))}>
    <BarChart3 className="h-2.5 w-2.5" /> {t("research.card.score", locale)} {item.score}
  </span>
)}
{sourceBadges(item, locale).map((b) => (
  <span key={b.text} className={cn("inline-flex items-center gap-1 text-[10px] px-1.5 py-0.5 rounded", b.className)}>
    {b.text}
  </span>
))}
```

5. Importar el icono `BarChart3` en el import de lucide-react (líneas 8-20).

- [ ] **Step 5: Verificar tipos y lint**

Run: `npx tsc --noEmit; npm run lint`
Expected: tsc 0 errores; lint solo warnings pre-existentes (el warning `useEffect` de `fetchItems` en línea 125 es pre-existente).

- [ ] **Step 6: Verificación completa + commit**

Run: `npm run test:run; npm run build`
Expected: tests 257/257 (250 + 7 helpers); build OK.

```bash
git add src/lib/research/card-data.ts src/lib/research/card-data.test.ts "src/app/(dashboard)/research/page.tsx"
git commit -m "feat(research): badges de score + source_data (BSR/ventas/revenue/margen/health) en cards kanban"
```

---

## Self-Review

**Spec coverage:**
- Migración columna score → Task 1 ✓
- Tipo ProductResearch.score → Task 1 ✓
- Capture route calcula calculateScore con source_data completo → Task 2 ✓
- UPDATE existente refresca score → Task 2 (test dedicado) ✓
- score_details en source_data → Task 2 ✓
- Cards kanban: score, BSR, ventas/m, revenue/m, margen, listing health → Task 4 ✓
- BSR de columna con fallback a source_data → Task 4 (sourceBadges) ✓
- i18n research.card.* → Task 3 ✓
- Fuera de scope respetado (no deep-dive-panel, no lista, no modal, no niche_score, no sort) ✓

**Placeholder scan:** sin TBD/TODO; cada paso tiene código o comando exacto.

**Type consistency:** `numField`/`fmtCompact`/`sourceBadges`/`scoreBadgeClass` definidos en Task 4 y usados en el mismo; `calculateScore`/`ScoringInput` vienen de archivos existentes (no renombrados); `score_details` siempre bajo `source_data`.
