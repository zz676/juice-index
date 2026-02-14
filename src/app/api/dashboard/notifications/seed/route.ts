import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { requireUser } from "@/lib/auth/require-user";
import { NotificationType } from "@prisma/client";

export const runtime = "nodejs";

export async function POST() {
  const { user, error } = await requireUser();
  if (error) return error;

  const now = Date.now();
  const HOUR = 3_600_000;
  const DAY = 86_400_000;

  const sampleNotifications = [
    {
      userId: user.id,
      type: NotificationType.DIGEST_READY,
      title: "Your daily digest is ready",
      message: "BYD overtakes Tesla in Q4 global EV deliveries — 6 new articles summarized for you.",
      link: "/dashboard/posts",
      read: false,
      createdAt: new Date(now - 1 * HOUR),
    },
    {
      userId: user.id,
      type: NotificationType.ALERT,
      title: "Trending: NIO battery swap expansion",
      message: "NIO announced 2,000 new battery swap stations across Europe, driving a 12% stock surge.",
      link: "/dashboard/studio",
      read: false,
      createdAt: new Date(now - 3 * HOUR),
    },
    {
      userId: user.id,
      type: NotificationType.SYSTEM,
      title: "Scheduled post published",
      message: "Your post about Li Auto Q3 earnings was successfully published to X.",
      link: "/dashboard/posts",
      read: false,
      createdAt: new Date(now - 8 * HOUR),
    },
    {
      userId: user.id,
      type: NotificationType.ALERT,
      title: "Price alert: XPeng G9 discount",
      message: "XPeng slashes G9 prices by 15% in China, intensifying the EV price war with Tesla Model Y.",
      link: "/dashboard/studio",
      read: true,
      createdAt: new Date(now - 1 * DAY),
    },
    {
      userId: user.id,
      type: NotificationType.DIGEST_READY,
      title: "Weekly industry roundup",
      message: "China EV exports hit record 120k units in December. CATL unveils next-gen sodium-ion cells.",
      link: "/dashboard/posts",
      read: true,
      createdAt: new Date(now - 2 * DAY),
    },
    {
      userId: user.id,
      type: NotificationType.WELCOME,
      title: "Welcome to Juice Index!",
      message: "Start by customizing your digest preferences and connecting your X account.",
      link: "/dashboard/settings",
      read: true,
      createdAt: new Date(now - 7 * DAY),
    },
  ];

  await prisma.notification.createMany({ data: sampleNotifications });

  return NextResponse.json({ success: true, count: sampleNotifications.length });
}
