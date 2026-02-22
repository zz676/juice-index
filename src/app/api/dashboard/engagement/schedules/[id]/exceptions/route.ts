import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { requireUser } from "@/lib/auth/require-user";
import { isValidDateString } from "@/lib/engagement/pause-utils";

export const runtime = "nodejs";

const MAX_EXCEPTIONS = 50;

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const { user, error } = await requireUser();
  if (error) return error;

  const { id } = await params;

  // Verify the schedule belongs to this user
  const schedule = await prisma.pauseSchedule.findFirst({
    where: { id, EngagementConfig: { userId: user.id } },
    select: { id: true, _count: { select: { PauseExceptions: true } } },
  });
  if (!schedule) {
    return NextResponse.json({ error: "NOT_FOUND", message: "Schedule not found" }, { status: 404 });
  }

  let body: { date?: string };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "BAD_REQUEST", message: "Invalid JSON body" }, { status: 400 });
  }

  const { date } = body;
  if (!date || !isValidDateString(date)) {
    return NextResponse.json({ error: "BAD_REQUEST", message: "date must be YYYY-MM-DD" }, { status: 400 });
  }

  if (schedule._count.PauseExceptions >= MAX_EXCEPTIONS) {
    return NextResponse.json(
      { error: "LIMIT_EXCEEDED", message: `Maximum of ${MAX_EXCEPTIONS} exceptions per schedule` },
      { status: 422 }
    );
  }

  try {
    const exception = await prisma.pauseException.create({
      data: { pauseScheduleId: id, date },
      select: { id: true, date: true },
    });
    return NextResponse.json({ exception }, { status: 201 });
  } catch (err: unknown) {
    // Unique constraint: date already exists for this schedule
    if (typeof err === "object" && err !== null && "code" in err && (err as { code: string }).code === "P2002") {
      return NextResponse.json(
        { error: "CONFLICT", message: "Exception for that date already exists" },
        { status: 409 }
      );
    }
    throw err;
  }
}
