import crypto from "crypto";

export function generateApiKeySecret(): string {
  // Prefix helps with future key type separation (e.g. live vs test).
  const random = crypto.randomBytes(32).toString("base64url");
  return `ji_live_${random}`;
}

export function sha256Hex(value: string): string {
  return crypto.createHash("sha256").update(value).digest("hex");
}

export function keyPrefix(secret: string): string {
  return secret.slice(0, 12);
}
