/**
 * Escapes characters required by Telegram's HTML parse mode for use inside
 * text nodes (<pre>, <b>, <i>, <a> content, etc.).
 * NOT safe for use inside HTML attribute values.
 */
export function escapeHtml(text: string): string {
  return text
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");
}

export function buildMessageText(
  authorUsername: string,
  replyText: string,
  tweetLinks: string
): string {
  return `💬 Reply for @${authorUsername}\n\n<pre language="text">${escapeHtml(replyText)}</pre>\n\n${tweetLinks}`;
}

interface SendToTelegramParams {
  replyId: string;
  replyText: string;
  originalTweetUrl: string;
  authorUsername: string;
  imageUrl?: string;
}

/**
 * Sends a generated reply to a Telegram chat for manual review and posting.
 * Includes inline "Posted" / "Discard" buttons to update the reply status.
 */
export async function sendToTelegram({
  replyId,
  replyText,
  originalTweetUrl,
  authorUsername,
  imageUrl,
}: SendToTelegramParams): Promise<void> {
  const token = process.env.TELEGRAM_BOT_TOKEN;
  const chatId = process.env.TELEGRAM_CHAT_ID;

  if (!token || !chatId) {
    throw new Error("TELEGRAM_BOT_TOKEN and TELEGRAM_CHAT_ID must be configured");
  }

  const baseUrl = `https://api.telegram.org/bot${token}`;

  const tweetIdMatch = originalTweetUrl.match(/\/status\/(\d+)/);
  const tweetId = tweetIdMatch?.[1];
  const webUrl = tweetId ? `https://x.com/i/web/status/${tweetId}` : null;

  const tweetLinks = webUrl
    ? `🔗 Original tweet: <a href="${originalTweetUrl}">App</a> · <a href="${webUrl}">Web</a>`
    : `🔗 Original tweet:\n${originalTweetUrl}`;

  const messageText = buildMessageText(authorUsername, replyText, tweetLinks);

  const inlineKeyboard = {
    inline_keyboard: [
      [{ text: "📋 Copy Reply", copy_text: { text: replyText } }],
      [
        { text: "✅ Posted", callback_data: `posted:${replyId}` },
        { text: "❌ Discard", callback_data: `discard:${replyId}` },
      ],
    ],
  };

  // Always send text as a message (not a caption) so Telegram renders
  // the <pre> block with its "Copy" button. When there's an image, follow
  // up with a separate sendPhoto.
  const textRes = await fetch(`${baseUrl}/sendMessage`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      chat_id: chatId,
      text: messageText,
      parse_mode: "HTML",
      reply_markup: inlineKeyboard,
    }),
  });
  if (!textRes.ok) {
    const body = await textRes.text();
    throw new Error(`Telegram sendMessage error: ${body}`);
  }

  if (imageUrl) {
    const photoRes = await fetch(`${baseUrl}/sendPhoto`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        chat_id: chatId,
        photo: imageUrl,
      }),
    });
    if (!photoRes.ok) {
      const body = await photoRes.text();
      throw new Error(`Telegram sendPhoto error: ${body}`);
    }
  }
}
