# Research — Grupos por Item + Papelera global — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Organizar los productos capturados en grupos por item con agrupación IA+fallback, comparación de competidores para elegir/descartar, y papelera global (soft delete) en la app.

**Architecture:** Tabla `research_groups` (grupo = item) + `group_id`/`deleted_at` en `product_research`. Agrupación heurística pura con opción de enriquecido Grok (`grouping.ts`). Papelera genérica vía helper puro `trash.ts` + endpoints `/api/trash`. Vista "Grupos" en `/research` como vista principal; página `/trash` global.

**Tech Stack:** Next.js 14 (src/app), Supabase, Zod, react-hook-form, dnd-kit (existente), lucide-react, sonner, vitest, xAI Grok (opcional, con fallback).

## Global Constraints

- Snake_case en DB/API, camelCase en frontend.
- TypeScript strict, nunca `any`.
- Zod para toda validación de entrada en rutas nuevas.
- sonner para toasts, nunca alert nativos.
- Sin comentarios en el código.
- `scoring.ts` / `competition.ts` / `calculations.ts` INMUTABLES (solo se consumen).
- `tsconfig` path alias `@/` → `src/`.
- Android/ios Capacitor target — no usar APIs de Node solo.
- Verificación por fase: `npx tsc --noEmit` + `npm run lint` + `npm run test:run` + `npm run build`.

---

### Task 1: Migraciones DB (034 grupos + 035 soft delete)

**Files:**
- Create: `supabase/migrations/034_research_groups.sql`
- Create: `supabase/migrations/035_soft_delete.sql`

**Interfaces:**
- Produces: tabla `research_groups(id, org_id, name, niche, amazon_category, search_keyword, deleted_at, created_at, updated_at)`; `product_research.group_id FK research_groups ON DELETE CASCADE`; `product_research.deleted_at`; `deleted_at` en ~21 tablas gestionables; índices.

- [ ] **Step 1: Crear `supabase/migrations/034_research_groups.sql`**

```sql
create table if not exists research_groups (
  id uuid primary key default gen_random_uuid(),
  org_id uuid not null references organizations(id) on delete cascade,
  name text not null,
  niche text,
  amazon_category text,
  search_keyword text,
  deleted_at timestamptz,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

create index if not exists research_groups_org_idx on research_groups(org_id, deleted_at);
create index if not exists research_groups_deleted_idx on research_groups(deleted_at);

create or replace function trg_research_groups_updated() returns trigger as $$
begin
  new.updated_at = now();
  return new;
end;
$$ language plpgsql;

drop trigger if exists tr_research_groups_updated on research_groups;
create trigger tr_research_groups_updated before update on research_groups
  for each row execute function trg_research_groups_updated();

alter table product_research
  add column if not exists group_id uuid references research_groups(id) on delete cascade,
  add column if not exists deleted_at timestamptz;

create index if not exists product_research_group_idx on product_research(group_id);
create index if not exists product_research_deleted_idx on product_research(deleted_at);

alter table product_research enable row level security;
alter table research_groups enable row level security;

drop policy if exists "org select research_groups" on research_groups;
create policy "org select research_groups" on research_groups
  for select using (org_id = (select current_setting('app.org_id', true)::uuid) or org_id in (select org_id from org_members where user_id = auth.uid()));

drop policy if exists "org insert research_groups" on research_groups;
create policy "org insert research_groups" on research_groups
  for insert with check (org_id = (select current_setting('app.org_id', true)::uuid) or org_id in (select org_id from org_members where user_id = auth.uid()));

drop policy if exists "org update research_groups" on research_groups;
create policy "org update research_groups" on research_groups
  for update using (org_id = (select current_setting('app.org_id', true)::uuid) or org_id in (select org_id from org_members where user_id = auth.uid()))
  with check (org_id = (select current_setting('app.org_id', true)::uuid) or org_id in (select org_id from org_members where user_id = auth.uid()));

drop policy if exists "org delete research_groups" on research_groups;
create policy "org delete research_groups" on research_groups
  for delete using (org_id = (select current_setting('app.org_id', true)::uuid) or org_id in (select org_id from org_members where user_id = auth.uid()));
```

