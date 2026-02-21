"use client";

import { useCallback, useEffect, useState } from "react";
import type { UserTone } from "@prisma/client";
import { GlobalPauseBanner } from "./global-pause-banner";
import { UsageBar } from "./usage-bar";
import { AccountCard, type MonitoredAccountRow } from "./account-card";
import { ImportFollowingModal } from "./import-following-modal";
import { ReplyMonitoringTable } from "./reply-monitoring-table";
import { AccountAnalyticsChart } from "./account-analytics-chart";
import { ToneSettings } from "./tone-settings";

type TabId = "accounts" | "replies" | "analytics" | "tones";

export default function EngagementPage() {
  const [activeTab, setActiveTab] = useState<TabId>("accounts");
  const [accounts, setAccounts] = useState<MonitoredAccountRow[]>([]);
  const [tones, setTones] = useState<UserTone[]>([]);
  const [loadingAccounts, setLoadingAccounts] = useState(false);
  const [globalPaused, setGlobalPaused] = useState(false);
  const [xTokenError, setXTokenError] = useState(false);
  const [addHandle, setAddHandle] = useState("");
  const [addLoading, setAddLoading] = useState(false);
  const [addError, setAddError] = useState<string | null>(null);

  const fetchAccounts = useCallback(async () => {
    setLoadingAccounts(true);
    try {
      const res = await fetch("/api/dashboard/engagement/accounts");
      const data = await res.json();
      setAccounts(data.accounts ?? []);
      setXTokenError(data.xTokenError ?? false);
    } finally {
      setLoadingAccounts(false);
    }
  }, []);

  const fetchTones = useCallback(async () => {
    try {
      const res = await fetch("/api/dashboard/engagement/tones");
      const data = await res.json();
      setTones(data.tones ?? []);
    } catch {
      // ignore
    }
  }, []);

  const fetchPauseState = useCallback(async () => {
    try {
      const res = await fetch("/api/dashboard/engagement/config");
      const data = await res.json();
      setGlobalPaused(data.globalPaused ?? false);
    } catch {
      // ignore
    }
  }, []);

  useEffect(() => {
    fetchAccounts();
    fetchPauseState();
    fetchTones();
  }, [fetchAccounts, fetchPauseState, fetchTones]);

  const handleAddAccount = async (e: React.FormEvent) => {
    e.preventDefault();
    const handle = addHandle.trim().replace(/^@/, "");
    if (!handle) return;

    setAddLoading(true);
    setAddError(null);
    try {
      const res = await fetch("/api/dashboard/engagement/accounts", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ username: handle }),
      });
      const data = await res.json();
      if (!res.ok) {
        setAddError(data.message || "Failed to add account.");
        return;
      }
      setAddHandle("");
      await fetchAccounts();
    } finally {
      setAddLoading(false);
    }
  };

  const handleUpdate = (updated: MonitoredAccountRow) => {
    setAccounts((prev) => prev.map((a) => (a.id === updated.id ? updated : a)));
  };

  const handleDelete = (id: string) => {
    setAccounts((prev) => prev.filter((a) => a.id !== id));
  };

  return (
    <div className="py-8 space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-slate-custom-900">Engagement Center</h1>
        <p className="mt-1 text-sm text-slate-custom-500">
          Auto-reply to tweets from monitored X accounts.
        </p>
      </div>

      {/* Global pause banner */}
      <GlobalPauseBanner />

      {xTokenError && (
        <div className="flex items-center gap-3 px-4 py-3 bg-amber-50 border border-amber-200 rounded-xl text-sm text-amber-800">
          <span className="material-icons-round text-amber-500 text-[20px]">warning</span>
          <span>
            Your X account connection has expired. Auto-replies are paused.{" "}
            <a href="/dashboard/settings" className="font-semibold underline underline-offset-2">
              Reconnect in Settings →
            </a>
          </span>
        </div>
      )}

      {/* Usage bar */}
      <UsageBar />

      {/* Tabs */}
      <div className="border-b border-slate-custom-200">
        <nav className="flex gap-1">
          {(
            [
              { id: "accounts", label: "Monitored Accounts", icon: "manage_accounts" },
              { id: "replies", label: "Reply Monitoring", icon: "forum" },
              { id: "analytics", label: "Account Analytics", icon: "insights" },
              { id: "tones", label: "Tone Settings", icon: "tune" },
            ] as const
          ).map((tab) => (
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

      {/* Tab: Monitored Accounts */}
      {activeTab === "accounts" && (
        <div className="space-y-6">
          {/* Add account form */}
          <div className="bg-white rounded-xl border border-slate-custom-200 p-5">
            <h2 className="text-sm font-semibold text-slate-custom-900 mb-3">Add Account</h2>
            <form onSubmit={handleAddAccount} className="flex gap-2">
              <input
                type="text"
                placeholder="@handle"
                value={addHandle}
                onChange={(e) => setAddHandle(e.target.value)}
                className="flex-1 px-3 py-2 text-sm border border-slate-custom-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary/30"
              />
              <button
                type="submit"
                disabled={addLoading || !addHandle.trim()}
                className="px-4 py-2 text-sm font-semibold bg-primary text-slate-custom-900 rounded-lg hover:bg-primary/90 transition-colors disabled:opacity-50"
              >
                {addLoading ? "Adding..." : "Add"}
              </button>
              <ImportFollowingModal onAdded={fetchAccounts} />
            </form>
            {addError && <p className="mt-2 text-xs text-red-500">{addError}</p>}
          </div>

          {/* Account grid */}
          {loadingAccounts ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5 gap-4">
              {[...Array(3)].map((_, i) => (
                <div key={i} className="h-44 bg-slate-custom-50 rounded-xl animate-pulse" />
              ))}
            </div>
          ) : accounts.length === 0 ? (
            <div className="bg-white rounded-xl border border-slate-custom-200 p-10 text-center">
              <span className="material-icons-round text-[48px] text-slate-custom-300">
                manage_accounts
              </span>
              <p className="mt-3 text-sm text-slate-custom-500">
                No accounts monitored yet. Add a @handle above or import from your following list.
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5 gap-4">
              {accounts.map((account) => (
                <AccountCard
                  key={account.id}
                  account={account}
                  tones={tones}
                  globalPaused={globalPaused}
                  onUpdate={handleUpdate}
                  onDelete={handleDelete}
                />
              ))}
            </div>
          )}
        </div>
      )}

      {/* Tab: Reply Monitoring */}
      {activeTab === "replies" && <ReplyMonitoringTable accounts={accounts} />}

      {/* Tab: Account Analytics */}
      {activeTab === "analytics" && <AccountAnalyticsChart accounts={accounts} />}

      {/* Tab: Tone Settings */}
      {activeTab === "tones" && (
        <ToneSettings tones={tones} onTonesChange={setTones} />
      )}
    </div>
  );
}
