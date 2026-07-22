import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createApiHandler, getOrgId } from "@/lib/api-handler";

const alertRuleSchema = {
  name: (v: unknown) => typeof v === "string" && v.length > 0 && v.length <= 255,
  type: (v: unknown) => typeof v === "string" && ["low_stock", "sales_drop", "fee_change", "price_change"].includes(v),
  enabled: (v: unknown) => typeof v === "boolean",
  threshold: (v: unknown) => typeof v === "number" && v >= 0,
  notify_email: (v: unknown) => v === undefined || v === null || typeof v === "boolean",
};

export const GET = createApiHandler(async ({ supabase, orgId }) => {
  if (!orgId) return NextResponse.json({ error: "No hay organización activa" }, { status: 400 });

  const { data, error } = await supabase
    .from("alert_rules")
    .select("*")
    .eq("org_id", orgId)
    .order("created_at", { ascending: false });

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ data });
});

export const POST = createApiHandler(async ({ supabase, user, orgId, req }) => {
  if (!orgId) return NextResponse.json({ error: "No hay organización activa" }, { status: 400 });

  const body = await req.json();
  if (!body.name || !body.type) {
    return NextResponse.json({ error: "name y type son requeridos" }, { status: 400 });
  }
  if (typeof body.name !== "string" || body.name.length > 255) {
    return NextResponse.json({ error: "name inválido" }, { status: 400 });
  }

  const { data, error } = await supabase
    .from("alert_rules")
    .insert({ name: body.name, type: body.type, enabled: body.enabled ?? true, threshold: body.threshold, notify_email: body.notify_email ?? true, user_id: user.id, org_id: orgId })
    .select()
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ data });
});

export async function PATCH(req: NextRequest) {
  try {
    const supabase = await createClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const orgId = await getOrgId(supabase, user.id, req);
    if (!orgId) return NextResponse.json({ error: "No hay organización activa" }, { status: 400 });

    const body = await req.json();
    const { id, ...rawUpdates } = body;
    if (!id) return NextResponse.json({ error: "ID requerido" }, { status: 400 });

    const ALLOWED_FIELDS = ["name", "type", "enabled", "threshold", "notify_email"];
    const updates: Record<string, unknown> = {};
    for (const key of ALLOWED_FIELDS) {
      if (key in rawUpdates) updates[key] = rawUpdates[key];
    }

    const { data, error } = await supabase
      .from("alert_rules")
      .update(updates)
      .eq("id", id)
      .eq("org_id", orgId)
      .select()
      .single();

    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    return NextResponse.json({ data });
  } catch (err) {
    return NextResponse.json({ error: "Error interno" }, { status: 500 });
  }
}

export async function DELETE(req: NextRequest) {
  try {
    const supabase = await createClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const orgId = await getOrgId(supabase, user.id, req);
    if (!orgId) return NextResponse.json({ error: "No hay organización activa" }, { status: 400 });

    const { searchParams } = req.nextUrl;
    const id = searchParams.get("id");
    if (!id) return NextResponse.json({ error: "ID requerido" }, { status: 400 });

    const { error } = await supabase
      .from("alert_rules")
      .delete()
      .eq("id", id)
      .eq("org_id", orgId);

    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    return NextResponse.json({ success: true });
  } catch (err) {
    return NextResponse.json({ error: "Error interno" }, { status: 500 });
  }
}
