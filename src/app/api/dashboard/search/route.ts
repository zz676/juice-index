import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { Brand } from "@prisma/client";

const BRAND_LABELS: Record<Brand, string> = {
  BYD: "BYD",
  NIO: "NIO",
  XPENG: "XPeng",
  LI_AUTO: "Li Auto",
  ZEEKR: "Zeekr",
  XIAOMI: "Xiaomi",
  TESLA_CHINA: "Tesla China",
  LEAPMOTOR: "Leapmotor",
  GEELY: "Geely",
  OTHER_BRAND: "Other",
  INDUSTRY: "Industry",
};

export async function GET(request: NextRequest) {
  const q = request.nextUrl.searchParams.get("q")?.trim() ?? "";

  if (q.length < 2) {
    return NextResponse.json({ news: [], brands: [] });
  }

  try {
    // Brand search: in-memory filter of Brand enum
    const brands = Object.entries(BRAND_LABELS)
      .filter(
        ([code]) => code !== "OTHER_BRAND" && code !== "INDUSTRY"
      )
      .filter(([, label]) => label.toLowerCase().includes(q.toLowerCase()))
      .map(([code, label]) => ({ code, label }));

    // News search: Prisma query across title and summary fields
    const posts = await prisma.post.findMany({
      where: {
        status: "PUBLISHED",
        OR: [
          { translatedTitle: { contains: q, mode: "insensitive" } },
          { originalTitle: { contains: q, mode: "insensitive" } },
          { translatedSummary: { contains: q, mode: "insensitive" } },
        ],
      },
      take: 8,
      orderBy: { createdAt: "desc" },
      select: {
        id: true,
        translatedTitle: true,
        originalTitle: true,
        translatedSummary: true,
        sourceUrl: true,
        createdAt: true,
        categories: true,
      },
    });

    const news = posts.map((post) => ({
      id: post.id,
      title: post.translatedTitle || post.originalTitle || "Untitled",
      summary: post.translatedSummary || "",
      sourceUrl: post.sourceUrl,
      time: new Date(post.createdAt).toLocaleDateString(),
      category: post.categories[0] || "General",
    }));

    return NextResponse.json({ news, brands });
  } catch (error) {
    console.error("Error searching dashboard:", error);
    return NextResponse.json(
      { error: "Failed to search" },
      { status: 500 }
    );
  }
}
