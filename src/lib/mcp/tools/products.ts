import type { ToolModule, HandlerContext } from "../types";
import { registerTool } from "../server";

const productsTool: ToolModule = {
  definition: {
    name: "get_products",
    description: "Lista productos con filtros y paginación",
    inputSchema: {
      type: "object",
      properties: {
        search: { type: "string", description: "Búsqueda por SKU o nombre" },
        status: { type: "string", description: "Filtrar por estado: active, inactive, discontinued" },
        stockStatus: { type: "string", description: "Filtrar por stock: normal, low_stock, out_of_stock, overstock" },
        limit: { type: "number", description: "Máximo de resultados (default 20, max 200)" },
        offset: { type: "number", description: "Offset para paginación (default 0)" },
      },
    },
  },
  handler: async (args, ctx) => {
    const { supabase, orgId } = ctx;
    const search = String(args.search ?? "");
    const status = String(args.status ?? "");
    const stockStatus = String(args.stockStatus ?? "");
    const limit = Math.min(200, Math.max(1, Number(args.limit) || 20));
    const offset = Math.max(0, Number(args.offset) || 0);

    let query = supabase
      .from("products_with_inventory")
      .select("*", { count: "exact" })
      .eq("org_id", orgId);

    if (search) {
      const clean = search.replace(/[%_]/g, "\\$&");
      query = query.or(`sku.ilike.%${clean}%,name.ilike.%${clean}%`);
    }
    if (status) query = query.eq("status", status);
    if (stockStatus) query = query.eq("stock_status", stockStatus);

    const { data, count, error } = await query
      .order("name", { ascending: true })
      .range(offset, offset + limit - 1);

    if (error) throw error;

    return { data: data || [], total: count || 0 };
  },
};

registerTool(productsTool);

const productBySkuTool: ToolModule = {
  definition: {
    name: "get_product_by_sku",
    description: "Obtiene detalle completo de un producto por SKU",
    inputSchema: {
      type: "object",
      properties: {
        sku: { type: "string", description: "SKU del producto" },
      },
      required: ["sku"],
    },
  },
  handler: async (args, ctx) => {
    const { supabase, orgId } = ctx;
    const sku = String(args.sku ?? "");

    const { data, error } = await supabase
      .from("products_with_inventory")
      .select("*")
      .eq("org_id", orgId)
      .eq("sku", sku)
      .single();

    if (error && error.code !== "PGRST116") throw error;

    return data || null;
  },
};

registerTool(productBySkuTool);
