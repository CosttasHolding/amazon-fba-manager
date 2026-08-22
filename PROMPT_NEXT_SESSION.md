# PROMPT_NEXT_SESSION — Checkpoint

---

## CERRADA 2026-08-21 (4ta) — FEATURE COMPLETA: Research "Grupos por Item" + Papelera global

**Estado**: **TODAS las 12 tasks DONE** (flujo SDD orquestado, ledger `.superpowers/sdd/progress.md`). Verificación final con evidencia fresca: tsc 0 | lint solo warnings pre-existentes | **391/391 tests** (47 archivos) | build OK (`/trash` en manifest) | build:glossary OK.

**Código**: commits `3ee0f7d..bbf2dfb` sobre `main` — **PUSHEADO 2026-08-21** (`72a8e6c..bbf2dfb` → origin/main). Deploy Vercel automático disparado; E2E manual en prod pendiente.

**Qué quedó implementado**:
- Grupos por item: migraciones 034/035 aplicadas en prod (15/08); helper `grouping.ts` (`classifyToGroup`, fallback heurístico, piloto ai="off"); CRUD `/api/research/groups/*`; capture asigna `group_id` automáticamente; vista "Grupos" (tercer toggle) en /research con filtros/orden/bucket Sin grupo; mover/sacar competidor de grupo.
- Papelera global: soft delete en 23 tablas; `/api/trash` + `/api/trash/restore`; página `/trash` con selector de entidad, búsqueda y borrado definitivo escribiendo BORRAR; nav item Herramientas; restore selectivo (grupo restaurado no resucita productos borrados individualmente).
- i18n es/en/ar (+47 keys ×3) + glosario (57 términos).

**Pendientes usuario**:
1. E2E manual en prod tras el deploy (capturar → grupo creado; mover competidor; papelera).
2. Obsidian: seleccionar el vault (primera apertura).
3. Histórico: créditos xAI para deep dive (NO recordar hasta que él lo pida — ver FILOSOFIA abajo).

**Backlog técnico**: ~25 minors diferidos documentados en el ledger (`.superpowers/sdd/progress.md`, sección Minor Findings por task).

**Si hay nueva feature**: mismo flujo SDD (brief → implementador → package → revisor → ledger). Nunca re-despachar tasks done.

---

## CERRADA 2026-08-21 — Verificacion completa del stack en PC nueva

**Estado**: TODO VERDE con evidencia fresca. tsc 0 | lint 0 errores | 310/310 tests | build OK. Supabase cloud OK (auth health + REST + RLS). Git `main` == `origin/main`. Dev server corriendo (login 200, raiz 307, API 401 sin sesion).

**Pendientes de entorno (usuario)**:
1. ~~`vercel login` + `vercel link`~~ — **HECHO 2026-08-21** (cuenta `costtasholding-2725`, proyecto linkeado, prod 200)
2. Seleccionar el vault en Obsidian (app 1.13.7 instalada via winget y lanzada; falta primera seleccion del vault; opcional traer `.obsidian/` de la PC vieja)
3. ~~Tarea programada `fba-manager-dev`~~ — **HECHA 2026-08-21** (Register-ScheduledTask nivel usuario, trigger AtLogOn, server verificado HTTP 200)

**Extension**: verificada 2026-08-21 — funcionalmente identica al build actual (SHA256 content.js igual; manifest/popup solo diff CRLF). Sin accion requerida.

**Seguridad**: carpeta `env/` untracked con secrets fue detectada y **eliminada por el usuario**. Env reales = `.env`/`.env.local` en raiz (gitignored). Sin exposicion.

**Entorno**: Node v24.19.0, npm 12.0.2, ruta actual `C:\Users\nachc\Documents\amazon-fba-manager` (distinta de la del backup original).

**Retomar feature**: Task 3 (`src/lib/research/grouping.ts`) — ver checkpoint 2026-08-15 abajo.

---

## CERRADA 2026-08-15 — Feature en progreso: RESEARCH "GRUPOS POR ITEM" + PAPELERA GLOBAL

**Estado**: spec (851c06e) + plan (e4f6ff2) commiteados. **Tasks 1-2 DONE** (f7b092d, 38b0e23), review clean. **Retomar = Task 3** (`src/lib/research/grouping.ts`, brief listo en `.superpowers/sdd/briefs/task-3-brief.md`).

