export const dynamic = "force-dynamic";

import { NextRequest, NextResponse } from "next/server";
import { Readable } from "stream";
import { createClient } from "@/lib/supabase/server";
import { getDriveClientForConnection } from "@/lib/drive";
import { getOrgId } from "@/lib/org-resolver";
import { hasOrgRole } from "@/lib/api-handler";
import { enforceDriveRateLimit } from "@/lib/drive/rate-limit";
import { getDriveRouteError } from "@/lib/drive/route-errors";
import { driveContentSchema } from "@/validations/drive";
import {
  assertFileWithinRoot,
  FolderOutsideRootError,
} from "@/lib/drive/folder-guard";

export async function PUT(
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
    if (!(await hasOrgRole(supabase, user.id, orgId))) {
      return NextResponse.json({ error: "Permisos insuficientes" }, { status: 403 });
    }

    let body: unknown;
    try {
      body = await req.json();
    } catch {
      return NextResponse.json({ error: "JSON inválido" }, { status: 400 });
    }
    const contentResult = driveContentSchema.safeParse(
      body && typeof body === "object" && "content" in body ? body.content : undefined,
    );
    if (!contentResult.success) {
      return NextResponse.json({ error: "Content debe ser un string" }, { status: 400 });
    }

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
    const buffer = Buffer.from(contentResult.data, "utf-8");

    await drive.files.update({
      fileId: params.id,
      media: {
        mimeType: "text/plain; charset=utf-8",
        body: Readable.from(buffer),
      },
    });

    return NextResponse.json({ data: { success: true } });
  } catch (error) {
    const result = getDriveRouteError(error, "Error al actualizar archivo");
    return NextResponse.json({ error: result.message }, { status: result.status });
  }
}
