import { PRODUCT_STATUS_VALUES, MARKETPLACE_VALUES } from "@/lib/constants";

export type Marketplace = (typeof MARKETPLACE_VALUES)[number];
export type ProductStatus = (typeof PRODUCT_STATUS_VALUES)[number];
export type StockStatus = 'normal' | 'low_stock' | 'out_of_stock' | 'overstock';
export type OrgMemberRole = 'owner' | 'admin' | 'editor' | 'viewer';
export type OrgMemberStatus = 'pending' | 'active' | 'removed';
export type InvitationStatus = 'pending' | 'accepted' | 'expired' | 'revoked';

export interface Organization {
    id: string;
    name: string;
    slug: string;
    owner_id: string;
    logo_url: string | null;
    settings: Record<string, unknown>;
    created_at: string;
    updated_at: string;
}

export interface OrgMember {
    id: string;
    org_id: string;
    user_id: string;
    role: OrgMemberRole;
    status: OrgMemberStatus;
    joined_at: string;
    user_email?: string;
    user_name?: string;
}

export interface OrgInvitation {
    id: string;
    org_id: string;
    email: string;
    role: MemberRole;
    invited_by: string;
    token: string;
    expires_at: string;
    status: InvitationStatus;
    created_at: string;
    org_name?: string;
    inviter_name?: string;
}

export interface OrgContext {
    org: Organization | null;
    membership: OrgMember | null;
    isLoading: boolean;
}
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
  updated_at: string;
}

// ============================================
// FASE 4 - Automation & Alerts
// ============================================

export type AlertConditionType = 'low_stock' | 'out_of_stock' | 'overstock' | 'low_margin' | 'sales_drop' | 'price_change' | 'roi_below' | 'ppc_overbudget';
export type AlertChannel = 'in_app' | 'email' | 'both';
export type AlertSeverity = 'critical' | 'warning' | 'info';

export interface AlertRule {
  id: string;
  user_id: string;
  name: string;
  description: string | null;
  entity: string;
  condition_type: AlertConditionType;
  threshold: number | null;
  time_window: string | null;
  comparison: string | null;
  channel: AlertChannel;
  enabled: boolean;
  last_triggered_at: string | null;
  created_at: string;
  updated_at: string;
}

export interface AlertHistory {
  id: string;
  user_id: string;
  rule_id: string | null;
  rule_name: string;
  entity: string;
  condition_type: AlertConditionType;
  severity: AlertSeverity;
  title: string;
  message: string;
  metadata: Record<string, unknown>;
  read: boolean;
  channel_sent: string[];
  created_at: string;
}

export type ReportTemplate = 'profitability' | 'inventory' | 'sales-summary' | 'roi-ranking';
export type ReportFrequency = 'daily' | 'weekly' | 'monthly';
export type ReportFormat = 'pdf' | 'excel' | 'both';

export interface ScheduledReport {
  id: string;
  user_id: string;
  name: string;
  template: ReportTemplate;
  frequency: ReportFrequency;
  day_of_week: number | null;
  day_of_month: number | null;
  time: string;
  channel: string;
  recipients: string[];
  format: ReportFormat;
  enabled: boolean;
  last_sent_at: string | null;
  next_run_at: string | null;
  created_at: string;
  updated_at: string;
}

// ============================================
// FASE 4 - Reorder Rules
// ============================================

export interface ReorderRule {
  id: string;
  user_id: string;
  product_id: string;
  supplier_id: string | null;
  min_stock: number;
  max_stock: number;
  auto_po: boolean;
  lead_time_days: number;
  safety_stock_days: number;
  notes: string | null;
  enabled: boolean;
  last_evaluated_at: string | null;
  last_po_generated_at: string | null;
  created_at: string;
  updated_at: string;
}

export interface ReorderRuleWithProduct extends ReorderRule {
  product_name?: string;
  product_sku?: string;
  product_stock?: number;
  product_velocity?: number;
  supplier_name?: string | null;
  suggested_qty?: number;
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
    // Nuevos KPIs profesionales
    revenue_current_month: number;
    revenue_last_month: number;
    revenue_delta_pct: number;
    units_current_month: number;
    units_last_month: number;
    units_delta_pct: number;
    weighted_avg_roi: number;
    margin_net_avg: number;
}

export interface TopProduct {
  id: string;
  name: string;
  sku: string;
  sale_price: number;
  net_profit: number;
  roi: number;
  status: ProductStatus;
  stock_available: number;
  sales_velocity_30d: number;
}

export type StockAlertType = 'out_of_stock' | 'low_stock' | 'overstock';

