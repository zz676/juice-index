# AI Composer User Prompt Textbox Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Add a "Writing instructions" textarea in Step 4 so users can guide the AI post generation, and rename "Analyst Composer" to "AI Composer".

**Architecture:** Two files touched — the Studio page (UI state + layout) and the generate-post API route (prompt building). The user's instructions are appended to the auto-built LLM prompt so data context is always preserved.

**Tech Stack:** Next.js 14, React useState, TypeScript, Vercel AI SDK (`generateText`)

---

### Task 1: Rename "Analyst Composer" → "AI Composer" in page.tsx

**Files:**
- Modify: `src/app/dashboard/studio/page.tsx`

**Step 1: Find all occurrences**

There are two locations:
- Line ~1054: stepper step definition `{ id: "step-4", ..., title: "Analyst Composer", ... }`
- Line ~2058: section header `<h3>Analyst Composer</h3>`

**Step 2: Make the replacements**

Change both occurrences of `"Analyst Composer"` to `"AI Composer"`.

**Step 3: Build check**

```bash
cd /Users/zhizhou/Downloads/agent/juice-index/copy3/juice-index
npx tsc --noEmit
```
Expected: no errors.

**Step 4: Commit**

```bash
git add src/app/dashboard/studio/page.tsx
git commit -m "feat: rename Analyst Composer to AI Composer"
```

---

### Task 2: Add `userInstruction` state and textarea UI in Step 4

**Files:**
- Modify: `src/app/dashboard/studio/page.tsx`

**Step 1: Add state**

In `StudioPageInner`, after the `const [postDraft, setPostDraft] = useState("");` line (~line 198), add:

```tsx
const [userInstruction, setUserInstruction] = useState("");
```

**Step 2: Add textarea UI**

In the Step 4 `<div className="p-3">` block (~line 2195), insert the following **before** the existing `<textarea value={postDraft} ...>`:

```tsx
{/* User writing instructions */}
<div className="mb-3">
  <label className="block text-[11px] font-bold uppercase tracking-wide text-slate-custom-400 mb-1.5">
    Writing instructions <span className="font-normal normal-case">(optional)</span>
  </label>
  <textarea
    value={userInstruction}
    onChange={(e) => setUserInstruction(e.target.value)}
    placeholder='e.g. "Focus on BYD\'s lead, write in a bullish tone, keep it under 2 sentences"'
    rows={2}
    className="w-full bg-slate-custom-50 px-3 py-2 rounded-lg border border-slate-custom-100 text-[13px] text-slate-custom-700 placeholder:text-slate-custom-300 leading-relaxed resize-none focus:outline-none focus:ring-2 focus:ring-primary/50 focus:border-primary transition-all"
  />
</div>
```

**Step 3: Build check**

```bash
npx tsc --noEmit
```
Expected: no errors.

**Step 4: Commit**

```bash
git add src/app/dashboard/studio/page.tsx
git commit -m "feat: add userInstruction state and textarea to Step 4"
```

---

### Task 3: Pass `userInstructions` to the generate-post API call

**Files:**
- Modify: `src/app/dashboard/studio/page.tsx`

**Step 1: Update the `generateDraft` fetch body**

In `generateDraft` (~line 776), the `body: JSON.stringify({...})` block currently sends:
```ts
{
  question: prompt,
  sql: generatedSql,
  chartTitle: chartConfig.title,
  chartType: chartConfig.chartType,
  data: rawData.slice(0, 60),
  model: selectedModelId,
  temperature,
}
```

Add `userInstructions: userInstruction` to that object:
```ts
{
  question: prompt,
  sql: generatedSql,
  chartTitle: chartConfig.title,
  chartType: chartConfig.chartType,
  data: rawData.slice(0, 60),
  model: selectedModelId,
  temperature,
  userInstructions: userInstruction,
}
```

**Step 2: Add `userInstruction` to `generateDraft` dependency array**

The `useCallback` deps array at ~line 817 currently ends with:
```ts
}, [chartConfig.chartType, chartConfig.title, generatedSql, prompt, rawData, selectedModelId, temperature, showToast, fetchUsage]);
```

Add `userInstruction`:
```ts
}, [chartConfig.chartType, chartConfig.title, generatedSql, prompt, rawData, selectedModelId, temperature, userInstruction, showToast, fetchUsage]);
```

**Step 3: Build check**

```bash
npx tsc --noEmit
```
Expected: no errors.

