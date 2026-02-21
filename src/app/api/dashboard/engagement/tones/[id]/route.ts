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

  const tone = await prisma.userTone.findFirst({
    where: { id, userId: user.id },
  });
  if (!tone) {
    return NextResponse.json({ error: "NOT_FOUND", message: "Tone not found" }, { status: 404 });
  }

  let body: { name?: string; prompt?: string; color?: string };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "BAD_REQUEST", message: "Invalid JSON body" }, { status: 400 });
  }

  const data: Record<string, string> = {};
  if (body.name !== undefined) data.name = body.name.trim();
  if (body.prompt !== undefined) data.prompt = body.prompt.trim();
  if (body.color !== undefined) data.color = body.color.trim();

  if (Object.keys(data).length === 0) {
    return NextResponse.json({ error: "BAD_REQUEST", message: "No fields to update" }, { status: 400 });
  }

  // Check name uniqueness if name is changing
  if (data.name && data.name !== tone.name) {
    const existing = await prisma.userTone.findUnique({
      where: { userId_name: { userId: user.id, name: data.name } },
    });
    if (existing) {
      return NextResponse.json(
        { error: "CONFLICT", message: "A tone with that name already exists" },
        { status: 409 },
      );
    }
  }

  const updated = await prisma.userTone.update({ where: { id }, data });
  return NextResponse.json({ tone: updated });
}

export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const { user, error } = await requireUser();
  if (error) return error;

  const { id } = await params;

  const tone = await prisma.userTone.findFirst({
    where: { id, userId: user.id },
  });
  if (!tone) {
    return NextResponse.json({ error: "NOT_FOUND", message: "Tone not found" }, { status: 404 });
  }

  await prisma.userTone.delete({ where: { id } });
  return new NextResponse(null, { status: 204 });
}
