export const dynamic = "force-dynamic";

import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { fbaShipmentSchema } from "@/validations/fba-shipment";
import { getOrgId, hasOrgRole } from "@/lib/api-handler";
import { isValidUuid } from "@/lib/api-utils";

export async function GET(req: NextRequest, { params }: { params: { id: string } }) {
  try {
    const supabase = await createClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) return NextResponse.json({ error: "No autorizado" }, { status: 401 });

    const orgId = await getOrgId(supabase, user.id, req);
    if (!orgId) return NextResponse.json({ error: "No hay organización activa" }, { status: 400 });
    if (!isValidUuid(params.id)) return NextResponse.json({ error: "ID inválido" }, { status: 400 });

    const { data, error } = await supabase.from("fba_shipments").select("*, fba_shipment_items(*, products(name, sku)), purchase_orders(po_number)").eq("id", params.id).eq("org_id", orgId).single();
    if (error) return NextResponse.json({ error: error.message }, { status: 404 });
    return NextResponse.json(data);
  } catch (e) { console.error("Route error", e); return NextResponse.json({ error: "Error interno" }, { status: 500 }); }
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
    const orgId = await getOrgId(supabase, user.id, req);
    if (!orgId) return NextResponse.json({ error: "No hay organización activa" }, { status: 400 });
    if (!(await hasOrgRole(supabase, user.id, orgId))) {
      return NextResponse.json({ error: "Permisos insuficientes" }, { status: 403 });
    }
    if (!isValidUuid(params.id)) return NextResponse.json({ error: "ID inválido" }, { status: 400 });

    if (result.data.po_id) {
      const { data: purchaseOrder } = await supabase
        .from("purchase_orders")
        .select("id")
        .eq("id", result.data.po_id)
        .eq("org_id", orgId)
        .maybeSingle();
      if (!purchaseOrder) return NextResponse.json({ error: "Orden no pertenece a la organización" }, { status: 400 });
    }

    const { data, error } = await supabase.from("fba_shipments").update(result.data).eq("id", params.id).eq("org_id", orgId).select().single();
    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    return NextResponse.json(data);
  } catch (e) { console.error("Route error", e); return NextResponse.json({ error: "Error interno" }, { status: 500 }); }
}

export async function DELETE(req: NextRequest, { params }: { params: { id: string } }) {
  try {
    const supabase = await createClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) return NextResponse.json({ error: "No autorizado" }, { status: 401 });

    const orgId = await getOrgId(supabase, user.id, req);
    if (!orgId) return NextResponse.json({ error: "No hay organización activa" }, { status: 400 });
    if (!isValidUuid(params.id)) return NextResponse.json({ error: "ID inválido" }, { status: 400 });
    if (!(await hasOrgRole(supabase, user.id, orgId))) {
      return NextResponse.json({ error: "Permisos insuficientes" }, { status: 403 });
    }

    const { error } = await supabase.from("fba_shipments").delete().eq("id", params.id).eq("org_id", orgId);
    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    return NextResponse.json({ message: "Eliminado" });
  } catch (e) { console.error("Route error", e); return NextResponse.json({ error: "Error interno" }, { status: 500 }); }
}