- [ ] **Step 2: Crear `supabase/migrations/035_soft_delete.sql`**

```sql
alter table products add column if not exists deleted_at timestamptz;
alter table inventory add column if not exists deleted_at timestamptz;
alter table suppliers add column if not exists deleted_at timestamptz;
alter table product_suppliers add column if not exists deleted_at timestamptz;
alter table supplier_quotes add column if not exists deleted_at timestamptz;
alter table purchase_orders add column if not exists deleted_at timestamptz;
alter table fba_shipments add column if not exists deleted_at timestamptz;
alter table fba_shipment_items add column if not exists deleted_at timestamptz;
alter table returns add column if not exists deleted_at timestamptz;
alter table reimbursements add column if not exists deleted_at timestamptz;
alter table expenses add column if not exists deleted_at timestamptz;
alter table amazon_payouts add column if not exists deleted_at timestamptz;
alter table ppc_campaigns add column if not exists deleted_at timestamptz;
alter table ppc_daily_metrics add column if not exists deleted_at timestamptz;
alter table tasks add column if not exists deleted_at timestamptz;
alter table members add column if not exists deleted_at timestamptz;
alter table company_members add column if not exists deleted_at timestamptz;
alter table board_decisions add column if not exists deleted_at timestamptz;
alter table reorder_rules add column if not exists deleted_at timestamptz;
alter table alert_rules add column if not exists deleted_at timestamptz;
alter table scheduled_reports add column if not exists deleted_at timestamptz;
alter table product_research add column if not exists deleted_at timestamptz;
alter table research_groups add column if not exists deleted_at timestamptz;
```

- [ ] **Step 3: Commit**

```bash
git add supabase/migrations/034_research_groups.sql supabase/migrations/035_soft_delete.sql
git commit -m "feat: migraciones research_groups + soft delete papelera"
```

---

### Task 2: Helper puro `src/lib/trash.ts` (TDD)

**Files:**
- Create: `src/lib/trash.ts`
- Test: `src/lib/trash.test.ts`

**Interfaces:**
- Consumes: nada (puro, sin imports de la app).
- Produces:
  - `type TrashEntity = "product_research" | "research_groups" | "products" | ...` (todas las gestionables).
  - `TRASH_COLUMN = "deleted_at"` (const).
  - `normalizeTable(entity: TrashEntity): string` → mapeo seguro entity→tabla.
  - `cascadeProductsForGroup`: dado un grupo id, los productos `group_id` involucrados.
  - `isGroupEntity(entity): boolean`.
  - Nota: este helper NO ejecuta SQL (el route usa supabase). Expone datos estáticos + builders.

- [ ] **Step 1: Escribir el test que falla**

```ts
import { describe, it, expect } from "vitest";
import { TRASH_ENTITIES, normalizeTable, isGroupEntity } from "./trash";

describe("trash", () => {
  it("mapea entities gestionables a tablas", () => {
    expect(normalizeTable("product_research")).toBe("product_research");
    expect(normalizeTable("suppliers")).toBe("suppliers");
    expect(() => normalizeTable("sales" as never)).toThrow();
  });
  it("marca solo grupos", () => {
    expect(isGroupEntity("research_groups")).toBe(true);
    expect(isGroupEntity("products")).toBe(false);
  });
});
```

- [ ] **Step 2: Correr y verificar que falla**

Run: `npx vitest run src/lib/trash.test.ts`
Expected: FAIL (no module).

- [ ] **Step 3: Implementar `src/lib/trash.ts`**

```ts
export const TRASH_ENTITIES = [
  "research_groups",
  "product_research",
  "products",
  "inventory",
  "suppliers",
  "product_suppliers",
  "supplier_quotes",
  "purchase_orders",
  "fba_shipments",
  "fba_shipment_items",
  "returns",
  "reimbursements",
  "expenses",
  "amazon_payouts",
  "ppc_campaigns",
  "ppc_daily_metrics",
  "tasks",
  "members",
  "company_members",
  "board_decisions",
  "reorder_rules",
  "alert_rules",
  "scheduled_reports",
] as const;

export type TrashEntity = (typeof TRASH_ENTITIES)[number];

export const TRASH_COLUMN = "deleted_at";

export function normalizeTable(entity: string): TrashEntity {
  if ((TRASH_ENTITIES as readonly string[]).includes(entity)) return entity as TrashEntity;
  throw new Error(`trash: entidad no gestionable '${entity}'`);
}

export function isGroupEntity(entity: string): boolean {
  return normalizeTable(entity) === "research_groups";
}
```

