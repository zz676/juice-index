"use client";

import { useCallback, useRef, useState } from "react";
import type { UserTone } from "@prisma/client";
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
  accountContext: string | null;
  toneWeights: Record<string, number> | null;
  temperature: number;
}

const COLOR_DOT: Record<string, string> = {
  slate: "bg-slate-400",
  blue: "bg-blue-500",
  yellow: "bg-yellow-400",
  orange: "bg-orange-400",
  pink: "bg-pink-400",
  green: "bg-green-500",
  purple: "bg-purple-500",
  teal: "bg-teal-500",
};

interface AccountCardProps {
  account: MonitoredAccountRow;
  tones: UserTone[];
  globalPaused: boolean;
  onUpdate: (updated: MonitoredAccountRow) => void;
  onDelete: (id: string) => void;
}

export function AccountCard({ account, tones, globalPaused, onUpdate, onDelete }: AccountCardProps) {
  const [loading, setLoading] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const contextRef = useRef<HTMLTextAreaElement>(null);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const patch = useCallback(
    async (data: Record<string, unknown>) => {
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
    },
    [account.id, onUpdate],
  );

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

  const effectiveWeights: Record<string, number> = account.toneWeights ?? {};

  const handleWeightChange = (toneId: string, value: number) => {
    const newWeights = { ...effectiveWeights, [toneId]: value };
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => {
      patch({ toneWeights: newWeights });
    }, 600);
  };

  const handleTemperatureChange = (value: number) => {
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => {
      patch({ temperature: value });
    }, 600);
  };

  const handleContextBlur = () => {
    const value = contextRef.current?.value ?? "";
    patch({ accountContext: value || null });
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

      {/* Tone weight sliders */}
      {tones.length > 0 && (
        <div>
          <p className="text-xs font-medium text-slate-custom-500 mb-2">Tone Weights</p>
          <div className="flex flex-col gap-2">
            {tones.map((tone) => {
              const weight = effectiveWeights[tone.id] ?? 0;
              return (
                <div key={tone.id} className="flex items-center gap-2">
                  <div
                    className={`w-2.5 h-2.5 rounded-full flex-shrink-0 ${COLOR_DOT[tone.color] ?? "bg-slate-400"}`}
                  />
                  <span className="text-xs text-slate-custom-600 w-20 truncate flex-shrink-0">
                    {tone.name}
                  </span>
                  <input
                    type="range"
                    min={0}
                    max={100}
                    step={5}
                    defaultValue={weight}
                    onChange={(e) => handleWeightChange(tone.id, Number(e.target.value))}
                    className="flex-1 h-1.5 accent-primary"
                    disabled={loading}
                  />
                  <span className="text-xs text-slate-custom-400 w-7 text-right flex-shrink-0">
                    {weight}
                  </span>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Temperature slider */}
      <div>
        <p className="text-xs font-medium text-slate-custom-500 mb-2">
          Creativity
          <span className="ml-1 font-normal text-slate-custom-400">
            ({account.temperature.toFixed(1)})
          </span>
        </p>
        <input
          type="range"
          min={0.1}
          max={1.5}
          step={0.1}
          defaultValue={account.temperature}
          onChange={(e) => handleTemperatureChange(Number(e.target.value))}
          className="w-full h-1.5 accent-primary"
          disabled={loading}
        />
        <div className="flex justify-between text-[10px] text-slate-custom-400 mt-0.5">
          <span>Focused</span>
          <span>Creative</span>
        </div>
      </div>

      {/* Account context textarea */}
      <div>
        <p className="text-xs font-medium text-slate-custom-500 mb-1">Account Context</p>
        <textarea
          ref={contextRef}
          defaultValue={account.accountContext ?? ""}
          onBlur={handleContextBlur}
          rows={2}
          placeholder="e.g., Tech blogger covering AI startups"
          className="w-full text-xs text-slate-custom-700 border border-slate-custom-200 rounded-lg p-2 focus:outline-none focus:ring-2 focus:ring-primary/30 resize-none"
          disabled={loading}
        />
      </div>

      {/* Image toggle */}
      <div className="flex items-center justify-between">
        <span className="text-xs text-slate-custom-600">Generate images (~1/3 of replies)</span>
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
