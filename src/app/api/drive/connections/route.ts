export const dynamic = "force-dynamic";

import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { getOrgId } from "@/lib/org-resolver";
import { enforceDriveRateLimit } from "@/lib/drive/rate-limit";
import { isDriveOrgAllowed } from "@/lib/drive";

const DRIVE_CONNECTION_METADATA_SELECT =
  "id, org_id, provider, label, google_account_email, root_folder_id, status, created_at, updated_at";

export async function GET(request: NextRequest) {
  try {
    const rateLimitResponse = await enforceDriveRateLimit(request);
    if (rateLimitResponse) return rateLimitResponse;

    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const orgId = await getOrgId(supabase, user.id, request);
    if (!orgId) return NextResponse.json({ error: "No hay organización activa" }, { status: 400 });
    if (!isDriveOrgAllowed(orgId)) {
      return NextResponse.json({ error: "Drive no habilitado para esta organización" }, { status: 403 });
    }

    const { data, error } = await supabase
      .from("drive_connections")
      .select(DRIVE_CONNECTION_METADATA_SELECT)
      .eq("org_id", orgId)
      .order("created_at", { ascending: true });

    if (error) return NextResponse.json({ error: "No se pudieron cargar las conexiones" }, { status: 500 });

    const connections = (data || []).map((connection) => ({
      id: connection.id,
      org_id: connection.org_id,
      provider: connection.provider,
      label: connection.label,
      google_account_email: connection.google_account_email,
      root_folder_id: connection.root_folder_id,
      status: connection.status,
      created_at: connection.created_at,
      updated_at: connection.updated_at,
    }));
    return NextResponse.json({ data: connections });
  } catch {
    return NextResponse.json({ error: "No se pudieron cargar las conexiones" }, { status: 500 });
  }
}
