import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { requireUser } from "@/lib/auth/require-user";

export const runtime = "nodejs";

export async function GET() {
  const { user, error } = await requireUser();
  if (error) return error;

  const styles = await prisma.userChartStyle.findMany({
    where: { userId: user.id },
    orderBy: { createdAt: "asc" },
  });

  return NextResponse.json({ styles });
}

export async function POST(request: NextRequest) {
  const { user, error } = await requireUser();
  if (error) return error;

  let body: { name?: string; config?: unknown };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "BAD_REQUEST", message: "Invalid JSON body" }, { status: 400 });
  }

  const { name, config } = body;
  if (!name?.trim()) {
    return NextResponse.json({ error: "BAD_REQUEST", message: "name is required" }, { status: 400 });
  }
  if (!config || typeof config !== "object") {
    return NextResponse.json({ error: "BAD_REQUEST", message: "config is required" }, { status: 400 });
  }

  const existing = await prisma.userChartStyle.findUnique({
    where: { userId_name: { userId: user.id, name: name.trim() } },
  });
  if (existing) {
    return NextResponse.json({ error: "CONFLICT", message: "A style with that name already exists" }, { status: 409 });
  }

  const style = await prisma.userChartStyle.create({
    data: { userId: user.id, name: name.trim(), config },
  });

  return NextResponse.json({ style }, { status: 201 });
}
