import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { requireUser } from "@/lib/auth/require-user";
import { isValidTimeString } from "@/lib/engagement/pause-utils";

export const runtime = "nodejs";

const MAX_SCHEDULES = 10;

export async function POST(request: NextRequest) {
  const { user, error } = await requireUser();
  if (error) return error;

  let body: { label?: string; startTime?: string; endTime?: string };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "BAD_REQUEST", message: "Invalid JSON body" }, { status: 400 });
  }

  const { label, startTime, endTime } = body;

  if (!startTime || !isValidTimeString(startTime)) {
    return NextResponse.json({ error: "BAD_REQUEST", message: "startTime must be HH:mm" }, { status: 400 });
  }
  if (!endTime || !isValidTimeString(endTime)) {
    return NextResponse.json({ error: "BAD_REQUEST", message: "endTime must be HH:mm" }, { status: 400 });
  }

  // Upsert engagement config to get its id
  const config = await prisma.engagementConfig.upsert({
    where: { userId: user.id },
    update: {},
    create: { userId: user.id },
    select: { id: true },
  });

  // Enforce max schedules per user
  const count = await prisma.pauseSchedule.count({
    where: { engagementConfigId: config.id },
  });
  if (count >= MAX_SCHEDULES) {
    return NextResponse.json(
      { error: "LIMIT_EXCEEDED", message: `Maximum of ${MAX_SCHEDULES} schedules allowed` },
      { status: 422 }
    );
  }

  const schedule = await prisma.pauseSchedule.create({
    data: {
      engagementConfigId: config.id,
      label: label?.trim() || null,
      startTime,
      endTime,
    },
    select: {
      id: true,
      label: true,
      startTime: true,
      endTime: true,
      enabled: true,
      createdAt: true,
      PauseExceptions: { select: { id: true, date: true }, orderBy: { date: "asc" } },
    },
  });

  return NextResponse.json({ schedule }, { status: 201 });
}
