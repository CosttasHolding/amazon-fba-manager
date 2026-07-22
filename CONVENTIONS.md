# Convenciones del Proyecto — Amazon FBA Manager

## 1. Reglas Absolutas (NO se pueden violar)

- **TypeScript strict mode**: NO usar `any`, siempre tipar
- **Nomenclatura**: `snake_case` en DB y API routes, `camelCase` en frontend (componentes, hooks, utils)
- **CSS**: NUNCA usar `bg-white`, `bg-gray-*`, `text-gray-*`. SIEMPRE usar CSS variables (`bg-background`, `bg-card`, `text-foreground`, `text-muted-foreground`)
- **calculations.ts es INMUTABLE**: no modificar `calcRefFee`, `calcFBAFee`, `calcMetrics`
- **Max 2 archivos por respuesta** (para mantener contexto limpio)
- **Sin comentarios en el código** a menos que el usuario los pida
- **Validación**: todos los forms usan Zod schemas en `src/validations/*.ts`
- **Toast**: siempre usar sonner (`toast.success` / `toast.error`), nunca alerts nativos
- **Encoding**: SIEMPRE UTF-8, NO BOM

## 2. Estructura de Archivos

```
Pages:        src/app/(dashboard)/[module]/page.tsx
API routes:   src/app/api/[entity]/route.ts
Components:   src/components/[name].tsx (feature) o src/components/ui/[name].tsx (base)
Hooks:        src/hooks/use-[name].ts
Lib:          src/lib/[name].ts
Validations:  src/validations/[entity].ts
Types:        src/types/index.ts (consolidated)
i18n:         src/lib/i18n/[locale].json
```

## 3. Patrón de Copia (para nuevos módulos)

When creating a new module, copy from the closest existing module:

| Tipo de módulo | Copiar desde |
|---|---|
| New CRUD module | `products/` o `suppliers/` |
| New Kanban | `research/` o `tasks/` |
| New list with tabs | `finances/` o `returns/` |
| New chart page | `analytics/` |
| New form modal | `product-form-modal.tsx` |
| New API route | `/api/products/route.ts` |
| New SWR hook | `use-data.ts` |
| New Zod schema | `validations/product.ts` |

## 4. Patrón de Página Típica

```tsx
"use client";
// Imports: hooks, components, types
export default function ModulePage() {
  // State, SWR hooks, filters
  // Render: PageSkeleton -> PageHeader -> KPI grid -> SectionCard (charts) -> DataTableWrapper -> PaginationControl
}
```

## 5. Patrón de API Route Típica

```ts
import { createApiHandler, buildPagination, paginatedResponse } from "@/lib/api-handler";

export const GET = createApiHandler(async ({ supabase, user, orgId, req }) => {
  // buildPagination(req) -> supabase query with .eq("org_id", orgId) -> paginatedResponse()
});

export const POST = createApiHandler(async ({ supabase, user, orgId, req }) => {
  // Parse body -> Zod validate -> supabase insert with org_id -> return 201
});
```

## 6. Naming Conventions

| Elemento | Convención | Ejemplos |
|---|---|---|
| DB tables | `plural_snake_case` | `products`, `stock_movements`, `purchase_orders` |
| DB columns | `snake_case` | `unit_cost`, `sale_price`, `net_profit` |
| Frontend vars | `camelCase` | `unitCost`, `salePrice`, `netProfit` |
| API params | `camelCase` en query strings, `snake_case` en DB queries | |
| Component files | `kebab-case` | `product-form-modal.tsx` |
| Hook files | `use-[name].ts` | `use-data.ts` |
| Type files | `PascalCase` interfaces | `Product`, `Supplier`, `PurchaseOrder` |
| CSS classes | Tailwind utility classes, NUNCA clases custom excepto en `globals.css` | |

## 7. State Management

| Tipo | Herramienta |
|---|---|
| Server state | SWR hooks (`useProductsQuery`, `useDashboard`, etc.) |
| Form state | `react-hook-form` con `zodResolver` |
| UI state | `useState` para estado local (modals, tabs, filters) |
| Theme state | `next-themes` via `useTheme()` |
| Locale state | Custom `LocaleProvider` via `useLocale()` |
| Org state | `OrgProvider` via `useOrg()` con `localStorage` persistence |

## 8. Error Handling Patterns

- **API routes**: `createApiHandler` catch-all retorna `"Error interno del servidor"` genérico
- **Validation errors**: Zod `safeParse` -> retorna primer mensaje de error con `400`
- **Page errors**: `error.tsx` por módulo con componente `ErrorFallback`
- **Form errors**: `FormErrorMessage` con `role="alert"`
- **Toast errors**: `toast.error(message)` para errores visibles por el usuario

## 9. Testing Patterns

| Tipo | Herramienta / Config |
|---|---|
| Unit tests | Vitest con jsdom, globals habilitados |
| API tests | mock Supabase client, utility `createMockRequest` |
| E2E tests | Playwright con Chromium + Mobile Chrome |
| Mock pattern | `vi.mock("@/lib/supabase/server")` retornando query builder encadenable |
| Test location | Co-located con source (`product.test.ts` junto a `product.ts`) |

## 10. i18n Pattern

```ts
const { locale } = useLocale();
t("module.key", locale);
```

- **Keys**: dot-notation namespaced por módulo (`products.title`, `sales.create_success`)
- **Default locale**: `es` (Spanish)
- **RTL**: Arabic dispara `dir="rtl"` en el elemento `html`

## 11. Security Conventions

- **Never** exponer la service role key al client
- **Never** loggear datos sensibles (tokens, passwords)
- API routes siempre retornan mensajes de error genéricos
- Rate limiting en todos los endpoints (`60 req/min`)
- CSP headers configurados por environment (dev permite `unsafe-eval`)
- Todos los elementos interactivos deben tener min 44px touch targets

## 12. Performance Conventions

- Dynamic imports para componentes pesados: `dynamic(() => import(...), { ssr: false })`
- SWR deduplication: `10s` interval
- Pagination: SIEMPRE server-side (nunca cargar todos los registros)
- Skeleton loaders en vez de texto "Cargando..."
- Debounce en search inputs (`useDebounce` hook, `200-300ms`)
- Dashboard auto-refresh: solo cada `120s`

## 13. Deploy Workflow

1. `npm run lint` (ESLint `next/core-web-vitals`)
2. `npm run test:run` (Vitest)
3. `npm run build` (Next.js production)
4. Auto-deploy a Vercel en build exitoso

- **Production URL**: `https://amazon-fba-manager-virid.vercel.app`
