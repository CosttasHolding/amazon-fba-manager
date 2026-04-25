# Plan de Limpieza y Optimización — Amazon FBA Manager V2

**Fecha:** Abril 2025  
**Contexto:** Build limpio (0 errores, 0 warnings). Solo tocar lo innecesario, duplicado o muerto. Si algo funciona, no se toca.

> **Principio rector:** Solo tocar lo innecesario, duplicado o muerto. Si algo funciona, no se toca.

---

## FASE 1 — Eliminar código muerto (0 riesgo, ~15 min)

### 1.1 Eliminar `src/middleware.ts`
**Por qué:** El `CLAUDE.md` dice explícitamente *"NO hay middleware.ts activo"*. El dashboard layout (`src/app/(dashboard)/layout.tsx:24`) ya hace `redirect("/login")` si no hay user. El middleware duplica auth y agrega latencia a cada request.
- **Archivo a eliminar:** `src/middleware.ts`

### 1.2 Eliminar `src/lib/supabase/middleware.ts`
**Por qué:** Exporta `updateSession` pero **nadie lo importa**. `src/middleware.ts` (el que acabamos de eliminar) duplicaba la lógica inline en lugar de usar este helper.
- **Archivo a eliminar:** `src/lib/supabase/middleware.ts`

### 1.3 Eliminar función `apiClientErrorResponse` sin usar
**Por qué:** Exportada pero nunca importada en todo el codebase. Solo `apiErrorResponse` se usa.
- **Archivo:** `src/lib/api-utils.ts`
- **Línea:** 9 — eliminar la función `apiClientErrorResponse`

---

## FASE 2 — Eliminar duplicados (bajo riesgo, ~20 min)

### 2.1 Centralizar `STATUS_FLOW` de órdenes
**Duplicado en:**
- `src/app/(dashboard)/orders/page.tsx` líneas 49–59
- `src/app/(dashboard)/orders/[id]/page.tsx` líneas 22–31

**Acción:**
1. Mover el array a `src/lib/constants.ts` (ya existe, agregar ahí).
2. Importar desde ambas páginas.
3. Eliminar las definiciones locales.

### 2.2 Usar `PRODUCT_STATUSES` global en el modal
**Duplicado en:**
- `src/components/product-form-modal.tsx` líneas 27–31
- `src/lib/constants.ts` líneas 28–32

**Acción:** Reemplazar el array local del modal por la importación de `PRODUCT_STATUSES` desde `lib/constants`.

### 2.3 Unificar `MARKETPLACES`
**Duplicado en:**
- `src/lib/constants.ts` líneas 5–14
- `src/app/(dashboard)/settings/page.tsx` líneas 53–64

**Acción:** Extender el global en `lib/constants.ts` con los mercados extra que tiene settings (JP, AU) y hacer que settings importe desde ahí.

---

## FASE 3 — Limpiar console.logs y residuos (bajo riesgo, ~15 min)

### 3.1 Eliminar `<Toaster>` duplicado
**Archivo:** `src/app/(dashboard)/layout.tsx`
**Línea:** ~95 — quitar el `<Toaster richColors position="top-right" />`
**Por qué:** Ya existe en `src/app/layout.tsx:67`.

### 3.2 Eliminar console.logs/console.error restantes

| Archivo | Línea | Acción |
|---------|-------|--------|
| `src/app/(dashboard)/research/page.tsx` | 108 | Borrar `console.error(e)` |
| `src/app/(dashboard)/orders/page.tsx` | 109 | Borrar `console.error(e)` |
| `src/app/(dashboard)/products/[id]/error.tsx` | 17 | Borrar `console.error(...)` |
| `src/app/(dashboard)/error.tsx` | 15 | Borrar `console.error(...)` |
| `src/app/error.tsx` | 15 | Borrar `console.error(...)` |
| `src/lib/api-utils.ts` | 5 | Borrar `console.error(...)` |
| `src/components/error-boundary.tsx` | 27 | Borrar `console.error(...)` |

> **Nota:** Los `console.error` de `api-utils.ts` y `error-boundary.tsx` son los únicos que podrían dejarse si se prefiere tener logs de errores en producción. Recomendación: quitarlos todos, los errores ya se muestran al usuario con toasts/UI.

### 3.3 Agregar `type="button"` a botones que están dentro de forms pero no son submit
**Archivo:** `src/components/order-form-modal.tsx`
**Líneas:** 240, 244 — el botón "Cancelar" y "Crear Orden" dentro del `<form>`.
- El "Cancelar" ya tiene `type="button"` ✅.
- Verificar que no haya otros botones raw sin tipo dentro de forms.

