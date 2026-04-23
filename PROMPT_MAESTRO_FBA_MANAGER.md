# PROMPT MAESTRO — AMAZON FBA MANAGER POLISH COMPLETO
## Para usar en un chat nuevo con Claude

---

## CONTEXTO DEL PROYECTO

Sos un desarrollador senior trabajando sobre una app Next.js 14 productiva llamada **Amazon FBA Manager**, usada por el dueño de **Costtas Holding** para gestionar su negocio de private label en Amazon US. El dueño tiene conocimiento teórico de FBA pero es el primer año vendiendo — la app tiene que escalar con él.

**Repo:** https://github.com/CosttasHolding/amazon-fba-manager  
**Deploy:** https://amazon-fba-manager-virid.vercel.app/  
**Stack confirmado:**
- Next.js 14.1.0 (App Router) + TypeScript 5
- Supabase (Auth + PostgreSQL + RLS + Storage) — URL: https://okgjudpcadnabrnyrtra.supabase.co
- Tailwind CSS 3 (NO v4) + shadcn/ui + Radix UI
- next-themes (dark/light), react-hook-form 7 + zod 3
- lucide-react, sonner (toasts), recharts, date-fns, xlsx, jspdf, jspdf-autotable
- @tanstack/react-table, SWR, Vitest

**Tablas Supabase existentes:**
`products`, `inventory`, `stock_movements`, `sales`, `profiles`, `suppliers`, `product_suppliers`, `user_settings`
Vista: `products_with_inventory`. Todas con RLS (`user_id = auth.uid()`) + triggers `updated_at`.

**Módulos existentes:**
- `/dashboard` — métricas clave, top productos, resumen visual
- `/products` — CRUD completo, cálculo automático ROI/márgenes, export Excel
- `/inventory` — stock disponible/en tránsito/warehouse, alertas, historial movimientos
- `/sales` — registro ventas, revenue neto, métricas por producto
- `/suppliers` — gestión de proveedores (básico)
- `/calculator` — estimación tarifas FBA y ROI rápido
- `/settings` — configuración usuario

**Funcionalidad confirmada como INMUTABLE — NO TOCAR:**
- `src/lib/calculations.ts` — lógica de cálculos financieros, NUNCA modificar
- APIs de auth, validaciones Zod existentes
- Estructura de base de datos existente (solo agregar, nunca romper)

---

## REGLAS ABSOLUTAS DEL PROYECTO (respetar en todo momento)

1. TypeScript estricto siempre — nunca `any` implícito
2. snake_case en DB/Supabase, camelCase en frontend
3. `user_id = auth.uid()` en TODAS las queries sin excepción
4. `createClient()` con `await` en server, sin `await` en client
5. Formularios: react-hook-form + zod SIEMPRE
6. Toasts: solo `sonner` — nunca el toast viejo
7. Estilos: NUNCA `bg-white`, `bg-gray-*`, `text-gray-*` — usar variables CSS semánticas: `bg-background`, `bg-card`, `bg-muted`, `text-foreground`, `text-muted-foreground`
8. Responsive: tabla `hidden md:block` + cards `md:hidden`
9. Dropdowns/selects: fondo SÓLIDO (`bg-popover`), nunca translúcido
10. ThemeProvider: `attribute="class" defaultTheme="dark" enableSystem`
11. Máximo 2 archivos por respuesta para no perder contexto
12. Antes de modificar cualquier archivo, LEERLO primero
13. JSX con caracteres especiales: usar entidades (`{"\u00F3"}`, etc.)
14. Fetch siempre con try/catch y manejo de errores
15. Build debe quedar en 0 errores, 0 warnings

---

## LO QUE TENÉS QUE HACER — PLAN COMPLETO

Dividí el trabajo en fases. Ejecutalas **en orden**, completando cada una antes de pasar a la siguiente. Al terminar cada archivo, confirmá que el build sigue en 0 errores.

---

### FASE 1 — DASHBOARD PROFESIONAL (mayor impacto visual inmediato)

El dashboard actual tiene métricas básicas. Reemplazarlo con un dashboard de nivel profesional:

**1.1 — KPI Cards mejoradas**
- Revenue mensual actual vs mes anterior (con delta % y flecha ↑↓ con color)
- ROI promedio ponderado por ventas (no simple average)
- Unidades vendidas este mes
- Margen neto promedio
- Alertas activas (stock bajo + sin stock)
- Valor total del inventario en USD

