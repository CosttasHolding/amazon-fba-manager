# UI Optimization - Changelog

**Fecha:** 2026-07-26
**Base:** Spec `docs/superpowers/specs/2026-07-26-ui-optimization-design.md`

---

## 1. Navegación por Categorías

### Refactor: `src/lib/navigation.ts`
- Nueva interfaz `NavCategory` con `label`, `icon`, `items: NavItem[]`
- `navCategories` con 4 categorías: Operaciones, Productos y Sourcing, Finanzas y Analytics, Herramientas
- `navItems` preservado como flat array (dashboard + todos los items de categorías)

### Sidebar: `src/components/sidebar.tsx`
- Dashboard renderizado como ítem separado en sección propia
- Cada categoría renderizada con su ícono + label como header
- Espaciado consistente entre secciones

### Mobile Bottom Nav: `src/components/mobile-bottom-nav.tsx`
- Sheet "Más módulos" ahora agrupa items por categoría con headers visuales
- Categorías con ícono + label en el sheet
- Bottom bar preserva Dashboard, Products, Inventory, Sales + More

---

## 2. Búsqueda y Notificaciones en Móvil

### Nuevo: `src/components/mobile-search-toggle.tsx`
- Botón Search en mobile top bar
- Toggle: abre slide-down con GlobalSearch + overlay dismiss
- Botón X para cerrar

### Layout: `src/app/(dashboard)/layout.tsx`
- `MobileSearchToggle` + `NotificationBell` agregados al mobile header
- Safe area `pt-[calc(0.75rem+env(safe-area-inset-top))]` en mobile header

---

## 3. KPI Grids en Mobile

Cambio de `grid-cols-1` → `grid-cols-2` en mobile para mejor aprovechamiento del espacio:

| Archivo | Grid class |
|---------|-----------|
| `src/components/ui/page-skeleton.tsx` | `grid-cols-2 sm:grid-cols-2 lg:grid-cols-4` |
| `src/app/(dashboard)/dashboard/loading.tsx` | `grid-cols-2 sm:grid-cols-2 lg:grid-cols-4` |
| `src/components/dashboard-client.tsx` | `grid-cols-2 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6` |
| `src/components/finances-client.tsx` | `grid-cols-2 sm:grid-cols-2 lg:grid-cols-4` |
| `src/components/ads-client.tsx` | `grid-cols-2 sm:grid-cols-3` |
| `src/components/forecasting-client.tsx` | `grid-cols-2 sm:grid-cols-3` |
| `src/app/(dashboard)/returns/page.tsx` | `grid-cols-2 sm:grid-cols-3` |

---

## 4. Padding Consistente en Tablas

Estandarizado a `px-4 py-3` en tablas:

### Shared variables: `src/components/ui/data-table-wrapper.tsx`
- `tableHeaderClass`: `px-5 py-3.5` → `px-4 py-3`
- `tableCellClass`: `px-5 py-3.5` → `px-4 py-3`

### Cambios inline (`p-4` → `px-4 py-3`):
- `src/app/(dashboard)/orders/page.tsx`
- `src/app/(dashboard)/suppliers/compare/page.tsx`
- `src/components/members-table.tsx`
- `src/components/dashboard-client.tsx` (Top Products + Stock Alerts)

### Cambios inline (`p-3` → `px-4 py-3`):
- `src/app/(dashboard)/team/page.tsx`
- `src/components/charts/revenue-projection.tsx`

### Cambios inline (`p-2` → `px-4 py-3`):
- `src/components/charts/profitability-heatmap.tsx`

### Cambios inline (`px-3 py-2` → `px-4 py-3`):
- `src/app/(dashboard)/import/page.tsx`

### Cambios inline (`px-6 py-4` → `px-4 py-3`):
- `src/app/(dashboard)/sp-api/page.tsx`

---

## 5. Page Transitions con Framer Motion

### Nuevo: `src/components/ui/animated-page.tsx` (ya existente de pre-work)
- `motion.div` con fade (`opacity: 0 → 1`) + slide-up (`y: 12 → 0`)
- Duración 300ms, cubic-bezier `[0.16, 1, 0.3, 1]`

### Layout: `src/app/(dashboard)/layout.tsx`
- Wrapped `{children}` con `<AnimatedPage>` a nivel del dashboard layout
- Cubre las 33 rutas del dashboard automáticamente

---

## 6. Micro-interacciones en KPI Cards

Los KPI cards ya tenían `animationDelay` y hover states desde la creación del componente. No se modificaron.

---

## 7. Resumen de Archivos Modificados

**Totales: 20 archivos**

| Archivo | Tipo de cambio |
|---------|---------------|
| `src/lib/navigation.ts` | Refactor estructura |
| `src/components/sidebar.tsx` | Categorías + NavItemLink |
| `src/components/mobile-bottom-nav.tsx` | Categorías en sheet |
| `src/components/mobile-search-toggle.tsx` | **Nuevo componente** |
| `src/app/(dashboard)/layout.tsx` | Search + Notif + SafeArea + AnimatedPage |
| `src/components/ui/data-table-wrapper.tsx` | Padding estandarizado |
| `src/components/ui/page-skeleton.tsx` | KPI grid mobile |
| `src/app/(dashboard)/dashboard/loading.tsx` | KPI grid mobile |
| `src/components/dashboard-client.tsx` | KPI grid + table padding |
| `src/components/finances-client.tsx` | KPI grid mobile |
| `src/components/ads-client.tsx` | KPI grid mobile |
| `src/components/forecasting-client.tsx` | KPI grid mobile |
| `src/app/(dashboard)/returns/page.tsx` | KPI grid mobile |
| `src/app/(dashboard)/orders/page.tsx` | Table padding |
| `src/app/(dashboard)/suppliers/compare/page.tsx` | Table padding |
| `src/app/(dashboard)/team/page.tsx` | Table padding |
| `src/app/(dashboard)/import/page.tsx` | Table padding |
| `src/app/(dashboard)/sp-api/page.tsx` | Table padding |
| `src/components/members-table.tsx` | Table padding |
| `src/components/charts/revenue-projection.tsx` | Table padding |
| `src/components/charts/profitability-heatmap.tsx` | Table padding |

---

## Build & Tests

- `npm run build`: ✅ Compiled successfully (0 errores)
- `npm run test:run`: ✅ 19 test files, 182 tests passed