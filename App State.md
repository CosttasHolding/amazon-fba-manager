---
ultima_actualizacion: 2026-08-15
estado: estable, main al dia; extension detecta AMZScout (custom element) + reader AMZScout (ventas/revenue/margen/niche_score) + reader H10 (BSR + listing health score) + boton Reload + mode honesto + observer re-colecta cuando el overlay se llena async + captura solo el producto de la pagina en producto (fix "muchisimos productos") + capture route persiste score enriquecido + **competencia en 5 niveles (very_low..very_high)** en capture/UI/popup + **kanban redisenado (grilla compacta 240px con scroll, drag & drop dnd-kit, filtros combinables: búsqueda+estado+competencia+rango score)** + **score/competition_level se recalculan al editar (PUT/POST) + metricas ocultas editables en el modal (revenue/fba_fee/seller_count FBA, migracion 032)** + **URLs de Amazon (auto desde ASIN al capturar) y Alibaba (manual) editables en el modal + iconos ExternalLink en la card (migracion 033)** + **TODAS las migraciones (030/031/032/033) APLICADAS en prod + E2E de extension VERIFICADO (2 capturas AMZScout reales 2026-08-05)** + **FIX: readAMZScout mergea niche_score de los totals al match de la tabla (pagina de producto)** + **GLOSARIO completo (54 terminos globales + campos por formulario) exportado a GLOSARIO.md via build:glossary** + **FIX: categoria del producto se completaba con la del producto en vista (mapAmazonCategory por subcadena) — 308 tests** + **EN PROGRESO: Research "Grupos por Item" + Papelera global (spec 851c06e, plan e4f6ff2; migraciones 034/035 commiteadas + helper trash.ts DONE; retomar Task 3 grouping.ts)**
version: 2.0.0
branch: main
deploy: https://amazon-fba-manager-virid.vercel.app
build: 0 errores, warnings no bloqueantes
tests: 308 pasando (vitest)
tsc: 0 errores
db_migrations: TODAS aplicadas en prod (source_data + score 030 + 031 competition 5 niveles + 032 research metrics + 033 research urls) — verificadas 2026-08-07
---

# App State

## Version

- **package.json**: 2.0.0
- **Next.js**: 14.2.35
- **React**: 18.2.0
- **Supabase**: ssr 10.0.2 + js 2.39.7
- **Capacitor**: 8.x (iOS/Android target)

## Git

- **Branch**: main
- **Last commits**: `f8a1db7` (vault cierre sesion 08-04), `e483b48` (URLs amazon/alibaba), `60ac69b` (recalcular score + metricas 032), `2197885` (vault), `c7daede` (kanban redisenado), `aa51efd` (i18n filtros) — todos pusheados
- **Working tree**: limpio; ultima verificacion 2026-08-07 (lectura prod, sin cambios de codigo)

## Build

- **Estado**: compila sin errores
- **tsc**: 0 errores (se eliminaron 41 pre-existentes en *.test.ts)
- **Warnings**: solo `<img>` nativo en auth pages (intencional, logo local), 2 hooks con deps faltantes (menor)

## Features completadas

