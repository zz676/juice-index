import { NextResponse } from "next/server";
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

export const runtime = "nodejs";

export async function GET() {
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
    return NextResponse.json(
      { error: "FORBIDDEN", message: "Your plan does not include X posting. Upgrade to Starter or higher." },
      { status: 403 }
    );
  }

  // Check if already connected
  const existing = await prisma.xAccount.findUnique({
    where: { userId: user.id },
    select: { tokenError: true },
  });
  if (existing && !existing.tokenError) {
    return NextResponse.json(
      { error: "CONFLICT", message: "An X account is already connected. Disconnect it first." },
      { status: 409 }
    );
  }

  const { clientId } = getXOAuthClientCredentials();
  const { codeVerifier, codeChallenge } = generatePKCE();
  const state = crypto.randomBytes(16).toString("hex");

  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000";
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
