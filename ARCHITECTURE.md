# ARCHITECTURE.md - Arquitectura del Sistema

> Este archivo explica CÓMO se conecta todo en la app. Para el esquema de tablas ver `DATABASE.md`. Para endpoints ver `API.md`. Para componentes UI ver `UI-PATTERNS.md`.

---

## 1. Stack Tecnológico

| Capa | Tecnología | Versión | Por qué |
|------|-----------|---------|---------|
| Framework | Next.js (App Router) | 14.2.35 | Server Components + Server Actions + RSC streaming |
| Lenguaje | TypeScript | 5.x (strict) | Type safety total, `noEmit`, `strict: true` |
| Base de datos | Supabase (PostgreSQL) | - | Auth + DB + RLS + Realtime + Storage en uno |
| UI | Tailwind CSS + shadcn/ui | 3.4 | CSS variable-based theming, Radix primitives |
| State (cliente) | SWR | 2.4.1 | Caching, revalidation, deduplication |
| Forms | react-hook-form + Zod | 7.50.1 + 3.22.4 | Validación type-safe, re-render mínimo |
| Charts | Recharts | 2.12.0 | Responsive, composable, good React integration |
| Icons | lucide-react | - | Consistent, tree-shakeable |
| Toast | sonner | - | Lightweight, theme-aware |
| Theme | next-themes | - | Dark/light con class strategy |
| i18n | Custom (context + JSON) | - | es/en/ar con RTL, sin dependencia externa |
| Testing | Vitest + Playwright | 4.1.4 + 1.59.1 | Unit + E2E |
| Mobile | Capacitor | - | iOS/Android wrapper nativo |
| Deploy | Vercel | - | Auto-deploy, Edge functions, Cron |

---

## 2. Estructura de Directorios

