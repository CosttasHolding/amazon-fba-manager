export const dynamic = "force-dynamic";

import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { createClient } from "@/lib/supabase/server";
import { getOrgId } from "@/lib/api-handler";
import { hasReimbursementEditorAccess } from "@/lib/reimbursements/access";

const linkSchema = z.object({ reimbursement_id: z.string().uuid() });

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
    const body = linkSchema.safeParse(await req.json());
    if (!body.success) return NextResponse.json({ error: body.error.flatten().fieldErrors }, { status: 400 });

    const { data: event, error: eventError } = await supabase
      .from("amazon_reimbursement_events")
      .select("id, product_id, case_id, linked_reimbursement_id, reconciliation_status")
      .eq("id", eventId.data)
      .eq("org_id", orgId)
      .maybeSingle();
    if (eventError) return NextResponse.json({ error: eventError.message }, { status: 500 });
    if (!event) return NextResponse.json({ error: "Detección no encontrada" }, { status: 404 });
    if (event.linked_reimbursement_id && event.linked_reimbursement_id !== body.data.reimbursement_id) {
      return NextResponse.json({ error: "La detección ya está vinculada" }, { status: 409 });
    }
    if (event.linked_reimbursement_id === body.data.reimbursement_id) {
      return NextResponse.json({ data: event });
    }

    const { data: reimbursement, error: reimbursementError } = await supabase
      .from("reimbursements")
      .select("id, product_id, amazon_case_id")
      .eq("id", body.data.reimbursement_id)
      .eq("org_id", orgId)
      .is("deleted_at", null)
      .maybeSingle();
    if (reimbursementError) return NextResponse.json({ error: reimbursementError.message }, { status: 500 });
    if (!reimbursement) return NextResponse.json({ error: "Reembolso no encontrado" }, { status: 404 });

    if (event.product_id && reimbursement.product_id && event.product_id !== reimbursement.product_id) {
      return NextResponse.json({ error: "El producto no coincide" }, { status: 400 });
    }
    if (event.case_id && reimbursement.amazon_case_id && event.case_id !== reimbursement.amazon_case_id) {
      return NextResponse.json({ error: "El case ID no coincide" }, { status: 400 });
    }

    const { data, error } = await supabase
      .from("amazon_reimbursement_events")
      .update({
        linked_reimbursement_id: reimbursement.id,
        reconciliation_status: "linked",
      })
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
    console.error("Link reimbursement route error", error);
    return NextResponse.json({ error: "Error interno" }, { status: 500 });
  }
}
