import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

function parseSort(sort: string | null): { column: string; ascending: boolean } {
  switch (sort) {
    case "name_asc": return { column: "name", ascending: true };
    case "name_desc": return { column: "name", ascending: false };
    case "stock_asc": return { column: "stock_available", ascending: true };
    case "stock_desc": return { column: "stock_available", ascending: false };
    case "available_asc": return { column: "stock_available", ascending: true };
    case "available_desc": return { column: "stock_available", ascending: false };
    case "days_asc": return { column: "days_of_stock", ascending: true };
    case "days_desc": return { column: "days_of_stock", ascending: false };
    default: return { column: "name", ascending: true };
  }
}

export async function GET(req: NextRequest) {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const { searchParams } = new URL(req.url);
    const search = searchParams.get("search") || "";
    const stockStatus = searchParams.get("stockStatus");
    const availableMin = searchParams.get("availableMin");
    const availableMax = searchParams.get("availableMax");
    const sort = searchParams.get("sort");
    const page = Math.max(1, parseInt(searchParams.get("page") || "1") || 1);
    const perPage = Math.min(200, Math.max(1, parseInt(searchParams.get("perPage") || "20") || 20));

    let query = supabase
      .from("products_with_inventory")
      .select("*", { count: "exact" })
      .eq("user_id", user.id);

    if (search) {
      const cleanSearch = search.replace(/[%_]/g, '\\$&');
      query = query.or(`sku.ilike.%${cleanSearch}%,name.ilike.%${cleanSearch}%`);
    }
    if (stockStatus) query = query.eq("stock_status", stockStatus);
    if (availableMin !== null && availableMin !== "") query = query.gte("stock_available", parseFloat(availableMin));
    if (availableMax !== null && availableMax !== "") query = query.lte("stock_available", parseFloat(availableMax));

    const { column, ascending } = parseSort(sort);
    const { data, count, error } = await query
      .range((page - 1) * perPage, page * perPage - 1)
      .order(column, { ascending });

    if (error) throw error;

    return NextResponse.json({
      data,
      pagination: {
        total: count || 0,
        page,
        perPage,
        totalPages: Math.ceil((count || 0) / perPage),
      },
    });
  } catch (err) {
    return NextResponse.json({ error: "Error interno del servidor" }, { status: 500 });
  }
}
