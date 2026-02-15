"use client";

import { useState } from "react";
import type { AdminMetrics } from "./types";

const tabs = [
  { id: "revenue", label: "Revenue", icon: "attach_money" },
  { id: "users", label: "Users", icon: "group" },
  { id: "ai", label: "AI Usage", icon: "smart_toy" },
  { id: "api", label: "API Activity", icon: "api" },
] as const;

type TabId = (typeof tabs)[number]["id"];

function fmt(n: number): string {
  return n.toLocaleString("en-US");
}

function fmtUSD(n: number): string {
  return n.toLocaleString("en-US", { style: "currency", currency: "USD", minimumFractionDigits: 2 });
}

function fmtPct(n: number): string {
  return (n * 100).toFixed(1) + "%";
}

export default function AdminDashboard({ metrics }: { metrics: AdminMetrics }) {
  const [activeTab, setActiveTab] = useState<TabId>("revenue");
  const [refreshing, setRefreshing] = useState(false);
  const [data, setData] = useState(metrics);

  const handleRefresh = async () => {
    setRefreshing(true);
    try {
      const res = await fetch("/api/dashboard/admin/metrics");
      if (res.ok) {
        const json = await res.json();
        setData(json);
      }
    } finally {
      setRefreshing(false);
    }
  };

  const totalAICost30d = data.aiUsage.dailyCostTrend.reduce((s, d) => s + d.cost, 0);

  return (
    <div className="py-8 px-4 sm:px-6 lg:px-8 h-full overflow-y-auto">
      {/* Header */}
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-2xl font-bold text-slate-custom-900">Admin Console</h1>
          <p className="mt-1 text-sm text-slate-custom-500">
            Platform-level metrics and analytics.
          </p>
        </div>
        <button
          onClick={handleRefresh}
          disabled={refreshing}
          className="flex items-center gap-2 px-4 py-2 text-sm font-medium rounded-lg border border-slate-custom-200 text-slate-custom-700 hover:bg-slate-custom-50 transition-all disabled:opacity-50"
        >
          <span className={`material-icons-round text-[18px] ${refreshing ? "animate-spin" : ""}`}>
            refresh
          </span>
          Refresh
        </button>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        <KPICard icon="trending_up" label="ARR" value={fmtUSD(data.mrr.arr)} />
        <KPICard icon="group" label="Total Users" value={fmt(data.users.totalUsers)} />
        <KPICard icon="smart_toy" label="AI Cost (30d)" value={fmtUSD(totalAICost30d)} />
        <KPICard icon="api" label="API Requests (30d)" value={fmt(data.apiActivity.requestsThisMonth)} />
      </div>

      {/* Tab Navigation */}
      <div className="border-b border-slate-custom-200 mb-6">
        <nav className="flex gap-1">
          {tabs.map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`flex items-center gap-2 px-4 py-2.5 text-sm font-medium border-b-2 transition-all ${
                activeTab === tab.id
                  ? "border-primary text-slate-custom-900"
                  : "border-transparent text-slate-custom-500 hover:text-slate-custom-700 hover:border-slate-custom-300"
              }`}
            >
              <span className="material-icons-round text-[18px]">{tab.icon}</span>
              {tab.label}
            </button>
          ))}
        </nav>
      </div>

      {/* Tab Content */}
      {activeTab === "revenue" && <RevenueTab data={data} />}
      {activeTab === "users" && <UsersTab data={data} />}
      {activeTab === "ai" && <AIUsageTab data={data} />}
      {activeTab === "api" && <APIActivityTab data={data} />}
    </div>
  );
}

// ── KPI Card ──────────────────────────────────────────────────────────────────

function KPICard({ icon, label, value }: { icon: string; label: string; value: string }) {
  return (
    <div className="bg-white rounded-xl border border-slate-custom-200 p-5">
      <div className="flex items-center gap-3 mb-2">
        <span className="material-icons-round text-[20px] text-primary">{icon}</span>
        <span className="text-sm font-medium text-slate-custom-500">{label}</span>
      </div>
      <p className="text-2xl font-bold text-slate-custom-900">{value}</p>
    </div>
  );
}

// ── Revenue Tab ───────────────────────────────────────────────────────────────

