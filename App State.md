---
ultima_actualizacion: 2026-08-01
estado: estable, main al dia; extension reconstruida como recolector multi-fuente + BSR/categoria del DOM de producto
version: 2.0.0
branch: main
deploy: https://amazon-fba-manager-virid.vercel.app
build: 0 errores, warnings no bloqueantes
tests: 225 pasando (vitest)
tsc: 0 errores
db_migrations: aplicadas (source_data confirmada en prod)
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
- **Ultimos commits**: `46470e3` (boton debug siempre visible), `aa0a032` (vault causa copia instalada), `b3015f2` (fixes scraper + tests), `64c5a2b` (recolector multi-fuente) — pendiente commit de BSR del DOM de producto
- **Working tree**: LIMPIO salvo vault + cambios de BSR sin commitear

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

## Features en progreso

- **Extension Chrome — recolector multi-fuente**: reconstruida para leer overlays de **H10 free + AMZScout + Keepa** porque el scraper de busqueda no produce BSR/ventas/nicho. Nuevos `overlay-reader.ts` + `sources.ts`, `content.ts` con merge por ASIN (prioridad h10>amzscout>keepa), scraper arreglado (titulo real, dedupe, moneda) y **tool de debug en el popup**. **AVANCE (2026-08-01 6ta parte)**:
  - **BSR + categoria ya salen del DOM de Amazon GRATIS** en la pagina del producto (`#prodDetails` → `li` con "nº52 en Audífonos Externos") — fix TDD en `scraper.ts` (`parseBsr`/`parseBsrCategory`), verificado en vivo (B0F12Q56RZ → bsr 52, categoria Audífonos Externos)
  - **Hook `publishDebugToDom()`**: el content script expone `data-fba-overlay-debug` y `data-fba-captured` en el DOM (chrome.runtime.sendMessage no es accesible desde el main world)
  - **Diagnostico de overlays en vivo (chromium empaquetado)**: AMZScout sin login NO inyecta overlay (error `licence` null); Keepa en producto inyecta iframe cross-origin (`keepa.com/keepaBox.html`) con BSR detras de login
  - **OJO**: el usuario carga desde `C:\Users\Nacho\Desktop\Amazon\IMPORTANTE\exteRB\` (copia personal) — ya sincronizada con el build (hash). **Pendiente**: usuario recargue la extension + refresque la pestana + (si usa AMZScout logueado) corra "Debug overlays" en una busqueda y pegue el HTML para afinar selectores de niche score/ventas/revenue
- **Deep dive Grok bloqueado**: team xAI sin creditos/licencias (403). Comprar en https://console.x.ai/team/db62d709-49a7-4db0-a4cd-d58a3921a13c + agregar XAI_API_KEY en Vercel prod
- API keys OpenAI y xAI expuestas en chat 2026-08-01 — pendiente rotacion
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
