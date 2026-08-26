import { google, drive_v3 } from "googleapis";
import { getDriveRefreshTokenForConnection } from "@/lib/drive/connection-secrets";
import { assertDriveRootIsolated } from "@/lib/drive/root-isolation";
import { createClient } from "@/lib/supabase/server";
import { getDriveRedirectUri } from "@/lib/drive/oauth";
import type { DriveConnectionMetadata } from "@/lib/drive/types";

type UserScopedSupabaseClient = Awaited<ReturnType<typeof createClient>>;

const DRIVE_CONNECTION_SELECT =
  "id, org_id, provider, label, google_account_email, root_folder_id, status, created_at, updated_at";

function toDriveConnectionMetadata(row: {
  id: string;
  org_id: string;
  provider: "google_drive";
  label: string;
  google_account_email: string | null;
  root_folder_id: string;
  status: "active" | "revoked" | "error";
  created_at: string;
  updated_at: string;
}): DriveConnectionMetadata {
  return {
    id: row.id,
    orgId: row.org_id,
    provider: row.provider,
    label: row.label,
    googleAccountEmail: row.google_account_email,
    rootFolderId: row.root_folder_id,
    status: row.status,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

export function isDriveOrgAllowed(orgId: string): boolean {
  const configuredOrgIds = (process.env.GOOGLE_DRIVE_SHARED_ORG_IDS || "")
    .split(/[\s,]+/)
    .map((id) => id.trim())
    .filter(Boolean);
  return configuredOrgIds.length === 0 || configuredOrgIds.includes(orgId);
}

export async function getDriveConnection(
  supabase: UserScopedSupabaseClient,
  orgId: string,
  connectionId?: string,
): Promise<DriveConnectionMetadata | null> {
  try {
    let query = supabase.from("drive_connections").select(DRIVE_CONNECTION_SELECT);

    if (connectionId) {
      query = query.eq("id", connectionId);
    }

    query = query.eq("org_id", orgId).eq("status", "active");

    if (!connectionId) {
      query = query.order("created_at", { ascending: true }).limit(1);
    }

    const { data, error } = await query.maybeSingle();
    if (error || !data || data.org_id !== orgId || data.status !== "active") return null;

    return toDriveConnectionMetadata(data);
  } catch {
    return null;
  }
}

export async function getDriveClientForConnection(
  supabase: UserScopedSupabaseClient,
  userId: string,
  orgId: string,
  connectionId?: string,
): Promise<{ drive: drive_v3.Drive; connection: DriveConnectionMetadata }> {
  const appUrl = process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000";
  const clientId = process.env.GOOGLE_OAUTH_CLIENT_ID;
  const clientSecret = process.env.GOOGLE_OAUTH_CLIENT_SECRET;

  if (!clientId || !clientSecret) {
    throw new Error("Drive no conectado: OAuth de Google no configurado");
  }
  if (!isDriveOrgAllowed(orgId)) {
    throw new Error("Drive no conectado: organización no habilitada");
  }

  try {
    const connection = await getDriveConnection(supabase, orgId, connectionId);
    if (!connection) {
      throw new Error("Drive no conectado: conexión no encontrada");
    }

    const refreshToken = await getDriveRefreshTokenForConnection(
      supabase,
      userId,
      orgId,
      connection,
    );
    const redirectUri = getDriveRedirectUri(appUrl);
    const oauth2Client = new google.auth.OAuth2(clientId, clientSecret, redirectUri);
    oauth2Client.setCredentials({ refresh_token: refreshToken });

    const drive = google.drive({ version: "v3", auth: oauth2Client });
    await assertDriveRootIsolated(drive, supabase, userId, orgId, connection.rootFolderId);

    return {
      drive,
      connection,
    };
  } catch (error) {
    if (error instanceof Error && error.message.startsWith("Drive no conectado:")) {
      throw error;
    }
    throw new Error("Drive no conectado: no se pudo cargar la autorización de Google");
  }
}
