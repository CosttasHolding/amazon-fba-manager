export const dynamic = "force-dynamic";

import { NextRequest, NextResponse } from "next/server";
import { Readable } from "stream";
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
    if (!user) return NextResponse.json({ error: "No autorizado" }, { status: 401 });
    const orgId = await getOrgId(supabase, user.id, req);
    if (!orgId) return NextResponse.json({ error: "No hay organización activa" }, { status: 400 });
    if (!(await hasOrgRole(supabase, user.id, orgId))) {
      return NextResponse.json({ error: "Permisos insuficientes" }, { status: 403 });
    }

    const formData = await req.formData();
    const file = formData.get("file") as File | null;
    const requestedFolderId = (formData.get("folderId") as string) || null;

    if (!file) {
      return NextResponse.json({ error: "No se envió ningún archivo" }, { status: 400 });
    }

    if (file.size > 10 * 1024 * 1024) {
      return NextResponse.json({ error: "El archivo excede el límite de 10MB" }, { status: 400 });
    }

    const buffer = Buffer.from(await file.arrayBuffer());
    const drive = await getDriveClient(user.id);
    const rootId = await getDriveRootFolderId(drive, orgId);
    if (!rootId) return NextResponse.json({ error: "Drive no habilitado para esta organización" }, { status: 403 });
    const folderId = !requestedFolderId || requestedFolderId === "root" ? rootId : requestedFolderId;

    try {
      await assertFolderWithinRoot(drive, folderId, rootId);
    } catch (err) {
      if (err instanceof FolderOutsideRootError) {
        return NextResponse.json({ error: err.message }, { status: 403 });
      }
      throw err;
    }

    const res = await drive.files.create({
      requestBody: {
        name: file.name,
        parents: [folderId],
      },
      media: {
        mimeType: file.type || "application/octet-stream",
        body: Readable.from(buffer),
      },
      fields: "id,name,mimeType,size,modifiedTime,createdTime,parents,webViewLink,iconLink",
    });

    return NextResponse.json({
      data: {
        id: res.data.id!,
        name: res.data.name!,
        mimeType: res.data.mimeType!,
        size: res.data.size || "0",
        modifiedTime: res.data.modifiedTime!,
      },
    });
  } catch (error) {
    const msg = error instanceof Error ? error.message : "Error al subir archivo";
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
