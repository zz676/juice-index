"use client";

import { useState } from "react";

type Plan = "starter" | "pro";
type Interval = "month" | "year";

async function startCheckout(plan: Plan, interval: Interval) {
  const res = await fetch("/api/billing/checkout", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ plan, interval }),
  });
  const json = await res.json();
  if (!res.ok) throw new Error(json?.message || json?.error || "Checkout failed");
  window.location.href = json.url;
}

async function openPortal() {
  const res = await fetch("/api/billing/portal", { method: "POST" });
  const json = await res.json();
  if (!res.ok) throw new Error(json?.message || json?.error || "Portal failed");
  window.location.href = json.url;
}

export function BillingButtons() {
  const [err, setErr] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  async function run(fn: () => Promise<void>) {
    setIsLoading(true);
    setErr(null);
    try {
      await fn();
    } catch (e) {
      setErr(e instanceof Error ? e.message : String(e));
    } finally {
      setIsLoading(false);
    }
  }

  return (
    <section style={{ marginTop: 16 }}>
      <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
        <button disabled={isLoading} onClick={() => run(() => startCheckout("starter", "month"))} style={{ padding: "10px 14px" }}>
          Starter (Monthly)
        </button>
        <button disabled={isLoading} onClick={() => run(() => startCheckout("starter", "year"))} style={{ padding: "10px 14px" }}>
          Starter (Yearly)
        </button>
        <button disabled={isLoading} onClick={() => run(() => startCheckout("pro", "month"))} style={{ padding: "10px 14px" }}>
          Pro (Monthly)
        </button>
        <button disabled={isLoading} onClick={() => run(() => startCheckout("pro", "year"))} style={{ padding: "10px 14px" }}>
          Pro (Yearly)
        </button>
        <button disabled={isLoading} onClick={() => run(openPortal)} style={{ padding: "10px 14px" }}>
          Manage Subscription
        </button>
      </div>
      {err ? <p style={{ marginTop: 12, color: "#b00020" }}>{err}</p> : null}
    </section>
  );
}
