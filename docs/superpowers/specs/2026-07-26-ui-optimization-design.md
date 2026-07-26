# Diseño: Optimización de UI — Mobile, Consistencia y Transiciones

**Fecha:** 2026-07-26
**Objetivo:** Mejorar la experiencia mobile, estandarizar la consistencia visual, y agregar transiciones/micro-interacciones con Framer Motion
**Enfoque:** Pulido selectivo — alto impacto, bajo riesgo
**Estado:** Aprobado por el usuario

---

## Resumen

El proyecto tiene 30+ páginas con un sistema de diseño ya definido (CSS variables, temas claro/oscuro, animaciones CSS, layout responsive con sidebar + bottom nav). El análisis de UI identificó oportunidades de mejora en tres áreas:

1. **Mobile UX** — falta búsqueda y notificaciones en mobile, bottom nav "More" está sobrecargado, safe areas incompletos
2. **Consistencia visual** — paddings de tabla, duraciones de animación, y espaciados varían entre páginas
3. **Transiciones** — no hay animaciones de entrada/salida entre páginas, micro-interacciones limitadas

---

## Sección 1: Mobile UI

### 1.1 Search + Notificaciones en Mobile

Agregar `GlobalSearch` y `NotificationBell` al mobile top bar (`layout.tsx`). Actualmente solo se muestran en desktop (`hidden lg:flex`).

- Mobile top bar tiene un icono de lupa que abre `GlobalSearch` en modal full-screen
- `NotificationBell` se muestra como icono con badge, mismo comportamiento que desktop

**Archivos a modificar:**
- `src/app/(dashboard)/layout.tsx` — sección `/* Mobile top bar */`

### 1.2 Categorías en Sidebar Web + "More" Mobile

Refactorizar `src/lib/navigation.ts` para soportar categorías:

```ts
export interface NavCategory {
  label: string;
  icon: LucideIcon;
  items: NavItem[];
}
```

**Estructura de categorías:**

| Categoría | Items |
|-----------|-------|
| *(sin categoría)* | Dashboard |
| Operations | Sales, Orders, Shipments, Returns, Inventory |
| Products & Sourcing | Products, Suppliers, Research |
| Finance & Analytics | Finances, Forecasting, Analytics, PPC Ads, Calculator |
| Tools & Config | Alerts, SP-API, Google Drive, Team |

**Sidebar web** (`sidebar.tsx`): Renderizar categorías con header + divider + items.
**Mobile bottom nav** (`mobile-bottom-nav.tsx`): El sheet "More" muestra las categorías agrupadas con headers.

### 1.3 Safe Areas

- Agregar `pt-[env(safe-area-inset-top)]` al mobile top bar
- Mantener `pb-[env(safe-area-inset-bottom)]` existente en bottom nav

### 1.4 KPI Grid Mobile

Cambiar KPI cards de `grid-cols-1` a `grid-cols-2` en mobile (`< 640px`), manteniendo comportamiento actual en sm+.

---

## Sección 2: Consistencia Visual

### 2.1 Padding de Tablas Unificado

Estandarizar a `px-4 py-3` en todas las tablas del dashboard. Páginas afectadas:
- `dashboard-client.tsx` (usa `p-4` → `px-4 py-3`)
- `forecasting-client.tsx` (ya usa `px-4 py-3` ✅)
- `ads-client.tsx` (ya usa `px-4 py-3` ✅)
- `finances-client.tsx` (ya usa `px-4 py-3` ✅)
- `sales/page.tsx`
- `orders/page.tsx`
- `inventory/page.tsx`
- `products/page.tsx`
- `suppliers/page.tsx`
- `returns/page.tsx`
- `shipments/page.tsx`

### 2.2 Duración de Animaciones

Estandarizar:
- Hover effects: `duration-200` (rápido, solo color/background)
- Scale/translate: `duration-300` (movimiento)
- Page transitions: `duration-300` (Framer Motion)
- Opacity/fade: `duration-200`

### 2.3 Spacing System

- `space-y-6` entre secciones principales
- `gap-4` en grids (ya es estándar)
- `mb-6` después de PageHeader
- `pb-6` en PageHeader (remover `mb-8` duplicado)

---

## Sección 3: Transiciones y Micro-interacciones

### 3.1 Dependencia

Instalar `framer-motion` (última versión estable).

### 3.2 AnimatedPage Wrapper

Crear `src/components/ui/animated-page.tsx`:

```tsx
"use client";

import { motion } from "framer-motion";

const pageVariants = {
  initial: { opacity: 0, y: 12 },
  animate: { opacity: 1, y: 0 },
  exit: { opacity: 0, y: -12 },
};

export function AnimatedPage({ children }: { children: React.ReactNode }) {
  return (
    <motion.div
      variants={pageVariants}
      initial="initial"
      animate="animate"
      exit="exit"
      transition={{ duration: 0.3, ease: [0.16, 1, 0.3, 1] }}
    >
      {children}
    </motion.div>
  );
}
```

Envolver el contenido de cada página del dashboard con `<AnimatedPage>`:

- **Páginas Client Component** (tienen `"use client"`): Envolver directamente en `page.tsx`
- **Páginas Server Component + Client Component hijo**: Envolver en el Client Component hijo (e.g., `<DashboardClient>`, `<ForecastingClient>`)
- **Páginas que ya renderizan todo via un Client Component**: Envolver dentro del Client Component

**Prioridad:** páginas principales primero (dashboard, productos, ventas, órdenes, inventario, suppliers). Páginas secundarias (members/new, share/[token]) pueden omitirse. Los forms new/edit también pueden omitirse ya que el contenido cambia dentro del modal.

