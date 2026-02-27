import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { requireUser } from "@/lib/auth/require-user";

export const runtime = "nodejs";

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const { user, error } = await requireUser();
  if (error) return error;

  const { id } = await params;

  const style = await prisma.userChartStyle.findFirst({
    where: { id, userId: user.id },
  });
  if (!style) {
    return NextResponse.json({ error: "NOT_FOUND", message: "Style not found" }, { status: 404 });
  }

  let body: { name?: string; config?: unknown };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "BAD_REQUEST", message: "Invalid JSON body" }, { status: 400 });
  }

  const data: Record<string, unknown> = {};
  if (body.name !== undefined) {
    const trimmedName = (body.name as string).trim();
    if (!trimmedName) {
      return NextResponse.json({ error: "BAD_REQUEST", message: "name cannot be empty" }, { status: 400 });
    }
    data.name = trimmedName;
  }
  if (body.config !== undefined) {
    if (!body.config || typeof body.config !== "object") {
      return NextResponse.json({ error: "BAD_REQUEST", message: "config must be an object" }, { status: 400 });
    }
    data.config = body.config;
  }

  if (Object.keys(data).length === 0) {
    return NextResponse.json({ error: "BAD_REQUEST", message: "No fields to update" }, { status: 400 });
  }

  if (data.name && data.name !== style.name) {
    const conflict = await prisma.userChartStyle.findUnique({
      where: { userId_name: { userId: user.id, name: data.name as string } },
    });
    if (conflict) {
      return NextResponse.json({ error: "CONFLICT", message: "A style with that name already exists" }, { status: 409 });
    }
  }

  const updated = await prisma.userChartStyle.update({ where: { id }, data });
  return NextResponse.json({ style: updated });
}

export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const { user, error } = await requireUser();
  if (error) return error;

  const { id } = await params;

  const style = await prisma.userChartStyle.findFirst({
    where: { id, userId: user.id },
  });
  if (!style) {
    return NextResponse.json({ error: "NOT_FOUND", message: "Style not found" }, { status: 404 });
  }

  await prisma.userChartStyle.delete({ where: { id } });
  return new NextResponse(null, { status: 204 });
}
