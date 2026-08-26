import "server-only";

import { hasOrgRole } from "@/lib/api-handler";
import { decryptDriveToken } from "@/lib/drive/crypto";
import { createClient, createServiceRoleClient } from "@/lib/supabase/server";
import type { DriveConnectionMetadata } from "./types";

type UserScopedSupabaseClient = Awaited<ReturnType<typeof createClient>>;

const DRIVE_CONNECTION_ERROR = "Drive no conectado: no se pudo cargar la conexión";
const DRIVE_CONNECTION_WRITE_ERROR = "Drive no conectado: no se pudo guardar la conexión";

type DriveConnectionWriteTarget = {
  id: string;
  provider: "google_drive";
  label: string;
  root_folder_id: string;
};

async function assertConnectionAdmin(
  supabase: UserScopedSupabaseClient,
  userId: string,
  orgId: string,
  connectionId: string,
): Promise<DriveConnectionWriteTarget> {
  if (!userId || !orgId || !connectionId || !(await hasOrgRole(supabase, userId, orgId, ["owner", "admin"]))) {
    throw new Error(DRIVE_CONNECTION_WRITE_ERROR);
  }

  const { data, error } = await supabase
    .from("drive_connections")
    .select("id, provider, label, root_folder_id")
    .eq("id", connectionId)
    .eq("org_id", orgId)
    .maybeSingle();

  if (error || !data) {
    throw new Error(DRIVE_CONNECTION_WRITE_ERROR);
  }

  return data as DriveConnectionWriteTarget;
}

async function callUpsertDriveConnection(
  orgId: string,
  provider: "google_drive",
  label: string,
  rootFolderId: string,
  createdByUserId: string,
  actorUserId: string,
  encryptedToken: string,
  connectionId?: string,
): Promise<string> {
  try {
    const { data, error } = await createServiceRoleClient().rpc("upsert_drive_connection", {
      p_org_id: orgId,
      p_provider: provider,
      p_label: label,
      p_root_folder_id: rootFolderId,
      p_created_by: createdByUserId,
      p_actor_id: actorUserId,
      p_refresh_token_encrypted: encryptedToken,
      p_connection_id: connectionId ?? null,
    });

    if (error || typeof data !== "string") throw new Error(DRIVE_CONNECTION_WRITE_ERROR);
    return data;
  } catch {
    throw new Error(DRIVE_CONNECTION_WRITE_ERROR);
  }
}

export async function upsertDriveConnectionForOrg(
  supabase: UserScopedSupabaseClient,
  userId: string,
  orgId: string,
  rootFolderId: string,
  encryptedToken: string,
): Promise<string> {
  if (!userId || !orgId || !rootFolderId || !encryptedToken) {
    throw new Error(DRIVE_CONNECTION_WRITE_ERROR);
  }
  if (!(await hasOrgRole(supabase, userId, orgId, ["owner", "admin"]))) {
    throw new Error(DRIVE_CONNECTION_WRITE_ERROR);
  }

  return callUpsertDriveConnection(
    orgId,
    "google_drive",
    "Proyecto",
    rootFolderId,
    userId,
    userId,
    encryptedToken,
  );
}

export async function saveDriveRefreshTokenForConnection(
  supabase: UserScopedSupabaseClient,
  userId: string,
  orgId: string,
  connectionId: string,
  encryptedToken: string,
): Promise<void> {
  const connection = await assertConnectionAdmin(supabase, userId, orgId, connectionId);
  if (!encryptedToken) throw new Error(DRIVE_CONNECTION_WRITE_ERROR);

  await callUpsertDriveConnection(
    orgId,
    connection.provider,
    connection.label,
    connection.root_folder_id,
    userId,
    userId,
    encryptedToken,
    connection.id,
  );
}

export async function revokeDriveConnectionSecret(
  supabase: UserScopedSupabaseClient,
  userId: string,
  orgId: string,
  connectionId: string,
): Promise<void> {
  const connection = await assertConnectionAdmin(supabase, userId, orgId, connectionId);

  try {
    const { error } = await createServiceRoleClient().rpc("revoke_drive_connection", {
      p_org_id: orgId,
      p_connection_id: connection.id,
      p_actor_id: userId,
    });

    if (error) throw new Error(DRIVE_CONNECTION_WRITE_ERROR);
  } catch {
    throw new Error(DRIVE_CONNECTION_WRITE_ERROR);
  }
}

export async function getDriveRefreshTokenForConnection(
  supabase: UserScopedSupabaseClient,
  userId: string,
  orgId: string,
  connection: DriveConnectionMetadata,
): Promise<string> {
  if (!userId || !orgId || connection.orgId !== orgId || connection.status !== "active") {
    throw new Error(DRIVE_CONNECTION_ERROR);
  }

  let membership;
  try {
    const result = await supabase
      .from("org_members")
      .select("user_id")
      .eq("user_id", userId)
      .eq("org_id", orgId)
      .eq("status", "active")
      .maybeSingle();
    membership = result.data;
    if (result.error || !membership) {
      throw new Error(DRIVE_CONNECTION_ERROR);
    }
  } catch {
    throw new Error(DRIVE_CONNECTION_ERROR);
  }

  void membership;

  try {
    const serviceRoleClient = createServiceRoleClient();
    const { data, error } = await serviceRoleClient
      .from("drive_connection_secrets")
      .select("refresh_token_encrypted")
      .eq("connection_id", connection.id)
      .eq("org_id", orgId)
      .maybeSingle();

    if (error || !data?.refresh_token_encrypted) {
      throw new Error(DRIVE_CONNECTION_ERROR);
    }

    return decryptDriveToken(data.refresh_token_encrypted);
  } catch {
    throw new Error(DRIVE_CONNECTION_ERROR);
  }
}