**CÓMO SE TRABAJA**: flujo SDD como orquestador de subagentes (pedido del usuario):
- Brief por tarea en `.superpowers/sdd/briefs/` → implementador (subagente `general`) → `git diff` → review package en `.superpowers/sdd/review-packages/` → revisor → ledger `.superpowers/sdd/progress.md`.
- **Regla**: nunca re-despachar tareas ya marcadas en el ledger. Base del plan: `e4f6ff2`.
- Comandos windows: no hay bash; para review package usar `git diff -U2 BASE HEAD | Out-File .superpowers/sdd/review-packages/taskN.diff`.

**Plan**: `docs/superpowers/plans/2026-08-14-research-groups-trash.md` (12 tasks). **Spec**: `docs/superpowers/specs/2026-08-14-research-groups-trash-design.md`.

**Resumen feature**: grupo = item; filas = competidores; IA agrupa/completa (fallback heurístico por defecto, xAI sin créditos); vista "Grupos" en /research; papelera global /trash (soft delete en ~21 tablas gestionables, borrado definitivo con doble confirmación, cascada de grupo→productos).

**Pendientes usuario**: aplicar migraciones 034/035 en Supabase prod; cargar créditos xAI (deep dive + enriquecido IA siguen bloqueados hasta entonces).

---

## FILOSOFIA DE TRABAJO (2026-08-03)

- **Prioridad**: terminar TODA la app primero; los pagos/membresías (xAI, etc.) se pagan DESPUÉS, al final.
- **Objetivo**: dejar todo armado de modo que el único paso pendiente sea pegar una API key (nada más).
- **PENDIENTES BLOQUEADOS POR FALTA DE API KEY** (NO recordar al usuario hasta que ÉL de la key/usuario avise):
  - Deep dive Grok (necesita `XAI_API_KEY` cargada + créditos) y agregar esa var en Vercel prod.
  - Probar el deep dive end-to-end en prod.
  - Rotar las keys de OpenAI y xAI (expuestas en chat 08-01) — rotar A PROPÓSITO cuando el usuario pida. Siempre pedir antes de tocar.
  - Si algo requiere un servicio pagado/membresía, anotarlo aqui y avanzar con lo demás.
- **No recordar la lista de arriba**. Solo volver a trabajarla cuando el usuario la pida.

---

## Ultima sesion

- **Fecha**: 2026-08-15 (brainstorm + spec + plan + Task 1-2 SDD) — **ver "CERRADA 2026-08-15" arriba**
- **Fecha**: 2026-08-07 (verificacion prod + niche_score + glosario + fix categoria)
  - **PENDIENTES DEL USUARIO: 3/4 CONFIRMADOS** (solo lectura contra prod via PostgREST):
    1. Migracion `033_research_urls.sql` → **APLICADA** (columnas `amazon_url`/`alibaba_url` existen; 2 filas con amazon_url)
    2. E2E extension → **VERIFICADO en datos**: 2 capturas AMZScout reales del 2026-08-05 (`B016NE9A2A` Foam Roller score 85 comp=low mo_sales 5840; `B0H38PWZKR` Jujutsu Kaisen score 86 comp=low mo_sales 2041), ambas con amazon_url auto
    4. Rotacion de keys → **confirmada por el usuario** (no verificable tecnicamente desde aca)
    3. Creditos xAI → **SIGUE PENDIENTE** (deep dive bloqueado)
  - **GLOSARIO COMPLETO + GLOSARIO.md (orquestado con 3 agentes paralelos)**:
    - `src/lib/help-content.ts` ampliado: `HELP_GLOSSARY` 34 → 55 terminos (Competition Level 5 niveles, Niche Score, Score/Score Details, Listing Health Score, Capture Rate, Unit vs Landed, seller_count, avg_rating, monthly revenue, etc.) + `forms`/`glossary` por seccion desde los schemas Zod (research 24 campos, orders, shipments, suppliers, sales, returns, finances, ads, board-decisions, inventory, members, tasks)
    - Nuevo `src/scripts/build-glossary.ts` + `npm run build:glossary` → genera `GLOSARIO.md` en la raiz (54 terminos + 30 secciones con KPIs/filtros/acciones/tablas/formularios/glosario/tips)
    - `AGENTS.md` (seccion `## Glosario`) + `00 - Dashboard.md` (wikilink `[[GLOSARIO]]`) apuntan al MD
    - **Decision**: TS como fuente de verdad (la app lo muestra en help-modal), MD derivado por script idempotente
  - **FIX categoria producto**: el campo categoria se completaba con la del producto en vista. Causa raiz: `catMap` hardcodeado con matching EXACTO descartaba las categorias reales de Amazon ("Home & Kitchen", etc.). Nuevo `src/lib/scraping/category.ts` (`mapAmazonCategory`, matching por subcadena, 3 tests) usado en `product-form-modal.tsx` + `products/new/page.tsx`. TDD. **308 tests**
