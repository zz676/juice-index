import prisma from "@/lib/prisma";
import type { XAccount } from "@prisma/client";
import { decryptToken, encryptToken } from "@/lib/crypto";

export class XTokenExpiredError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "XTokenExpiredError";
  }
}

/**
 * Refreshes the X OAuth 2.0 access token if it has expired.
 * Updates the XAccount record in the database with new tokens.
 * Returns the (possibly refreshed) plaintext access token.
 */
export async function refreshTokenIfNeeded(
  xAccount: XAccount
): Promise<string> {
  // Add a 60-second buffer so we refresh before actual expiry
  if (xAccount.tokenExpiresAt > new Date(Date.now() + 60_000)) {
    return decryptToken(xAccount.accessToken);
  }

  const clientId = process.env.X_OAUTH_CLIENT_ID?.trim();
  const clientSecret = process.env.X_OAUTH_CLIENT_SECRET?.trim();
  if (!clientId) {
    throw new Error("X_OAUTH_CLIENT_ID must be configured");
  }

  const refreshToken = decryptToken(xAccount.refreshToken);

  // Try public client flow first (PKCE apps): client_id in body, no Basic auth.
  // If that fails with 401, retry with confidential client flow (Basic auth).
  let res = await fetch("https://api.x.com/2/oauth2/token", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      grant_type: "refresh_token",
      client_id: clientId,
      refresh_token: refreshToken,
    }),
  });

  if (res.status === 401 && clientSecret) {
    console.warn("[refresh-token] Public client refresh failed (401), retrying with Basic auth");
    res = await fetch("https://api.x.com/2/oauth2/token", {
      method: "POST",
      headers: {
        "Content-Type": "application/x-www-form-urlencoded",
        Authorization: `Basic ${Buffer.from(`${clientId}:${clientSecret}`).toString("base64")}`,
      },
      body: new URLSearchParams({
        grant_type: "refresh_token",
        client_id: clientId,
        refresh_token: refreshToken,
      }),
    });
  }

  if (!res.ok) {
    const body = await res.text();
    // Detect invalid/expired refresh tokens so callers can show a clear reconnect message
    if (body.includes("invalid") || body.includes("revoked") || body.includes("expired")) {
      throw new XTokenExpiredError(
        "Your X connection has expired. Please reconnect your X account in Settings."
      );
    }
    throw new Error(`Token refresh failed (${res.status}): ${body}`);
  }

  const data = await res.json();

  const newAccessToken = data.access_token as string;
  const newRefreshToken = (data.refresh_token as string) ?? refreshToken;

  await prisma.xAccount.update({
    where: { id: xAccount.id },
    data: {
      accessToken: encryptToken(newAccessToken),
      refreshToken: encryptToken(newRefreshToken),
      tokenExpiresAt: new Date(Date.now() + data.expires_in * 1000),
    },
  });

  return newAccessToken;
}
