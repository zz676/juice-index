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
    select: {
      globalPaused: true,
      timezone: true,
      PauseSchedules: {
        orderBy: { createdAt: "asc" },
        select: {
          id: true,
          label: true,
          startTime: true,
          endTime: true,
          enabled: true,
          createdAt: true,
          PauseExceptions: {
            select: { id: true, date: true },
            orderBy: { date: "asc" },
          },
        },
      },
    },
  });

  return NextResponse.json({
    globalPaused: config?.globalPaused ?? false,
    timezone: config?.timezone ?? "America/New_York",
    schedules: config?.PauseSchedules ?? [],
  });
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

  let body: { globalPaused?: boolean; timezone?: string };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "BAD_REQUEST", message: "Invalid JSON body" }, { status: 400 });
  }

  if (body.globalPaused !== undefined && typeof body.globalPaused !== "boolean") {
    return NextResponse.json({ error: "BAD_REQUEST", message: "globalPaused must be a boolean" }, { status: 400 });
  }

  if (body.timezone !== undefined) {
    try {
      Intl.DateTimeFormat(undefined, { timeZone: body.timezone });
    } catch {
      return NextResponse.json({ error: "BAD_REQUEST", message: "Invalid IANA timezone" }, { status: 400 });
    }
  }

  const updateData: { globalPaused?: boolean; timezone?: string } = {};
  if (body.globalPaused !== undefined) updateData.globalPaused = body.globalPaused;
  if (body.timezone !== undefined) updateData.timezone = body.timezone;

  if (Object.keys(updateData).length === 0) {
    return NextResponse.json({ error: "BAD_REQUEST", message: "No fields to update" }, { status: 400 });
  }

  const config = await prisma.engagementConfig.upsert({
    where: { userId: user.id },
    update: updateData,
    create: { userId: user.id, ...updateData },
    select: { globalPaused: true, timezone: true },
  });

  return NextResponse.json({ globalPaused: config.globalPaused, timezone: config.timezone });
}
