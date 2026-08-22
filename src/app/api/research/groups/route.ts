export const dynamic = "force-dynamic";

import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { createClient } from "@/lib/supabase/server";
import { apiErrorResponse } from "@/lib/api-utils";
import { getOrgId } from "@/lib/api-handler";

const groupSchema = z.object({
  name: z.string().trim().min(1).max(200),
  niche: z.string().trim().max(200).nullish(),
  amazon_category: z.string().trim().max(100).nullish(),
  search_keyword: z.string().trim().max(200).nullish(),
});

type GroupRow = { id: string };
type ProductRow = { group_id: string | null };

export async function GET(req: NextRequest) {
  try {
    const supabase = await createClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) return NextResponse.json({ error: "No autorizado" }, { status: 401 });

    const orgId = await getOrgId(supabase, user.id, req);
    if (!orgId) return NextResponse.json({ error: "No hay organización activa" }, { status: 400 });

    const { data: groupsData, error } = await supabase
      .from("research_groups")
      .select("*")
      .eq("org_id", orgId)
      .is("deleted_at", null)
      .order("created_at", { ascending: false });
    if (error) {
      return NextResponse.json({ error: "Error interno del servidor" }, { status: 500 });
    }

    const groups = (groupsData ?? []) as GroupRow[];
    if (groups.length === 0) return NextResponse.json({ data: [] });

    const { data: productsData, error: productsError } = await supabase
      .from("product_research")
      .select("*")
      .eq("org_id", orgId)
      .is("deleted_at", null)
      .in("group_id", groups.map((g) => g.id));
    if (productsError) {
      return NextResponse.json({ error: "Error interno del servidor" }, { status: 500 });
    }

    const products = (productsData ?? []) as ProductRow[];
    const byGroup = new Map<string, ProductRow[]>();
    for (const product of products) {
      const groupId = product.group_id;
      if (!groupId) continue;
      const bucket = byGroup.get(groupId);
      if (bucket) bucket.push(product);
      else byGroup.set(groupId, [product]);
    }

    const data = groups.map((g) => ({ ...g, products: byGroup.get(g.id) ?? [] }));
    return NextResponse.json({ data });
  } catch (error) {
    return apiErrorResponse(error, 500, "GET /api/research/groups");
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
    const result = groupSchema.safeParse(body);
    if (!result.success) {
      return NextResponse.json({ error: "Datos inválidos", details: result.error.flatten().fieldErrors }, { status: 400 });
    }

    const { data, error } = await supabase
      .from("research_groups")
      .insert({ ...result.data, org_id: orgId })
      .select()
      .single();
    if (error) {
      return NextResponse.json({ error: "Error interno del servidor" }, { status: 500 });
    }

    return NextResponse.json({ data }, { status: 201 });
  } catch (error) {
    return apiErrorResponse(error, 500, "POST /api/research/groups");
  }
}
