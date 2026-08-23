# ROADMAP - CosttasHolding Manager v2.0

## Estado Actual: 100% funcional en produccion

| Metrica | Valor |
|---------|-------|
| Build errors | 0 |
| ESLint warnings | 0 |
| Tests pasando | 168 |
| Tablas Supabase | 29 + 1 vista |
| Endpoints API | 75+ |
| Modulos funcionales | 20+ |
| Plataforma | Vercel (Next.js 14) |
| Base de datos | Supabase (PostgreSQL + RLS) |
| Idiomas | es (default), en, ar (RTL) |
| Deploy | https://amazon-fba-manager-virid.vercel.app |

---

## Fases Completadas

### FASE 1: Core Refinement [DONE]
- Server actions para forms (SaleFormModal, SupplierFormModal, ProductFormModal, OrderFormModal)
- Pagination server-side en todos los listados
- Breadcrumbs en todas las paginas
- Skeleton loaders (PageSkeleton, KpiSkeleton, TableSkeleton)
- Error boundaries por modulo (no solo global)
- Loading states optimistas en forms
- Debounce en busquedas

### FASE 2: SP-API + Governance + Drive [DONE]

**SP-API Integration:**
- OAuth flow completo con refresh token automatico
- Sync real: products, orders, inventory, fees, returns, payouts
- `src/lib/sp-api/` — types, auth, client HTTP, endpoints, tests (18)
- API routes: auth, callback, connections, sync, cron
- DB: migracion 008_sp_api.sql (sp_api_connections + sync_logs)

**Governance:**
- Members CRUD, Tasks Kanban, Board Decisions
- Migracion 009_governance.sql con tablas + RLS + triggers
- CRUD completo via API routes + Server Actions
- UI: listas, detalle, formularios con react-hook-form + zod

**Google Drive:**
- OAuth2 con refresh token por usuario
- Drive browser UI con CRUD de archivos/carpetas

### FASE 2+: SP-API Webhooks [DONE]
- 8 notification types (ORDER_STATUS_CHANGED, INVENTORY_EVENT, ITEM_PRODUCT_TYPE_CHANGE, REPRESENTATION_CHANGE, ANY_OFFER_CHANGED, BROWSE_NODE_CHANGED, FEED_PROCESSING_FINISHED, REPORT_PROCESSING_FINISHED)
- Subscription manager (subscribe/pause/delete)
- Webhook logs con processing_time_ms
- Firma HMAC-SHA256 para validacion

### FASE 2+: Multi-Tenant [DONE]
- Organizations + org_members + org_invitations
- org_id en 22 tablas
- RLS con is_org_member() y get_org_role()
- Auto-creacion de org default al registrarse
- OrgSwitcher component en sidebar

### FASE 3: Analytics Advanced [DONE]
- Period comparison (current vs previous, selector 7/30/60/90d)
- Linear regression revenue projections (intervalo 95% confianza)
- SKU profitability heatmap (card + matrix views con intensidad de color)
- 6 report templates (profitability, inventory, sales-summary, roi-ranking, suppliers, ppc)
- Shared dashboard links con chart de revenue trend

### FASE 4: Automation & Alerts [DONE]
- Alert rules with 8 condition types (ppc_overbudget, stock_low, stock_out, roi_below, etc.)
- Cron jobs: /api/cron/alerts, /api/cron/sync, /api/cron/reports
- Reorder rules con auto-PO generation (stock <= min_stock && auto_po=true)
- Email alerts via Resend (infraestructura en email.ts)
- Scheduled reports (daily/weekly/monthly) con export Excel + PDF

### FASE 5: Team & Collaboration [DONE]
- Roles/permissions: owner, admin, editor, viewer (DB enum + RLS)
- Audit log: tabla + API + escritura desde server actions (entity, action, changes, ip, user_agent)
- Comments on entities: product, order, shipment, supplier, task, member, board_decision
- Team dashboard: unified view con tabs (Resumen/Miembros/Tareas)
- Members CRUD with ownership_pct y executor info

### FASE 6: Multi-Language & Accessibility [DONE]
- i18n: es (default), en, ar (RTL) — ~50 archivos, 500+ keys por locale
- RTL support: locale context con direction, logical CSS properties, 250+ conversiones
- WCAG 2.1 AA compliance: focus trap, labels, aria roles, contrast, th scope
- High contrast mode (light + dark, toggle persistente)
- 44px minimum touch targets
- Skip-to-content, ARIA labels, aria-live announcements
- prefers-reduced-motion support

### FASE 7: Mobile/PWA [DONE]
- PWA: manifest, service worker con caching por tipo (assets, API, navigation)
- Offline fallback page
- Push notifications: Web Push API + VAPID + push subscriptions + service worker push handler
- Barcode scanning con html5-qrcode (products + inventory pages, dynamic import)
- Capacitor wrapper: config, provider, build scripts iOS/Android

