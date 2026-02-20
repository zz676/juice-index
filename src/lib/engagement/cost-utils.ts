/**
 * Cost computation utilities for engagement auto-reply feature.
 *
 * Pricing reference:
 *   GPT-4o-mini: $0.15/1M input tokens, $0.60/1M output tokens
 *   DALL-E 3 standard 1024x1024: $0.040/image
 *   X API (pay-by-use): Content: Create $0.005/request, Media Metadata $0.005/request
 *   See docs/aiusage/x-api-costs.md
 */

const GPT4O_MINI_INPUT_COST_PER_TOKEN = 0.15 / 1_000_000;
const GPT4O_MINI_OUTPUT_COST_PER_TOKEN = 0.60 / 1_000_000;
const DALLE3_STANDARD_1024_COST = 0.04;
const X_CONTENT_CREATE_COST = 0.005; // POST /2/tweets
const X_MEDIA_METADATA_COST = 0.005; // POST /1.1/media/upload.json

export function computeTextGenerationCost(inputTokens: number, outputTokens: number): number {
  return (
    inputTokens * GPT4O_MINI_INPUT_COST_PER_TOKEN +
    outputTokens * GPT4O_MINI_OUTPUT_COST_PER_TOKEN
  );
}

export function computeImageGenerationCost(generated: boolean): number {
  return generated ? DALLE3_STANDARD_1024_COST : 0;
}

export function computeTotalReplyCost(
  inputTokens: number,
  outputTokens: number,
  imageGenerated: boolean,
): { textCost: number; imageCost: number; apiCost: number; totalCost: number } {
  const textCost = computeTextGenerationCost(inputTokens, outputTokens);
  const imageCost = computeImageGenerationCost(imageGenerated);
  const apiCost = X_CONTENT_CREATE_COST + (imageGenerated ? X_MEDIA_METADATA_COST : 0);
  return { textCost, imageCost, apiCost, totalCost: textCost + imageCost + apiCost };
}
