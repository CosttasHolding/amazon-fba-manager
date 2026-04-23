import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export async function GET(req: NextRequest) {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const { searchParams } = new URL(req.url);
    const search = searchParams.get("search") || "";
    const stockStatus = searchParams.get("stockStatus");
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

    const { data, count, error } = await query.range((page - 1) * perPage, page * perPage - 1);
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
    const message = err instanceof Error ? err.message : "Error desconocido";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
