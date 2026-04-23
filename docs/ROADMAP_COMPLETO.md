# ROADMAP COMPLETO — AMAZON FBA MANAGER V2
# Documento Maestro de Progreso y Testing
# Actualizado: Abril 2026 | Build limpio: 0 errores, 0 warnings, 90/90 unit+integration tests + E2E base

---

## ESTADO ACTUAL DEL PROYECTO

| Metrica | Valor |
|---------|-------|
| Build | ✅ 0 errores, 0 warnings |
| Tests unitarios | ✅ 90/90 pasan |
| Tests E2E | ✅ Base configurado (Playwright) |
| Tests E2E | ❌ Pendiente (Playwright no instalado) |
| Rutas | 35 (24 dinamicas + 11 estaticas) |
| Middleware | ✅ Activo (80 kB) |
| Auth | ✅ Funcionando (Supabase SSR v0.10.2) |
| TypeScript | ✅ 0 `any`, 0 `var` en todo `src/` |
| Responsive | ✅ Desktop + Mobile (cards/tablas) |

---

## FASE 0: SETUP Y BASE TECNICA (Completada)

### 0.1 Stack inicial
- Next.js 14.2.35 (App Router)
- TypeScript 5 (strict)
- Tailwind CSS 3 + shadcn/ui
- Supabase (Auth + PostgreSQL + RLS)
- next-themes (dark/light)

### 0.2 Instalaciones clave
```bash
npm install @dnd-kit/core @dnd-kit/sortable
npm install swr sonner recharts date-fns xlsx jspdf jspdf-autotable
npm install zod react-hook-form @hookform/resolvers
```

### 0.3 Documentacion creada
| Archivo | Proposito |
|---------|-----------|
| `docs/ROADMAP_VISUAL.md` | Tracking de sprints visual |
| `docs/TESTING_ROADMAP.md` | Plan de testing exhaustivo |
| `CLAUDE.md` | Reglas de trabajo para el agente |
| `DESIGN_SYSTEM.md` | Sistema de diseno "Command Center Noir" |

### ✅ Checkpoint Fase 0
- [x] Build pasa sin errores
- [x] Estructura de carpetas definida
- [x] Supabase conectado
- [x] shadcn/ui instalado

---

## FASE 1: AUTH Y SEGURIDAD (Completada)

### 1.1 Supabase SSR Upgrade (CRITICO)
**Problema**: Login no funcionaba. `@supabase/ssr` v0.1.0 guardaba sesion en localStorage en vez de cookies.

**Solucion**:
- Upgrade a `@supabase/ssr` v0.10.2
- Crear `src/middleware.ts` (refresh de sesiones)
- Reescribir `src/lib/supabase/client.ts` (patron cookie `getAll`/`setAll`)
- Reescribir `src/lib/supabase/server.ts` (patron cookie `getAll`/`setAll`)
- Fix post-login cookie sync en `login/page.tsx`

### 1.2 Archivos creados/modificados
| Archivo | Accion | Detalle |
|---------|--------|---------|
| `src/middleware.ts` | Creado | Refresh de sesiones + redirecciones auth |
| `src/lib/supabase/client.ts` | Reescrito | Browser client con cookies v0.10.2 |
| `src/lib/supabase/server.ts` | Reescrito | Async createClient() con cookies |
| `src/lib/supabase/middleware.ts` | Creado | updateSession() helper |
| `src/app/(auth)/login/page.tsx` | Modificado | window.location.href post-login |
| `src/app/(dashboard)/layout.tsx` | Modificado | Auth protection + await createClient() |

### ✅ Checkpoint Fase 1
- [x] Login funcional (email + password)
- [x] Registro funcional
- [x] Logout funcional
- [x] Persistencia de sesion (cookies)
- [x] RLS activo en todas las tablas
- [x] Build: 0 errores

### 🧪 Testing Fase 1
```bash
# Testear auth flow completo:
1. Registro → toast exito → redirect /login
2. Login → redirect /dashboard
3. Cerrar tab → reabrir /dashboard → sigue autenticado
4. Logout → redirect /login
5. Acceder /dashboard sin auth → redirect /login
6. curl /api/products sin cookie → 401
```

---

## FASE 2: DASHBOARD PROFESIONAL (Completada)

### 2.1 KPIs con deltas y tendencias
- 6 KPI cards: Revenue mes, ROI ponderado, Unidades mes, Margen neto, Alertas stock, Valor inventario
- Deltas: mes actual vs mes anterior (porcentaje y direccion)
- Onboarding checklist (3 pasos + progress bar) cuando no hay productos

### 2.2 Graficos
- **SalesChart**: Toggle 30 dias / 12 semanas (AreaChart con Revenue + Units)
- **CategoryChart**: Pie chart de distribucion por categoria (profit)
- **ProfitBarChart**: Top 10 productos por beneficio
- **RevenueTrendChart**: Line chart Revenue + Profit (ultimos 30 dias)

### 2.3 Tablas
- Top 5 productos por rentabilidad (con badges ROI: Excelente/OK/Revisar)
- Panel de alertas de inventario (stock bajo, sin stock, sobrestock)
- Export Excel del resumen

### 2.4 Archivos creados/modificados
| Archivo | Accion | Detalle |
|---------|--------|---------|
| `src/app/(dashboard)/dashboard/page.tsx` | Reescrito | KPIs, charts, alertas, onboarding |
| `src/app/api/dashboard/route.ts` | Reescrito | Deltas, weighted ROI, charts data |
| `src/components/charts/sales-chart.tsx` | Modificado | Toggle 30d/12w |
| `src/components/charts/category-chart.tsx` | Creado | Pie chart |
| `src/components/charts/profit-bar-chart.tsx` | Creado | Bar chart horizontal |
| `src/components/charts/revenue-trend-chart.tsx` | Creado | Line chart |
| `src/components/ui/kpi-card.tsx` | Modificado | `customTrend` prop |
| `src/components/onboarding-checklist.tsx` | Creado | 3 pasos + progress bar |

