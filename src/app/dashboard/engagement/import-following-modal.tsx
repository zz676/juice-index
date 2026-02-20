"use client";

import { useState } from "react";

interface FollowingEntry {
  xUserId: string;
  username: string;
  displayName: string | null;
  avatarUrl: string | null;
}

interface ImportFollowingModalProps {
  onAdded: () => void;
}

export function ImportFollowingModal({ onAdded }: ImportFollowingModalProps) {
  const [open, setOpen] = useState(false);
  const [importing, setImporting] = useState(false);
  const [loading, setLoading] = useState(false);
  const [adding, setAdding] = useState(false);
  const [search, setSearch] = useState("");
  const [entries, setEntries] = useState<FollowingEntry[]>([]);
  const [selected, setSelected] = useState<Set<string>>(new Set());

  const fetchFollowing = async (q?: string) => {
    setLoading(true);
    try {
      const params = new URLSearchParams({ limit: "50" });
      if (q) params.set("search", q);
      const res = await fetch(`/api/dashboard/engagement/following?${params}`);
      const data = await res.json();
      setEntries(data.entries ?? []);
    } finally {
      setLoading(false);
    }
  };

  const handleImport = async () => {
    setImporting(true);
    try {
      await fetch("/api/dashboard/engagement/import-following", { method: "POST" });
      await fetchFollowing(search || undefined);
    } finally {
      setImporting(false);
    }
  };

  const handleOpen = async () => {
    setOpen(true);
    setSelected(new Set());
    setSearch("");
    await fetchFollowing();
  };

  const handleSearch = (q: string) => {
    setSearch(q);
    fetchFollowing(q || undefined);
  };

  const toggleSelect = (xUserId: string) => {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(xUserId)) next.delete(xUserId);
      else next.add(xUserId);
      return next;
    });
  };

  const handleAddSelected = async () => {
    const toAdd = entries.filter((e) => selected.has(e.xUserId));
    if (toAdd.length === 0) return;
    setAdding(true);
    try {
      await Promise.all(
        toAdd.map((entry) =>
          fetch("/api/dashboard/engagement/accounts", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              username: entry.username,
              xUserId: entry.xUserId,
              displayName: entry.displayName,
              avatarUrl: entry.avatarUrl,
            }),
          }),
        ),
      );
      onAdded();
      setOpen(false);
      setSelected(new Set());
    } finally {
      setAdding(false);
    }
  };

  if (!open) {
    return (
      <button
        onClick={handleOpen}
        className="flex items-center gap-2 px-4 py-2 text-sm font-medium border border-slate-custom-200 text-slate-custom-700 rounded-lg hover:bg-slate-custom-50 transition-colors"
      >
        <span className="material-icons-round text-[18px]">people</span>
        Import Following
      </button>
    );
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-lg mx-4 max-h-[80vh] flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between p-5 border-b border-slate-custom-200">
          <h2 className="text-base font-semibold text-slate-custom-900">Import from Following</h2>
          <button
            onClick={() => setOpen(false)}
            className="text-slate-custom-400 hover:text-slate-custom-700 transition-colors"
          >
            <span className="material-icons-round">close</span>
          </button>
        </div>

        {/* Search + refresh */}
        <div className="p-4 border-b border-slate-custom-100 flex gap-2">
          <input
            type="text"
            placeholder="Search by @handle or name..."
            value={search}
            onChange={(e) => handleSearch(e.target.value)}
            className="flex-1 px-3 py-2 text-sm border border-slate-custom-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary/30"
          />
          <button
            onClick={handleImport}
            disabled={importing}
            className="px-3 py-2 text-sm font-medium bg-primary text-slate-custom-900 rounded-lg hover:bg-primary/90 transition-colors disabled:opacity-50 whitespace-nowrap"
          >
            {importing ? "Importing..." : "Refresh from X"}
          </button>
        </div>

        {/* Entry list */}
        <div className="flex-1 overflow-y-auto">
          {loading ? (
            <div className="p-4 space-y-3">
              {[...Array(5)].map((_, i) => (
                <div key={i} className="h-10 bg-slate-custom-50 rounded animate-pulse" />
              ))}
            </div>
          ) : entries.length === 0 ? (
            <div className="p-8 text-center">
              <p className="text-sm text-slate-custom-500 mb-3">No following accounts cached yet.</p>
              <button
                onClick={handleImport}
                disabled={importing}
                className="text-sm font-medium text-primary hover:underline disabled:opacity-50"
              >
                Import from X now
              </button>
            </div>
          ) : (
            <div className="divide-y divide-slate-custom-100">
              {entries.map((entry) => (
                <label
                  key={entry.xUserId}
                  className="flex items-center gap-3 px-4 py-3 hover:bg-slate-custom-50 cursor-pointer"
                >
                  <input
                    type="checkbox"
                    checked={selected.has(entry.xUserId)}
                    onChange={() => toggleSelect(entry.xUserId)}
                    className="w-4 h-4 rounded border-slate-custom-300 text-primary focus:ring-primary/30 accent-primary"
                  />
                  {entry.avatarUrl ? (
                    <img
                      src={entry.avatarUrl}
                      alt={entry.username}
                      className="w-8 h-8 rounded-full object-cover flex-shrink-0"
                      referrerPolicy="no-referrer"
                    />
                  ) : (
                    <div className="w-8 h-8 rounded-full bg-slate-custom-200 flex items-center justify-center text-xs font-semibold text-slate-custom-500 flex-shrink-0">
                      {entry.username[0]?.toUpperCase()}
                    </div>
                  )}
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-slate-custom-900 truncate">
                      {entry.displayName || `@${entry.username}`}
                    </p>
                    <p className="text-xs text-slate-custom-500">@{entry.username}</p>
                  </div>
                </label>
              ))}
            </div>
          )}
        </div>

        {/* Footer: add selected */}
        {selected.size > 0 && (
          <div className="p-4 border-t border-slate-custom-200">
            <button
              onClick={handleAddSelected}
              disabled={adding}
              className="w-full py-2.5 text-sm font-semibold bg-primary text-slate-custom-900 rounded-lg hover:bg-primary/90 transition-colors disabled:opacity-50"
            >
              {adding
                ? "Adding..."
                : `Add ${selected.size} Selected Account${selected.size > 1 ? "s" : ""}`}
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
