import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { fbaShipmentSchema } from "@/validations/fba-shipment";

export async function GET(req: NextRequest, { params }: { params: { id: string } }) {
  try {
    const supabase = await createClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) return NextResponse.json({ error: "No autorizado" }, { status: 401 });

    const { data, error } = await supabase.from("fba_shipments").select("*, fba_shipment_items(*, products(name, sku)), purchase_orders(po_number)").eq("id", params.id).eq("user_id", user.id).single();
    if (error) return NextResponse.json({ error: error.message }, { status: 404 });
    return NextResponse.json(data);
  } catch { return NextResponse.json({ error: "Error interno" }, { status: 500 }); }
}

export async function PUT(req: NextRequest, { params }: { params: { id: string } }) {
  try {
    const supabase = await createClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) return NextResponse.json({ error: "No autorizado" }, { status: 401 });

    const body = await req.json();
    const result = fbaShipmentSchema.partial().safeParse(body);
    if (!result.success) {
      return NextResponse.json({ error: "Datos inválidos", details: result.error.flatten().fieldErrors }, { status: 400 });
    }
    const { data, error } = await supabase.from("fba_shipments").update(result.data).eq("id", params.id).eq("user_id", user.id).select().single();
    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    return NextResponse.json(data);
  } catch { return NextResponse.json({ error: "Error interno" }, { status: 500 }); }
}

export async function DELETE(req: NextRequest, { params }: { params: { id: string } }) {
  try {
    const supabase = await createClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) return NextResponse.json({ error: "No autorizado" }, { status: 401 });

    const { error } = await supabase.from("fba_shipments").delete().eq("id", params.id).eq("user_id", user.id);
    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    return NextResponse.json({ message: "Eliminado" });
  } catch { return NextResponse.json({ error: "Error interno" }, { status: 500 }); }
}
