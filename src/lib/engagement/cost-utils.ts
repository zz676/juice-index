/**
 * Cost computation utilities for engagement auto-reply feature.
 *
 * Text generation pricing is looked up dynamically from the model config.
 * DALL-E 3 standard 1024x1024: $0.040/image
 * X API (pay-by-use): Content: Create $0.005/request, Media Metadata $0.005/request
 * See docs/aiusage/x-api-costs.md
 */

import { REPLY_MODELS, DEFAULT_REPLY_MODEL } from "./models";

const DALLE3_STANDARD_1024_COST = 0.04;
const X_CONTENT_CREATE_COST = 0.005; // POST /2/tweets
const X_MEDIA_METADATA_COST = 0.005; // POST /1.1/media/upload.json

export function computeTextGenerationCost(inputTokens: number, outputTokens: number, modelId?: string): number {
  const id = modelId ?? DEFAULT_REPLY_MODEL;
  const model = REPLY_MODELS.find((m) => m.id === id);
  const inputCostPerToken = (model?.inputCostPer1M ?? 0.15) / 1_000_000;
  const outputCostPerToken = (model?.outputCostPer1M ?? 0.60) / 1_000_000;
  return inputTokens * inputCostPerToken + outputTokens * outputCostPerToken;
}

export function computeImageGenerationCost(generated: boolean): number {
  return generated ? DALLE3_STANDARD_1024_COST : 0;
}

export function computeTotalReplyCost(
  inputTokens: number,
  outputTokens: number,
  imageGenerated: boolean,
  modelId?: string,
): { textCost: number; imageCost: number; apiCost: number; totalCost: number } {
  const textCost = computeTextGenerationCost(inputTokens, outputTokens, modelId);
  const imageCost = computeImageGenerationCost(imageGenerated);
  const apiCost = X_CONTENT_CREATE_COST + (imageGenerated ? X_MEDIA_METADATA_COST : 0);
  return { textCost, imageCost, apiCost, totalCost: textCost + imageCost + apiCost };
}
