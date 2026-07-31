# Motor de Investigación de Productos — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Chrome Extension descargable desde la web que captura datos de Amazon (H10 Xray + scraper) y los envía a un scoring engine + deep dive GPT-4o en la web app.

**Architecture:** Chrome Extension en `src/chrome-extension/` con build independiente (Vite). Web app en Next.js 14 App Router con Supabase + OpenAI GPT-4o. Scoring engine puro en TypeScript.

**Tech Stack:** Next.js 14 App Router, Supabase, OpenAI GPT-4o, Zod, Chrome Extension (Manifest V3), Vitest, TypeScript strict

## Global Constraints

- TypeScript strict: no `any`
- CSS variables: `bg-background`, never `bg-white`
- snake_case en DB, camelCase en frontend
- Zod para validación, sonner para toasts
- `calculations.ts` es inmutable
- Sin comentarios en código
- Tests con Vitest, mockear `@/lib/supabase/server` y `@/lib/ai/client`

---

## File Structure

### New Files

| File | Responsibility |
|------|---------------|
| `src/lib/research/types.ts` | CapturedProduct, ScoringResult, DeepDiveResult types |
| `src/lib/research/scoring.ts` | Scoring engine (demanda 35%, competencia 30%, rentabilidad 25%, oportunidad 10%) |
| `src/lib/research/scoring.test.ts` | Tests del scoring engine |
| `src/lib/research/analyzer.ts` | Deep dive analysis with GPT-4o (reviews, sentimiento, diferenciación, market fit) |
| `src/app/api/research/capture/route.ts` | POST endpoint para recibir datos de la extension |
| `src/app/api/research/capture/route.test.ts` | Tests del endpoint capture |
| `src/app/api/research/scoring/route.ts` | POST endpoint para calcular scoring de productos |
| `src/app/api/research/scoring/route.test.ts` | Tests del endpoint scoring |
| `src/app/api/research/analyze-deep/route.ts` | POST endpoint para deep dive con GPT-4o |
| `src/app/api/research/analyze-deep/route.test.ts` | Tests del deep dive endpoint |
| `src/components/research/deep-dive-panel.tsx` | Panel de deep dive con scoring visual + análisis IA |
| `src/chrome-extension/manifest.json` | Chrome Extension Manifest V3 |
| `src/chrome-extension/popup/popup.html` | Popup HTML |
| `src/chrome-extension/popup/popup.css` | Popup styles |
| `src/chrome-extension/popup/popup.ts` | Popup logic (review, edit, send) |
| `src/chrome-extension/content/content.ts` | Content script entry |
| `src/chrome-extension/content/scraper.ts` | Modo scraper directo |
| `src/chrome-extension/content/h10-reader.ts` | Modo H10 (lee overlay de Xray del DOM) |
| `src/chrome-extension/utils/api.ts` | Enviar datos a `/api/research/capture` |
| `src/chrome-extension/utils/detect-h10.ts` | Detecta si H10 Xray está visible en DOM |
| `src/scripts/build-extension.ts` | Build script que empaqueta la extension como .zip |

### Modified Files

| File | Change |
|------|--------|
| `package.json` | Agregar scripts para build de extension |
| `src/types/index.ts` | Agregar `source_data` a `ProductResearch` |
| `src/app/(dashboard)/research/page.tsx` | Agregar sección de descarga + tabla de resultados + deep dive |

---

### Task 1: Crear tipos del Research Engine

**Files:**
- Modify: `src/types/index.ts`
- Create: `src/lib/research/types.ts`

- [ ] **Step 1: Agregar `source_data` a ProductResearch en src/types/index.ts**

```ts
export interface ProductResearch {
  // ... (existing fields remain unchanged)
  source_data?: Record<string, unknown> | null; // ← agregar después de source
}
```

- [ ] **Step 2: Crear src/lib/research/types.ts**

```ts
export interface CapturedProduct {
  asin: string;
  title: string;
  price: number | null;
  currency: string;
  bsr: number | null;
  review_count: number | null;
  average_rating: number | null;
  estimated_monthly_sales: number | null;
  estimated_monthly_revenue: number | null;
  estimated_fba_fee: number | null;
  seller_count_fba: number | null;
  seller_count_fbm: number | null;
  category: string | null;
  brand: string | null;
  image_url: string | null;
  source: "h10_xray" | "scraper" | "manual";
  capture_url: string;
  capture_timestamp: string;
}

export interface CapturePayload {
  products: CapturedProduct[];
  mode: "h10" | "scraper";
  page_type: "search" | "product" | "unknown";
  search_keyword?: string;
}

export interface ScoringInput {
  estimated_monthly_sales: number | null;
  estimated_monthly_revenue: number | null;
  bsr: number | null;
  review_count: number | null;
  average_rating: number | null;
  seller_count_fba: number | null;
  price: number | null;
  estimated_fba_fee: number | null;
  estimated_cogs: number | null;
}

export interface DimensionScore {
  score: number;
  label: string;
  weight: number;
  details?: string;
}

export interface ScoringResult {
  total: number;
  dimensions: {
    demanda: DimensionScore;
    competencia: DimensionScore;
    rentabilidad: DimensionScore;
    oportunidad: DimensionScore;
  };
}

export interface DeepDiveResult {
  asin: string;
  analysis: {
    summary: string;
    pain_points: string[];
    differentiation_opportunities: string[];
    market_fit: "high" | "medium" | "low";
    market_fit_reason: string;
    risk_factors: string[];
    recommended_actions: string[];
    estimated_difficulty: "easy" | "moderate" | "hard";
  };
}
```

- [ ] **Step 3: Commit**

```bash
git add src/types/index.ts src/lib/research/types.ts
git commit -m "feat(research): add source_data to ProductResearch and research engine types"
```

---

### Task 2: Crear scoring engine

**Files:**
- Create: `src/lib/research/scoring.ts`
- Create: `src/lib/research/scoring.test.ts`

- [ ] **Step 1: Write failing scoring.test.ts**

```ts
import { describe, it, expect } from "vitest";
import { calculateScore } from "./scoring";
import type { ScoringInput } from "./types";

describe("calculateScore", () => {
  it("devuelve score 0 si no hay datos", () => {
    const input: ScoringInput = {};
    const result = calculateScore(input);
    expect(result.total).toBe(0);
    expect(result.dimensions.demanda.score).toBe(0);
    expect(result.dimensions.competencia.score).toBe(0);
    expect(result.dimensions.rentabilidad.score).toBe(0);
    expect(result.dimensions.oportunidad.score).toBe(0);
  });

  it("producto con alta demanda y baja competencia da score alto", () => {
    const input: ScoringInput = {
      estimated_monthly_sales: 5000,
      estimated_monthly_revenue: 150000,
      bsr: 500,
      review_count: 50,
      average_rating: 4.5,
      seller_count_fba: 1,
      price: 29.99,
      estimated_fba_fee: 8.5,
      estimated_cogs: 8,
    };
    const result = calculateScore(input);
    expect(result.total).toBeGreaterThan(70);
    expect(result.dimensions.demanda.score).toBeGreaterThan(80);
    expect(result.dimensions.competencia.score).toBeGreaterThan(70);
  });

  it("producto con baja demanda y alta competencia da score bajo", () => {
    const input: ScoringInput = {
      estimated_monthly_sales: 100,
      estimated_monthly_revenue: 1500,
      bsr: 50000,
      review_count: 5000,
      average_rating: 3.0,
      seller_count_fba: 20,
      price: 9.99,
      estimated_fba_fee: 5,
      estimated_cogs: 5,
    };
    const result = calculateScore(input);
    expect(result.total).toBeLessThan(40);
  });

  it("demanda alta da score > 80 en demanda", () => {
    const result = calculateScore({ estimated_monthly_sales: 10000 });
    expect(result.dimensions.demanda.score).toBeGreaterThan(80);
  });

  it("muchos sellers FBA dan score bajo en competencia", () => {
    const result = calculateScore({ seller_count_fba: 30 });
    expect(result.dimensions.competencia.score).toBeLessThan(30);
  });

  it("margen alto da score alto en rentabilidad", () => {
    const result = calculateScore({ price: 50, estimated_fba_fee: 5, estimated_cogs: 10 });
    expect(result.dimensions.rentabilidad.score).toBeGreaterThan(80);
  });
});
```

