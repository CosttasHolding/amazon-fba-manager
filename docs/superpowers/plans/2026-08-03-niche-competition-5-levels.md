# Nicho + Competencia en 5 niveles Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Completar el campo `niche` y derivar `competition_level` en 5 niveles (muy baja → muy alta) en cada captura, visible en popup y app.

**Architecture:** Una funcion pura nueva `competitionLevelFromScore()` mapea la dimension `competencia` (0-100) del scoring a 5 niveles; `capture/route.ts` escribe `niche` (categoria del BSR) y `competition_level`. La migracion 031 amplia el CHECK de la columna. UI modal + badge kanban + popup muestran los 5 niveles con i18n.

**Tech Stack:** Next.js 14, Supabase, Vitest, Zod, React Hook Form, i18n JSON (es/en/ar), Chrome Extension (TS).

## Global Constraints

- TypeScript strict — nunca `any`
- Zod para toda validacion
- `sonner` para toast, nunca alerts nativos
- `calculations.ts` y `scoring.ts` son inmutables — no se modifican
- Sin comentarios en codigo a menos que se pidan
- `snake_case` en DB/API, `camelCase` en frontend
- Verificacion completa al final de cada tarea: `npx tsc --noEmit`, `npm run lint`, `npm run test:run`, `npm run build`
- Pre-commit hook bloquea commits con secrets — no usar `--no-verify`
- Mensajes al usuario siempre en español

---

### Task 1: Helper puro `competitionLevelFromScore`

**Files:**
- Create: `src/lib/research/competition.ts`
- Test: `src/lib/research/competition.test.ts`

**Interfaces:**
- Consumes: `CompetitionLevel` de `@/types`
- Produces: `competitionLevelFromScore(score: number): CompetitionLevel` — `>=80`→`very_low`, `>=60`→`low`, `>=40`→`medium`, `>=20`→`high`, else→`very_high`

- [ ] **Step 1: Write the failing test**

```ts
import { describe, it, expect } from "vitest";
import { competitionLevelFromScore } from "./competition";

describe("competitionLevelFromScore", () => {
  it("80-100 -> very_low (poca competencia)", () => {
    expect(competitionLevelFromScore(100)).toBe("very_low");
    expect(competitionLevelFromScore(80)).toBe("very_low");
  });

  it("60-79 -> low", () => {
    expect(competitionLevelFromScore(79)).toBe("low");
    expect(competitionLevelFromScore(60)).toBe("low");
  });

  it("40-59 -> medium", () => {
    expect(competitionLevelFromScore(59)).toBe("medium");
    expect(competitionLevelFromScore(40)).toBe("medium");
  });

  it("20-39 -> high", () => {
    expect(competitionLevelFromScore(39)).toBe("high");
    expect(competitionLevelFromScore(20)).toBe("high");
  });

  it("0-19 -> very_high (mucha competencia)", () => {
    expect(competitionLevelFromScore(19)).toBe("very_high");
    expect(competitionLevelFromScore(0)).toBe("very_high");
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run src/lib/research/competition.test.ts`
Expected: FAIL — `Cannot find module './competition'`

- [ ] **Step 3: Write minimal implementation**

```ts
import type { CompetitionLevel } from "@/types";

export function competitionLevelFromScore(score: number): CompetitionLevel {
  if (score >= 80) return "very_low";
  if (score >= 60) return "low";
  if (score >= 40) return "medium";
  if (score >= 20) return "high";
  return "very_high";
}
```

Nota: la dependencia de tipos se resuelve en la Task 2. Mientras tanto esto NO compila contra `CompetitionLevel` de 3 valores. Correr el test con `CompetitionLevel` temporalmente como union inline en el archivo de test si Task 2 no esta lista; en el orden del plan la Task 2 va despues, por eso el implementador puede definir la funcion con un tipo literal union local y cambiarlo en Task 2. Alternativa: ejecutar las tareas 2 y 1 en orden (recomendado: hacer Task 2 primero si se ejecuta en secuencia). **Si se ejecuta en orden estricto, el Step 4 de esta tarea valida con un tipo local:**

```ts
type CompetitionLevel5 = "very_low" | "low" | "medium" | "high" | "very_high";
export function competitionLevelFromScore(score: number): CompetitionLevel5 {
  if (score >= 80) return "very_low";
  if (score >= 60) return "low";
  if (score >= 40) return "medium";
  if (score >= 20) return "high";
  return "very_high";
}
```

