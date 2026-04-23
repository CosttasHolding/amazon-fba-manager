# Amazon FBA Manager V2

Aplicacion web profesional para gestion de productos Amazon FBA. Controla inventario, ventas, proveedores, pedidos, research y rentabilidad desde un solo dashboard.

## Stack Tecnologico

- **Next.js 14.2** (App Router)
- **TypeScript 5** (strict mode)
- **Supabase** (Auth + PostgreSQL + RLS + Storage)
- **Tailwind CSS 3** + shadcn/ui + Radix UI
- **next-themes** (dark/light mode)
- **Recharts** (graficos)
- **React Hook Form 7** + Zod 3 (formularios y validacion)
- **sonner** (toasts)
- **date-fns**, **xlsx**, **jspdf** (utilidades)

## Requisitos

- Node.js 18+
- Cuenta en [Supabase](https://supabase.com)

## Instalacion

```bash
npm install
```

Copiar `.env.example` a `.env.local` y completar:

```env
NEXT_PUBLIC_SUPABASE_URL=https://tu-proyecto.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=tu-anon-key
```

### Base de datos

1. Ir al SQL Editor en Supabase
2. Ejecutar `supabase/migrations/001_init.sql`
3. Ejecutar `supabase/migrations/002_enhanced.sql`

### Desarrollo

```bash
npm run dev
```

Abrir http://localhost:3000

## Scripts

| Script | Descripcion |
|--------|-------------|
| `npm run dev` | Servidor de desarrollo |
| `npm run build` | Build de produccion |
| `npm run test:run` | Tests unitarios + integracion (Vitest) |
| `npm run e2e` | Tests E2E (Playwright) |
| `npm run lint` | ESLint |

## Estructura del Proyecto

```
amazon-fba-manager/
├── src/
│   ├── app/
│   │   ├── (auth)/            # Login, Register
│   │   ├── (dashboard)/        # Dashboard, Products, Orders, etc.
│   │   └── api/                # API Routes (App Router)
│   ├── components/
│   │   ├── ui/                 # shadcn/ui components
│   │   └── charts/             # Graficos Recharts
│   ├── hooks/                  # Custom hooks (use-data.ts)
│   ├── lib/                    # Utilidades (calculations, export, fetcher)
│   ├── validations/            # Schemas Zod
│   └── types/                  # TypeScript types
├── e2e/                        # Tests E2E con Playwright
├── supabase/migrations/        # SQL schemas
├── docs/                       # Documentacion del proyecto
└── public/                     # Assets estaticos
```

## Funcionalidades

### Dashboard
- KPIs con deltas y tendencias (revenue, ROI, unidades, margen)
- Graficos de ventas (30d / 12 semanas)
- Top 5 productos por rentabilidad
- Alertas de stock y onboarding checklist

### Productos
- CRUD completo con calculo automatico de ROI, ganancia, margen
- Vista de inventario integrada (products_with_inventory)
- Busqueda, filtros y paginacion
- Exportar a Excel

### Proveedores
- CRUD de proveedores con ratings
- Comparador de proveedores
- Cotizaciones por proveedor

### Pedidos (Purchase Orders)
- CRUD de ordenes de compra
- Timeline visual del estado (draft → delivered)
- Tracking de pagos (deposito + balance)
- KPIs de pedidos

### Inventario
- Stock actual, en transito, en warehouse
- Alertas automaticas (bajo stock, sin stock, sobrestock)
- Historial de movimientos
- Proyecciones de stock

### Ventas
- Registro de ventas con revenue neto
- Graficos de tendencia
- Exportar a PDF

### Research
- Kanban de ideas de productos (6 columnas)
- Vista de lista
- Priorizacion y estimacion de ROI

### Calculadora
- Estimacion de tarifas FBA
- Scenarios (Pessimista / Realista / Optimista)
- Guardar analisis

### Import / Export
- Importacion CSV con preview
- Exportacion a Excel profesional (estilos, filtros)

### Configuracion
- Perfil de usuario
- Preferencias de tema (dark/light)

## Testing

### Unitarios + Integracion (Vitest)
```bash
npm run test:run
```

Cobertura actual: **90 tests pasando**

- `src/lib/calculations.test.ts` — Calculos de fees y metricas
- `src/lib/utils.test.ts` — Formateo y helpers visuales
- `src/lib/fetcher.test.ts` — Cliente HTTP
- `src/lib/export.test.ts` — Exportacion Excel
- `src/validations/schemas.test.ts` — Validaciones Zod
- `src/app/api/products/route.test.ts` — API products (GET/POST)
- `src/app/api/orders/route.test.ts` — API orders (GET/POST)

### E2E (Playwright)
```bash
npm run e2e
```

- Auth pages rendering
- Redireccion sin autenticacion
- Responsive (desktop + mobile)

## Reglas de Codigo

- TypeScript strict, nunca `any`
- `snake_case` en DB, `camelCase` en frontend
- `user_id = auth.uid()` en todas las queries
- `createClient()` con `await` (server) / sin `await` (client)
- Formularios: react-hook-form + zod siempre
- Toasts: sonner (no toast viejo)
- Variables CSS semanticas: `bg-background`, `text-foreground`, nunca `bg-white`

## Performance

- Dashboard bundle: **8.48 kB** (charts cargados dinamicamente)
- Code splitting con `next/dynamic` en componentes pesados
- `loading.tsx` en rutas principales
- Fuentes con `next/font/google` + `display: swap`

## Accesibilidad

- Skip link al contenido principal
- `aria-current="page"` en navegacion activa
- `aria-label` en botones de solo icono
- `aria-pressed` en toggle de tema
- Radix UI maneja focus trap en modales

## Licencia

MIT