### ✅ Checkpoint Fase 2
- [x] Dashboard carga con datos
- [x] Onboarding aparece cuando no hay productos
- [x] Charts renderizan correctamente
- [x] KPIs muestran deltas correctos
- [x] Export funciona
- [x] Build: 0 errores

### 🧪 Testing Fase 2
```bash
# Testear dashboard:
1. Usuario nuevo → onboarding visible, KPIs = 0
2. Con productos + ventas → KPIs > 0, deltas calculados
3. Toggle 30d/12w → chart cambia
4. Click top producto → navega a /products/[id]
5. Click alerta stock → navega al producto
6. Export resumen → descarga Excel valido
7. Mobile: charts se ven bien (no overflow)
```

---

## FASE 3: PRODUCTOS (Completada)

### 3.1 Lista de productos
- Tabla desktop + cards mobile
- Busqueda por nombre/SKU/ASIN
- Filtros: estado, categoria (dinamica), marketplace, rango precio, rango ROI
- Sort: 12 opciones
- Paginacion: 10 items/pagina
- Export Excel
- Boton "Nuevo Producto" (modal)

### 3.2 Crear producto
- Formulario completo: SKU, ASIN, nombre, categoria, estado, marketplace
- Costos: unit_cost, shipping, prep, taxes
- Precios: sale_price, referral_fee, FBA_fee, storage, other_fees
- Notas, imagen, stock minimo
- Vinculacion con proveedor (select + MOQ + lead time)
- Precarga defaults FBA desde settings

### 3.3 Detalle de producto
- KPIs: precio venta, costo, ROI, margen
- Desglose de costos (compra, FBA, referral, envio, storage)
- Inventario: stock actual, minimo, estado, peso, dimensiones
- Proveedores vinculados (con link a supplier)
- Botones: Editar, Eliminar (AlertDialog confirmacion)

### 3.4 Editar producto
- Modal Dialog (pre-populado)
- Mismo formulario que creacion
- Manejo de proveedor: cambiar, desvincular, actualizar datos

### 3.5 Archivos creados/modificados
| Archivo | Accion | Detalle |
|---------|--------|---------|
| `src/app/(dashboard)/products/page.tsx` | Reescrito | Lista con filtros, sort, paginacion |
| `src/app/(dashboard)/products/new/page.tsx` | Reescrito | Formulario creacion |
| `src/app/(dashboard)/products/[id]/page.tsx` | Modificado | Detalle con KPIs, desglose, proveedores |
| `src/app/(dashboard)/products/[id]/edit/page.tsx` | Reescrito | Modal edicion (TS moderno) |
| `src/components/product-form-modal.tsx` | Modificado | Modal creacion/edición |
| `src/app/api/products/route.ts` | Modificado | GET con paginacion, POST con validacion |
| `src/app/api/products/[id]/route.ts` | Reescrito | GET enriquecido, PUT, DELETE |
| `src/app/api/products/[id]/suppliers/route.ts` | Creado | Vinculacion proveedor-producto |
| `src/components/ui/empty-state.tsx` | Creado | Componente reutilizable |

### ✅ Checkpoint Fase 3
- [x] Crear producto funciona
- [x] Ver detalle funciona
- [x] Editar funciona
- [x] Eliminar con confirmacion funciona
- [x] Filtros y sort funcionan
- [x] Paginacion funciona
- [x] Export funciona
- [x] Mobile cards funcionan
- [x] Build: 0 errores

### 🧪 Testing Fase 3
```bash
# Testear productos:
1. Crear producto con todos los campos → aparece en lista
2. Crear sin SKU → error "SKU es requerido"
3. Vincular proveedor al crear → aparece en detalle
4. Editar precio → se actualiza en detalle
5. Eliminar → desaparece de lista, redirect a /products
6. Buscar por SKU → filtra correcto
7. Filtrar por "Activo" + "Electronics" → solo coincidencias
8. Ordenar por ROI descendente → primer item mayor ROI
9. Exportar → Excel con datos correctos
10. Mobile: ver cards en vez de tabla
```

---

## FASE 4: PROVEEDORES (Completada)

### 4.1 Directorio de proveedores
- Tabla desktop + cards mobile
- Busqueda por nombre/contacto/pais
- Filtros: estado, pais (dinamico), rating, MOQ, lead time
- Sort: 10 opciones
- Paginacion: 10 items/pagina
- Export Excel
- Boton "Nuevo Proveedor" (modal)
- Link externo a Alibaba

### 4.2 Detalle de proveedor (tabs)
- **Info**: rating estrellas, pais, MOQ, lead time, terminos de pago, contacto (email mailto, WhatsApp wa.me), notas
- **Cotizaciones**: tabla con producto, cantidad, precio unit, total, envio, estado. Boton "Nueva cotizacion" (modal inline)
- **Productos**: productos vinculados con costo, MOQ, lead time, badge "Principal"
- **Pedidos**: placeholder (proximamente)

### 4.3 Comparador de proveedores
- Selector multiple (max 4 proveedores)
- Input cantidad a importar
- Calcula: mejor quote, costo producto, envio, total
- KPI cards comparativas
- Tabla detallada: precio unit, costo, envio, total, MOQ, lead time, rating
- Badge "Recomendacion" al mejor costo total

### 4.4 Archivos creados/modificados
| Archivo | Accion | Detalle |
|---------|--------|---------|
| `src/app/(dashboard)/suppliers/page.tsx` | Reescrito | Lista con filtros, sort, paginacion |
| `src/app/(dashboard)/suppliers/[id]/page.tsx` | Modificado | Detalle con 4 tabs |
| `src/app/(dashboard)/suppliers/[id]/edit/page.tsx` | Reescrito | Modal edicion (TS moderno) |
| `src/app/(dashboard)/suppliers/compare/page.tsx` | Creado | Comparador 2-4 proveedores |
| `src/components/supplier-form-modal.tsx` | Modificado | Modal creacion/edición |
| `src/app/api/suppliers/route.ts` | Modificado | GET con filtros, POST con validacion |
| `src/app/api/suppliers/[id]/route.ts` | Modificado | GET, PUT, DELETE |
| `src/app/api/suppliers/[id]/quotes/route.ts` | Creado | CRUD cotizaciones |
| `src/app/api/suppliers/[id]/products/route.ts` | Creado | JOIN product_suppliers |

