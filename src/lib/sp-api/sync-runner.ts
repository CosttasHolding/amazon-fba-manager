import { createClient } from "@/lib/supabase/server";
import { SpApiClient, SpApiAuthError, refreshAccessToken } from "@/lib/sp-api";
import {
  getListings,
  getOrders,
  getOrderItems,
  getInventory,
  getFeeEstimate,
  createReport,
  getReport,
  getReportDocument,
} from "@/lib/sp-api";
import type { SpListingItem, SpOrder, SpInventorySummary } from "@/lib/sp-api";

export interface SyncResult {
  success: boolean;
  processed: number;
  failed: number;
  error?: string;
}

export interface ConnRow {
  id: string;
  marketplace: string;
  refresh_token: string;
  seller_id: string | null;
  access_token: string | null;
  token_expires_at: string | null;
}

export async function ensureClient(
  supabase: Awaited<ReturnType<typeof createClient>>,
  connection: ConnRow
): Promise<SpApiClient | null> {
  if (!process.env.SP_API_CLIENT_ID || !process.env.SP_API_CLIENT_SECRET) return null;
  if (!connection.seller_id) return null;

  let accessToken = connection.access_token;
  if (!accessToken || isTokenExpired(connection.token_expires_at)) {
    const tokens = await refreshAccessToken(connection.refresh_token);
    accessToken = tokens.access_token;
    await supabase
      .from("sp_api_connections")
      .update({
        access_token: tokens.access_token,
        token_expires_at: new Date(Date.now() + tokens.expires_in * 1000).toISOString(),
      })
      .eq("id", connection.id);
  }

  return new SpApiClient({
    accessToken,
    refreshToken: connection.refresh_token,
    marketplace: connection.marketplace,
    sellerId: connection.seller_id,
  });
}

export function isTokenExpired(expiresAt: string | null): boolean {
  if (!expiresAt) return true;
  return new Date(expiresAt).getTime() <= Date.now() + 60000;
}

export async function runSync(
  supabase: Awaited<ReturnType<typeof createClient>>,
  connection: ConnRow,
  syncType: string,
  userId: string,
  orgId: string
): Promise<SyncResult> {
  try {
    const client = await ensureClient(supabase, connection);
    if (!client) return { success: true, processed: 0, failed: 0 };

    const sellerId = connection.seller_id;
    switch (syncType) {
      case "products": return syncProducts(supabase, client, userId, orgId, sellerId!, connection.marketplace);
      case "orders": return syncOrders(supabase, client, userId, orgId);
      case "inventory": return syncInventory(supabase, client, userId, orgId, connection.marketplace);
      case "fees": return syncFees(supabase, client, userId, orgId, connection.marketplace);
      case "returns": return syncReturns(supabase, client, userId, orgId, connection.marketplace);
      case "payouts": return syncPayouts(supabase, client, userId, orgId, connection.marketplace);
      default: return { success: true, processed: 0, failed: 0 };
    }
  } catch (error) {
    return {
      success: false,
      processed: 0,
      failed: 0,
      error: error instanceof SpApiAuthError ? "Token expired" : error instanceof Error ? error.message : "Sync error",
    };
  }
}

async function syncProducts(
  supabase: Awaited<ReturnType<typeof createClient>>,
  client: SpApiClient,
  userId: string,
  orgId: string,
  sellerId: string,
  marketplace: string
): Promise<SyncResult> {
  try {
    const listings = await getListings(client, sellerId);
    let processed = 0;
    let failed = 0;

    for (const item of listings) {
      const { error } = await supabase.from("products").upsert({
        user_id: userId,
        org_id: orgId,
        sku: item.sku,
        asin: item.asin,
        name: item.name,
        sale_price: item.price || 0,
        status: mapListingStatus(item.status),
        marketplace: marketplace,
        unit_cost: 0,
        shipping_cost: 0,
        prep_cost: 0,
        taxes: 0,
        referral_fee: 0,
        fba_fee: 0,
        storage_fee_monthly: 0,
        other_fees: 0,
        total_cost: 0,
        total_fees: 0,
        net_profit: 0,
        roi: 0,
      }, {
        onConflict: "user_id, sku",
        ignoreDuplicates: false,
      }).select("id").single();

      if (error) failed++;
      else processed++;
    }

    return { success: true, processed, failed };
  } catch (error) {
    return { success: false, processed: 0, failed: 0, error: error instanceof Error ? error.message : "Products sync error" };
  }
}

