export const TRASH_ENTITIES = [
  "research_groups",
  "product_research",
  "products",
  "inventory",
  "suppliers",
  "product_suppliers",
  "supplier_quotes",
  "purchase_orders",
  "fba_shipments",
  "fba_shipment_items",
  "returns",
  "reimbursements",
  "expenses",
  "amazon_payouts",
  "ppc_campaigns",
  "ppc_daily_metrics",
  "tasks",
  "members",
  "company_members",
  "board_decisions",
  "reorder_rules",
  "alert_rules",
  "scheduled_reports",
] as const;

export type TrashEntity = (typeof TRASH_ENTITIES)[number];

export const TRASH_NAME_COLUMN: Record<TrashEntity, string> = {
  research_groups: "name",
  product_research: "name",
  products: "name",
  inventory: "id",
  suppliers: "name",
  product_suppliers: "id",
  supplier_quotes: "id",
  purchase_orders: "po_number",
  fba_shipments: "shipment_name",
  fba_shipment_items: "msku",
  returns: "order_id",
  reimbursements: "amazon_case_id",
  expenses: "description",
  amazon_payouts: "amazon_reference",
  ppc_campaigns: "campaign_name",
  ppc_daily_metrics: "id",
  tasks: "title",
  members: "full_name",
  company_members: "company_name",
  board_decisions: "title",
  reorder_rules: "id",
  alert_rules: "name",
  scheduled_reports: "name",
};

export const TRASH_COLUMN = "deleted_at";

export function normalizeTable(entity: string): TrashEntity {
  if ((TRASH_ENTITIES as readonly string[]).includes(entity)) return entity as TrashEntity;
  throw new Error(`trash: entidad no gestionable '${entity}'`);
}

export function isGroupEntity(entity: string): boolean {
  return normalizeTable(entity) === "research_groups";
}