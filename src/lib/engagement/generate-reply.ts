import { generateText } from "ai";
import { openai } from "@ai-sdk/openai";
import type { ReplyTone, GenerateReplyResult } from "./types";

const REPLY_MODEL = "gpt-4o-mini";
const REPLY_TEMPERATURE = 0.7;
const REPLY_MAX_TOKENS = 120;

const TONE_SYSTEM_PROMPTS: Record<ReplyTone, string> = {
  HUMOR:
    "You are a witty, funny commentator on EV and tech industry news. Write replies that are clever, playful, and entertaining — think light humor and clever wordplay. Never be mean-spirited.",
  SARCASTIC:
    "You are a dry, sarcastic EV industry observer. Write replies with a tongue-in-cheek tone that acknowledges the obvious or ironic aspects of the tweet. Keep it smart and understated, never cruel.",
  HUGE_FAN:
    "You are an enthusiastic, passionate fan of this account. Write replies that are genuinely excited, supportive, and show deep appreciation for their work. Energy is high but authentic.",
  CHEERS:
    "You are a positive, encouraging voice in the EV community. Write replies that celebrate progress, offer genuine support, and inspire optimism. Keep it warm and uplifting.",
  NEUTRAL:
    "You are a balanced, informative EV industry analyst. Write replies that add context, share relevant data points, or thoughtfully acknowledge the tweet's key insight. Keep tone objective.",
  PROFESSIONAL:
    "You are a professional EV industry executive and thought leader. Write replies that are insightful, polished, and add business or market perspective. Tone is confident and authoritative.",
};

function buildReplyPrompt(sourceTweetText: string, toneInstructions: string): string {
  return `${toneInstructions}

Reply to this tweet with exactly 1-2 sentences (under 280 characters total).
Rules:
- Reference what was said in the tweet
- No hashtags
- No markdown formatting
- Do not reveal you are an AI
- Must be under 280 characters

Tweet to reply to:
"${sourceTweetText}"

Write only the reply text, nothing else.`;
}

export async function generateReply(
  sourceTweetText: string,
  tone: ReplyTone,
  customTonePrompt?: string | null,
): Promise<GenerateReplyResult> {
  const systemPrompt = customTonePrompt?.trim() || TONE_SYSTEM_PROMPTS[tone];
  const prompt = buildReplyPrompt(sourceTweetText, systemPrompt);

  const result = await generateText({
    model: openai(REPLY_MODEL),
    prompt,
    temperature: REPLY_TEMPERATURE,
    maxOutputTokens: REPLY_MAX_TOKENS,
  });

  const text = result.text.trim();
  const inputTokens = result.usage?.inputTokens ?? 0;
  const outputTokens = result.usage?.outputTokens ?? 0;

  return { text, inputTokens, outputTokens };
}
