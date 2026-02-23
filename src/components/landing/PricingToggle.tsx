"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { createClient } from "@/lib/supabase/client";

import type { User } from "@supabase/supabase-js";

type TierDef = {
  name: string;
  tierKey: string; // maps to ?current= param and API tier value
  plan?: "starter" | "pro";
  monthlyPrice: number | null;
  annualPrice: number | null;
  description: string;
  features: string[];
  cta: string;
  ctaHref: string;
  highlight: boolean;
  badge?: string;
};

const tiers: TierDef[] = [
  {
    name: "Analyst",
    tierKey: "free",
    monthlyPrice: 0,
    annualPrice: 0,
    description: "Essential market tracking",
    features: [
      "Dashboard with 30-day delayed data",
      "3 Juice AI queries/day",
      "1 chart generation/day",
      "1-year historical data",
    ],
    cta: "Start Free",
    ctaHref: "/login?mode=magic&intent=signup",
    highlight: false,
  },
  {
    name: "Starter",
    tierKey: "starter",
    plan: "starter",
    monthlyPrice: 19.99,
    annualPrice: 16.99,
    description: "For analysts getting started",
    features: [
      "Real-time data (no delay)",
      "15 Juice AI queries/day",
      "10 CSV exports/month",
      "5-year historical data",
      "X posting & scheduling",
    ],
    cta: "Get Started",
    ctaHref: "/login?mode=magic&intent=signup&plan=starter",
    highlight: false,
  },
  {
    name: "Pro",
    tierKey: "pro",
    plan: "pro",
    monthlyPrice: 49.99,
    annualPrice: 44.99,
    description: "Deep dives for investors",
    features: [
      "50 Juice AI queries/day",
      "20 chart generations/day",
      "50 CSV exports/month",
      "Claude Opus 4 model access",
      "Engagement Center",
    ],
    cta: "Get Started",
    ctaHref: "/login?mode=magic&intent=signup&plan=pro",
    highlight: true,
    badge: "Recommended",
  },
  {
    name: "Institutional",
    tierKey: "enterprise",
    monthlyPrice: null,
    annualPrice: null,
    description: "Enterprise-scale intelligence",
    features: [
      "Unlimited AI queries & charts",
      "Full API access (10 keys)",
      "5+ seat licenses",
      "Dedicated analyst support",
    ],
    cta: "Contact Sales",
    ctaHref: "mailto:sales@juiceindex.com",
    highlight: false,
  },
];

