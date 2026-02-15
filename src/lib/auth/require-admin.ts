import { NextResponse } from "next/server";
import { requireUser } from "./require-user";
import prisma from "@/lib/prisma";

export async function requireAdmin() {
  const auth = await requireUser();
  if (auth.error) return auth;

  const dbUser = await prisma.user.findUnique({
    where: { id: auth.user.id },
    select: { role: true },
  });

  if (!dbUser || dbUser.role !== "ADMIN") {
    return {
      user: null as never,
      error: NextResponse.json(
        { error: "FORBIDDEN", message: "Admin access required" },
        { status: 403 }
      ),
    };
  }

  return { user: auth.user, error: null };
}