- [ ] **Step 2: Run test (should fail)**

```bash
npx vitest run src/lib/research/scoring.test.ts
```

Expected: FAIL — module not found

- [ ] **Step 3: Create scoring.ts**

```ts
import type { ScoringInput, ScoringResult, DimensionScore } from "./types";

function safeNum(v: number | null | undefined): number {
  return v ?? 0;
}

function clamp(value: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, value));
}

function demandaScore(input: ScoringInput): DimensionScore {
  const sales = safeNum(input.estimated_monthly_sales);
  const revenue = safeNum(input.estimated_monthly_revenue);
  const bsr = safeNum(input.bsr);

  let s = 0;
  if (sales > 0) {
    s += clamp((Math.log2(sales) / 14) * 60, 0, 60);
  }
  if (revenue > 0) {
    s += clamp((Math.log2(revenue) / 18) * 20, 0, 20);
  }
  if (bsr > 0) {
    const bsrScore = clamp((1 - Math.log2(bsr) / 17) * 20, 0, 20);
    s += bsrScore;
  }

  return {
    score: Math.round(clamp(s, 0, 100)),
    label: "Demanda",
    weight: 0.35,
    details: sales > 0 ? `${sales.toLocaleString()} ventas/mes` : "Sin datos",
  };
}

function competenciaScore(input: ScoringInput): DimensionScore {
  const sellers = safeNum(input.seller_count_fba);
  const reviews = safeNum(input.review_count);
  const rating = safeNum(input.average_rating);

  let s = 100;
  if (sellers > 0) {
    s -= clamp(sellers * 3, 0, 50);
  }
  if (reviews > 0) {
    s -= clamp(Math.log2(reviews + 1) * 5, 0, 30);
  }
  if (rating > 0) {
    s -= clamp((5 - rating) * 5, 0, 20);
  }

  return {
    score: Math.round(clamp(s, 0, 100)),
    label: "Competencia",
    weight: 0.3,
    details: sellers > 0 ? `${sellers} sellers FBA` : "Sin datos",
  };
}

function rentabilidadScore(input: ScoringInput): DimensionScore {
  const price = safeNum(input.price);
  const fees = safeNum(input.estimated_fba_fee);
  const cogs = safeNum(input.estimated_cogs);

  if (price <= 0) return { score: 0, label: "Rentabilidad", weight: 0.25, details: "Sin precio" };

  const totalCost = fees + cogs;
  const margin = totalCost > 0 ? ((price - totalCost) / price) * 100 : 50;
  let s = clamp(margin * 1.5, 0, 100);

  return {
    score: Math.round(s),
    label: "Rentabilidad",
    weight: 0.25,
    details: margin > 0 ? `Margen ${Math.round(margin)}%` : "Margen negativo",
  };
}

function oportunidadScore(input: ScoringInput): DimensionScore {
  const bsr = safeNum(input.bsr);
  const reviews = safeNum(input.review_count);
  const rating = safeNum(input.average_rating);

  let s = 0;
  if (bsr > 0 && reviews >= 0) {
    const bsrFactor = clamp((1 - Math.log2(bsr) / 17) * 50, 0, 50);
    const reviewFactor = reviews < 100 ? 30 : reviews < 500 ? 20 : reviews < 2000 ? 10 : 0;
    const ratingGap = rating > 0 && rating < 4.0 ? 20 : 0;
    s = bsrFactor + reviewFactor + ratingGap;
  }

  return {
    score: Math.round(clamp(s, 0, 100)),
    label: "Oportunidad",
    weight: 0.1,
    details: bsr > 0 ? `BSR #${bsr}` : "Sin BSR",
  };
}

export function calculateScore(input: ScoringInput): ScoringResult {
  const demanda = demandaScore(input);
  const competencia = competenciaScore(input);
  const rentabilidad = rentabilidadScore(input);
  const oportunidad = oportunidadScore(input);

  const total = Math.round(
    demanda.score * demanda.weight +
    competencia.score * competencia.weight +
    rentabilidad.score * rentabilidad.weight +
    oportunidad.score * oportunidad.weight
  );

  return {
    total: clamp(total, 0, 100),
    dimensions: { demanda, competencia, rentabilidad, oportunidad },
  };
}
```

- [ ] **Step 4: Run test (should pass)**

```bash
npx vitest run src/lib/research/scoring.test.ts
```

Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add src/lib/research/scoring.ts src/lib/research/scoring.test.ts
git commit -m "feat(research): add scoring engine with 4 dimensions"
```

---

### Task 3: Crear analyzer (GPT-4o deep dive)

**Files:**
- Create: `src/lib/research/analyzer.ts`

- [ ] **Step 1: Create analyzer.ts**

```ts
import type { DeepDiveResult } from "./types";
import { getOpenAI } from "@/lib/ai/client";

interface DeepDiveInput {
  asin: string;
  title: string;
  price: number | null;
  bsr: number | null;
  review_count: number | null;
  average_rating: number | null;
  estimated_monthly_sales: number | null;
  category: string | null;
  brand: string | null;
}

function buildDeepDivePrompt(input: DeepDiveInput): string {
  return `Analizá este producto de Amazon para determinar si es un buen producto para vender como negocio FBA (Fulfillment by Amazon).

Producto: ${input.title}
ASIN: ${input.asin}
Precio: ${input.price ? `$${input.price}` : "N/A"}
BSR: ${input.bsr ? `#${input.bsr}` : "N/A"}
Reviews: ${input.review_count ?? "N/A"} (Rating: ${input.average_rating ?? "N/A"})
Ventas estimadas/mes: ${input.estimated_monthly_sales?.toLocaleString() ?? "N/A"}
Categoría: ${input.category ?? "N/A"}
Marca: ${input.brand ?? "N/A"}

Respondé en formato JSON con esta estructura exacta (sin markdown, solo JSON):
{
  "summary": "resumen de una línea del potencial del producto",
  "pain_points": ["array de dolores comunes que mencionan los reviews"],
  "differentiation_opportunities": ["oportunidades de diferenciación"],
  "market_fit": "high|medium|low",
  "market_fit_reason": "por qué encaja en el mercado",
  "risk_factors": ["factores de riesgo"],
  "recommended_actions": ["acciones recomendadas"],
  "estimated_difficulty": "easy|moderate|hard"
}

Enfocate en datos, no generalidades. Si no hay datos suficientes, sé conservador.`;
}

export async function analyzeProductDeep(input: DeepDiveInput): Promise<DeepDiveResult> {
  const prompt = buildDeepDivePrompt(input);

  const completion = await getOpenAI().chat.completions.create({
    model: "gpt-4o",
    messages: [{ role: "user", content: prompt }],
    temperature: 0.3,
    response_format: { type: "json_object" },
  });

  const content = completion.choices[0]?.message?.content;
  if (!content) {
    throw new Error("GPT-4o no devolvió contenido");
  }

  const parsed = JSON.parse(content) as DeepDiveResult["analysis"];

  return {
    asin: input.asin,
    analysis: parsed,
  };
}
```

- [ ] **Step 2: Commit**

```bash
git add src/lib/research/analyzer.ts
git commit -m "feat(research): add GPT-4o deep dive analyzer"
```

---

### Task 4: Crear capture endpoint

