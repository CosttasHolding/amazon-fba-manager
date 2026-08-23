export const dynamic = "force-dynamic";

import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { getDriveClient, getDriveRootFolderId } from "@/lib/drive";
import { getOrgId } from "@/lib/org-resolver";
import { hasOrgRole } from "@/lib/api-handler";
import {
  assertFolderWithinRoot,
  FolderOutsideRootError,
} from "@/lib/drive/folder-guard";

export async function POST(req: NextRequest) {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    const orgId = await getOrgId(supabase, user.id, req);
    if (!orgId) return NextResponse.json({ error: "No hay organización activa" }, { status: 400 });
    if (!(await hasOrgRole(supabase, user.id, orgId))) {
      return NextResponse.json({ error: "Permisos insuficientes" }, { status: 403 });
    }

    const { name, parentId } = await req.json();
    if (!name || typeof name !== "string") {
      return NextResponse.json({ error: "Nombre requerido" }, { status: 400 });
    }

    const drive = await getDriveClient(user.id);
    const rootId = await getDriveRootFolderId(drive, orgId);
    if (!rootId) return NextResponse.json({ error: "Drive no habilitado para esta organización" }, { status: 403 });
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
        name,
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
    const msg = error instanceof Error ? error.message : "Error al crear carpeta";
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