- [ ] **Step 4: Correr y verificar que pasa**

Run: `npx vitest run src/lib/trash.test.ts`
Expected: PASS (2 tests).

- [ ] **Step 5: Commit**

```bash
git add src/lib/trash.ts src/lib/trash.test.ts
git commit -m "feat: helper trash (entidades gestionables + normalizacion)"
```

---

### Task 3: Agrupación IA + fallback — `src/lib/research/grouping.ts` (TDD)

**Files:**
- Create: `src/lib/research/grouping.ts`
- Test: `src/lib/research/grouping.test.ts`

**Interfaces:**
- Consumes: `CapturedProduct` (de `src/lib/research/types.ts`), nada más.
- Produces:
  - `type GroupMatch = { group_id: string | null; group_name: string; niche: string | null; amazon_category: string | null; match: "existing" | "new" | "fallback"; }`
  - `normalizeItemName(raw: string): string` — minus + sin acentos + sin stopwords.
  - `findGroupByAsin(groups: Array<{ id: string; products: Array<{ asin_reference: string | null }> }>, asin: string | null): string | null`
  - `findGroupByNicheAndName(groups: Array<{ id: string; name: string; niche: string | null; products: Array<{ asin_reference: string | null }> }>, name: string, niche: string | null): string | null`
  - `fallbackClassify(product: CapturedProduct, groups: Array<...>): GroupMatch`
  - `classifyToGroup(product, groups, ai: "grok" | "off"): Promise<GroupMatch>` — si `"grok"`, llama a `src/lib/ai/group.ts` (Task 4) y hace `zod` parse; ante cualquier error cae a `fallbackClassify`.

- [ ] **Step 1: Escribir el test que falla**

```ts
import { describe, it, expect } from "vitest";
import { normalizeItemName, findGroupByAsin, findGroupByNicheAndName, fallbackClassify } from "./grouping";
import type { CapturedProduct } from "@/lib/research/types";

const groups = [
  { id: "g1", name: "Foam Roller MarcaX 36in", niche: "Foam Rollers", amazon_category: "Home & Kitchen", products: [{ asin_reference: "B016NE9A2A" }] },
  { id: "g2", name: "Yoga Mat MarcaY", niche: "Exercise Mats", amazon_category: "Sports & Outdoors", products: [{ asin_reference: "B0ABCDEF01" }] },
];

const prod = (overrides: Partial<CapturedProduct> = {}): CapturedProduct => ({
  asin: "B016NE9A2A", title: "Foam Roller MarcaX 36 inch", price: 19.99, currency: "USD",
  source: "amzscout", capture_url: "https://amazon.com/dp/B016NE9A2A", ...overrides,
});

describe("grouping", () => {
  it("normaliza nombre (minus, acentos, stopwords)", () => {
    expect(normalizeItemName("Foam Roller MarcaX 36 inch")).toBe("foam roller marcax 36 inch");
    expect(normalizeItemName("The Yoga Mat!")).toContain("yoga mat");
  });
  it("encuentra grupo por ASIN exacto", () => {
    expect(findGroupByAsin(groups, "b016ne9a2a")).toBe("g1");
    expect(findGroupByAsin(groups, null)).toBeNull();
    expect(findGroupByAsin(groups, "ZZZZ")).toBeNull();
  });
  it("encuentra grupo por nicho + nombre superpuesto", () => {
    const g = groups.map((x) => ({ ...x }));
    expect(findGroupByNicheAndName(g, "Foam Roller MarcaX 36 inch", "Foam Rollers")).toBe("g1");
    expect(findGroupByNicheAndName(g, "Metal Water Bottle", "Home & Kitchen")).toBeNull();
  });
  it("fallbackClassify: mismo ASIN → existing", () => {
    const r = fallbackClassify(prod(), groups);
    expect(r.match).toBe("existing");
    expect(r.group_id).toBe("g1");
  });
  it("fallbackClassify: mismo nicho+nombre → existing", () => {
    const r = fallbackClassify(prod({ asin: "SPECIALNEW11", capture_url: "https://amazon.com/dp/SPECIALNEW11" }), groups);
    expect(r.match).toBe("existing");
    expect(r.group_id).toBe("g1");
  });
  it("fallbackClassify: sin match → new", () => {
    const r = fallbackClassify(prod({ asin: "BRANDNEW111", title: "Ceramic Mug Set", capture_url: "https://amazon.com/dp/BRANDNEW111" }), groups);
    expect(r.match).toBe("new");
    expect(r.group_id).toBeNull();
    expect(r.group_name).toContain("Ceramic Mug Set");
  });
});
```

