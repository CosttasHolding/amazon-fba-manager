export const dynamic = "force-dynamic";

import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { createClient } from "@/lib/supabase/server";
import { getOrgId } from "@/lib/api-handler";
import { apiErrorResponse } from "@/lib/api-utils";
import { calculateScore } from "@/lib/research/scoring";
import type { CapturedProduct, ScoringInput } from "@/lib/research/types";
import { competitionLevelFromScore } from "@/lib/research/competition";
import { classifyToGroup } from "@/lib/research/grouping";

const capturedProductSchema = z.object({
  asin: z.string().max(20),
  title: z.string().max(500),
  price: z.number().nullable().optional(),
  currency: z.string().max(10).optional(),
  bsr: z.number().nullable().optional(),
  review_count: z.number().nullable().optional(),
  average_rating: z.number().nullable().optional(),
  estimated_monthly_sales: z.number().nullable().optional(),
  estimated_monthly_revenue: z.number().nullable().optional(),
  estimated_fba_fee: z.number().nullable().optional(),
  seller_count_fba: z.number().nullable().optional(),
  seller_count_fbm: z.number().nullable().optional(),
  category: z.string().max(200).nullable().optional(),
  brand: z.string().max(200).nullable().optional(),
  net_margin_percent: z.number().nullable().optional(),
  image_url: z.string().max(1000).nullable().optional(),
  source: z.string().optional(),
  capture_url: z.string().max(2000).optional(),
  capture_timestamp: z.string().max(50).optional(),
}).passthrough();

const captureSchema = z.object({
  products: z.array(capturedProductSchema).min(1).max(100),
  mode: z.enum(["h10", "h10_xray", "scraper"]).optional(),
  page_type: z.enum(["search", "product", "unknown"]).optional(),
  search_keyword: z.string().max(300).optional(),
});

type ParsedProduct = z.infer<typeof capturedProductSchema>;

type ClassifyGroup = {
  id: string;
  name: string;
  niche: string | null;
  amazon_category: string | null;
  products: Array<{ asin_reference: string | null }>;
};

type GroupRow = {
  id: string;
  name: string;
  niche: string | null;
  amazon_category: string | null;
  product_research?: Array<{ asin_reference: string | null }> | null;
};

type GroupEcho = {
  id: string;
  name: string;
  niche: string | null;
  amazon_category: string | null;
};

function toScoringInput(p: ParsedProduct): ScoringInput {
  return {
    estimated_monthly_sales: p.estimated_monthly_sales ?? null,
    estimated_monthly_revenue: p.estimated_monthly_revenue ?? null,
    bsr: p.bsr ?? null,
    review_count: p.review_count ?? null,
    average_rating: p.average_rating ?? null,
    seller_count_fba: p.seller_count_fba ?? null,
    price: p.price ?? null,
    estimated_fba_fee: p.estimated_fba_fee ?? null,
    estimated_cogs: null,
  };
}

function toCapturedProduct(p: ParsedProduct): CapturedProduct {
  return {
    asin: p.asin,
    title: p.title,
    price: p.price ?? null,
    currency: p.currency ?? "",
    bsr: p.bsr ?? null,
    review_count: p.review_count ?? null,
    average_rating: p.average_rating ?? null,
    estimated_monthly_sales: p.estimated_monthly_sales ?? null,
    estimated_monthly_revenue: p.estimated_monthly_revenue ?? null,
    estimated_fba_fee: p.estimated_fba_fee ?? null,
    seller_count_fba: p.seller_count_fba ?? null,
    seller_count_fbm: p.seller_count_fbm ?? null,
    category: p.category ?? null,
    brand: p.brand ?? null,
    image_url: p.image_url ?? null,
    source: p.source === "h10_xray" || p.source === "manual" ? p.source : "scraper",
    capture_url: p.capture_url ?? "",
    capture_timestamp: p.capture_timestamp ?? "",
  };
}

