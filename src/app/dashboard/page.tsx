"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { StatCard } from "@/components/dashboard/StatCard";
import { DeliveryChart } from "@/components/dashboard/DeliveryChart";
import UpgradeBanner from "@/components/dashboard/UpgradeBanner";

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

const KEEP_LABELS = ["NEV Monthly Retail", "NEV Monthly Production"];

export default function DashboardPage() {
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [feed, setFeed] = useState<DashboardFeed | null>(null);
  const [loading, setLoading] = useState(true);
  const [tier, setTier] = useState<string>("FREE");

  useEffect(() => {
    async function fetchData() {
      try {
        const [statsRes, feedRes, postsRes] = await Promise.all([
          fetch("/api/dashboard/stats"),
          fetch("/api/dashboard/feed"),
          fetch("/api/dashboard/user-posts?limit=1"),
        ]);

        if (statsRes.ok) setStats(await statsRes.json());
        if (feedRes.ok) setFeed(await feedRes.json());
        if (postsRes.ok) {
          const postsJson = await postsRes.json();
          if (postsJson.tier) setTier(postsJson.tier);
        }
      } catch (error) {
        console.error("Failed to load dashboard data", error);
      } finally {
        setLoading(false);
      }
    }
    fetchData();
  }, []);

  const filteredCards = stats?.cards.filter((c) => KEEP_LABELS.includes(c.label)) ?? [];

  if (loading) {
    return (
      <div className="animate-pulse space-y-8">
        {/* Top row: 2 stat cards + chart */}
        <div className="grid grid-cols-1 lg:grid-cols-[280px_1fr] gap-6">
          <div className="space-y-6">
            <div className="h-32 bg-slate-custom-100 rounded-lg"></div>
            <div className="h-32 bg-slate-custom-100 rounded-lg"></div>
          </div>
          <div className="h-[280px] bg-slate-custom-100 rounded-lg"></div>
        </div>
        {/* News + Catalysts */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          <div className="h-64 bg-slate-custom-100 rounded-lg"></div>
          <div className="h-64 bg-slate-custom-100 rounded-lg"></div>
        </div>
      </div>
    );
  }

  return (
    <>
      {/* Data delay banner for Free tier */}
      {tier === "FREE" && (
        <div className="mb-6">
          <UpgradeBanner
            icon="schedule"
            message="Data shown is delayed by 30 days and limited to 1 year of history. Upgrade to Pro for real-time data and 5 years of history."
          />
        </div>
      )}

      {/* Top Row: 2 Stat Cards (stacked) + Delivery Chart */}
      <div className="grid grid-cols-1 lg:grid-cols-[280px_1fr] gap-6 mb-8">
        {/* Left column: stacked stat cards */}
        <div className="flex flex-col gap-6">
          {filteredCards.map((card, i) => (
            <StatCard key={i} {...card} />
          ))}
        </div>

        {/* Right column: Delivery chart */}
        <DeliveryChart />
      </div>

      {/* News & Catalysts (full width, side by side) */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 pb-8">
        {/* News */}
        <div>
          <div className="flex items-center justify-between mb-4">
            <h3 className="font-bold text-slate-custom-900 text-lg">Latest News</h3>
            <Link href="/dashboard/posts" className="text-xs font-semibold text-primary hover:text-primary/80 uppercase tracking-wide">View All</Link>
          </div>
          <div className="space-y-3">
            {feed?.news.map((item, i) => (
              <a key={i} href={item.url || "#"} target="_blank" rel="noopener noreferrer" className="block">
                <div className="bg-white p-4 rounded-lg border border-slate-custom-100 hover:border-primary/40 transition-all group flex gap-4 items-start">
                  <div className="flex-shrink-0 w-16 h-16 rounded-lg bg-slate-custom-100 overflow-hidden flex items-center justify-center">
                    <span className="material-icons-round text-slate-custom-400">image</span>
                  </div>
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-1">
                      <span className={`${item.tagColor} text-[10px] font-bold px-2 py-0.5 rounded-full uppercase`}>{item.tag}</span>
                      <span className="text-slate-custom-400 text-xs">{item.time}</span>
                    </div>
                    <h4 className="font-semibold text-slate-custom-900 leading-tight mb-1 group-hover:text-primary transition-colors">{item.title}</h4>
                    <p className="text-sm text-slate-custom-500 line-clamp-1">{item.desc}</p>
                  </div>
                </div>
              </a>
            ))}
          </div>
        </div>

        {/* Catalysts */}
        <div>
          <div className="flex items-center justify-between mb-4">
            <h3 className="font-bold text-slate-custom-900 text-lg">Upcoming Catalysts</h3>
          </div>
          <div className="bg-white rounded-lg border border-slate-custom-100 p-1">
            {feed?.catalysts.map((item, i) => (
              <div key={i} className="flex gap-4 p-3 border-b border-slate-custom-50 last:border-0 hover:bg-slate-custom-50 rounded-lg transition-colors">
                <div className="flex flex-col items-center justify-center bg-slate-custom-100 w-14 h-14 rounded-2xl text-center flex-shrink-0">
                  <span className="text-[10px] text-slate-custom-500 uppercase font-bold">{item.month}</span>
                  <span className="text-xl font-bold text-slate-custom-900 leading-none">{item.day}</span>
                </div>
                <div>
                  <h5 className="text-sm font-semibold text-slate-custom-900">{item.title}</h5>
                  <p className="text-xs text-slate-custom-500 mt-1">{item.desc}</p>
                  <div className="mt-2 flex gap-2">
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
    </>
  );
}
