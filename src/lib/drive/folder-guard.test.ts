import { describe, expect, it, vi } from "vitest";
import type { drive_v3 } from "googleapis";
import {
  assertFileWithinRoot,
  assertFolderWithinRoot,
  FolderOutsideRootError,
} from "./folder-guard";

const ROOT_ID = "root-carpeta-app";

type FakeFile = { parents?: string[]; trashed?: boolean };
type FakeDrive = drive_v3.Drive & { getCalls: ReturnType<typeof vi.fn> };

function makeDrive(files: Record<string, FakeFile>): FakeDrive {
  const getCalls = vi.fn(async ({ fileId }: { fileId: string }) => {
    const file = files[fileId];
    if (!file) throw new Error("File not found: 404");
    return { data: file };
  });

  return {
    files: {
      get: getCalls,
    },
    getCalls,
  } as unknown as FakeDrive;
}

describe("assertFolderWithinRoot (C2)", () => {
  it("acepta igualdad con el root sin consultar metadata", async () => {
    const drive = makeDrive({});

    await expect(
      assertFolderWithinRoot(drive, ROOT_ID, ROOT_ID)
    ).resolves.toBeUndefined();
    expect(drive.getCalls).not.toHaveBeenCalled();
  });

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

  it("rechaza cualquier rama outside aunque no sea el primer parent", async () => {
    const drive = makeDrive({
      carpeta: { parents: ["root-ajeno", ROOT_ID] },
      "root-ajeno": { parents: [] },
    });

    await expect(
      assertFolderWithinRoot(drive, "carpeta", ROOT_ID)
    ).rejects.toThrow(FolderOutsideRootError);
  });

  it("acepta una carpeta cuando todas sus ramas llegan al root", async () => {
    const drive = makeDrive({
      carpeta: { parents: ["rama-a", "rama-b"] },
      "rama-a": { parents: ["ancestro-compartido"] },
      "rama-b": { parents: ["ancestro-compartido"] },
      "ancestro-compartido": { parents: [ROOT_ID] },
    });

    await expect(
      assertFolderWithinRoot(drive, "carpeta", ROOT_ID)
    ).resolves.toBeUndefined();
    expect(drive.getCalls).toHaveBeenCalledTimes(4);
  });

  it("rechaza ciclos en el grafo de ancestros", async () => {
    const drive = makeDrive({
      carpeta: { parents: ["ancestro"] },
      ancestro: { parents: ["carpeta"] },
    });

    await expect(
      assertFolderWithinRoot(drive, "carpeta", ROOT_ID)
    ).rejects.toThrow(FolderOutsideRootError);
  });

  it("rechaza cuando la cadena de ancestros supera el límite", async () => {
    const files: Record<string, FakeFile> = {};
    for (let index = 0; index <= 25; index++) {
      files[`nivel-${index}`] = {
        parents: [index === 25 ? ROOT_ID : `nivel-${index + 1}`],
      };
    }
    const drive = makeDrive(files);

    await expect(
      assertFolderWithinRoot(drive, "nivel-0", ROOT_ID)
    ).rejects.toThrow(FolderOutsideRootError);
  });

  it("rechaza un ancestro en papelera", async () => {
    const drive = makeDrive({
      carpeta: { parents: ["ancestro-papelera"] },
      "ancestro-papelera": { parents: [ROOT_ID], trashed: true },
    });

    await expect(
      assertFolderWithinRoot(drive, "carpeta", ROOT_ID)
    ).rejects.toThrow(FolderOutsideRootError);
  });

  it("rechaza metadata faltante como carpeta fuera del root", async () => {
    const drive = makeDrive({ carpeta: { parents: ["desconocida"] } });

    await expect(
      assertFolderWithinRoot(drive, "carpeta", ROOT_ID)
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

  it("rechaza un archivo si cualquiera de sus parents queda fuera del root", async () => {
    const drive = makeDrive({
      archivo: { parents: [ROOT_ID, "carpeta-ajena"] },
      "carpeta-ajena": { parents: [] },
    });

    await expect(
      assertFileWithinRoot(drive, "archivo", ROOT_ID)
    ).rejects.toThrow(FolderOutsideRootError);
  });

  it("acepta un archivo con todos sus parents dentro del root", async () => {
    const drive = makeDrive({
      archivo: { parents: ["carpeta-a", "carpeta-b"] },
      "carpeta-a": { parents: [ROOT_ID] },
      "carpeta-b": { parents: [ROOT_ID] },
    });

    await expect(
      assertFileWithinRoot(drive, "archivo", ROOT_ID)
    ).resolves.toBeUndefined();
  });

  it("mantiene compatibilidad con root para archivos sin parent", async () => {
    const drive = makeDrive({ archivo: { parents: [] } });

    await expect(
      assertFileWithinRoot(drive, "archivo", "root")
    ).resolves.toBeUndefined();
  });
});