Cada card debe tener: icono lucide-react relevante, número principal grande, subtexto con contexto, indicador de tendencia con color (verde/rojo/amarillo).

**1.2 — Gráfico de ventas temporal**
Usar recharts. LineChart con:
- Eje X: últimos 30 días o últimas 12 semanas (toggle entre vistas)
- Eje Y: revenue en USD
- Tooltip custom con formato de moneda
- Área sombreada bajo la línea (AreaChart)
- Responsive container

**1.3 — Tabla Top Productos**
Top 5 productos por rentabilidad neta (no por revenue bruto):
- Columnas: producto, unidades vendidas, revenue, ROI%, margen neto
- Badge de estado: 🟢 excelente (ROI>50%), 🟡 ok (ROI 20-50%), 🔴 revisar (<20%)
- Link directo al producto

**1.4 — Panel de alertas de inventario**
Lista de productos con stock crítico:
- Sin stock (badge rojo)
- Stock bajo (badge amarillo)  
- Sobrestock (badge azul)
Con botón de acción rápida para registrar movimiento de inventario.

---

### FASE 2 — MÓDULO DE PROVEEDORES COMPLETO

El módulo actual es básico. Construir uno profesional para gestionar la cadena de suministro desde China:

**2.1 — Modelo de datos ampliado (nueva migración SQL)**
Agregar a la tabla `suppliers` o crear `supplier_contacts`:
```sql
-- Agregar a suppliers si no existen:
contact_name TEXT,
contact_wechat TEXT,
contact_whatsapp TEXT,
contact_email TEXT,
country TEXT DEFAULT 'China',
city TEXT,
alibaba_url TEXT,
moq INTEGER,          -- Minimum Order Quantity
lead_time_days INTEGER, -- Días de producción
sample_cost DECIMAL(10,2),
payment_terms TEXT,   -- '30/70', 'LC', '100% upfront', etc.
currency TEXT DEFAULT 'USD',
reliability_score INTEGER CHECK (reliability_score BETWEEN 1 AND 5),
notes TEXT,
last_order_date DATE,
is_active BOOLEAN DEFAULT true
```

Y tabla `supplier_quotes` para tracking de cotizaciones:
```sql
CREATE TABLE supplier_quotes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  supplier_id UUID REFERENCES suppliers(id) ON DELETE CASCADE,
  product_id UUID REFERENCES products(id) ON DELETE SET NULL,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  quantity INTEGER NOT NULL,
  unit_price DECIMAL(10,4) NOT NULL,
  total_price DECIMAL(10,2),
  currency TEXT DEFAULT 'USD',
  valid_until DATE,
  shipping_method TEXT, -- 'air', 'sea', 'express'
  shipping_cost DECIMAL(10,2),
  notes TEXT,
  status TEXT DEFAULT 'pending', -- 'pending', 'accepted', 'rejected', 'expired'
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);
-- RLS igual que el resto
```

**2.2 — Lista de proveedores mejorada**
- Cards en grid (no tabla) con: nombre, país/ciudad, rating stars (1-5), MOQ, lead time, último pedido
- Badge de estado activo/inactivo
- Filtro por país, rating, producto asociado
- Búsqueda por nombre o contacto
- Botón "Solicitar cotización" directo

**2.3 — Detalle del proveedor**
Página `/suppliers/[id]`:
- Info completa con todos los campos
- Tab "Cotizaciones" — historial de quotes con este proveedor
- Tab "Productos" — qué productos se le compran
- Tab "Pedidos" — historial (si se agrega en el futuro, dejar estructura)
- Botón "Nueva cotización" que abre modal

**2.4 — Comparador de proveedores**
Herramienta `/suppliers/compare`:
- Seleccionar 2-4 proveedores de un dropdown
- Tabla comparativa: precio unitario, MOQ, lead time, rating, costo envío estimado
- Costo total estimado por proveedor para una cantidad dada
- Recomendación automática basada en mejor costo total

---

### FASE 3 — CALCULADORA FBA AVANZADA

La calculadora actual es básica. Reemplazar con una completa para decisiones reales de sourcing:

