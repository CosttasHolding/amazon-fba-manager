# MODULES.md - Guia de Modulos y Logica de Negocio

> Cada modulo representa una funcionalidad de negocio. Este archivo explica QUE hace cada uno, QUE datos maneja, POR QUE existe, y COMO se relaciona con otros modulos.

---

## 1. Dashboard (/dashboard)

### Que hace:
Pagina principal con vista consolidada del negocio. KPIs clave, graficos de tendencias, productos top, y alertas de stock.

### Datos que maneja:
- KPIs: Revenue total, unidades vendidas, ROI ponderado, margen promedio (con deltas vs mes anterior)
- Graficos: Ventas diarias (30 dias), ventas semanales (12 semanas), distribucion por categoria, top 10 productos por profit
- Alertas: Productos sin stock, stock bajo, overstock
- Top Products: Los 5 productos con mayor revenue

### Por que existe:
El usuario necesita ver el pulse del negocio en un vistazo. Sin esto, tendria que revisar cada modulo individualmente.

### Relaciones:
- Lee de: products, inventory, sales (via vista products_with_inventory)
- Api endpoint: GET /api/dashboard
- Hook: useDashboard() (refresh cada 120s)
- Charts: SalesChart, CategoryChart, ProfitBarChart (Recharts)

### Patron especial:
- Unico modulo con auto-refresh (SWR refreshInterval: 120000ms)
- Los KPIs muestran deltas comparando mes actual vs anterior
- ROI es ponderado (promedio pesado por revenue, no promedio simple)

---

## 2. Products (/products)

### Que hace:
Catalogo completo de productos. CRUD con busqueda, filtros, paginacion, ordenamiento, exportacion a Excel, y vista detalle con breakdown de costos.

### Datos que maneja:
- Core: SKU, ASIN, nombre, categoria, marketplace, status
- Costos: unit_cost, shipping_cost, prep_cost, taxes
- Precios: sale_price, referral_fee, fba_fee, storage_fee_monthly, other_fees
- Calculados (generated): total_cost, total_fees, net_profit, roi
- Inventario (via vista): stock_available, stock_inbound, stock_reserved, stock_warehouse, reorder_point, max_stock, stock_status, sales_velocity_30d, days_of_stock

### Por que existe:
El producto es la unidad central de todo el negocio FBA. Todo lo demas (ventas, inventario, proveedores, envios) gira alrededor del producto.

### Relaciones:
- Padre de: inventory, sales, stock_movements, purchase_orders, product_suppliers, returns, reimbursements, fba_shipments, ppc_campaigns, expenses, saved_calculations, reorder_rules
- Api endpoints: GET/POST /api/products, GET/PUT/DELETE /api/products/[id], GET /api/products/summary, GET/POST/DELETE /api/products/[id]/suppliers
- Hook: useProductsQuery(params), useProductSummary()
- Components: product-form-modal.tsx, fee-calculator-inline.tsx
- Validation: productSchema (name required max 255, category enum, marketplace enum, costs min 0)

### Sub-rutas:
- /products: Lista con KPIs, busqueda, filtros, paginacion
- /products/new: Formulario de creacion con calculator inline
- /products/[id]: Vista detalle con cost breakdown, suppliers vinculados, comments
- /products/[id]/edit: Formulario de edicion

### Patron especial:
- Las 4 columnas de costos (total_cost, total_fees, net_profit, roi) son GENERATED ALWAYS en PostgreSQL
- La vista products_with_inventory evita N+1 queries al hacer JOIN con inventory y sales
- El SKU es opcional pero unico por usuario (UNIQUE(user_id, sku))

---

## 3. Inventory (/inventory)

### Que hace:
Gestion de niveles de stock. Muestra stock disponible, inbound, reserved, y warehouse. Permite registrar movimientos de stock que actualizan automaticamente los niveles.

### Datos que maneja:
- Stock levels: stock_available, stock_inbound, stock_reserved, stock_warehouse
- Config: reorder_point (default 10), max_stock (default 500)
- Computed: stock_status (normal/low_stock/out_of_stock/overstock), days_of_stock
- Movements: movement_type (8 tipos), quantity, previous_stock, new_stock

