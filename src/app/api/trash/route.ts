export const dynamic = "force-dynamic";

import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { createClient } from "@/lib/supabase/server";
import { apiErrorResponse } from "@/lib/api-utils";
import { getOrgId } from "@/lib/api-handler";
import {
  TRASH_NAME_COLUMN,
  isGroupEntity,
  normalizeTable,
  type TrashEntity,
} from "@/lib/trash";

const trashBodySchema = z.object({
  entity: z.string().min(1),
  id: z.string().uuid(),
});

type TrashRow = Record<string, unknown>;

function resolveEntity(raw: string): TrashEntity | null {
  try {
    return normalizeTable(raw);
  } catch {
    return null;
  }
}

function selectColumns(table: TrashEntity): string {
  const nameColumn = TRASH_NAME_COLUMN[table];
  return nameColumn === "id" ? "id, deleted_at" : `id, ${nameColumn}, deleted_at`;
}

export async function GET(req: NextRequest) {
  try {
    const supabase = await createClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) return NextResponse.json({ error: "No autorizado" }, { status: 401 });

    const orgId = await getOrgId(supabase, user.id, req);
    if (!orgId) return NextResponse.json({ error: "No hay organización activa" }, { status: 400 });

    const table = resolveEntity(req.nextUrl.searchParams.get("entity") ?? "");
    if (!table) return NextResponse.json({ error: "Entidad inválida" }, { status: 400 });

    const q = req.nextUrl.searchParams.get("q");
    const nameColumn = TRASH_NAME_COLUMN[table];

    let query = supabase
      .from(table)
      .select(selectColumns(table))
      .eq("org_id", orgId)
      .not("deleted_at", "is", null);

    if (q && nameColumn !== "id") {
      query = query.ilike(nameColumn, `%${q}%`);
    } else if (q && nameColumn === "id") {
      const uuidCheck = z.string().uuid().safeParse(q);
      if (!uuidCheck.success) return NextResponse.json({ data: [] });
      query = query.eq("id", q);
    }

    const { data, error } = await query.order("deleted_at", { ascending: false });
    if (error) {
      return NextResponse.json({ error: "Error interno del servidor" }, { status: 500 });
    }

    const rows = (Array.isArray(data) ? data : []) as unknown as TrashRow[];
    const items = rows.map((row) => ({
      id: String(row.id),
      name:
        nameColumn === "id"
          ? String(row.id)
          : String(row[nameColumn] ?? ""),
      deleted_at: String(row.deleted_at ?? ""),
    }));

    return NextResponse.json({ data: items });
  } catch (error) {
    return apiErrorResponse(error, 500, "GET /api/trash");
  }
}

export async function DELETE(req: NextRequest) {
  try {
    const supabase = await createClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) return NextResponse.json({ error: "No autorizado" }, { status: 401 });

    const orgId = await getOrgId(supabase, user.id, req);
    if (!orgId) return NextResponse.json({ error: "No hay organización activa" }, { status: 400 });

    const body = await req.json();
    const result = trashBodySchema.safeParse(body);
    if (!result.success) {
      return NextResponse.json({ error: "Datos inválidos" }, { status: 400 });
    }

    const table = resolveEntity(result.data.entity);
    if (!table) return NextResponse.json({ error: "Entidad inválida" }, { status: 400 });

    const { id } = result.data;

    const { data: existing } = await supabase
      .from(table)
      .select("id")
      .eq("id", id)
      .eq("org_id", orgId)
      .maybeSingle();
    if (!existing) return NextResponse.json({ error: "No encontrado" }, { status: 404 });

    if (isGroupEntity(table)) {
      const { error: productsError } = await supabase
        .from("product_research")
        .delete()
        .eq("group_id", id)
        .eq("org_id", orgId);
      if (productsError) {
        return NextResponse.json({ error: "Error interno del servidor" }, { status: 500 });
      }
    }

    const { error } = await supabase
      .from(table)
      .delete()
      .eq("id", id)
      .eq("org_id", orgId);
    if (error) {
      return NextResponse.json({ error: "Error interno del servidor" }, { status: 500 });
    }

    return NextResponse.json({ data: { success: true } });
  } catch (error) {
    return apiErrorResponse(error, 500, "DELETE /api/trash");
  }
}
