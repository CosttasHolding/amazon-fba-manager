export const dynamic = "force-dynamic";

import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { getDriveClient, getRootFolderId } from "@/lib/drive";
import {
  assertFolderWithinRoot,
  FolderOutsideRootError,
} from "@/lib/drive/folder-guard";

export async function POST(req: NextRequest) {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const { name, parentId } = await req.json();
    if (!name || typeof name !== "string") {
      return NextResponse.json({ error: "Nombre requerido" }, { status: 400 });
    }

    const drive = await getDriveClient();
    const targetParent = parentId || getRootFolderId();
    try {
      await assertFolderWithinRoot(drive, targetParent, getRootFolderId());
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