### ✅ Checkpoint Fase 4
- [x] Crear proveedor funciona
- [x] Ver detalle con tabs funciona
- [x] Agregar cotizacion funciona
- [x] Comparador funciona (2-4 proveedores)
- [x] Recomendacion automatica funciona
- [x] Export funciona
- [x] Build: 0 errores

### 🧪 Testing Fase 4
```bash
# Testear proveedores:
1. Crear proveedor (China, rating 4) → aparece en lista
2. Ver detalle → tabs Info/Cotizaciones/Productos/Pedidos
3. Agregar cotizacion (producto, qty, precio) → aparece en tab
4. Comparar 2 proveedores con cantidad 100 → tabla comparativa
5. Verificar badge "Recomendado" en proveedor mas barato
6. Click link Alibaba → abre en nueva pestaña
7. Click WhatsApp → abre wa.me/...
8. Editar proveedor → cambiar rating → guardar
9. Eliminar proveedor → confirmar → desaparece
10. Mobile: cards visibles, tabs scroll horizontal
```

---

## FASE 5: INVENTARIO (Completada)

### 5.1 Control de stock
- KPIs: total unidades, stock bajo, sin stock, sobrestock
- Tabla desktop + cards mobile
- Busqueda por SKU/nombre
- Filtros: estado de stock, rango de unidades disponibles
- Sort: 8 opciones (incluyendo dias de stock)
- Paginacion: 10 items/pagina
- Export Excel

### 5.2 Proyecciones de stock
- **Dias de stock**: calculado desde `products_with_inventory.days_of_stock`
- **Fecha stockout**: calculada en cliente (hoy + dias de stock)
- Indicadores visuales:
  - <= 0 dias: "Sin stock" (rojo)
  - 1-14 dias: "critico" (naranja)
  - 15-30 dias: "bajo" (amarillo)
  - >30 dias: normal (verde)

### 5.3 Archivos creados/modificados
| Archivo | Accion | Detalle |
|---------|--------|---------|
| `src/app/(dashboard)/inventory/page.tsx` | Reescrito | Lista con proyecciones, filtros, paginacion |
| `src/app/api/inventory/route.ts` | Reescrito | GET con search, stockStatus, paginacion |
| `src/components/ui/status-badge.tsx` | Modificado | Variantes por estado de stock |

### ✅ Checkpoint Fase 5
- [x] Inventario lista correctamente
- [x] Dias de stock calculados
- [x] Fecha stockout calculada
- [x] Filtros por estado funcionan
- [x] Paginacion funciona
- [x] Export funciona
- [x] Build: 0 errores

### 🧪 Testing Fase 5
```bash
# Testear inventario:
1. Ver producto con stock=0 → badge "Sin stock" rojo
2. Ver producto con stock=2, minStock=10 → badge "Stock Bajo" naranja
3. Ver producto con stock=50, ventas rapidas → dias de stock < 30
4. Fecha stockout = hoy + dias de stock
5. Filtrar "Stock Bajo" → solo productos en riesgo
6. Ordenar por "Dias stock menor a mayor" → primero los mas criticos
7. Exportar → Excel con proyecciones
8. Mobile: cards con proyecciones visibles
```

---

## FASE 6: VENTAS (Completada)

### 6.1 Historial de ventas
- KPIs: revenue total, profit total, unidades, fees Amazon
- Chart de tendencia revenue/profit (ultimos 30 dias) — **Dynamic import**
- Filtros: rango de fechas, revenue, profit
- Sort: 8 opciones
- Tabla desktop + cards mobile
- Export Excel

### 6.2 Registrar venta (modal)
- Select de producto (dinamico desde /api/products)
- Fecha (default hoy)
- Unidades vendidas
- Revenue total
- Amazon Fees
- Order ID (opcional)
- **Auto-calculo**: al seleccionar producto + unidades, sugiere revenue y fees
- Preview de estimacion (revenue, costo+fees, profit) con color

### 6.3 Import CSV
- FileReader cliente
- Preview basico: cuenta filas, valida headers (date, sku, units)
- Toast: "Preview: X filas detectadas. Importacion manual proximamente"

### 6.4 Reporte PDF
- Dynamic import de jsPDF + jspdf-autotable
- Resumen: periodo, revenue total, profit total, unidades, fees
- Tabla: Fecha, Producto, Unidades, Revenue, Fees, Profit (max 50 filas)
- Descarga automatica

### 6.5 Archivos creados/modificados
| Archivo | Accion | Detalle |
|---------|--------|---------|
| `src/app/(dashboard)/sales/page.tsx` | **Reescrito completo** | TS moderno, dynamic imports, tipado |
| `src/components/sale-form-modal.tsx` | **Reescrito completo** | TS moderno, auto-calculo, preview |
| `src/app/api/sales/route.ts` | **Reescrito completo** | GET enriquecido, POST validado, sin any |
| `src/components/charts/revenue-trend-chart.tsx` | Creado | AreaChart revenue + profit |

### ✅ Checkpoint Fase 6
- [x] Registrar venta funciona
- [x] Auto-calculo sugiere revenue/fees
- [x] Import CSV preview funciona
- [x] Reporte PDF genera correctamente
- [x] Export Excel funciona
- [x] Chart renderiza (dynamic import)
- [x] **Bundle: 149kB → 12kB** (-92%)
- [x] Build: 0 errores

### 🧪 Testing Fase 6
```bash
# Testear ventas:
1. Registrar venta: producto $20 × 2 units → revenue=$40, fees sugeridos
2. Cambiar unidades → revenue y fees se actualizan
3. Guardar → aparece en lista con profit calculado
4. Filtrar por fecha: desde 2026-01-01 hasta hoy → solo ventas en rango
5. Filtrar por revenue min=$100 → solo ventas > $100
6. Import CSV: subir archivo valido → toast "X filas detectadas"
7. Reporte PDF: click boton → descarga PDF con resumen + tabla
8. Export Excel: datos filtrados exportados
9. Mobile: cards visibles
10. Verificar que API enriquece cost y profit correctamente
```

