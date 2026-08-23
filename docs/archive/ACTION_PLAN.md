# ACTION PLAN - Amazon FBA Manager V2
## Plan de Accion Priorizado (Julio 2026)

Basado en analisis completo del proyecto. Organizado en fases por prioridad, alineado con ROADMAP.md.

---

## FASE 0: SEGURIDAD INMEDIATA 🔴
### HACER AHORA - Riesgos criticos activos

- [ ] **0.1 Remover JSON credenciales Google del repo**
  - Archivo: `client_secret_589921294974-lugh4r740h4182avfadku24haeodor4r.apps.googleusercontent.com.json`
  - Accion: Mover a `.env.local` o vault seguro, agregar a `.gitignore`, rotar en Google Cloud Console

- [ ] **0.2 Rotar Vercel token expuesto**
  - Archivo: `CLAUDE.md:131` - Token expuesto (VERIFICAR SI FUE ROTADO)
  - Accion: Regenerar en Vercel, actualizar CLAUDE.md con el nuevo

- [ ] **0.3 Rotar Google OAuth Client Secret**
  - Esta expuesto en el JSON del paso 0.1
  - Accion: Regenerar en Google Cloud Console

- [ ] **0.4 Arreglar `.gitignore` corrupto**
  - El archivo tiene caracteres null entre caracteres (encoding corrupto)
  - Accion: Reescribir `.gitignore` limpio incluyendo `*.json` credenciales, `.env*`, `*.log`

---

## FASE 1: TECH DEBT CRITICO 🟠
### Bugs y deuda tecnica que afectan funcionalidad

### 1.1 SP-API: Fix headers incorrectos
- **Archivo:** `src/lib/sp-api/client.ts:42-43`
- **Problema:** Usa headers de Amazon Ads API (`Amazon-Advertising-API-ClientId`, `Amazon-Advertising-API-Scope`) en SP-API
- **Accion:** Remover esos headers, SP-API solo necesita `x-amz-access-token`
- **Impacto:** La autenticacion SP-API real fallaria con estos headers

### 1.2 SP-API: Propiedad privada accedida como string key
- **Archivo:** `src/lib/sp-api/endpoints.ts:23` y `endpoints.ts:64`
- **Problema:** `client["marketplaceId" as keyof SpApiClient]` - hack que rompe type safety
- **Accion:** Agregar getter publico `getMarketplaceId()` en `SpApiClient`

### 1.3 Drive: Redirect URI hardcodeado a localhost
- **Archivo:** `src/lib/drive/client.ts:59`
- **Problema:** `"http://localhost:3000/api/drive/auth/callback"` no funciona en produccion
- **Accion:** Usar `process.env.NEXT_PUBLIC_APP_URL` en su lugar

### 1.4 Drive: Singleton mutable en serverless
- **Archivo:** `src/lib/drive/client.ts:4` - `let driveClient: drive_v3.Drive | null = null`
- **Problema:** Estado global compartido entre requests en Vercel serverless
- **Accion:** No cachear el client; crear fresh en cada request o usar `resetDriveClient()` en cada llamada

### 1.5 Cron sync: Placeholder que no sincroniza
- **Archivo:** `src/app/api/cron/sync/route.ts:105-117`
- **Problema:** Si falta `SP_API_CLIENT_ID`, marca "completed" sin hacer nada
- **Accion:** Implementar el mapeo real de datos SP-API -> tablas Supabase, o si no hay credenciales, devolver error 400 explicito

### 1.6 Auth pages no respetan theme system
- **Archivo:** `src/app/(auth)/login/page.tsx`, `src/app/(auth)/register/page.tsx`
- **Problema:** Colores hardcodeados (`text-white`, `bg-[#0a0e1a]/30`) en vez de variables CSS
- **Accion:** Migrar a usar `bg-background`, `text-foreground`, etc.

### 1.7 `export.ts` usa `alert()` en vez de sonner
- **Archivo:** `src/lib/export.ts:104`
- **Problema:** `alert()` nativo bloquea UI, rompe patron de sonner
- **Accion:** Pasar callback de error como parametro o lanzar excepcion

### 1.8 Migracion 009 crea funcion duplicada
- **Archivo:** `supabase/migrations/009_governance.sql:151-157`
- **Problema:** Crea `trigger_set_updated_at()` cuando ya existe `update_updated_at()` de 008
- **Accion:** Usar la funcion existente `update_updated_at()`

---

## FASE 2: REFACTOR MODULAR 🟡
### Mejoras de arquitectura y mantenibilidad

### 2.1 Centralizar navItems
- **Archivos:** `src/components/sidebar.tsx:29-47`, `src/components/mobile-bottom-nav.tsx:24-41`
- **Problema:** 17 items de navegacion duplicados en dos archivos
- **Accion:** Crear `src/lib/navigation.ts` con array compartido de nav items

