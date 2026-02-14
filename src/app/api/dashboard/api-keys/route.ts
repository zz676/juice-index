import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { requireUser } from "@/lib/auth/require-user";
import { normalizeTier } from "@/lib/api/tier";
import { TIER_QUOTAS } from "@/lib/api/quotas";
import { generateApiKeySecret, sha256Hex, keyPrefix } from "@/lib/api/keys";

export const runtime = "nodejs";

export async function GET() {
  const { user, error } = await requireUser();
  if (error) return error;

  const keys = await prisma.apiKey.findMany({
    where: { userId: user.id, isActive: true, revokedAt: null },
    select: { id: true, keyPrefix: true, createdAt: true, expiresAt: true },
    orderBy: { createdAt: "desc" },
  });

  return NextResponse.json({ keys });
}

export async function POST() {
  const { user, error } = await requireUser();
  if (error) return error;

  const subscription = await prisma.apiSubscription.findUnique({
    where: { userId: user.id },
    select: { tier: true, status: true },
  });

  const tier = normalizeTier(subscription?.tier);
  const maxKeys = TIER_QUOTAS[tier].maxApiKeys;

  if (maxKeys === 0) {
    return NextResponse.json(
      { error: "FORBIDDEN", message: "API keys are not available on the Free plan. Upgrade to Pro to get API access." },
      { status: 403 }
    );
  }

  const activeCount = await prisma.apiKey.count({
    where: { userId: user.id, isActive: true, revokedAt: null },
  });

  if (activeCount >= maxKeys) {
    return NextResponse.json(
      { error: "QUOTA_EXCEEDED", message: `You can have at most ${maxKeys} active API key${maxKeys === 1 ? "" : "s"} on your plan. Revoke an existing key or upgrade.` },
      { status: 403 }
    );
  }

  const secret = generateApiKeySecret();
  const hash = sha256Hex(secret);
  const pfx = keyPrefix(secret);

  const apiKey = await prisma.apiKey.create({
    data: {
      userId: user.id,
      keyHash: hash,
      keyPrefix: pfx,
      isActive: true,
    },
    select: { id: true, keyPrefix: true, createdAt: true },
  });

  // Return the full secret only once — it cannot be recovered later
  return NextResponse.json({ key: { ...apiKey, secret } }, { status: 201 });
}