**Step 4: Commit**

```bash
git add src/app/dashboard/studio/page.tsx
git commit -m "feat: send userInstructions to generate-post API"
```

---

### Task 4: Update `buildPrompt` in the API route to incorporate user instructions

**Files:**
- Modify: `src/app/api/dashboard/studio/generate-post/route.ts`

**Step 1: Update `buildPrompt` signature and body**

The current `buildPrompt` function (~line 143) accepts:
```ts
function buildPrompt(input: {
  question?: string;
  sql?: string;
  chartTitle?: string;
  chartType?: string;
  data?: DataRow[];
  charLimit?: number;
}): string {
```

Add `userInstructions?: string` to the input type, and append it to the returned string:

```ts
function buildPrompt(input: {
  question?: string;
  sql?: string;
  chartTitle?: string;
  chartType?: string;
  data?: DataRow[];
  charLimit?: number;
  userInstructions?: string;
}): string {
  const question = input.question?.trim() || "(not provided)";
  const sql = input.sql?.trim() || "(not provided)";
  const chartTitle = input.chartTitle?.trim() || "Data Results";
  const chartType = input.chartType?.trim() || "bar";
  const dataSummary = summarizeResults(Array.isArray(input.data) ? input.data : []);
  const charLimit = input.charLimit ?? 280;

  let base = `You are an EV market analyst writing a concise social post.

Question:
${question}

Chart:
- title: ${chartTitle}
- type: ${chartType}

SQL preview:
${sql}

Data summary:
${dataSummary}

Write one short post (2-4 sentences) with:
1. the key takeaway,
2. one concrete number or trend,
3. one implication for the EV market.

Your response MUST be under ${charLimit} characters. Keep tone factual and publish-ready. No hashtags. No markdown.`;

  if (input.userInstructions?.trim()) {
    base += `\n\nAdditional instructions from the user: ${input.userInstructions.trim()}`;
  }

  return base;
}
```

**Step 2: Parse `userInstructions` from the request body**

In the `POST` handler (~line 234), update the `buildPrompt` call to pass `userInstructions`:

```ts
const promptText =
  typeof body.prompt === "string" && body.prompt.trim().length > 0
    ? body.prompt.trim()
    : buildPrompt({
        question: typeof body.question === "string" ? body.question : undefined,
        sql: typeof body.sql === "string" ? body.sql : undefined,
        chartTitle: typeof body.chartTitle === "string" ? body.chartTitle : undefined,
        chartType: typeof body.chartType === "string" ? body.chartType : undefined,
        data: Array.isArray(body.data) ? (body.data as DataRow[]) : undefined,
        charLimit,
        userInstructions: typeof body.userInstructions === "string" ? body.userInstructions : undefined,
      });
```

Note: the variable was called `prompt` in the original — rename to `promptText` to avoid shadowing the outer `prompt` import from `"ai"` if needed, or keep as `prompt` if there's no conflict. Check the original variable name and keep consistent.

**Step 3: Build check**

```bash
npx tsc --noEmit
```
Expected: no errors.

**Step 4: Commit**

```bash
git add src/app/api/dashboard/studio/generate-post/route.ts
git commit -m "feat: buildPrompt accepts userInstructions, appended to LLM prompt"
```

---

### Task 5: Create PR

```bash
git push -u origin <branch>
gh pr create --title "feat: add user prompt textbox to AI Composer (Step 4)" \
  --body "..."
```

Full PR body should follow the project template (What / Why / Changes / Testing).

---

### Addendum: o3-mini added as default Query generation model

**Committed separately** on the same branch after the original plan.

**Files:**
- Modify: `src/lib/studio/models.ts`
- Modify: `src/app/dashboard/studio/page.tsx`

**Changes:**
- `MODEL_REGISTRY` — o3-mini entry added at the top (appears first in query model dropdown), `minTier: "FREE"` (accessible to all tiers)
- `DEFAULT_QUERY_MODEL_ID = "o3-mini"` exported
- `queryModelId` state in `StudioPageInner` defaults to `DEFAULT_QUERY_MODEL_ID`
- `MODEL_PRICING` type extended with optional `cachedInput` field; o3-mini entry includes all three rates

**o3-mini pricing (per 1M tokens):**

| Type         | Price  |
|--------------|--------|
| Input        | $1.10  |
| Cached input | $0.55  |
| Output       | $4.40  |