export interface StockAlert {
  id: string;
  product_id: string;
  type: StockAlertType;
  product_name: string;
  sku: string;
  current_stock: number;
  threshold: number;
}

export interface ComparisonPoint {
  date: string;
  current: number;
  previous: number;
}

export interface ComparisonData {
  daily: ComparisonPoint[];
  totalCurrent: number;
  totalPrevious: number;
}

export interface ChartData {
  salesChartData: { date: string; revenue: number; units: number }[];
  salesChartDataWeekly: { date: string; revenue: number; units: number }[];
  categoryChartData: { name: string; value: number; count: number }[];
  profitChartData: { name: string; profit: number; roi: number; sku: string }[];
  comparison?: ComparisonData;
}

export interface DashboardResponse {
  metrics: DashboardMetrics;
  topProducts: TopProduct[];
  alerts: StockAlert[];
  charts: ChartData;
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
  supplier_name?: string;
  read: boolean;
  persistent: boolean;
  created_at: string;
}

export interface NotificationsResponse {
  notifications: Notification[];
  unread_count: number;
  total_count: number;
}

// ============================================
// Product Research (SPRINT 4)
// ============================================

export type ResearchStatus = 'idea' | 'validating' | 'approved' | 'rejected' | 'in_progress' | 'launched';
export type CompetitionLevel = 'low' | 'medium' | 'high';

export interface ProductResearch {
  id: string;
  user_id: string;
  name: string;
  niche: string | null;
  asin_reference: string | null;
  amazon_category: string | null;
  estimated_monthly_sales: number | null;
  average_price: number | null;
  review_count_competitor: number | null;
  average_rating: number | null;
  bsr: number | null;
  competition_level: CompetitionLevel | null;
  estimated_cogs: number | null;
  estimated_selling_price: number | null;
  estimated_roi: number | null;
  differentiation_notes: string | null;
  keywords: string[] | null;
  status: ResearchStatus;
  priority: number;
  source: string | null;
  notes: string | null;
  created_at: string;
  updated_at: string;
}

// ============================================
// Purchase Orders (SPRINT 5)
// ============================================

export type PoStatus = 'draft' | 'sent' | 'confirmed' | 'in_production' | 'shipped' | 'in_transit' | 'customs' | 'delivered' | 'cancelled';
export type ShippingMethod = 'air' | 'sea' | 'express';

// ============================================
// Governance (Fase 2 - Costtas Holding LLC)
// ============================================

export type MemberStatus = 'active' | 'deceased' | 'retired';
export type TaskStatus = 'pending' | 'in_progress' | 'completed';
export type TaskPriority = 'low' | 'medium' | 'high' | 'urgent';
export type DecisionStatus = 'draft' | 'approved' | 'rejected' | 'executed';

export interface CompanyMember {
  id: string;
  user_id: string;
  company_name: string;
  role_in_company: string;
  joined_at: string;
}

export type MemberRole = 'admin' | 'editor' | 'viewer';

export interface Member {
  id: string;
  user_id: string;
  full_name: string;
  email: string | null;
  ownership_pct: number;
  status: MemberStatus;
  role: MemberRole;
  avatar_url: string | null;
  executor_name: string | null;
  executor_email: string | null;
  notes: string | null;
  created_at: string;
  updated_at: string;
}

export interface Task {
  id: string;
  user_id: string;
  title: string;
  description: string | null;
  status: TaskStatus;
  priority: TaskPriority;
  assigned_to: string | null;
  due_date: string | null;
  module: string | null;
  related_to: Record<string, unknown> | null;
  completed_at: string | null;
  created_at: string;
  updated_at: string;
}

export interface BoardDecision {
  id: string;
  user_id: string;
  title: string;
  doc_reference: string | null;
  description: string | null;
  decision_date: string | null;
  voted_by: Record<string, unknown> | null;
  status: DecisionStatus;
  file_url: string | null;
  created_at: string;
  updated_at: string;
}

export interface PurchaseOrder {
  id: string;
  user_id: string;
  supplier_id: string | null;
  po_number: string | null;
  product_id: string | null;
  quantity: number;
  unit_cost: number;
  total_cost: number;
  currency: string;
  exchange_rate: number;
  shipping_method: ShippingMethod | null;
  shipping_cost: number | null;
  status: PoStatus;
  order_date: string | null;
  production_deadline: string | null;
  ship_date: string | null;
  estimated_arrival: string | null;
  actual_arrival: string | null;
  tracking_number: string | null;
  forwarder_name: string | null;
  customs_cost: number | null;
  prep_center_cost: number | null;
  amazon_shipment_id: string | null;
  payment_deposit: number | null;
  payment_balance: number | null;
  payment_deposit_date: string | null;
  payment_balance_date: string | null;
  notes: string | null;
  created_at: string;
  updated_at: string;
}

