export const dynamic = "force-dynamic";

import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { getDriveClientForConnection } from "@/lib/drive";
import { getOrgId } from "@/lib/org-resolver";
import { hasOrgRole } from "@/lib/api-handler";
import { enforceDriveRateLimit } from "@/lib/drive/rate-limit";
import { getDriveRouteError } from "@/lib/drive/route-errors";
import { driveNameSchema } from "@/validations/drive";
import {
  assertFileWithinRoot,
  FolderOutsideRootError,
} from "@/lib/drive/folder-guard";

export async function PATCH(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const rateLimitResponse = await enforceDriveRateLimit(req);
    if (rateLimitResponse) return rateLimitResponse;

    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    if (!params.id) return NextResponse.json({ error: "Missing file ID" }, { status: 400 });
    const orgId = await getOrgId(supabase, user.id, req);
    if (!orgId) return NextResponse.json({ error: "No hay organización activa" }, { status: 400 });
    if (!(await hasOrgRole(supabase, user.id, orgId))) {
      return NextResponse.json({ error: "Permisos insuficientes" }, { status: 403 });
    }

    let body: unknown;
    try {
      body = await req.json();
    } catch {
      return NextResponse.json({ error: "JSON inválido" }, { status: 400 });
    }
    const nameResult = driveNameSchema.safeParse(
      body && typeof body === "object" && "name" in body ? body.name : undefined,
    );
    if (!nameResult.success) {
      return NextResponse.json({ error: "Nombre requerido" }, { status: 400 });
    }

    const connectionId = new URL(req.url).searchParams.get("connectionId") || undefined;
    const { drive, connection } = await getDriveClientForConnection(
      supabase,
      user.id,
      orgId,
      connectionId,
    );
    const rootId = connection.rootFolderId;
    try {
      await assertFileWithinRoot(drive, params.id, rootId);
    } catch (err) {
      if (err instanceof FolderOutsideRootError) {
        return NextResponse.json({ error: err.message }, { status: 403 });
      }
      throw err;
    }
    await drive.files.update({
      fileId: params.id,
      requestBody: { name: nameResult.data },
      fields: "id,name",
    });

    return NextResponse.json({ data: { success: true, name: nameResult.data } });
  } catch (error) {
    const result = getDriveRouteError(error, "Error al renombrar archivo");
    return NextResponse.json({ error: result.message }, { status: result.status });
  }
}