---

## FASE 7: PURCHASE ORDERS (Completada)

### 7.1 Lista de ordenes
- KPIs: ordenes activas, valor total, en transito, proxima llegada
- Busqueda por PO/proveedor/producto
- Filtro por estado (9 estados del flow)
- Tabla desktop + **cards mobile** (nuevo en esta fase)
- Timeline visual de progreso (mini dots conectados)
- Click en fila → /orders/[id]
- Boton "Nueva Orden" (modal) — **ANTES estaba disabled**

### 7.2 Modal Nueva Orden
- Proveedor (select dinamico)
- Producto (select dinamico)
- Numero PO
- Cantidad
- Costo unitario
- Moneda (USD/EUR/CNY)
- Metodo de envio (aire/maritimo/express)
- Fecha orden
- Llegada estimada
- Notas
- Calcula total_cost = qty * cost en cliente

### 7.3 Detalle de orden
- Timeline visual completo (progress bar)
- Info General: producto, SKU, cantidad, costos
- Envio y Logistica: metodo, tracking, forwarder, aduana, prep center, Amazon shipment ID
- Fechas: orden, deadline produccion, embarque, llegada estimada, llegada real
- Costo Landed: producto + envio + aduana + prep
- Pagos: deposito + balance, fechas, total pagado, pendiente
- Notas

### 7.4 Archivos creados/modificados
| Archivo | Accion | Detalle |
|---------|--------|---------|
| `src/app/(dashboard)/orders/page.tsx` | **Reescrito** | KPIs, filtros, timeline, cards mobile, paginacion |
| `src/app/(dashboard)/orders/[id]/page.tsx` | Modificado | Timeline, info, envio, fechas, costos, pagos |
| `src/components/order-form-modal.tsx` | **Creado** | Modal creacion orden |
| `src/app/api/orders/route.ts` | Existente | GET, POST con Zod |
| `src/app/api/orders/[id]/route.ts` | Existente | GET, PUT, DELETE |

### ✅ Checkpoint Fase 7
- [x] Crear orden funciona (ANTES no habia boton)
- [x] Ver detalle con timeline funciona
- [x] Mobile cards funcionan (ANTES solo habia tabla)
- [x] Paginacion funciona
- [x] Filtro por estado funciona
- [x] Build: 0 errores

### 🧪 Testing Fase 7
```bash
# Testear ordenes:
1. Nueva Orden: proveedor China, producto X, qty=100, cost=$5 → total=$500
2. Guardar → aparece en lista con status "Borrador"
3. Ver detalle → timeline visible, primer dot activo
4. Ver Info General: producto, SKU, cantidad correctos
5. Ver Costo Landed: suma correcta
6. Ver Pagos: deposito + balance = total
7. Filtrar "En Transito" → solo esas ordenes
8. Buscar por numero PO → filtra correcto
9. Mobile: cards con timeline mini visible
10. Paginacion: crear 11 ordenes → 2 paginas
```

---

## FASE 8: RESEARCH DE PRODUCTOS (Completada)

### 8.1 Pipeline de research
- Toggle vista Kanban / Lista
- Kanban: 6 columnas (Idea, Validando, Aprobado, En Progreso, Lanzado, Rechazado)
- Tarjetas con: nombre, nicho, priority badge P1-P5, ROI estimado, precio estimado
- Cambio de estado rapido desde select en card
- Lista: tabla con producto, categoria, precio est, ROI est, estado, prioridad
- Busqueda por nombre/nicho/ASIN
- Filtro por estado

### 8.2 Modal create/edit
- ~15 campos: nombre, nicho, ASIN, categoria, sales estimadas, precio promedio, reviews, rating, BSR, competencia, COGS, precio venta, ROI, notas, fuente, prioridad, estado
- Crear: POST /api/research
- Editar: PUT /api/research?id=...
- Eliminar: DELETE /api/research?id=...

### 8.3 Archivos creados/modificados
| Archivo | Accion | Detalle |
|---------|--------|---------|
| `src/app/(dashboard)/research/page.tsx` | Existente | Kanban + Lista + modal |
| `src/app/api/research/route.ts` | Existente | GET, POST, PUT, DELETE |

### ✅ Checkpoint Fase 8
- [x] Crear idea funciona
- [x] Cambiar estado funciona
- [x] Editar funciona
- [x] Eliminar funciona
- [x] Toggle Kanban/Lista funciona
- [x] Build: 0 errores

### 🧪 Testing Fase 8
```bash
# Testear research:
1. Crear idea "Kitchen Gadget" → aparece en columna "Idea"
2. Cambiar estado a "Aprobado" → se mueve a columna
3. Editar: cambiar ROI estimado a 50% → guardar
4. Toggle a Lista → ver tabla con datos
5. Filtrar por "Validando" → solo esos
6. Buscar "Gadget" → muestra el producto
7. Eliminar → desaparece
8. Mobile: Kanban scroll horizontal, Lista con cards
```

---

## FASE 9: CALCULADORA FBA (Completada)

### 9.1 Calculadora interactiva
- Config colapsable: ROI objetivo, categoria (determina referral fee %), metodo de envio
- Inputs: precio venta, costo, cantidad, peso, flete/kg, prep, fotos, PPC, otros
- Display digital estilo "terminal": ganancia neta, ROI, margen, landed cost, break-even, TACOS
- Ticket de costos desglosado con barras de proporcion por color
- Escenarios: Pesimista (-15% precio, -40% vol), Realista, Optimista (+15% precio, +40% vol)
- Guardar analisis → POST /api/calculator/save

### 9.2 Archivos creados/modificados
| Archivo | Accion | Detalle |
|---------|--------|---------|
| `src/app/(dashboard)/calculator/page.tsx` | Existente | Calculadora completa |
| `src/app/api/calculator/route.ts` | Existente | POST con calculos |
| `src/app/api/calculator/save/route.ts` | Existente | Guardar analisis |

