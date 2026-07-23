import { SpApiClient } from "./client";

/* ─── Listings / Products ─── */

export interface SpListingItem {
  sku: string;
  asin: string;
  name: string;
  productType: string;
  price: number | null;
  condition: string;
  status: string;
}

export async function getListings(
  client: SpApiClient,
  sellerId: string
): Promise<SpListingItem[]> {
  const items: SpListingItem[] = [];
  let nextToken: string | undefined;

  do {
    const path = `/listings/2021-08-01/items/${sellerId}?marketplaceIds=${client.getMarketplaceId()}` +
      (nextToken ? `&pageToken=${nextToken}` : "");

    const result = await client.get<{
      items: SpListingItem[];
      nextToken?: string;
    }>(path);

    items.push(...(result.items || []));
    nextToken = result.nextToken;
  } while (nextToken);

  return items;
}

/* ─── Orders ─── */

export interface SpOrder {
  AmazonOrderId: string;
  PurchaseDate: string;
  OrderStatus: string;
  OrderTotal?: { Amount: number; CurrencyCode: string };
  NumberOfItemsShipped: number;
  NumberOfItemsUnshipped: number;
  BuyerInfo?: { BuyerEmail?: string; BuyerName?: string };
  ShippingAddress?: { City?: string; StateOrRegion?: string };
}

export interface SpOrdersResponse {
  Orders: SpOrder[];
  NextToken?: string;
}

export async function getOrders(
  client: SpApiClient,
  createdAfter: string
): Promise<SpOrder[]> {
  const all: SpOrder[] = [];
  let nextToken: string | undefined;

  do {
    const path = `/orders/v0/orders?MarketplaceIds=${client.getMarketplaceId()}&CreatedAfter=${createdAfter}` +
      (nextToken ? `&NextToken=${nextToken}` : "");

    const result = await client.get<SpOrdersResponse>(path);
    all.push(...(result.Orders || []));
    nextToken = result.NextToken;
  } while (nextToken);

  return all;
}

/* ─── Inventory ─── */

export interface SpInventorySummary {
  asin: string;
  fnSku: string;
  sellerSku: string;
  condition: string;
  inventoryDetails?: {
    fulfillableQuantity: number;
    inboundWorkingQuantity: number;
    inboundShippedQuantity: number;
    inboundReceivingQuantity: number;
    totalReservedQuantity: number;
  };
}

export async function getInventory(
  client: SpApiClient,
  marketplaceId: string
): Promise<SpInventorySummary[]> {
  const items: SpInventorySummary[] = [];
  let nextToken: string | undefined;

  do {
    const path = `/fba/inventory/v1/summaries?marketplaceIds=${marketplaceId}&details=true` +
      (nextToken ? `&nextToken=${nextToken}` : "");

    const result = await client.get<{
      inventories: SpInventorySummary[];
      nextToken?: string;
    }>(path);

    items.push(...(result.inventories || []));
    nextToken = result.nextToken;
  } while (nextToken);

  return items;
}

/* ─── Fees ─── */

export interface SpFeeEstimate {
  FeesEstimate: {
    TotalFeesEstimate: number;
    FeeBreakdown: Array<{ FeeType: string; FeeAmount: number }>;
  };
}

export async function getFeeEstimate(
  client: SpApiClient,
  asin: string,
  price: number,
  marketplaceId: string
): Promise<SpFeeEstimate | null> {
  try {
    const result = await client.post<{
      FeesEstimateResult: SpFeeEstimate;
    }>("/products/fees/v0/estimates", {
      FeesEstimateRequest: {
        MarketplaceId: marketplaceId,
        PriceToEstimateFees: {
          ListingPrice: { Amount: price, CurrencyCode: "USD" },
        },
        Identifier: asin,
        IsAmazonFulfilled: true,
      },
    });
    return result.FeesEstimateResult || null;
  } catch {
    return null;
  }
}

/* ─── Order Items ─── */

