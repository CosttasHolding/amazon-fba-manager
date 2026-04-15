# CLAUDE.MD — AMAZON FBA MANAGER V2
# Next.js 14 + Supabase + TypeScript + shadcn/ui
# Versión: 2.0 — Abril 2025

═══════════════════════════════════════════════════════════
1. QUÉ ES
═══════════════════════════════════════════════════════════

App web de gestión integral para vendedores de Amazon FBA (US).
Productos, costos, fees, ROI, inventario, ventas, proveedores
Alibaba y dashboard de métricas. Dark/light mode, full responsive.
Multi-usuario con auth. Evolución de V1 (Express+SQL.js) a stack moderno.


═══════════════════════════════════════════════════════════
1.5 ESTADO ACTUAL DEL PROYECTO
═══════════════════════════════════════════════════════════

Fase actual:      FASE 1 — Funcionalidad crítica
Última tarea:     [completar cuando avances]
Próxima tarea:    CREAR products/[id]/edit/page.tsx
Bugs activos:     Ninguno conocido
Último update:    2025-04-XX
Progreso global:  ~60% core features completadas


═══════════════════════════════════════════════════════════
2. STACK Y VERSIONES
═══════════════════════════════════════════════════════════

Framework:    Next.js 14.1.0 (App Router)
Lenguaje:     TypeScript (~5.x)
Base de datos: Supabase (PostgreSQL + Auth + Storage + RLS)
Estilos:      Tailwind CSS 3 + shadcn/ui + Radix UI
Tema:         next-themes attribute="class" default="dark"
Forms:        react-hook-form 7.x + zod 3.x
Iconos:       lucide-react
DB Client:    @supabase/supabase-js 2.x
Ruta local:   E:\amazon-fba-manager-v2\amazon-fba-manager
URL:          http://localhost:3000
Supabase:     https://okgjudpcadnabrnyrtra.supabase.co
Supabase ID:  okgjudpcadnabrnyrtra
Repo:         GitHub (conectado)

─── NOTA VERSIONES ───
No usar APIs ni sintaxis de Next.js 15.
No sugerir dependencias fuera de este stack sin confirmación.


═══════════════════════════════════════════════════════════
3. ESTRUCTURA DE ARCHIVOS
═══════════════════════════════════════════════════════════

src/
├── app/
│   ├── layout.tsx                ← ThemeProvider + globals
│   ├── globals.css               ← Variables CSS semánticas
│   ├── (auth)/
│   │   ├── login/page.tsx
│   │   └── register/page.tsx
│   ├── (dashboard)/
│   │   ├── layout.tsx            ← Sidebar + bottom nav + ThemeToggle
│   │   ├── dashboard/page.tsx
│   │   ├── products/
│   │   │   ├── page.tsx          ← Lista productos
│   │   │   ├── new/page.tsx      ← Crear producto
│   │   │   └── [id]/
│   │   │       ├── page.tsx      ← Detalle producto
│   │   │       └── edit/page.tsx ← Editar producto (PENDIENTE)
│   │   ├── inventory/page.tsx
│   │   ├── sales/page.tsx
│   │   ├── calculator/page.tsx
│   │   ├── suppliers/            ← (PENDIENTE — Fase 2)
│   │   ├── settings/page.tsx     ← (PENDIENTE — Fase 4)
│   │   └── import/page.tsx       ← (PENDIENTE — Fase 4)
│   └── api/
│       ├── products/
│       │   ├── route.ts          ← GET list + POST
│       │   └── [id]/route.ts     ← GET + PUT + DELETE
│       ├── dashboard/route.ts    ← GET métricas
│       ├── sales/route.ts        ← GET + POST
│       ├── inventory/route.ts    ← GET
│       ├── calculator/route.ts   ← POST
│       └── suppliers/            ← (PENDIENTE — Fase 2)
├── components/
│   ├── ui/                       ← shadcn: card,button,input,select,table
│   ├── theme-provider.tsx
│   └── theme-toggle.tsx
├── lib/
│   ├── utils.ts
│   ├── calculations.ts          ← Fórmulas P&L (INMUTABLE)
│   └── supabase/
│       ├── server.ts
│       └── client.ts
├── types/
│   └── index.ts                  ← Tipos snake_case
└── validations/
    ├── product.ts
    └── supplier.ts               ← (PENDIENTE — Fase 2)