- [ ] **Step 2: Correr y verificar que falla**

Run: `npx vitest run src/lib/research/grouping.test.ts`
Expected: FAIL (no module).

- [ ] **Step 3: Implementar `src/lib/research/grouping.ts`**

```ts
import type { CapturedProduct } from "@/lib/research/types";

export type GroupMatch = {
  group_id: string | null;
  group_name: string;
  niche: string | null;
  amazon_category: string | null;
  match: "existing" | "new" | "fallback";
};

type GroupLike = {
  id: string;
  name: string;
  niche: string | null;
  products: Array<{ asin_reference: string | null }>;
};

const STOPWORDS = new Set(["the", "de", "la", "el", "del", "y", "e", "a", "to", "for", "with", "con", "en", "para", "un", "una", "set", "kit"]);

export function normalizeItemName(raw: string): string {
  return raw
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9\s]/g, " ")
    .split(/\s+/)
    .filter((w) => w.length > 1 && !STOPWORDS.has(w))
    .join(" ");
}

function tokensEq(a: string, b: string): boolean {
  const ta = new Set(a.split(" "));
  const tb = new Set(b.split(" "));
  for (const t of ta) if (tb.has(t)) return true;
  for (const t of tb) if (ta.has(t)) return true;
  return false;
}

export function findGroupByAsin(groups: GroupLike[], asin: string | null): string | null {
  if (!asin) return null;
  const want = asin.toLowerCase();
  for (const g of groups) {
    if (g.products.some((p) => p.asin_reference?.toLowerCase() === want)) return g.id;
  }
  return null;
}

export function findGroupByNicheAndName(groups: GroupLike[], name: string, niche: string | null): string | null {
  const norm = normalizeItemName(name);
  if (!norm) return null;
  for (const g of groups) {
    if (niche && g.niche && g.niche.toLowerCase() === niche.toLowerCase()) {
      if (tokensEq(norm, normalizeItemName(g.name))) return g.id;
    }
  }
  return null;
}

export function fallbackClassify(product: CapturedProduct, groups: GroupLike[]): GroupMatch {
  const byAsin = findGroupByAsin(groups, product.asin);
  if (byAsin) {
    const g = groups.find((x) => x.id === byAsin)!;
    return { group_id: g.id, group_name: g.name, niche: g.niche, amazon_category: g.amazon_category ?? null, match: "existing" };
  }
  const byNiche = findGroupByNicheAndName(groups, product.title, product.category ?? null);
  if (byNiche) {
    const g = groups.find((x) => x.id === byNiche)!;
    return { group_id: g.id, group_name: g.name, niche: g.niche, amazon_category: g.amazon_category ?? null, match: "existing" };
  }
  return {
    group_id: null,
    group_name: product.title.slice(0, 120),
    niche: product.category ?? null,
    amazon_category: null,
    match: "new",
  };
}

export async function classifyToGroup(
  product: CapturedProduct,
  groups: GroupLike[],
  ai: "grok" | "off" = "off"
): Promise<GroupMatch> {
  if (ai === "off") return fallbackClassify(product, groups);
  try {
    const { classifyWithGrok } = await import("@/lib/research/grok-group");
    const res = await classifyWithGrok(product);
    const existing = res.match === "existing" ? groups.find((g) => g.id === res.group_id) : undefined;
    if (res.match === "existing" && existing) {
      return { group_id: existing.id, group_name: existing.name, niche: existing.niche, amazon_category: existing.amazon_category ?? null, match: "existing" };
    }
    return {
      group_id: null,
      group_name: res.group_name.slice(0, 120),
      niche: res.niche,
      amazon_category: res.amazon_category,
      match: "new",
    };
  } catch {
    return fallbackClassify(product, groups);
  }
}
```

