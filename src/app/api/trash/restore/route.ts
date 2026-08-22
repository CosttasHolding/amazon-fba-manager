export const dynamic = "force-dynamic";

import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { createClient } from "@/lib/supabase/server";
import { apiErrorResponse } from "@/lib/api-utils";
import { getOrgId } from "@/lib/api-handler";
import { isGroupEntity, normalizeTable, type TrashEntity } from "@/lib/trash";

const restoreSchema = z.object({
  entity: z.string().min(1),
  id: z.string().uuid(),
});

type TrashRow = { deleted_at: string | null };

function resolveEntity(raw: string): TrashEntity | null {
  try {
    return normalizeTable(raw);
  } catch {
    return null;
  }
}

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

    const table = resolveEntity(result.data.entity);
    if (!table) return NextResponse.json({ error: "Entidad inválida" }, { status: 400 });

    const { id } = result.data;

    const { data: existing } = await supabase
      .from(table)
      .select("id, deleted_at")
      .eq("id", id)
      .eq("org_id", orgId)
      .maybeSingle();
    if (!existing) return NextResponse.json({ error: "No encontrado" }, { status: 404 });

    const previousDeletedAt = (existing as TrashRow).deleted_at ?? null;

    const { data, error } = await supabase
      .from(table)
      .update({ deleted_at: null })
      .eq("id", id)
      .eq("org_id", orgId)
      .select()
      .single();
    if (error) {
      return NextResponse.json({ error: "Error interno del servidor" }, { status: 500 });
    }

    if (isGroupEntity(table) && previousDeletedAt) {
      const { error: productsError } = await supabase
        .from("product_research")
        .update({ deleted_at: null })
        .eq("group_id", id)
        .eq("org_id", orgId)
        .gte("deleted_at", previousDeletedAt);
      if (productsError) {
        return NextResponse.json({ error: "Error interno del servidor" }, { status: 500 });
      }
    }

    return NextResponse.json({ data });
  } catch (error) {
    return apiErrorResponse(error, 500, "POST /api/trash/restore");
  }
}