### ✅ Checkpoint Fase 9
- [x] Calculos correctos
- [x] Escenarios P/R/O funcionan
- [x] Guardar analisis funciona
- [x] Build: 0 errores

### 🧪 Testing Fase 9
```bash
# Testear calculadora:
1. Precio=$30, Costo=$8, Peso=1kg, Electronics
   → Verificar: FBA fee, referral 15%, landed cost, ROI, margin
2. Cambiar a categoria Home → referral fee cambia a 12%
3. Escenario Pesimista: precio=$25.5, vol=-40%
4. Escenario Optimista: precio=$34.5, vol=+40%
5. TACOS con PPC=$500, revenue=$5000 → 10%
6. Guardar analisis → toast exito
7. Break-even: ajustar hasta profit=0
8. Verificar con spreadsheet externo
```

---

## FASE 10: SETTINGS E IMPORT (Completadas)

### 10.1 Configuracion
- Tabs: Profile, FBA Defaults, Calculations, Data
- Profile: nombre, empresa, pais
- FBA Defaults: marketplace (10 opciones), tarifa FBA, referral fee, envio, almacenamiento
- Calculations: ROI objetivo, moneda (7 opciones), tasa impositiva
- Data: Exportar CSV de products/suppliers/inventory/sales
- Importar datos (link a /import)
- Notificaciones (status visual)

### 10.2 Importacion masiva
- Descargar plantilla Excel
- Drop zone drag & drop (xlsx, csv, tsv, max 5MB, max 500 filas)
- Preview: resumen, mapeo de columnas, tabla preview
- Filtros: Todas/Validas/Errores
- Importar solo validas (batches de 50)

### 10.3 Archivos creados/modificados
| Archivo | Accion | Detalle |
|---------|--------|---------|
| `src/app/(dashboard)/settings/page.tsx` | Modificado | Fix placeholders _LC |
| `src/app/(dashboard)/import/page.tsx` | Existente | Import completo |
| `src/app/api/settings/route.ts` | Modificado | Sin any |
| `src/app/api/import/route.ts` | Modificado | Sin any |
| `src/app/api/import/template/route.ts` | Modificado | Sin any |

### ✅ Checkpoint Fase 10
- [x] Settings guarda correctamente
- [x] Export desde settings funciona
- [x] Import preview funciona
- [x] Import real funciona
- [x] Template descarga correcto
- [x] Build: 0 errores

### 🧪 Testing Fase 10
```bash
# Testear settings:
1. Cambiar marketplace a Mexico → guardar → persistir
2. Cambiar defaults FBA → crear producto → valores precargados
3. Exportar productos desde Data tab → CSV correcto
4. Ir a importar → navega a /import

# Testear import:
1. Descargar template → archivo Excel con headers correctos
2. Llenar 3 productos validos → subir → preview muestra 3 validas
3. Llenar 1 producto sin SKU → subir → preview muestra 1 error
4. Subir >5MB → error "Maximo 5MB"
5. Subir 501 filas → error "Maximo 500 filas"
6. Importar validas → toast "X productos importados"
7. Verificar en /products que aparecen
```

---

## FASE 11: UI/UX POLISH (Completada)

### 11.1 Componentes globales
- `PageHeader`: badge, titulo, subtitulo, breadcrumbs, action slot
- `KpiCard`: label, value, icono, accent color, trend, animation delay
- `DataTableWrapper`: contenedor con titulo, icono, acciones
- `StatusBadge`: pill con dot + texto, variants success/warning/danger/info/neutral
- `EmptyState`: icono, titulo, subtitulo, accion CTA
- `PaginationControl`: paginas, total items, items per page
- `PageSkeleton`: shimmer loaders
- `FilterPanel`: select, range, dateRange, sort
- `ExportButton`: export estandarizado

### 11.2 Layout
- Sidebar (desktop): 8 items, active state, user card, logout
- MobileBottomNav (mobile): 8 items, badge en inventario, safe area
- TopHeader (desktop): GlobalSearch, NotificationBell, ThemeToggle, UserDropdown
- ThemeToggle: dark/light

### 11.3 Search global
- Shortcut Ctrl/Cmd + K
- Fetch paralelo: products, suppliers, orders, research
- Navegacion keyboard: ↑↓, Enter, Escape
- Resultados limitados a 5 por tipo

### 11.4 Notificaciones
- Generadas dinamicamente desde `products_with_inventory`
- Tipos: sin stock (critical), stock bajo (warning), sobrestock (info), margen bajo (warning)
- Badge en campana (unread count)
- Badge en mobile bottom nav
- Dismiss individual o "Leer todas"

### 11.5 Archivos creados/modificados
| Archivo | Accion | Detalle |
|---------|--------|---------|
| `src/components/ui/page-header.tsx` | Creado | Header de pagina |
| `src/components/ui/kpi-card.tsx` | Creado | Tarjeta KPI |
| `src/components/ui/data-table-wrapper.tsx` | Creado | Wrapper tabla |
| `src/components/ui/status-badge.tsx` | Creado | Badge de estado |
| `src/components/ui/empty-state.tsx` | Creado | Estado vacio |
| `src/components/ui/pagination-control.tsx` | Creado | Paginacion |
| `src/components/ui/page-skeleton.tsx` | Creado | Skeleton loaders |
| `src/components/ui/filter-panel.tsx` | Modificado | Tipado Record<string,string> |
| `src/components/global-search.tsx` | Modificado | Tipado inline, useCallback fix |
| `src/components/sidebar.tsx` | Modificado | Links Research + Orders |
| `src/components/mobile-bottom-nav.tsx` | Modificado | Links Research + Orders |
| `src/components/notification-bell.tsx` | Creado | Notificaciones dinamicas |

### ✅ Checkpoint Fase 11
- [x] Todos los componentes UI renderizan correctamente
- [x] Dark/light mode funciona
- [x] Responsive funciona (mobile/desktop)
- [x] Global search funciona
- [x] Notificaciones funcionan
- [x] Build: 0 errores

