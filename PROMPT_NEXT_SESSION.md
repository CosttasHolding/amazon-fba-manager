# PROMPT SESION 2 - Seguridad + API Audit (Continuacion)
# Copiar y pegar esto en una nueva sesion de opencode

---

Leé CLAUDE.md y docs/ROADMAP.md primero para entender el contexto completo.

Estamos en medio de un audit de seguridad + API refactor + i18n + frontend fixes para el Amazon FBA Manager. La FASE 8 de seguridad ya está completada (ver ROADMAP.md "SEGURIDAD + API AUDIT"). Build 0 errores, 115 tests, deploy OK en Vercel.

## QUE HACER EN ESTA SESION

Seguir con las fases pendientes de la FASE 8. En orden de prioridad:

### 1. Zod validation para comments/audit-log/settings (MEDIUM)
- `src/app/api/comments/route.ts` — agregar validación con zod schema
- `src/app/api/audit-log/route.ts` — agregar validación con zod schema  
- `src/app/api/settings/route.ts` — agregar validación con zod schema
- Crear schemas en `src/validations/` si no existen

### 2. Dead code cleanup (MEDIUM)
- Buscar imports no usados, funciones no exportadas, componentes huérfanos
- Eliminar `SalesApiResponse` type si quedó (ya fue removido)
- Revisar si quedan referencias a n8n (ya fueron eliminadas)
- Verificar que `src/lib/__mocks__/` fue eliminado (ya fue)

### 3. N+1 queries + dashboard limits (MEDIUM)
- `src/lib/notifications.ts` — fix N+1 query (批处理)
- Dashboard limit de products query
- `html5-qrcode` — dynamic import (pesa 167KB, cargado eagerly)

### 4. i18n missing keys (MEDIUM)
- ~93 keys faltantes en EN, ~134 en AR
- Archivos: `src/lib/i18n/en.json`, `src/lib/i18n/ar.json`
- Referencia: `src/lib/i18n/es.json` (completo)

### 5. Accessibility fixes (MEDIUM)
- aria-labels hardcoded en español → usar claves i18n
- Touch targets mínimos 44px en componentes interactivos
- Tabs con ARIA roles

### 6. Package cleanup (LOW)
- Remover `@radix-ui/react-toast` (ya se usa sonner)
- Mover `@capacitor/core`, `@capacitor/cli`, `html5-qrcode` a devDependencies
- `shadcn/ui` components que son solo para dev → devDependencies

### 7. Nuevos tests (LOW)
- Tests para suppliers API (GET/POST/PUT/DELETE)
- Tests para sales API (GET/POST/DELETE)

## ESTADO DE LA APP
- Ruta local: `C:\Users\Nacho\Desktop\amazon-fba-manager-main`
- Deploy: https://amazon-fba-manager-virid.vercel.app
- Git: v2.55.0.2 instalado
- 115 tests pasando (vitest)
- Build: 0 errores, 0 ESLint warnings

## ARCHIVOS CLAVE MODIFICADOS EN LA SESION ANTERIOR
- `src/lib/api-handler.ts` — createApiHandler con `await handler()`, sanitize errors, buildPagination, paginatedResponse
- `src/lib/sort-parser.ts` — NEW: parseSort shared utility
- `src/lib/fetcher.ts` — auto-unwrap removido
- `src/lib/test-utils/mock-request.ts` — NEW: createMockRequest helper
- `src/hooks/use-data.ts` — useSalesQuery actualizado a PaginatedResponse
- `src/hooks/use-governance.ts` — ApiResponse<T> wrapper
- `src/app/api/products/route.ts` — createApiHandler + shared parseSort + safeParse
- `src/app/api/sales/route.ts` — createApiHandler + shared parseSalesSort + paginatedResponse
- `src/app/api/inventory/route.ts` - createApiHandler + shared parseSort
- `src/app/api/suppliers/route.ts` — createApiHandler + paginatedResponse
- `src/app/api/orders/route.ts` — createApiHandler + paginatedResponse
- `src/app/api/reorder-rules/route.ts` — PATCH/DELETE migrated to createApiHandler
- `src/app/api/share/[token]/route.ts` — data limitada + error sanitized
- `src/app/api/cron/alerts/route.ts` — createServiceRoleClient + batch query
- `src/app/api/cron/sync/route.ts` — createServiceRoleClient
- `src/app/api/cron/reports/route.ts` — createServiceRoleClient
- `supabase/migrations/021_security_fixes.sql` — NEW: triggers, indexes, rate_limits, view rebuild

## COMANDOS UTILES
- Tests: `npx vitest run`
- Build: `npx next build`
- Lint: `npx next lint`
- Deploy: `npx vercel deploy --prod --token $VERCEL_TOKEN --yes`
