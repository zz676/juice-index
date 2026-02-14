"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";

import type { User } from "@supabase/supabase-js";

const tiers = [
  {
    name: "Analyst",
    monthlyPrice: 0,
    annualPrice: 0,
    description: "Essential market tracking",
    features: [
      "Weekly Market Newsletter",
      "Top-level Production Stats",
      "Public Forum Access",
    ],
    cta: "Start Free",
    ctaHref: "/login?mode=magic&intent=signup",
    highlight: false,
  },
  {
    name: "Pro",
    monthlyPrice: 29,
    annualPrice: 24,
    description: "Deep dives for investors",
    features: [
      "Full Dashboard Access",
      "Unlimited CSV Exports",
      "5-Year Historical Data",
      "Advanced Filter Sets",
    ],
    cta: "Get Started",
    ctaHref: "/login?mode=magic&intent=signup&plan=pro",
    highlight: true,
    badge: "Recommended",
  },
  {
    name: "Institutional",
    monthlyPrice: null,
    annualPrice: null,
    description: "Enterprise-scale intelligence",
    features: [
      "Full API Access",
      "Multi-seat Licenses",
      "Dedicated Analyst Support",
      "Custom Report Generation",
    ],
    cta: "Contact Sales",
    ctaHref: "mailto:sales@juiceindex.com",
    highlight: false,
  },
];

export default function PricingToggle() {
  const [isAnnual, setIsAnnual] = useState(false);
  const [user, setUser] = useState<User | null>(null);
  const [checkoutLoading, setCheckoutLoading] = useState(false);

  useEffect(() => {
    const supabase = createClient();
    supabase.auth.getUser().then(({ data: { user: authUser } }) => {
      setUser(authUser);
    });
  }, []);

  async function handleCheckout() {
    setCheckoutLoading(true);
    try {
      const res = await fetch("/api/billing/checkout", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          plan: "pro",
          interval: isAnnual ? "year" : "month",
        }),
      });
      const data = await res.json();
      if (data.url) {
        window.location.href = data.url;
      }
    } finally {
      setCheckoutLoading(false);
    }
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
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 max-w-5xl mx-auto">
        {tiers.map((tier) => (
          <div
            key={tier.name}
            className={`relative rounded-2xl p-8 flex flex-col ${
              tier.highlight
                ? "bg-white border-2 border-primary shadow-lg shadow-primary/10"
                : "bg-white border border-slate-custom-200"
            }`}
          >
            {tier.badge && (
              <span className="absolute -top-3 left-1/2 -translate-x-1/2 text-xs font-bold text-slate-custom-900 bg-primary px-3 py-1 rounded-full">
                {tier.badge}
              </span>
            )}
            <h3 className="text-lg font-bold text-slate-custom-900">
              {tier.name}
            </h3>
            <p className="text-sm text-slate-custom-500 mt-1">
              {tier.description}
            </p>
            <div className="mt-6 mb-6">
              {tier.monthlyPrice !== null ? (
                <div className="flex items-baseline">
                  <span className="text-4xl font-extrabold text-slate-custom-900">
                    ${isAnnual ? tier.annualPrice : tier.monthlyPrice}
                  </span>
                  <span className="text-slate-custom-500 ml-1">/mo</span>
                </div>
              ) : (
                <span className="text-3xl font-extrabold text-slate-custom-900">
                  Custom
                </span>
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
                    className={`material-icons-round text-sm mt-0.5 ${tier.highlight ? "text-primary" : "text-slate-custom-300"}`}
                  >
                    check_circle
                  </span>
                  <span className="text-sm text-slate-custom-600">{f}</span>
                </li>
              ))}
            </ul>
            {/* Analyst: logged-in → dashboard, logged-out → signup */}
            {tier.name === "Analyst" && user ? (
              <Link
                href="/dashboard"
                className="block w-full text-center py-3 text-sm font-semibold rounded-full transition-colors bg-slate-custom-50 text-slate-custom-700 hover:bg-slate-custom-100 border border-slate-custom-200"
              >
                Go to Dashboard
              </Link>
            ) : /* Pro: logged-in → direct checkout, logged-out → signup */
            tier.name === "Pro" && user ? (
              <button
                type="button"
                onClick={handleCheckout}
                disabled={checkoutLoading}
                className="block w-full text-center py-3 text-sm font-semibold rounded-full transition-colors bg-slate-custom-900 text-white hover:bg-slate-custom-800 disabled:opacity-60"
              >
                {checkoutLoading ? "Redirecting…" : tier.cta}
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
                {tier.cta}
              </Link>
            )}
          </div>
        ))}
      </div>

    </div>
  );
}
