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
    low_stock_count: number;
    overstock_count: number;
    out_of_stock_count: number;
    revenue_last_30d: number;
    units_sold_last_30d: number;
}