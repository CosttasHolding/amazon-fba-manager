# DATABASE.md - Esquema Completo de Base de Datos

> Base de datos: **Supabase (PostgreSQL)** multi-tenant. Todas las tablas core tienen `org_id`. La fuente de verdad del esquema es `supabase/migrations/`; este índice documenta las tablas existentes.

---

## 1. Índice de Tablas

| # | Tabla | Categoría | Propósito |
|---|-------|-----------|-----------|
| 1 | `profiles` | Auth | Perfiles de usuario (auto-creados al registrarse) |
| 2 | `organizations` | Multi-tenant | Organizaciones |
| 3 | `org_members` | Multi-tenant | Membresías usuario-org |
| 4 | `org_invitations` | Multi-tenant | Invitaciones por email |
| 5 | `products` | Core | Catálogo de productos |
| 6 | `inventory` | Core | Niveles de stock por producto |
| 7 | `stock_movements` | Core | Historial de movimientos de inventario |
| 8 | `sales` | Core | Registro de ventas |
| 9 | `suppliers` | Core | Directorio de proveedores |
| 10 | `product_suppliers` | Core | Relación muchos-a-muchos producto-proveedor |
| 11 | `supplier_quotes` | Core | Cotizaciones de proveedores |
| 12 | `purchase_orders` | Core | Órdenes de compra |
| 13 | `product_research` | Research | Pipeline de investigación de productos |
| 14 | `expenses` | Finances | Gastos operativos |
| 15 | `amazon_payouts` | Finances | Pagos de Amazon |
| 16 | `returns` | Returns | Devoluciones de clientes |
| 17 | `reimbursements` | Returns | Reembolsos de Amazon |
| 18 | `fba_shipments` | Shipments | Envíos inbound a FBA |
| 19 | `fba_shipment_items` | Shipments | Items dentro de envíos |
| 20 | `ppc_campaigns` | Ads | Campañas PPC |
| 21 | `ppc_daily_metrics` | Ads | Métricas diarias de campañas |
| 22 | `saved_calculations` | Calculator | Cálculos de FBA guardados |
| 23 | `sp_api_connections` | SP-API | Conexiones OAuth con Amazon |
| 24 | `sync_logs` | SP-API | Historial de sincronizaciones |
| 25 | `sp_api_webhook_subscriptions` | SP-API | Suscripciones a webhooks |
| 26 | `sp_api_webhook_logs` | SP-API | Log de webhooks recibidos |
| 27 | `members` | Governance | Miembros LLC |
| 28 | `tasks` | Governance | Tareas Kanban |
| 29 | `board_decisions` | Governance | Decisiones de directorio |
| 30 | `company_members` | Legacy | Soporte multi-usuario legacy |
| 31 | `alert_rules` | Automation | Reglas de alertas |
| 32 | `alert_history` | Automation | Historial de alertas disparadas |
| 33 | `scheduled_reports` | Automation | Reportes programados |
| 34 | `reorder_rules` | Automation | Reglas de reorden |
| 35 | `notifications` | Notifications | Notificaciones in-app |
| 36 | `push_subscriptions` | Notifications | Suscripciones Web Push |
| 37 | `shared_links` | Sharing | Links de dashboard compartido |
| 38 | `audit_log` | Collaboration | Registro de auditoría |
| 39 | `comments` | Collaboration | Comentarios en entidades |
| 40 | `user_settings` | Settings | Configuración de usuario |
| 41 | `succession_events` | Governance | Eventos de sucesión (death/transfer/buyout/retirement) |
| 42 | `rate_limits` | Infra | Rate limiting de endpoints |
| 43 | `research_groups` | Research | Grupos de research (item + competidores) |
| 44 | `amazon_settlement_lines` | Finances | Líneas detalladas de liquidaciones de Amazon |

**Vistas:**
- `products_with_inventory` → JOIN de products + inventory + sales aggregation (security_invoker)

---

## 2. Tablas Core - Detalle Completo

### 2.1 `profiles` (auto-creada al registrarse)

| Columna | Tipo | Constraints | Notas |
|---------|------|-------------|-------|
| `id` | UUID | PK, FK → auth.users(id) | Mismo ID que auth user |
| `email` | TEXT | NOT NULL | |
| `full_name` | TEXT | | |
| `role` | TEXT | CHECK('admin','user'), DEFAULT 'user' | Rol legacy |
| `created_at` | TIMESTAMPTZ | DEFAULT now() | |
| `updated_at` | TIMESTAMPTZ | | |

**Trigger:** `on_auth_user_created` → INSERT en profiles al crear user en auth.users

---

### 2.2 `organizations`

| Columna | Tipo | Constraints | Notas |
|---------|------|-------------|-------|
| `id` | UUID | PK, DEFAULT gen_random_uuid() | |
| `name` | TEXT | NOT NULL | |
| `slug` | TEXT | NOT NULL, UNIQUE | Formato: `org-{userId}-default` |
| `owner_id` | UUID | NOT NULL, FK → profiles(id) | |
| `logo_url` | TEXT | | |
| `settings` | JSONB | DEFAULT '{}' | |
| `created_at` | TIMESTAMPTZ | | |
| `updated_at` | TIMESTAMPTZ | | |

**Trigger:** `on_auth_user_created_org` → Auto-crear org al registrarse

---

### 2.3 `org_members`

| Columna | Tipo | Constraints | Notas |
|---------|------|-------------|-------|
| `id` | UUID | PK | |
| `org_id` | UUID | NOT NULL, FK → organizations(id) | |
| `user_id` | UUID | NOT NULL, FK → profiles(id) | |
| `role` | TEXT | DEFAULT 'editor', CHECK('owner','admin','editor','viewer') | |
| `status` | TEXT | DEFAULT 'active', CHECK('pending','active','removed') | |
| `joined_at` | TIMESTAMPTZ | | |

**Constraints:** UNIQUE(org_id, user_id)

---

### 2.4 `org_invitations`

| Columna | Tipo | Constraints | Notas |
|---------|------|-------------|-------|
| `id` | UUID | PK | |
| `org_id` | UUID | NOT NULL, FK → organizations(id) | |
| `email` | TEXT | NOT NULL | |
| `role` | TEXT | DEFAULT 'editor', CHECK('admin','editor','viewer') | |
| `invited_by` | UUID | NOT NULL | |
| `token` | TEXT | NOT NULL, UNIQUE, DEFAULT encode(gen_random_bytes(32),'hex') | Token de invitación |
| `expires_at` | TIMESTAMPTZ | DEFAULT now() + 7 days | Expira en 7 días |
| `status` | TEXT | DEFAULT 'pending', CHECK('pending','accepted','expired','revoked') | |
| `created_at` | TIMESTAMPTZ | | |

---

### 2.5 `products`

