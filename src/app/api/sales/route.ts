import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export async function GET(req: NextRequest) {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { data, error } = await supabase
      .from("sales")
      .select("*, products(name, sku, unit_cost, total_cost, sale_price, fba_fee, referral_fee)")
      .eq("user_id", user.id)
      .order("sale_date", { ascending: false })
      .limit(500);

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

    return NextResponse.json({ data: enriched });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Error desconocido";
    return NextResponse.json({ error: message }, { status: 500 });
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

    const productId = body.product_id || body.productId;
    const saleDate = body.sale_date || body.saleDate;
    const unitsSold = parseInt(body.units_sold || body.unitsSold || "0");
    const revenue = parseFloat(body.revenue || "0");
    const amazonFees = parseFloat(body.amazon_fees || body.amazonFees || "0");
    const orderId = body.order_id || body.orderId || null;

    if (!productId || !saleDate || !unitsSold || unitsSold <= 0) {
      return NextResponse.json(
        { error: "Producto, fecha y unidades son requeridos" },
        { status: 400 }
      );
    }

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
    const message = err instanceof Error ? err.message : "Error desconocido";
    return NextResponse.json({ error: message }, { status: 400 });
  }
}
