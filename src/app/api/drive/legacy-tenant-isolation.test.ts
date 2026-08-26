import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

const routePaths = [
  "upload/route.ts",
  "folders/route.ts",
  "download/[id]/route.ts",
  "rename/[id]/route.ts",
  "update/[id]/route.ts",
  "delete/[id]/route.ts",
  "backup/route.ts",
] as const;

function readSource(path: string): string {
  return readFileSync(`src/app/api/drive/${path}`, "utf8");
}

describe("legacy Drive tenant isolation", () => {
  it.each(routePaths)("uses an authenticated connection for %s", (path) => {
    const source = readSource(path);

    expect(source).toContain("createClient");
    expect(source).toContain("auth.getUser");
    expect(source).toContain("getOrgId");
    expect(source).toContain("getDriveClientForConnection");
    expect(source).toContain("connection.rootFolderId");
    expect(source).not.toContain("getDriveClient()");
    expect(source).not.toContain("getDriveRootFolderId");
    expect(source).not.toContain("getOrgRootFolderId");
    expect(source).not.toContain("getRootFolderId");
    expect(source).not.toContain("drive_refresh_token");
    expect(source).not.toContain("GOOGLE_DRIVE_FOLDER_ID");
  });

  it("removes legacy credentials and global root helpers from the client and barrel", () => {
    const client = readFileSync("src/lib/drive/client.ts", "utf8");
    const barrel = readFileSync("src/lib/drive/index.ts", "utf8");

    expect(client).not.toContain("user_settings");
    expect(client).not.toContain("drive_refresh_token");
    expect(client).not.toContain("GOOGLE_DRIVE_FOLDER_ID");
    expect(client).not.toContain("function getDriveClient()");
    expect(barrel).not.toContain("getDriveRootFolderId");
    expect(barrel).not.toContain("getOrgRootFolderId");
    expect(barrel).not.toContain("getRootFolderId");
  });
});
