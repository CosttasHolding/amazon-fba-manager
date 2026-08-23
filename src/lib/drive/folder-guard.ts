import type { drive_v3 } from "googleapis";

export class FolderOutsideRootError extends Error {
  constructor() {
    super("Carpeta fuera del espacio autorizado");
    this.name = "FolderOutsideRootError";
  }
}

const MAX_ANCESTOR_DEPTH = 25;

async function getFolderMeta(
  drive: drive_v3.Drive,
  fileId: string
): Promise<{ parents: string[]; trashed: boolean }> {
  const res = await drive.files.get({
    fileId,
    fields: "id,parents,trashed",
  });
  return {
    parents: res.data.parents || [],
    trashed: Boolean(res.data.trashed),
  };
}

export async function assertFolderWithinRoot(
  drive: drive_v3.Drive,
  folderId: string,
  rootId: string
): Promise<void> {
  let current = folderId;

  for (let depth = 0; depth < MAX_ANCESTOR_DEPTH; depth++) {
    if (current === rootId) return;

    const meta = await getFolderMeta(drive, current);
    if (meta.trashed) throw new FolderOutsideRootError();

    if (meta.parents.includes(rootId)) return;

    if (meta.parents.length === 0) {
      if (rootId === "root") return;
      throw new FolderOutsideRootError();
    }

    current = meta.parents[0];
  }

  throw new FolderOutsideRootError();
}

export async function assertFileWithinRoot(
  drive: drive_v3.Drive,
  fileId: string,
  rootId: string
): Promise<void> {
  const meta = await getFolderMeta(drive, fileId);
  if (meta.trashed) throw new FolderOutsideRootError();

  if (meta.parents.length === 0) {
    if (rootId === "root") return;
    throw new FolderOutsideRootError();
  }

  await assertFolderWithinRoot(drive, meta.parents[0], rootId);
}
