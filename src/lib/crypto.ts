import { createCipheriv, createDecipheriv, randomBytes } from "node:crypto";

const ALGORITHM = "aes-256-gcm";
const IV_LENGTH = 12;
const TAG_LENGTH = 16;

/**
 * Returns the 32-byte encryption key derived from the TOKEN_ENCRYPTION_KEY env var.
 * Falls back gracefully in development if the env var is not set.
 */
function getEncryptionKey(): Buffer {
  const raw = process.env.TOKEN_ENCRYPTION_KEY;
  if (!raw) {
    throw new Error(
      "TOKEN_ENCRYPTION_KEY environment variable is required for token encryption",
    );
  }
  // Accept hex-encoded (64 chars) or base64-encoded key
  if (raw.length === 64 && /^[0-9a-fA-F]+$/.test(raw)) {
    return Buffer.from(raw, "hex");
  }
  const buf = Buffer.from(raw, "base64");
  if (buf.length !== 32) {
    throw new Error("TOKEN_ENCRYPTION_KEY must decode to exactly 32 bytes");
  }
  return buf;
}

/**
 * Encrypts a plaintext string using AES-256-GCM.
 * Returns a string in the format: `iv:ciphertext:tag` (all hex-encoded).
 */
export function encrypt(plaintext: string): string {
  const key = getEncryptionKey();
  const iv = randomBytes(IV_LENGTH);
  const cipher = createCipheriv(ALGORITHM, key, iv, { authTagLength: TAG_LENGTH });

  const encrypted = Buffer.concat([
    cipher.update(plaintext, "utf8"),
    cipher.final(),
  ]);
  const tag = cipher.getAuthTag();

  return `${iv.toString("hex")}:${encrypted.toString("hex")}:${tag.toString("hex")}`;
}

/**
 * Decrypts a string produced by `encrypt()`.
 * Returns the original plaintext.
 */
export function decrypt(ciphertext: string): string {
  const key = getEncryptionKey();
  const parts = ciphertext.split(":");
  if (parts.length !== 3) {
    throw new Error("Invalid encrypted token format");
  }

  const iv = Buffer.from(parts[0], "hex");
  const encrypted = Buffer.from(parts[1], "hex");
  const tag = Buffer.from(parts[2], "hex");

  const decipher = createDecipheriv(ALGORITHM, key, iv, { authTagLength: TAG_LENGTH });
  decipher.setAuthTag(tag);

  return Buffer.concat([
    decipher.update(encrypted),
    decipher.final(),
  ]).toString("utf8");
}

/**
 * Checks if a value looks like an encrypted token (has the iv:ct:tag format).
 */
export function isEncrypted(value: string): boolean {
  const parts = value.split(":");
  return parts.length === 3 && /^[0-9a-fA-F]+$/.test(parts[0]) && parts[0].length === IV_LENGTH * 2;
}

/**
 * Decrypts a token, handling the case where it might still be plaintext
 * (for migration purposes). If TOKEN_ENCRYPTION_KEY is not set, returns as-is.
 */
export function decryptToken(value: string): string {
  if (!process.env.TOKEN_ENCRYPTION_KEY) {
    return value;
  }
  if (isEncrypted(value)) {
    return decrypt(value);
  }
  // Plaintext token (not yet migrated)
  return value;
}

/**
 * Encrypts a token if TOKEN_ENCRYPTION_KEY is set, otherwise returns as-is.
 */
export function encryptToken(value: string): string {
  if (!process.env.TOKEN_ENCRYPTION_KEY) {
    return value;
  }
  return encrypt(value);
}