Nota: `GroupLike.amazon_category` falta en el tipo; agrégalo a `GroupLike`:

```ts
type GroupLike = {
  id: string;
  name: string;
  niche: string | null;
  amazon_category: string | null;
  products: Array<{ asin_reference: string | null }>;
};
```

- [ ] **Step 4: Correr y verificar que pasa**

Run: `npx vitest run src/lib/research/grouping.test.ts`
Expected: PASS (5 tests).

- [ ] **Step 5: Commit**

```bash
git add src/lib/research/grouping.ts src/lib/research/grouping.test.ts
git commit -m "feat: agrupacion por item IA+fallback (grouping.ts)"
```

---

### Task 4: Integración Grok opcional — `src/lib/research/grok-group.ts`

**Files:**
- Create: `src/lib/research/grok-group.ts`
- Test: `src/lib/research/grok-group.test.ts`

**Interfaces:**
- Consumes: `getXAIClient()` de `src/lib/ai/client.ts` (ya existe), `CapturedProduct`.
- Produces: `classifyWithGrok(product: CapturedProduct): Promise<{ group_name: string; niche: string | null; amazon_category: string | null; match: "existing" | "new"; group_id: string | null }>` — SIEMPRE lanza/zod-parsea; el caller (`classifyToGroup`) hace fallback.

- [ ] **Step 1: Escribir el test que falla**

```ts
import { describe, it, expect, vi, beforeEach } from "vitest";
import { classifyWithGrok } from "./grok-group";
import type { CapturedProduct } from "@/lib/research/types";

vi.mock("@/lib/ai/client", () => ({ getXAIClient: () => null as never }));

const prod = (): CapturedProduct => ({
  asin: "B016NE9A2A", title: "Foam Roller MarcaX", price: 19.99, currency: "USD",
  source: "amzscout", capture_url: "https://amazon.com/dp/B016NE9A2A", category: "Foam Rollers",
});

describe("grok-group", () => {
  beforeEach(() => vi.resetModules());
  it("lanza si no hay cliente (fallback del caller)", async () => {
    await expect(classifyWithGrok(prod())).rejects.toThrow();
  });
});
```

- [ ] **Step 2: Implementar `src/lib/research/grok-group.ts`**

```ts
import { z } from "zod";
import { getXAIClient } from "@/lib/ai/client";
import type { CapturedProduct } from "@/lib/research/types";

const grokGroupSchema = z.object({
  group_name: z.string().min(1),
  niche: z.string().nullable().optional(),
  amazon_category: z.string().nullable().optional(),
  match: z.enum(["existing", "new"]),
  group_id: z.string().nullable().optional(),
});

export async function classifyWithGrok(product: CapturedProduct) {
  const client = getXAIClient();
  if (!client) throw new Error("XAI no configurado");
  const completion = await client.chat.completions.create({
    model: "grok-4.5",
    response_format: { type: "json_object" },
    messages: [
      { role: "system", content: "Sos un analista de productos Amazon FBA. Respondé JSON exacto." },
      { role: "user", content: `Clasificá este producto en un grupo por item. JSON: {group_name, niche, amazon_category, match, group_id}. Producto: ${JSON.stringify({ asin: product.asin, title: product.title, category: product.category, search_keyword: product.searchKeyword ?? null })}` },
    ],
  });
  const raw = completion.choices[0]?.message?.content;
  if (!raw) throw new Error("respuesta vacia");
  return grokGroupSchema.parse(JSON.parse(raw));
}
```