- **Fecha**: 2026-08-04 (segunda sesion) — **URLs de Amazon (auto) + Alibaba (manual) en Research**
  - **Migracion `033_research_urls.sql`** (NUEVA, **PENDIENTE aplicar en prod**): columnas `amazon_url` + `alibaba_url`.
  - **Capture route** autocompleta `amazon_url` desde el ASIN (`https://www.amazon.com/dp/${asin}`) — URL limpia de producto, no `capture_url`.
  - **Modal** con 2 inputs URL + **card kanban** con iconos `ExternalLink` (Amazon/Alibaba, target _blank, stopPropagation).
  - Schema `z.union([url, ""])` (patrón `supplier.alibaba_url`); i18n es/en/ar.
  - **Verificacion**: tsc 0 | lint sin errores | **304/304 tests** (37 archivos) | build OK (research 31.4 kB). Spec `docs/superpowers/specs/2026-08-04-research-urls-design.md`.
- **Fecha**: 2026-08-04 (primera sesion) — **recalcular score al editar + metricas ocultas en el modal**
  - **Resumen**: se resolvio el follow-up [MEDIUM] "score stale en ediciones manuales".
  - **NUEVO helper puro** `src/lib/research/recompute.ts` (13 tests): `toScoringInputFromRow` (columnas → ScoringInput, fallback a `source_data` para revenue/fba_fee/seller_count), `rowHasData` (gate = capture), `recomputeScoreForRow` (`calculateScore` + `competitionLevelFromScore`; null si sin datos). `scoring.ts`/`competition.ts` intactos.
  - **`PUT` y `POST /api/research`** recalcular score: PUT busca fila (404 si no existe) → mergea payload → si hay campos de scoring, persiste `score` + `source_data.score_details` + `competition_level` (**override manual respetado**; cambio de estado `{ status }` no toca score). POST crea con score fresco.
  - **Migracion `032_research_metrics.sql`** (NUEVA): 3 columnas `estimated_monthly_revenue`/`estimated_fba_fee`/`seller_count_fba` — **PENDIENTE aplicar en prod**.
  - **Modal** (`page.tsx`): 3 inputs nuevos (con fallback a `source_data` en `openEdit`) + i18n es/en/ar.
  - **Verificacion**: tsc 0 | lint solo warnings pre-existentes | **300/300 tests** (37 archivos) | build OK (research 31.1 kB). Sin commits todavia.
- **Fecha**: 2026-08-03 (sesion que cruzo la medianoche del 08-02)
- **Resumen**:
  - **Commiteo + push de los fixes de extension pendientes** (10ma-13va parte, `c0257b4`): reader AMZScout (tabla+totals), deteccion custom element `amzscout-pro`, observer con `overlayContentFingerprint()`, fix "capturo muchisimos productos" (fallbackAsin en pagina de producto)
  - **Feature completa: score enriquecido + source_data en UI** (spec `592e6c5`, commits `9413ba3`..`ff0c895`, plan `4b4bfbe`):
    - Columna `score` en `product_research` (migracion `030_add_score.sql`)
    - `POST /api/research/capture` calcula `calculateScore()` con source_data completo → persiste `score` + `score_details` (4 dimensiones) en source_data; UPDATE de ASIN existente refresca
    - Cards kanban: badge de Score (colores por rango) + BSR/ventas/m/revenue/m/margen/listing health (solo si existen)
    - Helpers puros `src/lib/research/card-data.ts` (`numField`, `fmtCompact`) + i18n `research.card.*` en es/en/ar
  - **SDD por tareas**: 4 implementers + 4 reviewers + final whole-branch review → **READY TO MERGE**
  - **Push a origin/main**: 7 commits (deploy a Vercel)
  - **USUARIO aplico la migracion `030_add_score.sql` en Supabase prod** (columna `score` confirmada)
  - Verificacion: tsc 0 | lint solo warnings pre-existentes | **255/255 tests** | build OK