### 🧪 Testing Fase 11
```bash
# Testear UI/UX:
1. Theme toggle: click sol/luna → tema cambia → recargar → persiste
2. Global search: Ctrl+K → buscar producto → Enter → navega
3. Global search: Escape → cierra
4. Notificaciones: crear producto sin stock → badge rojo en campana
5. Notificaciones: click en notificacion → navega a producto
6. Breadcrumbs: navegar a producto → breadcrumb muestra "Productos > Nombre"
7. Empty state: ir a /orders sin ordenes → EmptyState visible
8. Paginacion: ir a /products con 11+ items → pagina 2 funciona
9. Mobile: 375px → bottom nav visible, sidebar oculto, cards en vez de tablas
10. Mobile: bottom nav badge cuando hay alertas de stock
```

---

## FASE 12: LIMPIEZA DE CODIGO Y TYPESCRIPT (Completada)

### 12.1 Eliminacion de `var` → `const`/`let`
**Archivos refactorizados**:
- `sales/page.tsx` — 60+ variables
- `products/[id]/edit/page.tsx` — 40+ variables
- `suppliers/[id]/edit/page.tsx` — 30+ variables
- `sale-form-modal.tsx` — 30+ variables

### 12.2 Eliminacion de `any` → tipos propios
**Frontend (tsx)**:
- `hooks/use-data.ts` — `as { data?: Sale[] }` en vez de `as any`
- `lib/export.ts` — `unknown[]` en vez de `any[]`
- `components/global-search.tsx` — interfaces inline
- `components/ui/filter-panel.tsx` — `Record<string, string>`
- `products/page.tsx` — `Record<string, string>`
- `suppliers/page.tsx` — `Record<string, string>`
- `research/page.tsx` — `as ProductResearch["status"]`
- `import/page.tsx` — `Record<string, string | number | undefined>`
- `suppliers/[id]/page.tsx` — `as string` en vez de `as any`
- `components/charts/*` — 4 CustomTooltip tipados con interfaces

**APIs (ts)**:
- `api/products/[id]/route.ts` — `Record<string, unknown>`, `catch (err)` con `instanceof`
- `api/sales/route.ts` — `Record<string, unknown>`, tipado de product join
- `api/dashboard/route.ts` — `catch (err)` con `instanceof`
- `api/import/route.ts` — `Record<string, unknown>[]`
- `api/settings/route.ts` — `Record<string, unknown>`
- `api/calculator/route.ts` — formateado
- `api/inventory/route.ts` — formateado (era 1 linea)
- `api/export/route.ts` — formateado (era 1 linea)
- `api/inventory/movements/route.ts` — formateado (era 1 linea)
- `api/import/template/route.ts` — `catch (err)` con `instanceof`

### 12.3 Formateo de APIs minificadas
- `api/inventory/route.ts` — 1 linea → formateado legible
- `api/export/route.ts` — 1 linea → formateado legible
- `api/calculator/route.ts` — 1 linea → formateado legible
- `api/inventory/movements/route.ts` — 1 linea → formateado legible

### 12.4 Fix de dependencias de hooks
- `orders/[id]/page.tsx` — `fetchOrder` movido dentro de `useEffect`
- `components/global-search.tsx` — `handleSelect` en `useCallback`
- `products/new/page.tsx` — `fetchDefaults`/`fetchSuppliers` dentro de `useEffect`

### 12.5 Error boundary
- `app/(dashboard)/error.tsx` — corregido a variables CSS semanticas (`text-foreground`, `bg-muted`, etc.)

### ✅ Checkpoint Fase 12
- [x] 0 `var` en todo `src/`
- [x] 0 `any` en todo `src/`
- [x] 0 APIs minificadas
- [x] 0 warnings de hooks
- [x] Error boundary con variables semanticas
- [x] Build: 0 errores, 0 warnings
- [x] Tests: 19/19 pasan

### 🧪 Testing Fase 12 (Verificacion tecnica)
```bash
# Verificar calidad de codigo:
1. grep "var [a-zA-Z]" src/**/*.ts src/**/*.tsx → 0 resultados
2. grep "\bany\b" src/**/*.ts src/**/*.tsx → 0 resultados
3. npm run build → 0 errores, 0 warnings
4. npm test → 19/19 pasan
5. Revisar que no hay console.log en produccion
6. Revisar que no hay debugger statements
```

---

## FASE 13: OPTIMIZACION DE PERFORMANCE (Completada)

### 13.1 Dynamic imports
- `/sales`: jsPDF + jspdf-autotable + RevenueTrendChart cargan bajo demanda
- `/dashboard`: charts pesados cargan con lazy loading

### 13.2 Resultados de bundle
| Ruta | Antes | Despues | Mejora |
|------|-------|---------|--------|
| /sales | 149 kB | 12 kB | **-92%** |
| /dashboard | ~200 kB | 117 kB | ~40% |

### ✅ Checkpoint Fase 13
- [x] Dynamic imports funcionan
- [x] Bundle reducido significativamente
- [x] No hay errores en carga lazy
- [x] Build: 0 errores

### 🧪 Testing Fase 13
```bash
# Testear performance:
1. Ir a /sales → Network tab → jsPDF NO carga inicialmente
2. Click "Reporte PDF" → jsPDF carga bajo demanda
3. Lighthouse en /dashboard → Performance > 90
4. Tablas con 50+ filas: scroll fluido, filtros < 100ms
```

---

## FASE 14: ACCESIBILIDAD BASICA (Completada)

### 14.1 Aria-labels en busquedas
- `/products` — `aria-label="Buscar productos"`
- `/suppliers` — `aria-label="Buscar proveedores"`
- `/inventory` — `aria-label="Buscar inventario"`
- `/orders` — `aria-label="Buscar ordenes"`
- `/research` — `aria-label="Buscar research"`

### ✅ Checkpoint Fase 14
- [x] Aria-labels en inputs de busqueda
- [x] Build: 0 errores

