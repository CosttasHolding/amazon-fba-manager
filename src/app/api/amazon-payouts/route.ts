export const dynamic = "force-dynamic";

import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { payoutSchema } from "@/validations/payout";

export async function GET(req: NextRequest) {
  try {
    const supabase = await createClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) return NextResponse.json({ error: "No autorizado" }, { status: 401 });

    const { data: profile } = await supabase.from("profiles").select("org_id").eq("id", user.id).single();
    const orgId = profile?.org_id;
    if (!orgId) return NextResponse.json({ error: "No hay organización activa" }, { status: 400 });

    const { searchParams } = new URL(req.url);
    const year = searchParams.get("year");
    const page = Math.max(1, parseInt(searchParams.get("page") || "1"));
    const limit = Math.min(200, Math.max(1, parseInt(searchParams.get("limit") || "50")));
    const from = (page - 1) * limit;
    const to = from + limit - 1;

    let query = supabase.from("amazon_payouts").select("*", { count: "exact" }).eq("org_id", orgId).order("payout_period_start", { ascending: false }).range(from, to);
    if (year) {
      query = query.gte("payout_period_start", year + "-01-01").lte("payout_period_end", year + "-12-31");
    }

    const { data, error, count } = await query;
    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    return NextResponse.json({ data: data || [], count, page, limit });
  } catch { return NextResponse.json({ error: "Error interno" }, { status: 500 }); }
}

export async function POST(req: NextRequest) {
  try {
    const supabase = await createClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) return NextResponse.json({ error: "No autorizado" }, { status: 401 });

    const { data: profile } = await supabase.from("profiles").select("org_id").eq("id", user.id).single();
    const orgId = profile?.org_id;
    if (!orgId) return NextResponse.json({ error: "No hay organización activa" }, { status: 400 });

    const body = await req.json();
    const result = payoutSchema.safeParse(body);
    if (!result.success) return NextResponse.json({ error: "Datos invalidos", details: result.error.flatten().fieldErrors }, { status: 400 });

    const clean = { ...result.data, user_id: user.id, org_id: orgId };
    const { data, error } = await supabase.from("amazon_payouts").insert(clean).select().single();
    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    return NextResponse.json(data, { status: 201 });
  } catch { return NextResponse.json({ error: "Error interno" }, { status: 500 }); }
}
