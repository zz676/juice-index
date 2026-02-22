import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { EngagementReplyStatus } from "@prisma/client";

export const runtime = "nodejs";

interface TelegramCallbackQuery {
  id: string;
  from: { id: number; username?: string };
  message?: {
    message_id: number;
    chat: { id: number };
    text?: string;
    caption?: string;
    photo?: unknown[];
  };
  data?: string;
}

interface TelegramUpdate {
  update_id: number;
  callback_query?: TelegramCallbackQuery;
}

async function answerCallbackQuery(
  token: string,
  callbackQueryId: string,
  text: string,
) {
  await fetch(`https://api.telegram.org/bot${token}/answerCallbackQuery`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ callback_query_id: callbackQueryId, text }),
  });
}

async function editMessage(
  token: string,
  chatId: number,
  messageId: number,
  isPhoto: boolean,
  newSuffix: string,
  originalText: string,
) {
  const newText = `${originalText}\n\n${newSuffix}`;
  const endpoint = isPhoto ? "editMessageCaption" : "editMessageText";
  const field = isPhoto ? "caption" : "text";

  await fetch(`https://api.telegram.org/bot${token}/${endpoint}`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      chat_id: chatId,
      message_id: messageId,
      [field]: newText,
      parse_mode: "HTML",
      reply_markup: { inline_keyboard: [] },
    }),
  });
}

export async function POST(request: NextRequest) {
  const webhookSecret = process.env.TELEGRAM_WEBHOOK_SECRET;
  if (webhookSecret) {
    const token = request.nextUrl.searchParams.get("token");
    if (token !== webhookSecret) {
      return NextResponse.json({ error: "UNAUTHORIZED" }, { status: 401 });
    }
  }

  const botToken = process.env.TELEGRAM_BOT_TOKEN;
  if (!botToken) {
    return NextResponse.json({ error: "Bot not configured" }, { status: 500 });
  }

  let update: TelegramUpdate;
  try {
    update = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const callbackQuery = update.callback_query;
  if (!callbackQuery?.data) {
    // Not a callback query — acknowledge and ignore
    return NextResponse.json({ ok: true });
  }

  const [action, replyId] = callbackQuery.data.split(":");
  if (!action || !replyId) {
    await answerCallbackQuery(botToken, callbackQuery.id, "Invalid callback data");
    return NextResponse.json({ ok: true });
  }

  if (action !== "posted" && action !== "discard") {
    await answerCallbackQuery(botToken, callbackQuery.id, "Unknown action");
    return NextResponse.json({ ok: true });
  }

  const newStatus =
    action === "posted"
      ? EngagementReplyStatus.POSTED
      : EngagementReplyStatus.DISCARDED;

  try {
    await prisma.engagementReply.update({
      where: { id: replyId },
      data: { status: newStatus },
    });
  } catch (err) {
    console.error(`[telegram-webhook] Failed to update reply ${replyId}:`, err);
    await answerCallbackQuery(botToken, callbackQuery.id, "Update failed");
    return NextResponse.json({ ok: true });
  }

  const label = action === "posted" ? "✅ Marked as Posted" : "❌ Discarded";
  await answerCallbackQuery(botToken, callbackQuery.id, label);

  // Edit the original message to reflect the action taken
  if (callbackQuery.message) {
    const { message_id, chat, text, caption, photo } = callbackQuery.message;
    const isPhoto = Array.isArray(photo) && photo.length > 0;
    const originalText = caption ?? text ?? "";
    try {
      await editMessage(botToken, chat.id, message_id, isPhoto, label, originalText);
    } catch (err) {
      console.warn("[telegram-webhook] Failed to edit message:", err);
    }
  }

  return NextResponse.json({ ok: true });
}
