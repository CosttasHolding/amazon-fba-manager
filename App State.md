---
ultima_actualizacion: 2026-07-30
estado: estable, working tree clean
version: 2.0.0
branch: main
deploy: https://amazon-fba-manager-virid.vercel.app
build: 0 errores, warnings no bloqueantes
tests: vitest (check con npm run test)
db_migrations: presente (Supabase)
---

# App State

## Version

- **package.json**: 2.0.0
- **Next.js**: 14.2.35
- **React**: 18.2.0
- **Supabase**: ssr 0.10.2 + js 2.39.7
- **Capacitor**: 8.x (iOS/Android target)

## Git

- **Branch**: main
- **Ultimos commits**: seguridad (rate limiting, CSP), UI optimization, research bot
- **Working tree**: clean

## Build

- **Estado**: compila sin errores
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
- i18n (es/en/ar)
- Modo offline
- UI Optimization: navegacion categorias, mobile UX, KPI grids, transiciones
- Capacitor para mobile (iOS/Android)

## Features en progreso

- Zod validation en SP-API / Drive / Cron routes (MEDIUM)
- N+1 queries fix + dashboard limits (MEDIUM)
- Accessibility fixes (MEDIUM)
- Package cleanup (LOW)
- Unificar numeros duplicados de migraciones 014/015 (LOW)

## Enlaces utiles

- [[00 - Dashboard]]
- [[Bugs Conocidos]]
- [[Decisiones Tecnicas]]
- `docs/ROADMAP.md`
