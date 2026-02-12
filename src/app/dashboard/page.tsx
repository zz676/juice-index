"use client";

import Link from "next/link";
import { useEffect, useState } from "react";

interface DashboardStats {
  cards: Array<{ icon: string; label: string; value: string; change?: string; up?: boolean; badge?: string; suffix?: string }>;
  chart: {
    labels: string[];
    currentYear: number[];
    previousYear: number[];
  };
}

interface DashboardFeed {
  news: Array<{ id: string; tag: string; tagColor: string; time: string; title: string; desc: string }>;
  catalysts: Array<{ month: string; day: string; title: string; desc: string; tags: string[]; highlight?: string }>;
}

export default function DashboardPage() {
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [feed, setFeed] = useState<DashboardFeed | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchData() {
      try {
        const [statsRes, feedRes] = await Promise.all([
          fetch("/api/dashboard/stats"),
          fetch("/api/dashboard/feed")
        ]);

        if (statsRes.ok) setStats(await statsRes.json());
        if (feedRes.ok) setFeed(await feedRes.json());
      } catch (error) {
        console.error("Failed to load dashboard data", error);
      } finally {
        setLoading(false);
      }
    }
    fetchData();
  }, []);

  if (loading) {
    return (
      <div className="animate-pulse space-y-8">
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-6">
          {[...Array(4)].map((_, i) => (
            <div key={i} className="h-32 bg-slate-custom-100 rounded-lg"></div>
          ))}
        </div>
        <div className="h-96 bg-slate-custom-100 rounded-lg"></div>
        <div className="grid grid-cols-1 lg:grid-cols-5 gap-8">
          <div className="lg:col-span-3 h-64 bg-slate-custom-100 rounded-lg"></div>
          <div className="lg:col-span-2 h-64 bg-slate-custom-100 rounded-lg"></div>
        </div>
      </div>
    );
  }

  return (
    <>
      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-6 mb-8">
        {stats?.cards.map((card, i) => (
          <div key={i} className="bg-white p-6 rounded-lg shadow-[0_2px_10px_rgba(0,0,0,0.03)] border border-slate-custom-100 group hover:border-primary/30 transition-all relative overflow-hidden">
            <div className="flex justify-between items-start mb-4">
              <div className="p-2 bg-slate-custom-50 rounded-full text-slate-custom-500">
                <span className="material-icons-round text-xl">{card.icon}</span>
              </div>
              {card.change && (
                <span className={`${card.up ? "bg-primary/10 text-green-700" : "bg-red-50 text-red-600"} font-semibold text-xs px-2.5 py-1 rounded-full flex items-center gap-1`}>
                  <span className="material-icons-round text-sm font-bold">{card.up ? "arrow_upward" : "arrow_downward"}</span> {card.change}
                </span>
              )}
              {card.badge && (
                <span className={`${card.badge === "Top 1" ? "bg-primary/10 text-green-700" : "bg-slate-custom-100 text-slate-custom-600"} font-semibold text-xs px-2.5 py-1 rounded-full`}>{card.badge}</span>
              )}
            </div>
            <p className="text-slate-custom-500 text-sm font-medium mb-1">{card.label}</p>
            <h2 className="text-3xl font-bold text-slate-custom-900">
              {card.value}
              {card.suffix && <span className="text-lg text-slate-custom-400 font-medium ml-1">{card.suffix}</span>}
            </h2>
            <div className="absolute bottom-0 left-0 w-full h-1 bg-primary transform scale-x-0 group-hover:scale-x-100 transition-transform origin-left duration-500"></div>
          </div>
        ))}
      </div>

      {/* Chart Section */}
      <div className="bg-white p-6 rounded-lg shadow-[0_2px_15px_rgba(0,0,0,0.04)] border border-slate-custom-100 mb-8">
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-8 gap-4">
          <div>
            <h3 className="text-lg font-bold text-slate-custom-900 flex items-center gap-2">
              Weekly Deliveries Comparison
              <span className="material-icons-round text-slate-custom-400 text-sm cursor-help" title="Based on insured units">info</span>
            </h3>
            <p className="text-sm text-slate-custom-500">Comparing current year vs previous year performance</p>
          </div>
          <div className="flex items-center gap-2 bg-slate-custom-50 p-1 rounded-full">
            {["1W", "1M", "3M", "YTD"].map((period, i) => (
              <button key={period} className={`px-4 py-1.5 text-xs font-semibold rounded-full ${i === 0 ? "bg-white text-slate-custom-900 shadow-sm ring-1 ring-slate-custom-200" : "text-slate-custom-500 hover:text-slate-custom-900 transition-colors"}`}>{period}</button>
            ))}
          </div>
        </div>
        <div className="flex items-center gap-6 mb-4 text-sm">
          <div className="flex items-center gap-2">
            <span className="w-3 h-3 rounded-full bg-primary shadow-[0_0_8px_rgba(106,218,27,0.5)]"></span>
            <span className="text-slate-custom-700 font-medium">2023 (Current)</span>
          </div>
          <div className="flex items-center gap-2">
            <span className="w-3 h-3 rounded-full bg-blue-400 opacity-50"></span>
            <span className="text-slate-custom-500">2022 (Previous)</span>
          </div>
        </div>
        <div className="relative h-64 w-full select-none">
          <div className="absolute inset-0 flex flex-col justify-between text-xs text-slate-custom-400">
            {["150k", "100k", "50k", "0"].map(label => (
              <div key={label} className="flex w-full items-center">
                <span className="w-8">{label}</span>
                <div className="flex-1 h-px bg-slate-custom-100 border-t border-dashed border-slate-custom-200 ml-2"></div>
              </div>
            ))}
          </div>
          <svg className="absolute inset-0 h-full w-full pl-10 pt-2 pb-5" preserveAspectRatio="none" viewBox="0 0 800 200">
            <defs>
              <linearGradient id="gp" x1="0" x2="0" y1="0" y2="1">
                <stop offset="0%" stopColor="#6ada1b" stopOpacity="0.2" />
                <stop offset="100%" stopColor="#6ada1b" stopOpacity="0" />
              </linearGradient>
            </defs>
            {/* Note: SVG paths would need to be dynamic based on stats.chart.data in a real implementation.
                For now we keep the static SVG or we could use Recharts here as well. 
                Keeping static for visual consistency with the mock for now as dynamic SVG path generation is complex.
            */}
            <path d="M0,150 C50,140 100,160 150,130 C200,100 250,110 300,90 C350,70 400,80 450,100 C500,120 550,110 600,130 C650,150 700,140 750,120 L800,110" fill="none" stroke="#60a5fa" strokeDasharray="4" strokeOpacity="0.4" strokeWidth="2" />
            <path d="M0,120 C50,100 100,110 150,80 C200,50 250,60 300,40 C350,20 400,30 450,50 C500,70 550,40 600,60 C650,80 700,50 750,30 L800,40 V200 H0 Z" fill="url(#gp)" />
            <path d="M0,120 C50,100 100,110 150,80 C200,50 250,60 300,40 C350,20 400,30 450,50 C500,70 550,40 600,60 C650,80 700,50 750,30 L800,40" fill="none" stroke="#6ada1b" strokeLinecap="round" strokeLinejoin="round" strokeWidth="3" className="drop-shadow-[0_4px_6px_rgba(106,218,27,0.4)]" />
            <circle cx="600" cy="60" fill="#6ada1b" r="5" stroke="white" strokeWidth="2" className="cursor-pointer" />
          </svg>
          <div className="absolute top-[15%] left-[72%] transform -translate-x-1/2 bg-slate-custom-900 text-white text-xs py-1.5 px-3 rounded-full shadow-lg pointer-events-none z-10 flex flex-col items-center">
            <span className="font-bold">132,450 Units</span>
            <span className="text-[10px] text-slate-custom-400">Week 42</span>
            <div className="absolute -bottom-1 w-2 h-2 bg-slate-custom-900 rotate-45"></div>
          </div>
          <div className="absolute bottom-0 left-10 right-0 flex justify-between text-[10px] text-slate-custom-400 uppercase tracking-wider">
            {stats?.chart.labels.slice(0, 6).map((w) => <span key={w}>{w}</span>)}
            <span className="text-primary font-bold">{stats?.chart.labels[6]}</span>
            {stats?.chart.labels.slice(7).map((w) => <span key={w}>{w}</span>)}
          </div>
        </div>
      </div>

      {/* Bottom Split */}
      <div className="grid grid-cols-1 lg:grid-cols-5 gap-8 pb-8">
        {/* News */}
        <div className="lg:col-span-3">
          <div className="flex items-center justify-between mb-4">
            <h3 className="font-bold text-slate-custom-900 text-lg">Latest News</h3>
            <Link href="#" className="text-xs font-semibold text-primary hover:text-primary/80 uppercase tracking-wide">View All</Link>
          </div>
          <div className="space-y-3">
            {feed?.news.map((item, i) => (
              <div key={i} className="bg-white p-4 rounded-lg border border-slate-custom-100 hover:border-primary/40 transition-all cursor-pointer group flex gap-4 items-start">
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
            ))}
          </div>
        </div>

        {/* Catalysts */}
        <div className="lg:col-span-2">
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
