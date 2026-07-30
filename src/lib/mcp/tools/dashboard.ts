import type { ToolModule, HandlerContext } from "../types";
import { registerTool } from "../server";

const dashboardTool: ToolModule = {
  definition: {
    name: "get_dashboard_kpi",
    description: "KPIs principales: revenue 30d, unidades vendidas, productos activos",
    inputSchema: {
      type: "object",
      properties: {},
    },
  },
  handler: async (_args, ctx) => {
    const { supabase, orgId } = ctx;

    const [productResult, salesResult] = await Promise.all([
      supabase
        .from("products_with_inventory")
        .select("id,sku,name,status,sale_price,net_profit,roi,stock_available,sales_velocity_30d,reorder_point,unit_cost,category,revenue_last_30d")
        .eq("org_id", orgId)
        .order("net_profit", { ascending: false })
        .limit(500),
      supabase
        .from("sales")
        .select("sale_date,revenue,units_sold,product_id")
        .eq("org_id", orgId)
        .gte("sale_date", new Date(Date.now() - 84 * 86400000).toISOString().split("T")[0]),
    ]);

    if (productResult.error) throw productResult.error;
    if (salesResult.error) throw salesResult.error;

    const allProducts = (productResult.data || []) as Record<string, unknown>[];
    const sales = (salesResult.data || []) as Record<string, unknown>[];

    const activeProducts = allProducts.filter((p) => p.status === "active");

    const sixtyDaysAgo = new Date(Date.now() - 60 * 86400000).toISOString().split("T")[0];
    const recentSales = sales.filter((s) => String(s.sale_date) >= sixtyDaysAgo);

    const revenue30d = recentSales.reduce((sum, s) => sum + Number(s.revenue || 0), 0);
    const unitsSold30d = recentSales.reduce((sum, s) => sum + Number(s.units_sold || 0), 0);

    const topProducts = activeProducts
      .slice(0, 5)
      .map((p) => ({
        id: p.id,
        name: p.name,
        sku: p.sku,
        sale_price: p.sale_price,
        net_profit: p.net_profit,
        roi: p.roi,
        stock_available: p.stock_available,
        sales_velocity_30d: p.sales_velocity_30d,
      }));

    return {
      revenue_30d: revenue30d,
      units_sold_30d: unitsSold30d,
      active_products: activeProducts.length,
      top_products: topProducts,
    };
  },
};

registerTool(dashboardTool);
