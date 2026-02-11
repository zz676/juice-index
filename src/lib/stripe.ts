import Stripe from "stripe";

export const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
  apiVersion: "2025-02-24.acacia",
});

export type Plan = "starter" | "pro";
export type Interval = "month" | "year";

export function priceId(plan: Plan, interval: Interval): string {
  if (plan === "starter" && interval === "month") return process.env.STRIPE_PRICE_STARTER_MONTHLY!;
  if (plan === "starter" && interval === "year") return process.env.STRIPE_PRICE_STARTER_YEARLY!;
  if (plan === "pro" && interval === "month") return process.env.STRIPE_PRICE_PRO_MONTHLY!;
  if (plan === "pro" && interval === "year") return process.env.STRIPE_PRICE_PRO_YEARLY!;
  throw new Error("Invalid plan/interval");
}

export function tierFromPrice(price: string): "STARTER" | "PRO" {
  const starter = new Set([
    process.env.STRIPE_PRICE_STARTER_MONTHLY,
    process.env.STRIPE_PRICE_STARTER_YEARLY,
  ].filter(Boolean) as string[]);

  if (starter.has(price)) return "STARTER";
  return "PRO";
}
