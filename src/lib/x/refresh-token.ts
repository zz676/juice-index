import prisma from "@/lib/prisma";
import type { XAccount } from "@prisma/client";

/**
 * Refreshes the X OAuth 2.0 access token if it has expired.
 * Updates the XAccount record in the database with new tokens.
 * Returns the (possibly refreshed) access token.
 */
export async function refreshTokenIfNeeded(
  xAccount: XAccount
): Promise<string> {
  // Add a 60-second buffer so we refresh before actual expiry
  if (xAccount.tokenExpiresAt > new Date(Date.now() + 60_000)) {
    return xAccount.accessToken;
  }

  const clientId = process.env.X_OAUTH_CLIENT_ID;
  const clientSecret = process.env.X_OAUTH_CLIENT_SECRET;
  if (!clientId || !clientSecret) {
    throw new Error("X_OAUTH_CLIENT_ID and X_OAUTH_CLIENT_SECRET must be configured");
  }

  const res = await fetch("https://api.x.com/2/oauth2/token", {
    method: "POST",
    headers: {
      "Content-Type": "application/x-www-form-urlencoded",
      Authorization: `Basic ${Buffer.from(`${clientId}:${clientSecret}`).toString("base64")}`,
    },
    body: new URLSearchParams({
      grant_type: "refresh_token",
      refresh_token: xAccount.refreshToken,
    }),
  });

  if (!res.ok) {
    const body = await res.text();
    throw new Error(`Token refresh failed (${res.status}): ${body}`);
  }

  const data = await res.json();

  const updated = await prisma.xAccount.update({
    where: { id: xAccount.id },
    data: {
      accessToken: data.access_token,
      refreshToken: data.refresh_token ?? xAccount.refreshToken,
      tokenExpiresAt: new Date(Date.now() + data.expires_in * 1000),
    },
  });

  return updated.accessToken;
}
