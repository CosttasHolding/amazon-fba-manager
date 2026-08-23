export const dynamic = "force-dynamic";

import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { getOrgId } from "@/lib/api-handler";
import { returnSchema } from "@/validations/return";
import { buildRateLimitKey, rateLimit } from "@/lib/rate-limit";

async function enforceRateLimit(req: NextRequest): Promise<NextResponse | null> {
  const ip = req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || "unknown";
  const result = await rateLimit(buildRateLimitKey(ip, req.nextUrl.pathname), 60, 60000);
  if (result.allowed) return null;
  return NextResponse.json(
    { error: "Demasiadas solicitudes. Intente nuevamente más tarde." },
    { status: 429, headers: { "Retry-After": String(Math.ceil((result.resetAt - Date.now()) / 1000)) } },
  );
}

export async function GET(req: NextRequest) {
  try {
    const rateLimitResponse = await enforceRateLimit(req);
    if (rateLimitResponse) return rateLimitResponse;
    const supabase = await createClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) return NextResponse.json({ error: "No autorizado" }, { status: 401 });

    const orgId = await getOrgId(supabase, user.id, req);
    if (!orgId) return NextResponse.json({ error: "No hay organización activa" }, { status: 400 });

    const { searchParams } = new URL(req.url);
    const status = searchParams.get("status");
    const page = Math.max(1, parseInt(searchParams.get("page") || "1"));
    const limit = Math.min(200, Math.max(1, parseInt(searchParams.get("limit") || "50")));
    const from = (page - 1) * limit;
    const to = from + limit - 1;

    let query = supabase.from("returns").select("*, products(name, sku)", { count: "exact" }).eq("org_id", orgId).order("return_date", { ascending: false }).range(from, to);
    if (status) query = query.eq("status", status);
    const { data, error, count } = await query;
    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    return NextResponse.json({ data: data || [], count, page, limit });
  } catch (e) { console.error("Route error", e); return NextResponse.json({ error: "Error interno" }, { status: 500 }); }
}

export async function POST(req: NextRequest) {
  try {
    const rateLimitResponse = await enforceRateLimit(req);
    if (rateLimitResponse) return rateLimitResponse;
    const supabase = await createClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) return NextResponse.json({ error: "No autorizado" }, { status: 401 });

    const orgId = await getOrgId(supabase, user.id, req);
    if (!orgId) return NextResponse.json({ error: "No hay organización activa" }, { status: 400 });

    const { data: membership } = await supabase
      .from("org_members")
      .select("role")
      .eq("user_id", user.id)
      .eq("org_id", orgId)
      .eq("status", "active")
      .maybeSingle();
    if (!membership || !["owner", "admin", "editor"].includes(membership.role)) {
      return NextResponse.json({ error: "Permisos insuficientes" }, { status: 403 });
    }

    const body = await req.json();
    const result = returnSchema.safeParse(body);
    if (!result.success) return NextResponse.json({ error: "Datos invalidos", details: result.error.flatten().fieldErrors }, { status: 400 });

    const { data: product } = await supabase
      .from("products")
      .select("id")
      .eq("id", result.data.product_id)
      .eq("org_id", orgId)
      .maybeSingle();
    if (!product) return NextResponse.json({ error: "Producto no pertenece a la organización" }, { status: 400 });

    const clean = { ...result.data, user_id: user.id, org_id: orgId };
    const { data, error } = await supabase.from("returns").insert(clean).select().single();
    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    return NextResponse.json(data, { status: 201 });
  } catch (e) { console.error("Route error", e); return NextResponse.json({ error: "Error interno" }, { status: 500 }); }
}
