# Mostrar source_data + score enriquecido en la UI del research

## Contexto

La extensión Chrome captura ~24 campos por producto en `source_data` (JSONB): `bsr`, `estimated_monthly_sales`, `estimated_monthly_revenue`, `net_margin_percent`, `listing_health_score`, `niche_score`, `brand`, `seller_count_fba`, `estimated_fba_fee`, etc. Estos datos quedan **escondidos**: la UI del research (cards kanban) no muestra ninguno, el scoring ignora `niche_score` y el deep dive llama a `/api/research/scoring` con inputs incompletos (omite revenue, sellers, fees).

Objetivo (decidido con el usuario): **mostrar** los datos capturados en las cards del kanban y **enriquecer el scoring** con los inputs que hoy ignora, calculando el score al momento de capturar (sin LLM).

## Decisiones

1. **Persistencia del score**: columna `score INTEGER` en `product_research` (migración `030_add_score.sql`), + `score_details` (las 4 dimensiones) dentro de `source_data`. Se puede ordenar/filtrar por score desde la DB.
2. **Cálculo**: en `POST /api/research/capture`, por cada producto se arma el `ScoringInput` desde el `CapturedProduct` + source_data y se llama `calculateScore()` (función pura existente en `src/lib/research/scoring.ts`).
3. **Upsert**: en el UPDATE por ASIN existente también se refresca `score` (la recolección refresca datos).
4. **UI**: las cards del kanban muestran un bloque de badges con los datos capturados, solo si existen.
5. **i18n**: etiquetas nuevas van por claves `research.card.*` en es/en/ar.

## Cambios por archivo

### 1. Migración — NUEVO `supabase/migrations/030_add_score.sql`

```sql
ALTER TABLE product_research ADD COLUMN score INTEGER;
```

(La tabla `product_research` ya tiene `source_data JSONB` de la migración `029`.)

### 1b. Tipo — `src/types/index.ts`

- Agregar `score?: number | null;` a la interface `ProductResearch` (junto a `source_data`).

### 2. Capture route — `src/app/api/research/capture/route.ts`

- Importar `calculateScore` y `ScoringInput` de `src/lib/research/`.
- Por cada producto del payload, construir el `ScoringInput`:

| Campo ScoringInput | Origen |
|---|---|
| `estimated_monthly_sales` | `CapturedProduct.estimated_monthly_sales` |
| `estimated_monthly_revenue` | `CapturedProduct.estimated_monthly_revenue` |
| `bsr` | `CapturedProduct.bsr` |
| `review_count` | `CapturedProduct.review_count` |
| `average_rating` | `CapturedProduct.average_rating` |
| `seller_count_fba` | `CapturedProduct.seller_count_fba` |
| `price` | `CapturedProduct.price` |
| `estimated_fba_fee` | `CapturedProduct.estimated_fba_fee` |
| `estimated_cogs` | `null` (no lo captura la extensión; el scoring usa margen default 50%) |

- `const { total, dimensions } = calculateScore(input)`.
- Guardar `score: total` en la columna y `score_details: dimensions` dentro de `source_data`.
- En el UPDATE del upsert (ASIN existente), incluir `score` y el `source_data` actualizado con `score_details`.

### 3. Cards kanban — `src/app/(dashboard)/research/page.tsx`

En la card (líneas ~350-393), agregar bajo los badges existentes un bloque opcional:

```tsx
{(item.score !== null || hasSourceData(item)) && (
  <div className="flex flex-wrap gap-1.5 pt-0.5">
    {item.score !== null && <ScoreBadge score={item.score} />}
    {bsr > 0 && <span className="badge">BSR #{bsr}</span>}
    {sd.estimated_monthly_sales > 0 && <span>~{fmtCompact(sd.estimated_monthly_sales)} ventas/m</span>}
    {sd.estimated_monthly_revenue > 0 && <span>${fmtCompact(sd.estimated_monthly_revenue)}/m</span>}
    {sd.net_margin_percent != null && <span>Margen {sd.net_margin_percent}%</span>}
    {sd.listing_health_score != null && <span>Health {sd.listing_health_score}</span>}
  </div>
)}
```

- `sd` = `item.source_data` (tipado `Record<string, unknown> | null`).
- Helpers locales (mismo archivo):
  - `numField(sd, key): number | null` — lee un número de source_data de forma segura (acepta number o string numérico).
  - `fmtCompact(n): string` — formato compacto localizado: `1200 → "1.2K"`, `91992 → "91.9K"` (`Intl.NumberFormat(locale, { notation: "compact" })`).
- **Fuente de BSR**: `item.bsr` (columna) con fallback a `sd.bsr`.
- **Score badge**: color por rango igual que el deep dive — `>=70 emerald`, `>=40 amber`, else rose. Icono `BarChart3`.
- El bloque se renderiza solo si `item.score !== null` o `source_data` tiene al menos un campo útil.

### 4. i18n — `src/lib/i18n/{es,en,ar}.json`

Claves nuevas bajo `research.card.*`:
- `bsr` — "BSR"
- `sales_month` — "ventas/m"
- `revenue_month` — "/m"
- `margin` — "Margen"
- `health` — "Health"
- `score` — "Score" (aria-label del badge, opcional)

## Data flow

```
Extensión → POST /api/research/capture
  → por producto: build ScoringInput → calculateScore() → total + dimensions
  → INSERT/UPDATE product_research: { ..., score: total, source_data: { ..., score_details: dimensions } }
GET /api/research (select *) → frontend → card kanban muestra badges desde score + source_data
```

## Testing

- **`src/app/api/research/capture/route.test.ts`** (existente, +tests):
  - Producto con source_data completo (sales, revenue, bsr, reviews, rating, sellers, price, fees) → la respuesta/insert incluye `score > 0` y `source_data.score_details` con las 4 dimensiones.
  - Producto sin datos → `score` null/0.
  - UPDATE de ASIN existente refresca `score` (antes vs después).
- **Helpers de UI** (`numField`, `fmtCompact`) — si se extraen a `src/lib/`, test unitario; si quedan inline en page.tsx, se cubren vía el componente (sin test dedicado; el proyecto no testea page.tsx).

## Fuera de scope

- No se toca `deep-dive-panel.tsx` (sigue usando `/api/research/scoring` tal cual; sus inputs incompletos son pre-existentes y se pueden abordar en otro spec).
- No se muestra `niche_score` de AMZScout (campo capturado pero sin mapeo a scoring; se muestra solo `listing_health_score` y `net_margin_percent` como passthrough).
- No se agrega ordenamiento/filtro por score en la UI (la columna queda disponible para un futuro spec).
- No se muestran badges en la vista lista ni en el modal de edición.
