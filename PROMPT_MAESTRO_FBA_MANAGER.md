# PROMPT MAESTRO — AMAZON FBA MANAGER V2
## Para usar al iniciar un chat nuevo con el asistente

> **ATENCION**: Este prompt es un resumen ejecutivo. Para detalle completo ver `CLAUDE.md`.

---

## CONTEXTO

App web Next.js 14.2.35 (App Router) + TypeScript 5 + Supabase para gestion de sellers Amazon FBA.
Propietario: **Costtas Holding LLC** (3 socios argentinos, venden en Amazon US, importan desde China).

**Deploy:** https://amazon-fba-manager-virid.vercel.app
**Supabase URL:** https://rustfxihuxxwtssgfrsw.supabase.co

## MODULOS COMPLETOS

Auth, Dashboard (KPIs+charts), Products (CRUD+ROI), Inventory (stock+alertas), Sales (CRUD+PDF), Suppliers (comparador+quotes), Orders/PO (timeline), Research (Kanban+lista), Calculator (FBA P/R/O), Import CSV, Export Excel, Finanzas, Returns+Reimbursements, Shipments, Ads/PPC, Forecasting, Settings, Global Search (Cmd+K), Notificaciones, Onboarding, Governance (Members+Tasks+BoardDecisions), Google Drive (OAuth2+browser+backup), SP-API (auth+sync de products/orders/inventory/fees/returns/payouts).

## REGLAS ESENCIALES

1. TypeScript strict, `createClient()` con await en server / sin await en client
2. snake_case DB, camelCase frontend, `user_id = auth.uid()` en queries
3. Formularios: react-hook-form + zod. Toasts: sonner
4. Estilos: variables CSS (bg-background, bg-card, etc.) — NUNCA bg-white/bg-gray/text-gray
5. `lib/calculations.ts` es INMUTABLE — no tocar nunca
6. Leer archivo antes de modificarlo. Max 2 archivos por respuesta
7. Build debe quedar 0 errores, 0 warnings

## PATRONES DE REFERENCIA

- Nueva lista → copiar `inventory/page.tsx`
- Nuevo form → copiar `products/new/page.tsx`
- Nuevo detalle → copiar `products/[id]/page.tsx`
- Nueva API → copiar `api/products/route.ts`
- Nuevos hooks → copiar `hooks/use-data.ts`

## ESTADO ACTUAL

- **Build:** 0 errores, 0 warnings ESLint
- **Tests:** 115 pasando (vitest) + E2E base (Playwright Chromium)
- **FASE 1** (Core Refinement): ✅ completa
- **FASE 2** (SP-API + Governance + Drive): ✅ completa
- **Proximo:** FASE 3 (Analytics Avanzado) o lo que el usuario decida

## INFO DEL NEGOCIO

- Montos siempre en USD. Flete aereo desde China (prioritario).
- Helium 10 es la herramienta de research principal.
- Multi-usuario: 3 socios comparten datos (members, tasks, board-decisions visibles para todos).
- SP-API sync implementado pero requiere credenciales de Seller Central para funcionar con datos reales.

---

*Ultima actualizacion: Julio 2026. Para mas detalle ver CLAUDE.md, docs/ROADMAP.md, DESIGN_SYSTEM.md*