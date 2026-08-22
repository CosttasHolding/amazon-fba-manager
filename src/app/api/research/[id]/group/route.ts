export const dynamic = "force-dynamic";

import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { createClient } from "@/lib/supabase/server";
import { apiErrorResponse } from "@/lib/api-utils";
import { getOrgId } from "@/lib/api-handler";

const moveSchema = z.object({
  group_id: z.string().min(1).nullable(),
});

export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const supabase = await createClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) return NextResponse.json({ error: "No autorizado" }, { status: 401 });

    const orgId = await getOrgId(supabase, user.id, req);
    if (!orgId) return NextResponse.json({ error: "No hay organización activa" }, { status: 400 });

    const body = await req.json();
    const result = moveSchema.safeParse(body);
    if (!result.success) {
      return NextResponse.json({ error: "Datos inválidos" }, { status: 400 });
    }

    if (result.data.group_id !== null) {
      const { data: group } = await supabase
        .from("research_groups")
        .select("id")
        .eq("id", result.data.group_id)
        .eq("org_id", orgId)
        .is("deleted_at", null)
        .maybeSingle();
      if (!group) return NextResponse.json({ error: "Grupo no encontrado" }, { status: 404 });
    }

    const { data, error } = await supabase
      .from("product_research")
      .update({ group_id: result.data.group_id })
      .eq("id", id)
      .eq("org_id", orgId)
      .is("deleted_at", null)
      .select()
      .single();
    if (error || !data) {
      return NextResponse.json({ error: "No encontrado" }, { status: 404 });
    }

    return NextResponse.json({ data });
  } catch (error) {
    return apiErrorResponse(error, 500, "POST /api/research/[id]/group");
  }
}
