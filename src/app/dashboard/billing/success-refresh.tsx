"use client";

import { useRouter } from "next/navigation";
import { useEffect } from "react";

/**
 * After Stripe checkout, the webhook may not have updated the DB yet.
 * First tries an active sync from Stripe, then falls back to polling
 * router.refresh() until the tier updates or we hit the max attempts.
 */
export default function SuccessRefresh({ currentTier }: { currentTier: string }) {
  const router = useRouter();

  useEffect(() => {
    if (currentTier !== "FREE") return; // already updated

    // Immediately try to sync from Stripe, then start polling
    fetch("/api/billing/sync", { method: "POST" })
      .then(() => router.refresh())
      .catch(() => {});

    let attempts = 0;
    const maxAttempts = 10;
    const interval = setInterval(() => {
      attempts++;
      router.refresh();
      if (attempts >= maxAttempts) clearInterval(interval);
    }, 2000);

    return () => clearInterval(interval);
  }, [currentTier, router]);

  return null;
}
