import "server-only";

import type { drive_v3 } from "googleapis";
import { createClient, createServiceRoleClient } from "@/lib/supabase/server";
import {
  assertFolderWithinRoot,
  FolderOutsideRootError,
} from "@/lib/drive/folder-guard";

type UserScopedSupabaseClient = Awaited<ReturnType<typeof createClient>>;

const ROOT_ISOLATION_ERROR = "Drive no habilitado para esta organización";

export class DriveRootIsolationError extends Error {
  constructor() {
    super(ROOT_ISOLATION_ERROR);
    this.name = "DriveRootIsolationError";
  }
}

function failRootIsolation(): never {
  throw new DriveRootIsolationError();
}

async function isWithinRoot(
  drive: drive_v3.Drive,
  folderId: string,
  rootId: string,
): Promise<boolean> {
  try {
    await assertFolderWithinRoot(drive, folderId, rootId);
    return true;
  } catch (error) {
    if (error instanceof FolderOutsideRootError) return false;
    throw error;
  }
}

export async function assertDriveRootIsolated(
  drive: drive_v3.Drive,
  supabase: UserScopedSupabaseClient,
  userId: string,
  orgId: string,
  rootFolderId: string,
): Promise<void> {
  if (!userId || !orgId || !rootFolderId || rootFolderId.trim() !== rootFolderId || rootFolderId === "root") {
    failRootIsolation();
  }

  let membership: unknown;
  try {
    const result = await supabase
      .from("org_members")
      .select("user_id")
      .eq("user_id", userId)
      .eq("org_id", orgId)
      .eq("status", "active")
      .maybeSingle();
    membership = result.data;
    if (
      result.error
      || !membership
      || typeof membership !== "object"
      || !("user_id" in membership)
      || membership.user_id !== userId
    ) {
      failRootIsolation();
    }
  } catch {
    failRootIsolation();
  }

  let data: unknown;
  let error: unknown;
  try {
    const result = await createServiceRoleClient()
      .from("drive_connections")
      .select("org_id, root_folder_id")
      .eq("status", "active");
    data = result.data;
    error = result.error;
  } catch {
    failRootIsolation();
  }

  if (error || !Array.isArray(data)) failRootIsolation();

  for (const row of data) {
    if (!row || typeof row !== "object" || !("org_id" in row)) failRootIsolation();
    const otherOrgId = row.org_id;
    if (typeof otherOrgId !== "string" || !otherOrgId.trim()) failRootIsolation();
    if (otherOrgId === orgId) continue;
    if (!("root_folder_id" in row) || typeof row.root_folder_id !== "string") failRootIsolation();

    const otherRootFolderId = row.root_folder_id;
    if (!otherRootFolderId || otherRootFolderId.trim() !== otherRootFolderId) failRootIsolation();
    if (rootFolderId === "root" || otherRootFolderId === "root") failRootIsolation();
    if (rootFolderId === otherRootFolderId) failRootIsolation();

    if (await isWithinRoot(drive, rootFolderId, otherRootFolderId)) failRootIsolation();
    if (await isWithinRoot(drive, otherRootFolderId, rootFolderId)) failRootIsolation();
  }
}