| Columna | Tipo | Constraints | Notas |
|---------|------|-------------|-------|
| `id` | UUID | PK, DEFAULT gen_random_uuid() | |
| `user_id` | UUID | NOT NULL, FK → profiles(id) | |
| `org_id` | UUID | FK → organizations(id) | Añadido en migración 024 |
| `sku` | TEXT | NULLABLE | Único por organización |
| `asin` | TEXT | | Amazon Standard Identification Number |
| `name` | TEXT | NOT NULL | |
| `category` | TEXT | | Electronics, Toys, Home, Kitchen, Health, Beauty, Sports, Books, Other |
| `weight_kg` | DECIMAL(10,3) | | Peso en kilogramos |
| `marketplace` | TEXT | DEFAULT 'US', CHECK(US/MX/CA/UK/DE/FR/IT/ES) | |
| `unit_cost` | DECIMAL(10,2) | DEFAULT 0 | Costo unitario |
| `duty_rate` | NUMERIC | DEFAULT 0, NULLABLE, CHECK 0-1 | Tasa de arancel como fracción decimal (0.25 = 25%) |
| `shipping_cost` | DECIMAL(10,2) | DEFAULT 0 | Costo de envío |
| `prep_cost` | DECIMAL(10,2) | DEFAULT 0 | Costo de preparación |
| `taxes` | DECIMAL(10,2) | DEFAULT 0 | Impuestos |
| `sale_price` | DECIMAL(10,2) | DEFAULT 0 | Precio de venta |
| `referral_fee` | DECIMAL(10,2) | DEFAULT 0 | Fee de referral Amazon |
| `fba_fee` | DECIMAL(10,2) | DEFAULT 0 | Fee de FBA |
| `storage_fee_monthly` | DECIMAL(10,2) | DEFAULT 0 | Fee de almacenamiento mensual |
| `other_fees` | DECIMAL(10,2) | DEFAULT 0 | Otros fees |
| `total_cost` | DECIMAL(10,2) | **GENERATED ALWAYS** AS (unit_cost+(unit_cost*COALESCE(duty_rate,0))+shipping_cost+prep_cost+taxes) | Calculado automáticamente |
| `total_fees` | DECIMAL(10,2) | **GENERATED ALWAYS** AS (referral_fee+fba_fee+storage_fee_monthly+other_fees) | Calculado automáticamente |
| `net_profit` | DECIMAL(10,2) | **GENERATED ALWAYS** AS (sale_price-(total_cost)-total_fees) | Calculado automáticamente |
| `roi` | DECIMAL(10,2) | **GENERATED ALWAYS** AS (CASE WHEN total_cost>0 THEN net_profit/total_cost*100 END; total_cost incluye duty) | Calculado automáticamente |
| `status` | TEXT | DEFAULT 'active', CHECK('active','paused','discontinued') | |
| `notes` | TEXT | | |
| `pdf_url` | TEXT | | |
| `created_at` | TIMESTAMPTZ | | |
| `updated_at` | TIMESTAMPTZ | | |

**Constraints:**
- UNIQUE(org_id, sku) → SKU único dentro de una organización
- **4 columnas generadas** → total_cost, total_fees, net_profit, roi se calculan automáticamente

**Trigger:** `trg_auto_inv` → Auto-crear inventory row al crear producto

---

### 2.6 `inventory`

| Columna | Tipo | Constraints | Notas |
|---------|------|-------------|-------|
| `id` | UUID | PK | |
| `product_id` | UUID | NOT NULL, FK → products(id), UNIQUE | 1:1 con products |
| `stock_available` | INT | DEFAULT 0, CHECK >= 0 | Stock disponible en FBA |
| `stock_inbound` | INT | DEFAULT 0, CHECK >= 0 | Stock en camino a FBA |
| `stock_reserved` | INT | DEFAULT 0, CHECK >= 0 | Stock reservado |
| `stock_warehouse` | INT | DEFAULT 0, CHECK >= 0 | Stock en bodega |
| `reorder_point` | INT | DEFAULT 10 | Punto de reorden |
| `max_stock` | INT | DEFAULT 500 | Stock máximo |
| `updated_at` | TIMESTAMPTZ | | |

### 2.7 `stock_movements`

| Columna | Tipo | Constraints | Notas |
|---------|------|-------------|-------|
| `id` | UUID | PK | |
| `product_id` | UUID | NOT NULL, FK → products(id) | |
| `user_id` | UUID | NOT NULL, FK → profiles(id) | |
| `org_id` | UUID | FK → organizations(id) | Migración 024 |
| `movement_type` | TEXT | NOT NULL, CHECK: 8 tipos | Ver tipos abajo |
| `quantity` | INT | NOT NULL | Puede ser negativo para adjustment |
| `previous_stock` | INT | | Auto-set por trigger |
| `new_stock` | INT | | Auto-set por trigger |
| `reference` | TEXT | | Referencia externa (PO number, etc.) |
| `notes` | TEXT | | |
| `created_at` | TIMESTAMPTZ | | |
| `updated_at` | TIMESTAMPTZ | | |

**Movement Types:**
- `inbound_shipment` → stock_inbound +, stock_warehouse -
- `received_at_amazon` → stock_available +, stock_inbound -
- `sale` → stock_available -
- `return` → stock_available +
- `removal` → stock_available -, stock_warehouse +
- `adjustment` → stock_available ±quantity
- `damaged` → stock_available -
- `transfer_to_warehouse` → stock_warehouse +

**Trigger:** `trg_update_inv` (BEFORE INSERT) → Actualiza inventory automáticamente según movement_type

---

### 2.8 `sales`

| Columna | Tipo | Constraints | Notas |
|---------|------|-------------|-------|
| `id` | UUID | PK | |
| `product_id` | UUID | NOT NULL, FK → products(id) | |
| `user_id` | UUID | NOT NULL, FK → profiles(id) | |
| `org_id` | UUID | FK → organizations(id) | Migración 024 |
| `sale_date` | DATE | NOT NULL | |
| `units_sold` | INT | NOT NULL, CHECK > 0 | |
| `revenue` | DECIMAL(10,2) | NOT NULL | |
| `amazon_fees` | DECIMAL(10,2) | DEFAULT 0 | |
| `net_revenue` | DECIMAL(10,2) | **GENERATED ALWAYS** AS (revenue-amazon_fees) | |
| `order_id` | TEXT | | ID de pedido Amazon |
| `source` | TEXT | DEFAULT 'manual', CHECK('manual','import','api') | Origen del registro |
| `created_at` | TIMESTAMPTZ | | |
| `updated_at` | TIMESTAMPTZ | | |

### 2.9 `suppliers`

| Columna | Tipo | Constraints | Notas |
|---------|------|-------------|-------|
| `id` | UUID | PK | |
| `user_id` | UUID | NOT NULL, FK → profiles(id) | |
| `org_id` | UUID | FK → organizations(id) | Migración 024 |
| `name` | TEXT | NOT NULL | |
| `alibaba_url` | TEXT | | URL de Alibaba |
| `contact_name` | TEXT | | |
| `contact_email` | TEXT | | |
| `contact_whatsapp` | TEXT | | |
| `country` | TEXT | DEFAULT 'China' | |
| `city` | TEXT | | |
| `rating` | INTEGER | CHECK 1-5 | |
| `payment_terms` | TEXT | | Ej: "30% deposit, 70% before shipment" |
| `min_order_qty` | INTEGER | | MOQ |
| `lead_time_days` | INTEGER | | Días de producción |
| `currency` | TEXT | DEFAULT 'USD' | |
| `reliability_score` | INTEGER | CHECK 1-5 | |
| `notes` | TEXT | | |
| `last_order_date` | DATE | | |
| `status` | TEXT | DEFAULT 'active', CHECK('active','inactive') | |
| `created_at` | TIMESTAMPTZ | | |
| `updated_at` | TIMESTAMPTZ | | |

### 2.10 `product_suppliers`

| Columna | Tipo | Constraints | Notas |
|---------|------|-------------|-------|
| `id` | UUID | PK | |
| `product_id` | UUID | NOT NULL, FK → products(id) | |
| `supplier_id` | UUID | NOT NULL, FK → suppliers(id) | |
| `user_id` | UUID | NOT NULL, FK → profiles(id) | |
| `org_id` | UUID | FK → organizations(id) | Migración 039 |
| `unit_cost` | DECIMAL(10,4) | | Precio de este proveedor |
| `moq` | INTEGER | | MOQ específico |
| `lead_time_days` | INTEGER | | Lead time específico |
| `is_primary` | BOOLEAN | DEFAULT false | ¿Es el proveedor principal? |
| `notes` | TEXT | | |
| `created_at` | TIMESTAMPTZ | | |

---

### 2.11 `supplier_quotes`

| Columna | Tipo | Constraints | Notas |
|---------|------|-------------|-------|
| `id` | UUID | PK | |
| `supplier_id` | UUID | NOT NULL, FK → suppliers(id) | |
| `product_id` | UUID | FK → products(id) | |
| `user_id` | UUID | NOT NULL | |
| `quantity` | INTEGER | NOT NULL, CHECK > 0 | |
| `unit_price` | DECIMAL(10,4) | NOT NULL | |
| `total_price` | DECIMAL(10,2) | **GENERATED** AS (quantity * unit_price) | |
| `currency` | TEXT | DEFAULT 'USD' | |
| `valid_until` | DATE | | Fecha de expiración de la cotización |
| `shipping_method` | TEXT | CHECK('air','sea','express') | |
| `shipping_cost` | DECIMAL(10,2) | | |
| `notes` | TEXT | | |
| `status` | TEXT | DEFAULT 'pending', CHECK('pending','accepted','rejected','expired') | |
| `created_at` | TIMESTAMPTZ | | |
| `updated_at` | TIMESTAMPTZ | | |