- [ ] **Step 3: Correr test + agregar IMPORTANTE al `grouping.ts`**: `classifyToGroup("grok")` usará este módulo. Correr test:

Run: `npx vitest run src/lib/research/grok-group.test.ts`
Expected: PASS (lanza por cliente null).

- [ ] **Step 4: Commit**

```bash
git add src/lib/research/grok-group.ts src/lib/research/grok-group.test.ts
git commit -m "feat: clasificacion Grok opcional con fallback"
```

---

### Task 5: API grupos — CRUD + restore + cascade

**Files:**
- Create: `src/app/api/research/groups/route.ts`
- Create: `src/app/api/research/groups/[id]/route.ts`
- Create: `src/app/api/research/groups/restore/route.ts`
- Test: `src/app/api/research/groups/route.test.ts` (seguir patrón de routes existentes con mocks de supabase).

**Interfaces:**
- Consumes: `normalizeTable`, `isGroupEntity` de trash.ts; `getOrgId` (patrón auth existente en routes research).
- Produces:
  - `GET /api/research/groups` → `{ data: Array<ResearchGroupWithProducts> }`
  - `POST /api/research/groups` body `{ name, niche?, amazon_category?, search_keyword? }` → `{ data }`
  - `PUT /api/research/groups?id=` body parcial → `{ data }`
  - `DELETE /api/research/groups?id=` → soft delete grupo + productos (set deleted_at)
  - `DELETE /api/research/groups?id=&permanent=true` → borrado real en cascada
  - `POST /api/research/groups/restore` body `{ id }` → restaura grupo + productos

- [ ] **Step 1: Leer patrón de auth/org en `src/app/api/research/route.ts`** y copiar helpers (getSupabase, getOrgId).

- [ ] **Step 2: Escribir `groups/route.ts`**

Implementar GET (select research_groups where deleted_at is null + product_research group_id) y POST (zod: name required).

```ts
import { NextResponse, type NextRequest } from "next/server";
import { z } from "zod";
import { createClient } from "@/lib/supabase/server";
import { getSupabaseMiddlewareOrg } from "..."; // usar mismo patrón de research/route.ts

const groupCreateSchema = z.object({
  name: z.string().trim().min(1).max(200),
  niche: z.string().trim().max(200).nullish(),
  amazon_category: z.string().trim().max(100).nullish(),
  search_keyword: z.string().trim().max(200).nullish(),
});
```

**Nota crítica:** Este template depende del patrón exacto de `src/app/api/research/route.ts`. El implementador DEBE leer ese archivo y reutilizar auth (`getUserId`/`getOrgId`) y estilo de respuesta (`{ data }`), y los tests siguen el patrón de `src/app/api/research/route.test.ts` (mockeando `@/lib/supabase/server`).

- [ ] **Step 3: Escribir `groups/[id]/route.ts`** (PUT, DELETE con `permanent=true`).

Comportamiento delete:
```ts
// soft: update research_groups set deleted_at=now() where id=? and org_id=?
//        + update product_research set deleted_at=now() where group_id=? and org_id=? and deleted_at is null
// permanent: delete from product_research where group_id=? and org_id=?; delete from research_groups where id=? and org_id=?
```

- [ ] **Step 4: Escribir `groups/restore/route.ts`** (POST body `{ id }`) → restaura ambos (deleted_at = null).

- [ ] **Step 5: Escribir tests** (patrón route.test.ts, mock supabase): POST crea, PUT actualiza, DELETE soft marca ambos, DELETE permanent borra cascada, restore desmarca. Mínimo 4 tests.

- [ ] **Step 6: Verificar**

Run: `npx vitest run src/app/api/research/groups/route.test.ts`
Expected: PASS. Luego `npx tsc --noEmit` (0 errores) + `npm run lint`.

- [ ] **Step 7: Commit**

```bash
git add src/app/api/research/groups/
git commit -m "feat: API CRUD grupos + soft delete + restore + cascade"
```

---

### Task 6: API research — mover competidor de grupo

