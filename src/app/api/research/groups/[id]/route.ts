export const dynamic = "force-dynamic";

import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { createClient } from "@/lib/supabase/server";
import { apiErrorResponse } from "@/lib/api-utils";
import { getOrgId } from "@/lib/api-handler";

const groupUpdateSchema = z.object({
  name: z.string().trim().min(1).max(200),
  niche: z.string().trim().max(200).nullish(),
  amazon_category: z.string().trim().max(100).nullish(),
  search_keyword: z.string().trim().max(200).nullish(),
}).partial();

export async function PUT(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const supabase = await createClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) return NextResponse.json({ error: "No autorizado" }, { status: 401 });

    const orgId = await getOrgId(supabase, user.id, req);
    if (!orgId) return NextResponse.json({ error: "No hay organización activa" }, { status: 400 });

    const body = await req.json();
    const result = groupUpdateSchema.safeParse(body);
    if (!result.success) {
      return NextResponse.json({ error: "Datos inválidos" }, { status: 400 });
    }

    const { data: existing } = await supabase
      .from("research_groups")
      .select("id")
      .eq("id", id)
      .eq("org_id", orgId)
      .maybeSingle();
    if (!existing) return NextResponse.json({ error: "No encontrado" }, { status: 404 });

    const { data, error } = await supabase
      .from("research_groups")
      .update(result.data)
      .eq("id", id)
      .eq("org_id", orgId)
      .select()
      .single();
    if (error) {
      return NextResponse.json({ error: "Error interno del servidor" }, { status: 500 });
    }

    return NextResponse.json({ data });
  } catch (error) {
    return apiErrorResponse(error, 500, "PUT /api/research/groups/[id]");
  }
}

export async function DELETE(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const supabase = await createClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) return NextResponse.json({ error: "No autorizado" }, { status: 401 });

    const orgId = await getOrgId(supabase, user.id, req);
    if (!orgId) return NextResponse.json({ error: "No hay organización activa" }, { status: 400 });

    const permanent = new URL(req.url).searchParams.get("permanent") === "true";

    const { data: existing } = await supabase
      .from("research_groups")
      .select("id")
      .eq("id", id)
      .eq("org_id", orgId)
      .maybeSingle();
    if (!existing) return NextResponse.json({ error: "No encontrado" }, { status: 404 });

    if (permanent) {
      const { error: productsError } = await supabase
        .from("product_research")
        .delete()
        .eq("group_id", id)
        .eq("org_id", orgId);
      if (productsError) {
        return NextResponse.json({ error: "Error interno del servidor" }, { status: 500 });
      }

      const { error: groupError } = await supabase
        .from("research_groups")
        .delete()
        .eq("id", id)
        .eq("org_id", orgId);
      if (groupError) {
        return NextResponse.json({ error: "Error interno del servidor" }, { status: 500 });
      }
    } else {
      const deletedAt = new Date().toISOString();

      const { error: groupError } = await supabase
        .from("research_groups")
        .update({ deleted_at: deletedAt })
        .eq("id", id)
        .eq("org_id", orgId);
      if (groupError) {
        return NextResponse.json({ error: "Error interno del servidor" }, { status: 500 });
      }

      const { error: productsError } = await supabase
        .from("product_research")
        .update({ deleted_at: deletedAt })
        .eq("group_id", id)
        .eq("org_id", orgId)
        .is("deleted_at", null);
      if (productsError) {
        return NextResponse.json({ error: "Error interno del servidor" }, { status: 500 });
      }
    }

    return NextResponse.json({ data: { success: true } });
  } catch (error) {
    return apiErrorResponse(error, 500, "DELETE /api/research/groups/[id]");
  }
}
