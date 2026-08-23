export interface SpApiConnection {
  id: string;
  user_id: string;
  marketplace: string;
  seller_id: string;
  refresh_token: string;
  access_token: string | null;
  token_expires_at: string | null;
  status: "active" | "expired" | "revoked";
  created_at: string;
  updated_at: string;
}

export interface SyncLog {
  id: string;
  user_id: string;
  connection_id: string;
  sync_type: "products" | "orders" | "inventory" | "fees" | "returns" | "payouts" | "reimbursements";
  status: "pending" | "running" | "completed" | "failed";
  items_processed: number;
  items_failed: number;
  error_message: string | null;
  started_at: string | null;
  completed_at: string | null;
  created_at: string;
}

export interface SpApiCredentials {
  clientId: string;
  clientSecret: string;
  refreshToken?: string;
  awsAccessKeyId: string;
  awsSecretKey: string;
  roleArn: string;
}

export interface MarketplaceIds {
  [marketplace: string]: string;
}

export const MARKETPLACE_IDS: MarketplaceIds = {
  US: "ATVPDKIKX0DER",
  CA: "A2EUQ1WTGCTBG2",
  MX: "A1AM78C79S5H2W",
  UK: "A1F83G8C2ARO7P",
  DE: "A1PA6795UKMFR9",
  FR: "A13V1IB3VIYZZH",
  IT: "APJ6JRA9NG5V4",
  ES: "A1RKKUPIHCS9H3",
};

export const SP_API_ENDPOINTS = {
  NA: "https://sellingpartnerapi-na.amazon.com",
  EU: "https://sellingpartnerapi-eu.amazon.com",
  FE: "https://sellingpartnerapi-fe.amazon.com",
} as const;

export function getSpEndpoint(marketplace: string): string {
  if (["US", "CA", "MX"].includes(marketplace)) return SP_API_ENDPOINTS.NA;
  if (["UK", "DE", "FR", "IT", "ES"].includes(marketplace)) return SP_API_ENDPOINTS.EU;
  return SP_API_ENDPOINTS.NA;
}