---

### 2.12 `purchase_orders`

| Columna | Tipo | Constraints | Notas |
|---------|------|-------------|-------|
| `id` | UUID | PK | |
| `user_id` | UUID | NOT NULL | |
| `org_id` | UUID | FK → organizations(id) | Migración 024 |
| `supplier_id` | UUID | FK → suppliers(id), ON DELETE SET NULL | |
| `po_number` | TEXT | UNIQUE | Número de PO auto-generado |
| `product_id` | UUID | FK → products(id), ON DELETE SET NULL | |
| `quantity` | INTEGER | NOT NULL, CHECK > 0 | |
| `unit_cost` | DECIMAL(10,4) | NOT NULL | |
| `total_cost` | DECIMAL(10,2) | **GENERATED** AS (quantity * unit_cost) | |
| `currency` | TEXT | DEFAULT 'USD' | |
| `exchange_rate` | DECIMAL(10,4) | DEFAULT 1 | |
| `shipping_method` | TEXT | CHECK('air','sea','express') | |
| `shipping_cost` | DECIMAL(10,2) | | |
| `status` | TEXT | DEFAULT 'draft', CHECK: 9 estados | Ver estados abajo |
| `order_date` | DATE | | |
| `production_deadline` | DATE | | |
| `ship_date` | DATE | | |
| `estimated_arrival` | DATE | | |
| `actual_arrival` | DATE | | |
| `tracking_number` | TEXT | | |
| `forwarder_name` | TEXT | | |
| `customs_cost` | DECIMAL(10,2) | | Costo de aduanas |
| `prep_center_cost` | DECIMAL(10,2) | | Costo de prep center |
| `amazon_shipment_id` | TEXT | | ID de envío en Amazon |
| `payment_deposit` | DECIMAL(10,2) | | Depósito pagado |
| `payment_balance` | DECIMAL(10,2) | | Balance pagado |
| `payment_deposit_date` | DATE | | |
| `payment_balance_date` | DATE | | |
| `notes` | TEXT | | |
| `created_at` | TIMESTAMPTZ | | |
| `updated_at` | TIMESTAMPTZ | | |

**PO Status Flow:**
```
draft → sent → confirmed → in_production → shipped → in_transit → customs → delivered
                                                                              ↓
                                                                     cancelled (en cualquier momento)
```

---

## 3. Tablas de Research

### 3.1 `product_research`

| Columna | Tipo | Constraints | Notas |
|---------|------|-------------|-------|
| `id` | UUID | PK | |
| `user_id` | UUID | NOT NULL | |
| `org_id` | UUID | FK → organizations(id) | Migración 024 |
| `name` | TEXT | NOT NULL | Nombre del producto |
| `niche` | TEXT | | Nicho de mercado |
| `asin_reference` | TEXT | | ASIN de referencia |
| `amazon_category` | TEXT | | Categoría en Amazon |
| `estimated_monthly_sales` | INTEGER | | Ventas mensuales estimadas |
| `average_price` | DECIMAL(10,2) | | Precio promedio |
| `review_count_competitor` | INTEGER | | Reviews del competidor |
| `average_rating` | DECIMAL(3,2) | | Rating promedio |
| `bsr` | INTEGER | | Best Seller Rank |
| `competition_level` | TEXT | CHECK('low','medium','high') | |
| `estimated_cogs` | DECIMAL(10,2) | | Costo estimado |
| `estimated_selling_price` | DECIMAL(10,2) | | Precio estimado |
| `estimated_roi` | DECIMAL(5,2) | | ROI estimado |
| `differentiation_notes` | TEXT | | Notas de diferenciación |
| `keywords` | TEXT[] | | Array de keywords |
| `status` | TEXT | DEFAULT 'idea', CHECK: 6 estados | idea/validating/approved/rejected/in_progress/launched |
| `priority` | INTEGER | DEFAULT 3, CHECK 1-5 | |
| `source` | TEXT | | Fuente del dato |
| `notes` | TEXT | | |
| `created_at` | TIMESTAMPTZ | | |
| `updated_at` | TIMESTAMPTZ | | |

**Research Status Flow:**
```
idea → validating → approved → in_progress → launched
                ↘ rejected
```

---

## 4. Tablas de Finanzas

### 4.1 `expenses`

| Columna | Tipo | Constraints | Notas |
|---------|------|-------------|-------|
| `id` | UUID | PK | |
| `user_id` | UUID | NOT NULL | |
| `org_id` | UUID | FK → organizations(id) | Migración 024 |
| `source_key` | TEXT | Nullable, UNIQUE(`org_id`, `source_key`) | Clave de idempotencia de importaciones externas |
| `product_id` | UUID | FK → products(id) | Opcional |
| `category` | TEXT | NOT NULL, CHECK: 11 categorías | ppc/software/va_services/samples/photography/shipping_forwarder/customs/prep_center/storage_3pl/travel/other |
| `subcategory` | TEXT | | |
| `description` | TEXT | NOT NULL | |
| `amount` | DECIMAL(10,2) | NOT NULL, CHECK >= 0 | |
| `currency` | TEXT | DEFAULT 'USD' | |
| `exchange_rate` | DECIMAL(10,4) | DEFAULT 1 | |
| `amount_usd` | DECIMAL(10,2) | **GENERATED** AS (amount/exchange_rate) | |
| `expense_date` | DATE | DEFAULT CURRENT_DATE | |
| `recurring` | BOOLEAN | DEFAULT false | |
| `recurring_frequency` | TEXT | CHECK('weekly','monthly','quarterly','yearly') | |
| `vendor` | TEXT | | |
| `receipt_url` | TEXT | | URL del recibo |
| `notes` | TEXT | | |
| `created_at` | TIMESTAMPTZ | | |
| `updated_at` | TIMESTAMPTZ | | |

### 4.2 `amazon_payouts`

| Columna | Tipo | Constraints | Notas |
|---------|------|-------------|-------|
| `id` | UUID | PK | |
| `user_id` | UUID | NOT NULL | |
| `payout_period_start` | DATE | NOT NULL | |
| `payout_period_end` | DATE | NOT NULL, CHECK end >= start | |
| `amount` | DECIMAL(10,2) | NOT NULL | |
| `currency` | TEXT | | |
| `status` | TEXT | CHECK('pending','transferred','failed') | |
| `amazon_reference` | TEXT | | |
| `bank_account_last4` | TEXT | | Últimos 4 dígitos |
| `transfer_date` | DATE | | |
| `marketplace` | TEXT | | |
| `notes` | TEXT | | |
| `created_at` | TIMESTAMPTZ | | |

### 4.3 `amazon_settlement_lines`

| Columna | Tipo | Constraints | Notas |
|---------|------|-------------|-------|
| `id` | UUID | PK, DEFAULT gen_random_uuid() | |
| `org_id` | UUID | NOT NULL, FK → organizations(id) ON DELETE CASCADE | Scope multi-tenant |
| `user_id` | UUID | NOT NULL, FK → profiles(id) ON DELETE CASCADE | Usuario que importó la línea |
| `connection_id` | UUID | FK → sp_api_connections(id) ON DELETE SET NULL | Conexión SP-API de origen |
| `report_id` | TEXT | | ID del reporte de Amazon |
| `settlement_id` | TEXT | NOT NULL | ID de la liquidación |
| `line_hash` | TEXT | NOT NULL | Hash de línea para idempotencia |
| `marketplace` | TEXT | | Marketplace de Amazon |
| `transaction_type` | TEXT | | Tipo de transacción |
| `fee_type` | TEXT | | Tipo de fee |
| `amount` | NUMERIC(14,2) | NOT NULL | Importe de la línea |
| `currency` | TEXT | NOT NULL, DEFAULT 'USD' | Moneda del importe |
| `posted_at` | DATE | | Fecha de contabilización |
| `order_id` | TEXT | | ID de pedido Amazon |
| `sku` | TEXT | | SKU del merchant |
| `asin` | TEXT | | ASIN |
| `product_id` | UUID | | Producto relacionado, si existe |
| `raw_row` | JSONB | NOT NULL, DEFAULT '{}' | Fila original del reporte |
| `created_at` | TIMESTAMPTZ | DEFAULT now() | |

