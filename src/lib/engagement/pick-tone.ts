import type { UserTone, MonitoredAccount } from "@prisma/client";

export const FALLBACK_TONE_PROMPTS: Record<string, string> = {
  HUMOR:
    "You are a witty, funny commentator. Write replies that are clever, playful, and entertaining — think light humor and clever wordplay. Never be mean-spirited.",
  SARCASTIC:
    "You are a dry, sarcastic observer. Write replies with a tongue-in-cheek tone that acknowledges the obvious or ironic aspects of the tweet. Keep it smart and understated, never cruel. Vary your sarcastic approach each time — use rhetorical questions, deadpan understatement, ironic agreement, or matter-of-fact observations. Never use the formula 'Because nothing X like Y' or any variation of it. Good examples: 'Shocking that this needed a study.', 'Groundbreaking — truly never been done before.', 'Who could have predicted that?', 'Bold of them to assume otherwise.'",
  HUGE_FAN:
    "You are an enthusiastic, passionate fan of this account. Write replies that are genuinely excited, supportive, and show deep appreciation for their work. Energy is high but authentic.",
  CHEERS:
    "You are a positive, encouraging voice in this community. Write replies that celebrate progress, offer genuine support, and inspire optimism. Keep it warm and uplifting.",
  NEUTRAL:
    "You are a balanced, informative analyst. Write replies that add context, share relevant data points, or thoughtfully acknowledge the tweet's key insight. Keep tone objective.",
  PROFESSIONAL:
    "You are a professional executive and thought leader. Write replies that are insightful, polished, and add business or market perspective. Tone is confident and authoritative.",
};

export type PickedTone = { toneId: string | null; toneName: string; prompt: string };

export function pickUserTone(
  account: Pick<MonitoredAccount, "tone" | "toneWeights">,
  toneMap: Map<string, UserTone>,
): PickedTone {
  const weights = account.toneWeights as Record<string, number> | null;

  if (!weights) {
    const fallbackPrompt =
      FALLBACK_TONE_PROMPTS[account.tone] ?? FALLBACK_TONE_PROMPTS["NEUTRAL"];
    return { toneId: null, toneName: account.tone, prompt: fallbackPrompt };
  }

  const entries = Object.entries(weights).filter(
    ([id, w]) => w > 0 && toneMap.has(id),
  );

  if (entries.length === 0) {
    const fallbackPrompt =
      FALLBACK_TONE_PROMPTS[account.tone] ?? FALLBACK_TONE_PROMPTS["NEUTRAL"];
    return { toneId: null, toneName: account.tone, prompt: fallbackPrompt };
  }

  const total = entries.reduce((sum, [, w]) => sum + w, 0);
  let rand = Math.random() * total;

  for (const [id, weight] of entries) {
    rand -= weight;
    if (rand <= 0) {
      const tone = toneMap.get(id)!;
      return { toneId: id, toneName: tone.name, prompt: tone.prompt };
    }
  }

  // Fallback to first entry
  const tone = toneMap.get(entries[0][0])!;
  return { toneId: entries[0][0], toneName: tone.name, prompt: tone.prompt };
}

/**
 * Pick a tone using explicit weight map (for playground: no MonitoredAccount required).
 * Returns null if no valid tones found.
 */
export function pickToneByWeights(
  toneWeights: Record<string, number>,
  toneMap: Map<string, UserTone>,
): PickedTone | null {
  const entries = Object.entries(toneWeights).filter(
    ([id, w]) => w > 0 && toneMap.has(id),
  );

  if (entries.length === 0) return null;

  const total = entries.reduce((sum, [, w]) => sum + w, 0);
  let rand = Math.random() * total;

  for (const [id, weight] of entries) {
    rand -= weight;
    if (rand <= 0) {
      const tone = toneMap.get(id)!;
      return { toneId: id, toneName: tone.name, prompt: tone.prompt };
    }
  }

  const tone = toneMap.get(entries[0][0])!;
  return { toneId: entries[0][0], toneName: tone.name, prompt: tone.prompt };
}
