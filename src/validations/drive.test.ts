import { describe, expect, it } from "vitest";
import { driveContentSchema, driveNameSchema } from "./drive";

describe("Drive validations", () => {
  it("accepts a trimmed name within the Google Drive limit", () => {
    expect(driveNameSchema.parse("  report.txt  ")).toBe("report.txt");
  });

  it("rejects blank, oversized, and control-character names", () => {
    expect(driveNameSchema.safeParse("   ").success).toBe(false);
    expect(driveNameSchema.safeParse("a".repeat(256)).success).toBe(false);
    expect(driveNameSchema.safeParse("report\n.txt").success).toBe(false);
  });

  it("rejects text content larger than one megabyte", () => {
    expect(driveContentSchema.safeParse("a".repeat(1_000_001)).success).toBe(false);
  });
});