**Constraints e índices:** UNIQUE(`org_id`, `settlement_id`, `line_hash`) para idempotencia; índices por (`org_id`, `posted_at`), (`org_id`, `fee_type`) y (`org_id`, `settlement_id`). La tabla es append-only en esta fase, sin `updated_at` ni políticas de UPDATE/DELETE. El trigger `trg_validate_amazon_settlement_line` valida la membresía activa del usuario y la pertenencia tenant de la conexión y el producto antes de insertar.

---

## 5. Tablas de Returns y Reimbursements

### 5.1 `returns`

| Columna | Tipo | Constraints | Notas |
|---------|------|-------------|-------|
| `id` | UUID | PK | |
| `user_id` | UUID | NOT NULL | |
| `org_id` | UUID | FK → organizations(id) | Migración 024 |
| `product_id` | UUID | NOT NULL, FK → products(id) | |
| `order_id` | TEXT | | |
| `amazon_return_id` | TEXT | | |
| `quantity` | INTEGER | NOT NULL, CHECK > 0 | |
| `return_reason` | TEXT | CHECK: 16 razones | defective/damaged_by_carrier/customer_damaged/defective_material/incorrect_item_received/missing_parts/customer_changed_mind/not_as_described/quality_issue/wrong_item_sent/size_issue/color_issue/better_price_found/no_longer_needed/other |
| `customer_comment` | TEXT | | |
| `refund_amount` | DECIMAL(10,2) | | |
| `status` | TEXT | DEFAULT 'requested', CHECK: 8 estados | requested/received_at_customer/in_transit/received_at_fc/inspected/refunded/reimbursed/disposed |
| `disposition` | TEXT | CHECK('sellable','unsellable','pending') | |
| `return_date` | DATE | NOT NULL | |
| `received_date` | DATE | | |
| `inspected_date` | DATE | | |
| `notes` | TEXT | | |
| `created_at` | TIMESTAMPTZ | | |
| `updated_at` | TIMESTAMPTZ | | |

### 5.2 `reimbursements`

| Columna | Tipo | Constraints | Notas |
|---------|------|-------------|-------|
| `id` | UUID | PK | |
| `user_id` | UUID | NOT NULL | |
| `org_id` | UUID | FK → organizations(id) | Migración 024 |
| `product_id` | UUID | FK → products(id) | |
| `return_id` | UUID | FK → returns(id) | |
| `amazon_case_id` | TEXT | | ID del caso en Amazon |
| `reimbursement_type` | TEXT | CHECK: 7 tipos | lost_inbound/damaged_inbound/lost_warehouse/damaged_warehouse/customer_return/removal_order/other |
| `quantity` | INTEGER | NOT NULL | |
| `amount` | DECIMAL(10,2) | NOT NULL | |
| `currency` | TEXT | DEFAULT 'USD' | |
| `status` | TEXT | DEFAULT 'pending', CHECK: 5 estados | pending/submitted/approved/rejected/paid |
| `issue_date` | DATE | | |
| `submitted_date` | DATE | | |
| `approved_date` | DATE | | |
| `paid_date` | DATE | | |
| `notes` | TEXT | | |
| `created_at` | TIMESTAMPTZ | | |
| `updated_at` | TIMESTAMPTZ | | |

### 5.3 `amazon_reimbursement_events`

Eventos append-only importados de `GET_FBA_REIMBURSEMENTS_DATA`. No representan
un nuevo reclamo ni modifican inventory automáticamente.

| Columna | Tipo | Constraints | Notas |
|---------|------|-------------|-------|
| `id` | UUID | PK | |
| `org_id` | UUID | NOT NULL, FK → organizations(id) | Tenant obligatorio |
| `user_id` | UUID | NOT NULL, FK → profiles(id) | Usuario de la conexión |
| `connection_id` | UUID | NOT NULL, FK → sp_api_connections(id) | Conexión Amazon origen |
| `marketplace` | TEXT | NOT NULL | |
| `report_id` | TEXT | NOT NULL | ID del reporte SP-API |
| `source_key` | TEXT | NOT NULL, UNIQUE con `org_id` | Idempotencia |
| `reimbursement_id` | TEXT | | ID externo Amazon |
| `case_id` | TEXT | | Case ID Amazon |
| `amazon_order_id` | TEXT | | Pedido Amazon |
| `original_reimbursement_id` | TEXT | | Reembolso original Amazon |
| `original_reimbursement_type` | TEXT | | Tipo del reembolso original |
| `sku`, `fnsku`, `asin` | TEXT | | Identificadores reportados |
| `reason` | TEXT | | Motivo Amazon |
| `approval_date` | DATE | | Fecha de aprobación |
| `amount_per_unit`, `amount_total` | NUMERIC | CHECK >= 0 | Importes del reporte |
| `currency` | TEXT | 3 caracteres | Moneda del reporte |
| `quantity_reimbursed_*` | INTEGER | CHECK >= 0 | Cash, inventory y total |
| `product_id` | UUID | FK → products(id) | Solo si el matching es seguro |
| `product_match_status` | TEXT | CHECK | matched_sku/matched_asin/unmatched/ambiguous/conflict |
| `movement_match_status` | TEXT | CHECK | Estado del candidato de inventory |
| `reconciliation_status` | TEXT | CHECK | unrecorded/possible duplicate/possible claim/linked/dismissed |
| `linked_reimbursement_id` | UUID | FK → reimbursements(id) | Solo mediante link manual |
| `raw_row` | JSONB | NOT NULL | Evidencia original |
| `first_seen_at`, `last_seen_at` | TIMESTAMPTZ | NOT NULL | Control de reintentos |

### 5.4 `amazon_reimbursement_movement_matches`

Evidencia de posibles coincidencias con movimientos existentes. No crea ni
modifica movimientos y tiene validación tenant/producto mediante trigger.

| Columna | Tipo | Constraints | Notas |
|---------|------|-------------|-------|
| `id` | UUID | PK | |
| `org_id` | UUID | NOT NULL, FK → organizations(id) | Tenant obligatorio |
| `amazon_reimbursement_event_id` | UUID | NOT NULL, FK | Evento Amazon |
| `stock_movement_id` | UUID | NOT NULL, FK | Movimiento candidato |
| `match_reason` | TEXT | NOT NULL | Motivo de coincidencia |
| `confidence` | TEXT | CHECK | candidate/ambiguous |
| `created_at` | TIMESTAMPTZ | NOT NULL | |

---

## 6. Tablas de Shipments

### 6.1 `fba_shipments`

| Columna | Tipo | Constraints | Notas |
|---------|------|-------------|-------|
| `id` | UUID | PK | |
| `user_id` | UUID | NOT NULL | |
| `po_id` | UUID | FK → purchase_orders(id) | |
| `shipment_name` | TEXT | NOT NULL | |
| `shipment_id` | TEXT | | ID del shipment en Amazon |
| `amazon_reference_id` | TEXT | | |
| `destination_fulfillment_center` | TEXT | | FC de destino |
| `destination_address` | TEXT | | |
| `status` | TEXT | DEFAULT 'working', CHECK: 10 estados | working/ready_to_ship/shipped/in_transit/delivered/checked_in/receiving/closed/cancelled |
| `shipping_method` | TEXT | CHECK('small_parcel','ltl','ftl','air','sea') | |
| `carrier` | TEXT | | Transportista |
| `tracking_number` | TEXT | | |
| `box_count` | INTEGER | DEFAULT 0 | |
| `total_units` | INTEGER | DEFAULT 0 | |
| `total_weight_kg` | DECIMAL(10,3) | | |
| `shipping_cost` | DECIMAL(10,2) | DEFAULT 0 | |
| `ship_date` | DATE | | |
| `estimated_arrival` | DATE | | |
| `actual_arrival` | DATE | | |
| `notes` | TEXT | | |
| `created_at` | TIMESTAMPTZ | | |
| `updated_at` | TIMESTAMPTZ | | |

### 6.2 `fba_shipment_items`

