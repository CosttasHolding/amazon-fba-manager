export type Marketplace = 'US' | 'MX' | 'CA' | 'UK' | 'DE' | 'FR' | 'IT' | 'ES';
export type ProductStatus = 'active' | 'paused' | 'discontinued';
export type StockStatus = 'normal' | 'low_stock' | 'out_of_stock' | 'overstock';
export type MovementType =
    | 'inbound_shipment'
    | 'received_at_amazon'
    | 'sale'
    | 'return'
    | 'removal'
    | 'adjustment'
    | 'damaged'
    | 'transfer_to_warehouse';

export interface Product {
    id: string;
    user_id: string;
    sku: string;
    asin: string | null;
    name: string;
    category: string | null;
    weight_kg: number | null;
    marketplace: Marketplace;
    unit_cost: number;
    shipping_cost: number;
    prep_cost: number;
    taxes: number;
    sale_price: number;
    referral_fee: number;
    fba_fee: number;
    storage_fee_monthly: number;
    other_fees: number;
    total_cost: number;
    total_fees: number;
    net_profit: number;
    roi: number;
    status: ProductStatus;
    notes: string | null;
    pdf_url: string | null;
    created_at: string;
    updated_at: string;
}

export interface ProductWithInventory extends Product {
    stock_available: number;
    stock_inbound: number;
    stock_reserved: number;
    stock_warehouse: number;
    reorder_point: number;
    max_stock: number;
    stock_status: StockStatus;
    sales_velocity_30d: number;
    revenue_last_30d: number;
    days_of_stock: number | null;
}

export interface Sale {
    id: string;
    product_id: string;
    user_id: string;
    sale_date: string;
    units_sold: number;
    revenue: number;
    amazon_fees: number;
    net_revenue: number;
    order_id: string | null;
    source: string;
    created_at: string;
}

export interface StockMovement {
    id: string;
    product_id: string;
    user_id: string;
    movement_type: MovementType;
    quantity: number;
    previous_stock: number | null;
    new_stock: number | null;
    reference: string | null;
    notes: string | null;
    created_at: string;
}

export interface DashboardMetrics {
    total_products: number;
    active_products: number;
    avg_roi: number;
    total_potential_profit: number;
    avg_profit: number;
    avg_margin: number;
    total_inventory_value: number;
    low_stock_count: number;
    overstock_count: number;
    out_of_stock_count: number;
    revenue_last_30d: number;
    units_sold_last_30d: number;
}

// ============================================
// Suppliers (Fase 2)
// ============================================

export interface Supplier {
  id: string;
  user_id: string;
  name: string;
  alibaba_url: string | null;
  contact_name: string | null;
  contact_email: string | null;
  contact_whatsapp: string | null;
  country: string | null;
  rating: number | null;
  payment_terms: string | null;
  min_order_qty: number | null;
  lead_time_days: number | null;
  notes: string | null;
  status: "active" | "inactive";
  created_at: string;
  updated_at: string;
}

export interface ProductSupplier {
  id: string;
  product_id: string;
  supplier_id: string;
  user_id: string;
  unit_cost: number | null;
  moq: number | null;
  lead_time_days: number | null;
  is_primary: boolean;
  notes: string | null;
  created_at: string;
}

export interface SupplierWithProducts extends Supplier {
  product_suppliers?: (ProductSupplier & { product?: Product })[];
}

// ============================================
// Notifications (Fase 4.6)
// ============================================

export type NotificationType =
  | 'out_of_stock'
  | 'low_stock'
  | 'overstock'
  | 'low_margin'
  | 'import_complete'
  | 'import_error'
  | 'system';

export type NotificationPriority = 'critical' | 'warning' | 'info' | 'success';

export interface Notification {
  id: string;
  type: NotificationType;
  priority: NotificationPriority;
  title: string;
  message: string;
  product_id?: string;
  product_name?: string;
  product_sku?: string;
  read: boolean;
  persistent: boolean;
  created_at: string;
}

export interface NotificationsResponse {
  notifications: Notification[];
  unread_count: number;
  total_count: number;
}