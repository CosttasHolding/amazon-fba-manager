# Changelog

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
