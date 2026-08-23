export const dynamic = "force-dynamic";

import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createApiHandler, getOrgId } from "@/lib/api-handler";

const SHARING_DISABLED = true;

function sharingDisabledResponse() {
  return NextResponse.json(
    { error: "La función de compartir está temporalmente deshabilitada" },
    { status: 503 },
  );
}

const getShareLinks = createApiHandler(async ({ supabase, user, orgId }) => {
  if (!orgId) return NextResponse.json({ error: "No hay organización activa" }, { status: 400 });

  const { data, error } = await supabase
    .from("shared_links")
    .select("*")
    .eq("user_id", user.id)
    .eq("org_id", orgId)
    .order("created_at", { ascending: false });

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ data });
});

const createShareLink = createApiHandler(async ({ supabase, user, orgId, req }) => {
  if (!orgId) return NextResponse.json({ error: "No hay organización activa" }, { status: 400 });

  const body = await req.json();
  const { title } = body;

  const { data, error } = await supabase
    .from("shared_links")
    .insert({ user_id: user.id, org_id: orgId, title: title || "Dashboard Compartido" })
    .select()
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ data });
});

async function deleteShareLink(req: NextRequest) {
  try {
    const supabase = await createClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const orgId = await getOrgId(supabase, user.id, req);
    if (!orgId) return NextResponse.json({ error: "No hay organización activa" }, { status: 400 });

    const { searchParams } = req.nextUrl;
    const token = searchParams.get("token");
    if (!token) return NextResponse.json({ error: "Token requerido" }, { status: 400 });

    const { error } = await supabase
      .from("shared_links")
      .update({ active: false })
      .eq("token", token)
      .eq("user_id", user.id)
      .eq("org_id", orgId);

    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    return NextResponse.json({ success: true });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Error interno";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function GET(req: NextRequest) {
  if (SHARING_DISABLED) return sharingDisabledResponse();
  return getShareLinks(req);
}

export async function POST(req: NextRequest) {
  if (SHARING_DISABLED) return sharingDisabledResponse();
  return createShareLink(req);
}

export async function DELETE(req: NextRequest) {
  if (SHARING_DISABLED) return sharingDisabledResponse();
  return deleteShareLink(req);
}
