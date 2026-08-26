export const dynamic = "force-dynamic";

import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { getDriveClientForConnection } from "@/lib/drive";
import { getOrgId } from "@/lib/org-resolver";
import { enforceDriveRateLimit } from "@/lib/drive/rate-limit";
import {
  assertFileWithinRoot,
  assertFolderWithinRoot,
  FolderOutsideRootError,
} from "@/lib/drive/folder-guard";

export async function GET(req: NextRequest) {
  try {
    const rateLimitResponse = await enforceDriveRateLimit(req);
    if (rateLimitResponse) return rateLimitResponse;

    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    const orgId = await getOrgId(supabase, user.id, req);
    if (!orgId) return NextResponse.json({ error: "No hay organización activa" }, { status: 400 });

    const { searchParams } = new URL(req.url);
    const connectionId = searchParams.get("connectionId") || undefined;
    const requestedFolderId = searchParams.get("folderId");
    const pageToken = searchParams.get("pageToken");

    let drive: Awaited<ReturnType<typeof getDriveClientForConnection>>["drive"];
    let connection: Awaited<ReturnType<typeof getDriveClientForConnection>>["connection"];
    try {
      ({ drive, connection } = await getDriveClientForConnection(
        supabase,
        user.id,
        orgId,
        connectionId,
      ));
    } catch (error) {
      if (error instanceof Error && error.message.startsWith("Drive no conectado:")) {
        return NextResponse.json({ error: "Drive no conectado" }, { status: 403 });
      }
      throw error;
    }

    const rootId = connection.rootFolderId;
    const folderId = !requestedFolderId || requestedFolderId === "root" ? rootId : requestedFolderId;
    if (folderId !== rootId) {
      try {
        await assertFolderWithinRoot(drive, folderId, rootId);
      } catch (err) {
        if (err instanceof FolderOutsideRootError) {
          return NextResponse.json({ error: err.message }, { status: 403 });
        }
        throw err;
      }
    }
    const res = await drive.files.list({
      q: `'${folderId}' in parents and trashed = false`,
      fields: "files(id,name,mimeType,size,modifiedTime,createdTime,parents,webViewLink,iconLink),nextPageToken",
      orderBy: "folder,name_natural",
      pageSize: 1000,
      pageToken: pageToken || undefined,
      supportsAllDrives: true,
      includeItemsFromAllDrives: true,
    });

    for (const file of res.data.files || []) {
      try {
        if (!file.id) throw new FolderOutsideRootError();
        await assertFileWithinRoot(drive, file.id, rootId);
      } catch (err) {
        if (err instanceof FolderOutsideRootError) {
          return NextResponse.json({ error: err.message }, { status: 403 });
        }
        throw err;
      }
    }

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

    return NextResponse.json({
      data: {
        connection: {
          id: connection.id,
          label: connection.label,
          google_account_email: connection.googleAccountEmail,
          status: "active",
        },
        files,
        nextPageToken: res.data.nextPageToken || null,
      },
    });
  } catch {
    return NextResponse.json({ error: "Error al listar archivos" }, { status: 500 });
  }
}
