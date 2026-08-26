import "server-only";

const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export function getDriveRootFolderIdForOrg(orgId: string): string | null {
  if (!UUID_PATTERN.test(orgId)) return null;

  const rawMapping = process.env.GOOGLE_DRIVE_ROOT_FOLDER_IDS;
  if (!rawMapping) return null;

  let mapping: unknown;
  try {
    mapping = JSON.parse(rawMapping);
  } catch {
    return null;
  }

  if (!mapping || typeof mapping !== "object" || Array.isArray(mapping)) return null;

  for (const [mappedOrgId, rootFolderId] of Object.entries(mapping)) {
    const trimmedRootFolderId = typeof rootFolderId === "string" ? rootFolderId.trim() : "";
    if (
      !UUID_PATTERN.test(mappedOrgId)
      || typeof rootFolderId !== "string"
      || !trimmedRootFolderId
      || trimmedRootFolderId !== rootFolderId
      || trimmedRootFolderId === "root"
    ) {
      return null;
    }
  }

  const rootFolderId = (mapping as Record<string, unknown>)[orgId];
  return typeof rootFolderId === "string" && rootFolderId.trim() && rootFolderId !== "root"
    ? rootFolderId
    : null;
}