### FASE 8: Security + API Audit [DONE]
- SQL migrations for security fixes (021_security_fixes.sql): update_updated_at_column(), triggers en 7 tablas, FKs con ON DELETE, CHECK constraints, 7 indices, tabla rate_limits, vista products_with_inventory con security_invoker
- Cron endpoints migrados a createServiceRoleClient() + filtro .in("user_id", userIds)
- N+1 query fixes (alerts cron: batch query + Map lookup, de 50+ queries a 2)
- Error message sanitization en api-handler.ts, members, tasks, board-decisions, sales
- Zod validation on all endpoints (safeParse retorna 400 con detalles)
- Rate limiting: 60 req/min per IP+route (tabla rate_limits)
- Security headers: CSP, HSTS, X-Frame-Options, COOP, COEP, CORP

### FASE 9: Performance [DONE]
- N+1 query batch fixes en alerts y dashboard
- Dashboard query limits
- Dynamic html5-qrcode import (code splitting)
- SWR deduplication (10s interval)

### FASE 10: i18n Completeness [DONE]
- All missing translation keys added (500+ per locale)
- ARIA labels en todos los idiomas
- Touch targets audit (44px minimum en todos los forms)

### FASE 11: Cleanup [DONE]
- Removed old toast system (@radix-ui/react-toast)
- Moved Capacitor/shadcn to devDependencies
- Dead code cleanup (~40 lineas deduplicadas en parseSort)
- Shared parseSort utility (src/lib/sort-parser.ts) con PRODUCTS/SALES/INVENTORY sort maps

### FASE 12: Tests [DONE]
- Suppliers API tests (8 tests)
- Sales API tests (10 tests)
- Mock helper src/lib/test-utils/mock-request.ts
- Total: 168 tests passing

---

## Modulos Principales (20+)

| # | Modulo | Estado | Ubicacion |
|---|--------|--------|-----------|
| 1 | Auth (Supabase login/register) | DONE | /login, /register |
| 2 | Dashboard (KPIs, graficos, alertas) | DONE | /dashboard |
| 3 | Productos (CRUD, ROI, fees) | DONE | /products |
| 4 | Inventario (movimientos, alertas) | DONE | /inventory |
| 5 | Ventas (graficos, export PDF) | DONE | /sales |
| 6 | Proveedores (comparador, cotizaciones) | DONE | /suppliers |
| 7 | Pedidos (Purchase Orders, timeline) | DONE | /orders |
| 8 | Research (Kanban + lista) | DONE | /research |
| 9 | Calculadora FBA (P/R/O scenarios) | DONE | /fba-calculator |
| 10 | Importacion CSV (preview) | DONE | /import |
| 11 | Exportacion Excel | DONE | global |
| 12 | Finanzas / Expenses | DONE | /expenses |
| 13 | Returns + Reimbursements | DONE | /returns |
| 14 | Shipments inbound | DONE | /shipments |
| 15 | Ads / PPC campaigns | DONE | /ads |
| 16 | Forecasting / Replenishment | DONE | /forecasting |
| 17 | SP-API (sync, webhooks, dashboard) | DONE | /sp-api |
| 18 | Governance (Members, Tasks, Board) | DONE | /team |
| 19 | Google Drive (OAuth2, browser) | DONE | /drive |
| 20 | Notificaciones (real-time, push) | DONE | /notifications |
| 21 | Settings (perfil, defaults, data) | DONE | /settings |
| 22 | Global Search (Cmd+K) | DONE | global |
| 23 | Analytics (proyecciones, heatmaps) | DONE | /analytics |
| 24 | Alert Rules (condition types, cron) | DONE | /alerts |
| 25 | Scheduled Reports | DONE | /reports |
| 26 | Team Dashboard | DONE | /team |
| 27 | Audit Log | DONE | /audit-log |
| 28 | Comments System | DONE | en entidades |
| 29 | Multi-Tenant Orgs | DONE | /org |
| 30 | PWA / Offline / Barcode | DONE | global |

---

## Proximo (Potential)

| Prioridad | Feature | Complejidad | Impacto |
|-----------|---------|-------------|---------|
| Alta | PPC automation (budget/bid management) | Alta | Alto |
| Alta | Keyword/SEO analysis | Media | Alto |
| Media | Advanced landed cost (tariffs, duties) | Media | Medio |
| Media | Native mobile app (beyond Capacitor) | Alta | Alto |
| Media | Real-time sync via SP-API webhooks (full) | Media | Medio |
| Baja | Multi-currency support | Baja | Medio |
| Baja | Tax filing integration | Alta | Medio |
| Baja | AI-powered product recommendations | Alta | Alto |

---

*Ultima actualizacion: 22/Jul/2026 — FASES 1-12 + SP-API Webhooks + Multi-tenant COMPLETAS. Build 0 errores, 168 tests, 0 ESLint warnings.*