export async function POST(req: NextRequest) {
  try {
    const supabase = await createClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) return NextResponse.json({ error: "No autorizado" }, { status: 401 });

    const orgId = await getOrgId(supabase, user.id, req);
    if (!orgId) return NextResponse.json({ error: "No hay organización activa" }, { status: 400 });

    const body = await req.json().catch(() => null);
    if (!body) return NextResponse.json({ error: "Body inválido" }, { status: 400 });

    const parsed = captureSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ error: "Payload inválido", details: parsed.error.flatten() }, { status: 400 });
    }

    const { products, mode, page_type, search_keyword } = parsed.data;

    const { data: groupsData, error: groupsError } = await supabase
      .from("research_groups")
      .select("id, name, niche, amazon_category, product_research(asin_reference)")
      .eq("org_id", orgId)
      .is("deleted_at", null);
    if (groupsError) {
      return NextResponse.json({ error: "Error al guardar", details: groupsError.message }, { status: 500 });
    }

    const groups: ClassifyGroup[] = ((groupsData ?? []) as GroupRow[]).map((g) => ({
      id: g.id,
      name: g.name,
      niche: g.niche,
      amazon_category: g.amazon_category,
      products: (g.product_research ?? []).map((m) => ({ asin_reference: m.asin_reference })),
    }));

    const saved: unknown[] = [];

    for (const p of products) {
      const input = toScoringInput(p);
      const hasData =
        input.estimated_monthly_sales !== null ||
        input.estimated_monthly_revenue !== null ||
        input.bsr !== null ||
        input.review_count !== null ||
        input.average_rating !== null ||
        input.seller_count_fba !== null ||
        input.price !== null ||
        input.estimated_fba_fee !== null;
      const scoring = calculateScore(input);

      let groupId: string | null = null;

      const record = {
        user_id: user.id,
        org_id: orgId,
        name: p.title || "Unknown",
        asin_reference: p.asin,
        amazon_url: p.asin ? `https://www.amazon.com/dp/${p.asin}` : null,
        amazon_category: p.category ?? "",
        niche: p.category ?? null,
        competition_level: hasData ? competitionLevelFromScore(scoring.dimensions.competencia.score) : null,
        estimated_monthly_sales: p.estimated_monthly_sales ?? null,
        average_price: p.price ?? null,
        review_count_competitor: p.review_count ?? null,
        average_rating: p.average_rating ?? null,
        bsr: p.bsr ?? null,
        score: hasData ? scoring.total : null,
        source: "capture",
        status: "idea",
        priority: 3,
        source_data: {
          ...p,
          capture_mode: mode,
          page_type,
          search_keyword,
          captured_at: p.capture_timestamp,
          score_details: hasData ? scoring.dimensions : undefined,
        },
      };

      const { data: existing } = await supabase
        .from("product_research")
        .select("id")
        .eq("org_id", orgId)
        .eq("asin_reference", record.asin_reference)
        .maybeSingle();

      if (existing) {
        const { data, error } = await supabase
          .from("product_research")
          .update(record)
          .eq("id", existing.id)
          .select();

        if (error) {
          return NextResponse.json({ error: "Error al guardar", details: error.message }, { status: 500 });
        }
        saved.push(...(data ?? []));
        continue;
      }

      const match = await classifyToGroup(toCapturedProduct(p), groups, "off");

      if (match.match === "existing") {
        groupId = match.group_id;
      } else if (match.match === "new") {
        const { data: createdGroup, error: groupError } = await supabase
          .from("research_groups")
          .insert({
            org_id: orgId,
            name: match.group_name,
            niche: match.niche,
            amazon_category: match.amazon_category,
            search_keyword: null,
          })
          .select()
          .single();

        if (groupError || !createdGroup) {
          return NextResponse.json(
            { error: "Error al guardar", details: groupError?.message ?? "Grupo sin datos" },
            { status: 500 }
          );
        }
        const created = createdGroup as GroupEcho;
        groupId = created.id;
        groups.push({ id: created.id, name: created.name, niche: created.niche, amazon_category: created.amazon_category, products: [] });
      }

      const { data, error } = await supabase
        .from("product_research")
        .insert({ ...record, group_id: groupId })
        .select();

      if (error) {
        return NextResponse.json({ error: "Error al guardar", details: error.message }, { status: 500 });
      }
      saved.push(...(data ?? []));
    }

    return NextResponse.json({ data: saved, count: saved.length }, { status: 201 });
  } catch (error) {
    return apiErrorResponse(error, 500, "POST /api/research/capture");
  }
}
