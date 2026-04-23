import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { z } from "zod";

const returnSchema = z.object({
  product_id: z.string().uuid(),
  order_id: z.string().max(100).nullable().optional(),
  amazon_return_id: z.string().max(100).nullable().optional(),
  quantity: z.coerce.number().int().positive("Cantidad requerida"),
  return_reason: z.enum(["defective","damaged_by_carrier","customer_damaged","different_from_description","expired_item","fraud","missing_parts","no_longer_wanted","not_as_described","ordered_wrong_item","quality_not_acceptable","arrived_late","undeliverable","unauthorized_purchase","other"]).nullable().optional(),
  customer_comment: z.string().max(1000).nullable().optional(),
  refund_amount: z.coerce.number().min(0).nullable().optional(),
  status: z.enum(["requested","received_at_customer","in_transit","received_at_fc","inspected","refunded","reimbursed","disposed"]).default("requested"),
  disposition: z.enum(["sellable","unsellable","pending"]).nullable().optional(),
  return_date: z.string().nullable().optional(),
  notes: z.string().max(2000).nullable().optional(),
});

export async function GET(req: NextRequest) {
  try {
    const supabase = await createClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) return NextResponse.json({ error: "No autorizado" }, { status: 401 });

    const { searchParams } = new URL(req.url);
    const status = searchParams.get("status");
    const page = Math.max(1, parseInt(searchParams.get("page") || "1"));
    const limit = Math.min(200, Math.max(1, parseInt(searchParams.get("limit") || "50")));
    const from = (page - 1) * limit;
    const to = from + limit - 1;

    let query = supabase.from("returns").select("*, products(name, sku)", { count: "exact" }).eq("user_id", user.id).order("return_date", { ascending: false }).range(from, to);
    if (status) query = query.eq("status", status);
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

    const body = await req.json();
    const result = returnSchema.safeParse(body);
    if (!result.success) return NextResponse.json({ error: "Datos invalidos", details: result.error.flatten().fieldErrors }, { status: 400 });

    const clean = { ...result.data, user_id: user.id };
    const { data, error } = await supabase.from("returns").insert(clean).select().single();
    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    return NextResponse.json(data, { status: 201 });
  } catch { return NextResponse.json({ error: "Error interno" }, { status: 500 }); }
}
