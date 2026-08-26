import "server-only";

import { createHash } from "node:crypto";

import { createServiceRoleClient } from "@/lib/supabase/server";

const DRIVE_OAUTH_STATE_TTL_MS = 10 * 60 * 1000;

type DriveOAuthStateInput = {
  state: string;
  userId: string;
  orgId: string;
  rootFolderId: string;
};

type ConsumedDriveOAuthState = {
  user_id: string;
  org_id: string;
  root_folder_id: string;
};

function hashDriveOAuthState(state: string): string {
  return createHash("sha256").update(state, "utf8").digest("hex");
}

export async function createDriveOAuthState(input: DriveOAuthStateInput): Promise<void> {
  if (!input.state || !input.userId || !input.orgId || !input.rootFolderId) {
    throw new Error("No se pudo guardar el estado OAuth de Drive");
  }

  const serviceRoleClient = createServiceRoleClient();
  const { data: membership, error: membershipError } = await serviceRoleClient
    .from("org_members")
    .select("user_id")
    .eq("org_id", input.orgId)
    .eq("user_id", input.userId)
    .eq("status", "active")
    .in("role", ["owner", "admin"])
    .maybeSingle();

  if (membershipError || !membership) {
    throw new Error("No se pudo guardar el estado OAuth de Drive");
  }

  const { error } = await serviceRoleClient
    .from("drive_oauth_states")
    .insert({
      state_hash: hashDriveOAuthState(input.state),
      user_id: input.userId,
      org_id: input.orgId,
      root_folder_id: input.rootFolderId,
      expires_at: new Date(Date.now() + DRIVE_OAUTH_STATE_TTL_MS).toISOString(),
    });

  if (error) throw new Error("No se pudo guardar el estado OAuth de Drive");
}

function isConsumedDriveOAuthState(value: unknown): value is ConsumedDriveOAuthState {
  if (!value || typeof value !== "object") return false;

  const row = value as Record<string, unknown>;
  return typeof row.user_id === "string"
    && typeof row.org_id === "string"
    && typeof row.root_folder_id === "string"
    && row.root_folder_id.length > 0;
}

export async function consumeDriveOAuthState(
  state: string,
): Promise<{ userId: string; orgId: string; rootFolderId: string } | null> {
  if (!state) return null;

  const { data, error } = await createServiceRoleClient().rpc("consume_drive_oauth_state", {
    p_state_hash: hashDriveOAuthState(state),
  });

  if (error) throw new Error("No se pudo consumir el estado OAuth de Drive");

  const row = Array.isArray(data) ? data[0] : null;
  if (!isConsumedDriveOAuthState(row)) return null;

  return {
    userId: row.user_id,
    orgId: row.org_id,
    rootFolderId: row.root_folder_id,
  };
}
