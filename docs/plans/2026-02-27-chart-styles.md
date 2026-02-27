# Chart Styles Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Allow users to save named chart style presets (full `ChartConfig`) from the Studio customizer, apply them in one click, and manage (rename/delete) them from the Settings page.

**Architecture:** Follow the established `UserTone`/`UserImageStyle` pattern — a new `UserChartStyle` Prisma model, two API route files (collection + item), a new "Styles" tab in `ChartCustomizer`, and a new section in the Settings page.

**Tech Stack:** Next.js 14 App Router, Prisma (PostgreSQL), Vitest, Tailwind CSS, Material Icons Round.

---

### Task 1: Add `UserChartStyle` to Prisma schema

**Files:**
- Modify: `prisma/schema.prisma`

**Step 1: Add the model and User relation**

At the end of the `User` model's relation fields (after `UserImageStyle UserImageStyle[]`), add:

```prisma
  userChartStyles UserChartStyle[]
```

Then append the new model after `UserImageStyle` (around line 1990):

```prisma
/// Per-user saved chart style presets for the Studio chart customizer.
model UserChartStyle {
  /// Primary identifier for the record.
  id        String   @id @default(cuid())
  /// Identifier of the related user.
  userId    String
  /// Display name for the style (e.g. "Dark Mode", "Corporate Blue").
  name      String
  /// Full ChartConfig JSON for this style.
  config    Json
  /// Timestamp when the record was created.
  createdAt DateTime @default(now())
  /// Timestamp when the record was last updated.
  updatedAt DateTime @updatedAt
  User      User     @relation(fields: [userId], references: [id], onDelete: Cascade)

  @@unique([userId, name])
  @@index([userId])
  @@map("juice_user_chart_styles")
}
```

**Step 2: Generate the Prisma client**

```bash
npx prisma generate
```

Expected: "Generated Prisma Client" with no errors.

**Step 3: Create and apply migration**

```bash
npx prisma migrate dev --name add_user_chart_styles
```

Expected: New migration file created, migration applied, Prisma client regenerated.

**Step 4: Verify TypeScript compiles**

```bash
npx tsc --noEmit
```

Expected: No errors.

**Step 5: Commit**

```bash
git add prisma/schema.prisma prisma/migrations/
git commit -m "feat: add UserChartStyle model to schema"
```

---

### Task 2: API collection route — GET + POST

**Files:**
- Create: `src/app/api/dashboard/studio/chart-styles/route.ts`
- Create: `src/app/api/dashboard/studio/chart-styles/__tests__/route.test.ts`

**Step 1: Write the failing tests**

Create `src/app/api/dashboard/studio/chart-styles/__tests__/route.test.ts`:

