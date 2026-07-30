import type { ToolModule, HandlerContext } from "../types";
import { registerTool } from "../server";

const profitabilityTool: ToolModule = {
  definition: {
    name: "get_profitability",
    description: "Resumen de rentabilidad: mejores y peores SKUs por ROI y margen",
    inputSchema: {
      type: "object",
      properties: {
        top: { type: "number", description: "Cuantos productos devolver (default 10)" },
      },
    },
  },
  handler: async (args, ctx) => {
    const { supabase, orgId } = ctx;
    const top = Math.max(1, Math.min(100, Number(args.top) || 10));

    const { data, error } = await supabase
      .from("products_with_inventory")
      .select("id,sku,name,status,sale_price,unit_cost,net_profit,roi,margin,revenue_last_30d")
      .eq("org_id", orgId)
      .eq("status", "active");

    if (error) throw error;

    const products = (data || []).filter((p: Record<string, unknown>) => p.roi !== null);

    const byRoi = [...products].sort(
      (a: Record<string, unknown>, b: Record<string, unknown>) => Number(b.roi) - Number(a.roi)
    );
    const byMargin = [...products].sort(
      (a: Record<string, unknown>, b: Record<string, unknown>) => Number(b.margin) - Number(a.margin)
    );

    return {
      topByRoi: byRoi.slice(0, top),
      topByMargin: byMargin.slice(0, top),
      bottomByRoi: byRoi.reverse().slice(0, top),
    };
  },
};

registerTool(profitabilityTool);
