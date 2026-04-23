import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { z } from "zod";

const shipmentSchema = z.object({
  po_id: z.string().uuid().nullable().optional(),
  shipment_name: z.string().min(1, "Nombre requerido").max(200),
  shipment_id: z.string().max(100).nullable().optional(),
  amazon_reference_id: z.string().max(100).nullable().optional(),
  destination_fulfillment_center: z.string().max(50).nullable().optional(),
  destination_address: z.string().max(500).nullable().optional(),
  status: z.enum(["working","ready_to_ship","shipped","in_transit","delivered","checked_in","receiving","closed","cancelled"]).default("working"),
  shipping_method: z.enum(["small_parcel","ltl","ftl","air","sea"]).nullable().optional(),
  carrier: z.string().max(100).nullable().optional(),
  tracking_number: z.string().max(200).nullable().optional(),
  box_count: z.coerce.number().int().min(0).default(0),
  total_units: z.coerce.number().int().min(0).default(0),
  total_weight_kg: z.coerce.number().min(0).nullable().optional(),
  shipping_cost: z.coerce.number().min(0).default(0),
  ship_date: z.string().nullable().optional(),
  estimated_arrival: z.string().nullable().optional(),
  actual_arrival: z.string().nullable().optional(),
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

    let query = supabase.from("fba_shipments").select("*, purchase_orders(po_number)", { count: "exact" }).eq("user_id", user.id).order("created_at", { ascending: false }).range(from, to);
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
    const result = shipmentSchema.safeParse(body);
    if (!result.success) return NextResponse.json({ error: "Datos invalidos", details: result.error.flatten().fieldErrors }, { status: 400 });

    const clean = { ...result.data, user_id: user.id };
    const { data, error } = await supabase.from("fba_shipments").insert(clean).select().single();
    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    return NextResponse.json(data, { status: 201 });
  } catch { return NextResponse.json({ error: "Error interno" }, { status: 500 }); }
}