### 2.2 Hook de logout compartido
- **Archivos:** `src/components/sidebar.tsx:70-81`, `src/components/top-header.tsx:40-51`
- **Problema:** Logica de logout duplicada
- **Accion:** Crear `src/hooks/use-auth.ts` con `useLogout()`

### 2.3 Hook de notificaciones compartido
- **Archivos:** `src/components/notification-bell.tsx`, `src/components/mobile-bottom-nav.tsx:47-61`
- **Problema:** Fetch de notificaciones duplicado
- **Accion:** Crear `src/hooks/use-notifications.ts` con SWR hook

### 2.4 Unificar patron API Route
- **Archivos:** Todos en `src/app/api/*/route.ts`
- **Problema:** Cada ruta repite try/catch, auth check, error handling
- **Accion:** Extender `src/lib/api-utils.ts` con wrapper `createApiHandler()` que centralice auth, error handling, y response format

### 2.5 Eliminar hooks legacy
- **Archivo:** `src/hooks/use-data.ts:16-49`
- **Problema:** `useProducts()`, `useInventory()`, `useSales()` no se usan (hay versiones paginadas)
- **Accion:** Remover hooks legacy, testear que nada los importa

### 2.6 Refactor Dashboard API
- **Archivo:** `src/app/api/dashboard/route.ts` (294 lineas)
- **Problema:** Una sola funcion hace todo: metrics, charts, alerts, top products
- **Accion:** Separar en modulos: `dashboard/metrics.ts`, `dashboard/charts.ts`, `dashboard/alerts.ts`

### 2.7 Migrar API routes a Server Actions
- **Archivos:** Varias API routes que solo hacen CRUD simple
- **Problema:** Server Actions duplican logica de API routes
- **Accion:** Estandarizar: CRUD simple -> Server Actions, consultas complejas -> API routes

---

## FASE 3: CALIDAD DE CODIGO 🟢
### Tests, tooling, y consistencia

### 3.1 Agregar tests de API routes
- **Que:** Tests de integracion para las 25+ rutas API
- **Como:** Usar `fetch` mockeado con MSW o similar
- **Prioridad:** Media

### 3.2 Agregar tests de componentes
- **Que:** Tests para Dashboard, Products list, inventory, sidebar
- **Como:** `@testing-library/react` con mocks de SWR
- **Prioridad:** Media

### 3.3 Agregar script typecheck
- **Archivo:** `package.json`
- **Accion:** Agregar `"typecheck": "tsc --noEmit"` a scripts

### 3.4 Actualizar eslint-config-next
- **Archivo:** `package.json:70` - `"eslint-config-next": "14.1.0"`
- **Accion:** Actualizar a `"14.2.35"` para coincidir con version de Next.js

### 3.5 Agregar tests de Server Actions
- **Que:** Tests para `src/lib/actions/*.ts`
- **Prioridad:** Baja

### 3.6 Agregar tests de hooks
- **Que:** Tests para `use-data.ts` y `use-governance.ts`
- **Prioridad:** Baja

---

## FASE 4: FEATURES PENDIENTES DEL ROADMAP 🟣
### Alineado con ROADMAP.md Fases 3-7

### 4.1 FASE 3 - Analytics Avanzado
- [ ] Comparativa periodo vs periodo
- [ ] Proyecciones de revenue y stock (ML basico)
- [ ] Heat maps de rentabilidad por SKU
- [ ] Reportes personalizables (PDF/Excel)
- [ ] Dashboard compartido via link publico

### 4.2 FASE 4 - Automation & Alerts
- [ ] Alertas por email (SendGrid/Resend)
- [ ] Reglas de reorder automaticas
- [ ] Presupuestos de PPC con alerts
- [ ] Notificaciones push
- [ ] Reportes programados

### 4.3 FASE 5 - Team & Collaboration
- [ ] Roles y permisos (admin, viewer, editor)
- [ ] Audit log de cambios
- [ ] Comentarios en productos/pedidos
- [ ] Dashboard de equipo
- [ ] Asignacion de tareas

### 4.4 FASE 6 - Multi-idioma & Accesibilidad
- [ ] i18n (espanol, ingles, portugues)
- [ ] RTL support
- [ ] Accesibilidad WCAG 2.1 AA
- [ ] Modo alto contraste

### 4.5 FASE 7 - Mobile
- [ ] PWA con offline support
- [ ] Barcode scanning
- [ ] Push notifications mobile
- [ ] App wrapper (Capacitor/Tauri)

### 4.6 Obsidian Vault
- [ ] Implementar `docs/vault/` con estructura de carpetas
- [ ] Templates YAML (Member, Supplier, Product-Research, Meeting, Decision)
- [ ] Canvas de ejemplo (Relaciones)

---

## FASE 5: MEJORAS ADICIONALES RECOMENDADAS ⭐
### Ideas que agregarian valor significativo

### 5.1 Rate limiting en API routes
- Implementar con un middleware simple o Vercel WAF
- Protege contra abuso de endpoints publicos

