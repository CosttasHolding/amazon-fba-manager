export const dynamic = "force-dynamic";

import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { getDriveClient, getRootFolderId } from "@/lib/drive";
import {
  assertFileWithinRoot,
  FolderOutsideRootError,
} from "@/lib/drive/folder-guard";

export async function DELETE(
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
    await drive.files.delete({ fileId: params.id });
    return NextResponse.json({ data: { success: true } });
  } catch (error) {
    const msg = error instanceof Error ? error.message : "Error al eliminar archivo";
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
