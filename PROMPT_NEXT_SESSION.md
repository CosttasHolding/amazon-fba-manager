# PROMPT_NEXT_SESSION — Checkpoint

---

## Ultima sesion

- **Fecha**: 2026-07-30
- **Que se hizo**: Se monto el Obsidian vault como segundo cerebro del proyecto. Se creo `App State.md`, se reestructuro `PROMPT_NEXT_SESSION.md`, se actualizo `AGENTS.md` con protocolo de sesion.
- **Build**: 0 errores, working tree clean
- **Branch**: main

## Estado actual

Leer `App State.md` para el snapshot completo. Cosas clave:
- App compila y deploya OK en Vercel
- Working tree clean, branch main
- Features de seguridad completadas (rate limiting, CSP, sanitizacion)
- UI optimization completada
- Research bot funcional con OpenAI + SP-API
- ~93 keys i18n faltantes EN, ~134 AR

## Proximos pasos (prioridad)

### 1. Zod validation para comments/audit-log/settings (MEDIUM)
- `src/app/api/comments/route.ts`
- `src/app/api/audit-log/route.ts`
- `src/app/api/settings/route.ts`
- Crear schemas en `src/validations/` si no existen

### 2. Dead code cleanup (MEDIUM)
- Buscar imports no usados, funciones no exportadas, componentes huerfanos
- Verificar que no queden referencias a n8n

### 3. N+1 queries + dashboard limits (MEDIUM)
- `src/lib/notifications.ts` — fix N+1 query
- Dashboard limit de products query
- `html5-qrcode` — dynamic import (pesa 167KB, cargado eagerly)

### 4. i18n missing keys (MEDIUM)
- ~93 keys faltantes EN, ~134 AR
- Archivos: `src/lib/i18n/en.json`, `src/lib/i18n/ar.json`
- Referencia: `src/lib/i18n/es.json` (completo)

### 5. Accessibility fixes (MEDIUM)
- aria-labels hardcoded en espanol -> usar claves i18n
- Touch targets minimos 44px
- Tabs con ARIA roles

### 6. Package cleanup (LOW)
- Remover `@radix-ui/react-toast` (ya se usa sonner)
- Mover `@capacitor/core`, `@capacitor/cli`, `html5-qrcode` a devDependencies

### 7. Nuevos tests (LOW)
- Tests para suppliers API (GET/POST/PUT/DELETE)
- Tests para sales API (GET/POST/DELETE)

## Archivos clave

- `src/lib/api-handler.ts` — createApiHandler
- `src/lib/sort-parser.ts` — parseSort compartido
- `src/lib/fetcher.ts` — cliente HTTP
- `src/hooks/use-data.ts` — hooks SWR
- `src/app/api/*/route.ts` — API routes

## Comandos

```bash
npm run dev          # Desarrollo
npm run build        # Build produccion
npm run lint         # Linting
npm run test:run     # Tests
```

## Vault

- [[00 - Dashboard]] — entry point del segundo cerebro
- [[App State]] — snapshot del proyecto
- [[Bugs Conocidos]] — bugs pendientes
- [[Decisiones Tecnicas]] — ADRs