### 5.2 Implementar middleware.ts de auth
- CLAUDE.md sugiere considerar middleware
- Proteger rutas API y dashboard a nivel de request, no solo en layout
- **Archivo existente:** `src/middleware.ts` - el matcher actual no protege nada

### 5.3 Centralizar constantes de estilos
- DESIGN_SYSTEM.md define colores pero no estan en codigo
- Crear `tailwind.config.ts` extendido con colores custom del DS

### 5.4 Agregar JSDoc/TSDoc
- Funciones publicas en lib/ y hooks/ sin documentacion
- Priorizar `calculations.ts`, `sp-api/`, `drive/`

### 5.5 Implementar soft deletes
- Productos, suppliers, y orders no tienen `deleted_at`
- Evitaria perdida accidental de datos

### 5.6 Agregar migraciones base faltantes
- Migraciones 001-007 no existen en el repo
- Extraer del `full_migration.sql` si es necesario

### 5.7 Agregar etiqueta `typecheck` al workflow
- Integrar en CI para prevenir errores de tipos

---

## RECOMENDACIONES ESTRATEGICAS 💡

### Que hacer PRIMERO (proxima semana)
1. **FASE 0** - Seguridad: Remover credenciales, rotar tokens, arreglar .gitignore (2-4hs)
2. **FASE 1 items 1.1-1.4** - SP-API y Drive fixes criticos (4-6hs)
3. **FASE 1 item 1.6** - Auth pages theme fix (2hs)

### Que hacer DESPUES (proximo mes)
4. **FASE 2** - Refactors modulares (centralizar navItems, logout, notificaciones) (8-12hs)
5. **FASE 3** - Tests (16-24hs)
6. **FASE 1 items 1.5, 1.7, 1.8** - Fixes restantes (4-6hs)

### Que hacer a MEDIANO PLAZO
7. **FASE 4** - Features del roadmap (100+ hs)
8. **FASE 5** - Mejoras adicionales (20-40hs)

### Recomendacion personal
**Mi recomendacion es:**

1. **Seguridad primero** - FASE 0 es urgente y no negociable. Las credenciales expuestas son un riesgo real.

2. **SP-API real vs placeholder** - Decidan si van a integrar SP-API de verdad o si el modulo actual es suficiente como placeholder. Si no van a usarlo, simplifiquenlo. Si si, terminen la implementacion del sync real.

3. **Obsidian vault** - Es un quick win que suma valor inmediato para los 3 socios. Esta planificado en SUMMARY.md.

4. **Tests > Features nuevas** - Antes de arrancar FASE 3 del roadmap, recomiendo solidificar la base con tests de API routes y componentes. 115 tests suena bien pero la cobertura real de componentes es casi nula.

5. **Refactor si, pero con cuidado** - La app esta 100% funcional en produccion. Cada refactor debe venir con tests que aseguren que no se rompe nada. Priorizar refactors que reducen bugs (FASE 1) sobre refactors cosmeticos (FASE 2).

---

## ARCHIVOS A MODIFICAR POR PRIORIDAD

```
FASE 0 - SEGURIDAD:
  .gitignore                          -> limpiar encoding, agregar *.json credenciales
  CLAUDE.md                           -> remover token Vercel explicito

FASE 1.1 - SP-API HEADERS:
  src/lib/sp-api/client.ts            -> remover Amazon-Advertising-API headers

FASE 1.2 - SP-API GETTER:
  src/lib/sp-api/client.ts            -> agregar getMarketplaceId()
  src/lib/sp-api/endpoints.ts         -> usar getter en vez de hack string key

FASE 1.3 - DRIVE REDIRECT:
  src/lib/drive/client.ts             -> cambiar localhost por NEXT_PUBLIC_APP_URL

FASE 1.4 - DRIVE SINGLETON:
  src/lib/drive/client.ts             -> remover cache singleton

FASE 1.5 - CRON SYNC:
  src/app/api/cron/sync/route.ts      -> implementar sync real o error explicito

FASE 1.6 - AUTH PAGES:
  src/app/(auth)/login/page.tsx       -> migrar a variables CSS
  src/app/(auth)/register/page.tsx    -> migrar a variables CSS

FASE 1.7 - EXPORT ALERT:
  src/lib/export.ts                   -> reemplazar alert() por callback/thrown error

FASE 2.1 - CENTRALIZAR NAV:
  src/components/sidebar.tsx          -> importar navItems de lib/navigation.ts
  src/components/mobile-bottom-nav.tsx -> importar navItems de lib/navigation.ts
  src/lib/navigation.ts (NUEVO)       -> array compartido

FASE 2.2 - LOGOUT HOOK:
  src/hooks/use-auth.ts (NUEVO)       -> hook compartido
  src/components/sidebar.tsx          -> usar hook
  src/components/top-header.tsx       -> usar hook
```

---

*Generado: Julio 2026 - Basado en analisis completo del codigo fuente*
