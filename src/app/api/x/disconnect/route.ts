import { NextResponse } from "next/server";
import { requireUser } from "@/lib/auth/require-user";
import prisma from "@/lib/prisma";

export const runtime = "nodejs";

export async function POST() {
  const { user, error } = await requireUser();
  if (error) return error;

  const deleted = await prisma.xAccount.deleteMany({
    where: { userId: user.id },
  });

  if (deleted.count === 0) {
    return NextResponse.json(
      { error: "NOT_FOUND", message: "No X account connected" },
      { status: 404 }
    );
  }

  return NextResponse.json({ success: true });
}
