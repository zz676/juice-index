import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { PostStatus } from "@prisma/client";

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const statusParam = searchParams.get("status");
    const search = searchParams.get("search") || "";
    const page = Math.max(parseInt(searchParams.get("page") || "1", 10), 1);
    const limit = Math.min(Math.max(parseInt(searchParams.get("limit") || "20", 10), 1), 100);

    // Build where clause
    const where: Record<string, unknown> = {};

    if (statusParam && Object.values(PostStatus).includes(statusParam as PostStatus)) {
      where.status = statusParam as PostStatus;
    }

    if (search) {
      where.OR = [
        { translatedTitle: { contains: search, mode: "insensitive" } },
        { translatedSummary: { contains: search, mode: "insensitive" } },
        { originalTitle: { contains: search, mode: "insensitive" } },
      ];
    }

    const [posts, total] = await Promise.all([
      prisma.post.findMany({
        where,
        orderBy: { createdAt: "desc" },
        skip: (page - 1) * limit,
        take: limit,
        select: {
          id: true,
          translatedTitle: true,
          translatedSummary: true,
          originalTitle: true,
          source: true,
          sourceUrl: true,
          sourceAuthor: true,
          sourceDate: true,
          categories: true,
          status: true,
          brand: true,
          createdAt: true,
          updatedAt: true,
          approvedAt: true,
          publishedToX: true,
          xPublishedAt: true,
        },
      }),
      prisma.post.count({ where }),
    ]);

    return NextResponse.json({
      posts,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    });
  } catch (error) {
    console.error("Error fetching posts:", error);
    return NextResponse.json(
      { error: "Failed to fetch posts" },
      { status: 500 }
    );
  }
}
