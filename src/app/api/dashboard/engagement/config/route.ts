import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { requireUser } from "@/lib/auth/require-user";
import { hasTier, normalizeTier } from "@/lib/api/tier";

export const runtime = "nodejs";

export async function GET() {
  const { user, error } = await requireUser();
  if (error) return error;

  const config = await prisma.engagementConfig.findUnique({
    where: { userId: user.id },
    select: { globalPaused: true },
  });

  return NextResponse.json({ globalPaused: config?.globalPaused ?? false });
}

export async function PATCH(request: NextRequest) {
  const { user, error } = await requireUser();
  if (error) return error;

  const subscription = await prisma.apiSubscription.findUnique({
    where: { userId: user.id },
    select: { tier: true },
  });
  const tier = normalizeTier(subscription?.tier);

  if (!hasTier(tier, "STARTER")) {
    return NextResponse.json(
      { error: "FORBIDDEN", message: "Engagement Center requires a Starter subscription or higher." },
      { status: 403 }
    );
  }

  let body: { globalPaused?: boolean };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "BAD_REQUEST", message: "Invalid JSON body" }, { status: 400 });
  }

  if (typeof body.globalPaused !== "boolean") {
    return NextResponse.json({ error: "BAD_REQUEST", message: "globalPaused must be a boolean" }, { status: 400 });
  }

  const config = await prisma.engagementConfig.upsert({
    where: { userId: user.id },
    update: { globalPaused: body.globalPaused },
    create: { userId: user.id, globalPaused: body.globalPaused },
    select: { globalPaused: true },
  });

  return NextResponse.json({ globalPaused: config.globalPaused });
}