**Files:**
- Modify: `src/app/api/research/route.ts` (agregar handling, o endpoint nuevo)
- Crear `src/app/api/research/[id]/group/route.ts`

**Interfaces:**
- Consumes: auth pattern, `ProductResearch`.
- Produces: `POST /api/research/[id]/group` body `{ group_id: string | null }` → `PUT product_research set group_id where id and org`.

- [ ] **Step 1: Crear ruta `[id]/group/route.ts`** (POST body `{ group_id: string | null }`, zod, PUT en su tabla, 404 si no existe, 200 `{ data }`).
- [ ] **Step 2: Tests** (mock supabase): mover a grupo válido, mover a ningún grupo (null), 404 si no existe. Mínimo 2 tests.
- [ ] **Step 3: Verificar** (`npx tsc --noEmit`, `npm run lint`, vitest). **Commit**.

---

### Task 7: API trash — listar, restaurar, borrado definitivo

**Files:**
- Create: `src/app/api/trash/route.ts`
- Create: `src/app/api/trash/restore/route.ts`
- Test: `src/app/api/trash/route.test.ts`

**Interfaces:**
- Consumes: `normalizeTable`, `isGroupEntity`, `TRASH_ENTITIES` de `src/lib/trash.ts`.
- Produces:
  - `GET /api/trash?entity=products&q=` → `{ data: Array<{id, name, deleted_at}> }` (mapeo columna texto por entity).
  - `DELETE /api/trash` body `{ entity, id }` → borrado definitivo (grupo → cascada).
  - `POST /api/trash/restore` body `{ entity, id }` → restaurar (grupo → restaura productos).

- [ ] **Step 1: Implementar `trash/route.ts`** (GET lista por entidad con `deleted_at is not null`; DELETE borra real).
- [ ] **Step 2: Implementar `trash/restore/route.ts`**.
- [ ] **Step 3: Tests** (mock supabase): GET filtra solo borrados, DELETE normal, DELETE grupo → cascada, restore grupo → restaura productos. Mínimo 4 tests.
- [ ] **Step 4: Verificar** (`npx tsc --noEmit`, `npm run lint`, vitest). **Commit**.

---

### Task 8: Capture route → agrupar

**Files:**
- Modify: `src/app/api/research/capture/route.ts`
- Test: `src/app/api/research/capture/route.test.ts` (extender)

**Interfaces:**
- Consumes: `classifyToGroup`, `GroupMatch`.
- Produces: capture ahora asigna `group_id` (creando grupo si new) bajo `ai = "off"` por defecto (fallback heurístico) — piloto configurable a "grok" cuando se active.

- [ ] **Step 1: Leer capture route actual** y ubicar el loop de upsert por producto.
- [ ] **Step 2: Antes del upsert**: fetch grupos vigentes del org (una vez); para cada producto, `classifyToGroup(product, groups, "off")`; si `match==="new"`, insert grupo y capturar id; si `"existing"`, usar group_id. Luego incluir `group_id` en el record.
- [ ] **Step 3: Tests**: caso nuevo grupo creado (titulo unico), caso match ASIN, caso match nicho+nombre, update de ASIN existente mantiene grupo. Extender fixtures existentes. Mínimo 3 tests nuevos.
- [ ] **Step 4: Verificar** (`npx tsc --noEmit`, `npm run lint`, vitest build). **Commit**.

---

### Task 9: i18n keys (es/en/ar)

**Files:**
- Modify: `src/lib/i18n/es.json`, `en.json`, `ar.json`
- Modify: `src/lib/help-content.ts` (glosario: research_groups, competidor, papelera) y regenerar `GLOSARIO.md`.

**Interfaces:**
- Produce keys usadas por Tasks 10-11: `research.groups.view`, `research.groups.filter_sort`, `research.groups.empty`, `research.card.choose`, `research.card.discard`, `research.card.move_group`, `research.ungrouped`, `trash.*`, etc.

