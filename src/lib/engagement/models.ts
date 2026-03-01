import { openai } from "@ai-sdk/openai";
import { anthropic } from "@ai-sdk/anthropic";
import { google } from "@ai-sdk/google";
import { xai } from "@ai-sdk/xai";
import type { LanguageModel } from "ai";

export const REPLY_MODELS = [
  { id: "grok-4-1-fast-reasoning", provider: "xai", label: "Grok 4.1 Fast", inputCostPer1M: 0.20, outputCostPer1M: 0.50, tier: "standard" },
  { id: "gpt-5-mini", provider: "openai", label: "GPT-5 Mini", inputCostPer1M: 0.25, outputCostPer1M: 2.00, tier: "standard" },
  { id: "gemini-3.1-pro-preview", provider: "google", label: "Gemini 3.1 Pro", inputCostPer1M: 2.00, outputCostPer1M: 12.00, tier: "standard" },
  { id: "claude-sonnet-4-6", provider: "anthropic", label: "Claude Sonnet 4.6", inputCostPer1M: 3.00, outputCostPer1M: 15.00, tier: "standard" },
  { id: "claude-opus-4-6", provider: "anthropic", label: "Claude Opus 4.6", inputCostPer1M: 15.00, outputCostPer1M: 75.00, tier: "enterprise" },
  { id: "gpt-5.2", provider: "openai", label: "GPT-5.2", inputCostPer1M: 1.75, outputCostPer1M: 14.00, tier: "enterprise" },
] as const;

export type ReplyModelId = (typeof REPLY_MODELS)[number]["id"];

export const DEFAULT_REPLY_MODEL: ReplyModelId = "grok-4-1-fast-reasoning";

export function getModelById(id: string) {
  return REPLY_MODELS.find((m) => m.id === id) ?? null;
}

export function getModelInstance(id: string): LanguageModel {
  const model = getModelById(id);
  if (!model) {
    throw new Error(`Unknown reply model: ${id}`);
  }
  switch (model.provider) {
    case "openai":
      return openai(model.id);
    case "anthropic":
      return anthropic(model.id);
    case "google":
      return google(model.id);
    case "xai":
      return xai(model.id);
  }
}
