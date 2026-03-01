"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Legend,
} from "recharts";
import type { MonitoredAccountRow } from "./account-card";

type Granularity = "day" | "hour";

interface AccountAnalyticsChartProps {
  accounts: MonitoredAccountRow[];
}

const RANGE_OPTIONS: Record<Granularity, Array<{ value: number; label: string }>> = {
  day: [
    { value: 7, label: "7d" },
    { value: 14, label: "14d" },
    { value: 30, label: "30d" },
    { value: 90, label: "90d" },
  ],
  hour: [
    { value: 1, label: "24h" },
    { value: 2, label: "48h" },
    { value: 3, label: "3d" },
    { value: 7, label: "7d" },
  ],
};

const ACCOUNT_COLORS = [
  "#6366f1",
  "#10b981",
  "#f59e0b",
  "#ef4444",
  "#8b5cf6",
  "#3b82f6",
  "#f97316",
  "#14b8a6",
];

export function AccountAnalyticsChart({ accounts }: AccountAnalyticsChartProps) {
  // Default: all accounts selected
  const [selectedIds, setSelectedIds] = useState<Set<string>>(
    () => new Set(accounts.map((a) => a.id)),
  );
  const [granularity, setGranularity] = useState<Granularity>("hour");
  const [days, setDays] = useState(1);
  const [chartData, setChartData] = useState<Record<string, number | string>[]>([]);
  const [accountMap, setAccountMap] = useState<Record<string, string>>({});
  const [summary, setSummary] = useState<Record<string, { totalReplies: number; totalCost: number }>>({});
  const [loading, setLoading] = useState(false);
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const [search, setSearch] = useState("");
  const [sortField, setSortField] = useState<"replies" | "cost">("replies");
  const [sortDir, setSortDir] = useState<"desc" | "asc">("desc");
  const dropdownRef = useRef<HTMLDivElement>(null);
  const searchRef = useRef<HTMLInputElement>(null);

  // Close dropdown on outside click
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setDropdownOpen(false);
      }
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  // Focus search input when dropdown opens
  useEffect(() => {
    if (dropdownOpen) {
      setTimeout(() => searchRef.current?.focus(), 0);
    } else {
      setSearch("");
    }
  }, [dropdownOpen]);

  // Stable key to use as effect dependency — avoids firing on every render
  const selectedIdsKey = useMemo(
    () => [...selectedIds].sort().join(","),
    [selectedIds],
  );

  useEffect(() => {
    if (selectedIds.size === 0) {
      setChartData([]);
      setSummary({});
      return;
    }
    setLoading(true);
    fetch(
      `/api/dashboard/engagement/analytics?accountIds=${selectedIdsKey}&days=${days}&granularity=${granularity}`,
    )
      .then((r) => r.json())
      .then((d) => {
        const map: Record<string, string> = d.accountMap ?? {};
        const series: Record<string, Array<{ date: string; replies: number; cost: number }>> =
          d.series ?? {};
        setAccountMap(map);
        setSummary(d.summary ?? {});

        // Collect all unique date buckets across all accounts
        const allDates = new Set<string>();
        Object.values(series).forEach((pts) => pts.forEach((p) => allDates.add(p.date)));
        const sortedDates = [...allDates].sort();

        // Pivot into a flat array for Recharts
        const pivoted = sortedDates.map((date) => {
          const point: Record<string, number | string> = { date };
          Object.entries(series).forEach(([accountId, pts]) => {
            const match = pts.find((p) => p.date === date);
            point[`r_${accountId}`] = match?.replies ?? 0;
          });
          return point;
        });

        setChartData(pivoted);
      })
      .finally(() => setLoading(false));
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedIdsKey, days, granularity]);

  const handleGranularityChange = (g: Granularity) => {
    setGranularity(g);
    setDays(g === "hour" ? 1 : 30);
  };

  const handleToggleAccount = (id: string) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  };

  const handleToggleAll = () => {
    if (selectedIds.size === accounts.length) {
      setSelectedIds(new Set());
    } else {
      setSelectedIds(new Set(accounts.map((a) => a.id)));
    }
  };

  const filteredAccounts = search
    ? accounts.filter(
        (a) =>
          a.username.toLowerCase().includes(search.toLowerCase()) ||
          (a.displayName ?? "").toLowerCase().includes(search.toLowerCase()),
      )
    : accounts;

  // Ordered list of active IDs (preserves stable color assignment)
  const activeAccountIds = accounts.map((a) => a.id).filter((id) => selectedIds.has(id));

  // Per-account sorted IDs for the breakdown table
  const sortedAccountIds = [...activeAccountIds].sort((a, b) => {
    const sa = summary[a];
    const sb = summary[b];
    if (!sa || !sb) return 0;
    const valA = sortField === "replies" ? sa.totalReplies : sa.totalCost;
    const valB = sortField === "replies" ? sb.totalReplies : sb.totalCost;
    return sortDir === "desc" ? valB - valA : valA - valB;
  });

  function handleSort(field: "replies" | "cost") {
    if (sortField === field) {
      setSortDir((d) => (d === "desc" ? "asc" : "desc"));
    } else {
      setSortField(field);
      setSortDir("desc");
    }
  }

  const formatXAxisTick = (dateStr: string) => {
    const d = new Date(dateStr);
    if (granularity === "hour") {
      return d.toLocaleTimeString("en-US", { hour: "numeric", hour12: true });
    }
    return d.toLocaleDateString("en-US", { month: "short", day: "numeric" });
  };

  const formatTooltipLabel = (dateStr: string) => {
    const d = new Date(dateStr);
    if (granularity === "hour") {
      return d.toLocaleString("en-US", {
        month: "short",
        day: "numeric",
        hour: "numeric",
        minute: "2-digit",
        hour12: true,
      });
    }
    return d.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
  };

  const CustomTooltip = ({
    active,
    payload,
    label,
  }: {
    active?: boolean;
    payload?: Array<{ name: string; value: number; color: string; dataKey: string }>;
    label?: string;
  }) => {
    if (!active || !payload?.length) return null;
    return (
      <div className="bg-card border border-slate-custom-200 rounded-xl shadow-lg px-4 py-3 text-xs min-w-[160px]">
        <p className="font-semibold text-slate-custom-700 mb-2">
          {label ? formatTooltipLabel(label) : ""}
        </p>
        {payload.map((entry) => (
          <div key={entry.dataKey} className="flex items-center gap-2 mb-1">
            <span
              className="w-2 h-2 rounded-full flex-shrink-0"
              style={{ background: entry.color }}
            />
            <span className="text-slate-custom-500">{entry.name}:</span>
            <span className="font-semibold text-slate-custom-900">{entry.value}</span>
          </div>
        ))}
      </div>
    );
  };

  const rangeLabel =
    granularity === "hour" && days === 1 ? "last 24 hours" : `last ${days} days`;

  const totalReplies = Object.values(summary).reduce((s, v) => s + v.totalReplies, 0);
  const totalCost = Object.values(summary).reduce((s, v) => s + v.totalCost, 0);

  const buttonLabel =
    selectedIds.size === 0
      ? "No accounts"
      : selectedIds.size === accounts.length
        ? "All Accounts"
        : `${selectedIds.size} account${selectedIds.size > 1 ? "s" : ""}`;

  return (
    <div className="space-y-4">
      {/* Controls */}
      <div className="bg-card rounded-xl border border-lime-200 shadow-[0_2px_10px_rgba(0,0,0,0.04),0_0_28px_rgba(155,199,84,0.35)] p-4 flex flex-wrap items-center gap-4">
        {/* Multi-account selector */}
        <div className="flex items-center gap-2">
          <span className="text-sm font-medium text-slate-custom-600 whitespace-nowrap">
            Accounts:
          </span>
          <div className="relative" ref={dropdownRef}>
            <button
              onClick={() => setDropdownOpen(!dropdownOpen)}
              className="flex items-center gap-1.5 px-3 py-1.5 text-sm font-semibold rounded-lg border border-slate-custom-200 bg-card text-slate-custom-700 hover:bg-slate-custom-50 transition-colors min-w-[180px]"
            >
              <span className="material-icons-round text-[16px] text-slate-custom-400">group</span>
              <span className="flex-1 text-left truncate">{buttonLabel}</span>
              <span className="material-icons-round text-[14px] flex-shrink-0 text-slate-custom-400">
                {dropdownOpen ? "expand_less" : "expand_more"}
              </span>
            </button>

            {dropdownOpen && (
              <div className="absolute left-0 top-full mt-2 bg-card rounded-xl border border-slate-custom-200 shadow-lg z-50 w-64">
                {/* Search */}
                <div className="p-2 border-b border-slate-custom-100">
                  <div className="flex items-center gap-2 px-2 py-1.5 bg-slate-custom-50 rounded-lg">
                    <span className="material-icons-round text-[16px] text-slate-custom-400">
                      search
                    </span>
                    <input
                      ref={searchRef}
                      type="text"
                      placeholder="Search accounts…"
                      value={search}
                      onChange={(e) => setSearch(e.target.value)}
                      className="flex-1 bg-transparent text-sm text-slate-custom-700 placeholder-slate-custom-400 outline-none"
                    />
                    {search && (
                      <button
                        onClick={() => setSearch("")}
                        className="text-slate-custom-400 hover:text-slate-custom-600"
                      >
                        <span className="material-icons-round text-[14px]">close</span>
                      </button>
                    )}
                  </div>
                </div>

                {/* All toggle — hidden while searching */}
                {!search && (
                  <label className="flex items-center gap-2.5 px-3 py-2 hover:bg-slate-custom-50 cursor-pointer border-b border-slate-custom-100">
                    <input
                      type="checkbox"
                      checked={selectedIds.size === accounts.length}
                      ref={(el) => {
                        if (el)
                          el.indeterminate =
                            selectedIds.size > 0 && selectedIds.size < accounts.length;
                      }}
                      onChange={handleToggleAll}
                      className="rounded border-slate-custom-300 text-primary focus:ring-primary/50"
                    />
                    <span className="text-sm font-semibold text-slate-custom-700">All</span>
                    <span className="ml-auto text-xs text-slate-custom-400">
                      {selectedIds.size}/{accounts.length}
                    </span>
                  </label>
                )}

                {/* Account list */}
                <div className="max-h-56 overflow-y-auto py-1">
                  {filteredAccounts.length === 0 ? (
                    <p className="px-3 py-3 text-xs text-slate-custom-400 text-center">
                      No accounts found.
                    </p>
                  ) : (
                    filteredAccounts.map((account, i) => {
                      const colorIdx = accounts.findIndex((a) => a.id === account.id);
                      return (
                        <label
                          key={account.id}
                          className="flex items-center gap-2.5 px-3 py-1.5 hover:bg-slate-custom-50 cursor-pointer"
                        >
                          <input
                            type="checkbox"
                            checked={selectedIds.has(account.id)}
                            onChange={() => handleToggleAccount(account.id)}
                            className="rounded border-slate-custom-300 text-primary focus:ring-primary/50 flex-shrink-0"
                          />
                          {/* Color swatch matching chart line */}
                          <span
                            className="w-2 h-2 rounded-full flex-shrink-0"
                            style={{
                              background: ACCOUNT_COLORS[colorIdx % ACCOUNT_COLORS.length],
                            }}
                          />
                          {account.avatarUrl ? (
                            <img
                              src={account.avatarUrl}
                              alt={account.username}
                              className="w-5 h-5 rounded-full object-cover flex-shrink-0"
                              referrerPolicy="no-referrer"
                            />
                          ) : (
                            <div className="w-5 h-5 rounded-full bg-slate-custom-200 flex items-center justify-center text-[10px] font-bold text-slate-custom-500 flex-shrink-0">
                              {account.username[0]?.toUpperCase()}
                            </div>
                          )}
                          <span className="text-sm text-slate-custom-700 truncate">
                            @{account.username}
                          </span>
                        </label>
                      );
                    })
                  )}
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Granularity toggle */}
        <div className="flex items-center rounded-full bg-slate-custom-100 p-0.5 gap-0.5">
          {(["day", "hour"] as Granularity[]).map((g) => (
            <button
              key={g}
              onClick={() => handleGranularityChange(g)}
              className={`px-3 py-1 text-xs font-semibold rounded-full transition-colors ${
                granularity === g
                  ? "bg-card text-slate-custom-900 shadow-sm"
                  : "text-slate-custom-500 hover:text-slate-custom-700"
              }`}
            >
              {g === "day" ? "By Day" : "By Hour"}
            </button>
          ))}
        </div>

        {/* Range selector */}
        <div className="flex items-center gap-1">
          {RANGE_OPTIONS[granularity].map((opt) => (
            <button
              key={opt.value}
              onClick={() => setDays(opt.value)}
              className={`px-3 py-1.5 text-xs font-semibold rounded-full transition-colors ${
                days === opt.value
                  ? "bg-slate-custom-900 text-white"
                  : "bg-slate-custom-50 text-slate-custom-600 hover:bg-slate-custom-100"
              }`}
            >
              {opt.label}
            </button>
          ))}
        </div>
      </div>

      {/* Chart card */}
      <div className="bg-card rounded-xl border border-lime-200 shadow-[0_2px_10px_rgba(0,0,0,0.04),0_0_28px_rgba(155,199,84,0.35)] p-5">
        {selectedIds.size === 0 ? (
          <div className="flex flex-col items-center justify-center py-16">
            <span className="material-icons-round text-[48px] text-slate-custom-300">insights</span>
            <p className="mt-3 text-sm text-slate-custom-500">
              Select at least one account above to view analytics.
            </p>
          </div>
        ) : loading ? (
          <div className="space-y-3 py-8">
            <div className="h-4 bg-slate-custom-50 rounded animate-pulse w-1/3" />
            <div className="h-48 bg-slate-custom-50 rounded animate-pulse" />
          </div>
        ) : chartData.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16">
            <span className="material-icons-round text-[48px] text-slate-custom-300">bar_chart</span>
            <p className="mt-3 text-sm text-slate-custom-500">
              No data for the selected accounts in the {rangeLabel}.
            </p>
          </div>
        ) : (
          <>
            <h3 className="text-sm font-semibold text-slate-custom-700 mb-4">
              {granularity === "hour" ? "Hourly" : "Daily"} Replies — {rangeLabel}
            </h3>
            <ResponsiveContainer width="100%" height={280}>
              <LineChart data={chartData} margin={{ top: 4, right: 16, left: 0, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                <XAxis
                  dataKey="date"
                  tickFormatter={formatXAxisTick}
                  tick={{ fontSize: 11, fill: "#94a3b8" }}
                  tickLine={false}
                  axisLine={false}
                  interval="preserveStartEnd"
                />
                <YAxis
                  allowDecimals={false}
                  tick={{ fontSize: 11, fill: "#94a3b8" }}
                  tickLine={false}
                  axisLine={false}
                  width={32}
                />
                <Tooltip content={<CustomTooltip />} />
                <Legend
                  wrapperStyle={{ fontSize: "12px", paddingTop: "12px" }}
                  iconType="circle"
                  iconSize={8}
                />
                {activeAccountIds.map((accountId, i) => (
                  <Line
                    key={accountId}
                    type="monotone"
                    dataKey={`r_${accountId}`}
                    name={`@${accountMap[accountId] ?? accountId}`}
                    stroke={ACCOUNT_COLORS[i % ACCOUNT_COLORS.length]}
                    strokeWidth={2}
                    dot={false}
                    activeDot={{ r: 4 }}
                  />
                ))}
              </LineChart>
            </ResponsiveContainer>
          </>
        )}
      </div>

      {/* Summary */}
      {selectedIds.size > 0 && Object.keys(summary).length > 0 && (
        <div className="space-y-3">
          {/* Aggregate totals */}
          <div className="grid grid-cols-2 gap-4">
            <div className="bg-card rounded-xl border border-lime-200 shadow-[0_2px_10px_rgba(0,0,0,0.04),0_0_28px_rgba(155,199,84,0.35)] p-4">
              <p className="text-xs font-medium text-slate-custom-500 mb-1">Total Replies</p>
              <p className="text-2xl font-bold text-slate-custom-900">{totalReplies}</p>
              <p className="text-xs text-slate-custom-400 mt-0.5 capitalize">{rangeLabel}</p>
            </div>
            <div className="bg-card rounded-xl border border-lime-200 shadow-[0_2px_10px_rgba(0,0,0,0.04),0_0_28px_rgba(155,199,84,0.35)] p-4">
              <p className="text-xs font-medium text-slate-custom-500 mb-1">Total API Cost</p>
              <p className="text-2xl font-bold text-slate-custom-900">${totalCost.toFixed(4)}</p>
              <p className="text-xs text-slate-custom-400 mt-0.5 capitalize">{rangeLabel}</p>
            </div>
          </div>

          {/* Per-account breakdown (only meaningful when > 1 selected) */}
          {activeAccountIds.length > 1 && (
            <div className="bg-card rounded-xl border border-lime-200 shadow-[0_2px_10px_rgba(0,0,0,0.04),0_0_28px_rgba(155,199,84,0.35)] overflow-hidden">
              <div className="px-4 py-3 border-b border-slate-custom-100 flex items-center justify-between">
                <p className="text-xs font-semibold text-slate-custom-600">Per Account</p>
                <div className="flex items-center gap-6 flex-shrink-0">
                  <button
                    onClick={() => handleSort("replies")}
                    className="flex items-center gap-1 text-[10px] font-semibold text-slate-custom-500 hover:text-slate-custom-900 transition-colors w-14 justify-end"
                  >
                    replies
                    <span className="text-[9px]">
                      {sortField === "replies" ? (sortDir === "desc" ? "↓" : "↑") : "↕"}
                    </span>
                  </button>
                  <button
                    onClick={() => handleSort("cost")}
                    className="flex items-center gap-1 text-[10px] font-semibold text-slate-custom-500 hover:text-slate-custom-900 transition-colors w-14 justify-end"
                  >
                    cost
                    <span className="text-[9px]">
                      {sortField === "cost" ? (sortDir === "desc" ? "↓" : "↑") : "↕"}
                    </span>
                  </button>
                </div>
              </div>
              <div className="divide-y divide-slate-custom-50">
                {sortedAccountIds.map((accountId) => {
                  const s = summary[accountId];
                  if (!s) return null;
                  const account = accounts.find((a) => a.id === accountId);
                  const colorIndex = activeAccountIds.indexOf(accountId);
                  return (
                    <div key={accountId} className="flex items-center justify-between px-4 py-2.5">
                      <div className="flex items-center gap-2.5 min-w-0">
                        <span
                          className="w-2.5 h-2.5 rounded-full flex-shrink-0"
                          style={{ background: ACCOUNT_COLORS[colorIndex % ACCOUNT_COLORS.length] }}
                        />
                        {account?.avatarUrl ? (
                          <img
                            src={account.avatarUrl}
                            alt={account.username}
                            className="w-5 h-5 rounded-full object-cover flex-shrink-0"
                            referrerPolicy="no-referrer"
                          />
                        ) : (
                          <div className="w-5 h-5 rounded-full bg-slate-custom-200 flex items-center justify-center text-[10px] font-bold text-slate-custom-500 flex-shrink-0">
                            {account?.username[0]?.toUpperCase()}
                          </div>
                        )}
                        <span className="text-sm text-slate-custom-700 truncate">
                          @{accountMap[accountId] ?? accountId}
                        </span>
                      </div>
                      <div className="flex items-center gap-6 flex-shrink-0">
                        <div className="text-right w-14">
                          <p className="text-sm font-semibold text-slate-custom-900">
                            {s.totalReplies}
                          </p>
                        </div>
                        <div className="text-right w-14">
                          <p className="text-sm font-semibold text-slate-custom-900">
                            ${s.totalCost.toFixed(4)}
                          </p>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
