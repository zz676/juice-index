import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { requireUser } from "@/lib/auth/require-user";

export const runtime = "nodejs";

const VALID_POLL_INTERVALS = [5, 10, 15, 30, 60, 210, 300, 510, 690, 930, 1200, 1440, 10080];

type AccountConfig = {
  username: string;
  pollInterval?: number;
  temperature?: number;
  toneWeights?: Record<string, number> | null;
  imageFrequency?: number;
  imageStyleName?: string | null;
  autoPost?: boolean;
  ignorePauseSchedule?: boolean;
  enabled?: boolean;
  accountContext?: string | null;
};

export async function POST(request: NextRequest) {
  const { user, error } = await requireUser();
  if (error) return error;

  let body: { accounts?: unknown };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "BAD_REQUEST", message: "Invalid JSON body" }, { status: 400 });
  }

  if (!Array.isArray(body.accounts)) {
    return NextResponse.json({ error: "BAD_REQUEST", message: "accounts must be an array" }, { status: 400 });
  }

  const configs = body.accounts as AccountConfig[];

  // Load all accounts and image styles for this user once
  const [existing, userImageStyles] = await Promise.all([
    prisma.monitoredAccount.findMany({
      where: { userId: user.id },
      select: { id: true, username: true },
    }),
    prisma.userImageStyle.findMany({
      where: { userId: user.id },
      select: { id: true, name: true },
    }),
  ]);
  const imageStyleByName = new Map(userImageStyles.map((s) => [s.name.toLowerCase(), s]));

  const byUsername = new Map(existing.map((a) => [a.username.toLowerCase(), a.id]));

  let updated = 0;
  const skipped: string[] = [];

  for (const config of configs) {
    const accountId = byUsername.get(config.username?.toLowerCase());
    if (!accountId) {
      skipped.push(config.username);
      continue;
    }

    const data: Record<string, unknown> = {};

    if (config.pollInterval !== undefined) {
      const interval = Number(config.pollInterval);
      if (VALID_POLL_INTERVALS.includes(interval)) {
        data.pollInterval = interval;
      }
    }

    if (config.temperature !== undefined) {
      const temp = Number(config.temperature);
      if (!isNaN(temp) && temp >= 0.1 && temp <= 1.0) {
        data.temperature = temp;
      }
    }

    if (config.toneWeights !== undefined) {
      data.toneWeights = config.toneWeights ?? null;
    }

    if (config.imageFrequency !== undefined) {
      const freq = Math.round(Number(config.imageFrequency));
      if (!isNaN(freq) && freq >= 0 && freq <= 100) {
        data.imageFrequency = freq;
      }
    }

    if (config.autoPost !== undefined) {
      data.autoPost = Boolean(config.autoPost);
    }

    if (config.ignorePauseSchedule !== undefined) {
      data.ignorePauseSchedule = Boolean(config.ignorePauseSchedule);
    }

    if (config.enabled !== undefined) {
      data.enabled = Boolean(config.enabled);
    }

    if (config.accountContext !== undefined) {
      data.accountContext = config.accountContext ?? null;
    }

    if (config.imageStyleName !== undefined) {
      if (config.imageStyleName === null) {
        data.imageStyleId = null;
        data.imageStyleName = null;
      } else {
        const style = imageStyleByName.get(config.imageStyleName.toLowerCase());
        if (style) {
          data.imageStyleId = style.id;
          data.imageStyleName = style.name;
        }
      }
    }

    await prisma.monitoredAccount.update({ where: { id: accountId }, data });
    updated++;
  }

  return NextResponse.json({ updated, skipped });
}
