import { NextRequest, NextResponse } from "next/server";
import { createServiceRoleClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";
export const maxDuration = 120;

function verifyAuth(req: NextRequest): boolean {
  const automationSecret = req.headers.get("x-automation-secret");
  const expectedAutomationSecret = process.env.AUTOMATION_SECRET;
  if (expectedAutomationSecret && automationSecret === expectedAutomationSecret) return true;

  const authHeader = req.headers.get("authorization");
  const expectedCronSecret = process.env.CRON_SECRET;
  if (expectedCronSecret && authHeader === `Bearer ${expectedCronSecret}`) return true;

  return false;
}

interface ProductRow {
  id: string;
  name: string;
  sku: string;
  sale_price: number | null;
  net_profit: number | null;
  stock_available: number;
  stock_status: string;
  sales_velocity_30d: number | null;
}

export async function GET(req: NextRequest) {
  if (!verifyAuth(req)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const supabase = createServiceRoleClient();

    const summaries: Record<string, {
      revenue_this_month: number;
      revenue_last_month: number;
      units_sold: number;
      avg_roi: number;
      net_margin: number;
      top_products: { name: string; sku: string; revenue: number; margin: number }[];
      active_alerts: number;
    }> = {};

    const { data: memberships } = await supabase
      .from("org_members")
      .select("user_id, org_id")
      .eq("status", "active");

    for (const membership of memberships || []) {
      const orgId = membership.org_id;
      if (!orgId) continue;

      const now = new Date();
      const startOfThisMonth = new Date(now.getFullYear(), now.getMonth(), 1).toISOString();
      const startOfLastMonth = new Date(now.getFullYear(), now.getMonth() - 1, 1).toISOString();
      const endOfLastMonth = new Date(now.getFullYear(), now.getMonth(), 0).toISOString();

      // Sales this month
      const { data: salesThisMonth } = await supabase
        .from("sales")
        .select("revenue, units_sold, net_profit")
        .eq("org_id", orgId)
        .gte("sale_date", startOfThisMonth);

      // Sales last month
      const { data: salesLastMonth } = await supabase
        .from("sales")
        .select("revenue, units_sold, net_profit")
        .eq("org_id", orgId)
        .gte("sale_date", startOfLastMonth)
        .lte("sale_date", endOfLastMonth);

      const revenueThisMonth = (salesThisMonth || []).reduce(
        (sum: number, s: Record<string, unknown>) => sum + ((s.revenue as number) || 0), 0
      );
      const revenueLastMonth = (salesLastMonth || []).reduce(
        (sum: number, s: Record<string, unknown>) => sum + ((s.revenue as number) || 0), 0
      );
      const unitsSold = (salesThisMonth || []).reduce(
        (sum: number, s: Record<string, unknown>) => sum + ((s.units_sold as number) || 0), 0
      );
      const totalProfit = (salesThisMonth || []).reduce(
        (sum: number, s: Record<string, unknown>) => sum + ((s.net_profit as number) || 0), 0
      );
      const netMargin = revenueThisMonth > 0 ? (totalProfit / revenueThisMonth) * 100 : 0;

      // Top products by revenue
      const productRevenue: Record<string, { name: string; sku: string; revenue: number; margin: number }> = {};
      for (const s of salesThisMonth || []) {
        const row = s as Record<string, unknown>;
        const pid = row.product_id as string;
        if (!pid) continue;
        if (!productRevenue[pid]) {
          productRevenue[pid] = { name: row.product_name as string || "", sku: row.product_sku as string || "", revenue: 0, margin: 0 };
        }
        productRevenue[pid].revenue += (row.revenue as number) || 0;
      }
      const topProducts = Object.values(productRevenue)
        .sort((a, b) => b.revenue - a.revenue)
        .slice(0, 5);

      // Active alerts count
      const { count: activeAlerts } = await supabase
        .from("notifications")
        .select("id", { count: "exact", head: true })
        .eq("org_id", orgId)
        .eq("read", false);

      summaries[`${orgId}:${membership.user_id}`] = {
        revenue_this_month: revenueThisMonth,
        revenue_last_month: revenueLastMonth,
        units_sold: unitsSold,
        avg_roi: revenueThisMonth > 0 ? (totalProfit / revenueThisMonth) * 100 : 0,
        net_margin: netMargin,
        top_products: topProducts,
        active_alerts: activeAlerts || 0,
      };
    }

    return NextResponse.json(summaries);
  } catch (err) {
    return NextResponse.json({ error: "Error interno del servidor" }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  return GET(req);
}
