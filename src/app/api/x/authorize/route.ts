import { NextRequest, NextResponse } from "next/server";
import { requireUser } from "@/lib/auth/require-user";
import { normalizeTier } from "@/lib/api/tier";
import { TIER_QUOTAS } from "@/lib/api/quotas";
import prisma from "@/lib/prisma";
import crypto from "crypto";
import {
  getXOAuthClientCredentials,
  generatePKCE,
  buildAuthorizationUrl,
} from "@/lib/x/oauth";
import { getRedirectBase } from "@/lib/auth/redirect-base";

export const runtime = "nodejs";

export async function GET(request: NextRequest) {
  const settingsUrl = new URL("/dashboard/settings", request.url);

  const { user, error } = await requireUser();
  if (error) return error;

  // Check tier allows X accounts
  const subscription = await prisma.apiSubscription.findUnique({
    where: { userId: user.id },
    select: { tier: true },
  });
  const tier = normalizeTier(subscription?.tier);
  const quota = TIER_QUOTAS[tier];

  if (quota.xAccounts <= 0) {
    settingsUrl.searchParams.set("x_error", "upgrade_required");
    return NextResponse.redirect(settingsUrl);
  }

  // Allow reconnection at any time — the callback upsert handles overwriting existing tokens.
  // No conflict check needed; OAuth requires user consent on X's side anyway.

  const { clientId } = getXOAuthClientCredentials();
  const { codeVerifier, codeChallenge } = generatePKCE();
  const state = crypto.randomBytes(16).toString("hex");

  const siteUrl = getRedirectBase();
  if (!siteUrl) {
    settingsUrl.searchParams.set("x_error", "server_config");
    return NextResponse.redirect(settingsUrl);
  }
  const redirectUri = `${siteUrl}/api/x/callback`;

  const authorizeUrl = buildAuthorizationUrl({
    clientId,
    redirectUri,
    state,
    codeChallenge,
  });

  const response = NextResponse.redirect(authorizeUrl);

  // Store state + code_verifier in an HttpOnly cookie (10 min TTL)
  response.cookies.set("x_oauth_state", JSON.stringify({ state, codeVerifier }), {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: 600,
  });

  return response;
}