**Files:**
- Create: `src/app/api/research/capture/route.ts`
- Create: `src/app/api/research/capture/route.test.ts`

- [ ] **Step 1: Write failing route.test.ts**

```ts
import { describe, it, expect, vi, beforeEach } from "vitest";
import { POST } from "@/app/api/research/capture/route";
import { createMockRequest } from "@/lib/test-utils/mock-request";

const mockInsert = vi.fn();
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

function buildInsertQuery(data: unknown) {
  return {
    insert: mockInsert.mockReturnThis(),
    select: mockSelect.mockResolvedValue({ data, error: null }),
  };
}

describe("POST /api/research/capture", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("devuelve 401 sin autenticación", async () => {
    mockGetUser.mockResolvedValue({ data: { user: null }, error: { message: "No auth" } });

    const req = createMockRequest("http://localhost/api/research/capture", {
      method: "POST",
      body: JSON.stringify({ products: [], mode: "scraper", page_type: "search" }),
    });
    const res = await POST(req);
    expect(res.status).toBe(401);
  });

  it("guarda productos correctamente", async () => {
    mockGetUser.mockResolvedValue({ data: { user: { id: "user-1" } }, error: null });
    mockFrom.mockReturnValue(buildInsertQuery([{ id: "new-id", name: "Test Product" }]));

    const payload = {
      products: [{
        asin: "B0TEST1234",
        title: "Test Product",
        price: 29.99,
        currency: "USD",
        bsr: 1234,
        review_count: 567,
        average_rating: 4.2,
        estimated_monthly_sales: 1200,
        estimated_monthly_revenue: 35988,
        estimated_fba_fee: 8.5,
        seller_count_fba: 3,
        seller_count_fbm: 2,
        category: "Sports & Fitness",
        brand: "TestBrand",
        image_url: null,
        source: "scraper",
        capture_url: "https://amazon.com/dp/B0TEST1234",
        capture_timestamp: new Date().toISOString(),
      }],
      mode: "scraper",
      page_type: "search",
      search_keyword: "yoga mat",
    };

    const req = createMockRequest("http://localhost/api/research/capture", {
      method: "POST",
      body: JSON.stringify(payload),
    });
    const res = await POST(req);
    expect(res.status).toBe(201);
    expect(mockInsert).toHaveBeenCalled();
  });

  it("valida que products sea array", async () => {
    mockGetUser.mockResolvedValue({ data: { user: { id: "user-1" } }, error: null });

    const req = createMockRequest("http://localhost/api/research/capture", {
      method: "POST",
      body: JSON.stringify({ products: "not-array", mode: "scraper", page_type: "search" }),
    });
    const res = await POST(req);
    expect(res.status).toBe(400);
  });
});
```

- [ ] **Step 2: Run test (should fail)**

```bash
npx vitest run src/app/api/research/capture/route.test.ts
```

Expected: FAIL

- [ ] **Step 3: Create capture/route.ts**

```ts
export const dynamic = "force-dynamic";

import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { getOrgId } from "@/lib/api-handler";
import { apiErrorResponse } from "@/lib/api-utils";

export async function POST(req: NextRequest) {
  try {
    const supabase = await createClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) return NextResponse.json({ error: "No autorizado" }, { status: 401 });

    const orgId = await getOrgId(supabase, user.id, req);
    if (!orgId) return NextResponse.json({ error: "No hay organización activa" }, { status: 400 });

    const body = await req.json();
    const { products, mode, page_type, search_keyword } = body;

    if (!Array.isArray(products) || products.length === 0) {
      return NextResponse.json({ error: "Se requiere un array de productos" }, { status: 400 });
    }

    const records = products.map((p: Record<string, unknown>) => ({
      user_id: user.id,
      org_id: orgId,
      name: String(p.title ?? "Unknown"),
      asin_reference: String(p.asin ?? ""),
      amazon_category: String(p.category ?? ""),
      estimated_monthly_sales: p.estimated_monthly_sales != null ? Number(p.estimated_monthly_sales) : null,
      average_price: p.price != null ? Number(p.price) : null,
      review_count_competitor: p.review_count != null ? Number(p.review_count) : null,
      average_rating: p.average_rating != null ? Number(p.average_rating) : null,
      bsr: p.bsr != null ? Number(p.bsr) : null,
      source: "capture",
      status: "idea",
      priority: 3,
      source_data: {
        ...p,
        capture_mode: mode,
        page_type,
        search_keyword,
        captured_at: p.capture_timestamp,
      },
    }));

    const { data, error } = await supabase
      .from("product_research")
      .insert(records)
      .select();

    if (error) {
      return NextResponse.json({ error: "Error al guardar", details: error.message }, { status: 500 });
    }

    return NextResponse.json({ data, count: data?.length ?? 0 }, { status: 201 });
  } catch (error) {
    return apiErrorResponse(error, 500, "POST /api/research/capture");
  }
}
```

- [ ] **Step 4: Run test (should pass)**

```bash
npx vitest run src/app/api/research/capture/route.test.ts
```

Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add src/app/api/research/capture/route.ts src/app/api/research/capture/route.test.ts
git commit -m "feat(research): add capture endpoint for extension data"
```

---

### Task 5: Crear scoring endpoint

**Files:**
- Create: `src/app/api/research/scoring/route.ts`
- Create: `src/app/api/research/scoring/route.test.ts`

- [ ] **Step 1: Write failing route.test.ts**

```ts
import { describe, it, expect } from "vitest";
import { POST } from "@/app/api/research/scoring/route";
import { createMockRequest } from "@/lib/test-utils/mock-request";

describe("POST /api/research/scoring", () => {
  it("calcula score para un producto", async () => {
    const req = createMockRequest("http://localhost/api/research/scoring", {
      method: "POST",
      body: JSON.stringify({
        estimated_monthly_sales: 5000,
        bsr: 500,
        review_count: 50,
        seller_count_fba: 2,
        price: 29.99,
        estimated_fba_fee: 8.5,
        estimated_cogs: 8,
      }),
    });
    const res = await POST(req);
    const json = await res.json();
    expect(res.status).toBe(200);
    expect(json).toHaveProperty("total");
    expect(json).toHaveProperty("dimensions");
    expect(json.dimensions).toHaveProperty("demanda");
    expect(json.dimensions).toHaveProperty("competencia");
    expect(json.dimensions).toHaveProperty("rentabilidad");
    expect(json.dimensions).toHaveProperty("oportunidad");
    expect(json.total).toBeGreaterThan(0);
  });

  it("devuelve score 0 si no hay datos", async () => {
    const req = createMockRequest("http://localhost/api/research/scoring", {
      method: "POST",
      body: JSON.stringify({}),
    });
    const res = await POST(req);
    const json = await res.json();
    expect(json.total).toBe(0);
  });
});
```

- [ ] **Step 2: Run test (should fail)**

```bash
npx vitest run src/app/api/research/scoring/route.test.ts
```

Expected: FAIL

- [ ] **Step 3: Create scoring/route.ts**

```ts
export const dynamic = "force-dynamic";

import { NextRequest, NextResponse } from "next/server";
import { calculateScore } from "@/lib/research/scoring";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const result = calculateScore(body);
    return NextResponse.json(result);
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Error" },
      { status: 500 }
    );
  }
}
```

- [ ] **Step 4: Run test (should pass)**

```bash
npx vitest run src/app/api/research/scoring/route.test.ts
```

Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add src/app/api/research/scoring/route.ts src/app/api/research/scoring/route.test.ts
git commit -m "feat(research): add scoring endpoint"
```

---

### Task 6: Crear deep dive endpoint

**Files:**
- Create: `src/app/api/research/analyze-deep/route.ts`
- Create: `src/app/api/research/analyze-deep/route.test.ts`

- [ ] **Step 1: Write failing route.test.ts**

