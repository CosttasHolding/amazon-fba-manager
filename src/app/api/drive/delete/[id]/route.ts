export const dynamic = "force-dynamic";

import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { getDriveClient, getDriveRootFolderId } from "@/lib/drive";
import { getOrgId } from "@/lib/org-resolver";
import { hasOrgRole } from "@/lib/api-handler";
import {
  assertFileWithinRoot,
  FolderOutsideRootError,
} from "@/lib/drive/folder-guard";

export async function DELETE(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    if (!params.id) return NextResponse.json({ error: "Missing file ID" }, { status: 400 });
    const orgId = await getOrgId(supabase, user.id, req);
    if (!orgId) return NextResponse.json({ error: "No hay organización activa" }, { status: 400 });
    if (!(await hasOrgRole(supabase, user.id, orgId))) {
      return NextResponse.json({ error: "Permisos insuficientes" }, { status: 403 });
    }

    const drive = await getDriveClient(user.id);
    const rootId = await getDriveRootFolderId(drive, orgId);
    if (!rootId) return NextResponse.json({ error: "Drive no habilitado para esta organización" }, { status: 403 });
    try {
      await assertFileWithinRoot(drive, params.id, rootId);
    } catch (err) {
      if (err instanceof FolderOutsideRootError) {
        return NextResponse.json({ error: err.message }, { status: 403 });
      }
      throw err;
    }
    const fileMeta = await drive.files.get({ fileId: params.id, fields: "mimeType" });
    if (fileMeta.data.mimeType === "application/vnd.google-apps.folder") {
      return NextResponse.json({ error: "Las carpetas deben eliminarse desde Google Drive" }, { status: 400 });
    }
    await drive.files.delete({ fileId: params.id });
    return NextResponse.json({ data: { success: true } });
  } catch (error) {
    const msg = error instanceof Error ? error.message : "Error al eliminar archivo";
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