- Dashboard con KPIs, graficos, alertas
- Catalogo de productos FBA
- Inventario con movimientos
- Ordenes y supply chain
- Ventas con tracking
- Proveedores con cotizaciones
- Research Bot con OpenAI + SP-API
- Google Drive backup
- SP-API integracion (auth, sync, webhooks)
- Multi-tenant con RLS
- Autenticacion completa (login, register, reset password, 2FA)
- Rate limiting (Upstash)
- Seguridad: CSP headers, sanitizacion de errores
- Seguridad: pre-commit hook anti-secretos (Husky + scripts/check-secrets.js), .gitignore reforzado (2026-08-01)
- i18n (es/en/ar)
- Modo offline
- UI Optimization: navegacion categorias, mobile UX, KPI grids, transiciones
- Capacitor para mobile (iOS/Android)
- Motor de Investigacion de Productos: Chrome Extension + scoring engine + deep dive Grok (2026-07-31; migrado de GPT-4o a xAI grok-4.5 el 2026-08-01)
- **Score enriquecido al capturar + source_data visible en cards kanban (2026-08-03)**: `POST /api/research/capture` persiste `score` (columna) + `score_details` (dimensiones) en source_data; cards kanban muestran Score/BSR/ventas/m/revenue/m/margen/health con helpers puros `card-data.ts`
- **Competencia en 5 niveles + niche (2026-08-03)**: `CompetitionLevel` pasa de 3 a 5 valores (`very_low`/`low`/`medium`/`high`/`very_high`); helper puro `competitionLevelFromScore` + migracion `031`; capture completa `niche` (categoria) y deriva `competition_level`; i18n `research.competition.*` en es/en/ar; modal con 5 opciones + badge kanban traducido; extension parsea `niche_score` de los totals de AMZScout; popup deriva y muestra la competencia localmente (port de `competenciaScore`)
- **Kanban redisenado con drag & drop (2026-08-03)**: grilla de tarjetas compactas por estado (`ResearchCard` en `research-card.tsx`), columnas `w-[240px] max-h-[calc(100vh-320px)]` con scroll interno, drag & drop entre estados con **@dnd-kit** (`PointerSensor` + `SortableContext` + `rectSortingStrategy`), score destacado (verde ≥70 / curioso / <40 via `scoreBadgeClass`), badge competencia por color (`competitionBadgeClass`, very_low emerald → very_high rose), línea única de metrics (ROI/ventas-m/revenue-m/margen), drag handle `GripVertical`, y **filtros combinables** (búsqueda + estado + competencia + rango de score). Config centralizada en `research-card-config.ts`. Commits `aa51efd` + `c7daede`
- **Recalcular score al editar + metricas ocultas editables (2026-08-04)**: helper puro `src/lib/research/recompute.ts` (`toScoringInputFromRow`/`rowHasData`/`recomputeScoreForRow`, 13 tests); `PUT` y `POST /api/research` recalculan `score` + `source_data.score_details` + derivan/o respetan `competition_level`; **override manual de competencia respetado** (solo se recalcula si viene null); cambio de estado (`{ status }`) no toca score; `POST` 404 si la fila no existe; migracion `032_research_metrics.sql` agrega columnas `estimated_monthly_revenue`/`estimated_fba_fee`/`seller_count_fba`; el modal expone esos 3 inputs (con fallback a `source_data` para filas capturadas pre-migracion); i18n `research.form.monthly_revenue/fba_fee/seller_count` en es/en/ar. `route.test.ts` nuevo (9 tests) + `recompute.test.ts` (13). **Resuelve el follow-up MEDIUM "score stale en ediciones manuales"**
- **URLs de Amazon (auto) y Alibaba (manual) (2026-08-04)**: columnas `amazon_url`/`alibaba_url` (migracion `033_research_urls.sql`); capture route autocompleta `amazon_url` desde el ASIN (`https://www.amazon.com/dp/${asin}`); modal con 2 inputs URL (`z.union([url, ""])`, patrón de `supplier.alibaba_url`); card kanban con iconos `ExternalLink` (target _blank, stopPropagation). i18n `research.form.amazon_url/alibaba_url` + `research.card.amazon/alibaba` en es/en/ar. Tests: +3 schema +1 capture (304 total)
- **Glosario completo + GLOSARIO.md (2026-08-07)**: `help-content.ts` ampliado — `HELP_GLOSSARY` de 34 → 55 términos globales (Competition Level 5 niveles, Niche Score, Score/Score Details, Listing Health Score, Capture Rate, Unit vs Landed, etc.) + `forms`/`glossary` completados por seccion desde los schemas Zod (research 24 campos, orders, shipments, suppliers, sales, returns, finances, ads, board-decisions, inventory, members, tasks). Nuevo script `src/scripts/build-glossary.ts` → `npm run build:glossary` exporta `GLOSARIO.md` en la raiz (54 terminos globales + 30 secciones con KPIs/filtros/acciones/tablas/formularios/glosario/tips). `AGENTS.md` + `00 - Dashboard.md` ([wikilink]) apuntan al GLOSARIO. Orquestado con 3 agentes paralelos. 305→308 tests
- **FIX categoria producto (2026-08-07)**: el campo categoria del form de producto se completaba con la categoria del producto en vista en vez de la scrapeada de Amazon. **Causa raiz**: el scraper extrae la categoria real de Amazon (ej. "Home & Kitchen") pero el `catMap` hardcodeado en los forms usaba matching EXACTO → descartaba el valor → el campo conservaba el previo. **Fix**: nuevo helper `src/lib/scraping/category.ts` (`mapAmazonCategory`, matching por subcadena/keywords, 3 tests) usado en `product-form-modal.tsx` y `products/new/page.tsx` en lugar del catMap duplicado. 308 tests

