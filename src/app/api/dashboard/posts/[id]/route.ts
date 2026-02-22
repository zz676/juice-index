import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { PostStatus } from "@prisma/client";

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const body = await request.json();
    const { status, translatedTitle, translatedSummary } = body;

    const updateData: Record<string, unknown> = {};

    if (status && Object.values(PostStatus).includes(status)) {
      updateData.status = status;
      if (status === "APPROVED") {
        updateData.approvedAt = new Date();
      }
    }

    if (translatedTitle !== undefined) {
      updateData.translatedTitle = translatedTitle;
    }

    if (translatedSummary !== undefined) {
      updateData.translatedSummary = translatedSummary;
    }

    if (Object.keys(updateData).length === 0) {
      return NextResponse.json(
        { error: "No valid fields to update" },
        { status: 400 }
      );
    }

    const updated = await prisma.post.update({
      where: { id },
      data: updateData,
    });

    return NextResponse.json({ post: updated });
  } catch (error) {
    console.error("Error updating post:", error);
    return NextResponse.json(
      { error: "Failed to update post" },
      { status: 500 }
    );
  }
}

export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;

    await prisma.post.delete({
      where: { id },
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Error deleting post:", error);
    return NextResponse.json(
      { error: "Failed to delete post" },
      { status: 500 }
    );
  }
}
