import { NextRequest, NextResponse } from "next/server";
import { createApiHandler, buildPagination, paginatedResponse } from "@/lib/api-handler";
import { parseSort, INVENTORY_SORT_MAP, INVENTORY_DEFAULT_SORT } from "@/lib/sort-parser";

export const GET = createApiHandler(async ({ supabase, orgId, req }) => {
  if (!orgId) return NextResponse.json({ error: "No hay organización activa" }, { status: 400 });
  const { searchParams } = new URL(req.url);
  const search = searchParams.get("search") || "";
  const stockStatus = searchParams.get("stockStatus");
  const availableMin = searchParams.get("availableMin");
  const availableMax = searchParams.get("availableMax");
  const sort = searchParams.get("sort");
  const { page, perPage, from, to } = buildPagination(req);

  let query = supabase
    .from("products_with_inventory")
    .select("*", { count: "planned" })
    .eq("org_id", orgId);

  if (search) {
    const cleanSearch = search.replace(/[%_]/g, '\\$&');
    query = query.or(`sku.ilike.%${cleanSearch}%,name.ilike.%${cleanSearch}%`);
  }
  if (stockStatus) query = query.eq("stock_status", stockStatus);
  if (availableMin !== null && availableMin !== "") query = query.gte("stock_available", parseFloat(availableMin));
  if (availableMax !== null && availableMax !== "") query = query.lte("stock_available", parseFloat(availableMax));

  const { column, ascending } = parseSort(sort, INVENTORY_SORT_MAP, INVENTORY_DEFAULT_SORT);
  const { data, count, error } = await query
    .range(from, to)
    .order(column, { ascending });

  if (error) throw error;

  return NextResponse.json(paginatedResponse(data || [], count || 0, page, perPage));
});
