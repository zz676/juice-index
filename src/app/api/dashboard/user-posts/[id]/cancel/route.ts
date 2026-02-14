import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { requireUser } from "@/lib/auth/require-user";
import { UserPostStatus } from "@prisma/client";

export const runtime = "nodejs";

export async function POST(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { user, error } = await requireUser();
  if (error) return error;

  const { id } = await params;

  const post = await prisma.userPost.findUnique({ where: { id } });
  if (!post || post.userId !== user.id) {
    return NextResponse.json(
      { error: "NOT_FOUND", message: "Post not found" },
      { status: 404 }
    );
  }

  if (post.status !== UserPostStatus.SCHEDULED) {
    return NextResponse.json(
      { error: "BAD_REQUEST", message: "Only SCHEDULED posts can be cancelled" },
      { status: 400 }
    );
  }

  const updated = await prisma.userPost.update({
    where: { id },
    data: {
      status: UserPostStatus.DRAFT,
      scheduledFor: null,
    },
  });

  return NextResponse.json({ post: updated });
}