function RevenueTab({ data }: { data: AdminMetrics }) {
  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <MetricCard label="MRR" value={fmtUSD(data.mrr.mrr)} />
        <MetricCard label="ARR" value={fmtUSD(data.mrr.arr)} />
        <MetricCard label="New Subs (This Month)" value={fmt(data.revenue.newSubsThisMonth)} />
      </div>

      <Card title="Subscribers by Tier">
        {data.revenue.subscribersByTier.length === 0 ? (
          <p className="text-sm text-slate-custom-500">No active subscriptions.</p>
        ) : (
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-slate-custom-100">
                <th className="text-left py-2 font-medium text-slate-custom-500">Tier</th>
                <th className="text-right py-2 font-medium text-slate-custom-500">Subscribers</th>
              </tr>
            </thead>
            <tbody>
              {data.revenue.subscribersByTier.map((row) => (
                <tr key={row.tier} className="border-b border-slate-custom-50">
                  <td className="py-2 text-slate-custom-800">{row.tier}</td>
                  <td className="py-2 text-right text-slate-custom-800">{fmt(row.count)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </Card>

      <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 flex items-center gap-3">
        <span className="material-icons-round text-[20px] text-amber-600">warning</span>
        <div>
          <p className="text-sm font-medium text-amber-800">
            Cancel-pending subscriptions: {fmt(data.revenue.cancelPendingCount)}
          </p>
          <p className="text-xs text-amber-600">
            These will cancel at the end of their billing period.
          </p>
        </div>
      </div>

      <Card title="Webhook Health">
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-4">
          <div className="bg-slate-custom-50 rounded-lg p-3">
            <p className="text-xs font-medium text-slate-custom-500 mb-1">Events (24h)</p>
            <p className="text-lg font-bold text-slate-custom-900">{fmt(data.webhookHealth.eventsLast24h)}</p>
          </div>
          <div className="bg-slate-custom-50 rounded-lg p-3">
            <p className="text-xs font-medium text-slate-custom-500 mb-1">Events (7d)</p>
            <p className="text-lg font-bold text-slate-custom-900">{fmt(data.webhookHealth.eventsLast7d)}</p>
          </div>
          <div className="bg-slate-custom-50 rounded-lg p-3">
            <p className="text-xs font-medium text-slate-custom-500 mb-1">Last Processed</p>
            <p className="text-lg font-bold text-slate-custom-900">
              {data.webhookHealth.lastProcessedAt
                ? new Date(data.webhookHealth.lastProcessedAt).toLocaleString()
                : "Never"}
            </p>
          </div>
        </div>
        <p className="text-xs text-slate-custom-500 mb-2">
          Total events processed (all time): {fmt(data.webhookHealth.totalEventsProcessed)}
        </p>
        {data.webhookHealth.eventsByType.length === 0 ? (
          <p className="text-sm text-slate-custom-500">No webhook events in the last 30 days.</p>
        ) : (
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-slate-custom-100">
                <th className="text-left py-2 font-medium text-slate-custom-500">Event Type</th>
                <th className="text-right py-2 font-medium text-slate-custom-500">Count (30d)</th>
              </tr>
            </thead>
            <tbody>
              {data.webhookHealth.eventsByType.map((row) => (
                <tr key={row.eventType} className="border-b border-slate-custom-50">
                  <td className="py-2 text-slate-custom-800 font-mono text-xs">{row.eventType}</td>
                  <td className="py-2 text-right text-slate-custom-800">{fmt(row.count)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </Card>
    </div>
  );
}

// ── Users Tab ─────────────────────────────────────────────────────────────────

function UsersTab({ data }: { data: AdminMetrics }) {
  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <MetricCard label="Total Users" value={fmt(data.users.totalUsers)} />
        <MetricCard label="New (7d)" value={fmt(data.users.newLast7d)} />
        <MetricCard label="New (30d)" value={fmt(data.users.newLast30d)} />
        <MetricCard label="Active (7d)" value={fmt(data.users.activeUsersLast7d)} />
      </div>

      <Card title="Users by Tier">
        {data.users.usersByTier.length === 0 ? (
          <p className="text-sm text-slate-custom-500">No data.</p>
        ) : (
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-slate-custom-100">
                <th className="text-left py-2 font-medium text-slate-custom-500">Tier</th>
                <th className="text-right py-2 font-medium text-slate-custom-500">Users</th>
              </tr>
            </thead>
            <tbody>
              {data.users.usersByTier.map((row) => (
                <tr key={row.tier} className="border-b border-slate-custom-50">
                  <td className="py-2 text-slate-custom-800">{row.tier}</td>
                  <td className="py-2 text-right text-slate-custom-800">{fmt(row.count)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </Card>
    </div>
  );
}

// ── AI Usage Tab ──────────────────────────────────────────────────────────────

function AIUsageTab({ data }: { data: AdminMetrics }) {
  const totalAICost = data.aiUsage.dailyCostTrend.reduce((s, d) => s + d.cost, 0);
  return (
    <div className="space-y-6">
      <MetricCard label="Total AI Cost (30d)" value={fmtUSD(totalAICost)} />

      <Card title="Usage by Model">
        {data.aiUsage.byModel.length === 0 ? (
          <p className="text-sm text-slate-custom-500">No AI usage data.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-slate-custom-100">
                  <th className="text-left py-2 font-medium text-slate-custom-500">Model</th>
                  <th className="text-right py-2 font-medium text-slate-custom-500">Requests</th>
                  <th className="text-right py-2 font-medium text-slate-custom-500">Cost</th>
                  <th className="text-right py-2 font-medium text-slate-custom-500">Success</th>
                  <th className="text-right py-2 font-medium text-slate-custom-500">Input Tokens</th>
                  <th className="text-right py-2 font-medium text-slate-custom-500">Output Tokens</th>
                  <th className="text-right py-2 font-medium text-slate-custom-500">Avg Latency</th>
                </tr>
              </thead>
              <tbody>
                {data.aiUsage.byModel.map((m) => (
                  <tr key={m.model} className="border-b border-slate-custom-50">
                    <td className="py-2 text-slate-custom-800 font-medium">{m.model}</td>
                    <td className="py-2 text-right text-slate-custom-800">{fmt(m.requestCount)}</td>
                    <td className="py-2 text-right text-slate-custom-800">{fmtUSD(m.totalCost)}</td>
                    <td className="py-2 text-right text-slate-custom-800">{fmtPct(m.successRate)}</td>
                    <td className="py-2 text-right text-slate-custom-800">{fmt(m.inputTokens)}</td>
                    <td className="py-2 text-right text-slate-custom-800">{fmt(m.outputTokens)}</td>
                    <td className="py-2 text-right text-slate-custom-800">{fmt(m.avgLatencyMs)}ms</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Card>

      <Card title="Daily Cost Trend (30d)">
        {data.aiUsage.dailyCostTrend.length === 0 ? (
          <p className="text-sm text-slate-custom-500">No cost data for the last 30 days.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-slate-custom-100">
                  <th className="text-left py-2 font-medium text-slate-custom-500">Date</th>
                  <th className="text-right py-2 font-medium text-slate-custom-500">Cost</th>
                </tr>
              </thead>
              <tbody>
                {data.aiUsage.dailyCostTrend.map((d) => (
                  <tr key={d.date} className="border-b border-slate-custom-50">
                    <td className="py-2 text-slate-custom-800">{d.date}</td>
                    <td className="py-2 text-right text-slate-custom-800">{fmtUSD(d.cost)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Card>
    </div>
  );
}

// ── API Activity Tab ──────────────────────────────────────────────────────────

function APIActivityTab({ data }: { data: AdminMetrics }) {
  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <MetricCard label="Requests Today" value={fmt(data.apiActivity.requestsToday)} />
        <MetricCard label="Requests (7d)" value={fmt(data.apiActivity.requestsThisWeek)} />
        <MetricCard label="Requests (30d)" value={fmt(data.apiActivity.requestsThisMonth)} />
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <MetricCard label="Avg Response Time" value={`${fmt(data.apiActivity.avgResponseTimeMs)}ms`} />
        <MetricCard label="Error Rate (30d)" value={fmtPct(data.apiActivity.errorRate)} />
      </div>

      <Card title="Top Endpoints (30d)">
        {data.apiActivity.topEndpoints.length === 0 ? (
          <p className="text-sm text-slate-custom-500">No API activity data.</p>
        ) : (
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-slate-custom-100">
                <th className="text-left py-2 font-medium text-slate-custom-500">Method</th>
                <th className="text-left py-2 font-medium text-slate-custom-500">Endpoint</th>
                <th className="text-right py-2 font-medium text-slate-custom-500">Requests</th>
              </tr>
            </thead>
            <tbody>
              {data.apiActivity.topEndpoints.map((ep, i) => (
                <tr key={i} className="border-b border-slate-custom-50">
                  <td className="py-2">
                    <span className="inline-block px-2 py-0.5 text-xs font-mono font-medium rounded bg-slate-custom-100 text-slate-custom-700">
                      {ep.method}
                    </span>
                  </td>
                  <td className="py-2 text-slate-custom-800 font-mono text-xs">{ep.endpoint}</td>
                  <td className="py-2 text-right text-slate-custom-800">{fmt(ep.count)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </Card>

      <Card title="Requests by Tier (30d)">
        {data.apiActivity.requestsByTier.length === 0 ? (
          <p className="text-sm text-slate-custom-500">No data.</p>
        ) : (
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-slate-custom-100">
                <th className="text-left py-2 font-medium text-slate-custom-500">Tier</th>
                <th className="text-right py-2 font-medium text-slate-custom-500">Requests</th>
              </tr>
            </thead>
            <tbody>
              {data.apiActivity.requestsByTier.map((row) => (
                <tr key={row.tier} className="border-b border-slate-custom-50">
                  <td className="py-2 text-slate-custom-800">{row.tier}</td>
                  <td className="py-2 text-right text-slate-custom-800">{fmt(row.count)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </Card>
    </div>
  );
}

// ── Shared Components ─────────────────────────────────────────────────────────

function MetricCard({ label, value }: { label: string; value: string }) {
  return (
    <div className="bg-white rounded-xl border border-slate-custom-200 p-4">
      <p className="text-xs font-medium text-slate-custom-500 mb-1">{label}</p>
      <p className="text-xl font-bold text-slate-custom-900">{value}</p>
    </div>
  );
}

function Card({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="bg-white rounded-xl border border-slate-custom-200 p-5">
      <h3 className="text-sm font-semibold text-slate-custom-900 mb-4">{title}</h3>
      {children}
    </div>
  );
}
