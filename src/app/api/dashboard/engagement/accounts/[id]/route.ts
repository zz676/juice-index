import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { requireUser } from "@/lib/auth/require-user";
import type { ReplyTone } from "@prisma/client";

export const runtime = "nodejs";

const VALID_TONES: ReplyTone[] = ["HUMOR", "SARCASTIC", "HUGE_FAN", "CHEERS", "NEUTRAL", "PROFESSIONAL"];

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { user, error } = await requireUser();
  if (error) return error;

  const { id } = await params;

  const account = await prisma.monitoredAccount.findFirst({
    where: { id, userId: user.id },
  });
  if (!account) {
    return NextResponse.json({ error: "NOT_FOUND", message: "Account not found" }, { status: 404 });
  }

  let body: {
    tone?: string;
    customTonePrompt?: string | null;
    imageFrequency?: number;
    enabled?: boolean;
    accountContext?: string | null;
    toneWeights?: Record<string, number> | null;
    temperature?: number;
  };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "BAD_REQUEST", message: "Invalid JSON body" }, { status: 400 });
  }

  const data: Record<string, unknown> = {};

  if (body.tone !== undefined) {
    if (!VALID_TONES.includes(body.tone as ReplyTone)) {
      return NextResponse.json({ error: "BAD_REQUEST", message: "Invalid tone value" }, { status: 400 });
    }
    data.tone = body.tone;
  }
  if (body.customTonePrompt !== undefined) {
    data.customTonePrompt = body.customTonePrompt ?? null;
  }
  if (body.imageFrequency !== undefined) {
    const freq = Math.round(Number(body.imageFrequency));
    if (!isNaN(freq) && freq >= 0 && freq <= 100) {
      data.imageFrequency = freq;
    }
  }
  if (body.enabled !== undefined) {
    data.enabled = Boolean(body.enabled);
  }
  if (body.accountContext !== undefined) {
    data.accountContext = body.accountContext ?? null;
  }
  if (body.toneWeights !== undefined) {
    data.toneWeights = body.toneWeights ?? null;
  }
  if (body.temperature !== undefined) {
    const temp = Number(body.temperature);
    if (!isNaN(temp) && temp >= 0.1 && temp <= 1.5) {
      data.temperature = temp;
    }
  }

  if (Object.keys(data).length === 0) {
    return NextResponse.json({ error: "BAD_REQUEST", message: "No fields to update" }, { status: 400 });
  }

  const updated = await prisma.monitoredAccount.update({ where: { id }, data });
  return NextResponse.json({ account: updated });
}

export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { user, error } = await requireUser();
  if (error) return error;

  const { id } = await params;

  const account = await prisma.monitoredAccount.findFirst({
    where: { id, userId: user.id },
  });
  if (!account) {
    return NextResponse.json({ error: "NOT_FOUND", message: "Account not found" }, { status: 404 });
  }

  await prisma.monitoredAccount.delete({ where: { id } });
  return new NextResponse(null, { status: 204 });
}
