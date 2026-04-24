import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export async function GET(req: NextRequest) {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const { data, error } = await supabase
      .from("products_with_inventory")
      .select("stock_available, stock_inbound, stock_warehouse, stock_status")
      .eq("user_id", user.id);

    if (error) throw error;

    const rows = data || [];
    const totalCount = rows.length;
    const totalUnits = rows.reduce((sum, r) => sum + (r.stock_available || 0) + (r.stock_inbound || 0) + (r.stock_warehouse || 0), 0);
    const lowStockCount = rows.filter((r) => r.stock_status === "low_stock").length;
    const outOfStockCount = rows.filter((r) => r.stock_status === "out_of_stock").length;
    const overstockCount = rows.filter((r) => r.stock_status === "overstock").length;

    return NextResponse.json({
      totalCount,
      totalUnits,
      lowStockCount,
      outOfStockCount,
      overstockCount,
    });
  } catch (err) {
    console.error("[GET /api/inventory/summary]", err);
    return NextResponse.json({ error: "Error interno del servidor" }, { status: 500 });
  }
}
