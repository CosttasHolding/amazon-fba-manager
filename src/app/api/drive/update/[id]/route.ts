export const dynamic = "force-dynamic";

import { NextRequest, NextResponse } from "next/server";
import { Readable } from "stream";
import { createClient } from "@/lib/supabase/server";
import { getDriveClient } from "@/lib/drive";

export async function PUT(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    if (!params.id) return NextResponse.json({ error: "Missing file ID" }, { status: 400 });

    const { content } = await req.json();
    if (typeof content !== "string") {
      return NextResponse.json({ error: "Content debe ser un string" }, { status: 400 });
    }

    const drive = await getDriveClient();
    const buffer = Buffer.from(content, "utf-8");

    await drive.files.update({
      fileId: params.id,
      media: {
        mimeType: "text/plain; charset=utf-8",
        body: Readable.from(buffer),
      },
    });

    return NextResponse.json({ data: { success: true } });
  } catch (error) {
    const msg = error instanceof Error ? error.message : "Error al actualizar archivo";
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
