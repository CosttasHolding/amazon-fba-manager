export const dynamic = "force-dynamic";

import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

interface RouteParams {
  params: { id: string };
}

export async function GET(request: NextRequest, { params }: RouteParams) {
  try {
    const { id } = params;
    const supabase = await createClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ error: "No autorizado" }, { status: 401 });
    }

    const orgId = user.user_metadata?.org_id as string;
    if (!orgId) return NextResponse.json({ error: "No hay organización activa" }, { status: 400 });

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
      .eq("org_id", orgId);

    if (error) {
      return NextResponse.json({ error: "Error interno del servidor" }, { status: 500 });
    }

    return NextResponse.json(data);
  } catch (error) {
    return NextResponse.json(
      { error: "Error interno del servidor" },
      { status: 500 }
    );
  }
}