> Los otros ~90 botones sin `type="button"` que el audit encontró están fuera de formularios o ya usan el componente `<Button>` de shadcn (que por defecto es `type="button"`). No tocarlos.

---

## FASE 4 — Null-safety mínima (bajo riesgo, ~10 min)

### 4.1 Eliminar non-null assertions (`!`) innecesarias

| Archivo | Línea | Acción |
|---------|-------|--------|
| `src/app/(dashboard)/orders/page.tsx` | 137 | `a.estimated_arrival!` → cambiar el sort para manejar nulls: `new Date(a.estimated_arrival || '9999-12-31')` |
| `src/app/(dashboard)/orders/page.tsx` | 154 | Mismo campo en el render del KPI — ya usa `?.` en otra parte, verificar |
| `src/app/(dashboard)/suppliers/page.tsx` | 377 | `supplier.alibaba_url!` → usar `supplier.alibaba_url ?? undefined` o `|| undefined` |

---

## FASE 5 — Verificación y deploy (~10 min)

1. `npm run build` → confirmar 0 errores, 0 warnings
2. `git add -A`
3. `git commit -m "cleanup: remove dead code, deduplicate constants, remove duplicate toaster/console logs"`
4. `git push origin main`
5. `vercel --prod --yes`

---

## Lo que NO se toca (decisiones tomadas)

| No tocar | Razón |
|----------|-------|
| `src/lib/calculations.ts` | El `CLAUDE.md` lo marca como **INMUTABLE** |
| Auth / Supabase clients (`server.ts`, `client.ts`) | Funcionan perfectamente |
| APIs que devuelven datos correctamente | No es limpieza, es refactor funcional |
| Migrar raw-fetch a SWR | Demasiado invasivo (~10 páginas). Es refactor de arquitectura, no limpieza. |
| Mover `xlsx` fuera del bundle | Requiere reescribir toda la lógica de export. Impacto bajo (ya hay tree-shaking parcial). |
| `as` type assertions en `hooks/use-data.ts` y `api/sales/route.ts` | Necesarios por el tipo débil de Supabase. Reescribirlos requiere cambiar la capa de datos entera. |
| Bug de profit-filter en `/api/sales` | Es un bug funcional, no limpieza. Si se quiere fixear, se hace en otro PR separado. |
| Componentes shadcn/ui | Son generados, no tocar salvo que estén rotos |
| Estilos visuales que ya funcionan | El roadmap visual es otra fase |

---

## Archivos afectados en total (13 archivos)

1. `src/middleware.ts` — **eliminar**
2. `src/lib/supabase/middleware.ts` — **eliminar**
3. `src/lib/api-utils.ts` — quitar `apiClientErrorResponse` + console.error
4. `src/lib/constants.ts` — agregar `STATUS_FLOW`, extender `MARKETPLACES`
5. `src/app/(dashboard)/layout.tsx` — quitar `<Toaster>` duplicado
6. `src/app/(dashboard)/orders/page.tsx` — importar `STATUS_FLOW` desde constants, null-safety en `estimated_arrival`
7. `src/app/(dashboard)/orders/[id]/page.tsx` — importar `STATUS_FLOW` desde constants
8. `src/components/product-form-modal.tsx` — usar `PRODUCT_STATUSES` importado
9. `src/app/(dashboard)/settings/page.tsx` — importar `MARKETPLACES` desde constants
10. `src/app/(dashboard)/research/page.tsx` — quitar console.error
11. `src/app/(dashboard)/products/[id]/error.tsx` — quitar console.error
12. `src/app/(dashboard)/error.tsx` — quitar console.error
13. `src/app/error.tsx` — quitar console.error
14. `src/components/error-boundary.tsx` — quitar console.error (opcional)

---

## Checklist de verificación post-ejecución

- [ ] Build pasa: `npm run build` → 0 errores, 0 warnings
- [ ] Login funciona
- [ ] Dashboard carga
- [ ] Productos cargan y listan
- [ ] Inventario carga
- [ ] Pedidos cargan y se puede crear orden
- [ ] Órdenes: el timeline/progreso renderiza correctamente
- [ ] Settings: marketplaces se muestran correctamente
- [ ] No hay toasts duplicados al disparar un toast
- [ ] No hay console.logs en la consola del navegador al navegar
