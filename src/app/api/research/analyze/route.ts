export const dynamic = "force-dynamic";

import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { SpApiClient, getCatalogItem, refreshAccessToken } from "@/lib/sp-api";
import { getXAIClient } from "@/lib/ai/client";
import { buildAnalyzeProductPrompt } from "@/lib/ai/prompts";
import type { AnalyzeProductResponse } from "@/lib/ai/types";
import { apiErrorResponse } from "@/lib/api-utils";
import { getOrgId } from "@/lib/org-resolver";

const ASIN_REGEX = /^[A-Z0-9]{10}$/;

function extractAsin(input: string): string | null {
  const trimmed = input.trim();
  if (ASIN_REGEX.test(trimmed)) return trimmed;
  const match = trimmed.match(/\/([A-Z0-9]{10})(?:\/|$|\?)/);
  return match?.[1] ?? null;
}

export async function POST(req: NextRequest) {
  try {
    const supabase = await createClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) return NextResponse.json({ error: "No autorizado" }, { status: 401 });

    const orgId = await getOrgId(supabase, user.id, req);
    if (!orgId) return NextResponse.json({ error: "No hay organización activa" }, { status: 400 });

    const { input } = await req.json();
    if (!input || typeof input !== "string") {
      return NextResponse.json({ error: "Se requiere un ASIN o URL de Amazon" }, { status: 400 });
    }

    const asin = extractAsin(input);
    if (!asin) {
      return NextResponse.json({ error: "ASIN inválido. Debe ser un código de 10 caracteres alfanuméricos." }, { status: 400 });
    }

    const { data: connection } = await supabase
      .from("sp_api_connections")
      .select("id, marketplace, refresh_token, access_token, token_expires_at")
      .eq("org_id", orgId)
      .eq("status", "active")
      .single();

    if (!connection) {
      return NextResponse.json({
        error: "No hay conexión SP-API activa. Configurá tu cuenta de Amazon en Settings > SP-API para usar esta función.",
      }, { status: 400 });
    }

    let accessToken = connection.access_token;

    if (connection.token_expires_at && new Date(connection.token_expires_at).getTime() <= Date.now() + 60000) {
      const tokens = await refreshAccessToken(connection.refresh_token);
      accessToken = tokens.access_token;
      await supabase.from("sp_api_connections").update({
        access_token: tokens.access_token,
        token_expires_at: new Date(Date.now() + tokens.expires_in * 1000).toISOString(),
      }).eq("id", connection.id);
    }

    const client = new SpApiClient({
      accessToken,
      refreshToken: connection.refresh_token,
      marketplace: connection.marketplace,
    });

    const catalog = await getCatalogItem(client, asin, client.getMarketplaceId());

    const listingData = {
      asin,
      title: catalog?.title ?? "Unknown Product",
      price: null,
      currency: "USD",
      category: catalog?.category ?? "Unknown",
      brand: catalog?.brand ?? "Unknown",
      bulletPoints: [],
      images: catalog?.image_url ? [catalog.image_url] : [],
      description: catalog?.description ?? undefined,
    };

    const prompt = buildAnalyzeProductPrompt(listingData);

    const completion = await getXAIClient().chat.completions.create({
      model: "grok-4.5",
      messages: [{ role: "user", content: prompt }],
      temperature: 0.3,
      response_format: { type: "json_object" },
    });

    const content = completion.choices[0]?.message?.content;
    if (!content) {
      return NextResponse.json({ error: "No se pudo obtener respuesta del análisis" }, { status: 502 });
    }

    let parsed: AnalyzeProductResponse;
    try {
      parsed = JSON.parse(content) as AnalyzeProductResponse;
    } catch {
      return NextResponse.json({ error: "Respuesta inválida del análisis. Intentá de nuevo." }, { status: 502 });
    }

    return NextResponse.json({
      asin,
      image_url: catalog?.image_url ?? null,
      analysis: parsed,
    });
  } catch (error) {
    return apiErrorResponse(error, 500, "POST /api/research/analyze");
  }
}
