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
    id: "gpt-4o",
    displayName: "GPT-4o",
    provider: "openai",
    providerModelId: "gpt-4o",
    minTier: "PRO",
    defaultMaxTokens: 400,
    description: "Best reasoning from OpenAI",
  },
  {
    id: "claude-3-5-sonnet",
    displayName: "Claude 3.5 Sonnet",
    provider: "anthropic",
    providerModelId: "claude-sonnet-4-20250514",
    minTier: "PRO",
    defaultMaxTokens: 400,
    description: "Balanced speed & quality",
  },
  {
    id: "claude-opus-4",
    displayName: "Claude Opus 4",
    provider: "anthropic",
    providerModelId: "claude-opus-4-0-20250514",
    minTier: "ENTERPRISE",
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
