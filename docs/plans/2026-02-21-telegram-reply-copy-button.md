# Telegram Reply Copy Button Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Wrap the reply text in a `<pre>` block in Telegram messages so users get a native one-tap copy button for just the reply content.

**Architecture:** Add an `escapeHtml` helper to `send-message.ts` and update `messageText` to wrap `replyText` in `<pre>...</pre>`. Telegram renders `<pre>` as a code block with a native copy icon; tapping it copies only that block's content. No other files change.

**Tech Stack:** TypeScript, Telegram Bot API (HTML parse mode), Vitest

---

### Task 1: Write tests for `escapeHtml` and the new message format

**Files:**
- Create: `src/lib/telegram/send-message.test.ts`

**Step 1: Create the test file**

```typescript
import { describe, it, expect } from "vitest";

// We'll test the escapeHtml helper by exporting it, and the full message
// format via a separate exported helper. See Task 2 for exports.

// Inline copies for test-first writing — replace with real imports after Task 2.
function escapeHtml(text: string): string {
  throw new Error("not implemented");
}

function buildMessageText(authorUsername: string, replyText: string, tweetLinks: string): string {
  throw new Error("not implemented");
}

describe("escapeHtml", () => {
  it("passes through plain text unchanged", () => {
    expect(escapeHtml("Hello world")).toBe("Hello world");
  });

  it("escapes ampersand", () => {
    expect(escapeHtml("A & B")).toBe("A &amp; B");
  });

  it("escapes less-than", () => {
    expect(escapeHtml("a < b")).toBe("a &lt; b");
  });

  it("escapes greater-than", () => {
    expect(escapeHtml("a > b")).toBe("a &gt; b");
  });

  it("escapes all three in one string", () => {
    expect(escapeHtml("<tag> & </tag>")).toBe("&lt;tag&gt; &amp; &lt;/tag&gt;");
  });
});

describe("buildMessageText", () => {
  it("wraps reply in pre tags", () => {
    const result = buildMessageText("alice", "Hello!", "🔗 link");
    expect(result).toContain("<pre>Hello!</pre>");
  });

  it("escapes HTML chars in reply text inside pre", () => {
    const result = buildMessageText("alice", "A < B & C > D", "🔗 link");
    expect(result).toContain("<pre>A &lt; B &amp; C &gt; D</pre>");
  });

  it("includes the author username in header", () => {
    const result = buildMessageText("alice", "Reply", "🔗 link");
    expect(result).toContain("💬 Reply for @alice");
  });

  it("includes tweet links in footer", () => {
    const result = buildMessageText("alice", "Reply", "🔗 my-link");
    expect(result).toContain("🔗 my-link");
  });
});
```

**Step 2: Run tests to confirm they fail**

```bash
npx vitest run src/lib/telegram/send-message.test.ts
```

Expected: All tests FAIL with "not implemented".

---

### Task 2: Implement `escapeHtml` and `buildMessageText`, wire into `sendToTelegram`

**Files:**
- Modify: `src/lib/telegram/send-message.ts`

**Step 1: Add exports at the top of the file (before the interface)**

```typescript
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
  return `💬 Reply for @${authorUsername}\n\n<pre>${escapeHtml(replyText)}</pre>\n\n${tweetLinks}`;
}
```

**Step 2: Update `messageText` inside `sendToTelegram` to use the helper**

Replace:
```typescript
const messageText = `💬 Reply for @${authorUsername}\n\n${replyText}\n\n${tweetLinks}`;
```

With:
```typescript
const messageText = buildMessageText(authorUsername, replyText, tweetLinks);
```

**Step 3: Update the test file to use real imports instead of inline stubs**

Replace the stub functions at the top of `send-message.test.ts` with:
```typescript
import { escapeHtml, buildMessageText } from "./send-message";
```

And delete the two stub `function` declarations.

**Step 4: Run tests to confirm they pass**

```bash
npx vitest run src/lib/telegram/send-message.test.ts
```

Expected: All 9 tests PASS.

**Step 5: Run full test suite to confirm no regressions**

```bash
npx vitest run
```

Expected: All tests pass.

**Step 6: Build check**

```bash
npx tsc --noEmit
```

Expected: No errors.

**Step 7: Commit**

```bash
git add src/lib/telegram/send-message.ts src/lib/telegram/send-message.test.ts
git commit -m "feat: wrap reply text in <pre> block for one-tap copy in Telegram"
```