async function syncOrders(
  supabase: Awaited<ReturnType<typeof createClient>>,
  client: SpApiClient,
  userId: string,
  orgId: string
): Promise<SyncResult> {
  try {
    const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString();
    const orders = await getOrders(client, thirtyDaysAgo);
    let processed = 0;
    let failed = 0;

    for (const order of orders) {
      try {
        const items = await getOrderItems(client, order.AmazonOrderId);
        const revenue = order.OrderTotal?.Amount || 0;

        for (const item of items) {
          const { data: products } = await supabase
            .from("products")
            .select("id")
            .eq("asin", item.ASIN)
            .eq("org_id", orgId)
            .limit(1);

          if (!products?.length) {
            failed++;
            continue;
          }

          const quantity = item.QuantityShipped || item.QuantityOrdered || 1;
          const totalQuantity = items.reduce((s, i) => s + (i.QuantityShipped || i.QuantityOrdered || 1), 0);
          const unitRevenue = totalQuantity > 0 ? revenue / totalQuantity : 0;

          const { error } = await supabase.from("sales").upsert({
            user_id: userId,
            org_id: orgId,
            product_id: products[0].id,
            sale_date: order.PurchaseDate.split("T")[0],
            units_sold: quantity,
            revenue: unitRevenue * quantity,
            amazon_fees: 0,
            net_revenue: unitRevenue * quantity,
            order_id: order.AmazonOrderId,
            source: "amazon_sp_api",
          }, {
            onConflict: "order_id, product_id",
            ignoreDuplicates: false,
          });

          if (error) failed++;
          else processed++;
        }
      } catch {
        failed++;
      }
    }

    return { success: true, processed, failed };
  } catch (error) {
    return { success: false, processed: 0, failed: 0, error: error instanceof Error ? error.message : "Orders sync error" };
  }
}

async function syncInventory(
  supabase: Awaited<ReturnType<typeof createClient>>,
  client: SpApiClient,
  userId: string,
  orgId: string,
  marketplace: string
): Promise<SyncResult> {
  try {
    const marketplaceId = getMarketplaceId(marketplace);
    const items = await getInventory(client, marketplaceId);
    let processed = 0;
    let failed = 0;

    for (const invItem of items) {
      try {
        const { data: products } = await supabase
          .from("products")
          .select("id")
          .eq("asin", invItem.asin)
          .eq("org_id", orgId)
          .limit(1);

        if (!products?.length) {
          failed++;
          continue;
        }

        const details = invItem.inventoryDetails;
        const { error } = await supabase.from("inventory").upsert({
          product_id: products[0].id,
          org_id: orgId,
          stock_available: details?.fulfillableQuantity || 0,
          stock_inbound: (details?.inboundWorkingQuantity || 0) + (details?.inboundShippedQuantity || 0) + (details?.inboundReceivingQuantity || 0),
          stock_reserved: details?.totalReservedQuantity || 0,
          updated_at: new Date().toISOString(),
        }, {
          onConflict: "product_id",
          ignoreDuplicates: false,
        });

        if (error) failed++;
        else processed++;
      } catch {
        failed++;
      }
    }

    return { success: true, processed, failed };
  } catch (error) {
    return { success: false, processed: 0, failed: 0, error: error instanceof Error ? error.message : "Inventory sync error" };
  }
}