```ts
import { describe, it, expect, vi, beforeEach } from "vitest";
import { POST } from "@/app/api/research/analyze-deep/route";
import { createMockRequest } from "@/lib/test-utils/mock-request";

vi.mock("@/lib/ai/client", () => ({
  getOpenAI: vi.fn(() => ({
    chat: {
      completions: {
        create: vi.fn().mockResolvedValue({
          choices: [{
            message: {
              content: JSON.stringify({
                summary: "Producto con alto potencial",
                pain_points: ["Se rompe fácil"],
                differentiation_opportunities: ["Material más resistente"],
                market_fit: "high",
                market_fit_reason: "Alta demanda y poca competencia",
                risk_factors: ["Estacionalidad"],
                recommended_actions: ["Mejorar calidad"],
                estimated_difficulty: "easy",
              }),
            },
          }],
        }),
      },
    },
  })),
}));

describe("POST /api/research/analyze-deep", () => {
  it("realiza deep dive correctamente", async () => {
    const req = createMockRequest("http://localhost/api/research/analyze-deep", {
      method: "POST",
      body: JSON.stringify({
        asin: "B0TEST1234",
        title: "Test Product",
        price: 29.99,
        bsr: 1234,
        review_count: 567,
        average_rating: 4.2,
        estimated_monthly_sales: 1200,
        category: "Sports",
        brand: "TestBrand",
      }),
    });
    const res = await POST(req);
    const json = await res.json();
    expect(res.status).toBe(200);
    expect(json).toHaveProperty("asin", "B0TEST1234");
    expect(json.analysis).toHaveProperty("summary");
    expect(json.analysis).toHaveProperty("market_fit");
    expect(json.analysis).toHaveProperty("estimated_difficulty");
  });

  it("devuelve error si falta asin", async () => {
    const req = createMockRequest("http://localhost/api/research/analyze-deep", {
      method: "POST",
      body: JSON.stringify({}),
    });
    const res = await POST(req);
    expect(res.status).toBe(400);
  });
});
```

- [ ] **Step 2: Run test (should fail)**

```bash
npx vitest run src/app/api/research/analyze-deep/route.test.ts
```

Expected: FAIL

- [ ] **Step 3: Create analyze-deep/route.ts**

```ts
export const dynamic = "force-dynamic";

import { NextRequest, NextResponse } from "next/server";
import { analyzeProductDeep } from "@/lib/research/analyzer";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { asin, title, price, bsr, review_count, average_rating, estimated_monthly_sales, category, brand } = body;

    if (!asin || !title) {
      return NextResponse.json({ error: "ASIN y title son requeridos" }, { status: 400 });
    }

    const result = await analyzeProductDeep({
      asin, title, price, bsr, review_count, average_rating,
      estimated_monthly_sales, category, brand,
    });

    return NextResponse.json(result);
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Error en deep dive" },
      { status: 500 }
    );
  }
}
```

- [ ] **Step 4: Run test (should pass)**

```bash
npx vitest run src/app/api/research/analyze-deep/route.test.ts
```

Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add src/app/api/research/analyze-deep/route.ts src/app/api/research/analyze-deep/route.test.ts
git commit -m "feat(research): add deep dive endpoint with GPT-4o"
```

---

### Task 7: Crear migration SQL para columna source_data

**Files:**
- Create: `supabase/migrations/20260730_add_source_data.sql`

- [ ] **Step 1: Create migration**

```sql
ALTER TABLE product_research
ADD COLUMN IF NOT EXISTS source_data JSONB;
```

- [ ] **Step 2: Commit**

```bash
git add supabase/migrations/20260730_add_source_data.sql
git commit -m "feat(research): add source_data column to product_research"
```

---

### Task 8: Crear deep-dive-panel component

**Files:**
- Create: `src/components/research/deep-dive-panel.tsx`

- [ ] **Step 1: Create deep-dive-panel.tsx**

```tsx
"use client";

import { useState } from "react";
import { Loader2, Sparkles, TrendingUp, AlertTriangle, CheckCircle2, Lightbulb, Target, ShieldAlert } from "lucide-react";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

interface DeepDivePanelProps {
  asin: string;
  title: string;
  price: number | null;
  bsr: number | null;
  reviewCount: number | null;
  averageRating: number | null;
  estimatedMonthlySales: number | null;
  category: string | null;
  brand: string | null;
  onSave: (data: Record<string, unknown>) => void;
  onClose: () => void;
}

interface DeepDiveAnalysis {
  summary: string;
  pain_points: string[];
  differentiation_opportunities: string[];
  market_fit: "high" | "medium" | "low";
  market_fit_reason: string;
  risk_factors: string[];
  recommended_actions: string[];
  estimated_difficulty: "easy" | "moderate" | "hard";
}

interface ScoringData {
  total: number;
  dimensions: Record<string, { score: number; label: string; weight: number; details?: string }>;
}