## Features en progreso

- **Research "Grupos por Item" + Papelera global (2026-08-15, EN PROGRESO)**: grupo = item, filas = competidores; IA agrupa/completa con fallback heurístico (xAI sin créditos); vista "Grupos" en /research + papelera global /trash. Spec `851c06e`, plan `e4f6ff2`. **DONE**: migraciones 034 (research_groups) + 035 (deleted_at en 23 tablas) — `f7b092d`; helper `src/lib/trash.ts` — `38b0e23`. **Retomar**: Task 3 `grouping.ts` (brief listo).
- **Extension Chrome — recolector multi-fuente**: reconstruida para leer overlays de **H10 free + AMZScout + Keepa** porque el scraper de busqueda no produce BSR/ventas/nicho. Nuevos `overlay-reader.ts` + `sources.ts`, `content.ts` con merge por ASIN (prioridad h10>amzscout>keepa), scraper arreglado (titulo real, dedupe, moneda) y **tool de debug en el popup**. **COMPLETO (2026-08-01, partes 9na-13va + commiteado 2026-08-03 en `c0257b4`)**:
  - **Reader del widget de producto H10 (`readH10Summary`)**: ASIN + BSR/categoria + `listing_health_score` + Unit Sales / Current Rating desde el **shadow root**
  - **Reader AMZScout (`readAMZScout`)**: tabla de busqueda (`.maintable__row .scout-col.*`) + totals del header (Avg. Mo Sales/Revenue/Rank/Price/Net Margin) con `fallbackAsin` (pagina de producto → solo el ASIN abierto, o totals solo si `Results <= 1`; nunca la tabla del nicho)
  - **Boton `🔄 Reload`** en el popup + **mode honesto** + **observer con `overlayContentFingerprint()`** (re-colecta cuando el overlay se llena async) + deteccion del custom element **`amzscout-pro`**
  - **Scraper de producto**: BSR/categoria/brand gratis del DOM de Amazon (`#prodDetails`, `#bylineInfo`)
  - **E2E VERIFICADO (2026-08-05)**: el usuario capturo 2 productos reales AMZScout (B016NE9A2A, B0H38PWZKR) con ventas/revenue/margen/score/comp/URL — datos confirmados en prod
  - **FIX niche_score (2026-08-07)**: `readAMZScout` con fallbackAsin mergea `niche_score` de los totals del header al match de la tabla (antes el ASIN en la tabla → nunca se leian los totals)
- **Research con score enriquecido (2026-08-03)**: `POST /api/research/capture` calcula `calculateScore()` con el source_data completo y persiste `score` (columna) + `score_details` (dimensiones en source_data); las cards kanban muestran badge de Score + BSR/ventas/m/revenue/m/margen/listing health solo si existen. Commits `9413ba3`..`ff0c895`
- **Competencia 5 niveles (2026-08-03, commits `24fce3e`..`85bfcd1`)**: capture + i18n + UI + extension + popup — **APLICADA en prod** (migracion `031` verificada 2026-08-07); verificacion E2E hecha (2 capturas con comp=low)
- **Deep dive Grok bloqueado**: team xAI sin creditos/licencias (403). Comprar en https://console.x.ai/team/db62d709-49a7-4db0-a4cd-d58a3921a13c + agregar XAI_API_KEY en Vercel prod
- **FIX niche_score (2026-08-07)**: `readAMZScout` con fallbackAsin mergea `niche_score` desde los totals del header al match de la tabla (overlay-reader.ts). TDD (test RED → GREEN, fixture tabla+totals). Rebuild extension + sync `exteRB`. 305 tests
- API keys OpenAI y xAI expuestas en chat 2026-08-01 — **rotadas por el usuario (2026-08-05), confirmado en sesion 08-07**
- Zod validation en SP-API / Drive / Cron routes (MEDIUM)
- Zod validation en SP-API / Drive / Cron routes (MEDIUM)
- N+1 queries fix + dashboard limits (MEDIUM)
- Accessibility fixes (MEDIUM)
- Deuda i18n: `product-analyzer.tsx` strings hardcodeadas (pre-existente Research Bot)
- Package cleanup (LOW)
- Unificar numeros duplicados de migraciones 014/015 (LOW)

## Enlaces utiles

- [[00 - Dashboard]]
- [[Bugs Conocidos]]
- [[Decisiones Tecnicas]]
- `docs/ROADMAP.md`
