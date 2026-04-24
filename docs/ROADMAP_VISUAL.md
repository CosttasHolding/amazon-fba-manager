# ROADMAP VISUAL — AMAZON FBA MANAGER V2
# Actualizado dinamicamente por el agente

## Estado General
- Build: 0 errores, 0 warnings
- Tests: 19/19 pasan
- Ultimo update: 2026-04-23

## Progreso por SPRINT

### SPRINT 0 — Setup [COMPLETADO]
- [x] Instalar @dnd-kit/core + @dnd-kit/sortable
- [x] Verificar build 0 errores
- [x] Crear docs/ROADMAP_VISUAL.md

### SPRINT 1 — Dashboard Profesional [COMPLETADO]
- [x] KPI Cards con deltas y tendencias
- [x] Grafico ventas temporal (30d/12s toggle)
- [x] Tabla Top 5 productos por rentabilidad con badges ROI
- [x] Panel alertas inventario con accion rapida
- [x] Test build 0 errores

### SPRINT 2 — Proveedores Completo [COMPLETADO]
- [x] Migracion SQL 002
- [x] API /api/suppliers/[id]/quotes
- [x] Detalle /suppliers/[id] con tabs
- [x] Comparador /suppliers/compare
- [x] Test build 0 errores

### SPRINT 3 — Calculadora Avanzada [COMPLETADO]
- [x] Calculadora completa con escenarios P/R/O
- [x] Boton Guardar analisis -> API /api/calculator/save
- [x] Test build 0 errores

### FIX CRITICO — Login [COMPLETADO]
- [x] Actualizar @supabase/ssr v0.1.0 -> v0.10.2
- [x] Crear middleware.ts para refresco de sesiones
- [x] Actualizar client.ts y server.ts al nuevo patron de cookies
- [x] Test build 0 errores

### SPRINT 4 — Research de Productos [COMPLETADO]
- [x] Tipos ProductResearch + API /api/research
- [x] Vista Kanban con 6 columnas
- [x] Vista Lista con filtros
- [x] Formulario modal completo
- [x] Test build 0 errores

### SPRINT 5 — Purchase Orders [COMPLETADO]
- [x] Tipos PurchaseOrder + APIs /api/orders
- [x] Lista /orders con KPIs y timeline visual
- [x] Detalle /orders/[id]
- [x] Modal Nueva Orden (OrderFormModal)
- [x] Mobile card view en /orders
- [x] Test build 0 errores

### SPRINT 6 — Inventario + Ventas Mejorados [COMPLETADO]
- [x] Inventario: proyecciones de stock + sort por dias
- [x] Ventas: refactor a TypeScript moderno + dynamic imports
- [x] Ventas: import CSV preview + reporte PDF
- [x] Test build 0 errores

### SPRINT 7 — Calidad Tecnica [COMPLETADO]
- [x] Tests unitarios calculations.test.ts (9 tests)
- [x] Tests unitarios schemas.test.ts (10 tests)
- [x] Total: 19/19 tests pasan
- [x] Eliminar var -> const/let en todo el frontend
- [x] Eliminar any en APIs (products/[id], sales, dashboard, import, settings, calculator, inventory, export)
- [x] Formatear APIs minificadas (inventory, export, calculator, movements)
- [x] Fix useEffect missing dependencies (orders/[id], global-search, products/new)
- [x] Test build + test suite

### SPRINT 8 — Polish UI/UX Final [COMPLETADO]
- [x] Componente EmptyState reutilizable
- [x] Empty states en products, suppliers, inventory, research, orders
- [x] Onboarding checklist en dashboard
- [x] Breadcrumbs funcionando en todas las paginas de detalle
- [x] Busqueda global ⌘K
- [x] Paginacion client-side en inventory y orders
- [x] Error boundary (error.tsx) en (dashboard) con variables CSS semanticas
- [x] Aria-label en inputs de busqueda (a11y basica)
- [x] Fix placeholders _LC en settings
- [x] Revisar bg-white puros (0 hallazgos)
- [x] Test build 0 errores