```
src/
├── app/                        # Next.js App Router
│   ├── layout.tsx              # Root layout (providers, fonts, metadata)
│   ├── page.tsx                # Redirect → /dashboard
│   ├── globals.css             # Theme tokens (light/dark/high-contrast)
│   ├── animations.css          # Dashboard-only animations
│   ├── ui-overrides.css        # Scrollbar, Radix solid backgrounds
│   ├── error.tsx               # Global error boundary
│   ├── not-found.tsx           # 404 page
│   │
│   ├── (auth)/                 # Route group SIN dashboard layout
│   │   ├── login/page.tsx      # Login (client-side Supabase auth)
│   │   └── register/page.tsx   # Registro (client-side Supabase auth)
│   │
│   ├── (dashboard)/            # Route group CON dashboard layout
│   │   ├── layout.tsx          # Auth check + sidebar + header + org context
│   │   ├── dashboard/page.tsx  # KPIs, charts, alerts
│   │   ├── products/           # CRUD productos + detail + edit
│   │   ├── inventory/          # Stock levels + movements
│   │   ├── sales/              # Ventas + import CSV
│   │   ├── suppliers/          # Proveedores + quotes + compare
│   │   ├── orders/             # Purchase orders + detail
│   │   ├── research/           # Kanban pipeline de investigación
│   │   ├── calculator/         # FBA fee calculator
│   │   ├── forecasting/        # Reorder suggestions
│   │   ├── ads/                # PPC campaigns
│   │   ├── finances/           # Expenses + payouts
│   │   ├── returns/            # Returns + reimbursements
│   │   ├── shipments/          # FBA inbound shipments
│   │   ├── settings/           # User profile + FBA defaults
│   │   ├── import/             # CSV preview + batch insert
│   │   ├── analytics/          # Period comparison, heatmap, projections
│   │   ├── alerts/             # Alert rules + history + schedules
│   │   ├── team/               # Unified team (members + tasks + decisions)
│   │   ├── members/            # LLC members CRUD
│   │   ├── tasks/              # Task Kanban
│   │   ├── board-decisions/    # Board decisions
│   │   ├── drive/              # Google Drive browser
│   │   └── sp-api/             # SP-API integration
│   │
│   └── api/                    # API routes (75+ endpoints)
│       ├── products/           # CRUD + summary + [id]/suppliers
│       ├── sales/              # CRUD + summary + import
│       ├── inventory/          # List + summary + movements
│       ├── suppliers/          # CRUD + [id]/quotes + [id]/products
│       ├── orders/             # CRUD purchase orders
│       ├── dashboard/          # Dashboard aggregation
│       ├── sp-api/             # OAuth + sync + webhooks
│       ├── drive/              # Google Drive operations
│       ├── members/            # Governance members
│       ├── tasks/              # Task management
│       ├── board-decisions/    # Board decisions
│       ├── orgs/               # Multi-tenant organizations
│       ├── alerts/             # Alert rules + history
│       ├── schedules/          # Scheduled reports
│       ├── expenses/           # Expense tracking
│       ├── returns/            # Returns CRUD
│       ├── reimbursements/     # Reimbursements CRUD
│       ├── fba-shipments/      # FBA shipments
│       ├── ppc-campaigns/      # PPC campaigns
│       ├── research/           # Product research
│       ├── forecasting/        # Forecast suggestions
│       ├── calculator/         # FBA calculator
│       ├── analytics/          # Period comparison
│       ├── notifications/      # Notification generation
│       ├── push/               # Web Push subscribe/unsubscribe
│       ├── comments/           # Entity comments
│       ├── audit-log/          # Audit trail
│       ├── settings/           # User settings
│       ├── export/             # Excel export
│       ├── import/             # CSV import + templates
│       ├── share/              # Dashboard sharing
│       ├── cron/               # Cron jobs (alerts, reports, sync)
│       └── automation/         # Automation (weekly summary, notifications)
│
├── components/                 # React components
│   ├── ui/                     # 24 componentes base (shadcn + custom)
│   ├── charts/                 # 8 chart components (Recharts)
│   ├── drive/                  # 8 Google Drive components
│   ├── sidebar.tsx             # Desktop sidebar
│   ├── mobile-bottom-nav.tsx   # Mobile bottom nav
│   ├── top-header.tsx          # Sticky top header
│   ├── global-search.tsx       # Cmd+K search
│   ├── notification-bell.tsx   # Notification panel
│   ├── org-switcher.tsx        # Organization switcher
│   ├── org-layout.tsx          # Org context provider
│   ├── product-form-modal.tsx  # Product create/edit modal
│   ├── sale-form-modal.tsx     # Sale create modal
│   ├── supplier-form-modal.tsx # Supplier create/edit modal
│   ├── order-form-modal.tsx    # Order create/edit modal
│   ├── member-form-modal.tsx   # Member create/edit modal
│   ├── member-detail-modal.tsx # Member detail view
│   ├── theme-provider.tsx      # next-themes wrapper
│   ├── theme-toggle.tsx        # Dark/light + high contrast toggle
│   ├── push-notification-provider.tsx  # Web Push provider
│   ├── push-toggle.tsx         # Push notification toggle
│   ├── onboarding-checklist.tsx # New user guide
│   ├── help-button.tsx         # Floating help button
│   ├── help-modal.tsx          # Help modal
│   ├── error-boundary.tsx      # React error boundary
│   ├── error-boundary-wrapper.tsx
│   ├── barcode-scanner.tsx     # html5-qrcode wrapper
│   ├── pwa-register.tsx        # Service worker registration
│   ├── pwa-install.tsx         # PWA install prompt
│   ├── capacitor-provider.tsx  # Capacitor context
│   ├── capacitor-shell.tsx     # Capacitor app shell
│   ├── skip-to-content.tsx     # WCAG skip link
│   └── announcer.tsx           # Screen reader announcements
│
├── hooks/                      # Custom React hooks
│   ├── use-auth.ts             # Client-side logout
│   ├── use-data.ts             # SWR hooks (products, inventory, sales, dashboard, etc.)
│   ├── use-governance.ts       # SWR hooks (members, tasks, decisions)
│   ├── use-notifications.ts    # Notification fetcher
│   ├── use-org.tsx             # Multi-tenant org context
│   ├── use-debounce.ts         # Generic debounce
│   └── use-focus-trap.ts       # Modal focus trap (WCAG)
│
├── lib/                        # Utilities and services
│   ├── utils.ts                # cn(), fmt(), fmtPct(), roiColor(), profitColor(), stockColor()
│   ├── calculations.ts         # calcRefFee(), calcFBAFee(), calcMetrics() [INMUTABLE]
│   ├── constants.ts            # MARKETPLACES, PRODUCT_CATEGORIES, STATUSES
│   ├── form-constants.ts       # inputClass, labelClass, sectionLabel, getTodayStr()
│   ├── api-handler.ts          # createApiHandler(), buildPagination(), paginatedResponse()
│   ├── api-utils.ts            # apiErrorResponse()
│   ├── fetcher.ts              # SWR fetcher function
│   ├── rate-limit.ts           # In-memory rate limiter
│   ├── sort-parser.ts          # parseSort(), sort mappings
│   ├── navigation.ts           # navItems array (18 modules)
│   ├── notifications.ts        # generateNotifications()
│   ├── email.ts                # Resend email integration
│   ├── export.ts               # Excel export (exportToExcelPro + per-module)
│   ├── forecasting.ts          # Reorder suggestion calculations
│   ├── help-content.ts         # HELP_GLOSSARY + HELP_SECTIONS
│   ├── supabase/
│   │   ├── server.ts           # createClient() + createServiceRoleClient()
│   │   ├── client.ts           # Browser client
│   │   └── middleware.ts       # updateSession() - token refresh + redirects
│   ├── sp-api/                 # Amazon SP-API integration
│   │   ├── client.ts           # SpApiClient class
│   │   ├── auth.ts             # OAuth flow
│   │   ├── endpoints.ts        # API endpoint functions
│   │   ├── notifications.ts    # Webhook management
│   │   └── types.ts            # SP-API types and constants
│   ├── drive/                  # Google Drive integration org-scoped
│   │   ├── client.ts           # getDriveClientForConnection()
│   │   ├── connection-secrets.ts # Secretos cifrados server-only
│   │   ├── types.ts            # Drive types
│   │   └── index.ts            # Barrel export
│   ├── actions/                # Server actions (7 files)
│   │   ├── products.ts
│   │   ├── sales.ts
│   │   ├── suppliers.ts
│   │   ├── orders.ts
│   │   ├── members.ts
│   │   ├── tasks.ts
│   │   └── decisions.ts
│   ├── i18n/                   # Internationalization
│   │   ├── translations.ts     # t(key, locale) function
│   │   ├── locale-context.tsx   # LocaleProvider + useLocale
│   │   ├── es.json             # Spanish (500+ keys)
│   │   ├── en.json             # English
│   │   └── ar.json             # Arabic (RTL)
│   └── test-utils/
│       └── mock-request.ts     # createMockRequest() for API tests
│
├── types/
│   └── index.ts                # 30+ interfaces, 15+ type unions
│
├── validations/                # Zod schemas (17 files)
│   ├── product.ts
│   ├── sales.ts
│   ├── order.ts
│   ├── supplier.ts
│   ├── member.ts               # memberSchema + taskSchema + boardDecisionSchema
│   ├── inventory.ts
│   ├── expense.ts
│   ├── campaign.ts
│   ├── research.ts
│   ├── return.ts
│   ├── reimbursement.ts
│   ├── fba-shipment.ts
│   ├── settings.ts
│   ├── payout.ts
│   ├── comment.ts
│   └── audit-log.ts
│
├── middleware.ts                # Next.js middleware (Supabase session refresh)
└── test/
    └── setup.ts                # Vitest setup (@testing-library/jest-dom)

supabase/
└── migrations/                 # 21 SQL migration files (008-025)
```

