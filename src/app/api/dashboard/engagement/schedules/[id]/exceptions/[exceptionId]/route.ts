import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { requireUser } from "@/lib/auth/require-user";

export const runtime = "nodejs";

export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string; exceptionId: string }> },
) {
  const { user, error } = await requireUser();
  if (error) return error;

  const { id, exceptionId } = await params;

  // Verify the exception belongs to a schedule owned by this user
  const exception = await prisma.pauseException.findFirst({
    where: {
      id: exceptionId,
      pauseScheduleId: id,
      PauseSchedule: { EngagementConfig: { userId: user.id } },
    },
  });
  if (!exception) {
    return NextResponse.json({ error: "NOT_FOUND", message: "Exception not found" }, { status: 404 });
  }

  await prisma.pauseException.delete({ where: { id: exceptionId } });
  return new NextResponse(null, { status: 204 });
}
