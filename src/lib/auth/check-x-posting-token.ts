import prisma from "@/lib/prisma";
import { refreshTokenIfNeeded, XTokenExpiredError } from "@/lib/x/refresh-token";

/**
 * Proactively validates the user's X posting token immediately after login.
 * If the token is expired/revoked, marks tokenError=true and creates a
 * notification (deduped — only once per incident, same pattern as the cron job).
 */
export async function checkXPostingToken(userId: string): Promise<void> {
  const xAccount = await prisma.xAccount.findUnique({
    where: { userId },
  });

  // No X posting account connected — nothing to check
  if (!xAccount) return;

  // Already flagged — no need to re-check or re-notify
  if (xAccount.tokenError) return;

  try {
    await refreshTokenIfNeeded(xAccount);
    // Token is healthy — nothing to do
  } catch (err) {
    if (err instanceof XTokenExpiredError) {
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
    // Non-expiry errors (network, config) are intentionally swallowed —
    // we don't want a transient failure to falsely flag the token as broken.
  }
}
