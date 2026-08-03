export const dynamic = "force-dynamic";

import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { createClient } from "@/lib/supabase/server";
import { getOrgId } from "@/lib/api-handler";
import { apiErrorResponse } from "@/lib/api-utils";
import { calculateScore } from "@/lib/research/scoring";
import type { ScoringInput } from "@/lib/research/types";

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

    function toScoringInput(p: z.infer<typeof capturedProductSchema>): ScoringInput {
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

    const records = products.map((p) => {
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

      return {
        user_id: user.id,
        org_id: orgId,
        name: p.title || "Unknown",
        asin_reference: p.asin,
        amazon_category: p.category ?? "",
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
    });

    const saved: unknown[] = [];

    for (const record of records) {
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
      } else {
        const { data, error } = await supabase
          .from("product_research")
          .insert(record)
          .select();

        if (error) {
          return NextResponse.json({ error: "Error al guardar", details: error.message }, { status: 500 });
        }
        saved.push(...(data ?? []));
      }
    }

    return NextResponse.json({ data: saved, count: saved.length }, { status: 201 });
  } catch (error) {
    return apiErrorResponse(error, 500, "POST /api/research/capture");
  }
}
