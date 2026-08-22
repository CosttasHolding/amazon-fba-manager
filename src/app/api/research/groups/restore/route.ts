export const dynamic = "force-dynamic";

import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { createClient } from "@/lib/supabase/server";
import { apiErrorResponse } from "@/lib/api-utils";
import { getOrgId } from "@/lib/api-handler";

const restoreSchema = z.object({
  id: z.string().min(1),
});

export async function POST(req: NextRequest) {
  try {
    const supabase = await createClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) return NextResponse.json({ error: "No autorizado" }, { status: 401 });

    const orgId = await getOrgId(supabase, user.id, req);
    if (!orgId) return NextResponse.json({ error: "No hay organización activa" }, { status: 400 });

    const body = await req.json();
    const result = restoreSchema.safeParse(body);
    if (!result.success) {
      return NextResponse.json({ error: "Datos inválidos" }, { status: 400 });
    }

    const { id } = result.data;

    const { data: existing } = await supabase
      .from("research_groups")
      .select("id")
      .eq("id", id)
      .eq("org_id", orgId)
      .maybeSingle();
    if (!existing) return NextResponse.json({ error: "No encontrado" }, { status: 404 });

    const { data, error } = await supabase
      .from("research_groups")
      .update({ deleted_at: null })
      .eq("id", id)
      .eq("org_id", orgId)
      .select()
      .single();
    if (error) {
      return NextResponse.json({ error: "Error interno del servidor" }, { status: 500 });
    }

    const { error: productsError } = await supabase
      .from("product_research")
      .update({ deleted_at: null })
      .eq("group_id", id)
      .eq("org_id", orgId);
    if (productsError) {
      return NextResponse.json({ error: "Error interno del servidor" }, { status: 500 });
    }

    return NextResponse.json({ data });
  } catch (error) {
    return apiErrorResponse(error, 500, "POST /api/research/groups/restore");
  }
}