| Columna | Tipo | Constraints | Notas |
|---------|------|-------------|-------|
| `id` | UUID | PK | |
| `shipment_id` | UUID | NOT NULL, FK → fba_shipments(id) | |
| `product_id` | UUID | NOT NULL, FK → products(id) | |
| `quantity` | INTEGER | NOT NULL, CHECK > 0 | |
| `quantity_received` | INTEGER | DEFAULT 0 | Recibido en FC |
| `msKU` | TEXT | | Merchant SKU |
| `fnSKU` | TEXT | | Fulfilled SKU |
| `created_at` | TIMESTAMPTZ | | |
| `updated_at` | TIMESTAMPTZ | | |

---

## 7. Tablas de PPC/Ads

### 7.1 `ppc_campaigns`

| Columna | Tipo | Constraints | Notas |
|---------|------|-------------|-------|
| `id` | UUID | PK | |
| `user_id` | UUID | NOT NULL | |
| `org_id` | UUID | FK → organizations(id) | Migración 039 |
| `product_id` | UUID | FK → products(id) | |
| `campaign_name` | TEXT | NOT NULL | |
| `campaign_id` | TEXT | | ID de campaña en Amazon |
| `campaign_type` | TEXT | CHECK: 5 tipos | sp_auto/sp_manual_keyword/sp_manual_product/sb/sd |
| `marketplace` | TEXT | DEFAULT 'US' | |
| `status` | TEXT | DEFAULT 'enabled', CHECK('enabled','paused','archived') | |
| `daily_budget` | DECIMAL(10,2) | DEFAULT 0 | |
| `created_at` | TIMESTAMPTZ | | |
| `updated_at` | TIMESTAMPTZ | | |

### 7.2 `ppc_daily_metrics`

| Columna | Tipo | Constraints | Notas |
|---------|------|-------------|-------|
| `id` | UUID | PK | |
| `campaign_id` | UUID | NOT NULL, FK → ppc_campaigns(id) | |
| `metric_date` | DATE | NOT NULL | |
| `impressions` | INTEGER | DEFAULT 0 | |
| `clicks` | INTEGER | DEFAULT 0 | |
| `spend` | DECIMAL(10,2) | DEFAULT 0 | |
| `sales` | DECIMAL(10,2) | DEFAULT 0 | |
| `orders` | INTEGER | DEFAULT 0 | |
| `units` | INTEGER | DEFAULT 0 | |
| `acos` | DECIMAL(5,2) | **GENERATED** AS (spend/sales*100) | Advertising Cost of Sales |
| `roas` | DECIMAL(5,2) | **GENERATED** AS (sales/spend) | Return on Ad Spend |
| `ctr` | DECIMAL(5,4) | **GENERATED** AS (clicks/impressions) | Click-Through Rate |
| `cpc` | DECIMAL(10,4) | **GENERATED** AS (spend/clicks) | Cost Per Click |

**Constraints:** UNIQUE(campaign_id, metric_date)

---

## 8. Tablas de Calculator

### 8.1 `saved_calculations`

| Columna | Tipo | Constraints | Notas |
|---------|------|-------------|-------|
| `id` | UUID | PK | |
| `user_id` | UUID | NOT NULL | |
| `name` | TEXT | NOT NULL | Nombre del cálculo |
| `product_id` | UUID | FK → products(id) | |
| `sale_price` | DECIMAL(10,2) | | |
| `unit_cost` | DECIMAL(10,2) | | |
| `shipping_cost` | DECIMAL(10,2) | | |
| `prep_cost` | DECIMAL(10,2) | | |
| `taxes` | DECIMAL(10,2) | | |
| `weight_kg` | DECIMAL(10,3) | | |
| `fba_fee` | DECIMAL(10,2) | | |
| `referral_fee` | DECIMAL(10,2) | | |
| `other_fees` | DECIMAL(10,2) | | |
| `ppc_budget` | DECIMAL(10,2) | | |
| `net_profit` | DECIMAL(10,2) | | |
| `roi` | DECIMAL(10,2) | | |
| `margin` | DECIMAL(10,2) | | |
| `total_cost` | DECIMAL(10,2) | | |
| `notes` | TEXT | | |
| `created_at` | TIMESTAMPTZ | | |
| `updated_at` | TIMESTAMPTZ | | |

---

## 9. Tablas de SP-API

### 9.1 `sp_api_connections`

| Columna | Tipo | Constraints | Notas |
|---------|------|-------------|-------|
| `id` | UUID | PK | |
| `user_id` | UUID | NOT NULL | |
| `org_id` | UUID | FK → organizations(id) | Migración 024 |
| `marketplace` | TEXT | NOT NULL | |
| `seller_id` | TEXT | NOT NULL | |
| `refresh_token` | TEXT | NOT NULL | Token de refresh |
| `access_token` | TEXT | | Token de acceso actual |
| `token_expires_at` | TIMESTAMPTZ | | Expiración del token |
| `status` | TEXT | DEFAULT 'active', CHECK('active','expired','revoked') | |
| `created_at` | TIMESTAMPTZ | | |
| `updated_at` | TIMESTAMPTZ | | |

**Constraints:** UNIQUE(user_id, marketplace)

### 9.2 `sync_logs`

| Columna | Tipo | Constraints | Notas |
|---------|------|-------------|-------|
| `id` | UUID | PK | |
| `user_id` | UUID | NOT NULL | |
| `org_id` | UUID | FK → organizations(id) | Migración 024 |
| `connection_id` | UUID | FK → sp_api_connections(id) | |
| `sync_type` | TEXT | NOT NULL, CHECK: products/orders/inventory/fees/returns/payouts | |
| `status` | TEXT | DEFAULT 'pending', CHECK('pending','running','completed','failed') | |
| `items_processed` | INTEGER | DEFAULT 0 | |
| `items_failed` | INTEGER | DEFAULT 0 | |
| `error_message` | TEXT | | |
| `started_at` | TIMESTAMPTZ | | |
| `completed_at` | TIMESTAMPTZ | | |
| `created_at` | TIMESTAMPTZ | | |

### 9.3 `sp_api_webhook_subscriptions`

| Columna | Tipo | Constraints | Notas |
|---------|------|-------------|-------|
| `id` | UUID | PK | |
| `user_id` | UUID | NOT NULL | |
| `org_id` | UUID | FK → organizations(id) | Migración 024 |
| `connection_id` | UUID | NOT NULL, FK → sp_api_connections(id) | |
| `notification_type` | TEXT | NOT NULL, CHECK: 8 tipos | ORDER_STATUS_CHANGED/INVENTORY_EVENT/FULFILLMENT_ORDER_STATUS_CHANGED/FEES_INVENTORY_HEALTH_CHANGED/ANY_OFFER_CHANGED/PRICING_HEALTH_CHANGED/PRODUCT_TYPE_CHANGED/REPORT_PROCESSING_FINISHED |
| `amazon_destination_id` | TEXT | | ID del destination en Amazon |
| `amazon_subscription_id` | TEXT | | ID de la suscripción |
| `status` | TEXT | DEFAULT 'pending', CHECK('pending','active','paused','error') | |
| `error_message` | TEXT | | |
| `last_received_at` | TIMESTAMPTZ | | |
| `created_at` | TIMESTAMPTZ | | |
| `updated_at` | TIMESTAMPTZ | | |

**Constraints:** UNIQUE(connection_id, notification_type)

### 9.4 `sp_api_webhook_logs`

| Columna | Tipo | Constraints | Notas |
|---------|------|-------------|-------|
| `id` | UUID | PK | |
| `user_id` | UUID | NOT NULL | |
| `connection_id` | UUID | FK → sp_api_connections(id) | |
| `subscription_id` | UUID | FK → sp_api_webhook_subscriptions(id) | |
| `notification_type` | TEXT | NOT NULL | |
| `amazon_notification_id` | TEXT | | |
| `payload` | JSONB | | Payload completo |
| `status` | TEXT | DEFAULT 'received', CHECK('received','processing','processed','failed') | |
| `error_message` | TEXT | | |
| `processing_time_ms` | INTEGER | | Tiempo de procesamiento |
| `created_at` | TIMESTAMPTZ | | |

---

## 10. Tablas de Governance

### 10.1 `members` (LLC socios)