### SPRINT 9 — Optimizacion de Performance [COMPLETADO]
- [x] Dynamic imports en /sales para jsPDF + jspdf-autotable + RevenueTrendChart
- [x] Bundle /sales: 149kB -> 12kB (-92% first load JS)
- [x] Dynamic imports en /dashboard para charts pesados
- [x] Test build 0 errores

### SPRINT 10 — Limpieza Total de Codigo [COMPLETADO]
- [x] Eliminar TODOS los `any` del proyecto (frontend + APIs + componentes + hooks + lib)
- [x] Tipar CustomTooltip de Recharts en 4 charts
- [x] Tipar filter-panel.tsx con Record<string, string>
- [x] Tipar global-search.tsx con interfaces inline
- [x] Tipar import/page.tsx con Record<string, string | number | undefined>
- [x] Tipar use-data.ts sin any
- [x] Tipar middleware.ts con CookieOptions
- [x] Tipar export.ts con unknown[]
- [x] Verificacion final: 0 var, 0 any en todo src/
- [x] Test build 0 errores + test suite 19/19

### SPRINT 11 — Fixes Audit #1 y #3 [COMPLETADO]
- [x] Fix hydration mismatch: reemplazar Math.random() en ChartSkeleton por alturas deterministicas
- [x] Server-side pagination en /api/products, /api/inventory, /api/sales
- [x] APIs /summary para KPIs (products, inventory, sales) con queries ligeras
- [x] Hooks nuevos: useProductsQuery, useInventoryQuery, useSalesQuery + summaries
- [x] Refactor products/page.tsx a paginacion server-side
- [x] Refactor inventory/page.tsx a paginacion server-side
- [x] Refactor sales/page.tsx a paginacion server-side + paginacion UI
- [x] Tipar DashboardResponse y corregir useDashboard
- [x] Test build 0 errores

### SPRINT 12 — Fixes Audit #2 #4 #5 #6 [COMPLETADO]
- [x] Fix #2: AbortController en global-search.tsx para cancelar requests obsoletos
- [x] Fix #4: htmlFor + id en todos los formularios (login, register, product-form, sale-form)
- [x] Fix #5: ARIA attributes en dropdowns (top-header user menu, notification-bell, global-search)
- [x] Fix #6: AbortController + mountedRef en products/[id]/page.tsx
- [x] Test build 0 errores

### SPRINT 13 — Fixes Audit Restantes [COMPLETADO]
- [x] Fix #7: Sanitizar mensajes de error en 15+ APIs (evitar leakage de err.message)
- [x] Fix #10: Estados de error con retry en products, inventory, sales pages
- [x] Fix #14: Centralizar constantes duplicadas en lib/constants.ts
- [x] Fix #17: Eliminar local fmt shadowing en products/[id]/page.tsx
- [x] Fix #18: CSV import limites (5MB, 1000 filas) con constantes
- [x] Fix #19: Settings page error state con retry
- [x] Fix #20: Pagination aria-labels + aria-current="page"
- [x] Fix #21: Sidebar isActive memoizado con useCallback
- [x] Fix #26: Mobile cards role="button" + tabIndex + keyboard handler
- [x] Nuevo: lib/api-utils.ts helper para errores de API
- [x] Nuevo: DashboardResponse tipado en types/index.ts
- [x] Test build 0 errores

### ESTADO FINAL
- Build: 0 errores, 0 warnings
- Tests: 19/19 pasan
- Rutas: 38 (+3 APIs summary)
- Middleware: activo (80 kB)
- Login: funcional
- Accesibilidad basica: aria-labels en busquedas
- TypeScript: 0 any, 0 var en todo el proyecto
- Pagination: server-side en products, inventory, sales

## Reglas del Workflow
1. Solo cambiar UI/UX, NO logica/auth/validaciones existentes
2. Maximo 2 archivos por respuesta
3. Leer archivo antes de modificarlo
4. Test build despues de cada sprint
5. Actualizar ROADMAP al completar paso
