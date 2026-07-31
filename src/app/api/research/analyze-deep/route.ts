export const dynamic = "force-dynamic";

import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { analyzeProductDeep } from "@/lib/research/analyzer";

export async function POST(req: NextRequest) {
  try {
    const supabase = await createClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) return NextResponse.json({ error: "No autorizado" }, { status: 401 });

    const body = await req.json();
    const { asin, title, price, bsr, review_count, average_rating, estimated_monthly_sales, category, brand } = body;

    if (!asin || !title) {
      return NextResponse.json({ error: "ASIN y title son requeridos" }, { status: 400 });
    }

    const result = await analyzeProductDeep({
      asin, title, price, bsr, review_count, average_rating,
      estimated_monthly_sales, category, brand,
    });

    return NextResponse.json(result);
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Error en deep dive" },
      { status: 500 }
    );
  }
}