### 🧪 Testing Fase 14
```bash
# Testear accesibilidad basica:
1. Navegar con solo Tab → todos los elementos interactivos son focuseables
2. Screen reader (NVDA/VoiceOver) → anuncia "Buscar productos" en input
3. Contraste: verificar que textos son legibles en dark mode
```

---

## RESUMEN EJECUTIVO: QUE SE HIZO Y DONDE

### Archivos creados (nuevos)
| Archivo | Fase | Descripcion |
|---------|------|-------------|
| `src/middleware.ts` | Fase 1 | Auth refresh y redirecciones |
| `src/lib/supabase/middleware.ts` | Fase 1 | updateSession helper |
| `src/components/onboarding-checklist.tsx` | Fase 2 | Checklist 3 pasos |
| `src/components/charts/category-chart.tsx` | Fase 2 | Pie chart categorias |
| `src/components/charts/profit-bar-chart.tsx` | Fase 2 | Bar chart top 10 |
| `src/components/charts/revenue-trend-chart.tsx` | Fase 2/6 | Line chart revenue+profit |
| `src/components/ui/empty-state.tsx` | Fase 3 | Componente estado vacio |
| `src/components/ui/kpi-card.tsx` | Fase 2 | Tarjeta KPI con trend |
| `src/components/ui/page-header.tsx` | Fase 2 | Header con breadcrumbs |
| `src/components/ui/page-skeleton.tsx` | Fase 2 | Shimmer loaders |
| `src/components/ui/pagination-control.tsx` | Fase 2 | Paginacion |
| `src/components/ui/status-badge.tsx` | Fase 3 | Badge de estado |
| `src/components/ui/data-table-wrapper.tsx` | Fase 2 | Wrapper tabla |
| `src/components/ui/filter-panel.tsx` | Fase 3 | Panel de filtros |
| `src/components/global-search.tsx` | Fase 11 | Busqueda global ⌘K |
| `src/components/notification-bell.tsx` | Fase 11 | Notificaciones dinamicas |
| `src/components/order-form-modal.tsx` | Fase 7 | Modal creacion orden |
| `src/app/api/suppliers/[id]/quotes/route.ts` | Fase 4 | CRUD cotizaciones |
| `src/app/api/suppliers/[id]/products/route.ts` | Fase 4 | JOIN product_suppliers |
| `src/app/api/products/[id]/suppliers/route.ts` | Fase 3 | Vinculacion proveedor |
| `src/app/api/calculator/save/route.ts` | Fase 9 | Guardar analisis |
| `src/app/api/orders/route.ts` | Fase 7 | GET, POST ordenes |
| `src/app/api/orders/[id]/route.ts` | Fase 7 | GET, PUT, DELETE orden |
| `src/app/api/research/route.ts` | Fase 8 | GET, POST, PUT, DELETE |
| `docs/ROADMAP_VISUAL.md` | Fase 0 | Tracking de sprints |
| `docs/TESTING_ROADMAP.md` | Fase 0 | Plan de testing |

### Archivos reescritos completamente
| Archivo | Fase | Motivo |
|---------|------|--------|
| `src/app/(dashboard)/sales/page.tsx` | Fase 6 | ES5 → TS moderno, dynamic imports |
| `src/components/sale-form-modal.tsx` | Fase 6 | ES5 → TS moderno |
| `src/app/(dashboard)/products/[id]/edit/page.tsx` | Fase 12 | var → const, tipado |
| `src/app/(dashboard)/suppliers/[id]/edit/page.tsx` | Fase 12 | var → const, tipado |
| `src/app/api/sales/route.ts` | Fase 12 | var + any → const + tipos |
| `src/app/api/products/[id]/route.ts` | Fase 12 | var + any → const + tipos |
| `src/app/api/dashboard/route.ts` | Fase 12 | any → tipado |
| `src/app/api/import/route.ts` | Fase 12 | any → tipado |
| `src/app/api/settings/route.ts` | Fase 12 | any → tipado |
| `src/app/api/products/route.ts` | Fase 12 | any → tipado |
| `src/app/api/inventory/route.ts` | Fase 12 | Minificado → formateado |
| `src/app/api/export/route.ts` | Fase 12 | Minificado → formateado |
| `src/app/api/calculator/route.ts` | Fase 12 | Minificado → formateado |
| `src/app/api/inventory/movements/route.ts` | Fase 12 | Minificado → formateado |
| `src/lib/supabase/client.ts` | Fase 1 | v0.1.0 → v0.10.2 |
| `src/lib/supabase/server.ts` | Fase 1 | v0.1.0 → v0.10.2 |

---

## FASE 15: TESTS UNITARIOS ADICIONALES (Completada)

### 15.1 Tests creados
| Archivo | Tests | Cobertura |
|---------|-------|-----------|
| `src/lib/calculations.test.ts` | 12 | calcRefFee, calcFBAFee (edge cases), calcMetrics |
| `src/lib/utils.test.ts` | 24 | cn, fmt, fmtPct, roiColor, profitColor, stockColor |
| `src/lib/fetcher.test.ts` | 4 | fetcher con mock de fetch |
| `src/lib/export.test.ts` | 6 | exportToExcelPro + helpers con mocks XLSX/DOM |
| `src/validations/schemas.test.ts` | 30 | product, supplier, stockMovement, sale, order, research |

### 15.2 Refactors para testabilidad
- `orderSchema` extraido de `api/orders/route.ts` → `src/validations/order.ts`
- `researchSchema` extraido de `api/research/route.ts` → `src/validations/research.ts`
- API routes actualizadas para importar desde `validations/`

### ✅ Checkpoint Fase 15
- [x] 76/76 tests pasan
- [x] 0 errores, 0 warnings en build
- [x] 0 `var`, 0 `any`

---

## FASE 16: TESTS DE INTEGRACION APIs (Completada)

### 16.1 Approach
En vez de MSW (más útil para frontend), se usó `vi.mock()` sobre `@/lib/supabase/server` para testear los handlers de App Router directamente inyectando un mock de Supabase client.