export interface SpOrderItem {
  ASIN: string;
  SellerSKU: string;
  OrderItemId: string;
  Title: string;
  QuantityOrdered: number;
  QuantityShipped: number;
  ItemPrice?: { Amount: number; CurrencyCode: string };
  ItemTax?: { Amount: number; CurrencyCode: string };
}

export async function getOrderItems(
  client: SpApiClient,
  orderId: string
): Promise<SpOrderItem[]> {
  const items: SpOrderItem[] = [];
  let nextToken: string | undefined;

  do {
    const path = `/orders/v0/orders/${orderId}/orderItems` +
      (nextToken ? `?NextToken=${nextToken}` : "");

    const result = await client.get<{
      OrderItems: SpOrderItem[];
      NextToken?: string;
    }>(path);

    items.push(...(result.OrderItems || []));
    nextToken = result.NextToken;
  } while (nextToken);

  return items;
}

/* ─── Reports ─── */

export async function createReport(
  client: SpApiClient,
  reportType: string,
  marketplaceIds: string[]
): Promise<{ reportId: string }> {
  return client.post<{ reportId: string }>("/reports/2021-06-30/reports", {
    reportType,
    marketplaceIds,
  });
}

export async function getReport(
  client: SpApiClient,
  reportId: string
): Promise<{
  processingStatus: string;
  reportDocumentId?: string;
}> {
  return client.get(`/reports/2021-06-30/reports/${reportId}`);
}

export async function getReportDocument(
  client: SpApiClient,
  documentId: string
): Promise<string> {
  const doc = await client.get<{
    url: string;
  }>(`/reports/2021-06-30/documents/${documentId}`);

  const res = await fetch(doc.url);
  return res.text();
}

/* ─── Catalog Item ─── */

export async function getCatalogItem(
  client: SpApiClient,
  asin: string,
  marketplaceId: string = "ATVPDKIKX0DER"
): Promise<{
  title: string | null;
  brand: string | null;
  category: string | null;
  weight: number | null;
  dimensions: { length: number; width: number; height: number; unit: string } | null;
  image_url: string | null;
  description: string | null;
} | null> {
  try {
    const params = new URLSearchParams({
      marketplaceIds: marketplaceId,
      includedData: "summaries,attributes,images,productTypes",
    });
    const data = await client.get<{
      responses?: Array<{
        summaries?: Array<{
          title?: string;
          brand?: string;
          productType?: string;
        }>;
        images?: Array<{
          images?: Array<{ link?: string }>;
        }>;
        attributes?: Array<{
          attribute_name: string;
          value?: string[];
        }>;
      }>;
    }>(`/catalog/2022-04-01/items/${asin}?${params.toString()}`);

    const item = data?.responses?.[0]?.summaries?.[0];
    if (!item) return null;

    const images = data?.responses?.[0]?.images?.[0]?.images;
    const imageUrl = images?.[0]?.link ?? null;

    const attributes = data?.responses?.[0]?.attributes;
    let weight: number | null = null;
    let dimensions: { length: number; width: number; height: number; unit: string } | null = null;

    if (attributes) {
      const weightAttr = attributes.find(
        (a) => a.attribute_name === "item_weight" || a.attribute_name === "weight"
      );
      if (weightAttr?.value?.[0]) {
        const w = parseFloat(weightAttr.value[0]);
        if (!isNaN(w)) weight = w;
      }

      const dimAttr = attributes.find(
        (a) => a.attribute_name === "item_dimensions" || a.attribute_name === "product_dimensions"
      );
      if (dimAttr?.value?.[0]) {
        const parts = dimAttr.value[0].split("x").map((s) => parseFloat(s.trim()));
        if (parts.length === 3 && parts.every((n) => !isNaN(n))) {
          dimensions = { length: parts[0], width: parts[1], height: parts[2], unit: "inches" };
        }
      }
    }

    return {
      title: item.title ?? null,
      brand: item.brand ?? null,
      category: item.productType ?? null,
      weight,
      dimensions,
      image_url: imageUrl,
      description: null,
    };
  } catch {
    return null;
  }
}
