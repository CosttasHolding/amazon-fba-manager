import { google, drive_v3 } from "googleapis";
import { createClient } from "@/lib/supabase/server";

export function getRootFolderId(): string {
  return process.env.GOOGLE_DRIVE_FOLDER_ID || "root";
}

const ORG_ROOT_PREFIX = "Amazon FBA Manager - ";

function escapeDriveQueryValue(value: string): string {
  return value.replace(/\\/g, "\\\\").replace(/'/g, "\\'");
}

export async function getOrgRootFolderId(
  drive: drive_v3.Drive,
  orgId: string
): Promise<string> {
  const configuredRootId = getRootFolderId();
  const folderName = `${ORG_ROOT_PREFIX}${orgId}`;
  const existing = await drive.files.list({
    q: `'${escapeDriveQueryValue(configuredRootId)}' in parents and name = '${escapeDriveQueryValue(folderName)}' and mimeType = 'application/vnd.google-apps.folder' and trashed = false`,
    fields: "files(id)",
    pageSize: 1,
    spaces: "drive",
  });

  const existingFolder = existing.data.files?.[0]?.id;
  if (existingFolder) return existingFolder;

  const folder = await drive.files.create({
    requestBody: {
      name: folderName,
      mimeType: "application/vnd.google-apps.folder",
      parents: [configuredRootId],
    },
    fields: "id",
  });

  if (!folder.data.id) {
    throw new Error("Drive no conectado: no se pudo crear la carpeta de organización");
  }
  return folder.data.id;
}

export async function getDriveClient(userId?: string): Promise<drive_v3.Drive> {
  const appUrl = process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000";

  const clientId = process.env.GOOGLE_OAUTH_CLIENT_ID;
  const clientSecret = process.env.GOOGLE_OAUTH_CLIENT_SECRET;

  if (!clientId || !clientSecret) {
    throw new Error("Drive no conectado: OAuth de Google no configurado");
  }

  async function getRefreshToken(): Promise<string | null> {
    if (userId) {
      const svcKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
      if (!svcKey) return null;
      const { createClient: createAdmin } = await import("@supabase/supabase-js");
      const admin = createAdmin(process.env.NEXT_PUBLIC_SUPABASE_URL!, svcKey);
      const { data } = await admin
        .from("user_settings")
        .select("drive_refresh_token")
        .eq("user_id", userId)
        .single();
      return data?.drive_refresh_token ?? null;
    }
    try {
      const supabase = await createClient();
      const { data: { user } } = await supabase.auth.getUser();
      if (!user?.id) return null;
      const { data: settings } = await supabase
        .from("user_settings")
        .select("drive_refresh_token")
        .eq("user_id", user.id)
        .single();
      return settings?.drive_refresh_token ?? null;
    } catch {
      return null;
    }
  }

  try {
    const refreshToken = await getRefreshToken();
    if (!refreshToken) {
      throw new Error("Drive no conectado: conecta tu cuenta de Google Drive");
    }

    const redirectUri = `${appUrl}/api/drive/auth/callback`;
    const oauth2Client = new google.auth.OAuth2(clientId, clientSecret, redirectUri);
    oauth2Client.setCredentials({ refresh_token: refreshToken });
    return google.drive({ version: "v3", auth: oauth2Client });
  } catch (error) {
    if (error instanceof Error && error.message.startsWith("Drive no conectado:")) {
      throw error;
    }
    throw new Error("Drive no conectado: no se pudo cargar la autorización de Google");
  }
}
