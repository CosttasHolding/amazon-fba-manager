import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { z } from "zod";

const salePostSchema = z.object({
  product_id: z.string().uuid(),
  sale_date: z.string().min(1),
  units_sold: z.coerce.number().int().min(1),
  revenue: z.coerce.number().min(0),
  amazon_fees: z.coerce.number().min(0).default(0),
  order_id: z.string().max(255).nullable().optional(),
});

function parseSort(sort: string | null): { column: string; ascending: boolean } {
  switch (sort) {
    case "date_asc": return { column: "sale_date", ascending: true };
    case "date_desc": return { column: "sale_date", ascending: false };
    case "revenue_asc": return { column: "revenue", ascending: true };
    case "revenue_desc": return { column: "revenue", ascending: false };
    case "profit_asc": return { column: "revenue", ascending: true };
    case "profit_desc": return { column: "revenue", ascending: false };
    case "units_asc": return { column: "units_sold", ascending: true };
    case "units_desc": return { column: "units_sold", ascending: false };
    default: return { column: "sale_date", ascending: false };
  }
}

export async function GET(req: NextRequest) {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { searchParams } = new URL(req.url);
    const page = Math.max(1, parseInt(searchParams.get("page") || "1") || 1);
    const limit = Math.min(200, Math.max(1, parseInt(searchParams.get("limit") || "50") || 50));
    const dateFrom = searchParams.get("dateFrom");
    const dateTo = searchParams.get("dateTo");
    const revenueMin = searchParams.get("revenueMin");
    const revenueMax = searchParams.get("revenueMax");
    const profitMin = searchParams.get("profitMin");
    const profitMax = searchParams.get("profitMax");
    const sort = searchParams.get("sort");
    const from = (page - 1) * limit;
    const to = from + limit - 1;

    let query = supabase
      .from("sales")
      .select("*, products(name, sku, unit_cost, total_cost, sale_price, fba_fee, referral_fee)", { count: "exact" })
      .eq("user_id", user.id);

    if (dateFrom) query = query.gte("sale_date", dateFrom);
    if (dateTo) query = query.lte("sale_date", dateTo);
    if (revenueMin !== null && revenueMin !== "") query = query.gte("revenue", parseFloat(revenueMin));
    if (revenueMax !== null && revenueMax !== "") query = query.lte("revenue", parseFloat(revenueMax));

    const { column, ascending } = parseSort(sort);
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

    // Apply profit filter in memory since it's computed
    let filtered = enriched;
    if (profitMin !== null && profitMin !== "") {
      const min = parseFloat(profitMin);
      filtered = filtered.filter((s) => (s.profit || 0) >= min);
    }
    if (profitMax !== null && profitMax !== "") {
      const max = parseFloat(profitMax);
      filtered = filtered.filter((s) => (s.profit || 0) <= max);
    }

    return NextResponse.json({ data: filtered, count, page, limit });
  } catch (err) {
    console.error("[GET /api/sales]", err);
    return NextResponse.json({ error: "Error interno del servidor" }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await req.json();
    const parse = salePostSchema.safeParse(body);
    if (!parse.success) {
      return NextResponse.json({ error: "Datos inv\u00E1lidos", details: parse.error.flatten().fieldErrors }, { status: 400 });
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
      .eq("user_id", user.id)
      .single();

    if (productError && productError.code !== "PGRST116") {
      return NextResponse.json({ error: productError.message }, { status: 500 });
    }
    if (!product) {
      return NextResponse.json({ error: "Producto no encontrado" }, { status: 404 });
    }

    const { data, error } = await supabase
      .from("sales")
      .insert({
        product_id: productId,
        user_id: user.id,
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
  } catch (err) {
    console.error("[POST /api/sales]", err);
    const message = err instanceof Error ? err.message : "Error desconocido";
    return NextResponse.json({ error: message }, { status: 400 });
  }
}