---

## 3. Flujo de Autenticación (3 capas de protección)

### Capa 1: Middleware (`src/middleware.ts`)

Se ejecuta en CADA request (excepto assets estáticos). Refresca tokens Supabase y redirige:

```
Request → middleware.ts → updateSession()
  │
  ├─ ¿Usuario logueado + en /login o /register? → Redirect a /dashboard
  ├─ ¿Usuario NO logueado + NO en /login, /register, /api/*? → Redirect a /login
  └─ Continuar con cookies actualizadas
```

**Archivo clave:** `src/lib/supabase/middleware.ts`
- Usa `createServerClient` de `@supabase/ssr` con manejo manual de cookies
- Refresca tokens en cada request (auto-login renewal)
- Las rutas `/api/*` NO redirigen (manejan 401 internamente)

### Capa 2: Dashboard Layout (`src/app/(dashboard)/layout.tsx`)

Server Component que verifica auth antes de renderizar:

```typescript
// Server-side check (NO client-side)
const supabase = await createClient();
const { data: { user } } = await supabase.auth.getUser();
if (!user) redirect("/login");
```

- Layout protege TODAS las sub-rutas dentro de `(dashboard)/`
- Incluye Sidebar, TopHeader, MobileBottomNav, OrgLayout
- Logout es una Server Action (no client-side fetch)

