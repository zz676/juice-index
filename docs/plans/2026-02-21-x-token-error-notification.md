# X Token Error Notification Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** When a user's X refresh token is invalidated, flag the error on XAccount, create a deduped in-app notification, and show a warning banner on the Engagement page so they know to reconnect.

**Architecture:** Add a `tokenError` boolean to `XAccount`. The cron sets it when `XTokenExpiredError` is caught and clears it on successful refresh. The accounts GET API includes the flag. The Engagement page shows a banner when `tokenError` is true. The OAuth callback clears the flag on reconnect.

**Tech Stack:** Prisma (schema + db push), Next.js API routes, React (engagement page banner)

---

### Task 1: Add `tokenError` field to `XAccount` schema

**Files:**
- Modify: `prisma/schema.prisma` (XAccount model, ~line 577)

**Step 1: Add the field**

In `prisma/schema.prisma`, inside `model XAccount`, add after `isXPremium`:

```prisma
/// Set to true when the refresh token is invalidated; cleared on successful reconnect.
tokenError     Boolean  @default(false)
```

**Step 2: Push to DB**

```bash
npx prisma db push
```
Expected: `🚀 Your database is now in sync with your Prisma schema.`

**Step 3: Regenerate client**

```bash
npx prisma generate
```

**Step 4: Type-check**

```bash
npx tsc --noEmit
```
Expected: no errors

**Step 5: Commit**

```bash
git add prisma/schema.prisma
git commit -m "feat: add tokenError field to XAccount for X OAuth reconnect tracking"
```

---

### Task 2: Set `tokenError` in the cron on token failure, clear on success

**Files:**
- Modify: `src/app/api/cron/engagement-poll/route.ts` (~lines 162–176)

**Step 1: Update the token refresh block**

Replace the existing try/catch for `refreshTokenIfNeeded` with:

```typescript
try {
  accessToken = await refreshTokenIfNeeded(xAccount);
  // Clear any previous token error on success
  if (xAccount.tokenError) {
    await prisma.xAccount.update({
      where: { id: xAccount.id },
      data: { tokenError: false },
    });
  }
  console.log(`[cron] ↳ Token OK, processing ${accounts.length} account(s)`);
} catch (err) {
  if (err instanceof XTokenExpiredError) {
    console.error(`[cron] ↳ SKIP: X token expired`);
    // Mark error and notify user (deduped)
    if (!xAccount.tokenError) {
      await prisma.xAccount.update({
        where: { id: xAccount.id },
        data: { tokenError: true },
      });
      await prisma.notification.create({
        data: {
          userId,
          type: "SYSTEM",
          title: "X account needs reconnecting",
          message:
            "Your X connection has expired. Auto-replies are paused until you reconnect in Settings.",
          link: "/dashboard/settings",
          read: false,
        },
      });
    }
  } else {
    console.error(`[cron] ↳ SKIP: token refresh failed`, err);
  }
  skipped += accounts.length;
  skipReasons.tokenError += accounts.length;
  continue;
}
```

**Step 2: Type-check**

```bash
npx tsc --noEmit
```
Expected: no errors

**Step 3: Commit**

```bash
git add src/app/api/cron/engagement-poll/route.ts
git commit -m "feat: set tokenError and create notification when X token is invalidated"
```

---

### Task 3: Clear `tokenError` on OAuth reconnect

**Files:**
- Modify: `src/app/api/x/callback/route.ts` (find where `xAccount` is upserted after successful OAuth)

**Step 1: Find the upsert**

Search for where the OAuth callback writes the new tokens. It will look like `prisma.xAccount.upsert(...)` or `prisma.xAccount.update(...)`.

**Step 2: Add `tokenError: false` to the upsert data**

In the `update` and `create` blocks of the upsert, include:

```typescript
tokenError: false,
```

This ensures reconnecting clears the error flag automatically.

**Step 3: Type-check**

```bash
npx tsc --noEmit
```

**Step 4: Commit**

```bash
git add src/app/api/x/callback/route.ts
git commit -m "feat: clear tokenError on successful X OAuth reconnect"
```

---

### Task 4: Expose `tokenError` from the engagement accounts API

**Files:**
- Modify: `src/app/api/dashboard/engagement/accounts/route.ts` (GET handler, ~line 12)

**Step 1: Fetch XAccount alongside monitored accounts**

Replace the GET handler's data fetching with:

```typescript
const [accounts, subscription, xAccount] = await Promise.all([
  prisma.monitoredAccount.findMany({
    where: { userId: user.id },
    orderBy: { createdAt: "asc" },
  }),
  prisma.apiSubscription.findUnique({
    where: { userId: user.id },
    select: { tier: true },
  }),
  prisma.xAccount.findUnique({
    where: { userId: user.id },
    select: { tokenError: true },
  }),
]);
```

**Step 2: Include `xTokenError` in the response**

```typescript
return NextResponse.json({
  accounts,
  accountLimit,
  xTokenError: xAccount?.tokenError ?? false,
});
```

**Step 3: Type-check**

```bash
npx tsc --noEmit
```

**Step 4: Commit**

```bash
git add src/app/api/dashboard/engagement/accounts/route.ts
git commit -m "feat: include xTokenError in engagement accounts API response"
```

---

### Task 5: Show reconnect banner on the Engagement page

**Files:**
- Modify: `src/app/dashboard/engagement/page.tsx`

**Step 1: Add `xTokenError` state**

In `EngagementPage`, add:

```typescript
const [xTokenError, setXTokenError] = useState(false);
```

**Step 2: Read from the fetch response**

In `fetchAccounts`:

```typescript
const fetchAccounts = useCallback(async () => {
  setLoadingAccounts(true);
  try {
    const res = await fetch("/api/dashboard/engagement/accounts");
    const data = await res.json();
    setAccounts(data.accounts ?? []);
    setXTokenError(data.xTokenError ?? false);
  } finally {
    setLoadingAccounts(false);
  }
}, []);
```

**Step 3: Render the banner**

Add this banner just below `<GlobalPauseBanner>` and above the tab bar, inside the accounts tab content:

```tsx
{xTokenError && (
  <div className="flex items-center gap-3 px-4 py-3 bg-amber-50 border border-amber-200 rounded-xl text-sm text-amber-800">
    <span className="material-icons-round text-amber-500 text-[20px]">warning</span>
    <span>
      Your X account connection has expired. Auto-replies are paused.{" "}
      <a href="/dashboard/settings" className="font-semibold underline underline-offset-2">
        Reconnect in Settings →
      </a>
    </span>
  </div>
)}
```

**Step 4: Type-check**

```bash
npx tsc --noEmit
```

**Step 5: Commit**

```bash
git add src/app/dashboard/engagement/page.tsx
git commit -m "feat: show reconnect warning banner on engagement page when X token is invalid"
```

---

### Task 6: Verify end-to-end

**Step 1: Simulate a token error**

In a test/dev environment, manually set `tokenError = true` on an XAccount row:

```sql
UPDATE juice_x_accounts SET token_error = true WHERE username = 'your_test_user';
```

**Step 2: Open Engagement page**

Confirm the amber banner appears with the reconnect link.

**Step 3: Check notifications**

Open the notification bell — confirm a SYSTEM notification appears with "X account needs reconnecting".

**Step 4: Reconnect**

Go to Settings → reconnect X. Confirm the banner disappears and `tokenError` is cleared in the DB.

**Step 5: Final type-check and build**

```bash
npx tsc --noEmit && npm run build
```
