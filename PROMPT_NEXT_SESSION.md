# PROMPT_NEXT_SESSION — Checkpoint

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
- **Extension = recolector multi-fuente** (H10/AMZScout/Keepa): lee overlays + BSR/categoria/brand gratis del DOM de Amazon. Fixes 10ma-13va commiteados y pusheados. Copia personal `C:\Users\Nacho\Desktop\Amazon\IMPORTANTE\exteRB\` sincronizada (content.js 13.6KB). **Lee el Niche Score de los totals de AMZScout** (`niche_score`)
- **Score enriquecido ya funciona end-to-end**: capture route calcula y persiste; cards kanban muestran los badges
- **Competencia en 5 niveles YA esta en el codigo**: capture deriva `competition_level` (very_low..very_high) desde `competenciaScore`; modal + badge kanban traducidos; popup deriva competencia localmente. **PENDIENTE: aplicar migracion `031_competition_5_levels.sql` en prod + verificar E2E**
- **Kanban redisenado YA esta en el codigo**: grilla compacta 240px con scroll interno, drag & drop entre estados (dnd-kit), filtros combinables (búsqueda+estado+competencia+rango score). Pendiente verificar en prod con datos reales
- **Bloqueante deep dive**: team xAI sin creditos/licencias (403). Comprar en https://console.x.ai/team/db62d709-49a7-4db0-a4cd-d58a3921a13c
- **XAI_API_KEY solo en .env.local** — falta agregarla en Vercel (prod)

## Proximos pasos

### 1. USUARIO debe hacer
- **Aplicar la migracion `033_research_urls.sql` en Supabase prod** (2 columnas amazon_url/alibaba_url)
- **Aplicar la migracion `032_research_metrics.sql` en Supabase prod** (si aun no lo hizo)
- **Aplicar la migracion `031_competition_5_levels.sql` en Supabase prod** (si aun no lo hizo; CHECK constraint 5 niveles)
- **Verificar la extension E2E**: boton `🔄 Reload` del popup + F5 → abrir un producto con AMZScout logueado, ESPERAR a que cargue → el popup deberia mostrar **1 solo producto** con Ventas/m + Revenue/m + Margen + **Competencia (Very low..Muy alta)** → Enviar → verificar la card kanban con el badge de competencia
- **Cargar creditos/licencias xAI** — sin esto el deep dive tira 403 (https://console.x.ai/team/db62d709-49a7-4db0-a4cd-d58a3921a13c)
- **Agregar XAI_API_KEY en Vercel** (Settings → Environment Variables)
- **Rotar las API keys AL CARGAR CREDITOS** — decision tomada (riesgo bajo hoy, keys sin creditos)
- El `.pem` de firma de la extension esta movido fuera del repo (copia personal `C:\Users\Nacho\Desktop\Amazon\IMPORTANTE\`)

### 2. Agente — follow-ups del research
- **[DONE 2026-08-04] Score stale en ediciones manuales** — resuelto: PUT/POST recalcula score + score_details + competition_level; metricas ocultas editables en el modal (migracion 032)
- **[PENDIENTE] Commitear y pushear la sesion 2026-08-04** (migracion 032, recompute.ts, route.ts, route.test.ts, page.tsx, i18n, vault) → deploy a Vercel
- **[MEDIUM] Reconsiderar**: los Minor findings del final review — i18n keys no alfabeticas, `key={b.text}` fragil, formatters re-creados, score en digitos occidentales en AR, test solo aserta 2/4 dimensiones, `scoreBadgeClass`/`sourceBadges` inline
- Verificar que la card kanban renderice bien con datos reales capturados en prod (la migracion ya esta aplicada)
- **Verificar el kanban redisenado en prod** con datos reales: drag & drop entre estados + filtros combinables (competencia/rango score) + scroll interno de columnas
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
- `.env.local` — XAI_API_KEY (gitignored)
- Spec/plan: `docs/superpowers/specs/2026-08-02-research-score-source-data-ui-design.md` y `docs/superpowers/plans/2026-08-02-research-score-source-data-ui.md`
- Plan nicho/competencia: `docs/superpowers/plans/2026-08-03-niche-competition-5-levels.md` (spec `7d13429`, base `23f4f99`)
- Temp (fuera de repo): `C:\Users\Nacho\AppData\Local\Temp\opencode\` → `get_crx.py`, `live_capture.py`, `bsr_html.py`, `verify_bsr.py`, `ext-src\{amzscout,keepa}` (CRX oficiales extraidos), `pw7-profile` (perfil persistente que evita el anti-bot)

## Comandos

```bash
npm run dev              # Desarrollo
npm run build            # Build produccion
npm run lint             # Linting
npm run test:run         # Tests (275)
npm run build:extension  # Regenerar exteRB (public/exteRB)
npx tsc --noEmit         # Typecheck (0 errores esperados)
```

## Vault

- [[00 - Dashboard]] — entry point del segundo cerebro
- [[App State]] — snapshot del proyecto
- [[Bugs Conocidos]] — extension pendiente + credito OpenAI
- [[Decisiones Tecnicas]] — ADRs
- [[Learning Log]] — Zod .catch(), adm-zip, patron NextRequest en mocks
