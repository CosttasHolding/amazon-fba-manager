# CLAUDE.MD - AMAZON FBA MANAGER V2
# Actualizado: Abril 2025 - Build limpio 0 errores

## QUE ES
App web gestion vendedores Amazon FBA. Productos, costos, fees, ROI, inventario, ventas, proveedores, dashboard. Multi-usuario con auth.

## ESTADO
Fase actual: REDISENO VISUAL (ver docs/ROADMAP_VISUAL.md para pasos)
Paso actual: A1
La app esta 100% funcional. Solo se cambia la UI visual, NO la logica.
Build: 0 errores, 0 warnings.

## STACK
- Next.js 14.1.0 (App Router) + TypeScript 5
- Supabase (Auth + PostgreSQL + RLS + Storage)
- Tailwind CSS 3 (NO v4) + shadcn/ui + Radix UI
- next-themes (dark/light)
- react-hook-form 7 + zod 3
- lucide-react, sonner (toasts), recharts, date-fns, xlsx
- Ruta: E:\amazon-fba-manager-v2\amazon-fba-manager
- Supabase URL: https://okgjudpcadnabrnyrtra.supabase.co

## ESTRUCTURA CLAVE
src/app/(auth)/login + register -> auth pages
src/app/(dashboard)/layout.tsx -> auth protection + sidebar + nav
src/app/(dashboard)/dashboard, products, suppliers, inventory, sales, calculator, settings
src/app/api/ -> products, dashboard, sales, inventory, calculator, settings, suppliers
src/components/ui/ -> shadcn components
src/lib/supabase/server.ts -> async createClient() (SIEMPRE await)
src/lib/supabase/client.ts -> createBrowserClient() (sin await)
src/lib/calculations.ts -> INMUTABLE, NO TOCAR NUNCA
src/types/index.ts + src/validations/

## TABLAS SUPABASE
products, inventory, stock_movements, sales, profiles, suppliers, product_suppliers, user_settings
Vista: products_with_inventory
Todas con RLS (user_id = auth.uid()) + triggers updated_at

## AUTH
Login: supabase.auth.signInWithPassword() client-side + window.location.href = "/dashboard"
Dashboard layout: await createClient() -> getUser() -> if !user redirect("/login")
NO hay middleware.ts activo.

## REGLAS ABSOLUTAS - CODIGO
- TypeScript estricto siempre
- snake_case en DB, camelCase en formularios frontend
- user_id = auth.uid() en TODAS las queries
- createClient() con await (server) / sin await (client)
- Formularios: react-hook-form + zod SIEMPRE
- Toasts: sonner (NO toast viejo)
- lib/calculations.ts es INMUTABLE
- Maximo 2 archivos por respuesta

## REGLAS ABSOLUTAS - ESTILOS
- NUNCA bg-white, bg-gray-*, text-gray-*
- USAR variables CSS: bg-background, bg-card, bg-muted, text-foreground, text-muted-foreground
- Responsive: tabla hidden md:block + cards md:hidden
- Dropdowns/selects: fondo SOLIDO (bg-popover), NUNCA translucido
- ThemeProvider: attribute="class" defaultTheme="dark" enableSystem
- Solo @tailwind base/components/utilities en globals.css

## ENCODING
- JSX: {"\u00F3"} {"\u00E1"} {"\u00ED"} {"\u00F1"} {"\u00E9"} {"\u00FA"}
- Strings JS: \u00F3 directo
- Leer archivos con corchetes: Get-Content -LiteralPath "ruta\[id]\archivo"

## ERRORES COMUNES - NO REPETIR
- bg-white o bg-gray -> variables CSS semanticas
- camelCase en queries Supabase -> snake_case
- Olvidar user_id en queries -> filtrar siempre
- Selects translucidos -> bg solido
- Fetch sin try/catch -> manejar errores
- Archivos sin TypeScript -> .tsx/.ts con tipos

## PATRONES
- Nueva lista -> copiar inventory/page.tsx
- Nuevo form -> copiar products/new/page.tsx
- Nuevo detalle -> copiar products/[id]/page.tsx
- Nueva API -> copiar api/products/route.ts

## WORKFLOW REDISENO
- Seguir docs/ROADMAP_VISUAL.md paso a paso
- Leer archivo actual antes de modificarlo
- Solo cambiar UI, NO logica/APIs/auth/validaciones
- Al completar paso, actualizar "Paso actual" arriba
- Si tokens se agotan: indicar paso actual para continuar despues
- Para diseno visual consultar DESIGN_SYSTEM.md