```typescript
import { describe, it, expect, vi, beforeEach } from "vitest";

vi.mock("@/lib/prisma", () => ({
  default: {
    userChartStyle: {
      findMany: vi.fn(),
      findUnique: vi.fn(),
      create: vi.fn(),
    },
  },
}));

vi.mock("@/lib/auth/require-user", () => ({
  requireUser: vi.fn(),
}));

import { GET, POST } from "../route";
import prisma from "@/lib/prisma";
import { requireUser } from "@/lib/auth/require-user";

const mockPrisma = prisma as unknown as {
  userChartStyle: {
    findMany: ReturnType<typeof vi.fn>;
    findUnique: ReturnType<typeof vi.fn>;
    create: ReturnType<typeof vi.fn>;
  };
};

const MOCK_CONFIG = { chartType: "bar", backgroundColor: "#ffffff" };

beforeEach(() => {
  vi.clearAllMocks();
  (requireUser as ReturnType<typeof vi.fn>).mockResolvedValue({
    user: { id: "user-1" },
    error: null,
  });
});

describe("GET /api/dashboard/studio/chart-styles", () => {
  it("returns styles for the current user", async () => {
    const styles = [{ id: "s1", name: "Dark", config: MOCK_CONFIG }];
    mockPrisma.userChartStyle.findMany.mockResolvedValue(styles);

    const res = await GET();
    const body = await res.json();

    expect(res.status).toBe(200);
    expect(body.styles).toEqual(styles);
    expect(mockPrisma.userChartStyle.findMany).toHaveBeenCalledWith({
      where: { userId: "user-1" },
      orderBy: { createdAt: "asc" },
    });
  });

  it("returns 401 when not authenticated", async () => {
    (requireUser as ReturnType<typeof vi.fn>).mockResolvedValue({
      user: null,
      error: new Response(null, { status: 401 }),
    });

    const res = await GET();
    expect(res.status).toBe(401);
  });
});

describe("POST /api/dashboard/studio/chart-styles", () => {
  it("creates a new style", async () => {
    mockPrisma.userChartStyle.findUnique.mockResolvedValue(null);
    const created = { id: "s2", name: "My Style", config: MOCK_CONFIG };
    mockPrisma.userChartStyle.create.mockResolvedValue(created);

    const req = new Request("http://localhost", {
      method: "POST",
      body: JSON.stringify({ name: "My Style", config: MOCK_CONFIG }),
    });

    const res = await POST(req as any);
    const body = await res.json();

    expect(res.status).toBe(201);
    expect(body.style).toEqual(created);
  });

  it("returns 409 when name already exists", async () => {
    mockPrisma.userChartStyle.findUnique.mockResolvedValue({ id: "existing" });

    const req = new Request("http://localhost", {
      method: "POST",
      body: JSON.stringify({ name: "Dark", config: MOCK_CONFIG }),
    });

    const res = await POST(req as any);
    expect(res.status).toBe(409);
  });

  it("returns 400 when name is missing", async () => {
    const req = new Request("http://localhost", {
      method: "POST",
      body: JSON.stringify({ config: MOCK_CONFIG }),
    });

    const res = await POST(req as any);
    expect(res.status).toBe(400);
  });

  it("returns 400 when config is missing", async () => {
    const req = new Request("http://localhost", {
      method: "POST",
      body: JSON.stringify({ name: "Dark" }),
    });

    const res = await POST(req as any);
    expect(res.status).toBe(400);
  });
});
```

**Step 2: Run tests to confirm they fail**

```bash
npx vitest run src/app/api/dashboard/studio/chart-styles/__tests__/route.test.ts
```

Expected: FAIL — "Cannot find module '../route'"

**Step 3: Implement the route**

Create `src/app/api/dashboard/studio/chart-styles/route.ts`:

```typescript
import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { requireUser } from "@/lib/auth/require-user";

export const runtime = "nodejs";

export async function GET() {
  const { user, error } = await requireUser();
  if (error) return error;

  const styles = await prisma.userChartStyle.findMany({
    where: { userId: user.id },
    orderBy: { createdAt: "asc" },
  });

  return NextResponse.json({ styles });
}

export async function POST(request: NextRequest) {
  const { user, error } = await requireUser();
  if (error) return error;

  let body: { name?: string; config?: unknown };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "BAD_REQUEST", message: "Invalid JSON body" }, { status: 400 });
  }

  const { name, config } = body;
  if (!name?.trim()) {
    return NextResponse.json({ error: "BAD_REQUEST", message: "name is required" }, { status: 400 });
  }
  if (!config || typeof config !== "object") {
    return NextResponse.json({ error: "BAD_REQUEST", message: "config is required" }, { status: 400 });
  }

  const existing = await prisma.userChartStyle.findUnique({
    where: { userId_name: { userId: user.id, name: name.trim() } },
  });
  if (existing) {
    return NextResponse.json({ error: "CONFLICT", message: "A style with that name already exists" }, { status: 409 });
  }

  const style = await prisma.userChartStyle.create({
    data: { userId: user.id, name: name.trim(), config },
  });

  return NextResponse.json({ style }, { status: 201 });
}
```

**Step 4: Run tests — expect PASS**

```bash
npx vitest run src/app/api/dashboard/studio/chart-styles/__tests__/route.test.ts
```