═══════════════════════════════════════════════════════════
4. BASE DE DATOS (Supabase — PostgreSQL)
═══════════════════════════════════════════════════════════

─── TABLAS EXISTENTES ───

profiles         → id, user metadata (auto-created on signup)
products         → id, user_id, name, sku, asin, category, price, weight,
                   dimensions, status, keyword_main, bsr_reference,
                   viability_score, competition_score, created_at, updated_at
inventory        → id, product_id, units_ordered, units_received, units_sold,
                   units_in_fba, units_in_transit, reorder_point, reorder_qty,
                   avg_daily_sales, updated_at
stock_movements  → id, product_id, type, quantity, notes, created_at
sales            → id, product_id, date, units, revenue, ppc_spend, created_at

─── VIEW ───
products_with_inventory → JOIN products + inventory

─── TRIGGERS ───
handle_new_user              → auto-create profile on signup
auto_create_inventory        → auto-create inventory row on new product
update_inventory_from_movement → update inventory on stock_movement insert
update_updated_at            → auto-update updated_at timestamp

─── RLS POLICIES ───
own_profile, own_products, own_inv, own_mov, own_sales
(user_id = auth.uid())

─── STORAGE ───
product-files bucket

─── TABLAS PENDIENTES (Fase 2) ───

suppliers:
  id, user_id, name, alibaba_url, contact_name, contact_email,
  contact_whatsapp, country, rating (1-5), payment_terms,
  min_order_qty, lead_time_days, notes, status (active/inactive),
  created_at, updated_at
  + RLS own_suppliers + trigger update_updated_at

product_suppliers (M2M):
  id, product_id FK, supplier_id FK, user_id, unit_cost, moq,
  lead_time_days, is_primary boolean, notes, created_at
  + RLS policy

─── PRODUCTO TEST ───
ID: c9649e96-2df1-4e09-ae8d-683a1d3d04d0
Nombre: Funda Silicona iPhone 15 | SKU: test-001


═══════════════════════════════════════════════════════════
5. FÓRMULAS DE CÁLCULO — INMUTABLES ⚠️
═══════════════════════════════════════════════════════════

⚠️ NO MODIFICAR ESTAS FÓRMULAS SIN CONFIRMACIÓN EXPLÍCITA

landed_cost      = FOB + shipping + (FOB × tariff%) + (QC ÷ units) + otros + storage
referral_fee     = precio_venta × 15%
ppc_cost         = precio_venta × ACoS%
gross_profit     = precio_venta - landed_cost
net_profit       = precio_venta - landed_cost - referral_fee - fba_fee - ppc_cost
total_investment = landed_cost × unidades
total_net_profit = net_profit × unidades
roi              = (total_net_profit ÷ total_investment) × 100
break_even       = total_investment ÷ (precio - referral_fee - fba_fee - ppc)

days_of_stock    = (units_in_fba + units_in_transit) ÷ avg_daily_sales
forecast_30/60/90 = avg_daily_sales × 30/60/90
needs_reorder    = (units_in_fba + units_in_transit) ≤ reorder_point

Defaults: Referral 15% | Tariff 4% | FBA Fee \$3.22 | ACoS 30%
          QC \$300 | Units 250 | Reorder point 50 | Reorder qty 200


═══════════════════════════════════════════════════════════
6. ARCHIVOS FUNCIONALES — NO TOCAR SIN RAZÓN
═══════════════════════════════════════════════════════════

✅ (dashboard)/dashboard/page.tsx     — Responsive + dark + snake_case
✅ (dashboard)/products/page.tsx      — Responsive + dark (lista)
✅ (dashboard)/products/[id]/page.tsx — Dark (detalle)
✅ (dashboard)/products/new/page.tsx  — Dark (crear)
✅ (dashboard)/inventory/page.tsx     — Responsive + dark + métricas
✅ (dashboard)/sales/page.tsx         — Responsive + dark + métricas
✅ (dashboard)/layout.tsx             — Sidebar + bottom nav + ThemeToggle
✅ (auth)/login/page.tsx              — Dark
✅ (auth)/register/page.tsx           — Dark
✅ layout.tsx + globals.css           — ThemeProvider + variables
✅ api/products/route.ts + [id]/      — CRUD snake_case
✅ api/dashboard/route.ts             — GET snake_case
✅ api/sales/route.ts                 — GET + POST snake_case
✅ api/inventory/route.ts             — GET snake_case
✅ api/calculator/route.ts            — POST
✅ components/theme-provider + toggle
✅ components/ui/ (card,button,input,select,table — premium)
✅ lib/utils.ts + calculations.ts + supabase/server+client
✅ types/index.ts (snake_case) + validations/product.ts


