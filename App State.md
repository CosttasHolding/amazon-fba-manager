---
ultima_actualizacion: 2026-08-01
estado: estable, main al dia; extension detecta AMZScout (custom element) + reader AMZScout (ventas/revenue/margen) + reader H10 (BSR + listing health score) + boton Reload + scraper fixeado + mode honesto + observer re-colecta cuando el overlay se llena async + captura solo el producto de la pagina en producto (fix "muchisimos productos")
version: 2.0.0
branch: main
deploy: https://amazon-fba-manager-virid.vercel.app
build: 0 errores, warnings no bloqueantes
tests: 247 pasando (vitest)
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
- **Ultimos commits**: `3ab9dee` (boton Reload + fixes scraper 8va parte), `e0c3d45` (shadow DOM H10 + popup distingue causas) — pendiente commit de la 9na parte (reader H10), de la 10ma (fix deteccion AMZScout), 11va (readAMZScout), 12va (fix observer timing) y 13va (fix "muchisimos productos")
- **Working tree**: LIMPIO salvo vault + cambios 9na-13va parte sin commitear

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

- **Extension Chrome — recolector multi-fuente**: reconstruida para leer overlays de **H10 free + AMZScout + Keepa** porque el scraper de busqueda no produce BSR/ventas/nicho. Nuevos `overlay-reader.ts` + `sources.ts`, `content.ts` con merge por ASIN (prioridad h10>amzscout>keepa), scraper arreglado (titulo real, dedupe, moneda) y **tool de debug en el popup**. **AVANCE (2026-08-01 9na parte)**:
  - **Reader del widget de producto H10 (`readH10Summary`)**: ASIN + BSR/categoria (links bestsellers, BSR mas bajo) + `listing_health_score` (campo nuevo) + Unit Sales / Current Rating (N/A en plan free); lee desde el **shadow root** (estructura real de H10); parseo numerico unificado (1,240 → 1240)
  - **Boton `🔄 Reload` en el popup**: `chrome.tabs.reload` + `chrome.runtime.reload` — recarga pestana de Amazon + extension desde disco sin ir a chrome://extensions
  - **BSR + categoria + brand del DOM de Amazon GRATIS** en la pagina del producto (`#prodDetails` → "nº52 en Audífonos Externos"; `#bylineInfo`/`tr.po-brand` → marca)
  - **Scraper de busqueda fixeado**: titulo real (anti-badge AdHolder), dedupe por ASIN, `review_count` (`aria-label valoraciones` / `(92.9 K)`)
  - **Mode honesto**: `mode: h10_xray` solo si H10 aporto productos reales; `sources` = solo overlays con datos
  - **Hook `publishDebugToDom()`**: `data-fba-overlay-debug` y `data-fba-captured` en el DOM
  - **OJO**: el usuario carga desde `C:\Users\Nacho\Desktop\Amazon\IMPORTANTE\exteRB\` (copia personal) — ya sincronizada con el build (hash). **AVANCE (2026-08-01 10ma-13va parte)**: ROOT CAUSE del bug "no me toma el AMZScout" — AMZScout inserta un **custom element `<amzscout-pro>`** como primer hijo de `<html>` (tag name, no id/class). Fix: selector `amzscout-pro` en `sources.ts` + observer sobre `document.documentElement`. Y con el HTML real (con sesión) se creo **`readAMZScout()`**: tabla de búsqueda (`.maintable__row .scout-col.*`) + totals del header (`Avg. Mo Sales`/`Mo Revenue`/`Sales Rank`/`Price`/`Net Margin`) aplicados al ASIN de la página; campo nuevo `net_margin_percent`; popup muestra Ventas/m + Revenue/m + Margen. **FIX (12va parte) "solo envia h10"**: ROOT CAUSE de timing — el host `<amzscout-pro>` se inserta VACIO a document_start y Angular lo llena async; `collect()` inicial veia el host vacio y el observer solo re-disparaba si cambiaban las KEYS (no cambiaban). Nuevo `overlayContentFingerprint()` (key + length textContent) en sources.ts + observer re-colecta si cambian keys O fingerprint. **FIX (13va parte) "capturo muchisimos productos"**: en la pagina de producto la tabla `.maintable__row .maintable__row-wrapper` de AMZScout se llena con los productos SIMILARES del nicho y el reader la capturaba toda. Ahora con `fallbackAsin` (pagina de producto): devuelve solo la fila del ASIN abierto; si no esta, usa totals SOLO si `Results <= 1`; si `Results > 1` → `[]`. **Pendiente**: usuario use el boton Reload del popup y verifique la captura (1 solo producto con datos de AMZScout)
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
