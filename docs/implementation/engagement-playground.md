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
| Account Context | Textarea |
| Generate Image | Toggle — enables DALL-E image generation |
| Image Style | Dropdown (shown when image is enabled) — selects which `UserImageStyle` prompt to use |
| Generate button | Calls `POST /api/dashboard/engagement/playground` |
| Output card | Displays reply text, tone used, optional image, cost breakdown, Regenerate button |

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
}
```

### Logic

1. `requireUser()` auth check
2. If `tweetInput` matches `x.com/*/status/*` or `twitter.com/*/status/*`, extract tweet ID and call `fetchTweetById()` using the user's XAccount credentials
3. Resolve tone: `toneId` → UserTone lookup; `toneWeights` → `pickToneByWeights()`; neither → Neutral fallback
4. Call `generateReply()` with tweet text, tone prompt, temperature, account context
5. If `generateImage` is true: resolve `imageStyleId` → look up `UserImageStyle.prompt` → call `generateImage(tweetText, replyText, stylePrompt)`
6. Compute costs via `computeTotalReplyCost()`
7. Return `{ replyText, toneUsed, inputTokens, outputTokens, costs, imageBase64?, imageStyleName? }`

**No database writes** — pure preview.

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
