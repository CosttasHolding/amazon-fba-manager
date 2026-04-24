import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export async function GET(req: NextRequest) {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const { data, error } = await supabase
      .from("sales")
      .select("revenue, units_sold, amazon_fees, products(unit_cost, total_cost)")
      .eq("user_id", user.id);

    if (error) throw error;

    const rows = data || [];
    let totalRevenue = 0;
    let totalUnits = 0;
    let totalFees = 0;
    let totalProfit = 0;

    for (const s of rows) {
      const revenue = (s.revenue as number) || 0;
      const units = (s.units_sold as number) || 0;
      const fees = (s.amazon_fees as number) || 0;
      const prod = s.products as { unit_cost?: number; total_cost?: number } | null;
      const unitCost = prod ? (prod.total_cost || prod.unit_cost || 0) : 0;
      const cost = units * unitCost;
      const profit = revenue - fees - cost;

      totalRevenue += revenue;
      totalUnits += units;
      totalFees += fees;
      totalProfit += profit;
    }

    return NextResponse.json({
      totalRevenue: Math.round(totalRevenue * 100) / 100,
      totalUnits,
      totalFees: Math.round(totalFees * 100) / 100,
      totalProfit: Math.round(totalProfit * 100) / 100,
    });
  } catch (err) {
    console.error("[GET /api/sales/summary]", err);
    return NextResponse.json({ error: "Error interno del servidor" }, { status: 500 });
  }
}
