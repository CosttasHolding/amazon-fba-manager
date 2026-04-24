import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export async function GET(req: NextRequest) {
  try {
    const supabase = await createClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) return NextResponse.json({ error: "No autorizado" }, { status: 401 });

    // Fetch products with inventory, sales velocity, and supplier lead times
    const { data: products, error: productsError } = await supabase
      .from("products_with_inventory")
      .select("*, product_suppliers(lead_time_days, unit_cost, suppliers(name))")
      .eq("user_id", user.id)
      .eq("status", "active");

    if (productsError) throw productsError;

    const suggestions = (products || []).map((p: Record<string, unknown>) => {
      const stock = (p.stock_available as number) || 0;
      const velocity = (p.sales_velocity_30d as number) || 0;
      const dailyVelocity = velocity / 30;
      const daysOfStock = dailyVelocity > 0 ? Math.round(stock / dailyVelocity) : 999;
      const supplier = (p.product_suppliers as Record<string, unknown>[] || [])[0];
      const leadTime = (supplier?.lead_time_days as number) || 30;
      const safetyStock = Math.ceil(dailyVelocity * leadTime * 0.5); // 50% buffer
      const reorderPoint = Math.ceil(dailyVelocity * leadTime) + safetyStock;
      const suggestedQty = Math.max(0, reorderPoint - stock);
      const urgency = daysOfStock <= leadTime ? "critical" : daysOfStock <= leadTime * 2 ? "warning" : "ok";

      return {
        product_id: p.id,
        sku: p.sku,
        name: p.name,
        stock_available: stock,
        sales_velocity_30d: velocity,
        daily_velocity: Number(dailyVelocity.toFixed(2)),
        days_of_stock: daysOfStock,
        lead_time_days: leadTime,
        reorder_point: reorderPoint,
        suggested_qty: suggestedQty,
        supplier_name: (supplier?.suppliers as Record<string, unknown>)?.name || null,
        urgency,
      };
    }).filter((s) => s.urgency !== "ok" || s.suggested_qty > 0)
      .sort((a, b) => a.days_of_stock - b.days_of_stock);

    return NextResponse.json(suggestions);
  } catch (err) {
    console.error("[GET /api/forecasting]", err);
    return NextResponse.json({ error: "Error interno del servidor" }, { status: 500 });
  }
}