async function syncFees(
  supabase: Awaited<ReturnType<typeof createClient>>,
  client: SpApiClient,
  userId: string,
  orgId: string,
  marketplace: string
): Promise<SyncResult> {
  try {
    const marketplaceId = getMarketplaceId(marketplace);
    const { data: products } = await supabase
      .from("products")
      .select("id, asin, sale_price")
      .eq("org_id", orgId)
      .not("asin", "is", null)
      .limit(50);

    if (!products?.length) return { success: true, processed: 0, failed: 0 };

    let processed = 0;
    let failed = 0;

    for (const product of products) {
      try {
        if (!product.asin) { failed++; continue; }

        const estimate = await getFeeEstimate(client, product.asin, product.sale_price || 0, marketplaceId);
        if (!estimate?.FeesEstimate) { failed++; continue; }

        const totalFees = estimate.FeesEstimate.TotalFeesEstimate || 0;
        const breakdown = estimate.FeesEstimate.FeeBreakdown || [];
        const fbaFee = breakdown.find(f => f.FeeType === "FBAFees")?.FeeAmount || 0;
        const referralFee = breakdown.find(f => f.FeeType === "ReferralFee")?.FeeAmount || 0;

        const { error } = await supabase
          .from("products")
          .update({
            fba_fee: fbaFee,
            referral_fee: referralFee,
            total_fees: totalFees,
          })
          .eq("id", product.id)
          .eq("org_id", orgId);

        if (error) failed++;
        else processed++;
      } catch {
        failed++;
      }
    }

    return { success: true, processed, failed };
  } catch (error) {
    return { success: false, processed: 0, failed: 0, error: error instanceof Error ? error.message : "Fees sync error" };
  }
}

async function syncReturns(
  supabase: Awaited<ReturnType<typeof createClient>>,
  client: SpApiClient,
  userId: string,
  orgId: string,
  marketplace: string
): Promise<SyncResult> {
  try {
    const marketplaceId = getMarketplaceId(marketplace);
    const report = await createReport(client, "GET_FLAT_FILE_RETURNS_DATA_BY_RETURN_DATE", [marketplaceId]);
    const document = await pollReport(client, report.reportId);
    if (!document) return { success: true, processed: 0, failed: 0 };

    const lines = document.split("\n").filter(l => l.trim());
    if (lines.length < 2) return { success: true, processed: 0, failed: 0 };

    const headers = parseCsvLine(lines[0]);
    const rows = lines.slice(1).map(line => parseCsvLine(line));
    let processed = 0;
    let failed = 0;

    for (const row of rows) {
      try {
        const asin = getField(row, headers, "asin") || getField(row, headers, "ASIN");
        const orderId = getField(row, headers, "order-id") || getField(row, headers, "order_id");
        const returnDate = getField(row, headers, "return-date") || getField(row, headers, "return_date");
        const quantity = parseInt(getField(row, headers, "quantity") || "1", 10);
        const reason = getField(row, headers, "return-reason") || getField(row, headers, "return_reason") || "other";
        const refundAmount = parseFloat(getField(row, headers, "refund-amount") || "0");

        if (!asin) { failed++; continue; }

        const { data: products } = await supabase
          .from("products")
          .select("id")
          .eq("asin", asin)
          .eq("org_id", orgId)
          .limit(1);

        if (!products?.length) { failed++; continue; }

        const { error } = await supabase.from("returns").insert({
          user_id: userId,
          org_id: orgId,
          product_id: products[0].id,
          order_id: orderId,
          amazon_return_id: orderId,
          quantity,
          return_reason: mapReturnReason(reason),
          refund_amount: refundAmount || null,
          status: "received_at_fc",
          return_date: returnDate ? returnDate.split("T")[0] : null,
        });

        if (error) failed++;
        else processed++;
      } catch {
        failed++;
      }
    }

    return { success: true, processed, failed };
  } catch (error) {
    return { success: false, processed: 0, failed: 0, error: error instanceof Error ? error.message : "Returns sync error" };
  }
}

