import type { ToolModule, HandlerContext } from "../types";
import { registerTool } from "../server";
import { getForecastSuggestions } from "@/lib/forecasting";

function calcDaysOfStock(stock: number, velocity30d: number): number {
  const daily = velocity30d / 30;
  return daily > 0 ? Math.round(stock / daily) : 999;
}

function calcUrgency(daysOfStock: number, leadTime: number): "critical" | "warning" | "ok" {
  return daysOfStock <= leadTime ? "critical" : daysOfStock <= leadTime * 2 ? "warning" : "ok";
}

const inventoryAlertsTool: ToolModule = {
  definition: {
    name: "get_inventory_alerts",
    description: "Productos con stock por debajo del reorder point",
    inputSchema: {
      type: "object",
      properties: {
        severity: {
          type: "string",
          description: "Filtrar por severidad: critical (stock < 50% reorder_point) o warning (stock < 100%)",
          enum: ["critical", "warning"],
        },
      },
    },
  },
  handler: async (args, ctx) => {
    const { supabase, orgId } = ctx;
    const severity = String(args.severity ?? "");

    const { data, error } = await supabase
      .from("products_with_inventory")
      .select("id,sku,name,stock_available,reorder_point,sales_velocity_30d")
      .eq("org_id", orgId)
      .eq("status", "active");

    if (error) throw error;

    const products = (data || []) as {
      id: string;
      sku: string;
      name: string;
      stock_available: number;
      reorder_point: number;
      sales_velocity_30d: number;
    }[];

    const alerts = products
      .filter((p) => p.reorder_point > 0 && p.stock_available <= p.reorder_point)
      .map((p) => {
        const daily = (p.sales_velocity_30d || 0) / 30;
        const dos = calcDaysOfStock(p.stock_available, p.sales_velocity_30d || 0);
        const urgency = calcUrgency(dos, 30);
        return {
          sku: p.sku,
          name: p.name,
          stock_available: p.stock_available,
          reorder_point: p.reorder_point,
          days_of_stock: dos,
          daily_velocity: Number(daily.toFixed(2)),
          urgency,
        };
      })
      .filter((a) => !severity || a.urgency === severity)
      .sort((a, b) => a.days_of_stock - b.days_of_stock);

    return { alerts };
  },
};

registerTool(inventoryAlertsTool);

const reorderRecommendationsTool: ToolModule = {
  definition: {
    name: "get_reorder_recommendations",
    description: "Recomendaciones de reorden para productos activos",
    inputSchema: {
      type: "object",
      properties: {
        limit: { type: "number", description: "Máximo de recomendaciones (default 20)" },
      },
    },
  },
  handler: async (args, ctx) => {
    const limit = Math.max(1, Number(args.limit) || 20);
    const suggestions = await getForecastSuggestions(ctx.userId, ctx.orgId, ctx.supabase);
    return { recommendations: suggestions.slice(0, limit) };
  },
};

registerTool(reorderRecommendationsTool);
