"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { StatCard } from "@/components/dashboard/StatCard";
import { DeliveryChart } from "@/components/dashboard/DeliveryChart";
import UpgradeBanner from "@/components/dashboard/UpgradeBanner";
import StockTicker from "@/components/dashboard/StockTicker";

interface CardData {
  icon: string;
  label: string;
  value: string;
  change?: string;
  up?: boolean;
  badge?: string;
  suffix?: string;
}

interface DashboardStats {
  cards: CardData[];
}

interface DashboardFeed {
  news: Array<{ id: string; tag: string; tagColor: string; time: string; title: string; desc: string; url?: string }>;
  catalysts: Array<{ month: string; day: string; title: string; desc: string; tags: string[]; highlight?: string }>;
}

const DASHBOARD_CARD_LABELS = [
  "NEV Monthly Retail",
  "NEV Monthly Production",
  "Leading OEM",
  "Weekly Retail Sales",
];

export default function DashboardPage() {
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [feed, setFeed] = useState<DashboardFeed | null>(null);
  const [loading, setLoading] = useState(true);
  const [tier, setTier] = useState<string>("FREE");

  useEffect(() => {
    async function fetchData() {
      try {
        const [statsRes, feedRes, tierRes] = await Promise.all([
          fetch("/api/dashboard/stats"),
          fetch("/api/dashboard/feed"),
          fetch("/api/dashboard/tier"),
        ]);

        if (statsRes.ok) setStats(await statsRes.json());
        if (feedRes.ok) setFeed(await feedRes.json());
        if (tierRes.ok) {
          const tierJson = await tierRes.json();
          if (tierJson.tier) setTier(tierJson.tier);
        }
      } catch (error) {
        console.error("Failed to load dashboard data", error);
      } finally {
        setLoading(false);
      }
    }
    fetchData();
  }, []);

  const filteredCards = DASHBOARD_CARD_LABELS
    .map((label) => stats?.cards.find((c) => c.label === label))
    .filter((c): c is CardData => c !== undefined);

  if (loading) {
    return (
      <div className="pt-20 pb-8 px-4 sm:px-6 lg:px-8 h-full overflow-y-auto">
        <div className="w-full max-w-7xl mx-auto animate-pulse space-y-6">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {[...Array(4)].map((_, i) => (
              <div key={i} className="h-[120px] bg-slate-custom-100 rounded-lg" />
            ))}
          </div>
          <div className="h-[420px] bg-slate-custom-100 rounded-lg" />
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
            <div className="h-64 bg-slate-custom-100 rounded-lg" />
            <div className="h-64 bg-slate-custom-100 rounded-lg" />
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="pt-20 pb-8 px-4 sm:px-6 lg:px-8 h-full overflow-y-auto">
      <div className="w-full max-w-7xl mx-auto">
      <StockTicker />
      {/* Data delay banner for Free tier */}
      {tier === "FREE" && (
        <div className="mb-3">
          <UpgradeBanner
            icon="schedule"
            message="Data shown is delayed by 30 days and limited to 1 year of history. Upgrade to Pro for real-time data and 5 years of history."
          />
        </div>
      )}

      {/* 4 Stat Cards in equal-width row */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 mb-4 pt-2">
        {filteredCards.map((card, i) => (
          <StatCard key={i} {...card} />
        ))}
      </div>

      {/* Delivery Chart: full width */}
      <div className="mb-4">
        <DeliveryChart />
      </div>

      {/* News & Catalysts (full width, side by side) */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 pb-6">
        {/* News */}
        <div>
          <div className="flex items-center justify-between mb-3">
            <h3 className="font-bold text-slate-custom-900 text-lg">Latest News</h3>
            <Link href="/dashboard/posts" className="text-xs font-semibold text-primary hover:text-primary/80 uppercase tracking-wide">View All</Link>
          </div>
          <div className="space-y-2">
            {feed?.news.map((item, i) => (
              <a key={i} href={item.url || "#"} target="_blank" rel="noopener noreferrer" className="block">
                <div className="bg-card p-3 rounded-lg border border-lime-200 shadow-[0_2px_10px_rgba(0,0,0,0.04),0_0_28px_rgba(155,199,84,0.35)] hover:border-lime-300 hover:shadow-[0_2px_10px_rgba(0,0,0,0.04),0_0_36px_rgba(155,199,84,0.5)] transition-all group flex gap-3 items-start">
                  <div className="flex-shrink-0 w-12 h-12 rounded-lg bg-slate-custom-100 overflow-hidden flex items-center justify-center">
                    <span className="material-icons-round text-slate-custom-400">image</span>
                  </div>
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-0.5">
                      <span className={`${item.tagColor} text-[10px] font-bold px-2 py-0.5 rounded-full uppercase`}>{item.tag}</span>
                      <span className="text-slate-custom-400 text-xs">{item.time}</span>
                    </div>
                    <h4 className="font-semibold text-slate-custom-900 leading-tight mb-0.5 group-hover:text-primary transition-colors">{item.title}</h4>
                    <p className="text-sm text-slate-custom-500 line-clamp-1">{item.desc}</p>
                  </div>
                </div>
              </a>
            ))}
          </div>
        </div>

        {/* Catalysts */}
        <div>
          <div className="flex items-center justify-between mb-3">
            <h3 className="font-bold text-slate-custom-900 text-lg">Upcoming Catalysts</h3>
          </div>
          <div className="flex flex-col gap-1.5">
            {feed?.catalysts.map((item, i) => (
              <div key={i} className="flex gap-3 p-2.5 bg-white/50 hover:bg-white/75 rounded-xl transition-colors">
                <div className="flex flex-col items-center justify-center bg-slate-custom-100 w-12 h-12 rounded-xl text-center flex-shrink-0">
                  <span className="text-[10px] text-slate-custom-500 uppercase font-bold">{item.month}</span>
                  <span className="text-lg font-bold text-slate-custom-900 leading-none">{item.day}</span>
                </div>
                <div>
                  <h5 className="text-sm font-semibold text-slate-custom-900">{item.title}</h5>
                  <p className="text-xs text-slate-custom-500 mt-0.5">{item.desc}</p>
                  <div className="mt-1.5 flex gap-2">
                    {item.tags.map(t => (
                      <span key={t} className="text-[10px] px-2 py-0.5 bg-slate-custom-100 text-slate-custom-600 rounded-full font-medium">{t}</span>
                    ))}
                    {item.highlight && (
                      <span className="text-[10px] px-2 py-0.5 bg-primary/20 text-green-700 rounded-full font-medium">{item.highlight}</span>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
      </div>
    </div>
  );
}