═══════════════════════════════════════════════════════════
7. TRABAJO PENDIENTE (en orden)
═══════════════════════════════════════════════════════════

FASE 1 — Funcionalidad crítica
  1. [ ] CREAR products/[id]/edit/page.tsx
  2. [ ] Botones Editar + Eliminar en products/[id] (Dialog confirmación)
  3. [ ] Verificar + fix calculator/page.tsx (dark/responsive)

FASE 2 — Proveedores Alibaba
  4. [ ] Tabla suppliers en Supabase + RLS + trigger
  5. [ ] Tabla product_suppliers (M2M) + RLS
  6. [ ] api/suppliers/route.ts — GET list+search + POST
  7. [ ] api/suppliers/[id]/route.ts — GET + PUT + DELETE
  8. [ ] api/suppliers/[id]/products/route.ts — GET
  9. [ ] (dashboard)/suppliers/page.tsx — Lista responsive+dark+métricas
  10. [ ] (dashboard)/suppliers/new/page.tsx — Crear
  11. [ ] (dashboard)/suppliers/[id]/page.tsx — Detalle + productos vinculados
  12. [ ] (dashboard)/suppliers/[id]/edit/page.tsx — Editar
  13. [ ] Sección "Proveedores" en products/[id]/page.tsx
  14. [ ] Selector supplier en products/new y edit
  15. [ ] Link "Proveedores" en sidebar + bottom nav
  16. [ ] validations/supplier.ts — Zod schema
  17. [ ] types/index.ts — Tipos Supplier, ProductSupplier

FASE 3 — Dark mode + responsive pendientes
  18. [ ] Verificar badge, dialog, label, toast, toaster
  19. [ ] Verificar responsive: products/new, products/[id], calculator, auth

FASE 4 — Páginas placeholder → funcionales
  20. [ ] Settings — Perfil + tema + danger zone
  21. [ ] Import — CSV upload + preview + bulk insert
  22. [ ] Export CSV en products/page.tsx

FASE 5 — Polish
  23. [ ] Middleware auth (src/middleware.ts) — redirect login/dashboard
  24. [ ] not-found.tsx (404)
  25. [ ] Skeleton loaders en dashboard y listas
  26. [ ] SEO metadata en layout
  27. [ ] Favicon personalizado
  28. [ ] Error handling en todos los fetches frontend


═══════════════════════════════════════════════════════════
8. CONVENCIONES Y REGLAS
═══════════════════════════════════════════════════════════

Código:
  - TypeScript estricto
  - snake_case en DB (Supabase) — NUNCA camelCase a la DB
  - Tipos en types/index.ts, validaciones en validations/
  - API routes en src/app/api/, pages en src/app/(dashboard)/

UI obligatorio:
  - NUNCA bg-white, bg-gray-*, text-gray-*
  - USAR bg-background, bg-card, bg-muted, text-foreground, text-muted-foreground
  - Responsive: tabla hidden md:block + cards md:hidden
  - Dark/light con variables CSS semánticas
  - Métricas: grid 2/4 cols, iconos bg-{color}-500/10
  - Spinner: border-primary animate-spin
  - Empty states: icono + texto centrado
  - Headers: h1 text-2xl font-bold + p text-sm text-muted-foreground
  - Spacing: space-y-6

Workflow:
  - Máximo 2 archivos por mensaje
  - Escribir con PowerShell @'...'@ | Set-Content
  - Pedir Get-Content antes de modificar archivo que no tengas
  - Después de cambios decir QUÉ PROBAR
  - No repetir código que ya funciona
  - AL COMPLETAR una tarea SIEMPRE:
    1. Actualizar este claude.md sección 1.5 (estado actual)
    2. Marcar [x] la tarea completada en sección 7 con fecha
    3. Si se creó archivo nuevo → agregarlo con ✅ en sección 6
    4. Si se creó archivo nuevo → actualizar sección 3 (estructura)
    5. Confirmar al usuario qué se actualizó en claude.md