Expected: All 6 tests PASS.

**Step 5: Commit**

```bash
git add src/app/api/dashboard/studio/chart-styles/
git commit -m "feat: add chart-styles collection API (GET + POST)"
```

---

### Task 3: API item route — PUT + DELETE

**Files:**
- Create: `src/app/api/dashboard/studio/chart-styles/[id]/route.ts`
- Create: `src/app/api/dashboard/studio/chart-styles/[id]/__tests__/route.test.ts`

**Step 1: Write the failing tests**

Create `src/app/api/dashboard/studio/chart-styles/[id]/__tests__/route.test.ts`:

```typescript
import { describe, it, expect, vi, beforeEach } from "vitest";

vi.mock("@/lib/prisma", () => ({
  default: {
    userChartStyle: {
      findFirst: vi.fn(),
      findUnique: vi.fn(),
      update: vi.fn(),
      delete: vi.fn(),
    },
  },
}));

vi.mock("@/lib/auth/require-user", () => ({
  requireUser: vi.fn(),
}));

import { PUT, DELETE } from "../route";
import prisma from "@/lib/prisma";
import { requireUser } from "@/lib/auth/require-user";

const mockPrisma = prisma as unknown as {
  userChartStyle: {
    findFirst: ReturnType<typeof vi.fn>;
    findUnique: ReturnType<typeof vi.fn>;
    update: ReturnType<typeof vi.fn>;
    delete: ReturnType<typeof vi.fn>;
  };
};

const MOCK_STYLE = { id: "s1", userId: "user-1", name: "Dark", config: {} };
const MOCK_CONFIG = { chartType: "bar", backgroundColor: "#000000" };

beforeEach(() => {
  vi.clearAllMocks();
  (requireUser as ReturnType<typeof vi.fn>).mockResolvedValue({
    user: { id: "user-1" },
    error: null,
  });
});

const makeParams = (id: string) => ({ params: Promise.resolve({ id }) });

describe("PUT /api/dashboard/studio/chart-styles/[id]", () => {
  it("updates name and config", async () => {
    mockPrisma.userChartStyle.findFirst.mockResolvedValue(MOCK_STYLE);
    mockPrisma.userChartStyle.findUnique.mockResolvedValue(null);
    const updated = { ...MOCK_STYLE, name: "New Name", config: MOCK_CONFIG };
    mockPrisma.userChartStyle.update.mockResolvedValue(updated);

    const req = new Request("http://localhost", {
      method: "PUT",
      body: JSON.stringify({ name: "New Name", config: MOCK_CONFIG }),
    });

    const res = await PUT(req as any, makeParams("s1"));
    const body = await res.json();

    expect(res.status).toBe(200);
    expect(body.style).toEqual(updated);
  });

  it("returns 404 if style not found or not owned", async () => {
    mockPrisma.userChartStyle.findFirst.mockResolvedValue(null);

    const req = new Request("http://localhost", {
      method: "PUT",
      body: JSON.stringify({ name: "New Name" }),
    });

    const res = await PUT(req as any, makeParams("bad-id"));
    expect(res.status).toBe(404);
  });

  it("returns 409 on name conflict", async () => {
    mockPrisma.userChartStyle.findFirst.mockResolvedValue(MOCK_STYLE);
    mockPrisma.userChartStyle.findUnique.mockResolvedValue({ id: "other" });

    const req = new Request("http://localhost", {
      method: "PUT",
      body: JSON.stringify({ name: "Taken Name" }),
    });

    const res = await PUT(req as any, makeParams("s1"));
    expect(res.status).toBe(409);
  });

  it("returns 400 when nothing to update", async () => {
    mockPrisma.userChartStyle.findFirst.mockResolvedValue(MOCK_STYLE);

    const req = new Request("http://localhost", {
      method: "PUT",
      body: JSON.stringify({}),
    });

    const res = await PUT(req as any, makeParams("s1"));
    expect(res.status).toBe(400);
  });
});

describe("DELETE /api/dashboard/studio/chart-styles/[id]", () => {
  it("deletes the style and returns 204", async () => {
    mockPrisma.userChartStyle.findFirst.mockResolvedValue(MOCK_STYLE);
    mockPrisma.userChartStyle.delete.mockResolvedValue(MOCK_STYLE);

    const req = new Request("http://localhost", { method: "DELETE" });
    const res = await DELETE(req as any, makeParams("s1"));

    expect(res.status).toBe(204);
  });

  it("returns 404 if not found", async () => {
    mockPrisma.userChartStyle.findFirst.mockResolvedValue(null);

    const req = new Request("http://localhost", { method: "DELETE" });
    const res = await DELETE(req as any, makeParams("bad-id"));

    expect(res.status).toBe(404);
  });
});
```