### Por que existe:
El inventario es la columna vertebral de FBA. Sin control de stock, el vendedor pierde ventas (out of stock) o gasta en almacenamiento innecesario (overstock).

### Relaciones:
- 1:1 con products (auto-creada por trigger)
- Padre de: stock_movements
- Api endpoints: GET /api/inventory, GET /api/inventory/summary, GET/POST /api/inventory/movements
- Hook: useInventoryQuery(params), useInventorySummary()
- Validation: stockMovementSchema (productId, movementType enum, quantity int non-zero)

### Movimientos de stock:
- inbound_shipment: stock_inbound +, stock_warehouse - (Enviar mercancia a FBA)
- received_at_amazon: stock_available +, stock_inbound - (Amazon recibe el envio)
- sale: stock_available - (Venta realizada)
- return: stock_available + (Devolucion de cliente)
- removal: stock_available -, stock_warehouse + (Retirar de FBA a bodega)
- adjustment: stock_available +quantity (Correccion de inventario)
- damaged: stock_available - (Producto danado)
- transfer_to_warehouse: stock_warehouse + (Mover a bodega)

Importante: Los movimientos se procesan via TRIGGER en PostgreSQL (update_inventory_from_movement()), NO se hace UPDATE directo a inventory.

---

## 4. Sales (/sales)

### Que hace:
Registro de ventas. Permite agregar ventas manualmente, importar desde CSV, exportar a Excel/PDF, y ver graficos de tendencia.

### Datos que maneja:
- Core: product_id, sale_date, units_sold, revenue, amazon_fees, order_id
- Computed: net_revenue (GENERATED: revenue - amazon_fees)
- Profit calculado en GET: net_profit = revenue - amazon_fees - (units_sold * product.unit_cost)
- Source: manual, import, api (indica origen del registro)

### Por que existe:
Las ventas son la metrica de exito #1. Sin tracking de ventas, no se puede calcular ROI, no se pueden hacer forecasts, y no se puede saber si el negocio es rentable.

### Relaciones:
- Hijo de: products
- Api endpoints: GET/POST /api/sales, GET /api/sales/summary, POST /api/sales/import
- Hook: useSalesQuery(params), useSalesSummary()
- Components: sale-form-modal.tsx, SalesChart
- Validation: saleSchema (productId uuid required, saleDate date required, unitsSold int min 1)

### Patron especial:
- El profit se calcula en el endpoint GET, no stored
- La venta NO crea automaticamente el stock movement

---

## 5. Suppliers (/suppliers)

### Que hace:
Directorio de proveedores. CRUD con calificaciones (rating 1-5), cotizaciones, vinculacion a productos, y comparacion side-by-side.

### Datos que maneja:
- Core: name, country, city
- Contacto: contact_name, contact_email, contact_whatsapp, alibaba_url
- Comercial: rating, reliability_score, payment_terms, min_order_qty, lead_time_days, currency
- Relaciones: product_suppliers (muchos a muchos), supplier_quotes

### Por que existe:
Amazon FBA depende de proveedores (generalmente chinos). Tener un directorio organizado con ratings y cotizaciones permite tomar mejores decisiones de compra.

### Relaciones:
- Padre de: product_suppliers, supplier_quotes, purchase_orders, reorder_rules
- Many-to-many con products via product_suppliers
- Api endpoints: GET/POST /api/suppliers, GET/PUT/DELETE /api/suppliers/[id], GET/POST /api/suppliers/[id]/quotes, GET/POST /api/suppliers/[id]/products
- Components: supplier-form-modal.tsx
- Validation: supplierSchema (name required max 200, rating 1-5)

### Sub-rutas:
- /suppliers: Directorio con ratings y filtros
- /suppliers/new: Formulario de creacion
- /suppliers/[id]: Detalle con tabs (info, quotes, products)
- /suppliers/[id]/edit: Formulario de edicion
- /suppliers/compare: Comparacion side-by-side (hasta 4)

---

## 6. Orders (/orders)

### Que hace:
Gestion de ordenes de compra (PO). Tracking del ciclo de vida completo desde draft hasta delivered, con pagos, tracking, y costos de aduanas.