### Capa 3: API Routes (`src/lib/api-handler.ts`)

Cada endpoint verifica auth individualmente:

```typescript
export function createApiHandler(handler, rateLimitOpts?) {
  return async (req) => {
    // 1. Rate limiting (60 req/min por IP+route)
    // 2. createClient() → getUser() → 401 si no hay user
    // 3. Resolver org_id (header → membership → auto-create)
    // 4. Ejecutar handler con { supabase, user, orgId, req }
  };
}
```

### Flujo completo de Login

```
1. Usuario ingresa email/password en /login
2. Client-side: supabase.auth.signInWithPassword()
3. Supabase retorna session tokens (guardados en cookies httpOnly)
4. window.location.href = "/dashboard" (full reload para sincronizar cookies)
5. Middleware detecta usuario logueado → actualiza tokens → permite paso
6. Dashboard layout verifica getUser() → renderiza contenido
7. API routes verifican getUser() en cada request
```

### Clientes Supabase

| Cliente | Archivo | Uso | Acceso |
|---------|---------|-----|--------|
| Server (cookies) | `lib/supabase/server.ts` | API routes, layouts, server actions | Cookie-based, RLS activo |
| Service Role | `lib/supabase/server.ts` | Auto-creación de org, operaciones admin | Sin RLS, acceso total |
| Browser | `lib/supabase/client.ts` | Org context, auth hook | Cookie-based, RLS activo |

---

## 4. Sistema de Layouts

```
src/app/layout.tsx                    ← Root layout (Theme, Locale, Push, Capacitor, Fonts)
└── src/app/(auth)/login/page.tsx     ← Auth pages (SIN dashboard layout)
└── src/app/(auth)/register/page.tsx
└── src/app/(dashboard)/layout.tsx    ← Dashboard layout (Auth check + Sidebar + Header + Org)
    ├── sidebar.tsx                   ← Desktop: fixed left w-64
    ├── mobile-bottom-nav.tsx         ← Mobile: fixed bottom
    ├── top-header.tsx                ← Desktop: sticky top
    ├── org-layout.tsx                ← OrgContext provider
    └── children                      ← Pages (products, sales, etc.)
```

### Desktop (≥1024px):
```
+----------+------------------------------------------+
| Sidebar  | TopHeader (sticky, backdrop-blur)        |
| w-64     |------------------------------------------|
| fixed    | Main content (lg:ms-64, p-4..8)          |
| left     |                                          |
+----------+------------------------------------------+
```

### Mobile (<1024px):
```
+------------------------------------------+
| Mobile header (logo + settings + logout) |
|------------------------------------------|
| Main content (p-4, pb-24)                |
|                                          |
|------------------------------------------|
| MobileBottomNav (fixed bottom, 5 items)  |
+------------------------------------------+
```

---

## 5. Patrón de Datos: SWR → API → Supabase

### Flujo típico de una página:

```
┌─────────────┐     fetch()      ┌──────────────┐    Supabase    ┌────────────┐
│  React Page  │ ──────────────→ │  /api/*       │ ────────────→ │  PostgreSQL │
│  (use hook)  │ ←────────────── │  (route.ts)   │ ←──────────── │  (table)    │
└─────────────┘    JSON response └──────────────┘  query result  └────────────┘
       │
       ├── useProductsQuery(params)  → SWR hook → /api/products?...
       ├── useDashboard()            → SWR hook → /api/dashboard
       └── direct fetch()            → fetch("/api/...")        ← algunas páginas
```

### SWR Configuration (compartida):

```typescript
// src/hooks/use-data.ts
{
  revalidateOnFocus: false,    // No recargar al cambiar de pestaña
  dedupingInterval: 10000,     // 10s de deduplicación
  errorRetryCount: 3,          // 3 reintentos
  refreshInterval: 0,          // Sin auto-refresh (excepto dashboard: 120s)
}
```

### Hooks disponibles:

