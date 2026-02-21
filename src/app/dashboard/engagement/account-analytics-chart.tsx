"use client";

import { useEffect, useRef, useState } from "react";
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

interface AnalyticsDataPoint {
  date: string;
  replies: number;
  cost: number;
}

interface AnalyticsSummary {
  totalReplies: number;
  totalCost: number;
}

interface AccountAnalyticsChartProps {
  accounts: MonitoredAccountRow[];
}

const DAYS_OPTIONS = [
  { value: 7, label: "7 days" },
  { value: 14, label: "14 days" },
  { value: 30, label: "30 days" },
  { value: 90, label: "90 days" },
];

export function AccountAnalyticsChart({ accounts }: AccountAnalyticsChartProps) {
  const [selectedAccountId, setSelectedAccountId] = useState<string | null>(
    accounts.length === 1 ? accounts[0].id : null,
  );
  const [days, setDays] = useState(30);
  const [data, setData] = useState<AnalyticsDataPoint[]>([]);
  const [summary, setSummary] = useState<AnalyticsSummary | null>(null);
  const [loading, setLoading] = useState(false);
  const [accountDropdownOpen, setAccountDropdownOpen] = useState(false);
  const accountDropdownRef = useRef<HTMLDivElement>(null);

  // Close dropdown when clicking outside
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (accountDropdownRef.current && !accountDropdownRef.current.contains(e.target as Node)) {
        setAccountDropdownOpen(false);
      }
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  useEffect(() => {
    if (!selectedAccountId) return;
    setLoading(true);
    fetch(`/api/dashboard/engagement/analytics?accountId=${selectedAccountId}&days=${days}`)
      .then((r) => r.json())
      .then((d) => {
        setData(d.data ?? []);
        setSummary(d.summary ?? null);
      })
      .finally(() => setLoading(false));
  }, [selectedAccountId, days]);

  const selectedAccount = accounts.find((a) => a.id === selectedAccountId) ?? null;

  const formatDate = (dateStr: string) => {
    const d = new Date(dateStr + "T00:00:00");
    return d.toLocaleDateString("en-US", { month: "short", day: "numeric" });
  };

  const CustomTooltip = ({
    active,
    payload,
    label,
  }: {
    active?: boolean;
    payload?: Array<{ name: string; value: number; color: string }>;
    label?: string;
  }) => {
    if (!active || !payload?.length) return null;
    return (
      <div className="bg-white border border-slate-custom-200 rounded-xl shadow-lg px-4 py-3 text-xs">
        <p className="font-semibold text-slate-custom-700 mb-2">
          {label ? formatDate(label) : ""}
        </p>
        {payload.map((entry) => (
          <div key={entry.name} className="flex items-center gap-2 mb-1">
            <span className="w-2 h-2 rounded-full flex-shrink-0" style={{ background: entry.color }} />
            <span className="text-slate-custom-500">{entry.name}:</span>
            <span className="font-semibold text-slate-custom-900">
              {entry.name === "Cost" ? `$${entry.value.toFixed(4)}` : entry.value}
            </span>
          </div>
        ))}
      </div>
    );
  };

  return (
    <div className="space-y-4">
      {/* Controls */}
      <div className="bg-white rounded-xl border border-slate-custom-200 p-4 flex flex-wrap items-center gap-4">
        {/* Account selector */}
        <div className="flex items-center gap-2 flex-1 min-w-0">
          <span className="text-sm font-medium text-slate-custom-600 whitespace-nowrap">Account:</span>
          <div className="relative" ref={accountDropdownRef}>
            <button
              onClick={() => setAccountDropdownOpen(!accountDropdownOpen)}
              className="flex items-center gap-1.5 px-3 py-1.5 text-sm font-semibold rounded-lg border border-slate-custom-200 bg-white text-slate-custom-700 hover:bg-slate-custom-50 transition-colors min-w-[160px]"
            >
              {selectedAccount ? (
                <>
                  {selectedAccount.avatarUrl ? (
                    <img
                      src={selectedAccount.avatarUrl}
                      alt={selectedAccount.username}
                      className="w-4 h-4 rounded-full object-cover"
                      referrerPolicy="no-referrer"
                    />
                  ) : (
                    <div className="w-4 h-4 rounded-full bg-slate-custom-200 flex items-center justify-center text-[9px] font-bold text-slate-custom-500">
                      {selectedAccount.username[0]?.toUpperCase()}
                    </div>
                  )}
                  <span className="truncate">@{selectedAccount.username}</span>
                </>
              ) : (
                <span className="text-slate-custom-400">Select account…</span>
              )}
              <span className="material-icons-round text-[14px] ml-auto flex-shrink-0">
                {accountDropdownOpen ? "expand_less" : "expand_more"}
              </span>
            </button>

            {accountDropdownOpen && (
              <div className="absolute left-0 top-full mt-2 bg-white rounded-xl border border-slate-custom-200 shadow-lg py-2 z-50 w-52 max-h-60 overflow-y-auto">
                {accounts.map((account) => (
                  <button
                    key={account.id}
                    onClick={() => {
                      setSelectedAccountId(account.id);
                      setAccountDropdownOpen(false);
                    }}
                    className={`w-full flex items-center gap-2.5 px-3 py-1.5 hover:bg-slate-custom-50 transition-colors ${
                      selectedAccountId === account.id
                        ? "text-primary font-semibold"
                        : "text-slate-custom-700"
                    }`}
                  >
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
                    <span className="text-sm truncate">@{account.username}</span>
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Days range selector */}
        <div className="flex items-center gap-1">
          {DAYS_OPTIONS.map((opt) => (
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
      <div className="bg-white rounded-xl border border-slate-custom-200 p-5">
        {!selectedAccountId ? (
          <div className="flex flex-col items-center justify-center py-16">
            <span className="material-icons-round text-[48px] text-slate-custom-300">insights</span>
            <p className="mt-3 text-sm text-slate-custom-500">
              Select an account above to view analytics.
            </p>
          </div>
        ) : loading ? (
          <div className="space-y-3 py-8">
            <div className="h-4 bg-slate-custom-50 rounded animate-pulse w-1/3" />
            <div className="h-48 bg-slate-custom-50 rounded animate-pulse" />
          </div>
        ) : data.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16">
            <span className="material-icons-round text-[48px] text-slate-custom-300">bar_chart</span>
            <p className="mt-3 text-sm text-slate-custom-500">
              No data for the selected account in the last {days} days.
            </p>
          </div>
        ) : (
          <>
            <h3 className="text-sm font-semibold text-slate-custom-700 mb-4">
              Daily Activity — last {days} days
            </h3>
            <ResponsiveContainer width="100%" height={280}>
              <LineChart data={data} margin={{ top: 4, right: 16, left: 0, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                <XAxis
                  dataKey="date"
                  tickFormatter={formatDate}
                  tick={{ fontSize: 11, fill: "#94a3b8" }}
                  tickLine={false}
                  axisLine={false}
                  interval="preserveStartEnd"
                />
                <YAxis
                  yAxisId="left"
                  allowDecimals={false}
                  tick={{ fontSize: 11, fill: "#94a3b8" }}
                  tickLine={false}
                  axisLine={false}
                  width={32}
                />
                <YAxis
                  yAxisId="right"
                  orientation="right"
                  tickFormatter={(v: number) => `$${v.toFixed(3)}`}
                  tick={{ fontSize: 11, fill: "#94a3b8" }}
                  tickLine={false}
                  axisLine={false}
                  width={56}
                />
                <Tooltip content={<CustomTooltip />} />
                <Legend
                  wrapperStyle={{ fontSize: "12px", paddingTop: "12px" }}
                  iconType="circle"
                  iconSize={8}
                />
                <Line
                  yAxisId="left"
                  type="monotone"
                  dataKey="replies"
                  name="Replies"
                  stroke="#6366f1"
                  strokeWidth={2}
                  dot={false}
                  activeDot={{ r: 4 }}
                />
                <Line
                  yAxisId="right"
                  type="monotone"
                  dataKey="cost"
                  name="Cost"
                  stroke="#f59e0b"
                  strokeWidth={2}
                  dot={false}
                  activeDot={{ r: 4 }}
                />
              </LineChart>
            </ResponsiveContainer>
          </>
        )}
      </div>

      {/* Summary stats */}
      {selectedAccountId && summary && (
        <div className="grid grid-cols-2 gap-4">
          <div className="bg-white rounded-xl border border-slate-custom-200 p-4">
            <p className="text-xs font-medium text-slate-custom-500 mb-1">Total Replies</p>
            <p className="text-2xl font-bold text-slate-custom-900">{summary.totalReplies}</p>
            <p className="text-xs text-slate-custom-400 mt-0.5">Last {days} days</p>
          </div>
          <div className="bg-white rounded-xl border border-slate-custom-200 p-4">
            <p className="text-xs font-medium text-slate-custom-500 mb-1">Total API Cost</p>
            <p className="text-2xl font-bold text-slate-custom-900">
              ${summary.totalCost.toFixed(4)}
            </p>
            <p className="text-xs text-slate-custom-400 mt-0.5">Last {days} days</p>
          </div>
        </div>
      )}
    </div>
  );
}
