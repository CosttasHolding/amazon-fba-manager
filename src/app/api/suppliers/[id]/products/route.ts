import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

interface RouteParams {
  params: Promise<{ id: string }>;
}

export async function GET(request: NextRequest, { params }: RouteParams) {
  try {
    const { id } = await params;
    const supabase = await createClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ error: "No autorizado" }, { status: 401 });
    }

    const { data, error } = await supabase
      .from("product_suppliers")
      .select(`
        id,
        unit_cost,
        moq,
        lead_time_days,
        is_primary,
        notes,
        created_at,
        products (
          id,
          name,
          sku,
          asin,
          sale_price,
          status
        )
      `)
      .eq("supplier_id", id)
      .eq("user_id", user.id);

    if (error) {
      console.error("Error fetching supplier products:", error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json(data);
  } catch (error) {
    console.error("Supplier products GET error:", error);
    return NextResponse.json(
      { error: "Error interno del servidor" },
      { status: 500 }
    );
  }
}