| Hook | Archivo | Datos | Refresh |
|------|---------|-------|---------|
| `useProductsQuery(params)` | `use-data.ts` | Products paginated + filtered | on-demand |
| `useProductSummary()` | `use-data.ts` | Product stats | on-demand |
| `useInventoryQuery(params)` | `use-data.ts` | Inventory paginated | on-demand |
| `useInventorySummary()` | `use-data.ts` | Inventory stats | on-demand |
| `useSalesQuery(params)` | `use-data.ts` | Sales paginated | on-demand |
| `useSalesSummary()` | `use-data.ts` | Sales stats | on-demand |
| `useDashboard()` | `use-data.ts` | Dashboard data | 120s |
| `useAlertRules()` | `use-data.ts` | Alert rules | on-demand |
| `useAlertHistory(limit)` | `use-data.ts` | Alert history | on-demand |
| `useScheduledReports()` | `use-data.ts` | Reports config | on-demand |
| `useReorderRules()` | `use-data.ts` | Reorder rules | on-demand |
| `useAuditLog(entity?,action?)` | `use-data.ts` | Audit log | on-demand |
| `useMembers()` | `use-governance.ts` | LLC members | on-demand |
| `useTasks(status?,module?)` | `use-governance.ts` | Tasks | on-demand |
| `useBoardDecisions()` | `use-governance.ts` | Decisions | on-demand |
| `useGovernanceSummary()` | `use-governance.ts` | Aggregated stats | on-demand |
| `useNotifications()` | `use-notifications.ts` | Notifications | on-demand |

### Patrón de paginación:

```
Frontend                          API                              DB
─────────                         ───                              ──
useProductsQuery({                GET /api/products?               SELECT * FROM products_with_inventory
  page: 2,                        ?page=2                          WHERE org_id = $orgId
  perPage: 20,                    &perPage=20                      AND name ILIKE '%search%'
  search: "widget",               &search=widget                   AND status = 'active'
  status: "active",               &sort=roi-desc                   ORDER BY roi DESC
  sort: "roi-desc"                                                    LIMIT 20 OFFSET 20
})
                                 → { data: [...], pagination: { total, page, perPage, totalPages } }
```

---

## 6. Sistema Multi-Tenant

### Jerarquía de datos:

```
Organización (organizations)
├── Miembros (org_members) → role: owner/admin/editor/viewer
├── Invitaciones (org_invitations) → token-based, expira en 7 días
└── Todos los datos (products, sales, suppliers, etc.) → org_id FK
```

### Resolución de org_id (en `createApiHandler`):

```
1. Header: x-org-id (del OrgSwitcher client-side)
   ↓ si no existe
2. Membership: buscar en org_members WHERE user_id = current AND status = 'active'
   ↓ si no existe
3. Auto-crear: crear org "Mi Organización" + agregar user como owner
```

### RLS (Row Level Security):

Todas las tablas core usan `is_org_member(org_id)` como política base:
- **SELECT/INSERT/UPDATE**: `is_org_member(org_id)` → cualquier miembro activo
- **DELETE**: `is_org_member(org_id) AND get_org_role(org_id) IN ('owner', 'admin', 'editor')` → editor+
- **Tablas sensibles** (members, board_decisions): DELETE requiere owner/admin

Ver `DATABASE.md` para el esquema completo de RLS.

---

## 7. Integraciones Externas

### 7.1 Amazon SP-API

**Flujo OAuth:**
```
1. Frontend: POST /api/sp-api/auth → genera OAuth URL
2. Usuario autoriza en Seller Central
3. Callback: GET /api/sp-api/auth/callback?code=...
4. Backend: exchangeAuthCode(code) → access_token + refresh_token
5. Guarda tokens en sp_api_connections (encriptados)
6. Sync: POST /api/sp-api/sync → fetch data de Amazon → upsert en tablas
```

**Webhooks:**
```
Amazon → POST /api/sp-api/webhooks → parseNotificationMessage() → procesar
8 tipos: ORDER_STATUS_CHANGED, INVENTORY_EVENT, REPORT_PROCESSING_FINISHED, etc.
```

