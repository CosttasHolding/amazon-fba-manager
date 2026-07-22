# Changelog

## [2.1.0] - 2026-07-07

### Added
- SP-API sync real: products, orders, inventory, fees, returns, payouts
- SP-API `getOrderItems()` endpoint
- Governance: Members CRUD, Tasks Kanban, Board decisions
- Google Drive OAuth2 por usuario + Drive browser + CRUD archivos
- Migrations 008 (sp_api_connections, sync_logs) y 009 (members, tasks, board_decisions)

### Fixed
- Members no visibles: fetcher ya extrae `json.data`, hooks hacian `data?.data` doble
- React error #438: `use(params)` cambiado a `params.id` (Next.js 14, no 15)
- Drive OAuth: `getDriveClient()` usaba browser client sin cookies en servidor
- Governance API: `.eq("user_id", user.id)` removido de GETs para vision compartida

### Removed
- Módulo de Sucesión completo (páginas, API, tipos, validaciones, hook, sidebar, help-content, DB)

### Changed
- README actualizado con nuevos modulos y 115 tests
- PROMPT_MAESTRO reducido de 480 a ~60 lineas (info obsoleta)

## [2.0.0] - 2026-04-23

### Added
- Dashboard profesional con KPIs, graficos y alertas
- Modulo de Proveedores con comparador y cotizaciones
- Modulo de Pedidos (Purchase Orders) con timeline visual
- Modulo de Research con vista Kanban y lista
- Calculadora FBA con escenarios P/R/O
- Importacion CSV con preview
- Exportacion a Excel profesional
- Onboarding checklist para nuevos usuarios
- Global search (Cmd+K)
- Breadcrumbs
- Notificaciones en tiempo real
- Tema dark/light con next-themes

### Changed
- Upgrade a Next.js 14.2.35
- Upgrade a @supabase/ssr 0.10.2 (fix de cookies)
- Rediseño visual completo al sistema "Command Center Noir"
- Refactor de sales page a TypeScript moderno
- Sales bundle reducido de 149kB a 12kB (-92%)
- Dashboard bundle reducido de 117kB a 8.48kB (-93%)
- Formateo de APIs minificadas a codigo legible

### Fixed
- Login no funcionaba (localStorage vs cookies)
- Acentos y caracteres especiales rotos en toda la UI
- Eliminacion de todas las variables `var` en favor de `const`/`let`
- Eliminacion de todos los tipos `any`
- Selects translucidos cambiados a fondo solido
- Errores de ESLint y TypeScript

### Tests
- 90 tests unitarios + integracion pasando (Vitest)
- Tests E2E base con Playwright (Chromium + Mobile)
- Cobertura de calculos, validaciones Zod, APIs y utilidades

## [1.0.0] - 2024

### Added
- Autenticacion con Supabase
- CRUD de productos
- CRUD de inventario
- CRUD de ventas
- Dashboard basico
- Calculadora FBA
