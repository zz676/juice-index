import { openai } from "@ai-sdk/openai";
import { anthropic } from "@ai-sdk/anthropic";
import { google } from "@ai-sdk/google";
import { xai } from "@ai-sdk/xai";
import type { LanguageModel } from "ai";
import { type ApiTier, hasTier } from "@/lib/api/tier";

export type ModelProvider = "openai" | "anthropic" | "google" | "xai";

export interface ModelDefinition {
  id: string;
  displayName: string;
  provider: ModelProvider;
  providerModelId: string;
  minTier: ApiTier;
  defaultMaxTokens: number;
  description: string;
}

export const MODEL_REGISTRY: ModelDefinition[] = [
  {
    id: "grok-4-1-fast-reasoning",
    displayName: "Grok 4.1 Fast",
    provider: "xai",
    providerModelId: "grok-4-1-fast-reasoning",
    minTier: "FREE",
    defaultMaxTokens: 280,
    description: "Fast & affordable",
  },
  {
    id: "gpt-5-mini",
    displayName: "GPT-5 Mini",
    provider: "openai",
    providerModelId: "gpt-5-mini",
    minTier: "STARTER",
    defaultMaxTokens: 400,
    description: "Versatile from OpenAI",
  },
  {
    id: "gemini-3.1-pro-preview",
    displayName: "Gemini 3.1 Pro",
    provider: "google",
    providerModelId: "gemini-3.1-pro-preview",
    minTier: "STARTER",
    defaultMaxTokens: 400,
    description: "Latest from Google",
  },
  {
    id: "claude-sonnet-4-6",
    displayName: "Claude Sonnet 4.6",
    provider: "anthropic",
    providerModelId: "claude-sonnet-4-6",
    minTier: "STARTER",
    defaultMaxTokens: 400,
    description: "Balanced speed & quality",
  },
  {
    id: "gpt-5.2",
    displayName: "GPT-5.2",
    provider: "openai",
    providerModelId: "gpt-5.2",
    minTier: "PRO",
    defaultMaxTokens: 500,
    description: "Advanced reasoning from OpenAI",
  },
  {
    id: "claude-opus-4-6",
    displayName: "Claude Opus 4.6",
    provider: "anthropic",
    providerModelId: "claude-opus-4-6",
    minTier: "PRO",
    defaultMaxTokens: 500,
    description: "Most capable model",
  },
];

export const DEFAULT_MODEL_ID = "grok-4-1-fast-reasoning";
export const DEFAULT_TEMPERATURE = 0.4;

export function getModelById(id: string): ModelDefinition | undefined {
  return MODEL_REGISTRY.find((m) => m.id === id);
}

export function canAccessModel(tier: ApiTier, modelId: string): boolean {
  const model = getModelById(modelId);
  if (!model) return false;
  return hasTier(tier, model.minTier);
}

export function getStudioModelInstance(modelDef: ModelDefinition): LanguageModel {
  switch (modelDef.provider) {
    case "openai":
      return openai(modelDef.providerModelId);
    case "anthropic":
      return anthropic(modelDef.providerModelId);
    case "google":
      return google(modelDef.providerModelId);
    case "xai":
      return xai(modelDef.providerModelId);
  }
}

/** Per-token pricing in USD (input / output per token). */
const MODEL_PRICING: Record<string, { input: number; output: number }> = {
  "grok-4-1-fast-reasoning": { input: 0.20  / 1_000_000, output: 0.50  / 1_000_000 },
  "gpt-5-mini":              { input: 0.25  / 1_000_000, output: 2.00  / 1_000_000 },
  "gemini-3.1-pro-preview":  { input: 2.00  / 1_000_000, output: 12.00 / 1_000_000 },
  "claude-sonnet-4-6":       { input: 3.00  / 1_000_000, output: 15.00 / 1_000_000 },
  "gpt-5.2":                 { input: 1.75  / 1_000_000, output: 14.00 / 1_000_000 },
  "claude-opus-4-6":         { input: 15.00 / 1_000_000, output: 75.00 / 1_000_000 },
};

const DEFAULT_PRICING = { input: 1.00 / 1_000_000, output: 3.00 / 1_000_000 };

/** Estimate cost in USD from model ID and token counts. */
export function estimateCost(modelId: string, inputTokens: number, outputTokens: number): number {
  const p = MODEL_PRICING[modelId] ?? DEFAULT_PRICING;
  return inputTokens * p.input + outputTokens * p.output;
}
