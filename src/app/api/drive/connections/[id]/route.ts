export const dynamic = "force-dynamic";

import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { hasOrgRole } from "@/lib/api-handler";
import { getOrgId } from "@/lib/org-resolver";
import { revokeDriveConnectionSecret } from "@/lib/drive/connection-secrets";
import { enforceDriveRateLimit } from "@/lib/drive/rate-limit";

export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } },
) {
  try {
    const rateLimitResponse = await enforceDriveRateLimit(request);
    if (rateLimitResponse) return rateLimitResponse;

    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    if (!params.id) return NextResponse.json({ error: "Missing connection ID" }, { status: 400 });

    const orgId = await getOrgId(supabase, user.id, request);
    if (!orgId) return NextResponse.json({ error: "No hay organización activa" }, { status: 400 });
    if (!(await hasOrgRole(supabase, user.id, orgId, ["owner", "admin"]))) {
      return NextResponse.json({ error: "Permisos insuficientes" }, { status: 403 });
    }

    const { data: connection, error: lookupError } = await supabase
      .from("drive_connections")
      .select("id")
      .eq("id", params.id)
      .eq("org_id", orgId)
      .maybeSingle();
    if (lookupError || !connection) return NextResponse.json({ error: "Conexión no encontrada" }, { status: 404 });

    await revokeDriveConnectionSecret(supabase, user.id, orgId, params.id);
    return NextResponse.json({ data: { success: true } });
  } catch {
    return NextResponse.json({ error: "No se pudo revocar la conexión" }, { status: 500 });
  }
}