En la Task 2 se cambia el tipo local por el import de `@/types`. El codigo de retorno no cambia.

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run src/lib/research/competition.test.ts`
Expected: PASS (5 tests)

- [ ] **Step 5: Commit**

```bash
git add src/lib/research/competition.ts src/lib/research/competition.test.ts
git commit -m "feat: competitionLevelFromScore helper puro (5 niveles)"
```

---

### Task 2: Types + Zod + migracion 031

**Files:**
- Modify: `src/types/index.ts:382` — `CompetitionLevel` a 5 valores
- Modify: `src/validations/research.ts:13` — enum Zod a 5 valores
- Modify: `src/validations/schemas.test.ts:239-247` — test valido con `very_high`
- Create: `supabase/migrations/031_competition_5_levels.sql`

**Interfaces:**
- Consumes: nada nuevo
- Produces: `CompetitionLevel = 'very_low' | 'low' | 'medium' | 'high' | 'very_high'` (usado por Task 1 y Task 4)

- [ ] **Step 1: Write the failing test**

Editar `src/validations/schemas.test.ts:239-247`:

```ts
  it("acepta competition_level valido", () => {
    const result = researchSchema.safeParse({ name: "Test", competition_level: "very_high" });
    expect(result.success).toBe(true);
  });

  it("acepta los 5 niveles", () => {
    for (const level of ["very_low", "low", "medium", "high", "very_high"]) {
      const result = researchSchema.safeParse({ name: "Test", competition_level: level });
      expect(result.success).toBe(true);
    }
  });

  it("falla con competition_level invalido", () => {
    const result = researchSchema.safeParse({ name: "Test", competition_level: "extreme" });
    expect(result.success).toBe(false);
  });
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run src/validations/schemas.test.ts`
Expected: FAIL — `competition_level: very_high` invalid (enum only 3 values)

- [ ] **Step 3: Update the type**

En `src/types/index.ts:382`, reemplazar:

```ts
export type CompetitionLevel = 'low' | 'medium' | 'high';
```

por:

```ts
export type CompetitionLevel = 'very_low' | 'low' | 'medium' | 'high' | 'very_high';
```

- [ ] **Step 4: Update the Zod schema**

En `src/validations/research.ts:13`, reemplazar:

```ts
  competition_level: z.enum(["low", "medium", "high"]).nullable().optional(),
```

por:

```ts
  competition_level: z.enum(["very_low", "low", "medium", "high", "very_high"]).nullable().optional(),
```

- [ ] **Step 5: Update Task 1 helper to use the real type**

Editar `src/lib/research/competition.ts` — reemplazar el tipo local por el import:

```ts
import type { CompetitionLevel } from "@/types";

export function competitionLevelFromScore(score: number): CompetitionLevel {
  if (score >= 80) return "very_low";
  if (score >= 60) return "low";
  if (score >= 40) return "medium";
  if (score >= 20) return "high";
  return "very_high";
}
```

- [ ] **Step 6: Create the migration**

Crear `supabase/migrations/031_competition_5_levels.sql`:

```sql
ALTER TABLE product_research DROP CONSTRAINT IF EXISTS product_research_competition_level_check;
ALTER TABLE product_research ADD CONSTRAINT product_research_competition_level_check
  CHECK (competition_level IN ('very_low','low','medium','high','very_high'));