export function DeepDivePanel({ asin, title, price, bsr, reviewCount, averageRating, estimatedMonthlySales, category, brand, onSave, onClose }: DeepDivePanelProps) {
  const [scoring, setScoring] = useState<ScoringData | null>(null);
  const [scoringLoading, setScoringLoading] = useState(false);
  const [deepDive, setDeepDive] = useState<DeepDiveAnalysis | null>(null);
  const [diveLoading, setDiveLoading] = useState(false);

  const loadScoring = async () => {
    setScoringLoading(true);
    try {
      const res = await fetch("/api/research/scoring", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          estimated_monthly_sales: estimatedMonthlySales,
          bsr,
          review_count: reviewCount,
          average_rating: averageRating,
          price,
        }),
      });
      if (res.ok) setScoring(await res.json());
    } catch {
      toast.error("Error al calcular scoring");
    } finally {
      setScoringLoading(false);
    }
  };

  const loadDeepDive = async () => {
    setDiveLoading(true);
    try {
      const res = await fetch("/api/research/analyze-deep", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ asin, title, price, bsr, review_count: reviewCount, average_rating: averageRating, estimated_monthly_sales: estimatedMonthlySales, category, brand }),
      });
      if (res.ok) {
        const data = await res.json();
        setDeepDive(data.analysis);
      } else {
        toast.error("Error en deep dive");
      }
    } catch {
      toast.error("Error al conectar con IA");
    } finally {
      setDiveLoading(false);
    }
  };

  const handleSave = () => {
    onSave({
      name: title,
      asin_reference: asin,
      amazon_category: category,
      estimated_monthly_sales: estimatedMonthlySales,
      average_price: price,
      review_count_competitor: reviewCount,
      average_rating: averageRating,
      bsr,
      source: "deep_dive",
      status: "validating",
    });
    onClose();
  };

  const diffConfig = {
    easy: { color: "text-emerald-400", bg: "bg-emerald-500/10", label: "Fácil" },
    moderate: { color: "text-amber-400", bg: "bg-amber-500/10", label: "Moderada" },
    hard: { color: "text-rose-400", bg: "bg-rose-500/10", label: "Difícil" },
  };

  const fitConfig = {
    high: { color: "text-emerald-400", bg: "bg-emerald-500/10" },
    medium: { color: "text-amber-400", bg: "bg-amber-500/10" },
    low: { color: "text-rose-400", bg: "bg-rose-500/10" },
  };

  return (
    <div className="rounded-2xl border border-border bg-card p-5 space-y-5 animate-fade-up">
      <div className="flex items-center justify-between">
        <div className="min-w-0">
          <h3 className="text-sm font-semibold text-foreground truncate">{title}</h3>
          <p className="text-xs text-muted-foreground mt-0.5 font-mono">{asin}</p>
        </div>
        <Button variant="ghost" size="sm" onClick={onClose} className="min-w-[44px] min-h-[44px]">✕</Button>
      </div>

      <div className="flex gap-2">
        <Button size="sm" variant="outline" onClick={loadScoring} disabled={scoringLoading} className="flex-1">
          {scoringLoading ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <TrendingUp className="h-3.5 w-3.5" />}
          Scoring
        </Button>
        <Button size="sm" onClick={loadDeepDive} disabled={diveLoading} className="flex-1">
          {diveLoading ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Sparkles className="h-3.5 w-3.5" />}
          Deep Dive IA
        </Button>
      </div>

      {scoring && (
        <div className="space-y-3 p-3 rounded-xl bg-muted/20 border border-border animate-fade-up">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Score Total</span>
            <span className={cn("text-lg font-bold font-display", scoring.total >= 70 ? "text-emerald-400" : scoring.total >= 40 ? "text-amber-400" : "text-rose-400")}>{scoring.total}/100</span>
          </div>
          {Object.values(scoring.dimensions).map((d) => (
            <div key={d.label} className="space-y-1">
              <div className="flex items-center justify-between text-xs">
                <span className="text-muted-foreground">{d.label} ({Math.round(d.weight * 100)}%)</span>
                <span className="text-foreground font-medium">{d.score}/100</span>
              </div>
              <div className="h-1.5 rounded-full bg-muted overflow-hidden">
                <div
                  className={cn("h-full rounded-full transition-all", d.score >= 70 ? "bg-emerald-500" : d.score >= 40 ? "bg-amber-500" : "bg-rose-500")}
                  style={{ width: `${d.score}%` }}
                />
              </div>
              {d.details && <p className="text-[10px] text-muted-foreground">{d.details}</p>}
            </div>
          ))}
        </div>
      )}

      {deepDive && (
        <div className="space-y-4 animate-fade-up">
          <p className="text-sm text-foreground">{deepDive.summary}</p>

          <div className="flex gap-2">
            <span className={cn("text-xs px-2 py-1 rounded-full border", diffConfig[deepDive.estimated_difficulty].color, diffConfig[deepDive.estimated_difficulty].bg, "border-current/20")}>
              Dificultad: {diffConfig[deepDive.estimated_difficulty].label}
            </span>
            <span className={cn("text-xs px-2 py-1 rounded-full border", fitConfig[deepDive.market_fit].color, fitConfig[deepDive.market_fit].bg, "border-current/20")}>
              Market Fit: {deepDive.market_fit === "high" ? "Alto" : deepDive.market_fit === "medium" ? "Medio" : "Bajo"}
            </span>
          </div>

          {deepDive.pain_points.length > 0 && (
            <Section icon={AlertTriangle} title="Pain Points" color="text-rose-400">
              {deepDive.pain_points.map((p, i) => <li key={i}>{p}</li>)}
            </Section>
          )}

          {deepDive.differentiation_opportunities.length > 0 && (
            <Section icon={Lightbulb} title="Oportunidades de Diferenciación" color="text-amber-400">
              {deepDive.differentiation_opportunities.map((d, i) => <li key={i}>{d}</li>)}
            </Section>
          )}

          {deepDive.risk_factors.length > 0 && (
            <Section icon={ShieldAlert} title="Factores de Riesgo" color="text-rose-400">
              {deepDive.risk_factors.map((r, i) => <li key={i}>{r}</li>)}
            </Section>
          )}

          {deepDive.recommended_actions.length > 0 && (
            <Section icon={Target} title="Acciones Recomendadas" color="text-emerald-400">
              {deepDive.recommended_actions.map((a, i) => <li key={i}>{a}</li>)}
            </Section>
          )}
        </div>
      )}

      <div className="flex gap-2 pt-2 border-t border-border">
        <Button variant="outline" size="sm" onClick={onClose} className="flex-1">Cerrar</Button>
        <Button size="sm" onClick={handleSave} className="flex-1">
          <CheckCircle2 className="h-3.5 w-3.5 me-1.5" />
          Guardar en Research
        </Button>
      </div>
    </div>
  );
}

function Section({ icon: Icon, title, color, children }: { icon: React.ElementType; title: string; color: string; children: React.ReactNode }) {
  return (
    <div className="space-y-1.5">
      <div className="flex items-center gap-1.5">
        <Icon className={cn("h-3.5 w-3.5", color)} />
        <span className="text-xs font-medium text-foreground">{title}</span>
      </div>
      <ul className="space-y-1 ps-4">
        {Array.isArray(children) ? children.map((child, i) => (
          <li key={i} className="text-xs text-muted-foreground list-disc">{child}</li>
        )) : children}
      </ul>
    </div>
  );
}
```

- [ ] **Step 2: Commit**

```bash
git add src/components/research/deep-dive-panel.tsx
git commit -m "feat(research): add deep dive panel component with scoring and AI analysis"
```

---

### Task 9: Actualizar página /research

**Files:**
- Modify: `src/app/(dashboard)/research/page.tsx`

- [ ] **Step 1: Agregar sección de descarga de extension + deep dive panel**

Insertar después del header y antes del buscador:

```tsx
// After line 296 (closing PageHeader tag), before the analyzer input section

<div className="rounded-2xl border border-border bg-gradient-to-r from-primary/5 to-transparent p-5 space-y-4">
  <div className="flex items-start justify-between gap-4">
    <div>
      <h3 className="text-sm font-semibold text-foreground flex items-center gap-2">
        <Sparkles className="h-4 w-4 text-primary" />
        FBA Research Agent
      </h3>
      <p className="text-xs text-muted-foreground mt-1 max-w-xl">
        Descargá la Chrome Extension para capturar productos directamente desde Amazon
        con datos de H10 Xray o scraper automático.
      </p>
    </div>
    <div className="flex gap-2 shrink-0">
      <Button variant="outline" size="sm" onClick={() => window.open("/api/research/extension.zip")}>
        <Download className="h-3.5 w-3.5 me-1.5" />
        Descargar .zip
      </Button>
      <Button variant="ghost" size="sm" onClick={/* open guide modal */}>
        <BookOpen className="h-3.5 w-3.5 me-1.5" />
        Guía
      </Button>
    </div>
  </div>
</div>
```

Agregar imports:
```tsx
import { Download, BookOpen } from "lucide-react";
```

Agregar el deep dive panel al final del render:

```tsx
{deepDiveProduct && (
  <div className="fixed inset-0 z-50 flex items-center justify-center bg-background/80 backdrop-blur-sm p-4">
    <div className="w-full max-w-lg max-h-[85vh] overflow-y-auto">
      <DeepDivePanel
        asin={deepDiveProduct.asin_reference ?? ""}
        title={deepDiveProduct.name}
        price={deepDiveProduct.average_price}
        bsr={deepDiveProduct.bsr}
        reviewCount={deepDiveProduct.review_count_competitor}
        averageRating={deepDiveProduct.average_rating}
        estimatedMonthlySales={deepDiveProduct.estimated_monthly_sales}
        category={deepDiveProduct.amazon_category}
        brand={null}
        onSave={handleAnalyzeSave}
        onClose={() => setDeepDiveProduct(null)}
      />
    </div>
  </div>
)}
```

Agregar state para deep dive al inicio del componente:
```tsx
const [deepDiveProduct, setDeepDiveProduct] = useState<ProductResearch | null>(null);
```

Agregar columna de acción "Deep Dive" en la vista de lista (después de la columna de prioridad):
```tsx
// Inside the list view table, after the priority column <td>
<td className="p-4 text-center">
  <Button variant="ghost" size="icon-sm" onClick={(e) => { e.stopPropagation(); setDeepDiveProduct(item); }} className="min-w-[44px] min-h-[44px]">
    <Sparkles className="h-4 w-4" />
  </Button>