**3.1 — Calculadora de producto completa**
Inputs:
- Precio de venta en Amazon (USD)
- Costo de producto (USD, con campo para moneda del proveedor + tipo de cambio)
- Peso del producto (gramos o lbs, toggle)
- Dimensiones (largo x ancho x alto en cm o pulgadas)
- Categoría de Amazon (dropdown con las principales)
- Cantidad a importar
- Método de envío: Aéreo / Marítimo / Express (con costo por kg editable)
- Costo de preparación (prep center, etiquetado)
- Costo de fotografía / listing (amortizado por unidad)
- Presupuesto mensual PPC (campo separado)
- COGS adicionales (packaging especial, inspección, etc.)

Outputs calculados automáticamente:
- FBA Fee estimada (basada en dimensiones y categoría)
- Referral Fee (% por categoría)
- Costo de flete por unidad
- **Costo total landed**
- **Ganancia neta por unidad**
- **ROI %**
- **Margen neto %**
- **Break-even price**
- **Break-even units/mes** para cubrir costos fijos
- **TACOS objetivo** (con el PPC budget dado)
- Estimación de cash flow: cuándo recuperás la inversión

Visual: mostrar todos los componentes del costo como un breakdown con barras de proporción (ej: "el flete representa el 23% del costo").

**3.2 — Calculadora de rentabilidad por escenario**
3 columnas lado a lado: Pesimista / Realista / Optimista
- Diferente precio de venta, diferente volumen de ventas
- Automáticamente calcula ROI en cada escenario
- Permite ver en qué escenario el negocio es viable

**3.3 — Guardar cálculos**
Botón "Guardar análisis" que lo vincula a un producto existente o lo guarda como draft para revisitar. Tabla `saved_calculations` (crear migración).

---

### FASE 4 — MÓDULO DE RESEARCH DE PRODUCTOS

Nuevo módulo `/research` para el pipeline pre-lanzamiento:

**4.1 — Migración SQL**
```sql
CREATE TABLE product_research (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  niche TEXT,
  asin_reference TEXT,          -- ASIN del competidor principal
  amazon_category TEXT,
  estimated_monthly_sales INTEGER,
  average_price DECIMAL(10,2),
  review_count_competitor INTEGER,
  average_rating DECIMAL(3,2),
  bsr INTEGER,                   -- Best Seller Rank
  competition_level TEXT,        -- 'low', 'medium', 'high'
  estimated_cogs DECIMAL(10,2),
  estimated_selling_price DECIMAL(10,2),
  estimated_roi DECIMAL(5,2),
  differentiation_notes TEXT,
  keywords TEXT[],               -- Array de keywords principales
  status TEXT DEFAULT 'idea',    -- 'idea', 'validating', 'approved', 'rejected', 'in_progress', 'launched'
  priority INTEGER DEFAULT 3,    -- 1 (alta) a 5 (baja)
  source TEXT,                   -- 'helium10', 'manual', 'jungle_scout', etc.
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);
-- RLS igual que el resto
```

**4.2 — Vista Kanban**
Pipeline visual con columnas: Idea → Validando → Aprobado → En progreso → Lanzado / Rechazado
- Cards arrastrables entre columnas (usar @dnd-kit/core — agregar al package.json)
- Cada card muestra: nombre, categoría, ROI estimado, prioridad (color badge), días en esta etapa
- Click en card abre detalle lateral (drawer)

**4.3 — Vista Lista**
Toggle entre Kanban y Lista. La lista tiene filtros por status, categoría, ROI mínimo, prioridad.

**4.4 — Formulario de nuevo producto en research**
Campos del schema + calculadora integrada que auto-completa ROI/margen cuando ponés precio y COGS estimados.

---

### FASE 5 — MÓDULO DE PEDIDOS / PURCHASE ORDERS

Nuevo módulo `/orders` para trackear órdenes de compra a proveedores:

**5.1 — Migración SQL**
```sql
CREATE TABLE purchase_orders (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  supplier_id UUID REFERENCES suppliers(id),
  po_number TEXT UNIQUE,         -- Número de orden interno
  product_id UUID REFERENCES products(id),
  quantity INTEGER NOT NULL,
  unit_cost DECIMAL(10,4) NOT NULL,
  total_cost DECIMAL(10,2),
  currency TEXT DEFAULT 'USD',
  exchange_rate DECIMAL(10,4) DEFAULT 1,
  shipping_method TEXT,          -- 'air', 'sea', 'express'
  shipping_cost DECIMAL(10,2),
  status TEXT DEFAULT 'draft',   -- 'draft', 'sent', 'confirmed', 'in_production', 'shipped', 'in_transit', 'customs', 'delivered', 'cancelled'
  order_date DATE,
  production_deadline DATE,
  ship_date DATE,
  estimated_arrival DATE,
  actual_arrival DATE,
  tracking_number TEXT,
  forwarder_name TEXT,
  customs_cost DECIMAL(10,2),
  prep_center_cost DECIMAL(10,2),
  amazon_shipment_id TEXT,
  payment_deposit DECIMAL(10,2), -- Depósito pagado (ej. 30%)
  payment_balance DECIMAL(10,2), -- Saldo restante (ej. 70%)
  payment_deposit_date DATE,
  payment_balance_date DATE,
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);
```

