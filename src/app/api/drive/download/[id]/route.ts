export const dynamic = "force-dynamic";

import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { getDriveClientForConnection } from "@/lib/drive";
import { getOrgId } from "@/lib/org-resolver";
import { enforceDriveRateLimit } from "@/lib/drive/rate-limit";
import {
  assertFileWithinRoot,
  FolderOutsideRootError,
} from "@/lib/drive/folder-guard";
import { buildContentDisposition } from "@/lib/drive/download";
import { getDriveRouteError } from "@/lib/drive/route-errors";

export async function GET(
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
        "Content-Disposition": buildContentDisposition(fileName),
      },
    });
  } catch (error) {
    const result = getDriveRouteError(error, "Error al descargar archivo");
    return NextResponse.json({ error: result.message }, { status: result.status });
  }
}