</td>
```

También agregar botón de deep dive en las cards kanban.

- [ ] **Step 2: Commit**

```bash
git add src/app/(dashboard)/research/page.tsx
git commit -m "feat(research): add extension download section and deep dive integration"
```

---

### Task 10: Chrome Extension — manifest + build setup

**Files:**
- Create: `src/chrome-extension/manifest.json`
- Modify: `package.json` (agregar build script)

- [ ] **Step 1: Create manifest.json**

```json
{
  "manifest_version": 3,
  "name": "FBA Research Agent",
  "version": "1.0.0",
  "description": "Captura productos de Amazon con datos de H10 Xray o scraper directo",
  "permissions": ["storage"],
  "host_permissions": ["*://www.amazon.com/*", "*://www.amazon.es/*"],
  "action": {
    "default_popup": "popup/popup.html",
    "default_icon": {
      "16": "icons/icon-16.png",
      "48": "icons/icon-48.png",
      "128": "icons/icon-128.png"
    }
  },
  "content_scripts": [
    {
      "matches": ["*://www.amazon.com/*", "*://www.amazon.es/*"],
      "js": ["content/content.js"],
      "run_at": "document_end"
    }
  ],
  "icons": {
    "16": "icons/icon-16.png",
    "48": "icons/icon-48.png",
    "128": "icons/icon-128.png"
  }
}
```

- [ ] **Step 2: Agregar build script en package.json**

```json
"build:extension": "tsx src/scripts/build-extension.ts"
```

- [ ] **Step 3: Commit**

```bash
git add src/chrome-extension/manifest.json
git commit -m "feat(extension): add chrome extension manifest"
```

---

### Task 11: Chrome Extension — content script

**Files:**
- Create: `src/chrome-extension/utils/detect-h10.ts`
- Create: `src/chrome-extension/content/scraper.ts`
- Create: `src/chrome-extension/content/h10-reader.ts`
- Create: `src/chrome-extension/content/content.ts`

- [ ] **Step 1: Create detect-h10.ts**

```ts
export function detectH10Xray(): boolean {
  const selectors = [
    '[class*="xray"]',
    '[id*="h10"]',
    '[class*="helium"]',
    '[class*="Xray"]',
  ];
  return selectors.some((sel) => document.querySelector(sel) !== null);
}

export function observeH10Overlay(
  callback: (container: Element) => void
): () => void {
  const observer = new MutationObserver(() => {
    if (detectH10Xray()) {
      const container = document.querySelector('[class*="xray"], [id*="h10"], [class*="helium"]');
      if (container) {
        callback(container);
      }
    }
  });
  observer.observe(document.body, { childList: true, subtree: true });
  return () => observer.disconnect();
}
```

- [ ] **Step 2: Create scraper.ts**

```ts
export interface ScrapedProduct {
  asin: string;
  title: string;
  price: number | null;
  currency: string;
  bsr: number | null;
  review_count: number | null;
  average_rating: number | null;
  category: string | null;
  image_url: string | null;
}

function extractAsin(url: string): string | null {
  const match = url.match(/\/([A-Z0-9]{10})(?:\/|$|\?)/);
  return match?.[1] ?? null;
}

function parsePrice(text: string): number | null {
  const cleaned = text.replace(/[^0-9.,]/g, "").replace(",", ".");
  const num = parseFloat(cleaned);
  return isNaN(num) ? null : num;
}

function parseBsr(text: string): number | null {
  const cleaned = text.replace(/[^0-9]/g, "");
  const num = parseInt(cleaned, 10);
  return isNaN(num) ? null : num;
}

export function scrapeCurrentPage(): ScrapedProduct[] {
  const results: ScrapedProduct[] = [];

  const productCards = document.querySelectorAll(
    '[data-asin]:not([data-asin=""])'
  );

  productCards.forEach((card) => {
    const asin = card.getAttribute("data-asin") || "";
    if (!asin || asin.length !== 10) return;

    const titleEl = card.querySelector("h2 a, h2 span, [class*='title']");
    const title = titleEl?.textContent?.trim() || "";

    const priceEl = card.querySelector(".a-price .a-offscreen, .a-price span:last-child");
    const price = priceEl?.textContent ? parsePrice(priceEl.textContent) : null;

    const ratingEl = card.querySelector("[class*='rating'] i span, .a-icon-alt");
    const ratingText = ratingEl?.textContent || "";
    const ratingMatch = ratingText.match(/([\d.]+)/);
    const average_rating = ratingMatch ? parseFloat(ratingMatch[1]) : null;

    const reviewCountEl = card.querySelector("[class*='rating'] ~ [class*='link'] a, [class*='rating'] ~ a");
    const reviewText = reviewCountEl?.textContent || "";
    const reviewCountMatch = reviewText.match(/([\d,]+)/);
    const review_count = reviewCountMatch ? parseInt(reviewCountMatch[1].replace(/,/g, ""), 10) : null;

    const imgEl = card.querySelector("img[src*='images'], img[src*='media']");
    const image_url = imgEl?.getAttribute("src") || null;

    results.push({
      asin,
      title,
      price,
      currency: "USD",
      bsr: null,
      review_count,
      average_rating,
      category: null,
      image_url,
    });
  });

  return results;
}

export function scrapeProductPage(): ScrapedProduct | null {
  const asinExtract = extractAsin(window.location.href);
  if (!asinExtract) return null;

  const titleEl = document.querySelector("#productTitle, [class*='product-title']");
  const title = titleEl?.textContent?.trim() || "";

  const priceEl = document.querySelector(".a-price .a-offscreen, #priceblock_ourprice, #price_inside_buybox");
  const price = priceEl?.textContent ? parsePrice(priceEl.textContent) : null;

  const bsrEl = document.querySelector("#detailBullets_feature_div [class*='listitem']:contains('Best Sellers Rank'), [class*='best-seller']");
  const bsr = bsrEl?.textContent ? parseBsr(bsrEl.textContent) : null;

  const ratingEl = document.querySelector(".a-icon-alt");
  const rating = ratingEl?.textContent ? parseFloat(ratingEl.textContent) || null : null;

  const reviewCountEl = document.querySelector("#acrCustomerReviewText");
  const reviewText = reviewCountEl?.textContent || "";
  const reviewCount = reviewText ? parseInt(reviewText.replace(/[^0-9]/g, ""), 10) || null : null;

  const imgEl = document.querySelector("#landingImage, #imgTagWrapperId img");
  const image_url = imgEl?.getAttribute("src") || null;

  const categoryEl = document.querySelector("#wayfinding-breadcrumbs_container [class*='breadcrumb'] a:last-child, [class*='breadcrumb'] li:last-child a");
  const category = categoryEl?.textContent?.trim() || null;

  return {
    asin: asinExtract,
    title,
    price,
    currency: "USD",
    bsr,
    review_count: reviewCount,
    average_rating: rating,
    category,
    image_url,
  };
}
```

- [ ] **Step 3: Create h10-reader.ts**

```ts
export interface H10ProductData {
  asin: string;
  title: string;
  price: number | null;
  bsr: number | null;
  review_count: number | null;
  average_rating: number | null;
  estimated_monthly_sales: number | null;
  estimated_monthly_revenue: number | null;
  estimated_fba_fee: number | null;
  seller_count_fba: number | null;
  seller_count_fbm: number | null;
}

export function readH10Overlay(container: Element): H10ProductData[] {
  const products: H10ProductData[] = [];
  const rows = container.querySelectorAll("tr, [class*='row'], [class*='product']");

  rows.forEach((row) => {
    const asin = row.getAttribute("data-asin") || extractAsinFromRow(row);
    if (!asin) return;

    products.push({
      asin,
      title: extractText(row, '[class*="title"], [class*="name"]'),
      price: extractNumber(row, '[class*="price"]'),
      bsr: extractNumber(row, '[class*="bsr"], [class*="rank"]'),
      review_count: extractNumber(row, '[class*="review"]'),
      average_rating: extractNumber(row, '[class*="rating"]'),
      estimated_monthly_sales: extractNumber(row, '[class*="sales"], [class*="volume"]'),
      estimated_monthly_revenue: extractNumber(row, '[class*="revenue"]'),
      estimated_fba_fee: extractNumber(row, '[class*="fee"], [class*="cost"]'),
      seller_count_fba: extractNumber(row, '[class*="fba-seller"]'),
      seller_count_fbm: extractNumber(row, '[class*="fbm-seller"]'),
    });
  });

  return products;
}

