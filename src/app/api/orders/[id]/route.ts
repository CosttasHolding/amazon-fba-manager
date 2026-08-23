export const dynamic = "force-dynamic";

import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { getOrgId } from "@/lib/api-handler";
import { isValidUuid } from "@/lib/api-utils";
import { orderSchema } from "@/validations/order";

interface RouteParams {
  params: { id: string };
}

export async function GET(req: NextRequest, { params }: RouteParams) {
  try {
    const { id } = params;
    const supabase = await createClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) return NextResponse.json({ error: "No autorizado" }, { status: 401 });

    const orgId = await getOrgId(supabase, user.id, req);
    if (!orgId) return NextResponse.json({ error: "No hay organización activa" }, { status: 400 });
    if (!isValidUuid(id)) return NextResponse.json({ error: "ID inválido" }, { status: 400 });

    const { data, error } = await supabase
      .from("purchase_orders")
      .select("*, suppliers(*), products(*)")
      .eq("id", id)
      .eq("org_id", orgId)
      .single();

    if (error || !data) return NextResponse.json({ error: "Orden no encontrada" }, { status: 404 });
    return NextResponse.json(data);
  } catch (e) { console.error("Route error", e); return NextResponse.json({ error: "Error interno" }, { status: 500 }); }
}

export async function PUT(req: NextRequest, { params }: RouteParams) {
  try {
    const { id } = params;
    const supabase = await createClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) return NextResponse.json({ error: "No autorizado" }, { status: 401 });

    const orgId = await getOrgId(supabase, user.id, req);
    if (!orgId) return NextResponse.json({ error: "No hay organización activa" }, { status: 400 });
    if (!isValidUuid(id)) return NextResponse.json({ error: "ID inválido" }, { status: 400 });

    const body = await req.json();
    const result = orderSchema.partial().safeParse(body);
    if (!result.success) {
      return NextResponse.json({ error: "Datos inválidos", details: result.error.flatten().fieldErrors }, { status: 400 });
    }
    const { data, error } = await supabase.from("purchase_orders").update(result.data).eq("id", id).eq("org_id", orgId).select().single();
    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    return NextResponse.json(data);
  } catch (e) { console.error("Route error", e); return NextResponse.json({ error: "Error interno" }, { status: 500 }); }
}

export async function DELETE(req: NextRequest, { params }: RouteParams) {
  try {
    const { id } = params;
    const supabase = await createClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) return NextResponse.json({ error: "No autorizado" }, { status: 401 });

    const orgId = await getOrgId(supabase, user.id, req);
    if (!orgId) return NextResponse.json({ error: "No hay organización activa" }, { status: 400 });
    if (!isValidUuid(id)) return NextResponse.json({ error: "ID inválido" }, { status: 400 });

    const { error } = await supabase.from("purchase_orders").delete().eq("id", id).eq("org_id", orgId);
    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    return NextResponse.json({ message: "Orden eliminada" });
  } catch (e) { console.error("Route error", e); return NextResponse.json({ error: "Error interno" }, { status: 500 }); }
}
