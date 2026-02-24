import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { requireUser } from "@/lib/auth/require-user";
import { isValidTimeString } from "@/lib/engagement/pause-utils";

export const runtime = "nodejs";

async function getScheduleForUser(id: string, userId: string) {
  return prisma.pauseSchedule.findFirst({
    where: {
      id,
      EngagementConfig: { userId },
    },
  });
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const { user, error } = await requireUser();
  if (error) return error;

  const { id } = await params;
  const schedule = await getScheduleForUser(id, user.id);
  if (!schedule) {
    return NextResponse.json({ error: "NOT_FOUND", message: "Schedule not found" }, { status: 404 });
  }

  let body: { label?: string; startTime?: string; endTime?: string; enabled?: boolean; frequencyOverride?: boolean; overridePollInterval?: number };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "BAD_REQUEST", message: "Invalid JSON body" }, { status: 400 });
  }

  if (body.startTime !== undefined && !isValidTimeString(body.startTime)) {
    return NextResponse.json({ error: "BAD_REQUEST", message: "startTime must be HH:mm" }, { status: 400 });
  }
  if (body.endTime !== undefined && !isValidTimeString(body.endTime)) {
    return NextResponse.json({ error: "BAD_REQUEST", message: "endTime must be HH:mm" }, { status: 400 });
  }
  if (body.enabled !== undefined && typeof body.enabled !== "boolean") {
    return NextResponse.json({ error: "BAD_REQUEST", message: "enabled must be a boolean" }, { status: 400 });
  }
  if (body.frequencyOverride !== undefined && typeof body.frequencyOverride !== "boolean") {
    return NextResponse.json({ error: "BAD_REQUEST", message: "frequencyOverride must be a boolean" }, { status: 400 });
  }
  if (body.overridePollInterval !== undefined) {
    const VALID_POLL_INTERVALS = [5, 10, 15, 30, 60, 210, 300, 510, 690, 930, 1200, 1440, 10080];
    if (!VALID_POLL_INTERVALS.includes(Number(body.overridePollInterval))) {
      return NextResponse.json({ error: "BAD_REQUEST", message: "Invalid overridePollInterval value" }, { status: 400 });
    }
  }

  const data: Record<string, string | boolean | number | null> = {};
  if (body.label !== undefined) data.label = body.label.trim() || null;
  if (body.startTime !== undefined) data.startTime = body.startTime;
  if (body.endTime !== undefined) data.endTime = body.endTime;
  if (body.enabled !== undefined) data.enabled = body.enabled;
  if (body.frequencyOverride !== undefined) data.frequencyOverride = body.frequencyOverride;
  if (body.overridePollInterval !== undefined) data.overridePollInterval = Number(body.overridePollInterval);

  if (Object.keys(data).length === 0) {
    return NextResponse.json({ error: "BAD_REQUEST", message: "No fields to update" }, { status: 400 });
  }

  const updated = await prisma.pauseSchedule.update({
    where: { id },
    data,
    select: {
      id: true,
      label: true,
      startTime: true,
      endTime: true,
      enabled: true,
      createdAt: true,
      frequencyOverride: true,
      overridePollInterval: true,
      PauseExceptions: { select: { id: true, date: true }, orderBy: { date: "asc" } },
    },
  });

  return NextResponse.json({ schedule: updated });
}

export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const { user, error } = await requireUser();
  if (error) return error;

  const { id } = await params;
  const schedule = await getScheduleForUser(id, user.id);
  if (!schedule) {
    return NextResponse.json({ error: "NOT_FOUND", message: "Schedule not found" }, { status: 404 });
  }

  await prisma.pauseSchedule.delete({ where: { id } });
  return new NextResponse(null, { status: 204 });
}
