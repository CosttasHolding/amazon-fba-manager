import { NextRequest, NextResponse } from "next/server";
import { Readable } from "stream";
import { createClient } from "@/lib/supabase/server";
import { getDriveClient, getRootFolderId } from "@/lib/drive";
import type { BackupType } from "@/lib/drive";
import * as XLSX from "xlsx";

const BACKUP_FOLDER_NAME = "Backups";

async function ensureBackupFolder(drive: Awaited<ReturnType<typeof getDriveClient>>, rootId: string): Promise<string> {
  const existing = await drive.files.list({
    q: `'${rootId}' in parents and name = '${BACKUP_FOLDER_NAME}' and mimeType = 'application/vnd.google-apps.folder' and trashed = false`,
    fields: "files(id)",
    pageSize: 1,
  });

  if (existing.data.files && existing.data.files.length > 0) {
    return existing.data.files[0].id!;
  }

  const folder = await drive.files.create({
    requestBody: {
      name: BACKUP_FOLDER_NAME,
      mimeType: "application/vnd.google-apps.folder",
      parents: [rootId],
    },
    fields: "id",
  });

  return folder.data.id!;
}

async function fetchData(type: BackupType, userId: string) {
  const supabase = await createClient();

  switch (type) {
    case "products": {
      const { data } = await supabase.from("products").select("*").eq("user_id", userId);
      return data || [];
    }
    case "sales": {
      const { data } = await supabase
        .from("sales")
        .select("*, products(name)")
        .eq("user_id", userId)
        .order("sale_date", { ascending: false });
      return data || [];
    }
    case "orders": {
      const { data } = await supabase
        .from("purchase_orders")
        .select("*")
        .eq("user_id", userId)
        .order("created_at", { ascending: false });
      return data || [];
    }
    case "inventory": {
      const { data } = await supabase
        .from("products_with_inventory")
        .select("*")
        .eq("user_id", userId);
      return data || [];
    }
    case "suppliers": {
      const { data } = await supabase.from("suppliers").select("*").eq("user_id", userId);
      return data || [];
    }
    default:
      return [];
  }
}

export async function POST(req: NextRequest) {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      return NextResponse.json({ error: "No autorizado" }, { status: 401 });
    }

    const { type } = await req.json();
    if (!type) {
      return NextResponse.json({ error: "Tipo de backup requerido" }, { status: 400 });
    }

    const data = await fetchData(type as BackupType, user.id);
    const ws = XLSX.utils.json_to_sheet(data);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, type);

    const buffer = XLSX.write(wb, { type: "buffer", bookType: "xlsx" });

    const now = new Date();
    const timestamp = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}-${String(now.getDate()).padStart(2, "0")}_${String(now.getHours()).padStart(2, "0")}${String(now.getMinutes()).padStart(2, "0")}${String(now.getSeconds()).padStart(2, "0")}`;
    const fileName = `${type}_${timestamp}.xlsx`;

    const drive = await getDriveClient();
    const rootId = getRootFolderId();
    const backupFolderId = await ensureBackupFolder(drive, rootId);

    const file = await drive.files.create({
      requestBody: {
        name: fileName,
        parents: [backupFolderId],
      },
      media: {
        mimeType: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        body: Readable.from(buffer),
      },
      fields: "id,name",
    });

    return NextResponse.json({
      data: {
        success: true,
        fileId: file.data.id,
        fileName: file.data.name,
        records: data.length,
      },
    });
  } catch (error) {
    const msg = error instanceof Error ? error.message : "Error al hacer backup";
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
