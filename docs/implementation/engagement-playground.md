# Engagement Center — Reply Playground

## Overview

The Reply Playground lets users preview generated replies before they go through the cron pipeline. Users configure tone weights, temperature, account context, and image frequency on an AccountCard, then test those exact settings against any tweet by pasting a URL or raw text.

## Entry Point

Each `AccountCard` has a **"Test in Playground"** button (above "Remove"). Clicking it:

1. Sets `activeTab` to `"tones"` in `EngagementPage`
2. Populates a `playgroundPreset` state with the account's `toneWeights`, `temperature`, `accountContext`, and `imageFrequency`
3. Passes the preset to `ToneSettings` as a `playgroundPreset` prop
4. The playground section auto-scrolls into view and pre-fills all fields

## Playground UI (`tone-settings.tsx`)

A new `PlaygroundSection` component is rendered below the Tone Library grid. It contains:

| Control | Description |
|---------|-------------|
| Tweet input | Textarea — accepts a tweet URL or raw text. URL detection happens on Generate. |
| Tone mode | Toggle between "Single Tone" (dropdown) and "Weight-Based" (sliders) |
| Creativity | Slider 0.1–1.0 |
| Model | Dropdown — choose the LLM for reply generation (see [Model Config](#model-config)) |
| Account Context | Textarea |
| Generate Image | Toggle — enables DALL-E image generation |
| Image Style | Dropdown (shown when image is enabled) — selects which `UserImageStyle` prompt to use |
| Generate button | Calls `POST /api/dashboard/engagement/playground` |
| Output card | Displays reply text, tone used, model used, optional image, cost breakdown, Regenerate button |

## API Route

**`POST /api/dashboard/engagement/playground`**

File: `src/app/api/dashboard/engagement/playground/route.ts`

### Request body

```ts
{
  tweetInput: string;            // URL or raw tweet text
  toneId?: string;               // Single tone mode
  toneWeights?: Record<string, number>;  // Weight-based mode
  temperature?: number;          // 0.1–1.0, default 0.8
  accountContext?: string;
  generateImage?: boolean;
  imageStyleId?: string;         // UserImageStyle.id — falls back to user's first seeded style
  model?: string;                // Reply model ID from REPLY_MODELS; defaults to grok-4-1-fast-reasoning
}
```

### Logic

1. `requireUser()` auth check
2. If `tweetInput` matches `x.com/*/status/*` or `twitter.com/*/status/*`, extract tweet ID and call `fetchTweetById()` using the user's XAccount credentials
3. Validate `model` against `REPLY_MODELS`; falls back to `DEFAULT_REPLY_MODEL` if unknown
4. Resolve tone: `toneId` → UserTone lookup; `toneWeights` → `pickToneByWeights()`; neither → Neutral fallback
5. Call `generateReply()` with tweet text, tone prompt, temperature, account context, and `model`
6. If `generateImage` is true: resolve `imageStyleId` → look up `UserImageStyle.prompt` → call `generateImage(tweetText, replyText, stylePrompt)`
7. Compute costs via `computeTotalReplyCost(inputTokens, outputTokens, imageGenerated, modelId)`
8. Return `{ replyText, toneUsed, modelUsed, inputTokens, outputTokens, costs, imageBase64?, imageStyleName? }`

**No database writes** — pure preview.

## Model Config

Defined in `src/lib/engagement/models.ts`. Exports:

- `REPLY_MODELS` — `as const` array of all available reply models with `id`, `provider`, `label`, `inputCostPer1M`, `outputCostPer1M`, and `tier`
- `DEFAULT_REPLY_MODEL` — `"grok-4-1-fast-reasoning"` (cheapest; X-native tone)
- `getModelById(id)` — lookup helper; returns `null` for unknown IDs
- `getModelInstance(id)` — returns the correct Vercel AI SDK provider instance (`openai`, `anthropic`, `google`, or `xai`)

| Model ID | Provider | Label | Input $/1M | Output $/1M | Tier |
|----------|----------|-------|------------|-------------|------|
| `grok-4-1-fast-reasoning` | xAI | Grok 4.1 Fast | $0.20 | $0.50 | Standard |
| `gpt-5-mini` | OpenAI | GPT-5 Mini | $0.25 | $2.00 | Standard |
| `gemini-3.1-pro-preview` | Google | Gemini 3.1 Pro | $2.00 | $12.00 | Standard |
| `claude-sonnet-4-6` | Anthropic | Claude Sonnet 4.6 | $3.00 | $15.00 | Standard |
| `claude-opus-4-6` | Anthropic | Claude Opus 4.6 | $15.00 | $75.00 | Enterprise |
| `gpt-5.2` | OpenAI | GPT-5.2 | $1.75 | $14.00 | Enterprise |

Required env vars: `OPENAI_API_KEY`, `ANTHROPIC_API_KEY`, `GOOGLE_GENERATIVE_AI_API_KEY`, `XAI_API_KEY`.

## Shared Utilities

### `src/lib/engagement/pick-tone.ts`

Extracted from the cron route. Exports:

- `FALLBACK_TONE_PROMPTS` — built-in tone prompts keyed by `ReplyTone` enum
- `pickUserTone(account, toneMap)` — weighted random pick using a `MonitoredAccount`'s `toneWeights`
- `pickToneByWeights(toneWeights, toneMap)` — standalone weight picker (used by playground)

### `src/lib/engagement/fetch-tweets.ts`

Added `fetchTweetById(accessToken, tweetId)` — fetches a single tweet via X API v2 `GET /2/tweets/:id`, returning `FetchedTweet | null`.

## Image Generation (`src/lib/engagement/generate-image.ts`)

Signature: `generateImage(sourceTweetText, replyText, stylePrompt?)`

When `generateImage` is `true`, the playground resolves the active `UserImageStyle` and calls `generateImage()`. The `buildImagePrompt()` helper appends conversation context to the style's prompt:

```
${stylePrompt}

Here is the context of the conversation:
[SOURCE TWEET]: "<first 200 chars>"
[MY REPLY]: "<first 200 chars>"
```

If no `stylePrompt` is provided, the function falls back to the built-in "Cyber / Futuristic" cinematic prompt (no text, visual metaphor). The three seeded default styles are:

| Style | Character |
|---|---|
| Cyber / Futuristic | Cinematic metaphor, absolutely no text, mood-matched lighting |
| Editorial Cartoon | Bold outlines, direct storytelling, speech bubbles and labels allowed |
| Close to Reality | Photorealistic/documentary, no text, literal scene depiction |

DALL-E 3 is called with `size: "1792x1024"` (wide/landscape, matching the 2:1 image preview aspect ratio in the UI).

## Files Changed

| File | Change |
|------|--------|
| `src/lib/engagement/pick-tone.ts` | **NEW** — shared tone selection utilities |
| `src/app/api/cron/engagement-poll/route.ts` | Imports `pickUserTone` from shared module |
| `src/lib/engagement/fetch-tweets.ts` | Added `fetchTweetById()` |
| `src/app/api/dashboard/engagement/playground/route.ts` | **NEW** — playground preview API |
| `src/app/dashboard/engagement/tone-settings.tsx` | Added `PlaygroundSection`, `PlaygroundPreset` export, `playgroundPreset` prop |
| `src/app/dashboard/engagement/account-card.tsx` | Added `onTestPlayground` prop + button |
| `src/app/dashboard/engagement/page.tsx` | `playgroundPreset` state, `handleTestPlayground` callback |
| `src/lib/engagement/models.ts` | **NEW** — model config, provider instance factory |
| `src/lib/engagement/generate-reply.ts` | Accepts `model` param; uses `getModelInstance()` |
| `src/lib/engagement/cost-utils.ts` | `computeTextGenerationCost` and `computeTotalReplyCost` accept `modelId`; pricing from config |
| `.env.example` | Added `GOOGLE_GENERATIVE_AI_API_KEY`, `XAI_API_KEY` |
