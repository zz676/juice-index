"use client";

import { useState } from "react";
import type { ReplyTone } from "@prisma/client";

export interface MonitoredAccountRow {
  id: string;
  username: string;
  displayName: string | null;
  avatarUrl: string | null;
  tone: ReplyTone;
  customTonePrompt: string | null;
  alwaysGenerateImage: boolean;
  enabled: boolean;
}

const TONES: { value: ReplyTone; label: string }[] = [
  { value: "NEUTRAL", label: "Neutral" },
  { value: "PROFESSIONAL", label: "Professional" },
  { value: "HUMOR", label: "Humor" },
  { value: "SARCASTIC", label: "Sarcastic" },
  { value: "HUGE_FAN", label: "Huge Fan" },
  { value: "CHEERS", label: "Cheers" },
];

const TONE_COLORS: Record<ReplyTone, string> = {
  NEUTRAL: "bg-slate-100 text-slate-600",
  PROFESSIONAL: "bg-blue-100 text-blue-700",
  HUMOR: "bg-yellow-100 text-yellow-700",
  SARCASTIC: "bg-orange-100 text-orange-700",
  HUGE_FAN: "bg-pink-100 text-pink-700",
  CHEERS: "bg-green-100 text-green-700",
};

interface AccountCardProps {
  account: MonitoredAccountRow;
  globalPaused: boolean;
  onUpdate: (updated: MonitoredAccountRow) => void;
  onDelete: (id: string) => void;
}

export function AccountCard({ account, globalPaused, onUpdate, onDelete }: AccountCardProps) {
  const [loading, setLoading] = useState(false);
  const [deleting, setDeleting] = useState(false);

  const patch = async (data: Partial<MonitoredAccountRow>) => {
    setLoading(true);
    try {
      const res = await fetch(`/api/dashboard/engagement/accounts/${account.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });
      if (res.ok) {
        const json = await res.json();
        onUpdate(json.account as MonitoredAccountRow);
      }
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async () => {
    if (!confirm(`Stop monitoring @${account.username}?`)) return;
    setDeleting(true);
    try {
      const res = await fetch(`/api/dashboard/engagement/accounts/${account.id}`, {
        method: "DELETE",
      });
      if (res.ok || res.status === 204) {
        onDelete(account.id);
      }
    } finally {
      setDeleting(false);
    }
  };

  const handleToggleEnabled = () => {
    if (globalPaused) return;
    patch({ enabled: !account.enabled });
  };

  return (
    <div className="bg-white rounded-xl border border-slate-custom-200 p-4 flex flex-col gap-3">
      {/* Header */}
      <div className="flex items-center gap-3">
        {account.avatarUrl ? (
          <img
            src={account.avatarUrl}
            alt={account.username}
            className="w-10 h-10 rounded-full object-cover flex-shrink-0"
            referrerPolicy="no-referrer"
          />
        ) : (
          <div className="w-10 h-10 rounded-full bg-slate-custom-200 flex items-center justify-center text-slate-custom-500 font-semibold flex-shrink-0">
            {account.username[0]?.toUpperCase()}
          </div>
        )}
        <div className="flex-1 min-w-0">
          <p className="text-sm font-semibold text-slate-custom-900 truncate">
            {account.displayName || `@${account.username}`}
          </p>
          <p className="text-xs text-slate-custom-500">@{account.username}</p>
        </div>
        {/* Enable/disable toggle */}
        <div className="relative group flex-shrink-0">
          <div
            role="switch"
            aria-checked={account.enabled}
            aria-label={account.enabled ? "Disable" : "Enable"}
            onClick={!loading && !globalPaused ? handleToggleEnabled : undefined}
            className={`relative w-11 h-6 rounded-full transition-colors ${
              account.enabled && !globalPaused ? "bg-primary" : "bg-slate-custom-200"
            } ${globalPaused || loading ? "opacity-50 cursor-not-allowed" : "cursor-pointer"}`}
          >
            <div
              className={`absolute top-0.5 left-0.5 w-5 h-5 bg-white rounded-full shadow transition-transform ${
                account.enabled ? "translate-x-5" : "translate-x-0"
              }`}
            />
          </div>
          {globalPaused && (
            <div className="absolute right-0 bottom-full mb-1 px-2 py-1 text-xs bg-slate-custom-800 text-white rounded-lg whitespace-nowrap opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none z-10">
              Global pause is active
            </div>
          )}
        </div>
      </div>

      {/* Tone selector */}
      <div>
        <p className="text-xs font-medium text-slate-custom-500 mb-1.5">Reply Tone</p>
        <div className="flex flex-wrap gap-1.5">
          {TONES.map(({ value, label }) => (
            <button
              key={value}
              onClick={() => patch({ tone: value })}
              disabled={loading}
              className={`px-2 py-0.5 text-xs font-medium rounded-full transition-colors ${
                account.tone === value
                  ? TONE_COLORS[value] + " ring-2 ring-offset-1 ring-current"
                  : "bg-slate-custom-50 text-slate-custom-500 hover:bg-slate-custom-100"
              }`}
            >
              {label}
            </button>
          ))}
        </div>
      </div>

      {/* Image toggle */}
      <div className="flex items-center justify-between">
        <span className="text-xs text-slate-custom-600">Always generate image</span>
        <div
          role="switch"
          aria-checked={account.alwaysGenerateImage}
          aria-label="Toggle image generation"
          onClick={!loading ? () => patch({ alwaysGenerateImage: !account.alwaysGenerateImage }) : undefined}
          className={`relative w-11 h-6 rounded-full transition-colors ${
            account.alwaysGenerateImage ? "bg-primary" : "bg-slate-custom-200"
          } ${loading ? "opacity-50 cursor-not-allowed" : "cursor-pointer"}`}
        >
          <div
            className={`absolute top-0.5 left-0.5 w-5 h-5 bg-white rounded-full shadow transition-transform ${
              account.alwaysGenerateImage ? "translate-x-5" : "translate-x-0"
            }`}
          />
        </div>
      </div>

      {/* Delete */}
      <button
        onClick={handleDelete}
        disabled={deleting}
        className="flex items-center gap-1.5 text-xs text-red-500 hover:text-red-700 transition-colors mt-1 disabled:opacity-50"
      >
        <span className="material-icons-round text-[14px]">delete</span>
        {deleting ? "Removing..." : "Remove"}
      </button>
    </div>
  );
}