### Datos que maneja:
- Core: po_number (auto-generado), supplier_id, product_id, quantity, unit_cost
- Computed: total_cost (GENERATED: quantity * unit_cost)
- Financial: currency, exchange_rate, shipping_cost, customs_cost, prep_center_cost
- Payment: payment_deposit, payment_balance, payment_deposit_date, payment_balance_date
- Logistics: shipping_method, tracking_number, forwarder_name, amazon_shipment_id
- Status: draft, sent, confirmed, in_production, shipped, in_transit, customs, delivered, cancelled
- Dates: order_date, production_deadline, ship_date, estimated_arrival, actual_arrival

### Por que existe:
Las POs son el pipeline de suministro. Sin POs no se puede trackear cuando llegaran los productos, cuanto se ha pagado, y en que estado esta la produccion.

### Relaciones:
- Hijo de: products, suppliers
- Padre de: fba_shipments
- Api endpoints: GET/POST /api/orders, GET/PUT/DELETE /api/orders/[id]
- Components: order-form-modal.tsx
- Validation: orderSchema (quantity positive int, unit_cost positive, status enum 9 estados)

---

## 7. Research (/research)

### Que hace:
Pipeline de investigacion de nuevos productos. Kanban con 6 columnas (idea, validating, approved, rejected, in_progress, launched). Permite evaluar potencial de productos antes de comprometer capital.

### Datos que maneja:
- Core: name, niche, amazon_category, asin_reference
- Metrics: estimated_monthly_sales, average_price, review_count, average_rating, bsr
- Financial: estimated_cogs, estimated_selling_price, estimated_roi
- Strategy: competition_level, differentiation_notes, keywords[], priority (1-5), source
- Status: idea, validating, approved, rejected, in_progress, launched

### Por que existe:
Investigar productos ANTES de comprar es la diferencia entre ganar y perder dinero. Este modulo estructura el proceso de decision.

### Relaciones:
- Hijo de: Ninguno (entidad independiente)
- Post-approval se crea en products
- Api endpoints: GET/POST/PUT/DELETE /api/research
- Validation: researchSchema (name required, competition_level enum, priority 1-5, keywords array)

### Patron especial:
- Kanban con drag and drop nativo (HTML5 Drag and Drop API)
- Toggle entre vista Kanban y vista de lista
- Inline form con react-hook-form + zod

---

## 8. Calculator (/calculator)

### Que hace:
Calculadora de fees de FBA. Estimacion de profit, ROI, y margin basada en precio, peso, y costos. Soporta escenarios P/R/O (Pessimistic/Realistic/Optimistic).

### Datos que maneja:
- Input: sale_price, unit_cost, shipping_cost, prep_cost, taxes, weight_kg, ppc_budget
- Calculated (client-side): fba_fee, referral_fee, net_profit, roi, margin, total_cost
- Scenarios: Pessimistic (-20%), Realistic (base), Optimistic (+20%)
- Saved calculations: Guardados en saved_calculations table

### Por que existe:
Antes de comprar un producto, el vendedor necesita saber cuanto ganara. Esta calculadora responde esa pregunta en segundos.

### Relaciones:
- Lee de: products (para pre-llenar datos), lib/calculations.ts (calculos)
- Guarda en: saved_calculations
- Api endpoints: POST /api/calculator, POST /api/calculator/save
- Lib: lib/calculations.ts con calcRefFee(), calcFBAFee(), calcMetrics() [INMUTABLE]

### Patron especial:
- 100% client-side (no hace fetch a API para calcular)
- Los calculos usan lib/calculations.ts que es INMUTABLE
- calcFBAFee usa tiers de peso (lb): less than 1lb=$3.22, 1-2lb=$4.75, 2-3lb=$5.40, more than 3lb=$5.40+overage

---

## 9. Forecasting (/forecasting)

### Que hace:
Sugerencias de reorden basadas en velocity de ventas, lead time del proveedor, y safety stock. Calcula cuando reordenar y cuanto.

### Datos que maneja:
- Input: products_with_inventory (stock levels + sales velocity), reorder_rules (lead_time, safety_stock)
- Output: product_id, suggested_qty, urgency (critical/warning/info), reason

