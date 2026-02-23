import { NextRequest, NextResponse } from "next/server";
import { requireUser } from "@/lib/auth/require-user";
import prisma from "@/lib/prisma";
import {
  getXOAuthClientCredentials,
  exchangeCodeForTokens,
  fetchXUserProfile,
} from "@/lib/x/oauth";
import { encryptToken } from "@/lib/crypto";
import { getRedirectBase } from "@/lib/auth/redirect-base";

export const runtime = "nodejs";

export async function GET(request: NextRequest) {
  const settingsUrl = new URL("/dashboard/settings", request.url);

  const { user, error } = await requireUser();
  if (error) {
    settingsUrl.searchParams.set("x_error", "not_authenticated");
    return NextResponse.redirect(settingsUrl);
  }

  const { searchParams } = new URL(request.url);
  const code = searchParams.get("code");
  const stateParam = searchParams.get("state");
  const errorParam = searchParams.get("error");

  if (errorParam) {
    settingsUrl.searchParams.set("x_error", errorParam);
    const response = NextResponse.redirect(settingsUrl);
    response.cookies.delete("x_oauth_state");
    return response;
  }

  // Validate state from cookie
  const cookieValue = request.cookies.get("x_oauth_state")?.value;
  if (!cookieValue || !code || !stateParam) {
    settingsUrl.searchParams.set("x_error", "invalid_request");
    const response = NextResponse.redirect(settingsUrl);
    response.cookies.delete("x_oauth_state");
    return response;
  }

  let storedState: { state: string; codeVerifier: string };
  try {
    storedState = JSON.parse(cookieValue);
  } catch {
    settingsUrl.searchParams.set("x_error", "invalid_state");
    const response = NextResponse.redirect(settingsUrl);
    response.cookies.delete("x_oauth_state");
    return response;
  }

  if (storedState.state !== stateParam) {
    settingsUrl.searchParams.set("x_error", "state_mismatch");
    const response = NextResponse.redirect(settingsUrl);
    response.cookies.delete("x_oauth_state");
    return response;
  }

  try {
    const { clientId, clientSecret } = getXOAuthClientCredentials();
    const siteUrl = getRedirectBase();
    if (!siteUrl) {
      settingsUrl.searchParams.set("x_error", "server_config");
      const response = NextResponse.redirect(settingsUrl);
      response.cookies.delete("x_oauth_state");
      return response;
    }
    const redirectUri = `${siteUrl}/api/x/callback`;

    const tokens = await exchangeCodeForTokens({
      code,
      codeVerifier: storedState.codeVerifier,
      redirectUri,
      clientId,
      clientSecret,
    });

    console.log(
      "[X OAuth] Token exchange complete —",
      `accessToken: ${tokens.accessToken ? `present (${tokens.accessToken.length} chars)` : "MISSING"},`,
      `refreshToken: ${tokens.refreshToken ? `present (${tokens.refreshToken.length} chars)` : "MISSING"},`,
      `expiresIn: ${tokens.expiresIn}`
    );

    if (!tokens.accessToken || !tokens.refreshToken) {
      console.error("[X OAuth] Token exchange returned empty tokens — aborting");
      settingsUrl.searchParams.set("x_error", "empty_tokens");
      const response = NextResponse.redirect(settingsUrl);
      response.cookies.delete("x_oauth_state");
      return response;
    }

    const profile = await fetchXUserProfile(tokens.accessToken);
    console.log("[X OAuth] Profile fetched — username:", profile.username, "xUserId:", profile.xUserId);

    // Encrypt tokens before storing
    const encAccessToken = encryptToken(tokens.accessToken);
    const encRefreshToken = encryptToken(tokens.refreshToken);

    // Upsert XAccount record
    await prisma.xAccount.upsert({
      where: { userId: user.id },
      update: {
        xUserId: profile.xUserId,
        username: profile.username,
        displayName: profile.displayName,
        avatarUrl: profile.avatarUrl,
        accessToken: encAccessToken,
        refreshToken: encRefreshToken,
        tokenExpiresAt: new Date(Date.now() + tokens.expiresIn * 1000),
        tokenError: false,
      },
      create: {
        userId: user.id,
        xUserId: profile.xUserId,
        username: profile.username,
        displayName: profile.displayName,
        avatarUrl: profile.avatarUrl,
        accessToken: encAccessToken,
        refreshToken: encRefreshToken,
        tokenExpiresAt: new Date(Date.now() + tokens.expiresIn * 1000),
        tokenError: false,
      },
    });

    console.log("[X OAuth] XAccount upserted for user", user.id);

    settingsUrl.searchParams.set("x_connected", "true");
  } catch (err) {
    console.error("X OAuth callback error:", err);
    settingsUrl.searchParams.set("x_error", "token_exchange_failed");
  }

  const response = NextResponse.redirect(settingsUrl);
  response.cookies.delete("x_oauth_state");
  return response;
}