### 16.2 Tests creados
| Archivo | Tests | Cobertura |
|---------|-------|-----------|
| `src/app/api/products/route.test.ts` | 8 | GET (paginacion, filtros, 401, 500), POST (crear, 400, 401, DB error) |
| `src/app/api/orders/route.test.ts` | 6 | GET (listar, 401, 500), POST (crear, 400, 401) |

### 16.3 Verificaciones incluidas
- [x] Auth 401 cuando no hay usuario
- [x] Filtrado por query params funciona
- [x] Validacion Zod rechaza datos invalidos (400)
- [x] Errores de base de datos retornan 500/400
- [x] Datos validos crean registros (201)

### ✅ Checkpoint Fase 16
- [x] 90/90 tests pasan
- [x] 0 errores, 0 warnings en build

---

## FASE 17: TESTS E2E CON PLAYWRIGHT (Completada — Base)

### 17.1 Instalacion y config
- Playwright + Chromium instalados
- `playwright.config.ts` con Desktop Chrome y Mobile Chrome (Pixel 5)
- Web server auto-start en `npm run dev`
- Scripts: `npm run e2e`, `npm run e2e:ui`

### 17.2 Tests E2E creados
| Archivo | Tests | Cobertura |
|---------|-------|-----------|
| `e2e/auth.spec.ts` | 5 | Login render, Register render, Redirect dashboard sin auth, Redirect products sin auth |
| `e2e/navigation.spec.ts` | 3 | Meta/title, Responsive mobile layout, 404 page |

### 17.3 Nota sobre flujos autenticados
Tests de CRUD con auth requieren setup de usuario de prueba en Supabase (service role key + cleanup). Recomendado para siguiente iteracion si se necesita cobertura completa de flujos autenticados.

### ✅ Checkpoint Fase 17
- [x] Playwright instalado y configurado
- [x] Tests E2E base pasan (auth pages + navigation)
- [x] Responsive testing configurado (desktop + mobile)
- [x] 0 errores, 0 warnings en build

---

## FASE 18: PERFORMANCE Y LIGHTHOUSE (Completada)

### 18.1 Code splitting adicional
| Pagina | Antes | Despues | Mejora |
|--------|-------|---------|--------|
| /dashboard (bundle) | 117 kB | 8.48 kB | -93% |
| /dashboard (First Load JS) | 331 kB | 223 kB | -33% |

- SalesChart, CategoryChart, ProfitBarChart → dynamic imports con ChartSkeleton fallback
- Recharts ya no bloquea el bundle inicial del dashboard

### 18.2 Loading states
- `loading.tsx` agregado a 5 rutas principales:
  - `/products`, `/orders`, `/inventory`, `/suppliers`, `/sales`
- Mejora la percepcion de velocidad durante navegacion

### 18.3 Audicion estatica
- ✅ No hay `<img>` raw (sin next/image)
- ✅ Fuentes usan `next/font/google` con `display: "swap"`
- ✅ `sales` page ya tenia dynamic import para jsPDF + Recharts
- ✅ Bundle compartido: 87.9 kB (razonable)

### ✅ Checkpoint Fase 18
- [x] Dashboard bundle reducido 93%
- [x] Loading states en rutas principales
- [x] 0 errores, 0 warnings en build
- [x] 90/90 tests pasan

---

## FASE 19: ACCESIBILIDAD AVANZADA (Completada)

### 19.1 Skip links
- Link "Saltar al contenido principal" en `layout.tsx` (sr-only, visible al focus)
- `<main id="main-content">` como destino

### 19.2 Navegacion accesible
- `aria-current="page"` en links activos de sidebar y mobile nav
- `aria-label` en botones de solo icono (settings, logout, theme toggle)
- `aria-pressed` en toggle de tema

### 19.3 Modales
- Radix Dialog / AlertDialog ya manejan focus trap y aria attributes
- `aria-describedby` y `aria-labelledby` presentes en componentes shadcn

### ✅ Checkpoint Fase 19
- [x] Skip link funcional
- [x] Estados ARIA en navegacion
- [x] Labels en botones icono
- [x] 0 errores, 0 warnings en build

---

## FASE 20: DOCUMENTACION TECNICA (Completada)

### 20.1 Archivos actualizados/creados
| Archivo | Estado |
|---------|--------|
| `README.md` | Actualizado con stack completo, funcionalidades, testing, performance, accesibilidad |
| `CHANGELOG.md` | Creado con historial v1.0.0 → v2.0.0 |
| `docs/ROADMAP_COMPLETO.md` | Documento maestro de 20 fases (este archivo) |
| `docs/ROADMAP_VISUAL.md` | Tracking de sprints |
| `CLAUDE.md` | Reglas de trabajo para agentes |

### ✅ Checkpoint Fase 20
- [x] README completo y actualizado
- [x] CHANGELOG con versiones y cambios
- [x] Documentacion interna del proyecto al dia

---

## CHECKLIST FINAL DE VERIFICACION

```bash
# Ejecutar antes de cada deploy:
[ ] npm run build          # 0 errores, 0 warnings
[ ] npm run test:run       # 90/90 pasan (actualmente)
[ ] npm run e2e            # Playwright smoke tests
[ ] grep "var [a-zA-Z]" src/**/*.ts src/**/*.tsx  # 0 resultados
[ ] grep "\bany\b" src/**/*.ts src/**/*.tsx       # 0 resultados
[ ] grep "console.log" src/**/*.ts src/**/*.tsx    # 0 en produccion
[ ] Lighthouse > 90        # Performance
[ ] Responsive test        # Mobile + Desktop
[ ] Auth flow              # Login → Dashboard → Logout
[ ] CRUD test              # Crear, Leer, Editar, Eliminar
[ ] Export test            # Excel descarga correcto
[ ] Import test            # Preview + import funcionan
```

---

**Documento creado**: Abril 2026
**Ultima actualizacion**: Fases 19 y 20 completadas
**Estado**: 20/20 fases completadas
**Build**: 0 errores, 0 warnings
**Tests**: 90/90 pasan + E2E base
**Proxima fase recomendada**: Ninguna — Roadmap completo