function extractText(parent: Element, selector: string): string {
  const el = parent.querySelector(selector);
  return el?.textContent?.trim() || "";
}

function extractNumber(parent: Element, selector: string): number | null {
  const el = parent.querySelector(selector);
  if (!el?.textContent) return null;
  const cleaned = el.textContent.replace(/[^0-9.,]/g, "").replace(",", ".");
  const num = parseFloat(cleaned);
  return isNaN(num) ? null : num;
}

function extractAsinFromRow(row: Element): string | null {
  const link = row.querySelector('a[href*="/dp/"], a[href*="/product/"]');
  const href = link?.getAttribute("href") || "";
  const match = href.match(/\/(?:dp|product)\/([A-Z0-9]{10})/);
  return match?.[1] ?? null;
}
```

- [ ] **Step 4: Create content.ts**

```ts
import { detectH10Xray, observeH10Overlay } from "../utils/detect-h10";
import { scrapeCurrentPage, scrapeProductPage } from "./scraper";
import { readH10Overlay } from "./h10-reader";

let capturedData: Record<string, unknown> | null = null;

function isSearchResultsPage(): boolean {
  return !!document.querySelector('[data-asin]:not([data-asin=""])');
}

function isProductPage(): boolean {
  return !!document.querySelector("#productTitle");
}

function determinePageType(): "search" | "product" | "unknown" {
  if (isProductPage()) return "product";
  if (isSearchResultsPage()) return "search";
  return "unknown";
}

if (detectH10Xray()) {
  observeH10Overlay((container) => {
    const h10products = readH10Overlay(container);
    if (h10products.length > 0) {
      capturedData = {
        products: h10products,
        mode: "h10_xray",
        page_type: determinePageType(),
        capture_url: window.location.href,
        capture_timestamp: new Date().toISOString(),
      };
    }
  });
} else {
  const pageType = determinePageType();
  let products;

  if (pageType === "product") {
    const single = scrapeProductPage();
    products = single ? [single] : [];
  } else {
    products = scrapeCurrentPage();
  }

  if (products.length > 0) {
    capturedData = {
      products,
      mode: "scraper",
      page_type: pageType,
      capture_url: window.location.href,
      capture_timestamp: new Date().toISOString(),
    };
  }
}

chrome.runtime.onMessage.addListener((message, _sender, sendResponse) => {
  if (message.type === "GET_CAPTURED_DATA") {
    sendResponse(capturedData);
  }
});
```

- [ ] **Step 5: Commit**

```bash
git add src/chrome-extension/utils/detect-h10.ts src/chrome-extension/content/scraper.ts src/chrome-extension/content/h10-reader.ts src/chrome-extension/content/content.ts
git commit -m "feat(extension): add content scripts (scraper, H10 reader, detection)"
```

---

### Task 12: Chrome Extension — popup UI

**Files:**
- Create: `src/chrome-extension/utils/api.ts`
- Create: `src/chrome-extension/popup/popup.html`
- Create: `src/chrome-extension/popup/popup.css`
- Create: `src/chrome-extension/popup/popup.ts`

- [ ] **Step 1: Create api.ts**

```ts
export async function sendToWebApp(payload: Record<string, unknown>): Promise<{ ok: boolean; error?: string }> {
  try {
    const res = await fetch("https://amazon-fba-manager-virid.vercel.app/api/research/capture", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      credentials: "include",
      body: JSON.stringify(payload),
    });
    if (!res.ok) {
      const data = await res.json().catch(() => ({}));
      return { ok: false, error: data.error || `HTTP ${res.status}` };
    }
    return { ok: true };
  } catch (err) {
    return { ok: false, error: String(err) };
  }
}
```

- [ ] **Step 2: Create popup.html**

```html
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <link rel="stylesheet" href="popup.css">
  <title>FBA Research Agent</title>
</head>
<body>
  <div id="app">
    <header>
      <span class="logo">🔬</span>
      <h1>FBA Research Agent</h1>
      <span class="badge" id="mode-badge">Scraper</span>
    </header>

    <div id="loading" class="hidden">
      <div class="spinner"></div>
      <p>Capturando datos...</p>
    </div>

    <div id="no-data" class="hidden">
      <p class="empty-icon">📭</p>
      <p class="empty-title">No hay datos capturados</p>
      <p class="empty-subtitle">Navegá a una página de Amazon y recargá la extensión</p>
    </div>

    <div id="results" class="hidden">
      <div class="info-bar">
        <span id="product-count"></span>
        <span id="page-type" class="tag"></span>
        <span id="source-badge" class="tag"></span>
      </div>

      <div id="product-list"></div>

      <div class="actions">
        <button id="send-btn" class="btn btn-primary">📤 Enviar a la web</button>
      </div>
    </div>

    <div id="sent" class="hidden">
      <p class="success-icon">✅</p>
      <p class="success-title">Datos enviados</p>
      <p class="success-subtitle" id="sent-count"></p>
      <button id="done-btn" class="btn btn-primary">OK</button>
    </div>
  </div>
  <script src="popup.js"></script>
</body>
</html>
```

- [ ] **Step 3: Create popup.css**

```css
:root {
  --bg: #0f1115;
  --card: #181b20;
  --border: #2a2d35;
  --text: #e4e6eb;
  --muted: #8b8d97;
  --primary: #6366f1;
  --primary-hover: #818cf8;
  --success: #34d399;
  --warning: #fbbf24;
  --danger: #f87171;
}

* { margin: 0; padding: 0; box-sizing: border-box; }

body {
  width: 380px;
  font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
  background: var(--bg);
  color: var(--text);
  font-size: 13px;
  line-height: 1.5;
}

#app { padding: 12px; }

header {
  display: flex;
  align-items: center;
  gap: 8px;
  margin-bottom: 12px;
  padding-bottom: 10px;
  border-bottom: 1px solid var(--border);
}

.logo { font-size: 18px; }

h1 { font-size: 14px; font-weight: 600; flex: 1; }

.badge {
  font-size: 10px;
  padding: 2px 8px;
  border-radius: 10px;
  font-weight: 500;
}

#mode-badge.h10 { background: rgba(99, 102, 241, 0.15); color: var(--primary); }
#mode-badge.scraper { background: rgba(251, 191, 36, 0.15); color: var(--warning); }

.hidden { display: none !important; }

.info-bar {
  display: flex;
  gap: 6px;
  align-items: center;
  margin-bottom: 10px;
  font-size: 11px;
  color: var(--muted);
}

.tag {
  font-size: 10px;
  padding: 1px 6px;
  border-radius: 6px;
  background: var(--card);
  border: 1px solid var(--border);
}

#product-list { display: flex; flex-direction: column; gap: 8px; margin-bottom: 12px; max-height: 350px; overflow-y: auto; }

.product-card {
  padding: 10px;
  border-radius: 10px;
  background: var(--card);
  border: 1px solid var(--border);
}

.product-title {
  font-size: 12px;
  font-weight: 500;
  margin-bottom: 4px;
  display: -webkit-box;
  -webkit-line-clamp: 2;
  -webkit-box-orient: vertical;
  overflow: hidden;
}

.product-meta {
  display: flex;
  flex-wrap: wrap;
  gap: 4px 10px;
  font-size: 11px;
  color: var(--muted);
}

.product-meta span { white-space: nowrap; }

.product-meta .label { color: var(--muted); }

.product-meta .value { color: var(--text); font-weight: 500; }