| Columna | Tipo | Constraints | Notas |
|---------|------|-------------|-------|
| `id` | UUID | PK | |
| `user_id` | UUID | NOT NULL | |
| `org_id` | UUID | FK → organizations(id) | Migración 024 |
| `full_name` | TEXT | NOT NULL | |
| `email` | TEXT | | |
| `ownership_pct` | NUMERIC(5,2) | DEFAULT 0, CHECK 0-100 | Porcentaje de propiedad |
| `status` | TEXT | DEFAULT 'active', CHECK('active','deceased','retired') | |
| `role` | member_role | DEFAULT 'editor', ENUM: admin/editor/viewer | Añadido en migración 014 |
| `avatar_url` | TEXT | | Añadido en migración 014 |
| `executor_name` | TEXT | | Nombre del ejecutor |
| `executor_email` | TEXT | | Email del ejecutor |
| `notes` | TEXT | | |
| `created_at` | TIMESTAMPTZ | | |
| `updated_at` | TIMESTAMPTZ | | |

### 10.2 `tasks` (Kanban)

| Columna | Tipo | Constraints | Notas |
|---------|------|-------------|-------|
| `id` | UUID | PK | |
| `user_id` | UUID | NOT NULL | |
| `org_id` | UUID | FK → organizations(id) | Migración 024 |
| `title` | TEXT | NOT NULL | |
| `description` | TEXT | | |
| `status` | TEXT | DEFAULT 'pending', CHECK('pending','in_progress','completed') | |
| `priority` | TEXT | DEFAULT 'medium', CHECK('low','medium','high','urgent') | |
| `assigned_to` | UUID | FK → members(id) | Migración 010 |
| `due_date` | TIMESTAMPTZ | | |
| `module` | TEXT | | Módulo relacionado |
| `related_to` | JSONB | | Entidad relacionada |
| `completed_at` | TIMESTAMPTZ | | |
| `created_at` | TIMESTAMPTZ | | |
| `updated_at` | TIMESTAMPTZ | | |

### 10.3 `board_decisions`

| Columna | Tipo | Constraints | Notas |
|---------|------|-------------|-------|
| `id` | UUID | PK | |
| `user_id` | UUID | NOT NULL | |
| `org_id` | UUID | FK → organizations(id) | Migración 024 |
| `title` | TEXT | NOT NULL | |
| `doc_reference` | TEXT | | Referencia a documento |
| `description` | TEXT | | |
| `decision_date` | DATE | | |
| `voted_by` | JSONB | | Votos registrados |
| `status` | TEXT | DEFAULT 'draft', CHECK('draft','approved','rejected','executed') | |
| `file_url` | TEXT | | Archivo adjunto |
| `created_at` | TIMESTAMPTZ | | |
| `updated_at` | TIMESTAMPTZ | | |

### 10.4 `company_members` (Legacy)

| Columna | Tipo | Constraints | Notas |
|---------|------|-------------|-------|
| `id` | UUID | PK | |
| `user_id` | UUID | NOT NULL, UNIQUE | |
| `company_name` | TEXT | DEFAULT 'Costtas Holding LLC' | |
| `role_in_company` | TEXT | DEFAULT 'member' | |
| `joined_at` | TIMESTAMPTZ | | |
| `updated_at` | TIMESTAMPTZ | | |

---

## 11. Tablas de Automation

### 11.1 `alert_rules`

| Columna | Tipo | Constraints | Notas |
|---------|------|-------------|-------|
| `id` | UUID | PK | |
| `user_id` | UUID | NOT NULL | |
| `org_id` | UUID | FK → organizations(id) | Migración 024 |
| `name` | TEXT | NOT NULL | |
| `description` | TEXT | | |
| `entity` | TEXT | NOT NULL, CHECK('inventory','sales','profitability','price','ppc') | Entidad a monitorear |
| `condition_type` | TEXT | NOT NULL, CHECK: 8 tipos | low_stock/out_of_stock/overstock/low_margin/sales_drop/price_change/roi_below/ppc_overbudget |
| `threshold` | NUMERIC | | Umbral numérico |
| `time_window` | TEXT | CHECK('1h','24h','7d','30d') | Ventana de tiempo |
| `comparison` | TEXT | CHECK('lt','gt','eq','lte','gte') | Comparación |
| `channel` | TEXT | DEFAULT 'in_app', CHECK('in_app','email','both') | Canal de notificación |
| `enabled` | BOOLEAN | DEFAULT true | |
| `last_triggered_at` | TIMESTAMPTZ | | |
| `created_at` | TIMESTAMPTZ | | |
| `updated_at` | TIMESTAMPTZ | | |

### 11.2 `alert_history`

| Columna | Tipo | Constraints | Notas |
|---------|------|-------------|-------|
| `id` | UUID | PK | |
| `user_id` | UUID | NOT NULL | |
| `org_id` | UUID | FK → organizations(id) | Migración 044 |
| `rule_id` | UUID | FK → alert_rules(id) | |
| `rule_name` | TEXT | NOT NULL | |
| `entity` | TEXT | NOT NULL | |
| `condition_type` | TEXT | NOT NULL | |
| `severity` | TEXT | DEFAULT 'warning', CHECK('critical','warning','info') | |
| `title` | TEXT | NOT NULL | |
| `message` | TEXT | NOT NULL | |
| `metadata` | JSONB | DEFAULT '{}' | Datos adicionales |
| `read` | BOOLEAN | DEFAULT false | |
| `channel_sent` | TEXT[] | DEFAULT '{}' | Canales por los que se envió |
| `created_at` | TIMESTAMPTZ | | |

### 11.3 `scheduled_reports`

| Columna | Tipo | Constraints | Notas |
|---------|------|-------------|-------|
| `id` | UUID | PK | |
| `user_id` | UUID | NOT NULL | |
| `org_id` | UUID | FK → organizations(id) | Migración 024 |
| `name` | TEXT | NOT NULL | |
| `template` | TEXT | NOT NULL, CHECK('profitability','inventory','sales-summary','roi-ranking') | |
| `frequency` | TEXT | NOT NULL, CHECK('daily','weekly','monthly') | |
| `day_of_week` | INTEGER | CHECK 0-6 | |
| `day_of_month` | INTEGER | CHECK 1-31 | |
| `time` | TIME | DEFAULT '08:00' | |
| `channel` | TEXT | DEFAULT 'email', CHECK('email','in_app','both') | |
| `recipients` | TEXT[] | DEFAULT '{}' | |
| `format` | TEXT | DEFAULT 'pdf', CHECK('pdf','excel','both') | |
| `enabled` | BOOLEAN | DEFAULT true | |
| `last_sent_at` | TIMESTAMPTZ | | |
| `next_run_at` | TIMESTAMPTZ | | |
| `created_at` | TIMESTAMPTZ | | |
| `updated_at` | TIMESTAMPTZ | | |

### 11.4 `reorder_rules`

| Columna | Tipo | Constraints | Notas |
|---------|------|-------------|-------|
| `id` | UUID | PK | |
| `user_id` | UUID | NOT NULL | |
| `org_id` | UUID | FK → organizations(id) | Migración 024 |
| `product_id` | UUID | NOT NULL, FK → products(id) | |
| `supplier_id` | UUID | FK → suppliers(id) | |
| `min_stock` | INTEGER | DEFAULT 10, CHECK min_stock < max_stock | |
| `max_stock` | INTEGER | DEFAULT 100 | |
| `auto_po` | BOOLEAN | DEFAULT false | Auto-generar PO |
| `lead_time_days` | INTEGER | DEFAULT 30 | |
| `safety_stock_days` | INTEGER | DEFAULT 14 | |
| `notes` | TEXT | | |
| `enabled` | BOOLEAN | DEFAULT true | |
| `last_evaluated_at` | TIMESTAMPTZ | | |
| `last_po_generated_at` | TIMESTAMPTZ | | |
| `created_at` | TIMESTAMPTZ | | |
| `updated_at` | TIMESTAMPTZ | | |

---

## 12. Tablas de Notifications

### 12.1 `notifications`