**5.2 — Lista de órdenes**
Timeline visual del status con colores:
- Draft (gris) → Enviado (azul) → Confirmado (azul oscuro) → En producción (amarillo) → Embarcado (naranja) → En tránsito (naranja oscuro) → Aduana (rojo) → Entregado (verde)
- Filtros por status, proveedor, producto, fecha
- KPIs en el top: órdenes activas, valor en tránsito, próxima llegada estimada

**5.3 — Detalle de orden**
Página `/orders/[id]`:
- Timeline visual de progreso
- Costos desglosados: producto + flete + aduana + prep center = costo landed total
- Sección de pagos: qué se pagó, qué falta pagar
- Campo tracking con link a carrier si está disponible
- Botón "Recibido en Amazon" que automáticamente crea un movimiento de inventario positivo

---

### FASE 6 — MEJORAS AL MÓDULO DE INVENTARIO

**6.1 — Proyección de stock**
Para cada producto, mostrar:
- Días de stock restante (basado en velocidad de ventas de los últimos 30 días)
- Fecha estimada de stockout
- Alerta visual si el stockout es antes del lead time del proveedor principal
- Recomendación: "Pedí X unidades antes del DD/MM/YYYY"

**6.2 — Historial de movimientos enriquecido**
- Filtro por tipo de movimiento (venta, ajuste, recepción, daño)
- Export a Excel del historial filtrado
- Gráfico de evolución del stock en el tiempo (recharts AreaChart)

**6.3 — Snapshot de inventario**
Tabla resumida del valor total del inventario en USD (unidades × costo unitario por producto).

---

### FASE 7 — MEJORAS AL MÓDULO DE VENTAS

**7.1 — Import de ventas desde CSV de Seller Central**
Botón "Importar desde Seller Central" que acepta el CSV de Business Reports de Amazon y automáticamente mapea las columnas a la tabla de ventas. Mostrar preview antes de confirmar.

**7.2 — Métricas ampliadas**
- TACOS (Total ACoS = PPC spend / total revenue) — agregar campo `ppc_spend` a sales o en tabla separada
- Ventas orgánicas vs PPC
- Tendencia de BSR si el usuario la carga manualmente

**7.3 — Reporte mensual**
Botón "Generar reporte del mes" que produce un PDF (usando jspdf que ya está instalado) con:
- Resumen ejecutivo (revenue, unidades, ROI, margen)
- Gráfico de ventas del mes
- Top y bottom performers
- Alertas de inventario
- Tabla detallada por producto

---

### FASE 8 — CALIDAD TÉCNICA Y PERFORMANCE

**8.1 — Error handling global**
- Implementar Error Boundaries en los módulos principales
- Toast de error consistente para todos los fetch failures
- Loading skeletons (shadcn/ui Skeleton) en todas las listas y tablas — actualmente algunas muestran pantalla en blanco mientras cargan

**8.2 — Optimización de queries Supabase**
- Revisar todas las API routes y asegurarse que NO hacen N+1 queries
- Usar `.select()` con joins en vez de queries separadas donde sea posible
- Agregar paginación server-side a todas las listas con más de 20 ítems (@tanstack/react-table ya está instalado, usarlo para paginación)

**8.3 — Tests unitarios**
Vitest ya está configurado. Agregar tests para:
- `src/lib/calculations.ts` — todos los cálculos financieros con edge cases (precio 0, ROI negativo, etc.)
- Schemas Zod en `src/validations/` — testear validaciones con inputs inválidos
- Al menos 1 test de integración por API route crítica (products, sales)

**8.4 — TypeScript estricto**
- Revisar `tsconfig.json` y asegurarse que `strict: true` está activado
- Eliminar todos los `as any` que haya en el código
- Tipar correctamente las respuestas de Supabase usando los tipos generados

