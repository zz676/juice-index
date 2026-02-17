import crypto from "crypto";

/**
 * X OAuth 2.0 PKCE utilities for per-user posting tokens.
 */

export function getXOAuthClientCredentials() {
  const clientId = process.env.X_OAUTH_CLIENT_ID?.trim();
  const clientSecret = process.env.X_OAUTH_CLIENT_SECRET?.trim();
  if (!clientId || !clientSecret) {
    throw new Error("X_OAUTH_CLIENT_ID and X_OAUTH_CLIENT_SECRET must be configured");
  }
  return { clientId, clientSecret };
}

export function generatePKCE() {
  const codeVerifier = crypto.randomBytes(32).toString("base64url");
  const codeChallenge = crypto
    .createHash("sha256")
    .update(codeVerifier)
    .digest("base64url");
  return { codeVerifier, codeChallenge };
}

const X_SCOPES = "tweet.write tweet.read users.read offline.access";

export function buildAuthorizationUrl({
  clientId,
  redirectUri,
  state,
  codeChallenge,
}: {
  clientId: string;
  redirectUri: string;
  state: string;
  codeChallenge: string;
}) {
  const params = new URLSearchParams({
    response_type: "code",
    client_id: clientId,
    redirect_uri: redirectUri,
    scope: X_SCOPES,
    state,
    code_challenge: codeChallenge,
    code_challenge_method: "S256",
  });
  return `https://x.com/i/oauth2/authorize?${params.toString()}`;
}

export async function exchangeCodeForTokens({
  code,
  codeVerifier,
  redirectUri,
  clientId,
  clientSecret,
}: {
  code: string;
  codeVerifier: string;
  redirectUri: string;
  clientId: string;
  clientSecret: string;
}) {
  const res = await fetch("https://api.x.com/2/oauth2/token", {
    method: "POST",
    headers: {
      "Content-Type": "application/x-www-form-urlencoded",
      Authorization: `Basic ${Buffer.from(`${clientId}:${clientSecret}`).toString("base64")}`,
    },
    body: new URLSearchParams({
      grant_type: "authorization_code",
      code,
      redirect_uri: redirectUri,
      code_verifier: codeVerifier,
    }),
  });

  if (!res.ok) {
    const body = await res.text();
    throw new Error(`X token exchange failed (${res.status}): ${body}`);
  }

  const data = await res.json();
  return {
    accessToken: data.access_token as string,
    refreshToken: data.refresh_token as string,
    expiresIn: data.expires_in as number,
  };
}

export async function fetchXUserProfile(accessToken: string) {
  const res = await fetch("https://api.x.com/2/users/me?user.fields=profile_image_url", {
    headers: {
      Authorization: `Bearer ${accessToken}`,
    },
  });

  if (!res.ok) {
    const body = await res.text();
    throw new Error(`Failed to fetch X user profile (${res.status}): ${body}`);
  }

  const { data } = await res.json();
  return {
    xUserId: data.id as string,
    username: data.username as string,
    displayName: (data.name as string) || null,
    avatarUrl: (data.profile_image_url as string) || null,
  };
}
