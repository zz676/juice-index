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
    <section>
      <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
        <button
          disabled={isLoading}
          onClick={() => run(() => startCheckout("starter", "month"))}
          className="btn btn-outline btn-sm"
        >
          Starter Monthly
        </button>
        <button
          disabled={isLoading}
          onClick={() => run(() => startCheckout("starter", "year"))}
          className="btn btn-outline btn-sm"
        >
          Starter Yearly
        </button>
        <button
          disabled={isLoading}
          onClick={() => run(() => startCheckout("pro", "month"))}
          className="btn btn-primary btn-sm"
        >
          Pro Monthly
        </button>
        <button
          disabled={isLoading}
          onClick={() => run(() => startCheckout("pro", "year"))}
          className="btn btn-primary btn-sm"
        >
          Pro Yearly
        </button>
        <button
          disabled={isLoading}
          onClick={() => run(openPortal)}
          className="btn btn-ghost btn-sm"
        >
          Manage Subscription →
        </button>
      </div>
      {err ? <p className="error-text">{err}</p> : null}
    </section>
  );
}