async function syncPayouts(
  supabase: Awaited<ReturnType<typeof createClient>>,
  client: SpApiClient,
  userId: string,
  orgId: string,
  marketplace: string
): Promise<SyncResult> {
  try {
    const marketplaceId = getMarketplaceId(marketplace);
    const report = await createReport(client, "GET_V2_SETTLEMENT_REPORT_DATA_FLAT_FILE", [marketplaceId]);
    const document = await pollReport(client, report.reportId);
    if (!document) return { success: true, processed: 0, failed: 0 };

    const lines = document.split("\n").filter(l => l.trim());
    if (lines.length < 2) return { success: true, processed: 0, failed: 0 };

    const headers = parseCsvLine(lines[0]);
    const rows = lines.slice(1).map(line => parseCsvLine(line));
    let processed = 0;
    let failed = 0;

    for (const row of rows) {
      try {
        const transactionType = getField(row, headers, "transaction-type");
        if (!transactionType || transactionType === "Order") continue;

        const amount = parseFloat(getField(row, headers, "amount") || "0");
        const description = getField(row, headers, "settlement-id") || getField(row, headers, "description") || "";
        const date = getField(row, headers, "date-time") || getField(row, headers, "posted-date") || new Date().toISOString().split("T")[0];

        const { error } = await supabase.from("expenses").insert({
          user_id: userId,
          org_id: orgId,
          category: "other",
          description: `SP-API Payout: ${description}`,
          amount: Math.abs(amount),
          currency: "USD",
          expense_date: date.split("T")[0],
          vendor: "Amazon",
          notes: `Transaction: ${transactionType}`,
        });

        if (error) failed++;
        else processed++;
      } catch {
        failed++;
      }
    }

    return { success: true, processed, failed };
  } catch (error) {
    return { success: false, processed: 0, failed: 0, error: error instanceof Error ? error.message : "Payouts sync error" };
  }
}

async function pollReport(
  client: SpApiClient,
  reportId: string,
  maxAttempts = 30
): Promise<string | null> {
  for (let i = 0; i < maxAttempts; i++) {
    const status = await getReport(client, reportId);
    if (status.processingStatus === "DONE" && status.reportDocumentId) {
      return getReportDocument(client, status.reportDocumentId);
    }
    if (["FATAL", "CANCELLED"].includes(status.processingStatus)) {
      return null;
    }
    await new Promise(r => setTimeout(r, 2000));
  }
  return null;
}

function parseCsvLine(line: string): string[] {
  const result: string[] = [];
  let current = "";
  let inQuotes = false;

  for (const char of line) {
    if (char === '"') { inQuotes = !inQuotes; continue; }
    if (char === "\t" && !inQuotes) { result.push(current); current = ""; continue; }
    current += char;
  }
  result.push(current);
  return result;
}

function getField(row: string[], headers: string[], name: string): string {
  const idx = headers.findIndex(h => h.toLowerCase().trim() === name.toLowerCase().trim());
  return idx >= 0 ? (row[idx] || "").trim() : "";
}

function mapListingStatus(status: string): "active" | "paused" | "discontinued" {
  if (status === "ACTIVE" || status === "SELLABLE") return "active";
  if (status === "INACTIVE") return "paused";
  return "discontinued";
}

function mapReturnReason(reason: string): string {
  const reasonMap: Record<string, string> = {
    "defective": "defective",
    "damaged_by_carrier": "damaged_by_carrier",
    "customer_damaged": "customer_damaged",
    "different_from_description": "different_from_description",
    "expired_item": "expired_item",
    "fraud": "fraud",
    "missing_parts": "missing_parts",
    "no_longer_wanted": "no_longer_wanted",
    "not_as_described": "not_as_described",
    "ordered_wrong_item": "ordered_wrong_item",
    "quality_not_acceptable": "quality_not_acceptable",
    "arrived_late": "arrived_late",
    "undeliverable": "undeliverable",
    "unauthorized_purchase": "unauthorized_purchase",
  };
  const lower = reason.toLowerCase().trim();
  return reasonMap[lower] || "other";
}

function getMarketplaceId(marketplace: string): string {
  const map: Record<string, string> = {
    US: "ATVPDKIKX0DER",
    CA: "A2EUQ1WTGCTBG2",
    MX: "A1AM78C79S5H2W",
    UK: "A1F83G8C2ARO7P",
    DE: "A1PA6795UKMFR9",
    FR: "A13V1IB3VIYZZH",
    IT: "APJ6JRA9NG5V4",
    ES: "A1RKKUPIHCS9H3",
  };
  return map[marketplace] || "ATVPDKIKX0DER";
}