**Step 2: Run tests — confirm fail**

```bash
npx vitest run "src/app/api/dashboard/studio/chart-styles/\[id\]/__tests__/route.test.ts"
```

Expected: FAIL — "Cannot find module '../route'"

**Step 3: Implement the route**

Create `src/app/api/dashboard/studio/chart-styles/[id]/route.ts`:

```typescript
import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { requireUser } from "@/lib/auth/require-user";

export const runtime = "nodejs";

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const { user, error } = await requireUser();
  if (error) return error;

  const { id } = await params;

  const style = await prisma.userChartStyle.findFirst({
    where: { id, userId: user.id },
  });
  if (!style) {
    return NextResponse.json({ error: "NOT_FOUND", message: "Style not found" }, { status: 404 });
  }

  let body: { name?: string; config?: unknown };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "BAD_REQUEST", message: "Invalid JSON body" }, { status: 400 });
  }

  const data: Record<string, unknown> = {};
  if (body.name !== undefined) data.name = (body.name as string).trim();
  if (body.config !== undefined) data.config = body.config;

  if (Object.keys(data).length === 0) {
    return NextResponse.json({ error: "BAD_REQUEST", message: "No fields to update" }, { status: 400 });
  }

  if (data.name && data.name !== style.name) {
    const conflict = await prisma.userChartStyle.findUnique({
      where: { userId_name: { userId: user.id, name: data.name as string } },
    });
    if (conflict) {
      return NextResponse.json({ error: "CONFLICT", message: "A style with that name already exists" }, { status: 409 });
    }
  }

  const updated = await prisma.userChartStyle.update({ where: { id }, data });
  return NextResponse.json({ style: updated });
}

export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const { user, error } = await requireUser();
  if (error) return error;

  const { id } = await params;

  const style = await prisma.userChartStyle.findFirst({
    where: { id, userId: user.id },
  });
  if (!style) {
    return NextResponse.json({ error: "NOT_FOUND", message: "Style not found" }, { status: 404 });
  }

  await prisma.userChartStyle.delete({ where: { id } });
  return new NextResponse(null, { status: 204 });
}
```

**Step 4: Run tests — expect PASS**

```bash
npx vitest run "src/app/api/dashboard/studio/chart-styles/\[id\]/__tests__/route.test.ts"
```

Expected: All 6 tests PASS.

**Step 5: Verify TypeScript**

```bash
npx tsc --noEmit
```

Expected: No errors.

**Step 6: Commit**

```bash
git add src/app/api/dashboard/studio/chart-styles/
git commit -m "feat: add chart-styles item API (PUT + DELETE)"
```

---

### Task 4: ChartCustomizer — Styles tab

**Files:**
- Modify: `src/components/explorer/ChartCustomizer.tsx`

**Context:** The `ChartCustomizer` component (at `src/components/explorer/ChartCustomizer.tsx`) already has a tab bar with sections: Axes, Type, Colors, Text, Source. We add a **Styles** tab at the end. The component receives `config` and `onChange` as props.

**Step 1: Add a `SavedStyle` type and the Styles tab state**

In `ChartCustomizer.tsx`, after the existing imports add a type definition and expand the sections array:

```typescript
// Add after the existing imports at the top:
import { useState, useEffect, useCallback } from "react";

// Add a type for the saved styles returned by the API
type SavedStyle = { id: string; name: string; config: ChartConfig };
```

**Step 2: Add the Styles tab entry**

In the `sections` array inside `ChartCustomizer`, add after the `source` entry:

```typescript
{ id: "styles", icon: "bookmarks", label: "Styles" },
```

No conditional filtering needed — the Styles tab is always visible.

**Step 3: Add state and fetch logic inside `ChartCustomizer`**

Add these state variables and a fetch function inside the `ChartCustomizer` function body, before the `return`:

```typescript
const [savedStyles, setSavedStyles] = useState<SavedStyle[]>([]);
const [selectedStyleId, setSelectedStyleId] = useState<string>("");
const [newStyleName, setNewStyleName] = useState("");
const [isSaving, setIsSaving] = useState(false);
const [isDeleting, setIsDeleting] = useState(false);
const [deleteConfirm, setDeleteConfirm] = useState(false);
const [stylesError, setStylesError] = useState<string | null>(null);

const fetchStyles = useCallback(async () => {
  try {
    const res = await fetch("/api/dashboard/studio/chart-styles");
    if (!res.ok) return;
    const data = await res.json();
    setSavedStyles(data.styles ?? []);
  } catch {
    // silent — not critical
  }
}, []);

useEffect(() => {
  if (isOpen) fetchStyles();
}, [isOpen, fetchStyles]);
```

**Step 4: Add save and delete handlers**

Add these handlers inside the `ChartCustomizer` function body:

```typescript
const handleSaveStyle = async () => {
  if (!newStyleName.trim()) return;
  setIsSaving(true);
  setStylesError(null);
  try {
    const res = await fetch("/api/dashboard/studio/chart-styles", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name: newStyleName.trim(), config }),
    });
    if (res.status === 409) {
      setStylesError("A style with that name already exists.");
      return;
    }
    if (!res.ok) {
      setStylesError("Failed to save style.");
      return;
    }
    setNewStyleName("");
    await fetchStyles();
  } catch {
    setStylesError("Failed to save style.");
  } finally {
    setIsSaving(false);
  }
};

const handleDeleteStyle = async () => {
  if (!selectedStyleId) return;
  if (!deleteConfirm) {
    setDeleteConfirm(true);
    return;
  }
  setIsDeleting(true);
  try {
    await fetch(`/api/dashboard/studio/chart-styles/${selectedStyleId}`, {
      method: "DELETE",
    });
    setSelectedStyleId("");
    setDeleteConfirm(false);
    await fetchStyles();
  } catch {
    // ignore
  } finally {
    setIsDeleting(false);
  }
};

const handleApplyStyle = () => {
  const found = savedStyles.find((s) => s.id === selectedStyleId);
  if (found) onChange(found.config);
};
```

**Step 5: Add the Styles tab panel JSX**

In the `{/* Content */}` section of the component, after the last `{activeSection === "source" && ...}` block, add:

```tsx
{activeSection === "styles" && (
  <div className="space-y-5">
    {/* Saved styles picker */}
    <div>
      <label className="text-xs font-semibold text-slate-500 uppercase tracking-wide mb-2 block">
        Saved Styles
      </label>
      {savedStyles.length === 0 ? (
        <p className="text-xs text-slate-400 italic">No saved styles yet. Save your current settings below.</p>
      ) : (
        <>
          <select
            value={selectedStyleId}
            onChange={(e) => { setSelectedStyleId(e.target.value); setDeleteConfirm(false); }}
            className="w-full rounded border border-slate-200 bg-white px-2 py-1.5 text-xs text-slate-700 focus:outline-none focus:ring-1 focus:ring-primary mb-2"
          >
            <option value="">— Select a style —</option>
            {savedStyles.map((s) => (
              <option key={s.id} value={s.id}>{s.name}</option>
            ))}
          </select>
          <div className="flex gap-2">
            <button
              onClick={handleApplyStyle}
              disabled={!selectedStyleId}
              className="flex-1 py-1.5 text-xs font-bold rounded border border-primary text-primary hover:bg-primary/10 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
            >
              Apply
            </button>
            <button
              onClick={handleDeleteStyle}
              disabled={!selectedStyleId || isDeleting}
              className={`flex-1 py-1.5 text-xs font-bold rounded border transition-colors disabled:opacity-40 disabled:cursor-not-allowed ${deleteConfirm ? "border-red-500 bg-red-50 text-red-600" : "border-slate-200 text-slate-500 hover:border-red-300 hover:text-red-500"}`}
            >
              {deleteConfirm ? "Confirm Delete" : "Delete"}
            </button>
          </div>
        </>
      )}
    </div>

    {/* Divider */}
    <div className="border-t border-slate-100" />

    {/* Save current as */}
    <div>
      <label className="text-xs font-semibold text-slate-500 uppercase tracking-wide mb-2 block">
        Save Current As
      </label>
      <input
        type="text"
        value={newStyleName}
        onChange={(e) => { setNewStyleName(e.target.value); setStylesError(null); }}
        placeholder="Style name..."
        className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm text-slate-800 focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary mb-2"
        onKeyDown={(e) => { if (e.key === "Enter") handleSaveStyle(); }}
      />
      {stylesError && <p className="text-xs text-red-500 mb-2">{stylesError}</p>}
      <button
        onClick={handleSaveStyle}
        disabled={!newStyleName.trim() || isSaving}
        className="w-full py-2 text-xs font-bold rounded bg-primary text-white hover:bg-primary/90 disabled:opacity-40 disabled:cursor-not-allowed transition-colors flex items-center justify-center gap-1"
      >
        <span className="material-icons-round text-sm">save</span>
        {isSaving ? "Saving…" : "Save Style"}
      </button>
    </div>
  </div>
)}
```

**Step 6: Verify TypeScript and build**

```bash
npx tsc --noEmit
npm run build 2>&1 | tail -5
```

Expected: No type errors, build succeeds.

**Step 7: Commit**

```bash
git add src/components/explorer/ChartCustomizer.tsx
git commit -m "feat: add Styles tab to ChartCustomizer with save/apply/delete"
```

---

### Task 5: Settings page — Chart Styles section

**Files:**
- Create: `src/app/dashboard/settings/chart-styles-section.tsx`
- Modify: `src/app/dashboard/settings/page.tsx`

**Step 1: Create the client component**

Create `src/app/dashboard/settings/chart-styles-section.tsx`:

```tsx
"use client";

import { useState, useEffect } from "react";

type ChartStyle = { id: string; name: string };

export default function ChartStylesSection() {
  const [styles, setStyles] = useState<ChartStyle[]>([]);
  const [loading, setLoading] = useState(true);
  const [renamingId, setRenamingId] = useState<string | null>(null);
  const [renameValue, setRenameValue] = useState("");
  const [renameError, setRenameError] = useState<string | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  const fetchStyles = async () => {
    try {
      const res = await fetch("/api/dashboard/studio/chart-styles");
      if (!res.ok) return;
      const data = await res.json();
      setStyles(data.styles ?? []);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchStyles(); }, []);

  const startRename = (style: ChartStyle) => {
    setRenamingId(style.id);
    setRenameValue(style.name);
    setRenameError(null);
  };

  const commitRename = async (id: string) => {
    const trimmed = renameValue.trim();
    if (!trimmed) { setRenameError("Name cannot be empty."); return; }
    const res = await fetch(`/api/dashboard/studio/chart-styles/${id}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name: trimmed }),
    });
    if (res.status === 409) { setRenameError("That name is already taken."); return; }
    if (!res.ok) { setRenameError("Failed to rename."); return; }
    setRenamingId(null);
    setRenameError(null);
    fetchStyles();
  };

  const handleDelete = async (id: string) => {
    setDeletingId(id);
    try {
      await fetch(`/api/dashboard/studio/chart-styles/${id}`, { method: "DELETE" });
      fetchStyles();
    } finally {
      setDeletingId(null);
    }
  };

  if (loading) {
    return <p className="text-sm text-slate-400">Loading styles…</p>;
  }

  if (styles.length === 0) {
    return (
      <p className="text-sm text-slate-500 italic">
        No saved styles yet. Save your first style from the{" "}
        <a href="/dashboard/studio" className="text-primary hover:underline">Studio chart customizer</a>.
      </p>
    );
  }

  return (
    <div className="space-y-2">
      {styles.map((style) => (
        <div key={style.id} className="flex items-center gap-2">
          {renamingId === style.id ? (
            <>
              <input
                autoFocus
                value={renameValue}
                onChange={(e) => { setRenameValue(e.target.value); setRenameError(null); }}
                onKeyDown={(e) => {
                  if (e.key === "Enter") commitRename(style.id);
                  if (e.key === "Escape") { setRenamingId(null); setRenameError(null); }
                }}
                className="flex-1 rounded border border-slate-200 px-2 py-1 text-sm text-slate-800 focus:outline-none focus:ring-1 focus:ring-primary"
              />
              <button
                onClick={() => commitRename(style.id)}
                className="text-xs font-bold text-primary hover:underline"
              >
                Save
              </button>
              <button
                onClick={() => { setRenamingId(null); setRenameError(null); }}
                className="text-xs font-bold text-slate-400 hover:text-slate-600"
              >
                Cancel
              </button>
              {renameError && <span className="text-xs text-red-500">{renameError}</span>}
            </>
          ) : (
            <>
              <span className="flex-1 text-sm text-slate-700">{style.name}</span>
              <button
                onClick={() => startRename(style)}
                className="text-xs font-medium text-slate-400 hover:text-primary transition-colors"
              >
                Rename
              </button>
              <button
                onClick={() => handleDelete(style.id)}
                disabled={deletingId === style.id}
                className="text-xs font-medium text-slate-400 hover:text-red-500 transition-colors disabled:opacity-40"
              >
                {deletingId === style.id ? "Deleting…" : "Delete"}
              </button>
            </>
          )}
        </div>
      ))}
    </div>
  );
}
```

**Step 2: Add the section to the Settings page**

In `src/app/dashboard/settings/page.tsx`:

Add import at the top with the other section imports:

```typescript
import ChartStylesSection from "./chart-styles-section";
```

Add the section card inside the `<div className="grid grid-cols-1 lg:grid-cols-2 gap-6">`, before the Danger Zone section:

```tsx
{/* Chart Styles */}
<section className="bg-white rounded-lg border border-slate-custom-100 shadow-[0_2px_10px_rgba(0,0,0,0.03)]">
    <div className="px-6 py-4 border-b border-slate-custom-100 flex items-center gap-3">
        <span className="material-icons-round text-slate-custom-400">bookmarks</span>
        <h3 className="text-base font-semibold text-slate-custom-900">Chart Styles</h3>
    </div>
    <div className="p-6">
        <ChartStylesSection />
    </div>
</section>
```

**Step 3: Verify TypeScript and build**

```bash
npx tsc --noEmit
npm run build 2>&1 | tail -5
```

Expected: No errors.

**Step 4: Commit**

```bash
git add src/app/dashboard/settings/chart-styles-section.tsx src/app/dashboard/settings/page.tsx
git commit -m "feat: add Chart Styles section to Settings page"
```

---

### Task 6: Run full test suite and verify

**Step 1: Run all tests**

```bash
npx vitest run
```

Expected: All tests pass. The two new test files add 12 new passing tests.

**Step 2: Final TypeScript check**

```bash
npx tsc --noEmit
```

Expected: No errors.

**Step 3: Final build**

```bash
npm run build
```

Expected: Build succeeds with no errors.

**Step 4: Commit if any fixes were needed, then create PR**

```bash
git add -A
git commit -m "fix: address any type errors from final build"
```

Then open a PR from the feature branch to `main`.
