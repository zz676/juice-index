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
  const messageText = `💬 Reply for @${authorUsername}\n\n${replyText}\n\n🔗 Original tweet:\n${originalTweetUrl}`;

  const inlineKeyboard = {
    inline_keyboard: [
      [
        { text: "✅ Posted", callback_data: `posted:${replyId}` },
        { text: "❌ Discard", callback_data: `discard:${replyId}` },
      ],
    ],
  };

  if (imageUrl) {
    if (messageText.length <= 1024) {
      // Send photo with caption + buttons
      const res = await fetch(`${baseUrl}/sendPhoto`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          chat_id: chatId,
          photo: imageUrl,
          caption: messageText,
          parse_mode: "HTML",
          reply_markup: inlineKeyboard,
        }),
      });
      if (!res.ok) {
        const body = await res.text();
        throw new Error(`Telegram sendPhoto error: ${body}`);
      }
    } else {
      // Caption too long: send text with buttons first, then photo separately
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
  } else {
    // Text only
    const res = await fetch(`${baseUrl}/sendMessage`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        chat_id: chatId,
        text: messageText,
        parse_mode: "HTML",
        reply_markup: inlineKeyboard,
      }),
    });
    if (!res.ok) {
      const body = await res.text();
      throw new Error(`Telegram sendMessage error: ${body}`);
    }
  }
}
