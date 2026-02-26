import type { GenerateImageResult } from "./types";

const DALLE3_ENDPOINT = "https://api.openai.com/v1/images/generations";

const FALLBACK_STYLE_PROMPT = `CRITICAL REQUIREMENT: This image must contain ABSOLUTELY NO TEXT, WORDS, LETTERS, NUMBERS, OR TYPOGRAPHY OF ANY KIND. Pure visual only.

You are an expert visual designer for social media. Your task is to generate a compelling, cinematic image to accompany a reply on X (formerly Twitter).

This image must visually summarize the core essence, conflict, or emotion of the conversation *without* needing manual guidance on specific subjects.

**INSTRUCTIONS: Follow these steps to generate the image:**

**STEP 1: ANALYZE CORE THEMES (Mental Step)**
Before generating, analyzes the combined meaning of the Source Tweet and My Reply.
1.  Identify the main **subject entities** (e.g., Hockey, Politics, AI, Stocks, a specific person).
2.  Identify the **core conflict or theme** (e.g., Destiny vs. Luck, Hype vs. Reality, Old vs. New).
3.  Determine the **emotional tone of MY REPLY** (e.g., Sarcastic, cynical, serious, triumphant, intellectual, dark humor).

**STEP 2: TRANSLATE THEMES INTO VISUAL METAPHORS (Generation Step)**
Generate an image based on your analysis above.
* **The Scene (Metaphor over Literal):** Do NOT just create a literal illustration of the text. Instead, create a dramatic visual metaphor that represents the core theme.
    * *Example: If the topic is "economic collapse", generate a stormy, crumbling Wall Street facade, not just a red arrow.*
    * *Example: If the topic is "fate in sports", generate a dramatic, spotlighted arena that feels historic, not just players skating.*
* **The Mood & Color:** The lighting, atmosphere, and color palette MUST match the emotional tone of [MY REPLY]. (e.g., use cold, moody tones for cynical replies; bright, bold colors for triumphant ones).

**HARD CONSTRAINTS (No exceptions):**
* NO text, words, letters, numbers, signs, labels, captions, or typography anywhere in the image.
* NEVER generate a user interface screen, dashboard, "builder" tool, or software screenshot.
* NO social media icons, fake tweet bubbles, avatars, or reply buttons.`;

function buildImagePrompt(sourceTweetText: string, replyText: string, stylePrompt?: string): string {
  const base = stylePrompt ?? FALLBACK_STYLE_PROMPT;
  return `${base}

Here is the context of the conversation:
[SOURCE TWEET]: "${sourceTweetText.slice(0, 200)}"
[MY REPLY]: "${replyText.slice(0, 200)}"`;
}

export async function generateImage(
  sourceTweetText: string,
  replyText: string,
  stylePrompt?: string,
): Promise<GenerateImageResult> {
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) {
    throw new Error("Missing OPENAI_API_KEY for DALL-E image generation");
  }

  const prompt = buildImagePrompt(sourceTweetText, replyText, stylePrompt);

  const res = await fetch(DALLE3_ENDPOINT, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model: "dall-e-3",
      prompt,
      n: 1,
      size: "1792x1024",
      quality: "standard",
      response_format: "b64_json",
    }),
  });

  if (!res.ok) {
    const body = await res.text();
    throw new Error(`DALL-E API error (${res.status}): ${body}`);
  }

  const json = (await res.json()) as { data: Array<{ b64_json: string }> };
  const b64 = json.data[0]?.b64_json;

  if (!b64) {
    throw new Error("DALL-E returned no image data");
  }

  return { generated: true, imageBase64: b64 };
}
