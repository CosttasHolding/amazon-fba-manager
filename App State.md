---
ultima_actualizacion: 2026-08-03
estado: estable, main al dia; extension detecta AMZScout (custom element) + reader AMZScout (ventas/revenue/margen/niche_score) + reader H10 (BSR + listing health score) + boton Reload + scraper fixeado + mode honesto + observer re-colecta cuando el overlay se llena async + captura solo el producto de la pagina en producto (fix "muchisimos productos") + capture route persiste score enriquecido + **competencia en 5 niveles (very_low..very_high)** en capture/UI/popup + cards kanban muestran score/BSR/ventas/revenue/margen/health
version: 2.0.0
branch: main
deploy: https://amazon-fba-manager-virid.vercel.app
build: 0 errores, warnings no bloqueantes
tests: 268 pasando (vitest)
tsc: 0 errores
db_migrations: aplicadas (source_data + score + 031 competition 5 niveles CONFIRMADAS en prod)
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
- **Last commits**: `85bfcd1` (UI badge kanban 5 niveles), `2cc76b1` (reader AMZScout niche_score), `e04c183` (capture niche + competition_level), `176b86c` (i18n very_low/very_high), `bd23c16` (CompetitionLevel 5 + zod + migracion 031), `24fce3e` (competitionLevelFromScore), `0233f3f`..`4b4bfbe` (research score previo) — pendientes de push
- **Working tree**: vault (checkpoint + daily 08-03 actualizados) — sin commits de feature pendientes

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
- **Score stale en ediciones manuales (MEDIUM, 2026-08-03)**: `PUT /api/research` y el modal de edicion no recalculan `score` — un producto editado a mano queda con score de captura viejo. Recalcular en PUT o documentar como snapshot
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
