import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { z } from "zod";

const reimbursementSchema = z.object({
  product_id: z.string().uuid().nullable().optional(),
  return_id: z.string().uuid().nullable().optional(),
  amazon_case_id: z.string().max(100).nullable().optional(),
  reimbursement_type: z.enum(["lost_inbound","damaged_inbound","lost_warehouse","damaged_warehouse","customer_return","removal_order","other"]),
  quantity: z.coerce.number().int().positive("Cantidad requerida"),
  amount: z.coerce.number().positive("Monto requerido"),
  currency: z.string().max(3).default("USD"),
  status: z.enum(["pending","submitted","approved","rejected","paid"]).default("pending"),
  issue_date: z.string().nullable().optional(),
  notes: z.string().max(2000).nullable().optional(),
});

export async function GET(req: NextRequest) {
  try {
    const supabase = await createClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) return NextResponse.json({ error: "No autorizado" }, { status: 401 });

    const { searchParams } = new URL(req.url);
    const status = searchParams.get("status");
    let query = supabase.from("reimbursements").select("*, products(name, sku)").eq("user_id", user.id).order("created_at", { ascending: false });
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
    const result = reimbursementSchema.safeParse(body);
    if (!result.success) return NextResponse.json({ error: "Datos invalidos", details: result.error.flatten().fieldErrors }, { status: 400 });

    const clean = { ...result.data, user_id: user.id };
    const { data, error } = await supabase.from("reimbursements").insert(clean).select().single();
    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    return NextResponse.json(data, { status: 201 });
  } catch { return NextResponse.json({ error: "Error interno" }, { status: 500 }); }
}