### Por que existe:
Sin forecasting, el vendedor reacciona tarde (ya se quedo sin stock) o demasiado pronto (atacapital en inventario). El forecasting optimiza el timing de reorden.

### Relaciones:
- Lee de: products, inventory, sales (via vista), reorder_rules
- Api endpoint: GET /api/forecasting
- Lib: lib/forecasting.ts con getForecastSuggestions()

### Logica:
- velocity_30d = SUM(units_sold) / 30 (ultimos 30 dias)
- days_until_stockout = stock_available / velocity_30d
- lead_time = reorder_rule.lead_time_days (default 30)
- safety_days = reorder_rule.safety_stock_days (default 14)
- Si days_until_stockout menor o igual lead_time + safety_days -> CRITICAL
- Si days_until_stockout menor o igual lead_time + safety_days * 2 -> WARNING
- Sino -> INFO (suggestion)

---

## 10. Ads/PPC (/ads)

### Que hace:
Gestion de campanas PPC (Pay Per Click) de Amazon. CRUD de campanas con tracking de metricas diarias (impressions, clicks, spend, sales, ACOS, ROAS).

### Datos que maneja:
- Core: campaign_name, campaign_id (Amazon), product_id, marketplace
- Types: sp_auto, sp_manual_keyword, sp_manual_product, sb (Sponsored Brands), sd (Sponsored Display)
- Financial: daily_budget
- Status: enabled, paused, archived
- Daily metrics: impressions, clicks, spend, sales, orders, units
- Computed: acos (spend/sales*100), roas (sales/spend), ctr (clicks/impressions), cpc (spend/clicks)

### Por que existe:
PPC es la forma mas comun de generar trafico en Amazon. Sin tracking de campanas, el vendedor no sabe si esta ganando o perdiendo dinero en advertising.

### Relaciones:
- Hijo de: products
- Tabla padre: ppc_campaigns -> ppc_daily_metrics
- Api endpoints: GET/POST/PUT/DELETE /api/ppc-campaigns
- Validation: campaignSchema (campaign_name required, campaign_type enum, daily_budget min 0)

### Patron especial:
- Las metricas diarias tienen 4 columnas GENERATED (acos, roas, ctr, cpc)
- UNIQUE(campaign_id, metric_date) previene duplicados
- Los datos de metrics actualmente son manual (futuro: sync desde Amazon Ads API)

---

## 11. Finances (/finances)

### Que hace:
Tracking de gastos operativos y pagos de Amazon. Vista de cash flow con categorias de gasto, impacto en ganancias, y pagos recibidos.

### Datos que maneja:
- Expenses: category (11 tipos), description, amount, currency, exchange_rate, expense_date, vendor, recurring
- Computed: amount_usd (GENERATED: amount/exchange_rate)
- Categories: ppc, software, va_services, samples, photography, shipping_forwarder, customs, prep_center, storage_3pl, travel, other
- Payouts: payout_period_start/end, amount, currency, status (pending/transferred/failed), amazon_reference

### Por que existe:
El profit neto no es solo revenue minus product cost. Hay gastos operativos (PPC, software, shipping, etc.) que reducen la ganancia real. Este modulo los trackea.

### Relaciones:
- Expense puede estar vinculado a un product (opcional)
- Api endpoints: GET/POST/PUT/DELETE /api/expenses, GET/POST /api/amazon-payouts
- Validation: expenseSchema (category enum 11 tipos, description required, amount positive), payoutSchema

### Sub-rutas:
- /finances: Tabs de Expenses y Payouts con KPIs

---

## 12. Returns (/returns)

### Que hace:
Devoluciones de clientes y reembolsos de Amazon. Tracking del ciclo de vida de cada devolucion desde requested hasta disposed, y gestion de casos de reembolso.

### Datos que maneja:
- Returns: product_id, quantity, return_reason (16 razones), refund_amount, status (8 estados), disposition (sellable/unsellable/pending)
- Reimbursements: amazon_case_id, reimbursement_type (7 tipos), quantity, amount, status (5 estados)

### Por que existe:
Las devoluciones son un costo real en FBA. Trackearlas permite identificar problemas de calidad, recuperar dinero via reembolsos, y entender el impacto en profit.

