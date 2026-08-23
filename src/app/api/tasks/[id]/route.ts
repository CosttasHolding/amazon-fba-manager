export const dynamic = "force-dynamic";

import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { getOrgId } from "@/lib/api-handler";
import { isValidUuid } from "@/lib/api-utils";

export async function PUT(request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    if (!isValidUuid(id)) return NextResponse.json({ error: "ID inválido" }, { status: 400 });
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ error: "No autorizado" }, { status: 401 });

    const body = await request.json();
    const ALLOWED_FIELDS = ["title", "description", "status", "priority", "assignee_id", "module", "due_date"];
    const updateData: Record<string, unknown> = {};
    for (const key of ALLOWED_FIELDS) {
      if (key in body) updateData[key] = body[key];
    }
    if (body.status === "completed") updateData.completed_at = new Date().toISOString();
    else if (body.status && body.status !== "completed") updateData.completed_at = null;

    const orgId = await getOrgId(supabase, user.id, request);
    if (!orgId) return NextResponse.json({ error: "No hay organización activa" }, { status: 400 });

    const { error, data } = await supabase
      .from("tasks")
      .update(updateData)
      .eq("id", id)
      .eq("org_id", orgId)
      .select()
      .single();

    if (error) return NextResponse.json({ error: "Error al actualizar" }, { status: 500 });
    return NextResponse.json({ data });
  } catch {
    return NextResponse.json({ error: "Error interno del servidor" }, { status: 500 });
  }
}

export async function DELETE(request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    if (!isValidUuid(id)) return NextResponse.json({ error: "ID inválido" }, { status: 400 });
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ error: "No autorizado" }, { status: 401 });

    const orgId = await getOrgId(supabase, user.id, request);
    if (!orgId) return NextResponse.json({ error: "No hay organización activa" }, { status: 400 });

    const { error } = await supabase.from("tasks").delete().eq("id", id).eq("org_id", orgId);
    if (error) return NextResponse.json({ error: "Error al eliminar" }, { status: 500 });
    return NextResponse.json({ success: true });
  } catch {
    return NextResponse.json({ error: "Error interno del servidor" }, { status: 500 });
  }
}
