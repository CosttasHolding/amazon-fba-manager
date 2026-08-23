export const dynamic = "force-dynamic";

import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { isValidUuid } from "@/lib/api-utils";
import { getOrgId } from "@/lib/org-resolver";

export async function DELETE(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const orgId = await getOrgId(supabase, user.id, req);
    if (!orgId) return NextResponse.json({ error: "No hay organización activa" }, { status: 400 });
    if (!isValidUuid(params.id)) return NextResponse.json({ error: "ID inválido" }, { status: 400 });

    const { error } = await supabase
      .from("sp_api_connections")
      .delete()
      .eq("id", params.id)
      .eq("org_id", orgId);

    if (error) throw error;

    return NextResponse.json({ success: true });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Error deleting connection";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
