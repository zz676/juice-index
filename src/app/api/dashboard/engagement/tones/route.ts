import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { requireUser } from "@/lib/auth/require-user";

export const runtime = "nodejs";

const DEFAULT_TONES = [
  {
    name: "Humor",
    color: "yellow",
    prompt:
      "You are a witty, funny commentator. Write replies that are clever, playful, and entertaining — think light humor and clever wordplay. Never be mean-spirited.",
  },
  {
    name: "Sarcastic",
    color: "orange",
    prompt:
      "You are a dry, sarcastic observer. Write replies with a tongue-in-cheek tone that acknowledges the obvious or ironic aspects of the tweet. Keep it smart and understated, never cruel.",
  },
  {
    name: "Huge Fan",
    color: "pink",
    prompt:
      "You are an enthusiastic, passionate fan of this account. Write replies that are genuinely excited, supportive, and show deep appreciation for their work. Energy is high but authentic.",
  },
  {
    name: "Cheers",
    color: "green",
    prompt:
      "You are a positive, encouraging voice in this community. Write replies that celebrate progress, offer genuine support, and inspire optimism. Keep it warm and uplifting.",
  },
  {
    name: "Neutral",
    color: "slate",
    prompt:
      "You are a balanced, informative analyst. Write replies that add context, share relevant data points, or thoughtfully acknowledge the tweet's key insight. Keep tone objective.",
  },
  {
    name: "Professional",
    color: "blue",
    prompt:
      "You are a professional executive and thought leader. Write replies that are insightful, polished, and add business or market perspective. Tone is confident and authoritative.",
  },
];

export async function GET(_request: NextRequest) {
  const { user, error } = await requireUser();
  if (error) return error;

  let tones = await prisma.userTone.findMany({
    where: { userId: user.id },
    orderBy: { createdAt: "asc" },
  });

  // Seed defaults if user has no tones yet
  if (tones.length === 0) {
    await prisma.userTone.createMany({
      data: DEFAULT_TONES.map((t) => ({ ...t, userId: user.id })),
    });
    tones = await prisma.userTone.findMany({
      where: { userId: user.id },
      orderBy: { createdAt: "asc" },
    });
  }

  return NextResponse.json({ tones });
}

export async function POST(request: NextRequest) {
  const { user, error } = await requireUser();
  if (error) return error;

  let body: { name?: string; prompt?: string; color?: string };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "BAD_REQUEST", message: "Invalid JSON body" }, { status: 400 });
  }

  const { name, prompt, color } = body;
  if (!name?.trim() || !prompt?.trim()) {
    return NextResponse.json(
      { error: "BAD_REQUEST", message: "name and prompt are required" },
      { status: 400 },
    );
  }

  // Check name uniqueness per user
  const existing = await prisma.userTone.findUnique({
    where: { userId_name: { userId: user.id, name: name.trim() } },
  });
  if (existing) {
    return NextResponse.json(
      { error: "CONFLICT", message: "A tone with that name already exists" },
      { status: 409 },
    );
  }

  const tone = await prisma.userTone.create({
    data: {
      userId: user.id,
      name: name.trim(),
      prompt: prompt.trim(),
      color: color?.trim() || "slate",
    },
  });

  return NextResponse.json({ tone }, { status: 201 });
}