**8.5 — Accesibilidad básica**
- Todos los inputs con `aria-label` o `<label>` asociado
- Botones con texto descriptivo o `aria-label`
- Focus visible en todos los elementos interactivos

---

### FASE 9 — POLISH UI/UX FINAL

**9.1 — Design System consistente**
Revisar DESIGN_SYSTEM.md del repo y aplicar consistencia en:
- Tamaños de tipografía (heading, subheading, body, caption)
- Espaciados (padding/margin) consistentes entre páginas
- Border radius uniforme
- Sombras consistentes

**9.2 — Empty states**
Todas las listas deben tener un empty state con:
- Ícono lucide-react relevante
- Título descriptivo
- Subtexto explicativo
- Botón CTA de acción primaria (ej: "Agregar tu primer producto")
Actualmente algunas muestran simplemente nada.

**9.3 — Onboarding mínimo**
Para usuarios nuevos (0 productos, 0 ventas), mostrar un checklist de primeros pasos en el dashboard:
- [ ] Agregar tu primer producto
- [ ] Configurar un proveedor
- [ ] Registrar tu primera venta
Con links directos y porcentaje de completado.

**9.4 — Navegación mejorada**
- Breadcrumbs en páginas de detalle (`/products/[id]`, `/suppliers/[id]`)
- Indicador de página activa en sidebar (ya debe existir, verificar que funciona en todas las rutas)
- Shortcut de búsqueda global (⌘K) — modal que busca en productos, proveedores y pedidos simultáneamente

---

## CÓMO TRABAJAR — INSTRUCCIONES PARA CADA PASO

**Antes de tocar cualquier archivo:**
1. Leer el archivo actual completo
2. Identificar qué cambia y qué NO debe cambiar
3. Hacer la modificación mínima necesaria
4. Verificar que el build sigue en 0 errores

**Para cada nueva feature:**
1. Primero la migración SQL (si aplica)
2. Luego los tipos TypeScript en `src/types/index.ts`
3. Luego la validación Zod en `src/validations/`
4. Luego la API route en `src/app/api/`
5. Luego el componente/página en `src/app/(dashboard)/`

**Patrones de referencia (copiar estructura de):**
- Nueva lista → `src/app/(dashboard)/inventory/page.tsx`
- Nuevo form → `src/app/(dashboard)/products/new/page.tsx`
- Nuevo detalle → `src/app/(dashboard)/products/[id]/page.tsx`
- Nueva API → `src/app/api/products/route.ts`

**Al terminar cada fase, confirmar:**
- `npm run build` → 0 errores
- `npm run lint` → 0 warnings
- La feature funciona en modo desarrollo
- Dark mode y light mode ambos se ven bien

---

## ORDEN DE PRIORIDAD RECOMENDADO

Si hay límite de tokens o tiempo, ejecutar en este orden:

1. **Fase 1** (Dashboard) — impacto visual inmediato, motiva al usuario
2. **Fase 3** (Calculadora avanzada) — herramienta de decisión crítica para FBA
3. **Fase 2** (Proveedores completo) — gestión de cadena de suministro
4. **Fase 4** (Research de productos) — pipeline pre-lanzamiento
5. **Fase 5** (Purchase Orders) — tracking de importaciones
6. **Fase 8** (Calidad técnica) — siempre en paralelo, no dejar para el final
7. **Fase 6** (Inventario mejorado) — sobre base existente
8. **Fase 7** (Ventas mejoradas) — sobre base existente
9. **Fase 9** (Polish UI) — último paso cuando todo funciona

---

## NOTAS FINALES PARA EL AGENTE

- El dueño es argentino, vende en Amazon US, importa desde China. El contexto del negocio importa para las features.
- Los montos siempre en USD. Si hay tipo de cambio (ARS, CNY), mostrar siempre el equivalente en USD.
- El flete es aéreo desde China (prioritario por ser negocio nuevo), aunque la app debe soportar marítimo también.
- Helium 10 es la herramienta de research principal. Si hay integraciones futuras con APIs externas, priorizarla.
- El usuario es el único usuario del sistema por ahora (multi-tenant preparado pero single-user en la práctica).
- NO se usan VAs ni equipo por ahora — las features de comunicación/alertas son para uso personal.
- Budget de PPC existe pero es limitado — las métricas de eficiencia (TACOS, ACoS) son críticas.

---

*Generado por análisis del repo https://github.com/CosttasHolding/amazon-fba-manager — CLAUDE.md, package.json, README.md y estructura de directorios verificados.*
