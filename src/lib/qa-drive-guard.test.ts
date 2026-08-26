import { canRunDriveCrud, isNonProductionDriveTarget } from "../../scripts/qa-drive-guard";
import { describe, expect, it } from "vitest";

const allow = { QA_DRIVE_CRUD_ALLOW: "I_UNDERSTAND_NON_PRODUCTION" };
const targetCases: Array<[string, boolean]> = [
  ["https://amazon-fba-manager-virid.vercel.app", false],
  ["https://amazon-fba-manager-virid.vercel.app/drive", false],
  ["http://localhost:3000", true],
  ["http://127.0.0.1:3000", true],
  ["http://[::1]:3000", true],
  ["https://fba-staging.example.com", false],
  ["https://fba.example.com", false],
  ["not a url", false],
];

describe("QA15 Drive target guard", () => {
  it.each(targetCases)("classifies %s as %s", (base, expected) => {
    expect(isNonProductionDriveTarget(base)).toBe(expected);
  });

  it("requires the explicit opt-in even for a non-production target", () => {
    expect(canRunDriveCrud("http://localhost:3000", {})).toBe(false);
    expect(canRunDriveCrud("https://amazon-fba-manager-virid.vercel.app", allow)).toBe(false);
    expect(canRunDriveCrud("https://fba-staging.example.com", {
      ...allow,
      QA_DRIVE_ALLOWED_HOSTS: "fba-staging.example.com",
    })).toBe(true);
    expect(canRunDriveCrud("https://fba-preview.example.com", {
      ...allow,
      QA_DRIVE_ALLOWED_HOSTS: "other.example.com",
    })).toBe(false);
  });
});
