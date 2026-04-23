import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { orderSchema } from "@/validations/order";

export async function GET(req: NextRequest) {
  try {
    const supabase = await createClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) return NextResponse.json({ error: "No autorizado" }, { status: 401 });

    const { searchParams } = new URL(req.url);
    const status = searchParams.get("status");
    let query = supabase.from("purchase_orders").select("*, suppliers(name), products(name, sku)").eq("user_id", user.id).order("created_at", { ascending: false });
    if (status) query = query.eq("status", status);
    const { data, error } = await query;
    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    return NextResponse.json(data || []);
  } catch { return NextResponse.json({ error: "Error interno" }, { status: 500 }); }
}

export async function POST(req: NextRequest) {
  try {
    const supabase = await createClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) return NextResponse.json({ error: "No autorizado" }, { status: 401 });

    const body = await req.json();
    const result = orderSchema.safeParse(body);
    if (!result.success) return NextResponse.json({ error: "Datos inválidos", details: result.error.flatten().fieldErrors }, { status: 400 });

    const clean = { ...result.data, user_id: user.id };
    const { data, error } = await supabase.from("purchase_orders").insert(clean).select().single();
    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    return NextResponse.json(data, { status: 201 });
  } catch { return NextResponse.json({ error: "Error interno" }, { status: 500 }); }
}
