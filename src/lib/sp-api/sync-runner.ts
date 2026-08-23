import { createHash } from "node:crypto";
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
  org_id: string | null;
  user_id: string;
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
        .eq("id", connection.id)
        .eq("org_id", connection.org_id)
        .eq("user_id", connection.user_id);
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
  if (connection.org_id !== orgId || connection.user_id !== userId) {
    return {
      success: false,
      processed: 0,
      failed: 0,
      error: "Connection identity does not match sync context",
    };
  }

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
      case "payouts": return syncPayouts(supabase, client, userId, orgId, connection.marketplace, connection.id);
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

export async function syncProducts(
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
      const { data: legacyProduct, error: legacyLookupError } = await supabase
        .from("products")
        .select("id")
        .eq("user_id", userId)
        .eq("sku", item.sku)
        .is("org_id", null)
        .maybeSingle();

      if (legacyLookupError) {
        failed++;
        continue;
      }

      if (legacyProduct) {
        const { error: legacyUpdateError } = await supabase
          .from("products")
          .update({
            org_id: orgId,
            asin: item.asin,
            name: item.name,
            sale_price: item.price || 0,
            status: mapListingStatus(item.status),
            marketplace,
          })
          .eq("id", legacyProduct.id)
          .eq("user_id", userId)
          .is("org_id", null);

        if (legacyUpdateError) failed++;
        else processed++;
        continue;
      }

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
        onConflict: "org_id,sku",
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

export async function syncPayouts(
  supabase: Awaited<ReturnType<typeof createClient>>,
  client: SpApiClient,
  userId: string,
  orgId: string,
  marketplace: string,
  connectionId: string | null = null
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
    const productSkus = new Set<string>();
    const productAsins = new Set<string>();
    for (const row of rows) {
      const sku = getSettlementField(row, headers, ["sku"]);
      const asin = getSettlementField(row, headers, ["asin"]);
      if (sku) productSkus.add(sku);
      if (asin) productAsins.add(asin);
    }

    const productBySku = new Map<string, string>();
    const productByAsin = new Map<string, string>();
    if (productSkus.size > 0 || productAsins.size > 0) {
      let productQuery = supabase
        .from("products")
        .select("id, sku, asin")
        .eq("org_id", orgId);
      const predicates = [
        productSkus.size > 0 ? `sku.in.(${Array.from(productSkus).map(quotePostgrestValue).join(",")})` : null,
        productAsins.size > 0 ? `asin.in.(${Array.from(productAsins).map(quotePostgrestValue).join(",")})` : null,
      ].filter((predicate): predicate is string => predicate !== null);
      productQuery = productQuery.or(predicates.join(","));

      const { data: products, error: productError } = await productQuery;
      if (productError) {
        return { success: false, processed: 0, failed: 0, error: productError.message };
      }

      for (const product of products || []) {
        if (product.sku && !productBySku.has(product.sku)) productBySku.set(product.sku, product.id);
        if (product.asin && !productByAsin.has(product.asin)) productByAsin.set(product.asin, product.id);
      }
    }

    const occurrences = new Map<string, number>();
    const settlementLines = rows.flatMap((row) => {
      const settlementId = getSettlementField(row, headers, ["settlement-id", "settlement_id"]);
      const transactionType = getSettlementField(row, headers, ["transaction-type", "transaction_type"]);
      const amount = parseSettlementAmount(getSettlementField(row, headers, ["amount"]));

      if (!settlementId || !transactionType || amount === null) return [];

      const rowKey = canonicalSettlementLineKey(settlementId, row, headers);
      const occurrence = occurrences.get(rowKey) || 0;
      occurrences.set(rowKey, occurrence + 1);
      const sku = getSettlementField(row, headers, ["sku"]);
      const asin = getSettlementField(row, headers, ["asin"]);

      return [{
        org_id: orgId,
        user_id: userId,
        connection_id: connectionId,
        report_id: report.reportId,
        settlement_id: settlementId,
        line_hash: hashSettlementLine(settlementId, row, occurrence, headers),
        marketplace,
        transaction_type: transactionType,
        fee_type: normalizeSettlementFeeType(row, headers),
        amount,
        currency: getSettlementField(row, headers, ["currency"]) || "USD",
        posted_at: normalizeSettlementDate(getSettlementField(row, headers, ["date-time", "date_time", "posted-date", "posted_date"])),
        order_id: getSettlementField(row, headers, ["order-id", "order_id"]) || null,
        sku: sku || null,
        asin: asin || null,
        product_id: productBySku.get(sku) || productByAsin.get(asin) || null,
        raw_row: toSettlementRawRow(row, headers),
      }];
    });

    if (settlementLines.length === 0) return { success: true, processed: 0, failed: 0 };

    try {
      const { error } = await supabase
        .from("amazon_settlement_lines")
        .upsert(settlementLines, {
          onConflict: "org_id,settlement_id,line_hash",
          ignoreDuplicates: true,
        });

      if (error) {
        return { success: false, processed: 0, failed: 0, error: error.message };
      }
    } catch (error) {
      return {
        success: false,
        processed: 0,
        failed: 0,
        error: error instanceof Error ? error.message : "Settlement lines sync error",
      };
    }

    const expenseRows = settlementLines
      .filter((line) => line.transaction_type !== "Order")
      .map((line) => ({
        user_id: userId,
        org_id: orgId,
        source_key: `${orgId}:${line.settlement_id}:${line.line_hash}`,
        category: "other",
        description: `SP-API Payout: ${line.settlement_id}`,
        amount: Math.abs(line.amount),
        currency: line.currency,
        expense_date: line.posted_at || new Date().toISOString().split("T")[0],
        vendor: "Amazon",
        notes: `Transaction: ${line.transaction_type}`,
      }));

    if (expenseRows.length === 0) return { success: true, processed: 0, failed: 0 };

    try {
      const { data: insertedExpenses, error } = await supabase
        .from("expenses")
        .upsert(expenseRows, {
          onConflict: "org_id,source_key",
          ignoreDuplicates: true,
        })
        .select("id");

      if (error) return { success: true, processed: 0, failed: expenseRows.length };
      return { success: true, processed: insertedExpenses?.length || 0, failed: 0 };
    } catch {
      return { success: true, processed: 0, failed: expenseRows.length };
    }
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

export function getSettlementField(row: string[], headers: string[], aliases: readonly string[]): string {
  for (const alias of aliases) {
    const value = getField(row, headers, alias);
    if (value) return value;
  }
  return "";
}

export function normalizeSettlementFeeType(row: string[], headers: string[]): string | null {
  return getSettlementField(row, headers, [
    "fee-type",
    "fee_type",
    "amount-description",
    "amount_description",
    "description",
  ]) || null;
}

export function normalizeSettlementDate(value: string): string | null {
  const trimmed = value.trim();
  return trimmed ? trimmed.split("T")[0] : null;
}

export function parseSettlementAmount(value: string): number | null {
  const normalized = value.trim();
  if (!/^[+-]?(?:\d+(?:\.\d+)?|\.\d+)$/.test(normalized)) return null;

  const amount = Number(normalized);
  return Number.isFinite(amount) ? amount : null;
}

export function hashSettlementLine(
  settlementId: string,
  row: string[],
  occurrence: number,
  headers: string[] = row.map((_, index) => String(index)),
): string {
  return createHash("sha256")
    .update(JSON.stringify({
      settlementId: normalizeSettlementValue(settlementId),
      fields: canonicalSettlementFields(row, headers),
      occurrence,
    }), "utf8")
    .digest("hex");
}

function canonicalSettlementLineKey(settlementId: string, row: string[], headers: string[]): string {
  return JSON.stringify({
    settlementId: normalizeSettlementValue(settlementId),
    fields: canonicalSettlementFields(row, headers),
  });
}

function canonicalSettlementFields(row: string[], headers: string[]): Array<[string, string]> {
  return headers
    .map((header, index) => [
      normalizeSettlementHeader(header),
      normalizeSettlementValue(row[index] || ""),
    ] as [string, string])
    .sort(([leftHeader, leftValue], [rightHeader, rightValue]) =>
      leftHeader.localeCompare(rightHeader) || leftValue.localeCompare(rightValue),
    );
}

function normalizeSettlementHeader(value: string): string {
  return value.trim().toLowerCase().replace(/[\s-]+/g, "_");
}

function normalizeSettlementValue(value: string): string {
  return value.trim().replace(/\s+/g, " ");
}

function quotePostgrestValue(value: string): string {
  return `"${value.replace(/\\/g, "\\\\").replace(/"/g, '\\"')}"`;
}

function toSettlementRawRow(row: string[], headers: string[]): Record<string, string> {
  return Object.fromEntries(headers.map((header, index) => [header.trim(), row[index] || ""]));
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