**Archivos clave:**
- `lib/sp-api/client.ts` → SpApiClient class (GET/POST/PUT/DELETE)
- `lib/sp-api/auth.ts` → OAuth URL + exchange + refresh
- `lib/sp-api/endpoints.ts` → getListings, getOrders, getInventory, getFeeEstimate, etc.
- `lib/sp-api/notifications.ts` → Webhook destination/subscription management
- `lib/sp-api/types.ts` → Marketplace IDs, SP-API endpoints, types

### 7.2 Google Drive

**Autenticación:**
```
1. OAuth2 crea una conexión cifrada asociada a la organización activa.
2. El refresh token solo vive cifrado en `drive_connection_secrets` y se lee server-side.
3. Sin conexión activa, autorización o containment bajo su raíz, la operación falla cerrado.
```

**Superficie actual:** la UI es read-only: lista metadata, navega carpetas y abre `webViewLink`. Las rutas CRUD legacy permanecen protegidas para compatibilidad, pero no se exponen en la UI.

**Archivos clave:**
- `lib/drive/client.ts` → getDriveClientForConnection() (conexión org-scoped)
- `lib/drive/connection-secrets.ts` → lectura server-only de secretos cifrados
- `lib/drive/types.ts` → DriveFile, BackupResult

### 7.3 Web Push Notifications

**Stack:** VAPID keys + Service Worker + `push_subscriptions` table

```
1. PushNotificationProvider (context) → manage subscription lifecycle
2. PushToggle (settings) → enable/disable
3. POST /api/push/subscribe → upsert subscription (endpoint + p256dh + auth)
4. Server-side: web-push library → send to all subscriptions
```

### 7.4 Email (Resend)

**Stack:** Resend API (`RESEND_API_KEY`)

```typescript
// lib/email.ts
sendEmail({ to, subject, html })        // Envía email via Resend
buildAlertEmailHtml(alert)              // Template HTML para alertas
```

### 7.5 Capacitor (Mobile)

**Config:** `capacitor.config.ts` → appId `com.costtasholding.fba-manager`, webDir `.next`

**Flujo:**
```
1. Next.js build → .next/
2. cap sync → copia web assets a ios/android
3. cap open:ios/android → abre IDE nativo
```

---

## 8. Layouts Anidados y Carga de Datos

### Patrón de carga por página:

```
Server (layout.tsx)                    Client (page.tsx)
─────────────────                      ─────────────────
Auth check (getUser)                   "use client"
Sidebar + Header render                useEffect → SWR hook
Org context provider                   fetch("/api/...")
                                       Renders data
```

**Por qué:** Los layouts son Server Components (acceso a cookies, auth). Las pages son Client Components (estado local, SWR, interactividad).

### Módulos con layouts anidados:

| Módulo | Layout | Propósito |
|--------|--------|-----------|
| dashboard | `dashboard/layout.tsx` | Sub-secciones del dashboard |
| products | `products/layout.tsx` | Products section wrapper |
| inventory | `inventory/layout.tsx` | Inventory section wrapper |
| suppliers | `suppliers/layout.tsx` | Suppliers section wrapper |
| settings | `settings/layout.tsx` | Settings tab navigation |

---

## 9. Error Handling

### 3 niveles de error boundary:

1. **Global** (`src/app/error.tsx`) → Catch-all para errores no manejados
2. **Module** (`src/app/(dashboard)/[module]/error.tsx`) → Por módulo
3. **Componente** (`src/components/error-boundary.tsx`) → Por componente

### Patrón de error en pages:

```typescript
// Cada módulo tiene su error.tsx
"use client";
export default function Error({ error, reset }) {
  return (
    <ErrorFallback
      title={t("error.products_load", locale)}
      digest={error.digest}
      onRetry={reset}
    />
  );
}
```

### Errores en API:

```typescript
// createApiHandler atrapa todo
catch (err) {
  console.error("API Error:", err);  // Log interno
  return NextResponse.json(
    { error: "Error interno del servidor" },  // Mensaje genérico (nunca expone internals)
    { status: 500 }
  );
}
```

---

## 10. PWA y Offline

### Service Worker (`PWARegister`):
- Registra SW en mount
- Cachea assets, API responses, y navigations por separado
- Offline fallback page: `/offline`

### PWA Install (`PWAInstallPrompt`):
- Captura evento `beforeinstallprompt`
- Muestra banner de instalación
- Detecta si ya está instalado (display-mode: standalone)

