export const dynamic = "force-dynamic";

import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { researchSchema } from "@/validations/research";
import { apiErrorResponse } from "@/lib/api-utils";
import { getOrgId } from "@/lib/api-handler";
import { recomputeScoreForRow } from "@/lib/research/recompute";
import type { ResearchRowLike } from "@/lib/research/recompute";
import type { CompetitionLevel } from "@/types";

export async function GET(req: NextRequest) {
  try {
    const supabase = await createClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) return NextResponse.json({ error: "No autorizado" }, { status: 401 });

    const orgId = await getOrgId(supabase, user.id, req);
    if (!orgId) return NextResponse.json({ error: "No hay organización activa" }, { status: 400 });

    const { searchParams } = new URL(req.url);
    const page = Math.max(1, parseInt(searchParams.get("page") || "1"));
    const limit = Math.min(200, Math.max(1, parseInt(searchParams.get("limit") || "50")));
    const from = (page - 1) * limit;
    const to = from + limit - 1;

    const { data, error, count } = await supabase.from("product_research").select("*", { count: "exact" }).eq("org_id", orgId).order("created_at", { ascending: false }).range(from, to);
    if (error) {
      return NextResponse.json({ error: "Error interno del servidor" }, { status: 500 });
    }
    return NextResponse.json({ data: data || [], count, page, limit });
  } catch (error) {
    return apiErrorResponse(error, 500, "GET /api/research");
  }
}

const SCORING_FIELDS = [
  "estimated_monthly_sales",
  "estimated_monthly_revenue",
  "average_price",
  "review_count_competitor",
  "average_rating",
  "bsr",
  "estimated_fba_fee",
  "seller_count_fba",
  "estimated_cogs",
] as const;

function hasScoringFields(payload: Record<string, unknown>): boolean {
  return SCORING_FIELDS.some((field) => payload[field] !== undefined);
}

export async function POST(req: NextRequest) {
  try {
    const supabase = await createClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) return NextResponse.json({ error: "No autorizado" }, { status: 401 });

    const orgId = await getOrgId(supabase, user.id, req);
    if (!orgId) return NextResponse.json({ error: "No hay organización activa" }, { status: 400 });

    const body = await req.json();
    const result = researchSchema.safeParse(body);
    if (!result.success) return NextResponse.json({ error: "Datos inválidos", details: result.error.flatten().fieldErrors }, { status: 400 });

    const payload = { ...result.data, user_id: user.id, org_id: orgId } as Record<string, unknown>;

    if (hasScoringFields(result.data)) {
      const rec = recomputeScoreForRow(result.data as unknown as ResearchRowLike);
      payload.score = rec.score ?? null;
      payload.competition_level =
        (result.data.competition_level ??
          rec.competition_level) as CompetitionLevel | null;
      payload.source_data = {
        score_details: rec.score_details ?? undefined,
      };
    }

    const { data, error } = await supabase.from("product_research").insert(payload).select().single();
    if (error) {
      return NextResponse.json({ error: "Error interno del servidor", details: error.message, code: error.code }, { status: 500 });
    }
    return NextResponse.json(data, { status: 201 });
  } catch (error) {
    return NextResponse.json({ error: "Error interno del servidor", details: error instanceof Error ? error.message : String(error) }, { status: 500 });
  }
}

export async function PUT(req: NextRequest) {
  try {
    const supabase = await createClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) return NextResponse.json({ error: "No autorizado" }, { status: 401 });

    const { searchParams } = new URL(req.url);
    const id = searchParams.get("id");
    if (!id) return NextResponse.json({ error: "ID requerido" }, { status: 400 });

    const orgId = await getOrgId(supabase, user.id, req);
    if (!orgId) return NextResponse.json({ error: "No hay organización activa" }, { status: 400 });

    const body = await req.json();
    const result = researchSchema.partial().safeParse(body);
    if (!result.success) return NextResponse.json({ error: "Datos inválidos" }, { status: 400 });

    const { data: existing } = await supabase
      .from("product_research")
      .select("*")
      .eq("id", id)
      .eq("org_id", orgId)
      .maybeSingle();
    if (!existing) return NextResponse.json({ error: "No encontrado" }, { status: 404 });

    const updated = { ...result.data } as Record<string, unknown>;

    if (hasScoringFields(result.data)) {
      const merged = { ...existing, ...result.data } as ResearchRowLike;
      const rec = recomputeScoreForRow(merged);
      updated.score = rec.score ?? null;
      updated.competition_level =
        result.data.competition_level ?? rec.competition_level ?? null;
      const sourceData = (existing.source_data ??
        {}) as Record<string, unknown> | null;
      const payloadSourceData = (result.data as unknown as Record<string, unknown>)
        .source_data as Record<string, unknown> | undefined;
      updated.source_data = {
        ...(sourceData ?? {}),
        ...(payloadSourceData ?? {}),
        score_details: rec.score_details ?? undefined,
      };
    }

    const { data, error } = await supabase.from("product_research").update(updated).eq("id", id).eq("org_id", orgId).select().single();
    if (error) {
      return NextResponse.json({ error: "Error interno del servidor" }, { status: 500 });
    }
    return NextResponse.json(data);
  } catch (error) {
    return apiErrorResponse(error, 500, "PUT /api/research");
  }
}

export async function DELETE(req: NextRequest) {
  try {
    const supabase = await createClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) return NextResponse.json({ error: "No autorizado" }, { status: 401 });

    const orgId = await getOrgId(supabase, user.id, req);
    if (!orgId) return NextResponse.json({ error: "No hay organización activa" }, { status: 400 });

    const { searchParams } = new URL(req.url);
    const id = searchParams.get("id");
    if (!id) return NextResponse.json({ error: "ID requerido" }, { status: 400 });

    const { error } = await supabase.from("product_research").delete().eq("id", id).eq("org_id", orgId);
    if (error) {
      return NextResponse.json({ error: "Error interno del servidor" }, { status: 500 });
    }
    return NextResponse.json({ message: "Eliminado" });
  } catch (error) {
    return apiErrorResponse(error, 500, "DELETE /api/research");
  }
}
