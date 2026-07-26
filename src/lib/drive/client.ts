import { google, drive_v3 } from "googleapis";
import { createClient } from "@/lib/supabase/server";

function getServiceAccountKey(): string {
  const key = process.env.GOOGLE_SERVICE_ACCOUNT_KEY;
  if (!key) {
    throw new Error("GOOGLE_SERVICE_ACCOUNT_KEY no configurada");
  }
  return key;
}

export function getRootFolderId(): string {
  return process.env.GOOGLE_DRIVE_FOLDER_ID || "root";
}

export async function getDriveClient(userId?: string): Promise<drive_v3.Drive> {
  const appUrl = process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000";

  const clientId = process.env.GOOGLE_OAUTH_CLIENT_ID;
  const clientSecret = process.env.GOOGLE_OAUTH_CLIENT_SECRET;

  if (!clientId || !clientSecret) {
    return getServiceAccountDriveClient();
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
    if (refreshToken) {
      const redirectUri = `${appUrl}/api/drive/auth/callback`;
      const oauth2Client = new google.auth.OAuth2(clientId, clientSecret, redirectUri);
      oauth2Client.setCredentials({ refresh_token: refreshToken });
      return google.drive({ version: "v3", auth: oauth2Client });
    }
    } catch (e) {
      console.error("ERROR getting OAuth2 drive client", e);
    }

  return getServiceAccountDriveClient();
}

function getServiceAccountDriveClient(): drive_v3.Drive {
  const keyRaw = getServiceAccountKey();
  const key = JSON.parse(keyRaw);

  const auth = new google.auth.JWT({
    email: key.client_email,
    key: key.private_key,
    scopes: ["https://www.googleapis.com/auth/drive"],
  });

  return google.drive({ version: "v3", auth });
}