.actions { display: flex; gap: 8px; }

.btn {
  flex: 1;
  padding: 10px 16px;
  border: none;
  border-radius: 10px;
  font-size: 13px;
  font-weight: 500;
  cursor: pointer;
  transition: opacity 0.15s;
}

.btn:active { opacity: 0.7; }

.btn-primary {
  background: var(--primary);
  color: white;
}

.btn-primary:hover { background: var(--primary-hover); }

#loading { text-align: center; padding: 40px 0; }

.spinner {
  width: 24px; height: 24px;
  border: 3px solid var(--border);
  border-top-color: var(--primary);
  border-radius: 50%;
  animation: spin 0.6s linear infinite;
  margin: 0 auto 12px;
}

@keyframes spin { to { transform: rotate(360deg); } }

.empty-icon, .success-icon { font-size: 32px; text-align: center; margin-bottom: 8px; }

.empty-title, .success-title { font-size: 14px; font-weight: 600; text-align: center; }

.empty-subtitle, .success-subtitle { font-size: 12px; color: var(--muted); text-align: center; margin-top: 4px; }

#no-data, #sent { padding: 40px 0; text-align: center; }

#done-btn { margin-top: 12px; }
```

- [ ] **Step 4: Create popup.ts**

```ts
import { sendToWebApp } from "../utils/api";

async function init() {
  const loading = document.getElementById("loading")!;
  const noData = document.getElementById("no-data")!;
  const results = document.getElementById("results")!;
  const sent = document.getElementById("sent")!;

  loading.classList.remove("hidden");

  const tabs = await chrome.tabs.query({ active: true, currentWindow: true });
  const activeTab = tabs[0];

  if (!activeTab.id || !activeTab.url?.includes("amazon")) {
    loading.classList.add("hidden");
    noData.classList.remove("hidden");
    return;
  }

  const response = await chrome.tabs.sendMessage(activeTab.id, { type: "GET_CAPTURED_DATA" });

  loading.classList.add("hidden");

  if (!response || !response.products || response.products.length === 0) {
    noData.classList.remove("hidden");
    return;
  }

  results.classList.remove("hidden");

  const modeBadge = document.getElementById("mode-badge")!;
  modeBadge.textContent = response.mode === "h10_xray" ? "H10 Xray" : "Scraper";
  modeBadge.className = `badge ${response.mode === "h10_xray" ? "h10" : "scraper"}`;

  document.getElementById("product-count")!.textContent = `${response.products.length} producto(s)`;
  document.getElementById("page-type")!.textContent = response.page_type;

  const list = document.getElementById("product-list")!;
  response.products.forEach((p: Record<string, unknown>) => {
    const card = document.createElement("div");
    card.className = "product-card";
    card.innerHTML = `
      <div class="product-title">${p.title || "Unknown"}</div>
      <div class="product-meta">
        <span><span class="label">ASIN:</span> <span class="value">${p.asin}</span></span>
        ${p.price ? `<span><span class="label">Precio:</span> <span class="value">$${p.price}</span></span>` : ""}
        ${p.bsr ? `<span><span class="label">BSR:</span> <span class="value">#${p.bsr}</span></span>` : ""}
        ${p.review_count ? `<span><span class="label">Reviews:</span> <span class="value">${p.review_count}</span></span>` : ""}
        ${p.average_rating ? `<span><span class="label">Rating:</span> <span class="value">${p.average_rating}</span></span>` : ""}
        ${p.estimated_monthly_sales ? `<span><span class="label">Ventas/m:</span> <span class="value">${Number(p.estimated_monthly_sales).toLocaleString()}</span></span>` : ""}
      </div>
    `;
    list.appendChild(card);
  });

  document.getElementById("send-btn")!.addEventListener("click", async () => {
    const result = await sendToWebApp({
      products: response.products,
      mode: response.mode,
      page_type: response.page_type,
      search_keyword: getSearchKeyword(),
    });

    results.classList.add("hidden");
    sent.classList.remove("hidden");

    if (result.ok) {
      document.getElementById("sent-count")!.textContent = `${response.products.length} producto(s) enviado(s) correctamente`;
    } else {
      document.getElementById("sent-count")!.textContent = `Error: ${result.error || "Error al enviar"}`;
    }
  });

  document.getElementById("done-btn")!.addEventListener("click", () => {
    window.close();
  });
}

function getSearchKeyword(): string {
  const params = new URLSearchParams(window.location.search);
  return params.get("k") || params.get("keywords") || "";
}

document.addEventListener("DOMContentLoaded", init);
```

- [ ] **Step 5: Commit**

```bash
git add src/chrome-extension/utils/api.ts src/chrome-extension/popup/
git commit -m "feat(extension): add popup UI with review and send functionality"
```

---

### Task 13: Crear build script para extension

**Files:**
- Create: `src/scripts/build-extension.ts`

- [ ] **Step 1: Create build-extension.ts**

```ts
import { mkdirSync, copyFileSync, writeFileSync, readdirSync, existsSync } from "fs";
import { join, resolve } from "path";
import { execSync } from "child_process";

const EXTENSION_SRC = resolve(__dirname, "../chrome-extension");
const DIST = resolve(__dirname, "../../public/extension");
const ZIP_PATH = resolve(__dirname, "../../public/api/research/extension.zip");

function buildTs(file: string, out: string) {
  execSync(`npx esbuild ${file} --bundle --outfile=${out} --minify --platform=browser --format=iife`, {
    stdio: "inherit",
  });
}

function copyIcons() {
  const iconsDir = join(EXTENSION_SRC, "icons");
  const outIcons = join(DIST, "icons");
  if (existsSync(iconsDir)) {
    mkdirSync(outIcons, { recursive: true });
    readdirSync(iconsDir).forEach((f) => copyFileSync(join(iconsDir, f), join(outIcons, f)));
  }
}

async function build() {
  console.log("Building Chrome Extension...");

  mkdirSync(DIST, { recursive: true });

  copyFileSync(join(EXTENSION_SRC, "manifest.json"), join(DIST, "manifest.json"));
  copyFileSync(join(EXTENSION_SRC, "popup/popup.html"), join(DIST, "popup/popup.html"));
  copyFileSync(join(EXTENSION_SRC, "popup/popup.css"), join(DIST, "popup/popup.css"));
  copyIcons();

  mkdirSync(join(DIST, "popup"), { recursive: true });
  mkdirSync(join(DIST, "content"), { recursive: true });

  buildTs(join(EXTENSION_SRC, "popup/popup.ts"), join(DIST, "popup/popup.js"));
  buildTs(join(EXTENSION_SRC, "content/content.ts"), join(DIST, "content/content.js"));

  execSync(`cd ${DIST} && npx bestzip ${ZIP_PATH} *`, { stdio: "inherit" });

  console.log(`Extension built: ${ZIP_PATH}`);
}

build().catch(console.error);
```

- [ ] **Step 2: Commit**

```bash
git add src/scripts/build-extension.ts
git commit -m "feat(extension): add build script with esbuild and zip"
```

---

### Task 14: Verification

- [ ] **Step 1: Lint**

```bash
npm run lint
```

Expected: 0 errors

- [ ] **Step 2: TypeScript check**

```bash
npm run typecheck
```

Expected: 0 errors

- [ ] **Step 3: Run all tests**

```bash
npx vitest run
```

Expected: all tests pass

- [ ] **Step 4: Build**

```bash
npm run build
```

Expected: Build exits 0

- [ ] **Step 5: Commit final verification**

```bash
git add -A && git status
```

---

## Verification

1. `npm run lint` — 0 errors
2. `npm run typecheck` — 0 errors
3. `npx vitest run` — all tests pass
4. `npm run build` — build exits 0
5. Extension build: `tsx src/scripts/build-extension.ts` — generates `public/api/research/extension.zip`
