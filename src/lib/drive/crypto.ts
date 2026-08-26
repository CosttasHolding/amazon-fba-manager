import "server-only";
import { createCipheriv, createDecipheriv, randomBytes } from "node:crypto";

const ALGORITHM = "aes-256-gcm";
const IV_LENGTH = 12;
const AUTH_TAG_LENGTH = 16;
const KEY_LENGTH = 32;

function encodeBase64Url(value: Buffer): string {
  return value.toString("base64").replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/g, "");
}

function decodeBase64(value: string): Buffer {
  if (!value || !/^(?:[A-Za-z0-9+/]{4})*(?:[A-Za-z0-9+/]{2}==|[A-Za-z0-9+/]{3}=)?$/.test(value)) {
    throw new Error("Invalid base64 value");
  }

  const decoded = Buffer.from(value, "base64");
  if (decoded.toString("base64") !== value) {
    throw new Error("Invalid base64 value");
  }
  return decoded;
}

function decodeBase64Url(value: string): Buffer {
  if (!value || !/^[A-Za-z0-9_-]+$/.test(value) || value.length % 4 === 1) {
    throw new Error("Invalid base64url value");
  }

  const decoded = Buffer.from(value, "base64url");
  if (encodeBase64Url(decoded) !== value) {
    throw new Error("Invalid base64url value");
  }
  return decoded;
}

function getEncryptionKey(): Buffer {
  const encodedKey = process.env.DRIVE_TOKEN_ENCRYPTION_KEY;
  if (!encodedKey) {
    throw new Error("DRIVE_TOKEN_ENCRYPTION_KEY is not configured");
  }

  let key: Buffer;
  try {
    key = decodeBase64(encodedKey);
  } catch {
    throw new Error("DRIVE_TOKEN_ENCRYPTION_KEY must be valid base64");
  }

  if (key.length !== KEY_LENGTH) {
    throw new Error("DRIVE_TOKEN_ENCRYPTION_KEY must decode to 32 bytes");
  }
  return key;
}

export function encryptDriveToken(token: string): string {
  if (typeof token !== "string" || token.length === 0) {
    throw new Error("Drive token must be a non-empty string");
  }

  const key = getEncryptionKey();
  const iv = randomBytes(IV_LENGTH);
  const cipher = createCipheriv(ALGORITHM, key, iv);
  const ciphertext = Buffer.concat([cipher.update(token, "utf8"), cipher.final()]);
  const authTag = cipher.getAuthTag();

  return `v1.${encodeBase64Url(iv)}.${encodeBase64Url(authTag)}.${encodeBase64Url(ciphertext)}`;
}

export function decryptDriveToken(payload: string): string {
  const key = getEncryptionKey();
  if (typeof payload !== "string") {
    throw new Error("Invalid encrypted Drive token payload");
  }

  const parts = payload.split(".");
  if (parts.length !== 4 || parts[0] !== "v1") {
    throw new Error("Invalid encrypted Drive token payload");
  }

  let iv: Buffer;
  let authTag: Buffer;
  let ciphertext: Buffer;
  try {
    iv = decodeBase64Url(parts[1]);
    authTag = decodeBase64Url(parts[2]);
    ciphertext = decodeBase64Url(parts[3]);
  } catch {
    throw new Error("Invalid encrypted Drive token payload");
  }

  if (iv.length !== IV_LENGTH || authTag.length !== AUTH_TAG_LENGTH || ciphertext.length === 0) {
    throw new Error("Invalid encrypted Drive token payload");
  }

  try {
    const decipher = createDecipheriv(ALGORITHM, key, iv);
    decipher.setAuthTag(authTag);
    const token = Buffer.concat([decipher.update(ciphertext), decipher.final()]).toString("utf8");
    if (token.length === 0) {
      throw new Error("Invalid encrypted Drive token payload");
    }
    return token;
  } catch {
    throw new Error("Invalid encrypted Drive token payload");
  }
}
