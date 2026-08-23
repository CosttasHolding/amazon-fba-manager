export const dynamic = "force-dynamic";

import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { getDriveClient, getRootFolderId } from "@/lib/drive";
import {
  assertFileWithinRoot,
  FolderOutsideRootError,
} from "@/lib/drive/folder-guard";

export async function GET(
  _req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    if (!params.id) return NextResponse.json({ error: "Missing file ID" }, { status: 400 });

    const drive = await getDriveClient();
    try {
      await assertFileWithinRoot(drive, params.id, getRootFolderId());
    } catch (err) {
      if (err instanceof FolderOutsideRootError) {
        return NextResponse.json({ error: err.message }, { status: 403 });
      }
      throw err;
    }
    const fileMeta = await drive.files.get({
      fileId: params.id,
      fields: "name,mimeType",
    });

    const res = await drive.files.get(
      { fileId: params.id, alt: "media" },
      { responseType: "stream" }
    );

    const contentType = fileMeta.data.mimeType || "application/octet-stream";
    const fileName = fileMeta.data.name || "download";

    return new NextResponse(res.data as unknown as ReadableStream, {
      headers: {
        "Content-Type": contentType,
        "Content-Disposition": `attachment; filename="${fileName}"`,
      },
    });
  } catch (error) {
    const msg = error instanceof Error ? error.message : "Error al descargar archivo";
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
