import { afterEach, describe, expect, it, vi } from "vitest";
import { decryptDriveToken, encryptDriveToken } from "@/lib/drive/crypto";

vi.mock("server-only", () => ({}));

const TEST_KEY = Buffer.alloc(32, 7).toString("base64");
const TOKEN = "refresh-token-for-tests-only";

describe("Drive token crypto", () => {
  afterEach(() => {
    delete process.env.DRIVE_TOKEN_ENCRYPTION_KEY;
    vi.restoreAllMocks();
  });

  it("round-trips a token with the versioned payload structure", () => {
    process.env.DRIVE_TOKEN_ENCRYPTION_KEY = TEST_KEY;

    const payload = encryptDriveToken(TOKEN);
    const parts = payload.split(".");

    expect(parts).toHaveLength(4);
    expect(parts[0]).toBe("v1");
    expect(parts.slice(1).every((part) => /^[A-Za-z0-9_-]+$/.test(part))).toBe(true);
    expect(decryptDriveToken(payload)).toBe(TOKEN);
  });

  it("rejects an empty token", () => {
    process.env.DRIVE_TOKEN_ENCRYPTION_KEY = TEST_KEY;

    expect(() => encryptDriveToken("")).toThrow();
  });

  it("rejects a missing encryption key", () => {
    delete process.env.DRIVE_TOKEN_ENCRYPTION_KEY;

    expect(() => encryptDriveToken(TOKEN)).toThrow();
  });

  it("rejects an encryption key with the wrong decoded length", () => {
    process.env.DRIVE_TOKEN_ENCRYPTION_KEY = Buffer.alloc(31, 7).toString("base64");

    expect(() => encryptDriveToken(TOKEN)).toThrow();
  });

  it("rejects an invalid Base64 encryption key without logging it", () => {
    const invalidKey = "not-base64-secret-marker";
    const consoleError = vi.spyOn(console, "error").mockImplementation(() => undefined);
    const consoleWarn = vi.spyOn(console, "warn").mockImplementation(() => undefined);
    process.env.DRIVE_TOKEN_ENCRYPTION_KEY = invalidKey;

    expect(() => encryptDriveToken(TOKEN)).toThrow("DRIVE_TOKEN_ENCRYPTION_KEY must be valid base64");
    expect(consoleError).not.toHaveBeenCalled();
    expect(consoleWarn).not.toHaveBeenCalled();
    expect(consoleError.mock.calls.flat().join(" ")).not.toContain(invalidKey);
    expect(consoleWarn.mock.calls.flat().join(" ")).not.toContain(invalidKey);

  });

  it("rejects decrypting with an invalid Base64 encryption key without logging it", () => {
    const invalidKey = "decrypt-invalid-base64-secret-marker";
    const consoleError = vi.spyOn(console, "error").mockImplementation(() => undefined);
    const consoleWarn = vi.spyOn(console, "warn").mockImplementation(() => undefined);
    process.env.DRIVE_TOKEN_ENCRYPTION_KEY = invalidKey;

    expect(() => decryptDriveToken("v1.AAAAAAAAAAAAAAAAAAAA.AAAAAAAAAAAAAAAAAAAAAA.AA")).toThrow(
      "DRIVE_TOKEN_ENCRYPTION_KEY must be valid base64"
    );
    expect(consoleError).not.toHaveBeenCalled();
    expect(consoleWarn).not.toHaveBeenCalled();
    expect(consoleError.mock.calls.flat().join(" ")).not.toContain(invalidKey);
    expect(consoleWarn.mock.calls.flat().join(" ")).not.toContain(invalidKey);

  });

  it("rejects malformed payloads", () => {
    process.env.DRIVE_TOKEN_ENCRYPTION_KEY = TEST_KEY;

    expect(() => decryptDriveToken("v1.only-two-parts")).toThrow();
    expect(() => decryptDriveToken("v1.%%%%.%%%%.%%%%")).toThrow();
    expect(() => decryptDriveToken("v1.AQ.AQ.AQ")).toThrow();
  });

  it("rejects an unsupported payload version", () => {
    process.env.DRIVE_TOKEN_ENCRYPTION_KEY = TEST_KEY;

    expect(() => decryptDriveToken("v2.AAAAAAAAAAAAAAAAAAAAAA.AAAAAAAAAAAAAAAAAAAAAA.AA")).toThrow();
  });

  it("rejects tampered ciphertext", () => {
    process.env.DRIVE_TOKEN_ENCRYPTION_KEY = TEST_KEY;

    const payload = encryptDriveToken(TOKEN);
    const parts = payload.split(".");
    const tamperedCiphertext = `${parts[3].slice(0, -1)}${parts[3].endsWith("A") ? "B" : "A"}`;

    expect(() => decryptDriveToken(`${parts[0]}.${parts[1]}.${parts[2]}.${tamperedCiphertext}`)).toThrow();
  });

  it("does not include plaintext in the encrypted payload", () => {
    process.env.DRIVE_TOKEN_ENCRYPTION_KEY = TEST_KEY;

    expect(encryptDriveToken(TOKEN)).not.toContain(TOKEN);
  });
});
