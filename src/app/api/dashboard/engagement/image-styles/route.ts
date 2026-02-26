import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { requireUser } from "@/lib/auth/require-user";

export const runtime = "nodejs";

const DEFAULT_IMAGE_STYLES = [
  {
    name: "Cyber / Futuristic",
    color: "purple",
    prompt: `CRITICAL REQUIREMENT: This image must contain ABSOLUTELY NO TEXT, WORDS, LETTERS, NUMBERS, OR TYPOGRAPHY OF ANY KIND. Pure visual only.

You are an expert visual designer for social media. Your task is to generate a compelling, cinematic image to accompany a reply on X (formerly Twitter).

This image must visually summarize the core essence, conflict, or emotion of the conversation *without* needing manual guidance on specific subjects.

**INSTRUCTIONS: Follow these steps to generate the image:**

**STEP 1: ANALYZE CORE THEMES (Mental Step)**
Before generating, analyze the combined meaning of the Source Tweet and My Reply.
1.  Identify the main **subject entities** (e.g., Hockey, Politics, AI, Stocks, a specific person).
2.  Identify the **core conflict or theme** (e.g., Destiny vs. Luck, Hype vs. Reality, Old vs. New).
3.  Determine the **emotional tone of MY REPLY** (e.g., Sarcastic, cynical, serious, triumphant, intellectual, dark humor).

**STEP 2: TRANSLATE THEMES INTO VISUAL METAPHORS (Generation Step)**
Generate an image based on your analysis above.
* **The Scene (Metaphor over Literal):** Do NOT just create a literal illustration of the text. Instead, create a dramatic visual metaphor that represents the core theme.
* **The Mood & Color:** The lighting, atmosphere, and color palette MUST match the emotional tone of the reply. (e.g., use cold, moody tones for cynical replies; bright, bold colors for triumphant ones).

**HARD CONSTRAINTS (No exceptions):**
* NO text, words, letters, numbers, signs, labels, captions, or typography anywhere in the image.
* NEVER generate a user interface screen, dashboard, "builder" tool, or software screenshot.
* NO social media icons, fake tweet bubbles, avatars, or reply buttons.`,
  },
  {
    name: "Editorial Cartoon",
    color: "yellow",
    prompt: `You are an editorial cartoon artist creating vivid, informational, direct images for social media replies.

Draw an editorial cartoon style image that is bold, expressive, and immediately understandable.

**STYLE GUIDELINES:**
* Use bold outlines, exaggerated features, and strong visual contrasts — classic editorial cartoon aesthetic.
* Characters, objects, and scenes should be clearly recognizable at a glance.
* You MAY include text: speech bubbles, labels, short captions, bold headlines, thought bubbles. Text should enhance clarity.
* Direct visual storytelling — the viewer should instantly grasp the point without needing context.
* High visual impact: bold colors, strong composition, clear focal point.

**CONTENT GUIDELINES:**
* Translate the core message of the reply into a direct, punchy visual narrative.
* Use characters, symbols, or scenarios that clearly represent the topic.
* Humor, irony, and satire are welcome when appropriate to the tone.

**HARD CONSTRAINTS:**
* NEVER generate a user interface screen, dashboard, or software screenshot.
* NO social media icons or fake tweet bubbles.`,
  },
  {
    name: "Close to Reality",
    color: "blue",
    prompt: `You are a documentary photographer creating photorealistic images for social media replies.

Generate a photorealistic, documentary-style image that literally depicts the subject of the conversation.

**STYLE GUIDELINES:**
* Photorealistic quality — looks like a real photograph or documentary footage.
* Natural lighting, authentic settings, realistic textures and details.
* NO text, words, letters, or typography in the image — pure visual storytelling.
* Literal depiction of the topic rather than abstract metaphors.

**CONTENT GUIDELINES:**
* Show the actual subject matter described in the conversation — people, places, objects, events.
* Capture the authentic atmosphere and context of the topic.
* Use composition and lighting to convey the emotional tone of the reply.

**HARD CONSTRAINTS:**
* NO text, words, letters, numbers, signs, labels, or typography anywhere in the image.
* NEVER generate a user interface screen, dashboard, or software screenshot.
* NO social media icons or fake tweet bubbles.`,
  },
];

export async function GET(_request: NextRequest) {
  const { user, error } = await requireUser();
  if (error) return error;

  let styles = await prisma.userImageStyle.findMany({
    where: { userId: user.id },
    orderBy: { createdAt: "asc" },
  });

  // Seed defaults if user has no styles yet
  if (styles.length === 0) {
    await prisma.userImageStyle.createMany({
      data: DEFAULT_IMAGE_STYLES.map((s) => ({ ...s, userId: user.id })),
    });
    styles = await prisma.userImageStyle.findMany({
      where: { userId: user.id },
      orderBy: { createdAt: "asc" },
    });
  }

  return NextResponse.json({ imageStyles: styles });
}

export async function POST(request: NextRequest) {
  const { user, error } = await requireUser();
  if (error) return error;

  let body: { name?: string; prompt?: string; color?: string };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "BAD_REQUEST", message: "Invalid JSON body" }, { status: 400 });
  }

  const { name, prompt, color } = body;
  if (!name?.trim() || !prompt?.trim()) {
    return NextResponse.json(
      { error: "BAD_REQUEST", message: "name and prompt are required" },
      { status: 400 },
    );
  }

  // Check name uniqueness per user
  const existing = await prisma.userImageStyle.findUnique({
    where: { userId_name: { userId: user.id, name: name.trim() } },
  });
  if (existing) {
    return NextResponse.json(
      { error: "CONFLICT", message: "An image style with that name already exists" },
      { status: 409 },
    );
  }

  const style = await prisma.userImageStyle.create({
    data: {
      userId: user.id,
      name: name.trim(),
      prompt: prompt.trim(),
      color: color?.trim() || "slate",
    },
  });

  return NextResponse.json({ imageStyle: style }, { status: 201 });
}
