"use client";

import Link from "next/link";

interface UpgradeBannerProps {
  icon?: string;
  message: string;
  ctaText?: string;
  ctaHref?: string;
}

export default function UpgradeBanner({
  icon = "lock",
  message,
  ctaText = "Upgrade to Pro",
  ctaHref = "/dashboard/billing",
}: UpgradeBannerProps) {
  return (
    <div className="flex items-center gap-3 bg-primary/5 border border-primary/20 rounded-lg px-4 py-3">
      <span className="material-icons-round text-primary text-lg">{icon}</span>
      <p className="text-sm text-slate-custom-600 flex-1">{message}</p>
      <Link
        href={ctaHref}
        className="shrink-0 px-3 py-1.5 bg-primary text-white text-xs font-semibold rounded-full hover:bg-primary/90 transition-colors"
      >
        {ctaText}
      </Link>
    </div>
  );
}