**Lista de páginas a envolver:**

| Página | Dónde poner AnimatedPage |
|--------|-------------------------|
| Dashboard | `DashboardClient` |
| Sales | `sales/page.tsx` (Client) |
| Inventory | `inventory/page.tsx` (Client) |
| Products | `products/page.tsx` (Client) |
| Orders | `orders/page.tsx` (Client) |
| Shipments | `shipments/page.tsx` (Client) |
| Returns | `returns/page.tsx` (Client) |
| Finances | `FinancesClient` |
| PPC Ads | `AdsClient` |
| Suppliers | `suppliers/page.tsx` (Client) |
| Research | `research/page.tsx` (Client) |
| Forecasting | `ForecastingClient` |
| Analytics | `AnalyticsClient` |
| Alerts | `alerts/page.tsx` (Client) |
| Calculator | `calculator/page.tsx` (Client) |
| SP-API | `sp-api/page.tsx` (Client) |
| Drive | `drive/page.tsx` (Client) |
| Team | `team/page.tsx` (Client) |
| Members | `members/page.tsx` (Server) → `MembersTable` |
| Tasks | `tasks/page.tsx` (Server) → `TasksBoard` |

### 3.3 Micro-interacciones

- **KPI cards**: ya tienen `hover:-translate-y-0.5 hover:shadow-lg`. Agregar `layout` de Framer Motion para animación suave.
- **Sidebar items**: active indicator animado con Framer Motion (`layoutId="active"`).
- **Bottom nav "More"**: el sheet usa `AnimatePresence` para entrada/salida.
- **Table rows**: hover highlight con transición CSS (ya existe en la mayoría).

### 3.4 Loading States

Los `PageSkeleton` existentes ya tienen shimmer CSS. Mantener como están — el shimmer CSS es más eficiente que Framer Motion para skeletons.

---

## Archivos a Modificar/Crear

| Archivo | Acción |
|---------|--------|
| `src/lib/navigation.ts` | Refactor a `NavCategory[]` |
| `src/components/sidebar.tsx` | Renderizar categorías |
| `src/components/mobile-bottom-nav.tsx` | Sheet "More" con categorías |
| `src/app/(dashboard)/layout.tsx` | Search + Notifications en mobile, safe areas |
| `src/components/ui/animated-page.tsx` | **Nuevo** — wrapper Framer Motion |
| `src/components/dashboard-client.tsx` | Envolver con AnimatedPage |
| `src/components/forecasting-client.tsx` | Envolver con AnimatedPage |
| `src/components/ads-client.tsx` | Envolver con AnimatedPage |
| `src/components/finances-client.tsx` | Envolver con AnimatedPage |
| `src/components/analytics-client.tsx` | Envolver con AnimatedPage |
| `src/components/tasks-board.tsx` | Envolver con AnimatedPage |
| `src/components/members-table.tsx` | Envolver con AnimatedPage |
| `src/app/(dashboard)/sales/page.tsx` | Envolver con AnimatedPage (+ fix padding) |
| `src/app/(dashboard)/orders/page.tsx` | Envolver con AnimatedPage (+ fix padding) |
| `src/app/(dashboard)/inventory/page.tsx` | Envolver con AnimatedPage (+ fix padding) |
| `src/app/(dashboard)/products/page.tsx` | Envolver con AnimatedPage (+ fix padding) |
| `src/app/(dashboard)/suppliers/page.tsx` | Envolver con AnimatedPage (+ fix padding) |
| `src/app/(dashboard)/returns/page.tsx` | Envolver con AnimatedPage (+ fix padding) |
| `src/app/(dashboard)/shipments/page.tsx` | Envolver con AnimatedPage (+ fix padding) |
| `src/app/(dashboard)/team/page.tsx` | Envolver con AnimatedPage |
| `src/app/(dashboard)/alerts/page.tsx` | Envolver con AnimatedPage |
| `src/app/(dashboard)/calculator/page.tsx` | Envolver con AnimatedPage |
| `src/app/(dashboard)/sp-api/page.tsx` | Envolver con AnimatedPage |
| `src/app/(dashboard)/drive/page.tsx` | Envolver con AnimatedPage |
| `src/app/(dashboard)/research/page.tsx` | Envolver con AnimatedPage |
| `src/app/(dashboard)/import/page.tsx` | Envolver con AnimatedPage |
| `src/app/(dashboard)/members/[id]/page.tsx` | Envolver con AnimatedPage |
| `src/app/(dashboard)/products/[id]/page.tsx` | Envolver con AnimatedPage |
| `src/app/(dashboard)/orders/[id]/page.tsx` | Envolver con AnimatedPage |
| `src/app/(dashboard)/suppliers/[id]/page.tsx` | Envolver con AnimatedPage |
| `package.json` | Agregar `framer-motion` |

---

## Criterios de Verificación

- [ ] `npm run build` pasa sin errores
- [ ] `npm run lint` pasa
- [ ] 182+ tests pasan
- [ ] Sidebar web muestra categorías con headers
- [ ] Mobile "More" sheet muestra categorías agrupadas
- [ ] GlobalSearch accesible desde mobile
- [ ] NotificationBell accesible desde mobile
- [ ] Transiciones fade+slide en todas las páginas del dashboard
- [ ] Safe areas en mobile top bar y bottom nav
- [ ] KPI cards en 2 columnas en mobile
- [ ] Paddings de tabla unificados
