"use client";

import { useRouter } from "next/navigation";
import { useEffect } from "react";

/**
 * After Stripe checkout, the webhook may not have updated the DB yet.
 * This component polls by calling router.refresh() to re-fetch server data
 * until the tier updates or we hit the max attempts.
 */
export default function SuccessRefresh({ currentTier }: { currentTier: string }) {
  const router = useRouter();

  useEffect(() => {
    if (currentTier !== "FREE") return; // already updated

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
