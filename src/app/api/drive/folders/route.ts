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
  assertFolderWithinRoot,
  FolderOutsideRootError,
} from "@/lib/drive/folder-guard";

export async function POST(req: NextRequest) {
  try {
    const rateLimitResponse = await enforceDriveRateLimit(req);
    if (rateLimitResponse) return rateLimitResponse;

    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
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
    const parentId = body && typeof body === "object" && "parentId" in body && typeof body.parentId === "string"
      ? body.parentId
      : undefined;
    const connectionId = body && typeof body === "object" && "connectionId" in body && typeof body.connectionId === "string"
      ? body.connectionId
      : undefined;

    const { drive, connection } = await getDriveClientForConnection(
      supabase,
      user.id,
      orgId,
      connectionId,
    );
    const rootId = connection.rootFolderId;
    const targetParent = parentId || rootId;
    try {
      await assertFolderWithinRoot(drive, targetParent, rootId);
    } catch (err) {
      if (err instanceof FolderOutsideRootError) {
        return NextResponse.json({ error: err.message }, { status: 403 });
      }
      throw err;
    }
    const res = await drive.files.create({
      requestBody: {
        name: nameResult.data,
        mimeType: "application/vnd.google-apps.folder",
        parents: [targetParent],
      },
      fields: "id,name,mimeType,createdTime",
    });

    return NextResponse.json({
      data: {
        id: res.data.id!,
        name: res.data.name!,
        mimeType: res.data.mimeType!,
        createdTime: res.data.createdTime!,
      },
    });
  } catch (error) {
    const result = getDriveRouteError(error, "Error al crear carpeta");
    return NextResponse.json({ error: result.message }, { status: result.status });
  }
}