- **Fecha**: 2026-08-03 (segunda sesion) — **nicho + competencia en 5 niveles**
  - **Resumen**: `CompetitionLevel` de 3 → 5 valores (`very_low`..`very_high`); helper puro `competitionLevelFromScore` + test; migracion `031_competition_5_levels.sql`; capture completa `niche` (categoria) y deriva `competition_level` (2 tests nuevos); i18n `research.competition.very_low/very_high` en es/en/ar; modal con 5 opciones + badge kanban traducido; extension parsea `niche_score` de totals AMZScout; popup deriva competencia localmente (port de `competenciaScore` en `popup/competition.ts`, no puede importar `@/lib`)
  - **Commits** (`24fce3e`..`bd3d511`): `24fce3e` helper, `bd23c16` types+zod+031, `e04c183` capture, `176b86c` i18n, `85bfcd1` UI, `2cc76b1` reader niche_score, `bd3d511` popup
  - **SDD por tareas**: tasks 1-6 con implementers + reviewers (todos clean), 7-8 hechos directo con verificacion (tsc/lint/tests/build/extension)
  - **Verificacion final**: tsc 0 | lint solo warnings | **268/268 tests** (35 archivos) | build OK | build:extension OK | copia personal `exteRB` sincronizada
  - **PENDIENTE**: aplicar migracion `031` en Supabase prod + verificacion E2E con AMZScout
- **Fecha**: 2026-08-03 (tercera sesion) — **rediseno de la vista Research (kanban 2.0)**
  - **Resumen**: grilla de tarjetas compactas por estado con scroll interno, drag & drop entre estados con **@dnd-kit** y filtros combinables. Opcion "C" del brainstorm + "columnas por estado + drop"
  - **Commits** (`2331831`..`c7daede`): `2331831` spec, `adbcc91` plan (5 fases), `aa51efd` Fase 1 (i18n filtros + helpers `scoreRank`/`competitionBadgeClass` + tests 12), `c7daede` Fases 2-4 (kanban redisenado)
  - **Cambios**: `ResearchCard` (`research-card.tsx`, `useSortable`, score destacado verde/ámbar/rojo, badge competencia por color, línea metrics ROI/ventas-m/revenue-m/margen, drag handle `GripVertical`, Select status); config centralizada `research-card-config.ts` (`STATUS_ORDER`/`STATUS_CONFIG`/`PRIORITY_COLORS`/`scoreBadgeClass`); `page.tsx` con `DndContext` + `SortableContext` + columnas `w-[240px] max-h-[calc(100vh-320px)]` con scroll; filtros combinables (búsqueda + estado + competencia + rango score); i18n `common.empty_column` en es/en/ar
  - **Ejecucion**: fases 2-4 hechas directo (no SDD subagentes) por confiabilidad sobre el mismo archivo de 669 líneas
  - **Verificacion final**: tsc 0 | lint solo warnings pre-existentes | **275/275 tests** | build OK (research 30.8 kB) | **PENDIENTE push**

## Estado actual

