export const dynamic = "force-dynamic";

import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { getDriveClient, getDriveRootFolderId } from "@/lib/drive";
import { getOrgId } from "@/lib/org-resolver";
import {
  assertFolderWithinRoot,
  FolderOutsideRootError,
} from "@/lib/drive/folder-guard";

export async function GET(req: NextRequest) {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    const orgId = await getOrgId(supabase, user.id, req);
    if (!orgId) return NextResponse.json({ error: "No hay organización activa" }, { status: 400 });

    const { searchParams } = new URL(req.url);
    const requestedFolderId = searchParams.get("folderId");
    const pageToken = searchParams.get("pageToken");

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
    const res = await drive.files.list({
      q: `'${folderId}' in parents and trashed = false`,
      fields: "files(id,name,mimeType,size,modifiedTime,createdTime,parents,webViewLink,iconLink),nextPageToken",
      orderBy: "folder,name_natural",
      pageSize: 1000,
      pageToken: pageToken || undefined,
    });

    const files = (res.data.files || []).map((f) => ({
      id: f.id!,
      name: f.name!,
      mimeType: f.mimeType!,
      size: f.size || "0",
      modifiedTime: f.modifiedTime!,
      createdTime: f.createdTime!,
      parents: f.parents || [],
      webViewLink: f.webViewLink || undefined,
      iconLink: f.iconLink || undefined,
      isFolder: f.mimeType === "application/vnd.google-apps.folder",
    }));

    return NextResponse.json({ data: { files, nextPageToken: res.data.nextPageToken || null } });
  } catch (error) {
    const msg = error instanceof Error ? error.message : "Error al listar archivos";
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
