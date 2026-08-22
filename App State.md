---
ultima_actualizacion: 2026-08-21
estado: PC nueva verificada 2026-08-21 (tsc/lint/tests/build OK, Supabase OK, git sync, dev server via tarea programada OK); Vercel linkeado (login+link OK, prod 200); extension verificada identica al build; Obsidian instalado; extension detecta AMZScout (custom element) + reader AMZScout (ventas/revenue/margen/niche_score) + reader H10 (BSR + listing health score) + boton Reload + mode honesto + observer re-colecta cuando el overlay se llena async + captura solo el producto de la pagina en producto (fix "muchisimos productos") + capture route persiste score enriquecido + **competencia en 5 niveles (very_low..very_high)** en capture/UI/popup + **kanban redisenado (grilla compacta 240px con scroll, drag & drop dnd-kit, filtros combinables)** + **URLs de Amazon/Alibaba editables** + **TODAS las migraciones aplicadas en prod + E2E extension verificado** + **GLOSARIO.md (57 terminos)** + **FEATURE COMPLETA 2026-08-21: Research "Grupos por Item" + Papelera global (12 tasks SDD; grouping fallback + CRUD grupos + capture agrupa + vista Grupos en /research + papelera global /trash con soft delete en 23 tablas + i18n x3; 391 tests; PENDIENTE PUSH ~14 commits)**
version: 2.0.0
branch: main
deploy: https://amazon-fba-manager-virid.vercel.app
build: 0 errores, warnings no bloqueantes
tests: 391 pasando (vitest)
tsc: 0 errores
db_migrations: TODAS aplicadas en prod (030-035; 034 research_groups + 035 soft delete APLICADAS 2026-08-15 via Management API, 035 corregida sobre 20 tablas existentes)
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
- **Last commits**: `1f1e838` (pagina papelera), `7080170` (vista grupos research), `92c5acb` (i18n+glosario), `ebb296b` (capture agrupa), `dbbabd3` (API papelera), `161193d`/`f8cd87c` (mover competidor + fix), `839ffbb` (soft delete+restore selectivo) — feature Grupos+Papelera completa
- **Working tree**: limpio; **TODO PUSHEADO 2026-08-21** (`72a8e6c..bbf2dfb` → origin/main) — deploy Vercel automático disparado; E2E manual en prod pendiente

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
- **Research "Grupos por Item" + Papelera global (2026-08-21, COMPLETA — 12 tasks SDD)**: grupo = item, filas = competidores. **Grupos**: migraciones 034/035 aplicadas en prod; `grouping.ts` con `classifyToGroup` (match ASIN case-insensitive → nicho+nombre normalizado → grupo nuevo; fallback heurístico, piloto ai="off"); CRUD `/api/research/groups` (+rename/delete permanente con cascada/restore selectivo que no resucita borrados individualmente); capture asigna group_id automaticamente (update de ASIN existente no toca grupo); mover/sacar competidor via `POST /api/research/[id]/group` (valida org destino + no permite mover productos en papelera); vista "Grupos" tercer toggle en /research (helpers puros sortGroups/bestScore/itemCompetition/filterGroups testeados, group-card colapsable, tabla competidores con Elegir/Descartar/DeepDive/Editar/Mover, bucket Sin grupo). **Papelera global**: soft delete en 23 tablas (deleted_at); `/api/trash` GET/DELETE + `/api/trash/restore`; `TRASH_NAME_COLUMN` ×23 entidades; página `/trash` (selector entidad, búsqueda debounced, restore, borrado definitivo escribiendo BORRAR con doble guard); nav item Herramientas. **i18n** +47 keys ×3 idiomas + glosario 57 términos. Commits `3ee0f7d..1f1e838`, **391 tests**. Reviews SDD clean salvo Tasks 5/6 (1 fix round cada una); ~25 minors diferidos en ledger

## Features en progreso

- **E2E en prod pendiente (usuario)**: feature Grupos+Papelera pusheada (`bbf2dfb`), Vercel deploya automático — verificar tras deploy: capturar producto → grupo creado; mover competidor; papelera (restore/borrado definitivo).
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
