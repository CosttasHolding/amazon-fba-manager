import { createClient } from "@/lib/supabase/server";

interface ForecastSuggestion {
  product_id: string;
  sku: string;
  name: string;
  stock_available: number;
  sales_velocity_30d: number;
  daily_velocity: number;
  days_of_stock: number;
  lead_time_days: number;
  reorder_point: number;
  suggested_qty: number;
  supplier_name: string | null;
  urgency: "critical" | "warning" | "ok";
}

interface ProductRow {
  id: string;
  sku: string;
  name: string;
  stock_available: number;
  sales_velocity_30d: number;
  product_suppliers: Record<string, unknown>[] | null;
}

export async function getForecastSuggestions(
  userId: string,
  supabase: Awaited<ReturnType<typeof createClient>>
): Promise<ForecastSuggestion[]> {
  const { data: products, error: productsError } = await supabase
    .from("products_with_inventory")
    .select("*, product_suppliers(lead_time_days, unit_cost, suppliers(name))")
    .eq("user_id", userId)
    .eq("status", "active");

  if (productsError) throw productsError;

  const allProducts = (products || []) as ProductRow[];

  const suggestions = allProducts.map((p) => {
    const stock = p.stock_available || 0;
    const velocity = p.sales_velocity_30d || 0;
    const dailyVelocity = velocity / 30;
    const daysOfStock = dailyVelocity > 0 ? Math.round(stock / dailyVelocity) : 999;
    const supplier = (p.product_suppliers || [])[0];
    const leadTime = (supplier?.lead_time_days as number) || 30;
    const safetyStock = Math.ceil(dailyVelocity * leadTime * 0.5);
    const reorderPoint = Math.ceil(dailyVelocity * leadTime) + safetyStock;
    const suggestedQty = Math.max(0, reorderPoint - stock);
    const urgency: "critical" | "warning" | "ok" = daysOfStock <= leadTime
      ? "critical"
      : daysOfStock <= leadTime * 2
      ? "warning"
      : "ok";

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
      supplier_name: (supplier?.suppliers as Record<string, string>)?.name ?? null,
      urgency,
    };
  })
    .filter((s) => s.urgency !== "ok" || s.suggested_qty > 0)
    .sort((a, b) => a.days_of_stock - b.days_of_stock);

  return suggestions;
}