### Relaciones:
- Hijo de: products
- Reimbursements pueden estar vinculados a un return
- Api endpoints: GET/POST/PUT/DELETE /api/returns, GET/POST/PUT/DELETE /api/reimbursements
- Validation: returnSchema (16 return_reason types), reimbursementSchema (7 types)

### Sub-rutas:
- /returns: Tabs de Returns y Reimbursements con forms inline

---

## 13. Shipments (/shipments)

### Que hace:
Envios inbound a FBA. Tracking de cada shipment con carrier, tracking, box count, weight, cost, y status (working -> closed).

### Datos que maneja:
- Core: shipment_name, shipment_id, amazon_reference_id, destination_fulfillment_center
- Status: working, ready_to_ship, shipped, in_transit, delivered, checked_in, receiving, closed, cancelled
- Shipping: shipping_method (small_parcel, ltl, ftl, air, sea), carrier, tracking_number
- Quantities: box_count, total_units, total_weight_kg, shipping_cost
- Items: fba_shipment_items (product_id, quantity, quantity_received, msKU, fnSKU)

### Por que existe:
Enviar mercancia a FBA es un proceso logistico complejo. Este modulo trackea cada envio desde que se prepara hasta que Amazon lo recibe y checkea.

### Relaciones:
- Hijo de: purchase_orders (po_id)
- Padre de: fba_shipment_items (1 a muchos)
- Api endpoints: GET/POST /api/fba-shipments, GET/PUT/DELETE /api/fba-shipments/[id]
- Validation: fbaShipmentSchema (shipment_name required, status 9 estados, shipping_method 5 tipos)

### Patron especial:
- Stepper form para creacion (multi-step wizard)
- Items se agregan despues de crear el shipment
- Status timeline visual en la vista de detalle

---

## 14. Settings (/settings)

### Que hace:
Configuracion de usuario. Perfil, defaults de FBA, configuracion de CSV, tiers de fees, exportacion de datos, idioma, y toggle de push notifications.

### Datos que maneja:
- Profile: full_name, company, country
- FBA Defaults: default_marketplace, default_fba_fee, default_referral_fee, default_shipping_cost, default_storage_cost
- Financial: target_roi, currency, tax_rate
- System: language (es/en/ar), theme
- Integrations: drive_refresh_token, push subscriptions

### Por que existe:
Cada usuario tiene configuracion personalizada (marketplace, idioma, defaults de costos). Settings permite personalizar la experiencia sinhardcodear valores.

### Relaciones:
- 1:1 con user (user_settings table)
- Api endpoints: GET/PUT /api/settings
- Validation: settingsUpdateSchema (language es/en/ar, referral_fee max 100, tax_rate max 100)

### Sub-rutas:
- /settings: Tabs (Profile, FBA, Calculations, Data)

---

## 15. Import (/import)

### Que hace:
Importacion masiva de datos via CSV. Multi-step workflow: upload, preview con validacion, field mapping, batch insert.

### Datos que maneja:
- Input: Archivo CSV (max 5MB, max 1000 rows)
- Supported entities: products, sales
- Validation: Zod schemas por entidad
- Output: imported count, errors array

### Por que existe:
Los vendedores tienen datos en spreadsheets. Importar manualmente uno por uno es inviable. La importacion CSV masiva ahorra horas de trabajo.

### Relaciones:
- Usa los mismos endpoints que CRUD normal (/api/products, /api/sales/import)
- Validation: Usa los mismos schemas (productSchema, saleSchema)

### Patron especial:
- Multi-step: Upload -> Preview -> Map -> Insert
- Preview muestra validacion en tiempo real (que filas son validas, cuales tienen errores)
- Field mapping permite mapear columnas CSV a campos del schema

---

## 16. Analytics (/analytics)

### Que hace:
Analisis avanzado con comparacion de periodos, proyecciones de revenue, heatmap de rentabilidad por SKU, y generador de reportes.

### Datos que maneja:
- Comparison: Periodo actual vs anterior (revenue, units, profit, ROI)
- Proyecciones: Linear regression sobre ventas historicas
- Heatmap: ROI y profit por SKU (vista de card y matrix)
- Reports: Templates (profitability, inventory, sales-summary, roi-ranking)