// ============================================
// FASE 5 - Team & Collaboration
// ============================================

export type AuditAction = 'create' | 'update' | 'delete' | 'view' | 'export' | 'share' | 'archive';

export interface AuditLogEntry {
  id: string;
  user_id: string;
  entity: string;
  entity_id: string;
  action: AuditAction;
  changes: Record<string, unknown>;
  ip_address: string | null;
  user_agent: string | null;
  created_at: string;
}

export type CommentEntity = 'product' | 'order' | 'shipment' | 'supplier' | 'task' | 'member' | 'board_decision';

export interface Comment {
  id: string;
  user_id: string;
  entity: CommentEntity;
  entity_id: string;
  content: string;
  parent_id: string | null;
  created_at: string;
  updated_at: string;
}

// ============================================
// Missing DB table types
// ============================================

export interface Profile {
  id: string;
  email: string;
  full_name: string | null;
  avatar_url: string | null;
  company_name: string | null;
  country: string | null;
  language: string;
  created_at: string;
  updated_at: string;
}

export interface Inventory {
  id: string;
  product_id: string;
  user_id: string;
  stock_available: number;
  stock_inbound: number;
  stock_reserved: number;
  stock_warehouse: number;
  reorder_point: number;
  max_stock: number;
  last_restocked_at: string | null;
  created_at: string;
  updated_at: string;
}

export interface UserSettings {
  id: string;
  user_id: string;
  marketplace_default: string;
  currency_default: string;
  referral_fee_pct: number;
  fba_fee_base: number;
  storage_fee_per_unit: number;
  shipping_cost_default: number;
  prep_cost_default: number;
  tax_rate_default: number;
  other_fees_default: number;
  weight_unit: string;
  length_unit: string;
  notifications_enabled: boolean;
  email_notifications: boolean;
  drive_refresh_token: string | null;
  created_at: string;
  updated_at: string;
}

export interface Expense {
  id: string;
  user_id: string;
  category: string;
  description: string;
  amount: number;
  date: string;
  notes: string | null;
  created_at: string;
  updated_at: string;
}

export interface AmazonPayout {
  id: string;
  user_id: string;
  period_start: string;
  period_end: string;
  gross_amount: number;
  fees_amount: number;
  net_payout: number;
  currency: string;
  created_at: string;
}

export type FbaShipmentStatus = 'working' | 'shipped' | 'in_transit' | 'delivered' | 'checked_in' | 'receiving' | 'closed' | 'cancelled' | 'deleted' | 'error' | 'ready_to_ship';

export interface FbaShipment {
  id: string;
  user_id: string;
  shipment_id: string;
  shipment_name: string;
  destination_fulfillment_center: string;
  status: FbaShipmentStatus;
  quantity: number;
  units_shipped: number;
  units_received: number;
  ship_date: string | null;
  estimated_arrival: string | null;
  carrier: string | null;
  tracking_number: string | null;
  notes: string | null;
  created_at: string;
  updated_at: string;
}

export interface FbaShipmentItem {
  id: string;
  shipment_id: string;
  product_id: string;
  sku: string;
  quantity: number;
  units_received: number;
  created_at: string;
}

export interface Reimbursement {
  id: string;
  user_id: string;
  case_id: string | null;
  sku: string | null;
  product_id: string | null;
  reason: string;
  amount: number;
  status: string;
  filed_date: string | null;
  resolved_date: string | null;
  notes: string | null;
  created_at: string;
  updated_at: string;
}

export type PpcCampaignStatus = 'enabled' | 'paused' | 'archived';
export type PpcCampaignType = 'sponsored_products' | 'sponsored_brands' | 'sponsored_display';

export interface PpcCampaign {
  id: string;
  user_id: string;
  campaign_name: string;
  campaign_type: PpcCampaignType;
  marketplace: string;
  status: PpcCampaignStatus;
  daily_budget: number;
  start_date: string | null;
  end_date: string | null;
  targeting_type: string | null;
  notes: string | null;
  created_at: string;
  updated_at: string;
}

export interface PpcDailyMetrics {
  id: string;
  campaign_id: string;
  date: string;
  impressions: number;
  clicks: number;
  spend: number;
  sales: number;
  orders: number;
  acos: number;
  roas: number;
  ctr: number;
  cpc: number;
  created_at: string;
}

export interface SharedLink {
  id: string;
  user_id: string;
  token: string;
  title: string;
  description: string | null;
  is_active: boolean;
  password_hash: string | null;
  expires_at: string | null;
  view_count: number;
  last_viewed_at: string | null;
  created_at: string;
  updated_at: string;
}