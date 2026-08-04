# Plan: Rediseño vista Research (grilla por estado + drag & drop)

Spec: `docs/superpowers/specs/2026-08-03-research-kanban-redesign-design.md`
Base: `2331831`
Archivo principal: `src/app/(dashboard)/research/page.tsx` (669 líneas)

## Contexto de ejecución

El archivo `research/page.tsx` es un client component grande. Los cambios son de UI sobre la vista kanban existente:
- Líneas 373-444: vista kanban actual (columnas + cards).
- Líneas 352-371: barra de filtros (búsqueda + estado).
- Líneas 55-105: helpers (`STATUS_CONFIG`, `PRIORITY_COLORS`, `scoreBadgeClass`, `sourceBadges`).
- Líneas 173-197: `filtered` / `byStatus` / `paginatedList`.

TDD se aplica donde hay lógica testeable (helpers de color de competencia, filtro por rango de score). El render JSX se verifica con tsc + build.

## Fase 1: i18n + helpers puros (TDD)

**Archivos**: `src/lib/i18n/{es,en,ar}.json`, `src/lib/research/card-data.ts` (+ `card-data.test.ts`).

1. Agregar a los 3 locales:
   - `research.filter.competition` — "Competencia" / "Competition" / "المنافسة"
   - `research.filter.score_range` — "Rango de score" / "Score range" / "نطاق النتيجة"
   - `research.filter.score_all` — "Todos" / "All" / "الكل"
   - `research.filter.score_high` — "Top ≥70" / "Top ≥70" / "الأعلى ≥70"
   - `research.filter.score_mid` — "Medio 40-69" / "Medium 40-69" / "متوسط 40-69"
   - `research.filter.score_low` — "Bajo <40" / "Low <40" / "منخفض <40"
   - `research.score_rank.high/mid/low` — "Alto" / "Medio" / "Bajo" (para badge de rango)
2. En `card-data.ts` (o un nuevo `competition-level.ts`): exportar
   - `competitionBadgeClass(level: string): string` — mapa de los 5 niveles a clases de color:
     - `very_low` → text-emerald-500 bg-emerald-500/10
     - `low` → text-green-500 bg-green-500/10
     - `medium` → text-amber-500 bg-amber-500/10
     - `high` → text-orange-500 bg-orange-500/10
     - `very_high` → text-rose-500 bg-rose-500/10
   - `scoreRank(score: number): "high" | "mid" | "low"` (≥70 / 40-69 / <40)
3. Tests en `card-data.test.ts` (o nuevo test file): boundaries de `scoreRank` (70, 69, 40, 39), `competitionBadgeClass` devuelve clase para los 5 niveles.
4. Verificar: `npx vitest run src/lib/research/card-data.test.ts`, `npx tsc --noEmit`.
5. Commit: `feat: i18n filtros + helpers de color competencia/score`.

## Fase 2: tarjetas compactas + columnas con scroll

**Archivo**: `src/app/(dashboard)/research/page.tsx`.

1. Reemplazar el bloque kanban (373-444) con:
   - Columnas `w-[240px] min-w-[240px] max-h-[calc(100vh-320px)] overflow-y-auto` (scroll interno).
   - Header con estado + contador (igual, más compacto).
   - Tarjeta compacta:
     - Fila 1: nombre (line-clamp-2) + prioridad P1-P5.
     - Si existe nicho: línea debajo del nombre.
     - Línea métricas: ROI% (si existe), precio (si existe), ventas/m (via `sourceBadges`/`fmtCompact`).
     - Badge competencia con `competitionBadgeClass` (colores por nivel).
     - Badge score con `scoreBadgeClass` + `scoreRank` si se quiere rango.
     - Fila final: fecha + acciones (deep dive + drag handle `GripVertical`).
2. Extraer la tarjeta a un componente hijo `ResearchCard` (props: item, locale, callbacks) para mantener el archivo legible — puede vivir en el mismo archivo o en `src/components/research/research-card.tsx`.
3. Verificar: `npx tsc --noEmit`, `npm run build`.
4. Commit: `feat: tarjetas compactas y columnas con scroll en research`.

## Fase 3: drag & drop entre estados

**Archivo**: `src/app/(dashboard)/research/page.tsx` (o componente kanban separado).

1. Envolver el contenedor de columnas con `DndContext` (`@dnd-kit/core`) con `onDragEnd` que:
   - Detecta `over` (columna destino) y `active` (card arrastrada, payload = { id, fromStatus }).
   - Si cambia de estado → `handleStatusChange(item, overStatus)` (endpoint existente).
2. `SortableContext` por columna + `useSortable` en cada card:
   - `GripVertical` como manija (`listeners` en el handle).
   - Card semitransparente mientras `isDragging`.
3. Columna destino resaltada cuando `over` está sobre ella.
4. Manejo de errores: toast (patrón existente en `handleStatusChange`).
5. Verificar: `npx tsc --noEmit`, `npm run build`.
6. Commit: `feat: drag & drop entre estados en research`.

## Fase 4: filtros combinables

**Archivo**: `src/app/(dashboard)/research/page.tsx`.

1. Estados nuevos: `filterCompetition: string` ("all" | CompetitionLevel), `filterScore: "all" | "high" | "mid" | "low"`.
2. En `filtered` (useMemo) agregar:
   - `filterCompetition !== "all"` → `i.competition_level === filterCompetition`.
   - `filterScore` → `scoreRank(i.score ?? -1) === filterScore` (items con score null quedan fuera de high/mid/low).
3. UI: en la barra de filtros (352-371) agregar 2 Selects (competencia con los 5 niveles + i18n; rango de score).
4. Reset de `currentPage` al cambiar filtros (agregar a la dependencia del useEffect existente en línea 171).
5. Verificar: `npx tsc --noEmit`, `npx vitest run src/app/api/research/capture/route.test.ts` (regresión), `npm run build`.
6. Commit: `feat: filtros combinables de competencia y rango de score`.

## Fase 5: verificación global + push

- `npx tsc --noEmit`, `npm run lint`, `npm run test:run`, `npm run build`.
- Commit final solo si hay archivos restantes.
- Push a origin/main (si el usuario lo pide).

## Verificación estándar (cada fase)

```bash
npx tsc --noEmit
npm run build
```

## Notas

- No se modifica la vista Lista.
- No se tocan `scoring.ts`/`calculations.ts`/rutas de API.
- `@dnd-kit` ya instalado (commit `2331831`).
