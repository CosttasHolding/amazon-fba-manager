import type { drive_v3 } from "googleapis";

export class FolderOutsideRootError extends Error {
  constructor() {
    super("Carpeta fuera del espacio autorizado");
    this.name = "FolderOutsideRootError";
  }
}

const MAX_ANCESTOR_DEPTH = 25;

type FolderMeta = { parents: string[]; trashed: boolean };
type MetadataCache = Map<string, Promise<FolderMeta>>;

async function getFolderMeta(
  drive: drive_v3.Drive,
  fileId: string,
  cache: MetadataCache
): Promise<FolderMeta> {
  const cached = cache.get(fileId);
  if (cached) return cached;

  const request = (async () => {
    try {
      const res = await drive.files.get({
        fileId,
        fields: "id,parents,trashed",
      });
      if (!res.data) throw new Error("Drive metadata missing");
      return {
        parents: res.data.parents || [],
        trashed: Boolean(res.data.trashed),
      };
    } catch {
      throw new FolderOutsideRootError();
    }
  })();

  cache.set(fileId, request);
  return request;
}

async function assertNodeWithinRoot(
  drive: drive_v3.Drive,
  nodeId: string,
  rootId: string,
  cache: MetadataCache,
  visited: Set<string>,
  depth: number
): Promise<void> {
  if (nodeId === rootId) return;
  if (depth >= MAX_ANCESTOR_DEPTH || visited.has(nodeId)) {
    throw new FolderOutsideRootError();
  }

  const branch = new Set(visited);
  branch.add(nodeId);
  const meta = await getFolderMeta(drive, nodeId, cache);
  if (meta.trashed) throw new FolderOutsideRootError();

  if (meta.parents.length === 0) {
    if (rootId === "root") return;
    throw new FolderOutsideRootError();
  }

  for (const parentId of meta.parents) {
    await assertNodeWithinRoot(
      drive,
      parentId,
      rootId,
      cache,
      branch,
      depth + 1
    );
  }
}

export async function assertFolderWithinRoot(
  drive: drive_v3.Drive,
  folderId: string,
  rootId: string
): Promise<void> {
  if (folderId === rootId) return;

  await assertNodeWithinRoot(
    drive,
    folderId,
    rootId,
    new Map(),
    new Set(),
    0
  );
}

export async function assertFileWithinRoot(
  drive: drive_v3.Drive,
  fileId: string,
  rootId: string
): Promise<void> {
  const cache = new Map<string, Promise<FolderMeta>>();
  const meta = await getFolderMeta(drive, fileId, cache);
  if (meta.trashed) throw new FolderOutsideRootError();

  if (meta.parents.length === 0) {
    if (rootId === "root") return;
    throw new FolderOutsideRootError();
  }

  const visited = new Set([fileId]);
  for (const parentId of meta.parents) {
    await assertNodeWithinRoot(
      drive,
      parentId,
      rootId,
      cache,
      visited,
      1
    );
  }
}
