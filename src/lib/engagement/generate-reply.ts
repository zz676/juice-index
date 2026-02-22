import { generateText } from "ai";
import { openai } from "@ai-sdk/openai";
import type { GenerateReplyResult } from "./types";

const REPLY_MODEL = "gpt-4.1-mini";
const REPLY_MAX_TOKENS = 80;

export async function generateReply(
  sourceTweetText: string,
  tonePrompt: string,
  options?: {
    quotedTweetText?: string | null;
    accountContext?: string | null;
    recentReplies?: string[];
    temperature?: number;
  },
): Promise<GenerateReplyResult> {
  const systemParts: string[] = [tonePrompt];

  if (options?.accountContext?.trim()) {
    systemParts.push(`About the account you're replying to:\n${options.accountContext.trim()}`);
  }

  if (options?.recentReplies && options.recentReplies.length > 0) {
    const recentList = options.recentReplies
      .slice(0, 5)
      .map((r, i) => `${i + 1}. "${r}"`)
      .join("\n");
    systemParts.push(
      `Your recent replies (DO NOT start with the same words or repeat similar patterns):\n${recentList}`,
    );
  }

  systemParts.push(`Rules:
- Reply in the same language as the tweet
- Reference what was said in the tweet
- No hashtags, no markdown formatting
- Keep it under 25 words. Short punchy sentences or fragments are fine.
- Write like a real person, not a corporate account or AI
- Vary sentence structure and openings
- Never start with generic affirmations ("Great point!", "Absolutely!", "确实", "Indeed")
- Avoid exclamation marks in every sentence
- No filler phrases ("It's worth noting", "This is interesting")
- Sound like a quick, natural thought — not a composed essay
- Ignore background details in images unless they are the primary subject; focus on the text and core message
- Emoji is not a mandatory signature — use sparingly. ~50% of replies should have NO emoji, ~30% should have only 1. Never make it a fixed ending ritual.
- When using emoji, place it naturally near the word it describes or between short sentences — not pinned to the end as a signature. Occasionally drop one in the middle of a thought to break up text.
- Vary openings: use "Actually,", "Classic.", "I wonder if", "Seems like", a direct statement, or a question — never the same opener twice in a row
- Only use "Wait," when the tweet contains a genuine logical disconnect or absurdly surprising fact. Alternatives for surprise: "Hold on,", "Since when did...", or a direct counter-question.
- Never reuse a casual opener (e.g. "Pretty wild", "Honestly", "Imagine") if it appeared in any of your recent replies above
- Occasionally use first-person for a personal touch ("I think", "Reminds me of") — not every time
- Ensure no two consecutive replies follow the same formatting pattern

Write only the reply text, nothing else.`);

  const systemMessage = systemParts.join("\n\n");

  const tweetSection = options?.quotedTweetText
    ? `${sourceTweetText}\n\n[Quoting: ${options.quotedTweetText}]`
    : sourceTweetText;

  const result = await generateText({
    model: openai(REPLY_MODEL),
    system: systemMessage,
    messages: [{ role: "user", content: tweetSection }],
    temperature: options?.temperature ?? 0.8,
    maxOutputTokens: REPLY_MAX_TOKENS,
  });

  const text = result.text.trim();
  const inputTokens = result.usage?.inputTokens ?? 0;
  const outputTokens = result.usage?.outputTokens ?? 0;

  return { text, inputTokens, outputTokens };
}