Leer `App State.md` para el snapshot completo. Puntos clave:
- Motor de Investigacion funcional: extension -> capture -> scoring -> deep dive (LLM = xAI Grok `grok-4.5`)
- **Extension = recolector multi-fuente** (H10/AMZScout/Keepa): lee overlays + BSR/categoria/brand gratis del DOM de Amazon. **E2E VERIFICADO 2026-08-05**: 2 capturas reales AMZScout con ventas/revenue/margen/score/comp/URL. Copia personal `C:\Users\Nacho\Desktop\Amazon\IMPORTANTE\exteRB\` sincronizada (content.js 13.6KB).
- **TODAS las migraciones aplicadas en prod**: 030 (score) + 031 (competencia 5 niveles) + 032 (metrics) + 033 (urls) — verificadas 2026-08-07
- **Score enriquecido funciona end-to-end**: capture route calcula y persiste; cards kanban muestran los badges
- **Competencia en 5 niveles EN PROD**: capture deriva `competition_level`; las 2 capturas E2E salieron comp=low
- **Kanban redisenado en prod**: grilla compacta 240px, drag & drop (dnd-kit), filtros combinables
- **HALLAZGO [MEDIUM] `niche_score` no se captura en pagina de producto** — **RESUELTO 2026-08-07** (merge de totals al match de la tabla; ver seccion Ultima sesion)
- **Glosario completo disponible**: `GLOSARIO.md` en la raiz (54 terminos + 30 secciones) generado desde `src/lib/help-content.ts` con `npm run build:glossary`. **Leerlo antes de trabajar** (AGENTS.md lo indica). Fuente de verdad = TS
- **FIX categoria producto RESUELTO 2026-08-07**: `mapAmazonCategory` (matching por subcadena) reemplaza el catMap exacto en los forms de producto
- **Bloqueante deep dive**: team xAI sin creditos/licencias (403). Comprar en https://console.x.ai/team/db62d709-49a7-4db0-a4cd-d58a3921a13c
- **XAI_API_KEY solo en .env.local** — falta agregarla en Vercel (prod)

## Proximos pasos

### 1. USUARIO debe hacer
- **Cargar creditos/licencias xAI** — sin esto el deep dive tira 403 (https://console.x.ai/team/db62d709-49a7-4db0-a4cd-d58a3921a13c). **UNICA pendiente de las 4**
- **Agregar XAI_API_KEY en Vercel** (Settings → Environment Variables) cuando cargue creditos
- El `.pem` de firma de la extension esta movido fuera del repo (copia personal `C:\Users\Nacho\Desktop\Amazon\IMPORTANTE\`)

### 2. Agente — follow-ups del research
- **[DONE 2026-08-04] Score stale en ediciones manuales** — resuelto: PUT/POST recalcula score + score_details + competition_level; metricas ocultas editables en el modal (migracion 032)
- **[DONE 2026-08-07] niche_score no se captura en pagina de producto** — resuelto: `readAMZScout` mergea `niche_score` de los totals del header al match de la tabla (TDD, 305 tests, rebuild extension + sync `exteRB`). **PENDIENTE**: push + deploy + verificar E2E con una captura nueva
- **[DONE 2026-08-07] Glosario completo + GLOSARIO.md** — `help-content.ts` ampliado (55 terminos globales + forms/glossary por seccion), script `build:glossary` genera el MD, AGENTS.md + Dashboard vinculados. **PENDIENTE**: push
- **[DONE 2026-08-07] Categoria del producto se completaba con la del producto en vista** — `mapAmazonCategory` por subcadena en los forms (TDD, 308 tests). **PENDIENTE**: push
- **[MEDIUM] Reconsiderar**: los Minor findings del final review — i18n keys no alfabeticas, `key={b.text}` fragil, formatters re-creados, score en digitos occidentales en AR, test solo aserta 2/4 dimensiones, `scoreBadgeClass`/`sourceBadges` inline
- **[LOW/IDEA]** En la tarjeta compacta nueva, el score destacado + badge competencia ya ayudan a detectar oportunidades; considerar si se quiere re-agregar badges extra (source) que la card anterior tenia via `sourceBadges`

### 3. Backlog (MEDIUM)
- Zod validation en SP-API / Drive / Cron routes
- N+1 queries fix + dashboard limits
- Accessibility fixes
- Deuda i18n: `product-analyzer.tsx` (Research Bot, strings hardcodeadas)
- Unificar numeros duplicados de migraciones 014/015 (LOW)

## Archivos clave

- `src/app/api/research/capture/route.ts` — calcula y persiste `score` + `score_details`; completa `niche` y deriva `competition_level` (5 niveles); gate `hasData` (null si no hay datos)
- `src/lib/research/scoring.ts` — `calculateScore` (inmutable, solo se consume)
- `src/lib/research/recompute.ts` — `toScoringInputFromRow` / `rowHasData` / `recomputeScoreForRow` (recalcular score/competencia al editar, fallback source_data)
- `src/app/api/research/route.ts` — PUT/POST recalcular score + `score_details` + competition_level (override manual respetado); PUT 404 si fila no existe
- `supabase/migrations/032_research_metrics.sql` — columnas estimated_monthly_revenue/estimated_fba_fee/seller_count_fba (PENDIENTE aplicar en prod)
- `src/lib/research/competition.ts` — `competitionLevelFromScore` (score de competencia → 5 niveles)
- `src/lib/research/card-data.ts` — `numField` / `fmtCompact` / `scoreRank` / `competitionBadgeClass` (helpers de color/score)
- `src/components/research/research-card.tsx` — tarjeta compacta kanban (useSortable dnd-kit, score destacado, badge competencia, drag handle)
- `src/components/research/research-card-config.ts` — `STATUS_ORDER`/`STATUS_CONFIG`/`PRIORITY_COLORS`/`scoreBadgeClass`
- `src/app/(dashboard)/research/page.tsx` — kanban redisenado (DndContext + columnas 240px con scroll) + filtros combinables (búsqueda/estado/competencia/rango score)
- Spec/plan rediseno: `docs/superpowers/specs/2026-08-03-research-kanban-redesign-design.md` y `docs/superpowers/plans/2026-08-03-research-kanban-redesign.md`
- `src/app/(dashboard)/research/page.tsx` — badges en cards kanban (`scoreBadgeClass`, `sourceBadges`) + modal con 5 niveles de competencia
- `supabase/migrations/030_add_score.sql` — columna score (APLICADA en prod)
- `supabase/migrations/031_competition_5_levels.sql` — CHECK constraint 5 niveles (PENDIENTE aplicar en prod)
- `src/chrome-extension/content/overlay-reader.ts` — `readAMZScout` (tabla + totals + niche_score + fallbackAsin), `readH10Summary` (shadow root)
- `src/chrome-extension/content/sources.ts` — deteccion + `overlayContentFingerprint()`
- `src/chrome-extension/content/content.ts` — merge multi-fuente + observer
- `src/chrome-extension/popup/popup.ts` — deriva y muestra competencia (badge "Competencia") + boton Reload + tool de debug
- `src/chrome-extension/popup/competition.ts` — `competitionLevelFromCaptured` (port de `competenciaScore` para el popup, que no puede importar `@/lib`)
- `src/lib/ai/client.ts` — `getXAIClient()` (OpenAI SDK → xAI baseURL)
- `src/lib/help-content.ts` — glosario de la app (fuente de verdad; HELP_GLOSSARY 55 terminos + forms/glossary por seccion)
- `src/scripts/build-glossary.ts` — genera `GLOSARIO.md` (`npm run build:glossary`)
- `src/lib/scraping/category.ts` — `mapAmazonCategory` (categoria de Amazon → 9 internas, por subcadena)
- `GLOSARIO.md` — referencia completa generada (54 terminos + 30 secciones)
- `.env.local` — XAI_API_KEY (gitignored)
- Spec/plan: `docs/superpowers/specs/2026-08-02-research-score-source-data-ui-design.md` y `docs/superpowers/plans/2026-08-02-research-score-source-data-ui.md`
- Plan nicho/competencia: `docs/superpowers/plans/2026-08-03-niche-competition-5-levels.md` (spec `7d13429`, base `23f4f99`)
- Temp (fuera de repo): `C:\Users\Nacho\AppData\Local\Temp\opencode\` → `get_crx.py`, `live_capture.py`, `bsr_html.py`, `verify_bsr.py`, `ext-src\{amzscout,keepa}` (CRX oficiales extraidos), `pw7-profile` (perfil persistente que evita el anti-bot)

## Comandos

```bash
npm run dev              # Desarrollo
npm run build            # Build produccion
npm run lint             # Linting
npm run test:run         # Tests (308)
npm run build:extension  # Regenerar exteRB (public/exteRB)
npx tsc --noEmit         # Typecheck (0 errores esperados)
```

## Vault

- [[00 - Dashboard]] — entry point del segundo cerebro
- [[App State]] — snapshot del proyecto
- [[Bugs Conocidos]] — extension pendiente + credito OpenAI
- [[Decisiones Tecnicas]] — ADRs
- [[Learning Log]] — Zod .catch(), adm-zip, patron NextRequest en mocks
