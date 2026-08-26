import { afterEach, describe, expect, it, vi } from "vitest";

vi.mock("server-only", () => ({}));
import { getDriveRootFolderIdForOrg } from "./org-root-config";

const ORG_ID = "11111111-1111-4111-8111-111111111111";

describe("getDriveRootFolderIdForOrg", () => {
  afterEach(() => {
    delete process.env.GOOGLE_DRIVE_ROOT_FOLDER_IDS;
  });

  it("returns the root mapped to the requested organization", () => {
    process.env.GOOGLE_DRIVE_ROOT_FOLDER_IDS = JSON.stringify({ [ORG_ID]: "org-root" });

    expect(getDriveRootFolderIdForOrg(ORG_ID)).toBe("org-root");
  });

  it("rejects malformed or non-object mappings", () => {
    for (const value of ["not-json", "null", "[]", '"root"']) {
      process.env.GOOGLE_DRIVE_ROOT_FOLDER_IDS = value;

      expect(getDriveRootFolderIdForOrg(ORG_ID)).toBeNull();
    }
  });

  it("rejects invalid UUID keys and empty root IDs", () => {
    process.env.GOOGLE_DRIVE_ROOT_FOLDER_IDS = JSON.stringify({
      "not-an-org": "root",
      [ORG_ID]: "",
    });

    expect(getDriveRootFolderIdForOrg(ORG_ID)).toBeNull();
  });

  it("rejects the legacy root sentinel for a valid organization", () => {
    process.env.GOOGLE_DRIVE_ROOT_FOLDER_IDS = JSON.stringify({ [ORG_ID]: "root" });

    expect(getDriveRootFolderIdForOrg(ORG_ID)).toBeNull();
  });

  it("rejects a legacy root sentinel anywhere in the organization mapping", () => {
    process.env.GOOGLE_DRIVE_ROOT_FOLDER_IDS = JSON.stringify({
      [ORG_ID]: "org-root",
      "22222222-2222-4222-8222-222222222222": "root",
    });

    expect(getDriveRootFolderIdForOrg(ORG_ID)).toBeNull();
  });

  it("rejects root IDs with surrounding whitespace", () => {
    process.env.GOOGLE_DRIVE_ROOT_FOLDER_IDS = JSON.stringify({ [ORG_ID]: " org-root " });

    expect(getDriveRootFolderIdForOrg(ORG_ID)).toBeNull();
  });

  it("does not use the legacy global root setting or missing entries", () => {
    process.env.GOOGLE_DRIVE_ROOT_FOLDER_IDS = JSON.stringify({});

    expect(getDriveRootFolderIdForOrg(ORG_ID)).toBeNull();
  });
});
