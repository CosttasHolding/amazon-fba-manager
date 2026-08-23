export const dynamic = "force-dynamic";

import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { getOrgId } from "@/lib/api-handler";
import { reimbursementSchema } from "@/validations/reimbursement";

export async function GET(req: NextRequest) {
  try {
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

    let query = supabase.from("reimbursements").select("*, products(name, sku)", { count: "exact" }).eq("org_id", orgId).is("deleted_at", null).order("created_at", { ascending: false }).range(from, to);
    if (status) query = query.eq("status", status);
    const { data, error, count } = await query;
    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    return NextResponse.json({ data: data || [], count, page, limit });
  } catch (e) { console.error("Route error", e); return NextResponse.json({ error: "Error interno" }, { status: 500 }); }
}

export async function POST(req: NextRequest) {
  try {
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
    const result = reimbursementSchema.safeParse(body);
    if (!result.success) return NextResponse.json({ error: "Datos invalidos", details: result.error.flatten().fieldErrors }, { status: 400 });

    if (result.data.product_id) {
      const { data: product } = await supabase
        .from("products")
        .select("id")
        .eq("id", result.data.product_id)
        .eq("org_id", orgId)
        .maybeSingle();
      if (!product) return NextResponse.json({ error: "Producto no pertenece a la organización" }, { status: 400 });
    }

    if (result.data.return_id) {
      const { data: returnRow } = await supabase
        .from("returns")
        .select("id")
        .eq("id", result.data.return_id)
        .eq("org_id", orgId)
        .maybeSingle();
      if (!returnRow) return NextResponse.json({ error: "Devolución no pertenece a la organización" }, { status: 400 });
    }

    const clean = { ...result.data, user_id: user.id, org_id: orgId };
    const { data, error } = await supabase.from("reimbursements").insert(clean).select().single();
    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    return NextResponse.json(data, { status: 201 });
  } catch (e) { console.error("Route error", e); return NextResponse.json({ error: "Error interno" }, { status: 500 }); }
}