| Columna | Tipo | Constraints | Notas |
|---------|------|-------------|-------|
| `id` | UUID | PK | |
| `user_id` | UUID | NOT NULL | |
| `org_id` | UUID | FK → organizations(id) | Migración 024 |
| `type` | TEXT | NOT NULL, CHECK: 10 tipos | out_of_stock/low_stock/overstock/low_margin/reorder_point/po_created/custom/import_complete/import_error/system |
| `priority` | TEXT | NOT NULL, CHECK('critical','warning','info','success') | |
| `title` | TEXT | NOT NULL | |
| `message` | TEXT | NOT NULL | |
| `product_id` | UUID | | |
| `product_name` | TEXT | | |
| `product_sku` | TEXT | | |
| `read` | BOOLEAN | DEFAULT false | |
| `sent_external` | BOOLEAN | DEFAULT false | Enviado por email/push |
| `created_at` | TIMESTAMPTZ | | |
| `updated_at` | TIMESTAMPTZ | | |

### 12.2 `push_subscriptions`

| Columna | Tipo | Constraints | Notas |
|---------|------|-------------|-------|
| `id` | UUID | PK | |
| `user_id` | UUID | NOT NULL | |
| `endpoint` | TEXT | NOT NULL | URL del servicio push |
| `p256dh` | TEXT | NOT NULL | Clave de encriptación |
| `auth` | TEXT | NOT NULL | Clave de autenticación |
| `created_at` | TIMESTAMPTZ | | |
| `updated_at` | TIMESTAMPTZ | | |

**Constraints:** UNIQUE(user_id, endpoint)

---

## 13. Tablas de Collaboration

### 13.1 `shared_links`

| Columna | Tipo | Constraints | Notas |
|---------|------|-------------|-------|
| `id` | UUID | PK | |
| `user_id` | UUID | NOT NULL | |
| `org_id` | UUID | FK → organizations(id) | Migración 044 |
| `token` | TEXT | NOT NULL, UNIQUE, DEFAULT encode(gen_random_bytes(16),'hex') | Token público |
| `title` | TEXT | DEFAULT 'Dashboard Compartido' | |
| `active` | BOOLEAN | DEFAULT true | |
| `expires_at` | TIMESTAMPTZ | | |
| `created_at` | TIMESTAMPTZ | | |
| `updated_at` | TIMESTAMPTZ | | |

### 13.2 `audit_log`

| Columna | Tipo | Constraints | Notas |
|---------|------|-------------|-------|
| `id` | UUID | PK | |
| `user_id` | UUID | NOT NULL | |
| `org_id` | UUID | FK → organizations(id) | Migración 024 |
| `entity` | TEXT | NOT NULL | Nombre de la tabla |
| `entity_id` | UUID | NOT NULL | ID del registro |
| `action` | TEXT | NOT NULL, CHECK('create','update','delete','view','export','share','archive') | |
| `changes` | JSONB | DEFAULT '{}' | Cambios realizados |
| `ip_address` | TEXT | | |
| `user_agent` | TEXT | | |
| `created_at` | TIMESTAMPTZ | | |

### 13.3 `comments`

| Columna | Tipo | Constraints | Notas |
|---------|------|-------------|-------|
| `id` | UUID | PK | |
| `user_id` | UUID | NOT NULL | |
| `org_id` | UUID | FK → organizations(id) | Migración 024/047 |
| `entity` | TEXT | NOT NULL, CHECK: 7 tipos | product/order/shipment/supplier/task/member/board_decision |
| `entity_id` | UUID | NOT NULL | |
| `content` | TEXT | NOT NULL | |
| `parent_id` | UUID | FK → comments(id) | Para threaded comments |
| `created_at` | TIMESTAMPTZ | | |
| `updated_at` | TIMESTAMPTZ | | |

---

## 14. Tabla de Settings

### 14.1 `user_settings`

| Columna | Tipo | Constraints | Notas |
|---------|------|-------------|-------|
| `id` | UUID | PK | |
| `user_id` | UUID | NOT NULL, UNIQUE | 1:1 con user |
| `full_name` | TEXT | | |
| `company` | TEXT | | |
| `country` | TEXT | | |
| `default_marketplace` | TEXT | DEFAULT 'US' | |
| `currency` | TEXT | DEFAULT 'USD' | |
| `default_referral_fee_pct` | DECIMAL(5,2) | DEFAULT 15.00 | Porcentaje de referral fee |
| `default_fba_fee` | DECIMAL(10,2) | | Fee FBA por defecto |
| `default_shipping_cost` | DECIMAL(10,2) | | |
| `default_storage_cost` | DECIMAL(10,2) | | |
| `default_ppc_budget` | DECIMAL(10,2) | DEFAULT 0 | |
| `target_roi` | DECIMAL(5,2) | | ROI objetivo |
| `tax_rate` | DECIMAL(5,2) | | Tasa de impuesto |
| `theme` | TEXT | DEFAULT 'dark' | |
| `language` | TEXT | DEFAULT 'es', CHECK('es','en','ar') | |
| `drive_refresh_token` | TEXT | | Token de Google Drive |
| `created_at` | TIMESTAMPTZ | | |
| `updated_at` | TIMESTAMPTZ | | |

---

## 15. Vista: `products_with_inventory`

```sql
CREATE VIEW products_with_inventory WITH (security_invoker=true) AS
SELECT
  p.*,
  i.stock_available,
  i.stock_inbound,
  i.stock_reserved,
  i.stock_warehouse,
  COALESCE(i.reorder_point, 10) as reorder_point,
  COALESCE(i.max_stock, 500) as max_stock,
  CASE
    WHEN i.stock_available = 0 THEN 'out_of_stock'
    WHEN i.stock_available <= COALESCE(i.reorder_point, 10) THEN 'low_stock'
    WHEN i.stock_available > COALESCE(i.max_stock, 500) THEN 'overstock'
    ELSE 'normal'
  END as stock_status,
  COALESCE(s.sales_velocity_30d, 0) as sales_velocity_30d,
  COALESCE(s.revenue_last_30d, 0) as revenue_last_30d,
  CASE
    WHEN COALESCE(s.sales_velocity_30d, 0) > 0
    THEN i.stock_available / s.sales_velocity_30d
    ELSE NULL
  END as days_of_stock
FROM products p
LEFT JOIN inventory i ON i.product_id = p.id
LEFT JOIN (
  SELECT
    product_id,
    SUM(units_sold)::float / 30.0 as sales_velocity_30d,
    SUM(revenue) as revenue_last_30d
  FROM sales
  WHERE sale_date >= CURRENT_DATE - INTERVAL '30 days'
  GROUP BY product_id
) s ON s.product_id = p.id;
```

**Por qué esta vista existe:** Combina datos de 3 tablas (products + inventory + sales) en una sola consulta, evitando N+1 queries. Es la fuente de datos principal para la página de productos y el dashboard.

**Seguridad:** `security_invoker=true` → Las RLS policies de `products` se aplican al consultar la vista.

---

## 16. Triggers y Functions

### Functions principales:

| Function | Trigger | Tabla | Propósito |
|----------|---------|-------|-----------|
| `handle_new_user()` | `on_auth_user_created` | auth.users | Crear profile al registrarse |
| `handle_new_user_org()` | `on_auth_user_created_org` | auth.users | Crear org default al registrarse |
| `update_updated_at()` | `trg_*_updated` (todas las tablas) | Todas | Auto-set `updated_at = now()` |
| `auto_create_inventory()` | `trg_auto_inv` | products | Auto-crear inventory row |
| `update_inventory_from_movement()` | `trg_update_inv` | stock_movements | Actualizar inventory según movement_type |
| `is_org_member(target_org_id)` | N/A (SECURITY DEFINER) | N/A | Verificar membresía de org |
| `get_org_role(target_org_id)` | N/A (SECURITY DEFINER) | N/A | Obtener rol en org |

### Función clave: `update_inventory_from_movement()`

Se ejecuta BEFORE INSERT en `stock_movements`. Usa un CASE statement para actualizar `inventory`:

```sql
-- Simplificado
CASE movement_type
  WHEN 'inbound_shipment'      → stock_inbound += qty, stock_warehouse -= qty
  WHEN 'received_at_amazon'    → stock_available += qty, stock_inbound -= qty
  WHEN 'sale'                  → stock_available -= qty
  WHEN 'return'                → stock_available += qty
  WHEN 'removal'               → stock_available -= qty, stock_warehouse += qty
  WHEN 'adjustment'            → stock_available += qty (puede ser negativo)
  WHEN 'damaged'               → stock_available -= qty
  WHEN 'transfer_to_warehouse' → stock_warehouse += qty
END
-- También setea previous_stock y new_stock
```