### Manifest:
- App name: "CosttasHolding Manager"
- Theme: #0a0c14 (dark)
- Icons: icon.png, logo_solo.png

---

## 11. Seguridad

### Headers HTTP (aplicados en `next.config.js`):

| Header | Valor | Propósito |
|--------|-------|-----------|
| X-Frame-Options | DENY | Prevenir clickjacking |
| X-Content-Type-Options | nosniff | Prevenir MIME sniffing |
| Referrer-Policy | strict-origin-when-cross-origin | Control de referrer |
| COOP | same-origin | Cross-Origin isolation |
| COEP | credentialless | Cross-Origin isolation |
| CORP | same-origin | Cross-Origin isolation |
| HSTS | max-age=63072000; includeSubDomains; preload | Forzar HTTPS |
| CSP | Configurado por entorno (dev/prod) | Prevención XSS |
| Permissions-Policy | camera=(self), microphone=(), geolocation=(self) | Features restringidos |

### Rate Limiting:
- In-memory por IP + route
- Default: 60 requests / 60 segundos
- Retorna 429 con `Retry-After` header
- Auto-limpieza a 1000 entries

### Datos sensibles:
- `SUPABASE_SERVICE_ROLE_KEY` → Solo server-side
- `SP_API_CLIENT_SECRET` → Solo server-side
- `GOOGLE_OAUTH_CLIENT_SECRET` → Solo server-side
- `VAPID_PRIVATE_KEY` → Solo server-side
- API routes nunca exponen error details al client

---

## 12. Internacionalización (i18n)

### Arquitectura custom (sin next-intl):

```typescript
// Context provider
<LocaleProvider>  // es (default), en, ar
  {children}
</LocaleProvider>

// Uso en componentes
const { locale } = useLocale();
return <h1>{t("products.title", locale)}</h1>;

// Persistencia
localStorage("fba-locale") → "es" | "en" | "ar"
```

### RTL Support:
- Arabic locale activa `dir="rtl"` en `<html>`
- CSS logical properties (start/end en vez de left/right)
- 250+ conversiones en UI

---

## 13. Deploy

### Pipeline:
```
npm run typecheck (TypeScript strict)
  → npm run lint (ESLint next/core-web-vitals)
    → npm run test:run (Vitest)
      → npm run build (Next.js production)
        → npx vercel deploy --prod (auto-deploy)
```

### Plataforma: Vercel
- Project: `prj_EqQ7T1o3mk6qCFNs7PNWnU3jAsmo`
- Production: `https://amazon-fba-manager-virid.vercel.app`
- Cron jobs configurados en `vercel.json`

---

## Reglas Anti-Deuda (para código NUEVO)

Auditoría 2026-08-22: `use-data.ts` (17 hooks, 7 dominios), `types/index.ts` (724 líneas, ~16 dominios) y 43 de 96 API routes con auth manual sin handler. Código nuevo sigue estas reglas; el viejo se migra solo cuando una feature lo toque:

1. **Types**: interfaces nuevas van a `src/lib/<dominio>/types.ts` o `src/types/<dominio>.ts`. `src/types/index.ts` congelado salvo tipos genuinamente cross-dominio.
2. **Hooks**: hooks de datos nuevos en `src/hooks/use-<dominio>.ts` (patrón `use-governance.ts`). `use-data.ts` cerrado a adiciones.
3. **API routes**: toda route con auth de usuario usa `createApiHandler` (rate-limit + org uniformes). Route manual que se toca → se migra al handler (boy-scout).
4. **Páginas**: al superar ~500 líneas, extraer client component a `src/components/<dominio>/`.
5. **Tests**: código nuevo en `src/lib/` requiere `*.test.ts` co-ubicado.
6. **Helpers compartidos**: antes de crear otro builder de querystring/hook duplicado, extraer a `src/lib/`.

---

## Archivos Relacionados

| Tema | Ver |
|------|-----|
| Esquema de tablas y RLS | `DATABASE.md` |
| Endpoints API | `API.md` |
| Componentes UI | `UI-PATTERNS.md` |
| Lógica de módulos | `MODULES.md` |
| Reglas de código | `CONVENTIONS.md` |
| Design tokens | `DESIGN_SYSTEM.md` |