- [ ] **Step 1: Agregar bloque `research.groups` y `trash` en los 3 JSON** (es/en/ar) con las keys de vista grupos, acciones competidor, bucket sin grupo, papelera (title, restore, permanent, confirm).
- [ ] **Step 2: Agregar términos al glosario** en `src/lib/help-content.ts` (HELP_GLOSSARY: "Research Group", "Competidor", "Papelera / Soft Delete") + `npm run build:glossary`.
- [ ] **Step 3: Verificar** (`npm run build:glossary` regenera GLOSARIO.md; `npx tsc --noEmit`, `npm run lint`). **Commit**.

---

### Task 10: UI — vista Grupos en `/research`

**Files:**
- Create: `src/components/research/group-card.tsx`
- Create: `src/components/research/group-competitors.tsx`
- Modify: `src/app/(dashboard)/research/page.tsx`
- Test: `src/components/research/group-competitors.test.tsx` (si hay infra de RTL; si no, helpers puros de orden/filtro en `src/lib/research/group-data.ts` con vitest).

**Interfaces:**
- Consumes: `GET /api/research/groups`, `POST /api/research/[id]/group`, `PUT/DELETE /api/research`, i18n keys Task 9.
- Produces: vista principal de research con filtros/orden + hover/expansión de grupo + acciones competidor.

- [ ] **Step 1: Helper puro `group-data.ts`** (TDD): `sortGroups(groups, sortKey)`, `bestScore(group)` (máx score entre competidores), `itemCompetition(group)` (menor competition_level), `filterGroups(groups, {q, status, competition, scoreRange})`. Test con vitest.
- [ ] **Step 2: `group-competitors.tsx`**: tabla de competidores (columna imagen/ASIN/source/score/ventas-m/revenue-m/precio/margen/sellers/BSR/competencia/fecha) + acciones (Elegir, Descartar, DeepDive trigger via props, Editar, Mover). Recibe `items`, `locale`, callbacks. Reusa `fmtCompact`, `scoreBadgeClass`, `competitionBadgeClass` de `card-data.ts`.
- [ ] **Step 3: `group-card.tsx`**: tarjeta de grupo (nombre, nicho, #competidores, mejor score, competencia) colapsable; al expandir renderiza `group-competitors`.
- [ ] **Step 4: Integrar en `research/page.tsx`**: tercer toggle (Grupos), fetch `/api/research/groups`, estados de filter/sort, bucket "Sin grupo", sidebar/dropdown de orden, toasts. Mantener kanban y lista intactos.
- [ ] **Step 5: Verificar** — `npx tsc --noEmit`, `npm run lint`, `npm run test:run`, `npm run build`. **Commit**.

---

### Task 11: UI — Página Papelera `/trash`

**Files:**
- Create: `src/app/(dashboard)/trash/page.tsx`
- Modify: `src/lib/navigation.ts` (nav item Trash)
- Modify: `src/lib/i18n/{es,en,ar}.json` (si faltó en Task 9)

**Interfaces:**
- Consumes: `/api/trash`, `/api/trash/restore`, keys trash de Task 9.
- Produces: página con selector de entidad, búsqueda, lista de borrados, Restaurar, Borrar definitivo con confirmación textual.

- [ ] **Step 1: Implementar `trash/page.tsx`** (entity select, GET list, tabla, restore button, permanent delete con diálogo de confirmación escribiendo "BORRAR"). Patrón UI consistente (DataTableWrapper, EmptyState, sonner).
- [ ] **Step 2: Agregar nav item** en `src/lib/navigation.ts`.
- [ ] **Step 3: Verificar** (`npx tsc --noEmit`, lint, test, build). **Commit**.

---

### Task 12: Verificación final + vault

**Files:**
- Modify: vault notes (`Daily Notes/2026-08-14.md`, `PROMPT_NEXT_SESSION.md`, `App State.md`, `Bugs Conocidos.md`, `Learning Log.md`).

- [ ] **Step 1: Verificación completa**
Run: `npx tsc --noEmit` → 0 errores; `npm run lint` → solo warnings; `npm run test:run` → PASS; `npm run build` → OK; `npm run build:glossary` → regenera GLOSARIO.md.

- [ ] **Step 2: Actualizar el vault** (Daily Note + checkpoint).
- [ ] **Step 3: Commit final** del vault.