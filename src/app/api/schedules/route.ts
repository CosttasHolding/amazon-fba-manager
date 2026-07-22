import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createApiHandler, getOrgId } from "@/lib/api-handler";

export const GET = createApiHandler(async ({ supabase, orgId }) => {
  if (!orgId) return NextResponse.json({ error: "No hay organización activa" }, { status: 400 });

  const { data, error } = await supabase
    .from("scheduled_reports")
    .select("*")
    .eq("org_id", orgId)
    .order("created_at", { ascending: false });

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ data });
});

export const POST = createApiHandler(async ({ supabase, user, orgId, req }) => {
  if (!orgId) return NextResponse.json({ error: "No hay organización activa" }, { status: 400 });

  const body = await req.json();
  if (!body.name || !body.type || !body.frequency) {
    return NextResponse.json({ error: "name, type y frequency son requeridos" }, { status: 400 });
  }

  const { data, error } = await supabase
    .from("scheduled_reports")
    .insert({
      name: body.name,
      type: body.type,
      frequency: body.frequency,
      config: body.config || {},
      recipients: body.recipients || [],
      user_id: user.id,
      org_id: orgId,
    })
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

    const ALLOWED_FIELDS = ["name", "type", "frequency", "config", "recipients", "enabled"];
    const updates: Record<string, unknown> = {};
    for (const key of ALLOWED_FIELDS) {
      if (key in rawUpdates) updates[key] = rawUpdates[key];
    }

    const { data, error } = await supabase
      .from("scheduled_reports")
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
      .from("scheduled_reports")
      .delete()
      .eq("id", id)
      .eq("org_id", orgId);

    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    return NextResponse.json({ success: true });
  } catch (err) {
    return NextResponse.json({ error: "Error interno" }, { status: 500 });
  }
}