### Por que existe:
El dashboard muestra el estado actual. Analytics muestra TENDENCIAS y permite comparar periodos para tomar decisiones estrategicas.

### Relaciones:
- Lee de: products_with_inventory, sales, expenses
- Api endpoint: GET /api/analytics/comparison
- Charts: ComparisonChart, RevenueProjection, ProfitabilityHeatmap, ReportGenerator

### Sub-rutas:
- /analytics: Tabs (Heatmap, Comparison, Projections, Reports)

---

## 17. Alerts (/alerts)

### Que hace:
Sistema de automatizacion de alertas. Reglas configurables que monitorean condiciones y disparan notificaciones via in-app, email, o ambos.

### Datos que maneja:
- Rules: entity (inventory/sales/profitability/price/ppc), condition_type (8 tipos), threshold, time_window, comparison, channel
- History: titulo, mensaje, severity (critical/warning/info), read status
- Schedules: Templates de reportes programados (daily/weekly/monthly)
- Reorder rules: product-level config para auto-reorder

### Por que existe:
Un vendedor no puede revisar todo manualmente. Las alertas automatically detectan problemas criticos (out of stock, low margin, ppc overbudget) y notifican.

### Relaciones:
- Monitorea: products, inventory, sales, ppc_campaigns
- Api endpoints: GET/POST/PUT/DELETE /api/alerts/rules, GET /api/alerts/history
- Cron: GET /api/cron/alerts (evalua reglas periodicamente)
- Email: lib/email.ts (envia alertas via Resend)

### Sub-rutas:
- /alerts: Tabs (Rules, History, Schedules, Auto-Reorder)

---

## 18. Team (/team)

### Que hace:
Dashboard unificado de gobernanza. Combina Members (LLC socios), Tasks (Kanban), y Board Decisions en una sola vista con tabs.

### Datos que maneja:
- Members: full_name, email, ownership_pct, status (active/deceased/retired), role, executor_name/email
- Tasks: title, description, status (pending/in_progress/completed), priority (low/medium/high/urgent), assigned_to, due_date, module
- Board Decisions: title, doc_reference, description, decision_date, voted_by, status (draft/approved/rejected/executed)

### Por que existe:
Para LLCs y equipos, la gobernanza es critica. Quienes son socios, que tareas estan pendientes, y que decisiones se han tomado debe estar documentado.

### Relaciones:
- Members es padre de: tasks (via assigned_to FK)
- Api endpoints: CRUD en /api/members, /api/tasks, /api/board-decisions
- Hooks: useMembers(), useTasks(), useBoardDecisions(), useGovernanceSummary()
- Validation: memberSchema, taskSchema, boardDecisionSchema (3 schemas en member.ts)

### Sub-rutas:
- /team: Tabs unificadas (Overview, Members, Tasks)
- /members, /tasks, /board-decisions: CRUD individual

---

## 19. Drive (/drive)

### Que hace:
Navegador de Google Drive integrado. Permite subir, descargar, renombrar, eliminar archivos, y hacer backups de la data de la app.

### Datos que maneja:
- Files: id, name, mimeType, size, modifiedTime, webViewLink
- Backup types: products, sales, orders, inventory, suppliers

### Por que existe:
Backup externo es esencial para datos criticos de negocio. Google Drive es la opcion mas accesible para usuarios no tecnicos.

### Relaciones:
- Exporta data de: products, sales, orders, inventory, suppliers
- Api endpoints: GET /api/drive/auth, GET /api/drive/list, POST /api/drive/upload, GET/DELETE /api/drive/download/[id], POST /api/drive/backup
- Auth: OAuth2 obligatorio por usuario; sin refresh token, Drive queda desconectado
- Components: drive-browser.tsx, drive-toolbar.tsx, drive-file-list.tsx, drive-upload-dialog.tsx, drive-text-editor.tsx, drive-image-viewer.tsx, drive-backup.tsx

---

## 20. SP-API (/sp-api)

