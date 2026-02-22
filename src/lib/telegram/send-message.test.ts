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
