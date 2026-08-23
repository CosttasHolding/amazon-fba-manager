export const dynamic = "force-dynamic";

import { NextResponse } from "next/server";
import { z } from "zod";
import { createApiHandler } from "@/lib/api-handler";

const DATE_PATTERN = /^\d{4}-\d{2}-\d{2}$/;
const PAGE_SIZE = 1000;
const dateSchema = z.string().regex(DATE_PATTERN, "Debe usar YYYY-MM-DD").refine((value) => {
  const [year, month, day] = value.split("-").map(Number);
  const date = new Date(Date.UTC(year, month - 1, day));
  return date.getUTCFullYear() === year && date.getUTCMonth() === month - 1 && date.getUTCDate() === day;
}, "Fecha inválida");

const filtersSchema = z.object({
  startDate: dateSchema.optional(),
  endDate: dateSchema.optional(),
  marketplace: z.string().trim().min(1).max(100).optional(),
  productId: z.string().uuid().optional(),
  feeType: z.string().trim().min(1).max(100).optional(),
});

type SettlementLine = {
  id: string;
  currency: string | null;
  transaction_type: string | null;
  fee_type: string | null;
  amount: number | string;
  posted_at: string | null;
  product_id: string | null;
  sku: string | null;
  asin: string | null;
};

function getOptionalParam(value: string | null): string | undefined {
  const trimmed = value?.trim();
  return trimmed ? trimmed : undefined;
}

function dateDaysBefore(dateString: string, days: number): string {
  const date = new Date(`${dateString}T00:00:00Z`);
  date.setUTCDate(date.getUTCDate() - days);
  return date.toISOString().slice(0, 10);
}

function roundCents(value: number): number {
  return Math.round(value * 100) / 100;
}

export const GET = createApiHandler(async ({ supabase, orgId, req }) => {
  if (!orgId) return NextResponse.json({ error: "No hay organización activa" }, { status: 400 });

  const { searchParams } = req.nextUrl;
  const parsed = filtersSchema.safeParse({
    startDate: getOptionalParam(searchParams.get("startDate")),
    endDate: getOptionalParam(searchParams.get("endDate")),
    marketplace: getOptionalParam(searchParams.get("marketplace")),
    productId: getOptionalParam(searchParams.get("productId")),
    feeType: getOptionalParam(searchParams.get("feeType")),
  });

  if (!parsed.success) {
    return NextResponse.json({ error: "Filtros inválidos", details: parsed.error.flatten().fieldErrors }, { status: 400 });
  }

  const today = new Date().toISOString().slice(0, 10);
  const endDate = parsed.data.endDate ?? today;
  const startDate = parsed.data.startDate ?? dateDaysBefore(endDate, 89);

  let query = supabase
    .from("amazon_settlement_lines")
    .select("id, currency, transaction_type, fee_type, amount, posted_at, product_id, sku, asin")
    .eq("org_id", orgId)
    .gte("posted_at", startDate)
    .lte("posted_at", endDate);

  if (parsed.data.marketplace) query = query.eq("marketplace", parsed.data.marketplace);
  if (parsed.data.productId) query = query.eq("product_id", parsed.data.productId);
  if (parsed.data.feeType) query = query.eq("fee_type", parsed.data.feeType);
  query = query.order("id", { ascending: true });

  const data: SettlementLine[] = [];
  for (let offset = 0; ; offset += PAGE_SIZE) {
    const { data: batch, error } = await query.range(offset, offset + PAGE_SIZE - 1);
    if (error) throw error;
    data.push(...((batch || []) as SettlementLine[]));
    if (!batch || batch.length < PAGE_SIZE) break;
  }

  const byFeeType = new Map<string, { feeType: string; currency: string; amount: number; count: number }>();
  const byDate = new Map<string, { date: string; currency: string; amount: number }>();
  const byProduct = new Map<string, { productId: string; currency: string; sku: string | null; asin: string | null; amount: number; count: number }>();
  const currencies = new Set<string>();
  let totalFees = 0;
  let transactionCount = 0;

  for (const line of data) {
    if (line.transaction_type === "Order") continue;

    const amount = Number(line.amount);
    if (!Number.isFinite(amount)) continue;

    const currency = (line.currency || "USD").trim().toUpperCase() || "USD";
    currencies.add(currency);

    totalFees += amount;
    transactionCount += 1;

    if (line.fee_type) {
      const key = `${currency}\u0000${line.fee_type}`;
      const group = byFeeType.get(key) || { feeType: line.fee_type, currency, amount: 0, count: 0 };
      group.amount += amount;
      group.count += 1;
      byFeeType.set(key, group);
    }

    if (line.posted_at) {
      const key = `${currency}\u0000${line.posted_at}`;
      const group = byDate.get(key) || { date: line.posted_at, currency, amount: 0 };
      group.amount += amount;
      byDate.set(key, group);
    }

    if (line.product_id) {
      const key = `${currency}\u0000${line.product_id}`;
      const group = byProduct.get(key) || { productId: line.product_id, currency, sku: null, asin: null, amount: 0, count: 0 };
      if (group.sku === null && line.sku !== null) group.sku = line.sku;
      if (group.asin === null && line.asin !== null) group.asin = line.asin;
      group.amount += amount;
      group.count += 1;
      byProduct.set(key, group);
    }
  }

  const summaryCurrency = currencies.size === 1 ? Array.from(currencies)[0] : currencies.size > 1 ? "mixed" : null;

  return NextResponse.json({
    data: {
      summary: {
        totalFees: summaryCurrency === "mixed" ? null : roundCents(totalFees),
        transactionCount,
        currency: summaryCurrency,
      },
      byFeeType: Array.from(byFeeType.values())
        .sort((left, right) => left.feeType.localeCompare(right.feeType) || left.currency.localeCompare(right.currency))
        .map((group) => ({ feeType: group.feeType, currency: group.currency, amount: roundCents(group.amount), count: group.count })),
      byDate: Array.from(byDate.values())
        .sort((left, right) => left.date.localeCompare(right.date) || left.currency.localeCompare(right.currency))
        .map((group) => ({ date: group.date, currency: group.currency, amount: roundCents(group.amount) })),
      byProduct: Array.from(byProduct.entries())
        .sort(([, left], [, right]) => left.productId.localeCompare(right.productId) || left.currency.localeCompare(right.currency))
        .map(([, group]) => ({
          productId: group.productId,
          currency: group.currency,
          sku: group.sku,
          asin: group.asin,
          amount: roundCents(group.amount),
          count: group.count,
        })),
    },
  });
});
