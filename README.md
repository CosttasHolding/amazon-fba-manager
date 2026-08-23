# CosttasHolding Manager v2.0

Plataforma profesional de gestion de negocios Amazon FBA. All-in-one: productos, inventario, ventas, proveedores, ordenes, analytics, automatizacion, multi-tenant.

**Deploy:** https://amazon-fba-manager-virid.vercel.app

---

## Stack

| Capa | Tecnologia |
|------|------------|
| Framework | Next.js 14.2.35 (App Router) + TypeScript 5 strict |
| Backend | Supabase (PostgreSQL + Auth + RLS + Realtime) |
| UI | Tailwind CSS + shadcn/ui (Radix primitives) |
| State | SWR (data fetching) + react-hook-form + Zod |
| Visual | Recharts (charts) + lucide-react (icons) + sonner (toasts) |
| Testing | Vitest + Playwright (E2E) |
| Mobile | Capacitor (iOS / Android) |
| Deploy | Vercel |

---

## Funcionalidades

Plataforma con **25+ modulos** integrados:

| Modulo | Descripcion |
|--------|-------------|
| **Dashboard** | KPIs en tiempo real, charts interactivos, alerts system |
| **Products** | CRUD completo con cost breakdown y generated columns |
| **Inventory** | Stock levels, movimientos con DB triggers automaticos |
| **Sales** | Registro manual + CSV import, profit calculation por SKU |
| **Suppliers** | Directorio con ratings, quotes y comparativa de precios |
| **Orders** | Purchase order lifecycle completo: draft -> confirmed -> delivered |
| **Research** | Kanban pipeline para investigacion de productos |
| **Calculator** | FBA fee calculator con escenarios P/R/O |
| **Forecasting** | Reorder suggestions basadas en sales velocity |
| **Ads/PPC** | Campaign management con daily metrics y budgets |
| **Finances** | Expenses tracking + Amazon payouts reconciliation |
| **Returns + Reimbursements** | Dual-tab tracking para returns y reimbursements |
| **Shipments** | FBA inbound shipments con stepper form wizard |
| **Settings** | Profile, FBA defaults, language preferences |
| **Import** | Multi-step CSV import con validation y mapping |
| **Analytics** | Period comparison, projections y sales heatmap |
| **Alerts** | Configurable rules con cron evaluation automatica |
| **Team** | Members management, Tasks Kanban, Board Decisions |
| **Google Drive** | OAuth browser flow, backup automtico |
| **SP-API** | Amazon integration, sync programatico, webhooks |
| **Multi-tenant** | Organizations, RLS por tenant, invitation system |
| **i18n** | Spanish, English, Arabic (RTL support completo) |
| **PWA** | Offline support, push notifications |
| **Mobile** | Capacitor wrapper para iOS/Android |
| **Accessibility** | WCAG 2.1 AA, high contrast mode |

---

## Quick Start

### Requisitos

- Node.js 20.19+ (o 22.12+) — requerido por Vitest 4
- Cuenta [Supabase](https://supabase.com)

### Instalacion

```bash
git clone [repo-url]
cd amazon-fba-manager
npm install
cp .env.example .env    # Configurar Supabase keys
npm run dev
```

La app estara disponible en `http://localhost:3000`.

---

## Environment Variables

### Requeridas

| Variable | Descripcion |
|----------|-------------|
| `NEXT_PUBLIC_SUPABASE_URL` | URL del proyecto Supabase |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Anon key publica de Supabase |
| `SUPABASE_SERVICE_ROLE_KEY` | Service role key (solo server-side) |
| `NEXT_PUBLIC_APP_URL` | URL base de la aplicacion |

### Opcionales

| Variable | Descripcion |
|----------|-------------|
| `SP_API_*` | Amazon Selling Partner API credentials |
| `GOOGLE_OAUTH_*` | Google Drive OAuth credentials |
| `VAPID_*` | Web Push notifications keys |
| `RESEND_API_KEY` | Email service via Resend |
| `CRON_SECRET` | Secret para Vercel Cron endpoints |

---

## Scripts

```bash
# Desarrollo
npm run dev              # Servidor de desarrollo en http://localhost:3000
npm run build            # Build de produccion
npm start                # Servidor en modo produccion
npm run lint             # ESLint (0 errores, 0 warnings)

# Unit Testing
npm run test             # Vitest en watch mode
npm run test:run         # Ejecutar todos los unit tests
npm run test:ui          # Vitest UI

# E2E Testing
npm run e2e              # Playwright tests en Chromium
npm run e2e:ui           # Playwright UI

# Capacitor (Mobile)
npm run cap:sync         # Sincronizar build con Capacitor
npm run cap:open:ios     # Abrir en Xcode (iOS)
npm run cap:open:android # Abrir en Android Studio
```

---

## Project Structure

```
src/
├── app/                    # Next.js App Router (pages + API routes)
│   ├── (app)/              # Authenticated app layout
│   └── api/                # API routes + automation endpoints
├── components/             # Shared UI components (shadcn/ui + custom)
├── lib/                    # Utilities, Supabase client, helpers
├── hooks/                  # Custom React hooks
├── types/                  # TypeScript type definitions
├── locales/                # i18n translations (es, en, ar)
└── test/                   # Vitest setup + test utilities
supabase/
├── migrations/             # Database migrations (run in order)
└── triggers/               # Database trigger functions
docs/                       # Full documentation (see below)
```

Para una descripcion completa de la arquitectura, ver [ARCHITECTURE.md](ARCHITECTURE.md).

---

## Documentacion

Docs tecnicos nucleo en la raiz; historicos en `docs/archive/`; auditorias y QA en `docs/audits/` y `docs/QA_LOG.md`:

| Archivo | Contenido |
|---------|-----------|
| [ARCHITECTURE.md](ARCHITECTURE.md) | Arquitectura del sistema, patrones, data flow |
| [DATABASE.md](DATABASE.md) | Esquema completo de base de datos, relaciones |
| [API.md](API.md) | Guia de API routes, endpoints, auth |
| [MODULES.md](MODULES.md) | Logica de negocio por modulo |
| [UI-PATTERNS.md](UI-PATTERNS.md) | Design system y componentes UI |
| [CONVENTIONS.md](CONVENTIONS.md) | Reglas y convenciones de codigo |
| [DESIGN_SYSTEM.md](DESIGN_SYSTEM.md) | Tokens visuales y estetica |
| [AUTOMATIZACIONES.md](docs/AUTOMATIZACIONES.md) | Cron jobs y automation endpoints |
| [QA_LOG.md](docs/QA_LOG.md) | Testing funcional con datos reales (FASE 11) |

---

## Testing

- **168 unit tests** (Vitest + @testing-library/react)
- **E2E tests** (Playwright: Chromium + Mobile Chrome)

```bash
npm run test:run          # Ejecutar todos los unit tests
npm run e2e               # Ejecutar tests E2E
```

---

## Deploy

Deploy automatico a **Vercel** en cada build exitoso del branch principal.

**Produccion:** https://amazon-fba-manager-virid.vercel.app

### Cron Jobs (Vercel Cron)

| Endpoint | Frecuencia | Descripcion |
|----------|------------|-------------|
| `/api/automation/notifications` | Cada 6h | Genera notificaciones de stock bajo |
| `/api/automation/forecasting` | Diario 6am | Reorder suggestions por product velocity |
| `/api/automation/weekly-summary` | Lunes 12pm | Resumen semanal: revenue, ROI, alerts |

---

## Licencia

MIT
