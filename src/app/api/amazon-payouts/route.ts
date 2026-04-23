import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { z } from "zod";

const payoutSchema = z.object({
  payout_period_start: z.string().min(1, "Fecha inicio requerida"),
  payout_period_end: z.string().min(1, "Fecha fin requerida"),
  amount: z.coerce.number().positive("El monto debe ser mayor a 0"),
  currency: z.string().max(3).default("USD"),
  status: z.enum(["pending","transferred","failed"]).default("pending"),
  amazon_reference: z.string().max(200).nullable().optional(),
  bank_account_last4: z.string().max(4).nullable().optional(),
  transfer_date: z.string().nullable().optional(),
  marketplace: z.string().max(10).default("US"),
  notes: z.string().max(2000).nullable().optional(),
});

export async function GET(req: NextRequest) {
  try {
    const supabase = await createClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) return NextResponse.json({ error: "No autorizado" }, { status: 401 });

    const { searchParams } = new URL(req.url);
    const year = searchParams.get("year");

    let query = supabase.from("amazon_payouts").select("*").eq("user_id", user.id).order("payout_period_start", { ascending: false });
    if (year) {
      query = query.gte("payout_period_start", year + "-01-01").lte("payout_period_end", year + "-12-31");
    }

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
    const result = payoutSchema.safeParse(body);
    if (!result.success) return NextResponse.json({ error: "Datos invalidos", details: result.error.flatten().fieldErrors }, { status: 400 });

    const clean = { ...result.data, user_id: user.id };
    const { data, error } = await supabase.from("amazon_payouts").insert(clean).select().single();
    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    return NextResponse.json(data, { status: 201 });
  } catch { return NextResponse.json({ error: "Error interno" }, { status: 500 }); }
}