export default function PricingToggle() {
  const [isAnnual, setIsAnnual] = useState(false);
  const [user, setUser] = useState<User | null>(null);
  const [userTier, setUserTier] = useState<string | null>(null);
  const [checkoutLoadingPlan, setCheckoutLoadingPlan] = useState<string | null>(null);
  const searchParams = useSearchParams();

  // From ?current= param (passed from billing page "Change Plan" link)
  const currentParam = searchParams.get("current");

  useEffect(() => {
    const supabase = createClient();
    supabase.auth.getUser().then(({ data: { user: authUser } }) => {
      setUser(authUser);
      if (authUser) {
        // Fetch user's current tier
        fetch("/api/dashboard/tier")
          .then((r) => r.json())
          .then((d) => { if (d.tier) setUserTier(d.tier.toLowerCase()); })
          .catch(() => {});
      }
    });
  }, []);

  // Use API tier for logged-in users, fall back to URL param
  const activeTier = userTier || currentParam || null;

  async function handleCheckout(plan: "starter" | "pro") {
    setCheckoutLoadingPlan(plan);
    try {
      const res = await fetch("/api/billing/checkout", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          plan,
          interval: isAnnual ? "year" : "month",
        }),
      });
      const data = await res.json();
      if (data.url) {
        window.location.href = data.url;
      }
    } finally {
      setCheckoutLoadingPlan(null);
    }
  }

  function isCurrentTier(tier: TierDef) {
    return activeTier === tier.tierKey;
  }

  function getCtaLabel(tier: TierDef) {
    if (isCurrentTier(tier)) return "Current Plan";
    if (!user || !activeTier) return tier.cta;
    // Determine relative position
    const tierOrder = ["free", "starter", "pro", "enterprise"];
    const currentIdx = tierOrder.indexOf(activeTier);
    const tierIdx = tierOrder.indexOf(tier.tierKey);
    if (tierIdx > currentIdx) return "Upgrade";
    if (tierIdx < currentIdx) return "Downgrade";
    return tier.cta;
  }

  return (
    <div>
      {/* Toggle */}
      <div className="flex items-center justify-center gap-4 mb-12">
        <span
          className={`text-sm font-medium ${!isAnnual ? "text-slate-custom-900" : "text-slate-custom-400"}`}
        >
          Monthly
        </span>
        <button
          type="button"
          role="switch"
          aria-checked={isAnnual}
          onClick={() => setIsAnnual(!isAnnual)}
          className={`relative inline-flex h-7 w-12 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ${isAnnual ? "bg-primary" : "bg-slate-custom-200"}`}
        >
          <span
            aria-hidden="true"
            className={`pointer-events-none inline-block h-6 w-6 transform rounded-full bg-white shadow-sm ring-0 transition duration-200 ${isAnnual ? "translate-x-5" : "translate-x-0"}`}
          />
        </button>
        <span
          className={`text-sm font-medium ${isAnnual ? "text-slate-custom-900" : "text-slate-custom-400"}`}
        >
          Annual
        </span>
        {isAnnual && (
          <span className="text-xs font-semibold text-primary bg-primary/10 px-2 py-0.5 rounded-full">
            Save 20%
          </span>
        )}
      </div>

      {/* Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 max-w-6xl mx-auto">
        {tiers.map((tier) => {
          const isCurrent = isCurrentTier(tier);
          const ctaLabel = getCtaLabel(tier);

          return (
            <div
              key={tier.name}
              className={`relative rounded-2xl p-8 flex flex-col ${
                isCurrent
                  ? "bg-white border-2 border-primary shadow-lg shadow-primary/10"
                  : tier.highlight && !isCurrent
                    ? "bg-white border-2 border-primary shadow-lg shadow-primary/10"
                    : "bg-white border border-slate-custom-200"
              }`}
            >
              {isCurrent ? (
                <span className="absolute -top-3 left-1/2 -translate-x-1/2 text-xs font-bold text-white bg-primary px-3 py-1 rounded-full">
                  Current Plan
                </span>
              ) : tier.badge && !isCurrent ? (
                <span className="absolute -top-3 left-1/2 -translate-x-1/2 text-xs font-bold text-slate-custom-900 bg-primary px-3 py-1 rounded-full">
                  {tier.badge}
                </span>
              ) : null}
              <h3 className="text-lg font-bold text-slate-custom-900">
                {tier.name}
              </h3>
              <p className="text-sm text-slate-custom-500 mt-1">
                {tier.description}
              </p>
              <div className="mt-6 mb-6">
                {tier.monthlyPrice !== null ? (
                  <div className="flex items-baseline">
                    <span className={`text-4xl font-extrabold ${!isAnnual && tier.monthlyPrice > 0 ? "line-through text-slate-custom-400" : "text-slate-custom-900"}`}>
                      ${isAnnual ? tier.annualPrice : tier.monthlyPrice}
                    </span>
                    <span className="text-slate-custom-500 ml-1">/mo</span>
                  </div>
                ) : (
                  <span className="text-3xl font-extrabold text-slate-custom-900">
                    Custom
                  </span>
                )}
                {!isAnnual && tier.monthlyPrice !== null && tier.monthlyPrice > 0 && (
                  <p className="text-xs font-semibold text-primary mt-1">
                    First month ${(tier.monthlyPrice * 0.5).toFixed(2)}
                  </p>
                )}
                {tier.monthlyPrice !== null && tier.monthlyPrice > 0 && (
                  <p className="text-xs text-slate-custom-400 mt-1">
                    Billed {isAnnual ? "annually" : "monthly"}
                  </p>
                )}
              </div>
              <ul className="space-y-3 flex-1 mb-8">
                {tier.features.map((f) => (
                  <li key={f} className="flex items-start gap-2.5">
                    <span
                      className={`material-icons-round text-sm mt-0.5 ${isCurrent || (tier.highlight && !isCurrent) ? "text-primary" : "text-slate-custom-300"}`}
                    >
                      check_circle
                    </span>
                    <span className="text-sm text-slate-custom-600">{f}</span>
                  </li>
                ))}
              </ul>
              {/* CTA button */}
              {isCurrent ? (
                <span className="block w-full text-center py-3 text-sm font-semibold rounded-full bg-slate-custom-100 text-slate-custom-500 cursor-default">
                  Current Plan
                </span>
              ) : tier.name === "Analyst" && user ? (
                <Link
                  href="/dashboard"
                  className="block w-full text-center py-3 text-sm font-semibold rounded-full transition-colors bg-slate-custom-50 text-slate-custom-700 hover:bg-slate-custom-100 border border-slate-custom-200"
                >
                  {ctaLabel}
                </Link>
              ) : tier.plan && user ? (
                <button
                  type="button"
                  onClick={() => handleCheckout(tier.plan!)}
                  disabled={checkoutLoadingPlan === tier.plan}
                  className={`block w-full text-center py-3 text-sm font-semibold rounded-full transition-colors disabled:opacity-60 ${
                    tier.highlight || isCurrent
                      ? "bg-slate-custom-900 text-white hover:bg-slate-custom-800"
                      : "bg-slate-custom-50 text-slate-custom-700 hover:bg-slate-custom-100 border border-slate-custom-200"
                  }`}
                >
                  {checkoutLoadingPlan === tier.plan ? "Redirecting\u2026" : ctaLabel}
                </button>
              ) : (
                <Link
                  href={tier.ctaHref}
                  className={`block w-full text-center py-3 text-sm font-semibold rounded-full transition-colors ${
                    tier.highlight
                      ? "bg-slate-custom-900 text-white hover:bg-slate-custom-800"
                      : "bg-slate-custom-50 text-slate-custom-700 hover:bg-slate-custom-100 border border-slate-custom-200"
                  }`}
                >
                  {ctaLabel}
                </Link>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