Colores semánticos:
  ROI ≥30% → green | 15-29% → amber | <15% → red
  Status: idea→gris | research→blue | sourcing→amber
          ordered→purple | active→green | paused→red


═══════════════════════════════════════════════════════════
9. REGLAS PARA LA IA
═══════════════════════════════════════════════════════════

✅ PUEDE:
  - Crear archivos nuevos siguiendo estructura y patrones existentes
  - Implementar lo pendiente en orden de fases
  - Agregar columnas a Supabase con migración SQL
  - Corregir bugs, optimizar queries, mejorar validaciones
  - Agregar componentes shadcn/ui necesarios
  - Actualizar este claude.md al completar tareas (secciones 1.5, 3, 6, 7)

❌ NO SIN CONFIRMACIÓN:
  - Modificar fórmulas de cálculo (sección 5)
  - Cambiar stack o agregar dependencias no listadas
  - Modificar archivos marcados ✅ sin razón
  - Cambiar estructura de carpetas
  - Modificar RLS policies existentes
  - Tocar configuración de Supabase/Auth

🟡 SUGERIR ANTES:
  - Nuevas features no listadas en las fases
  - Refactorizaciones grandes
  - Nuevas tablas no especificadas
  - Cambios de arquitectura


═══════════════════════════════════════════════════════════
10. DOMINIO DE NEGOCIO — AMAZON FBA
═══════════════════════════════════════════════════════════

FBA = Fulfilled by Amazon (Amazon almacena, empaca y envía)
FOB = Free On Board (precio en puerto origen)
MOQ = Minimum Order Quantity
ASIN = Amazon Standard ID (10 chars)
BSR = Best Sellers Rank
PPC = Pay Per Click (publicidad Amazon)
ACoS = Advertising Cost of Sale (gasto PPC ÷ ventas)
Landed Cost = FOB + envío + aranceles + QC
Referral Fee = Comisión Amazon (~15%)
FBA Fee = Tarifa fulfillment (~\$3.22)
Reorder Point = Stock mínimo que dispara nueva orden

Flujo: idea → research → sourcing → ordered → active
Proveedores: Alibaba, 1688, Global Sources
Scoring: 0-100 basado en MOQ, rating, Trade Assurance, OEM, años


═══════════════════════════════════════════════════════════
11. ERRORES COMUNES — NO REPETIR
═══════════════════════════════════════════════════════════

❌ Usar bg-white o bg-gray-*       → SIEMPRE bg-background, bg-card, bg-muted
❌ Usar text-gray-*                → SIEMPRE text-foreground, text-muted-foreground
❌ camelCase en queries Supabase   → SIEMPRE snake_case (unit_cost, NOT unitCost)
❌ Olvidar user_id en queries      → SIEMPRE filtrar por user_id del auth
❌ Crear componentes sin dark mode → SIEMPRE usar variables CSS semánticas
❌ Tablas sin versión mobile       → SIEMPRE tabla desktop + cards mobile
❌ Formularios sin validación Zod  → SIEMPRE schema Zod + react-hook-form
❌ Fetch sin try/catch             → SIEMPRE manejar errores con feedback al usuario
❌ Hardcodear colores              → SIEMPRE usar clases semánticas de Tailwind
❌ Crear archivo sin TypeScript    → SIEMPRE .tsx/.ts con tipos explícitos


═══════════════════════════════════════════════════════════
12. ARCHIVOS MODELO — SEGUIR ESTOS PATRONES
═══════════════════════════════════════════════════════════

Para crear NUEVA PÁGINA DE LISTA, copiar patrón de:
  → (dashboard)/inventory/page.tsx
  (métricas arriba + tabla desktop + cards mobile + empty state)

Para crear NUEVA PÁGINA DE FORMULARIO, copiar patrón de:
  → (dashboard)/products/new/page.tsx
  (react-hook-form + zod + toast feedback)

Para crear NUEVA PÁGINA DE DETALLE, copiar patrón de:
  → (dashboard)/products/[id]/page.tsx
  (fetch + loading + secciones con cards)

Para crear NUEVA API ROUTE (CRUD), copiar patrón de:
  → api/products/route.ts (GET list + POST)
  → api/products/[id]/route.ts (GET + PUT + DELETE)

Para crear NUEVA VALIDACIÓN ZOD, copiar patrón de:
  → validations/product.ts

Para crear NUEVOS TIPOS, agregar en:
  → types/index.ts (mantener snake_case)