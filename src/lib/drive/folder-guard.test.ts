import { describe, expect, it } from "vitest";
import type { drive_v3 } from "googleapis";
import {
  assertFileWithinRoot,
  assertFolderWithinRoot,
  FolderOutsideRootError,
} from "./folder-guard";

const ROOT_ID = "root-carpeta-app";

type FakeFile = { parents?: string[]; trashed?: boolean };

function makeDrive(files: Record<string, FakeFile>): drive_v3.Drive {
  return {
    files: {
      get: async ({ fileId }: { fileId: string }) => {
        const file = files[fileId];
        if (!file) throw new Error("File not found: 404");
        return { data: file };
      },
    },
  } as unknown as drive_v3.Drive;
}

describe("assertFolderWithinRoot (C2)", () => {
  it("acepta carpeta hija directa del root", async () => {
    const drive = makeDrive({
      [ROOT_ID]: {},
      "carpeta-hija": { parents: [ROOT_ID] },
    });
    await expect(
      assertFolderWithinRoot(drive, "carpeta-hija", ROOT_ID)
    ).resolves.toBeUndefined();
  });

  it("acepta descendiente profundo dentro del root", async () => {
    const drive = makeDrive({
      [ROOT_ID]: {},
      nivel1: { parents: [ROOT_ID] },
      nivel2: { parents: ["nivel1"] },
      nivel3: { parents: ["nivel2"] },
    });
    await expect(
      assertFolderWithinRoot(drive, "nivel3", ROOT_ID)
    ).resolves.toBeUndefined();
  });

  it("rechaza carpeta fuera del root", async () => {
    const drive = makeDrive({
      [ROOT_ID]: {},
      ajena: { parents: ["drive-de-otro"] },
      "drive-de-otro": { parents: [] },
    });
    await expect(
      assertFolderWithinRoot(drive, "ajena", ROOT_ID)
    ).rejects.toThrow(FolderOutsideRootError);
  });

  it("rechaza carpeta en papelera aunque esté bajo el root", async () => {
    const drive = makeDrive({
      [ROOT_ID]: {},
      trashed: { parents: [ROOT_ID], trashed: true },
    });
    await expect(
      assertFolderWithinRoot(drive, "trashed", ROOT_ID)
    ).rejects.toThrow(FolderOutsideRootError);
  });

  it("con root alias 'root' acepta cadenas que terminan en My Drive", async () => {
    const drive = makeDrive({
      miDriveRoot: { parents: [] },
      sub: { parents: ["miDriveRoot"] },
    });
    await expect(
      assertFolderWithinRoot(drive, "sub", "root")
    ).resolves.toBeUndefined();
  });

  it("con root concreto rechaza carpetas colgando directamente de My Drive", async () => {
    const drive = makeDrive({
      miDriveRoot: { parents: [] },
      suelto: { parents: [] },
    });
    await expect(
      assertFolderWithinRoot(drive, "suelto", ROOT_ID)
    ).rejects.toThrow(FolderOutsideRootError);
  });
});

describe("assertFileWithinRoot (C2)", () => {
  it("valida el archivo vía la cadena de ancestros", async () => {
    const drive = makeDrive({
      [ROOT_ID]: {},
      carpeta: { parents: [ROOT_ID] },
      archivo: { parents: ["carpeta"] },
    });
    await expect(
      assertFileWithinRoot(drive, "archivo", ROOT_ID)
    ).resolves.toBeUndefined();
  });

  it("rechaza archivo huérfano cuando el root es concreto", async () => {
    const drive = makeDrive({
      huerfano: { parents: [] },
    });
    await expect(
      assertFileWithinRoot(drive, "huerfano", ROOT_ID)
    ).rejects.toThrow(FolderOutsideRootError);
  });

  it("rechaza archivo en papelera", async () => {
    const drive = makeDrive({
      papelera: { parents: [], trashed: true },
    });
    await expect(
      assertFileWithinRoot(drive, "papelera", ROOT_ID)
    ).rejects.toThrow(FolderOutsideRootError);
  });
});