### Que hace:
Integracion con Amazon Selling Partner API. OAuth connection, sync de datos reales (productos, ordenes, inventario, fees, returns, payouts), y webhook subscriptions para eventos en tiempo real.

### Datos que maneja:
- Connections: marketplace, seller_id, refresh_token, access_token, status
- Sync types: products, orders, inventory, fees, returns, payouts
- Webhooks: 8 tipos de notificacion (ORDER_STATUS_CHANGED, INVENTORY_EVENT, etc.)
- Logs: payload, status, processing_time_ms

### Por que existe:
La data manual tiene limites. SP-API permite sync automatico desde Amazon, eliminando entrada manual y manteniendo datos actualizados.

### Relaciones:
- Lee de: Amazon SP-API endpoints
- Escribe en: products, sales, inventory, returns (via sync)
- Api endpoints: POST /api/sp-api/auth, GET /api/sp-api/auth/callback, GET /api/sp-api/connections, POST /api/sp-api/sync, POST /api/sp-api/webhooks
- Lib: lib/sp-api/ (client, auth, endpoints, notifications, types)

### Patron especial:
- OAuth flow: genera URL -> usuario autoriza -> callback exchange code -> store tokens
- Sync: crea reporte en Amazon -> espera procesamiento -> descarga documento -> parse -> upsert
- Webhooks: Amazon envia POST -> parse notification -> procesar segun tipo

---

## 21. Members (/members)

### Que hace:
CRUD de miembros LLC (Limited Liability Company). Informacion de socios incluyendo porcentaje de propiedad, ejecutor designado, y estado.

### Datos que maneja:
- Core: full_name, email, ownership_pct (0-100%), status (active/deceased/retired)
- Role: admin, editor, viewer (para permisos en la app)
- Executor: executor_name, executor_email (para planificacion sucesoria)

### Por que existe:
Para negocios LLC, documentar la estructura de propiedad y designar ejecutores es legalmente importante. Este modulo centraliza esa informacion.

### Relaciones:
- Tabla: members
- Api endpoints: GET/POST /api/members, GET/PUT/DELETE /api/members/[id]
- Components: member-form-modal.tsx, member-detail-modal.tsx
- Validation: memberSchema (full_name required, ownership_pct 0-100)

---

## 22. Tasks (/tasks)

### Que hace:
Kanban board de tareas con drag and drop. Tres columnas: pending, in_progress, completed. Tareas pueden asignarse a miembros y vincularse a modulos.

### Datos que maneja:
- Core: title, description, status, priority (low/medium/high/urgent)
- Relations: assigned_to (member), module (nombre del modulo), related_to (JSONB con entidad)
- Dates: due_date, completed_at

### Por que existe:
Gestionar tareas operativas (reordenar stock, actualizar listings, revisar campanas) requiere un sistema simple pero efectivo.

### Relaciones:
- assigned_to FK -> members(id)
- Tabla: tasks
- Api endpoints: GET/POST /api/tasks, GET/PUT/DELETE /api/tasks/[id]
- Validation: taskSchema (title required, priority enum, status enum)

### Patron especial:
- HTML5 Drag and Drop API para mover tarjetas entre columnas
- Inline form para crear tareas rapidamente

---

## Mapa de Relaciones entre Modulos

```
                    products
                   /    |    \        \        \          \
            inventory sales suppliers orders  returns  shipments
               |        |      |        |        |         |
          stock_movements |  product_suppliers  |    fba_shipment_items
                         |      |               |
                    purchase_orders        reimbursements
                         |
                    fba_shipments

            suppliers --> supplier_quotes
            suppliers --> product_suppliers

            products --> ppc_campaigns --> ppc_daily_metrics
            products --> expenses
            products --> saved_calculations
            products --> reorder_rules --> alert_rules
            products --> product_research (independiente)

            members --> tasks
            members --> board_decisions

            organizations --> org_members
            organizations --> org_invitations
```

---

## Archivos Relacionados

| Tema | Ver |
|------|-----|
| Arquitectura general | ARCHITECTURE.md |
| Esquema de tablas | DATABASE.md |
| Endpoints API | API.md |
| Componentes UI | UI-PATTERNS.md |
| Convenciones | CONVENTIONS.md |
