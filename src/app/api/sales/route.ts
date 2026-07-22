import { NextRequest, NextResponse } from "next/server";
import { createApiHandler, buildPagination, paginatedResponse } from "@/lib/api-handler";
import { z } from "zod";
import { parseSalesSort } from "@/lib/sort-parser";

const salePostSchema = z.object({
  product_id: z.string().uuid(),
  sale_date: z.string().min(1),
  units_sold: z.coerce.number().int().min(1),
  revenue: z.coerce.number().min(0),
  amazon_fees: z.coerce.number().min(0).default(0),
  order_id: z.string().max(255).nullable().optional(),
});

export const GET = createApiHandler(async ({ supabase, orgId, req }) => {
  if (!orgId) return NextResponse.json({ error: "No hay organización activa" }, { status: 400 });
  const { searchParams } = new URL(req.url);
  const { page, perPage, from, to } = buildPagination(req, 50);
  const dateFrom = searchParams.get("dateFrom");
  const dateTo = searchParams.get("dateTo");
  const revenueMin = searchParams.get("revenueMin");
  const revenueMax = searchParams.get("revenueMax");
  const profitMin = searchParams.get("profitMin");
  const profitMax = searchParams.get("profitMax");
  const sort = searchParams.get("sort");

  let query = supabase
    .from("sales")
    .select("*, products(name, sku, unit_cost, total_cost, sale_price, fba_fee, referral_fee)", { count: "planned" })
    .eq("org_id", orgId);

  if (dateFrom) query = query.gte("sale_date", dateFrom);
  if (dateTo) query = query.lte("sale_date", dateTo);
  if (revenueMin !== null && revenueMin !== "") query = query.gte("revenue", parseFloat(revenueMin));
  if (revenueMax !== null && revenueMax !== "") query = query.lte("revenue", parseFloat(revenueMax));

  const { column, ascending, memorySort } = parseSalesSort(sort);
  const { data, error, count } = await query
    .order(column, { ascending })
    .range(from, to);

  if (error) throw error;

  const enriched = (data || []).map((s) => {
    const row = s as Record<string, unknown>;
    const prod = row.products as { total_cost?: number; unit_cost?: number } | null;
    const unitCost = prod ? (prod.total_cost || prod.unit_cost || 0) : 0;
    const unitsSold = (row.units_sold as number) || 0;
    const revenue = (row.revenue as number) || 0;
    const amazonFees = (row.amazon_fees as number) || 0;
    const cost = unitsSold * unitCost;
    const profit = revenue - amazonFees - cost;
    return {
      ...row,
      cost: Math.round(cost * 100) / 100,
      profit: Math.round(profit * 100) / 100,
    };
  });

  let filtered = enriched;
  if (profitMin !== null && profitMin !== "") {
    const min = parseFloat(profitMin);
    filtered = filtered.filter((s) => (s.profit || 0) >= min);
  }
  if (profitMax !== null && profitMax !== "") {
    const max = parseFloat(profitMax);
    filtered = filtered.filter((s) => (s.profit || 0) <= max);
  }

  if (memorySort) {
    const dir = memorySort === "profit_asc" ? 1 : -1;
    filtered.sort((a, b) => ((a.profit || 0) - (b.profit || 0)) * dir);
  }

  return NextResponse.json(paginatedResponse(filtered, count || 0, page, perPage));
});

export const POST = createApiHandler(async ({ supabase, user, orgId, req }) => {
  if (!orgId) return NextResponse.json({ error: "No hay organización activa" }, { status: 400 });
  const body = await req.json();
  const parse = salePostSchema.safeParse(body);
  if (!parse.success) {
    return NextResponse.json({ error: "Datos inválidos", details: parse.error.flatten().fieldErrors }, { status: 400 });
  }

  const { product_id: productId, sale_date: saleDate, units_sold: unitsSold, revenue, amazon_fees: amazonFees, order_id: orderId } = parse.data;

  if (revenue <= 0) {
    return NextResponse.json(
      { error: "El revenue debe ser mayor a 0" },
      { status: 400 }
    );
  }

  const { data: product, error: productError } = await supabase
    .from("products")
    .select("id")
    .eq("id", productId)
    .eq("org_id", orgId)
    .single();

  if (productError && productError.code !== "PGRST116") {
    return NextResponse.json({ error: "Error al verificar producto" }, { status: 500 });
  }
  if (!product) {
    return NextResponse.json({ error: "Producto no encontrado" }, { status: 404 });
  }

  const { data, error } = await supabase
    .from("sales")
    .insert({
      product_id: productId,
      user_id: user.id,
      org_id: orgId,
      sale_date: saleDate,
      units_sold: unitsSold,
      revenue: revenue,
      amazon_fees: amazonFees,
      order_id: orderId,
      source: "manual",
    })
    .select("*, products(name, sku)")
    .single();

  if (error) throw error;

  return NextResponse.json({ data }, { status: 201 });
});