```

- [ ] **Step 7: Run tests**

Run: `npx vitest run src/validations/schemas.test.ts src/lib/research/competition.test.ts`
Expected: PASS

Run: `npx tsc --noEmit`
Expected: 0 errores (verificar que ningun otro archivo rompa por el enum de 5; `src/lib/ai/types.ts:22` y `product-analyzer.tsx` usan low/medium/high de la IA — esos son subtipos validos del nuevo union, no rompen)

- [ ] **Step 8: Commit**

```bash
git add src/types/index.ts src/validations/research.ts src/validations/schemas.test.ts src/lib/research/competition.ts supabase/migrations/031_competition_5_levels.sql
git commit -m "feat: CompetitionLevel 5 valores + zod + migracion 031"
```

---

### Task 3: Capture route — `niche` + `competition_level`

**Files:**
- Modify: `src/app/api/research/capture/route.ts`
- Test: `src/app/api/research/capture/route.test.ts`

**Interfaces:**
- Consumes: `competitionLevelFromScore` de `@/lib/research/competition`; `calculateScore` de `@/lib/research/scoring`
- Produces: records con `niche` (string|null) y `competition_level` (CompetitionLevel|null) — consumido por UI/popup

- [ ] **Step 1: Write the failing test**

Agregar a `src/app/api/research/capture/route.test.ts` (dentro del describe existente):

```ts
  it("completa niche con la categoria y deriva competition_level de la captura", async () => {
    mockGetUser.mockResolvedValue({ data: { user: { id: "user-1" } }, error: null });
    setupDbMocks({ resultData: [{ id: "new-id", name: "Test Product" }] });

    const req = createMockRequest("http://localhost/api/research/capture", {
      method: "POST",
      body: JSON.stringify(validPayload),
    });
    const res = await POST(req as never);
    expect(res.status).toBe(201);
    const inserted = mockInsert.mock.calls[0][0];
    expect(inserted.niche).toBe("Sports & Fitness");
    expect(inserted.competition_level).toBeDefined();
    expect(["very_low", "low", "medium", "high", "very_high"]).toContain(inserted.competition_level);
    const compScore = inserted.source_data.score_details.competencia.score;
    expect(compScore).toBeGreaterThanOrEqual(0);
    expect(compScore).toBeLessThanOrEqual(100);
  });

  it("guarda competition_level null cuando no hay datos", async () => {
    mockGetUser.mockResolvedValue({ data: { user: { id: "user-1" } }, error: null });
    setupDbMocks({ resultData: [{ id: "new-id", name: "Sin datos" }] });

    const req = createMockRequest("http://localhost/api/research/capture", {
      method: "POST",
      body: JSON.stringify({ products: [{ asin: "B0EMPTY123", title: "Sin datos" }], mode: "scraper" }),
    });
    const res = await POST(req as never);
    expect(res.status).toBe(201);
    const inserted = mockInsert.mock.calls[0][0];
    expect(inserted.competition_level).toBeNull();
  });
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run src/app/api/research/capture/route.test.ts`
Expected: FAIL — `inserted.niche` es `undefined` y `inserted.competition_level` es `undefined`

- [ ] **Step 3: Implement**

En `src/app/api/research/capture/route.ts`:

1. Agregar import:

```ts
import { competitionLevelFromScore } from "@/lib/research/competition";
```

2. En el `.map((p) => {` del bloque `records` (linea ~73), agregar `niche` y `competition_level` al record:

```ts
      return {
        user_id: user.id,
        org_id: orgId,
        name: p.title || "Unknown",
        asin_reference: p.asin,
        amazon_category: p.category ?? "",
        niche: p.category ?? null,
        competition_level: hasData ? competitionLevelFromScore(scoring.dimensions.competencia.score) : null,
        estimated_monthly_sales: p.estimated_monthly_sales ?? null,
```

(el resto del record queda igual)

- [ ] **Step 4: Run tests**

Run: `npx vitest run src/app/api/research/capture/route.test.ts`
Expected: PASS (todos, incluidos los 2 nuevos)

Run: `npx tsc --noEmit`
Expected: 0 errores

- [ ] **Step 5: Commit**

```bash
git add src/app/api/research/capture/route.ts src/app/api/research/capture/route.test.ts
git commit -m "feat: capture completa niche y deriva competition_level (5 niveles)"
```

---

### Task 4: i18n — keys de los 5 niveles

**Files:**
- Modify: `src/lib/i18n/es.json`
- Modify: `src/lib/i18n/en.json`
- Modify: `src/lib/i18n/ar.json`

**Interfaces:**
- Consumes: nada
- Produces: `research.competition.very_low`, `research.competition.very_high` en los 3 locales — consumido por Task 5

- [ ] **Step 1: Add keys to es.json**

Editar `src/lib/i18n/es.json` (junto a `research.competition.high/low/medium`):

```json
  "research.competition.very_low": "Muy baja",
  "research.competition.very_high": "Muy alta",
```

- [ ] **Step 2: Add keys to en.json**

```json
  "research.competition.very_low": "Very low",
  "research.competition.very_high": "Very high",
```

- [ ] **Step 3: Add keys to ar.json**

```json
  "research.competition.very_low": "منخفضة جداً",
  "research.competition.very_high": "مرتفعة جداً",
```

IMPORTANTE: `ar.json` es UTF-8 con BOM. Guardar con el mismo encoding (UTF-8). NO convertir a otra codificacion.

- [ ] **Step 4: Verify**

Run: `npx vitest run src/lib/i18n --run` (si existe test de i18n) o simplemente:
Run: `npx tsc --noEmit`
Expected: 0 errores

- [ ] **Step 5: Commit**

```bash
git add src/lib/i18n/es.json src/lib/i18n/en.json src/lib/i18n/ar.json
git commit -m "feat: i18n research.competition very_low/very_high"
```

---

### Task 5: UI — modal con 5 niveles + badge kanban traducido

**Files:**
- Modify: `src/app/(dashboard)/research/page.tsx`

**Interfaces:**
- Consumes: `CompetitionLevel` de `@/types`; keys `research.competition.*` de i18n
- Produces: modal Select con 5 opciones; badge kanban con texto traducido

- [ ] **Step 1: Update the modal Select**

En `src/app/(dashboard)/research/page.tsx:547`, reemplazar el cast y las opciones del Select de competencia:

Actual (linea 547):
```tsx
            <Select value={formCompetition || ""} onValueChange={(v) => setValue("competition_level", v as "low" | "medium" | "high", { shouldValidate: true })}>
```

Nuevo:
```tsx
            <Select value={formCompetition || ""} onValueChange={(v) => setValue("competition_level", v as CompetitionLevel, { shouldValidate: true })}>
```

Actual (lineas 550-553):
```tsx
                <SelectItem value="low">{t("research.competition.low", locale)}</SelectItem>
                <SelectItem value="medium">{t("research.competition.medium", locale)}</SelectItem>
                <SelectItem value="high">{t("research.competition.high", locale)}</SelectItem>
```

Nuevo:
```tsx
                <SelectItem value="very_low">{t("research.competition.very_low", locale)}</SelectItem>
                <SelectItem value="low">{t("research.competition.low", locale)}</SelectItem>
                <SelectItem value="medium">{t("research.competition.medium", locale)}</SelectItem>
                <SelectItem value="high">{t("research.competition.high", locale)}</SelectItem>
                <SelectItem value="very_high">{t("research.competition.very_high", locale)}</SelectItem>
```

- [ ] **Step 2: Update the import**

En `src/app/(dashboard)/research/page.tsx:45`, cambiar el import:

```tsx
import { ProductResearch } from "@/types";
```

por:

```tsx
import { ProductResearch, type CompetitionLevel } from "@/types";
```

- [ ] **Step 3: Update the kanban badge**

En `src/app/(dashboard)/research/page.tsx:403-407`, reemplazar el badge de competencia:

Actual:
```tsx
                        {item.competition_level && (
                          <span className="inline-flex items-center gap-1 text-[10px] text-amber-500 bg-amber-500/10 px-1.5 py-0.5 rounded capitalize">
                            <Star className="h-2.5 w-2.5" /> {item.competition_level}
                          </span>
                        )}
```

Nuevo:
```tsx
                        {item.competition_level && (
                          <span className="inline-flex items-center gap-1 text-[10px] text-amber-500 bg-amber-500/10 px-1.5 py-0.5 rounded">
                            <Star className="h-2.5 w-2.5" /> {t("research.competition." + item.competition_level, locale)}
                          </span>
                        )}
```

- [ ] **Step 4: Run verification**

Run: `npx tsc --noEmit`
Expected: 0 errores

Run: `npx vitest run src/lib/research/competition.test.ts src/validations/schemas.test.ts`
Expected: PASS

Run: `npm run build`
Expected: OK

- [ ] **Step 5: Commit**

```bash
git add src/app/\(dashboard\)/research/page.tsx
git commit -m "feat: modal y badge kanban con 5 niveles de competencia"
```

---

### Task 6: Extension — parsear `niche_score` en totals de AMZScout

**Files:**
- Modify: `src/chrome-extension/content/overlay-reader.ts`
- Test: `src/chrome-extension/content/overlay-reader.test.ts`

**Interfaces:**
- Consumes: nada nuevo
- Produces: `readAMZScout` completa `niche_score` (number|null) cuando el total title contiene "niche"/"nicho"

- [ ] **Step 1: Write the failing test**

Agregar al fixture `AMZSCOUT_TOTALS_HTML` (linea ~122) un total de Niche Score. Insertar DESPUES del bloque de Avg. Net Margin (despues de la linea 150), dentro de `<div class="totals ng-scope">`:

```html
        <div class="totals-item ng-scope" ng-if="options.opScore">
          <h4 class="totals-item__title ng-binding">Niche Score</h4>
          <span class="totals-item__val ng-binding">72</span>
        </div>
```

Agregar el test (dentro del describe `readAMZScout`):

```ts
  it("lee el Niche Score de los totals cuando esta presente", () => {
    const products = readAMZScout(makeContainer(AMZSCOUT_TOTALS_HTML), "B0GZYR5LJF");
    expect(products).toHaveLength(1);
    expect(products[0].niche_score).toBe(72);
  });
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run src/chrome-extension/content/overlay-reader.test.ts`
Expected: FAIL — `niche_score` es `null`

- [ ] **Step 3: Implement**

En `src/chrome-extension/content/overlay-reader.ts`, en `readAmzscoutTotals` (linea ~286), agregar dentro del loop `for (const { title, value } of totals)`:

```ts
    const titleLower = title.toLowerCase();
    if (titleLower.includes("niche") || titleLower.includes("nicho")) product.niche_score = parsed;
```

El loop completo queda:

```ts
  const product = emptyProduct(asin);
  for (const { title, value } of totals) {
    const parsed = parseLocalizedNumber(value);
    const titleLower = title.toLowerCase();
    if (title.includes("Mo Sales")) product.estimated_monthly_sales = parsed;
    if (title.includes("Mo Revenue")) product.estimated_monthly_revenue = parsed;
    if (title.includes("Sales Rank")) product.bsr = parsed;
    if (title.includes("Price") && parsed != null) {
      product.price = parsed;
      product.currency = detectCurrency(value);
    }
    if (title.includes("Net Margin")) product.net_margin_percent = percentToNumber(value);
    if (titleLower.includes("niche") || titleLower.includes("nicho")) product.niche_score = parsed;
  }
```

- [ ] **Step 4: Run tests**

Run: `npx vitest run src/chrome-extension/content/overlay-reader.test.ts`
Expected: PASS (todos, incluido el nuevo)

- [ ] **Step 5: Rebuild the extension**

Run: `npm run build:extension`
Expected: regenera `public/exteRB` sin errores

- [ ] **Step 6: Commit**

```bash
git add src/chrome-extension/content/overlay-reader.ts src/chrome-extension/content/overlay-reader.test.ts public/exteRB
git commit -m "feat: readAMZScout parsea niche_score de los totals"
```

---

### Task 7: Popup — derivar y mostrar nivel de competencia

**Files:**
- Create: `src/chrome-extension/popup/competition.ts`
- Modify: `src/chrome-extension/popup/popup.ts`

**Interfaces:**
- Consumes: `p.seller_count_fba`, `p.review_count`, `p.average_rating` del captured data (el popup muestra los datos ANTES del envio, por eso calcula localmente)
- Produces: `competitionLevelFromCaptured(p: { seller_count_fba?: number | null; review_count?: number | null; average_rating?: number | null }): string | null` — replica la formula del servidor (`scoring.ts:competenciaScore` + `competition.ts:competitionLevelFromScore`) para el popup; null si no hay datos

> NOTA: el popup se buildea aparte (no puede importar `@/lib`), por eso la formula se porta a la extension en un modulo propio. Es el espejo exacto de `competenciaScore` (`scoring.ts:36-62`): s=100, resta `sellers*3.5` (cap 75), `log2(reviews+1)*3` (cap 20), `(5-rating)*5` (cap 20), clamp 0-100.

- [ ] **Step 1: Write the failing test**

Crear `src/chrome-extension/popup/competition.test.ts`:

```ts
import { describe, it, expect } from "vitest";
import { competitionLevelFromCaptured } from "./competition";

describe("competitionLevelFromCaptured", () => {
  it("null si no hay datos de competencia", () => {
    expect(competitionLevelFromCaptured({})).toBeNull();
    expect(competitionLevelFromCaptured({ seller_count_fba: null })).toBeNull();
  });

  it("pocos sellers FBA -> competencia muy baja", () => {
    expect(competitionLevelFromCaptured({ seller_count_fba: 1, review_count: 10, average_rating: 4.8 })).toBe("very_low");
  });

  it("muchos sellers FBA -> competencia muy alta", () => {
    expect(competitionLevelFromCaptured({ seller_count_fba: 50, review_count: 3000, average_rating: 3.5 })).toBe("very_high");
  });

  it("caso medio -> media", () => {
    expect(competitionLevelFromCaptured({ seller_count_fba: 6, review_count: 300, average_rating: 4.0 })).toBe("medium");
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run src/chrome-extension/popup/competition.test.ts`
Expected: FAIL — `Cannot find module './competition'`

- [ ] **Step 3: Write minimal implementation**

Crear `src/chrome-extension/popup/competition.ts`:

```ts
export interface CompetitionSource {
  seller_count_fba?: number | null;
  review_count?: number | null;
  average_rating?: number | null;
}

function clamp(value: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, value));
}

export function competitionLevelFromCaptured(p: CompetitionSource): string | null {
  const sellers = p.seller_count_fba ?? 0;
  const reviews = p.review_count ?? 0;
  const rating = p.average_rating ?? 0;

  if (sellers <= 0 && reviews <= 0 && rating <= 0) return null;

  let s = 100;
  if (sellers > 0) s -= clamp(sellers * 3.5, 0, 75);
  if (reviews > 0) s -= clamp(Math.log2(reviews + 1) * 3, 0, 20);
  if (rating > 0) s -= clamp((5 - rating) * 5, 0, 20);
  const score = Math.round(clamp(s, 0, 100));

  if (score >= 80) return "very_low";
  if (score >= 60) return "low";
  if (score >= 40) return "medium";
  if (score >= 20) return "high";
  return "very_high";
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run src/chrome-extension/popup/competition.test.ts`
Expected: PASS (4 tests)

- [ ] **Step 5: Add a competition label map + badge in popup.ts**

En `src/chrome-extension/popup/popup.ts`, agregar al inicio del archivo (despues de imports):

```ts
import { competitionLevelFromCaptured } from "./competition";

const COMPETITION_LABELS: Record<string, string> = {
  very_low: "Muy baja",
  low: "Baja",
  medium: "Media",
  high: "Alta",
  very_high: "Muy alta",
};
```

- [ ] **Step 6: Update the ProductData interface**

En `src/chrome-extension/popup/popup.ts:14`, agregar el campo opcional:

```ts
  competition_level?: string | null;
```

- [ ] **Step 7: Compute and add the badge in the meta list**

En `src/chrome-extension/popup/popup.ts`, dentro del `forEach` de products, ANTES del array `meta` agregar:

```ts
      const competition = competitionLevelFromCaptured(p) ?? p.competition_level ?? null;
```

Y dentro del array `meta` (despues de la linea de margen, ~linea 150):

```ts
      if (competition) meta.push(`<span><span class="label">Competencia:</span> <span class="value">${escapeHtml(COMPETITION_LABELS[competition] ?? competition)}</span></span>`);
```

- [ ] **Step 8: Verify + rebuild**

Run: `npx vitest run src/chrome-extension/popup/competition.test.ts`
Expected: PASS

Run: `npx tsc --noEmit`
Expected: 0 errores

Run: `npm run build:extension`
Expected: OK

- [ ] **Step 9: Commit**

```bash
git add src/chrome-extension/popup/competition.ts src/chrome-extension/popup/competition.test.ts src/chrome-extension/popup/popup.ts public/exteRB
git commit -m "feat: popup deriva y muestra nivel de competencia"
```

---

### Task 8: Verificacion global + sync copia personal

**Files:**
- No code changes

**Interfaces:**
- Consumes: todo lo anterior

- [ ] **Step 1: Full verification**

Run: `npx tsc --noEmit`
Expected: 0 errores

Run: `npm run lint`
Expected: solo warnings pre-existentes

Run: `npm run test:run`
Expected: 255+ tests, todos PASS

Run: `npm run build`
Expected: OK

Run: `npm run build:extension`
Expected: OK

- [ ] **Step 2: Sync personal copy of the extension**

Copiar `public/exteRB` regenerado a la copia personal:
`C:\Users\Nacho\Desktop\Amazon\IMPORTANTE\exteRB\`

```powershell
Copy-Item -Recurse -Force "C:\Users\Nacho\Desktop\amazon-fba-manager-main\public\exteRB\*" "C:\Users\Nacho\Desktop\Amazon\IMPORTANTE\exteRB\"
```

- [ ] **Step 3: Commit any remaining + update vault**

```bash
git status
```

Si hay cambios sin commitear del vault, commitearlos. Actualizar:
- `App State.md` — features completadas (nicho + competencia 5 niveles), proximo pendiente E2E
- `Bugs Conocidos.md` — mover "Score no se recalcula al editar" si aplica; agregar nota de verificación E2E pendiente
- `PROMPT_NEXT_SESSION.md` — checkpoint actualizado
- `Daily Notes/2026-08-03.md` — registrar el trabajo

```bash
git add -A
git commit -m "vault: actualizar estado nicho + competencia 5 niveles"
```

- [ ] **Step 4: Report to user**

Resumir en español: qué se hizo, qué queda (aplicar migracion 031 en prod, verificar E2E con AMZScout), comandos de verificacion pasados.
