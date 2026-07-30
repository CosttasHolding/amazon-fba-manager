export const dynamic = "force-dynamic";

import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { getOrgId } from "@/lib/api-handler";
import { apiErrorResponse } from "@/lib/api-utils";

export async function POST(req: NextRequest) {
  try {
    const supabase = await createClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) return NextResponse.json({ error: "No autorizado" }, { status: 401 });

    const orgId = await getOrgId(supabase, user.id, req);
    if (!orgId) return NextResponse.json({ error: "No hay organización activa" }, { status: 400 });

    const body = await req.json();
    const { products, mode, page_type, search_keyword } = body;

    if (!Array.isArray(products) || products.length === 0) {
      return NextResponse.json({ error: "Se requiere un array de productos" }, { status: 400 });
    }

    const records = products.map((p: Record<string, unknown>) => ({
      user_id: user.id,
      org_id: orgId,
      name: String(p.title ?? "Unknown"),
      asin_reference: String(p.asin ?? ""),
      amazon_category: String(p.category ?? ""),
      estimated_monthly_sales: p.estimated_monthly_sales != null ? Number(p.estimated_monthly_sales) : null,
      average_price: p.price != null ? Number(p.price) : null,
      review_count_competitor: p.review_count != null ? Number(p.review_count) : null,
      average_rating: p.average_rating != null ? Number(p.average_rating) : null,
      bsr: p.bsr != null ? Number(p.bsr) : null,
      source: "capture",
      status: "idea",
      priority: 3,
      source_data: {
        ...p,
        capture_mode: mode,
        page_type,
        search_keyword,
        captured_at: p.capture_timestamp,
      },
    }));

    const { data, error } = await supabase
      .from("product_research")
      .insert(records)
      .select();

    if (error) {
      return NextResponse.json({ error: "Error al guardar", details: error.message }, { status: 500 });
    }

    return NextResponse.json({ data, count: data?.length ?? 0 }, { status: 201 });
  } catch (error) {
    return apiErrorResponse(error, 500, "POST /api/research/capture");
  }
}
