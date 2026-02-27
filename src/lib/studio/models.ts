import { type ApiTier, hasTier } from "@/lib/api/tier";

export type ModelProvider = "openai" | "anthropic";

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
    id: "gpt-4o-mini",
    displayName: "GPT-4o Mini",
    provider: "openai",
    providerModelId: "gpt-4o-mini",
    minTier: "FREE",
    defaultMaxTokens: 280,
    description: "Fast & affordable",
  },
  {
    id: "o3-mini",
    displayName: "o3-mini",
    provider: "openai",
    providerModelId: "o3-mini",
    minTier: "STARTER",
    defaultMaxTokens: 400,
    description: "Best reasoning from OpenAI",
  },
  {
    id: "claude-3-5-sonnet",
    displayName: "Claude Sonnet 4.6",
    provider: "anthropic",
    providerModelId: "claude-sonnet-4-6",
    minTier: "STARTER",
    defaultMaxTokens: 400,
    description: "Balanced speed & quality",
  },
  {
    id: "claude-opus-4",
    displayName: "Claude Opus 4.6",
    provider: "anthropic",
    providerModelId: "claude-opus-4-6",
    minTier: "PRO",
    defaultMaxTokens: 500,
    description: "Most capable model",
  },
];

export const DEFAULT_MODEL_ID = "gpt-4o-mini";
export const DEFAULT_TEMPERATURE = 0.4;

export function getModelById(id: string): ModelDefinition | undefined {
  return MODEL_REGISTRY.find((m) => m.id === id);
}

export function canAccessModel(tier: ApiTier, modelId: string): boolean {
  const model = getModelById(modelId);
  if (!model) return false;
  return hasTier(tier, model.minTier);
}

/** Per-token pricing in USD (input / output per token). */
const MODEL_PRICING: Record<string, { input: number; output: number }> = {
  "gpt-4o-mini":       { input: 0.15  / 1_000_000, output: 0.60  / 1_000_000 },
  "o3-mini":           { input: 1.10  / 1_000_000, output: 4.40  / 1_000_000 },
  "claude-3-5-sonnet": { input: 3.00  / 1_000_000, output: 15.00 / 1_000_000 },
  "claude-opus-4":     { input: 15.00 / 1_000_000, output: 75.00 / 1_000_000 },
};

const DEFAULT_PRICING = { input: 1.00 / 1_000_000, output: 3.00 / 1_000_000 };

/** Estimate cost in USD from model ID and token counts. */
export function estimateCost(modelId: string, inputTokens: number, outputTokens: number): number {
  const p = MODEL_PRICING[modelId] ?? DEFAULT_PRICING;
  return inputTokens * p.input + outputTokens * p.output;
}
