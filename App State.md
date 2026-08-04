---
ultima_actualizacion: 2026-08-04
estado: estable, main al dia; extension detecta AMZScout (custom element) + reader AMZScout (ventas/revenue/margen/niche_score) + reader H10 (BSR + listing health score) + boton Reload + mode honesto + observer re-colecta cuando el overlay se llena async + captura solo el producto de la pagina en producto (fix "muchisimos productos") + capture route persiste score enriquecido + **competencia en 5 niveles (very_low..very_high)** en capture/UI/popup + **kanban redisenado (grilla compacta 240px con scroll, drag & drop dnd-kit, filtros combinables: búsqueda+estado+competencia+rango score)** + **score/competition_level se recalculan al editar (PUT/POST) + metricas ocultas editables en el modal (revenue/fba_fee/seller_count FBA, migracion 032)** + **URLs de Amazon (auto desde ASIN al capturar) y Alibaba (manual) editables en el modal + iconos ExternalLink en la card (migracion 033)**
version: 2.0.0
branch: main
deploy: https://amazon-fba-manager-virid.vercel.app
build: 0 errores, warnings no bloqueantes
tests: 304 pasando (vitest)
tsc: 0 errores
db_migrations: aplicadas (source_data + score + 031 competition 5 niveles + 032 research metrics CONFIRMADAS en prod); **033_research_urls PENDIENTE en prod**
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
- **Last commits**: `c7daede` (kanban redisenado con ResearchCard + dnd-kit + filtros), `aa51efd` (i18n filtros + helpers color competencia/score), `adbcc91` (plan rediseno), `2331831` (spec rediseno), `a6e2658`..`2cc76b1` (competencia 5 niveles + extension) — pendientes de push
- **Working tree**: vault actualizado (checkpoint + daily 08-03) — sin commits de feature pendientes

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

## Features en progreso

- **Extension Chrome — recolector multi-fuente**: reconstruida para leer overlays de **H10 free + AMZScout + Keepa** porque el scraper de busqueda no produce BSR/ventas/nicho. Nuevos `overlay-reader.ts` + `sources.ts`, `content.ts` con merge por ASIN (prioridad h10>amzscout>keepa), scraper arreglado (titulo real, dedupe, moneda) y **tool de debug en el popup**. **COMPLETO (2026-08-01, partes 9na-13va + commiteado 2026-08-03 en `c0257b4`)**:
  - **Reader del widget de producto H10 (`readH10Summary`)**: ASIN + BSR/categoria + `listing_health_score` + Unit Sales / Current Rating desde el **shadow root**
  - **Reader AMZScout (`readAMZScout`)**: tabla de busqueda (`.maintable__row .scout-col.*`) + totals del header (Avg. Mo Sales/Revenue/Rank/Price/Net Margin) con `fallbackAsin` (pagina de producto → solo el ASIN abierto, o totals solo si `Results <= 1`; nunca la tabla del nicho)
  - **Boton `🔄 Reload`** en el popup + **mode honesto** + **observer con `overlayContentFingerprint()`** (re-colecta cuando el overlay se llena async) + deteccion del custom element **`amzscout-pro`**
  - **Scraper de producto**: BSR/categoria/brand gratis del DOM de Amazon (`#prodDetails`, `#bylineInfo`)
  - **Pendiente**: usuario verifique E2E (Reload + F5 + producto con AMZScout logueado → 1 solo producto con ventas/revenue/margen)
- **Research con score enriquecido (2026-08-03)**: `POST /api/research/capture` calcula `calculateScore()` con el source_data completo y persiste `score` (columna) + `score_details` (dimensiones en source_data); las cards kanban muestran badge de Score + BSR/ventas/m/revenue/m/margen/listing health solo si existen. Commits `9413ba3`..`ff0c895`
- **Competencia 5 niveles (2026-08-03, commits `24fce3e`..`85bfcd1`)**: capture + i18n + UI + extension + popup — **PENDIENTE: aplicar migracion `031_competition_5_levels.sql` en prod** y verificacion E2E con AMZScout (Niche Score → badge de competencia)
- **Deep dive Grok bloqueado**: team xAI sin creditos/licencias (403). Comprar en https://console.x.ai/team/db62d709-49a7-4db0-a4cd-d58a3921a13c + agregar XAI_API_KEY en Vercel prod
- API keys OpenAI y xAI expuestas en chat 2026-08-01 — pendiente rotacion
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
