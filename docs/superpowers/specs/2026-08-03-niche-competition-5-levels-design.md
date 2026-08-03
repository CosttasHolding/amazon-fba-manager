# Spec — Nicho + Competencia en 5 niveles (popup + app)

Fecha: 2026-08-03
Estado: Aprobado por el usuario

## Contexto

La captura de la extension (H10 free + AMZScout free) guarda datos de ventas,
revenue, margen, BSR, reviews, rating, sellers FBA, etc. Pero al revisar la app
con AMZScout verificado, el usuario reportó que **nunca se llena**:

- el campo **nicho** (columna `product_research.niche`) — siempre `null`.
- el campo **competencia** (columna `product_research.competition_level`) — siempre `null`.

Causa raiz en `src/app/api/research/capture/route.ts`:
- `amazon_category` se llena con `p.category` (subcategoria del BSR del scraper),
  pero **`niche` no se escribe**.
- `competition_level` es un valor manual (`low/medium/high`, CHECK en DB) y la
  captura no lo calcula.

Además el scoring ya computa una dimension `competencia` (0-100) a partir de
`seller_count_fba + review_count + average_rating` (`scoring.ts:36`), ideal para
derivar el nivel.

El usuario quiere que **competencia** se mida en **5 niveles**:
`muy baja / baja / media / alta / muy alta`. Y que el campo **nicho** se complete
(categoria del BSR + Niche Score de AMZScout cuando este disponible).

El campo nicho y competencia deben verse **en el popup de la extension y en la app**
(cards kanban + modal).

## Competencia derivada de la captura (decision)

El nivel de competencia se **deriva de la dimension `competencia` (0-100)** del
scoring, en cada captura (`POST /api/research/capture`). No depende de mas datos
ni de membresias.

### Umbrales

| Score competencia (alto = poca competencia) | Nivel | Valor DB |
|---|---|---|
| 80-100 | Muy baja | `very_low` |
| 60-79 | Baja | `low` |
| 40-59 | Media | `medium` |
| 20-39 | Alta | `high` |
| 0-19 | Muy alta | `very_high` |

## Nicho

- `capture/route.ts`: `niche` se llena con la subcategoria del BSR (`p.category`),
  que ya llega del scraper de producto (`scraper.ts:parseBsrCategory`).
- El **Niche Score** de AMZScout (`readAmzscoutTotals`, si el widget free lo
  renderiza como `.totals-item` "Puntuacion de Nicho"/"Niche Score") se parse a
  `niche_score`. Si el free no lo renderiza, el campo queda sin badge (no se inventan datos).

## Alcance / Fuera de alcance

- NO se modifica `scoring.ts` ni `calculations.ts` (inmutables).
- NO se cambian los pesos del scoring.
- El follow-up `score stale en ediciones manuales` queda pendiente (MEDIUM, preexistente).
  La competencia derivada recalcula en cada **nueva captura**.

## Cambios

### 1. Nuevo helper puro `src/lib/research/competition.ts`

- `competitionLevelFromScore(competenciaScore: number): CompetitionLevel`
  - `>= 80` -> `very_low`
  - `>= 60` -> `low`
  - `>= 40` -> `medium`
  - `>= 20` -> `high`
  - else   -> `very_high`
- Test TDD `competition.test.ts` (umbrales exactos).

### 2. Tipos

- `src/types/index.ts`: `CompetitionLevel = 'very_low' | 'low' | 'medium' | 'high' | 'very_high'`

### 3. Validacion Zod

- `src/validations/research.ts`: `competition_level` enum a los 5 valores.

### 4. Migracion Supabase `031_competition_5_levels.sql`

- Ampliar `CHECK(competition_level IN ('very_low','low','medium','high','very_high'))`
  en `product_research`.

### 5. Capture route

- `src/app/api/research/capture/route.ts`:
  - escribir `niche: p.category` en el record.
  - computar `competencia = scoring.dimensions.competencia.score` y
    `competition_level: competitionLevelFromScore(competencia)` si `hasData`.
- Tests en `capture/route.test.ts`.

### 6. Extensión / overlay-reader

- `src/chrome-extension/content/overlay-reader.ts` `readAmzscoutTotals`:
  parsear `niche_score` cuando el total title contiene "Niche"/"Nicho".
- Fixture + test.

### 7. UI

- `src/app/(dashboard)/research/page.tsx`:
  - modal: Select de competencia con los 5 niveles (i18n `research.competition.*`).
  - badge competencia ya renderiza `competition_level` (verify mostrar los nuevos valores).
- `src/lib/i18n/{es,en,ar}.json`: keys `very_low`, `very_high`.

### 8. Popup

- `src/chrome-extension/popup/popup.ts`: mostrar badge de nivel de competencia
  cuando `p.competition_level` exista.

## Verificacion

- `npx tsc --noEmit` (0 errores)
- `npm run lint`
- `npm run test:run`
- `npm run build`
- `npm run build:extension`

## Archivos clave

- `src/lib/research/competition.ts` (nuevo) + `competition.test.ts` (nuevo)
- `src/types/index.ts`
- `src/validations/research.ts`
- `supabase/migrations/031_competition_5_levels.sql` (nuevo)
- `src/app/api/research/capture/route.ts` + `route.test.ts`
- `src/chrome-extension/content/overlay-reader.ts` + `overlay-reader.test.ts`
- `src/app/(dashboard)/research/page.tsx`
- `src/lib/i18n/{es,en,ar}.json`
- `src/chrome-extension/popup/popup.ts`