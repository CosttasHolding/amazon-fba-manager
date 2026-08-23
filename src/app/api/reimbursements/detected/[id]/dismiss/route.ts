export const dynamic = "force-dynamic";

import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { createClient } from "@/lib/supabase/server";
import { getOrgId } from "@/lib/api-handler";
import { hasReimbursementEditorAccess } from "@/lib/reimbursements/access";

export async function POST(
  req: NextRequest,
  context: { params: Promise<{ id: string }> },
) {
  try {
    const supabase = await createClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) return NextResponse.json({ error: "No autorizado" }, { status: 401 });

    const orgId = await getOrgId(supabase, user.id, req);
    if (!orgId) return NextResponse.json({ error: "No hay organización activa" }, { status: 400 });
    if (!await hasReimbursementEditorAccess(supabase, user.id, orgId)) {
      return NextResponse.json({ error: "Permisos insuficientes" }, { status: 403 });
    }

    const { id } = await context.params;
    const eventId = z.string().uuid().safeParse(id);
    if (!eventId.success) return NextResponse.json({ error: "ID inválido" }, { status: 400 });

    const { data: event, error: eventError } = await supabase
      .from("amazon_reimbursement_events")
      .select("id, linked_reimbursement_id")
      .eq("id", eventId.data)
      .eq("org_id", orgId)
      .maybeSingle();
    if (eventError) return NextResponse.json({ error: eventError.message }, { status: 500 });
    if (!event) return NextResponse.json({ error: "Detección no encontrada" }, { status: 404 });
    if (event.linked_reimbursement_id) {
      return NextResponse.json({ error: "No se puede descartar una detección vinculada" }, { status: 409 });
    }

    const { data, error } = await supabase
      .from("amazon_reimbursement_events")
      .update({ reconciliation_status: "dismissed" })
      .eq("id", event.id)
      .eq("org_id", orgId)
      .is("linked_reimbursement_id", null)
      .neq("reconciliation_status", "linked")
      .select()
      .single();
    if (error?.code === "PGRST116") return NextResponse.json({ error: "La detección ya fue modificada" }, { status: 409 });
    if (error) return NextResponse.json({ error: error.message }, { status: 500 });

    return NextResponse.json({ data });
  } catch (error) {
    console.error("Dismiss reimbursement route error", error);
    return NextResponse.json({ error: "Error interno" }, { status: 500 });
  }
}
