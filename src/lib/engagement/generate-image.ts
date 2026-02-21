import type { GenerateImageResult } from "./types";

const DALLE3_ENDPOINT = "https://api.openai.com/v1/images/generations";

function buildImagePrompt(sourceTweetText: string, replyText: string): string {
  return `Create a clean, modern social media image for a tweet reply.

Context:
- Original tweet: "${sourceTweetText.slice(0, 200)}"
- Reply: "${replyText.slice(0, 200)}"

Style requirements:
- Professional, visually compelling design that fits the topic of the tweet
- Bold typography with a key phrase or idea overlaid
- Dark or gradient background with accent colors that match the mood of the content
- Suitable for Twitter/X (square format)
- No text that says "Tweet", no social media icons, no borders`;
}

export async function generateImage(
  sourceTweetText: string,
  replyText: string,
): Promise<GenerateImageResult> {
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) {
    throw new Error("Missing OPENAI_API_KEY for DALL-E image generation");
  }

  const prompt = buildImagePrompt(sourceTweetText, replyText);

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
      size: "1024x1024",
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
