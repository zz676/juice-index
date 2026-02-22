# Design: Telegram Reply Copy Button

**Date:** 2026-02-21

## Problem

When the Telegram bot sends a review message, the full message text is:

```
💬 Reply for @username

[reply text]

🔗 Original tweet: App · Web
```

When users long-press to copy the text, they get the entire message and must manually delete the header and footer to extract just the reply text.

## Solution

Wrap `replyText` in a `<pre>...</pre>` HTML tag in the Telegram message. Telegram renders `<pre>` blocks as code blocks with a native copy icon in the top-right corner. Tapping the icon copies only the block's content.

## Changes

**File:** `src/lib/telegram/send-message.ts`

1. Add `escapeHtml(text: string): string` helper that escapes `&`, `<`, `>` to HTML entities — necessary because the message uses `parse_mode: "HTML"`.

2. Update `messageText` construction:
   ```typescript
   const messageText = `💬 Reply for @${authorUsername}\n\n<pre>${escapeHtml(replyText)}</pre>\n\n${tweetLinks}`;
   ```

## Non-changes

- `sendPhoto` / `sendMessage` call structure unchanged.
- Long-caption (>1024 chars) split logic unchanged; `<pre>` tags add ~11 chars, negligible for typical reply lengths.
- Inline keyboard (`✅ Posted` / `❌ Discard`) unchanged.
- Webhook handler unchanged.
