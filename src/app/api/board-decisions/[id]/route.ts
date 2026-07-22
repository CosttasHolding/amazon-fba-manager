import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { boardDecisionSchema } from "@/validations/member";
import { getOrgId } from "@/lib/api-handler";

export async function PUT(request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ error: "No autorizado" }, { status: 401 });

    const body = await request.json();
    const parsed = boardDecisionSchema.partial().safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ error: parsed.error.flatten().fieldErrors }, { status: 400 });
    }

    const orgId = await getOrgId(supabase, user.id, request);
    if (!orgId) return NextResponse.json({ error: "No hay organización activa" }, { status: 400 });

    const { error, data } = await supabase
      .from("board_decisions")
      .update(parsed.data)
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
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ error: "No autorizado" }, { status: 401 });

    const orgId = await getOrgId(supabase, user.id, request);
    if (!orgId) return NextResponse.json({ error: "No hay organización activa" }, { status: 400 });

    const { error } = await supabase.from("board_decisions").delete().eq("id", id).eq("org_id", orgId);
    if (error) return NextResponse.json({ error: "Error al eliminar" }, { status: 500 });
    return NextResponse.json({ success: true });
  } catch {
    return NextResponse.json({ error: "Error interno del servidor" }, { status: 500 });
  }
}