### Functions de seguridad multi-tenant:

```sql
-- Verificar si el usuario actual es miembro de una org
CREATE FUNCTION is_org_member(target_org_id UUID)
RETURNS BOOLEAN
SECURITY DEFINER STABLE
AS $$
  SELECT EXISTS (
    SELECT 1 FROM org_members
    WHERE org_id = target_org_id
    AND user_id = auth.uid()
    AND status = 'active'
  )
$$;

-- Obtener el rol del usuario actual en una org
CREATE FUNCTION get_org_role(target_org_id UUID)
RETURNS TEXT
SECURITY DEFINER STABLE
AS $$
  SELECT role FROM org_members
  WHERE org_id = target_org_id
  AND user_id = auth.uid()
  AND status = 'active'
  LIMIT 1
$$;
```

---

## 17. RLS Policies por Tabla

### Patrón general (migración 024):

**Grupo A - CRUD completo, delete require editor+:**
- products, sales, suppliers, purchase_orders, product_research, tasks, notifications, expenses, returns, reimbursements, fba_shipments, reorder_rules, alert_rules, scheduled_reports

```sql
-- SELECT
CREATE POLICY "org_select" ON products FOR SELECT USING (is_org_member(org_id));
-- INSERT
CREATE POLICY "org_insert" ON products FOR INSERT WITH CHECK (is_org_member(org_id));
-- UPDATE
CREATE POLICY "org_update" ON products FOR UPDATE USING (is_org_member(org_id));
-- DELETE
CREATE POLICY "org_delete" ON products FOR DELETE
  USING (is_org_member(org_id) AND get_org_role(org_id) IN ('owner','admin','editor'));
```

**Grupo B - CRUD completo, delete require admin+:**
- members, board_decisions, sp_api_connections

```sql
-- DELETE requiere owner o admin
CREATE POLICY "org_delete" ON members FOR DELETE
  USING (is_org_member(org_id) AND get_org_role(org_id) IN ('owner','admin'));
```

**Grupo C - SELECT + INSERT solamente:**
- sync_logs, audit_log

**Grupo D - SELECT + INSERT + DELETE (sin UPDATE):**
- sp_api_webhook_subscriptions (migración 046 además exige `org_id`, `user_id = auth.uid()` y `is_org_member(org_id)` para `authenticated`)

**Webhooks:** `sp_api_webhook_logs` solo tiene SELECT para `authenticated` con el mismo scope tenant; el INSERT del endpoint webhook usa service role y bypassa RLS. No existe INSERT `authenticated` con una comprobación incondicional.

### Tablas con RLS pre-migración 024 (user_id = auth.uid()):

| Tabla | Política | Estado |
|-------|----------|--------|
| push_subscriptions | user_id = auth.uid() | Se mantiene (no tiene org_id) |
| shared_links | user_id + org_id + membership activa; lookup público solo por token mediante service-role | Migración 044 |
| comments | org_id no nulo + membership activa; mutations además user_id = auth.uid() | Migración 047 |
| company_members | auth.role() = 'authenticated' | Legacy |

### Tablas de organizaciones (propias):

**organizations:**
```sql
-- SELECT: ser miembro activo
SELECT USING (is_org_member(id))
-- INSERT: ser el owner
INSERT WITH CHECK (auth.uid() = owner_id)
-- UPDATE: ser owner o admin
UPDATE USING (auth.uid() = owner_id OR get_org_role(id) IN ('owner','admin'))
-- DELETE: ser el owner
DELETE USING (auth.uid() = owner_id)
```

**org_members:**
```sql
-- SELECT: ser miembro activo de la misma org
SELECT USING (is_org_member(org_id))
-- INSERT/UPDATE/DELETE: ser owner o admin
INSERT/UPDATE/DELETE USING (get_org_role(org_id) IN ('owner','admin'))
```

**org_invitations:**
```sql
-- SELECT: ser owner/admin O ser el invitado
SELECT USING (
  get_org_role(org_id) IN ('owner','admin')
  OR email = (SELECT email FROM profiles WHERE id = auth.uid())
)
-- INSERT: ser owner o admin
INSERT WITH CHECK (get_org_role(org_id) IN ('owner','admin'))
-- UPDATE: cualquiera (para aceptar invitación)
UPDATE USING (true)
```

---

## 18. Tablas con `org_id`

Las siguientes tablas están scoped por organización:

1. products
2. sales
3. suppliers
4. purchase_orders
5. product_research
6. sp_api_connections
7. members
8. tasks
9. board_decisions
10. notifications
11. expenses
12. returns
13. reimbursements
14. fba_shipments
15. reorder_rules
16. alert_rules
17. scheduled_reports
18. sp_api_webhook_subscriptions
19. comments
20. sync_logs
21. audit_log
22. stock_movements
23. amazon_settlement_lines
24. alert_history
25. shared_links
26. inventory
27. ppc_campaigns
28. ppc_daily_metrics
29. amazon_payouts
30. saved_calculations
31. supplier_quotes
32. product_suppliers

**Total: 33 tablas con `org_id`**

Las tablas legacy añadidas en la migración 039 mantienen `org_id` nullable para no
asignar filas históricas ambiguas. La migración 048 habilita RLS y exige
`org_id IS NOT NULL AND is_org_member(org_id)` en SELECT/INSERT/UPDATE/DELETE;
las filas sin organización quedan inaccesibles hasta una asignación segura.

---

## 19. Resumen de Migraciones

| Migración | Contenido |
|-----------|-----------|
| 008 | SP-API tables (connections, sync_logs) |
| 009 | Google Drive (drive_refresh_token en user_settings) |
| 010 | Fix: tasks.assigned_to FK → members(id) |
| 011 | Push subscriptions table |
| 012 | Notifications table |
| 013 | Alert rules + history |
| 014 | Members: role ENUM + avatar_url |
| 015 | Scheduled reports |
| 016 | Audit log security fix |
| 017 | Comments table |
| 018 | Reorder rules |
| 019 | Webhook subscriptions + logs |
| 020 | Notifications service_role access fix |
| 021 | Security: sanitized error messages |
| 022 | Products SKU nullable fix |
| 023 | N+1 query fixes |
| 024 | **Multi-tenant: org_id en 22 tablas + RLS con is_org_member** |
| 025 | Fix: products_with_inventory view missing org_id |
| 040 | Add: products.duty_rate y propagación a métricas generadas |
| 041 | Add: líneas de liquidaciones de Amazon con idempotencia y RLS |
| 042 | Fix: scope tenant de unicidad de products por organización |
| 043 | Add: expenses.source_key con UNIQUE(`org_id`, `source_key`) para idempotencia de payouts |
| 044 | Scope tenant de alert_history y shared_links sin backfills ambiguos |
| 045 | Bucket privado de reportes y policies por membership; objetos históricos en paths legacy quedan inaccesibles hasta regenerar reportes, sin acceso público |
| 046 | Scope RLS de webhooks SP-API por org_id, user_id y membership |
| 047 | Compatibilidad de schema y scope tenant de `comments`, sin backfill ambiguo |
| 048 | Scope RLS de las ocho tablas legacy añadidas por 039, sin backfill ambiguo |
| 049 | Compatibilidad de schema: crea automation tables ausentes (`alert_rules`, `reorder_rules`, `scheduled_reports`) con `org_id` nullable, índices y RLS fail-closed |

Las migraciones 044, 047 y 049 incluyen `CREATE TABLE IF NOT EXISTS` como
compatibilidad de schema para instalaciones donde las tablas históricas no
fueron creadas. Las columnas `org_id` se mantienen nullable y no se hace
backfill de filas existentes sin una asignación tenant inequívoca.

---

## Archivos Relacionados

| Tema | Ver |
|------|-----|
| Arquitectura general | `ARCHITECTURE.md` |
| Endpoints que usan estas tablas | `API.md` |
| Lógica de negocio por módulo | `MODULES.md` |
