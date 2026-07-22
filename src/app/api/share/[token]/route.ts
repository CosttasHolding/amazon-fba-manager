export const dynamic = "force-dynamic";

import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export async function GET(req: NextRequest, { params }: { params: Promise<{ token: string }> }) {
  try {
    const { token } = await params;
    const supabase = await createClient();

    const { data: link, error: linkError } = await supabase
      .from("shared_links")
      .select("*")
      .eq("token", token)
      .eq("active", true)
      .single();

    if (linkError || !link) {
      return NextResponse.json({ error: "Link no encontrado o expirado" }, { status: 404 });
    }

    if (link.expires_at && new Date(link.expires_at) < new Date()) {
      return NextResponse.json({ error: "Link expirado" }, { status: 410 });
    }

    const { data: products } = await supabase
      .from("products_with_inventory")
      .select("id, name, sku, status, category, stock_available, stock_status, sales_velocity_30d, sale_price")
      .eq("user_id", link.user_id);

    const allProducts = products || [];
    const activeProducts = allProducts.filter((p) => p.status === "active");

    const now = new Date();
    const currentYear = now.getFullYear();
    const currentMonth = now.getMonth();
    const lastMonth = currentMonth === 0 ? 11 : currentMonth - 1;
    const lastMonthYear = currentMonth === 0 ? currentYear - 1 : currentYear;

    const currentMonthStart = `${currentYear}-${String(currentMonth + 1).padStart(2, "0")}-01`;
    const currentMonthEnd = `${currentYear}-${String(currentMonth + 1).padStart(2, "0")}-${String(new Date(currentYear, currentMonth + 1, 0).getDate()).padStart(2, "0")}`;
    const lastMonthStart = `${lastMonthYear}-${String(lastMonth + 1).padStart(2, "0")}-01`;
    const lastMonthEnd = `${lastMonthYear}-${String(lastMonth + 1).padStart(2, "0")}-${String(new Date(lastMonthYear, lastMonth + 1, 0).getDate()).padStart(2, "0")}`;

    const { data: allSales } = await supabase
      .from("sales")
      .select("sale_date, revenue, units_sold, product_id")
      .eq("user_id", link.user_id)
      .gte("sale_date", lastMonthStart)
      .order("sale_date", { ascending: true });

    const sales = allSales || [];
    const currentMonthSales = sales.filter((s) => s.sale_date >= currentMonthStart && s.sale_date <= currentMonthEnd);
    const lastMonthSales = sales.filter((s) => s.sale_date >= lastMonthStart && s.sale_date <= lastMonthEnd);

    const revenueCurrent = currentMonthSales.reduce((sum, s) => sum + (s.revenue || 0), 0);
    const revenueLast = lastMonthSales.reduce((sum, s) => sum + (s.revenue || 0), 0);
    const unitsCurrent = currentMonthSales.reduce((sum, s) => sum + (s.units_sold || 0), 0);
    const unitsLast = lastMonthSales.reduce((sum, s) => sum + (s.units_sold || 0), 0);

    const topProducts = activeProducts
      .sort((a, b) => (b.sales_velocity_30d || 0) - (a.sales_velocity_30d || 0))
      .slice(0, 5)
      .map((p) => ({
        name: p.name,
        sku: p.sku,
        sales_velocity_30d: p.sales_velocity_30d,
      }));

    const alertCount = allProducts.filter(
      (p) => p.stock_status === "low_stock" || p.stock_status === "out_of_stock"
    ).length;

    return NextResponse.json({
      title: link.title,
      metrics: {
        revenue_current_month: Math.round(revenueCurrent * 100) / 100,
        revenue_last_month: Math.round(revenueLast * 100) / 100,
        revenue_delta_pct: revenueLast > 0 ? Math.round(((revenueCurrent - revenueLast) / revenueLast) * 100 * 100) / 100 : 0,
        units_current_month: unitsCurrent,
        units_last_month: unitsLast,
        units_delta_pct: unitsLast > 0 ? Math.round(((unitsCurrent - unitsLast) / unitsLast) * 100 * 100) / 100 : 0,
        product_count: activeProducts.length,
        low_stock_count: alertCount,
      },
      topProducts,
    });
  } catch {
    return NextResponse.json({ error: "Error interno del servidor" }, { status: 500 });
  }
}
