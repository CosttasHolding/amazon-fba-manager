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

### ESTADO FINAL
- Build: 0 errores, 0 warnings
- Tests: 19/19 pasan
- Rutas: 35
- Middleware: activo (80 kB)
- Login: funcional
- Accesibilidad basica: aria-labels en busquedas
- TypeScript: 0 any, 0 var en todo el proyecto

## Reglas del Workflow
1. Solo cambiar UI/UX, NO logica/auth/validaciones existentes
2. Maximo 2 archivos por respuesta
3. Leer archivo antes de modificarlo
4. Test build despues de cada sprint
5. Actualizar ROADMAP al completar paso
