"use client";

import { useEffect, useState } from "react";

export function GlobalPauseBanner() {
  const [paused, setPaused] = useState<boolean | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    fetch("/api/dashboard/engagement/config")
      .then((r) => r.json())
      .then((d) => setPaused(d.globalPaused ?? false))
      .catch(() => setPaused(false));
  }, []);

  const toggle = async () => {
    if (paused === null) return;
    setLoading(true);
    try {
      const res = await fetch("/api/dashboard/engagement/config", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ globalPaused: !paused }),
      });
      const data = await res.json();
      setPaused(data.globalPaused);
    } finally {
      setLoading(false);
    }
  };

  if (paused === null) return null;

  if (paused) {
    return (
      <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <span className="material-icons-round text-amber-600">pause_circle</span>
          <p className="text-sm font-medium text-amber-800">All auto-replies are paused</p>
        </div>
        <button
          onClick={toggle}
          disabled={loading}
          className="flex items-center gap-2 px-4 py-2 text-sm font-semibold bg-green-500 text-white rounded-lg hover:bg-green-600 transition-colors disabled:opacity-50"
        >
          <span className="material-icons-round text-[16px]">play_arrow</span>
          Resume All
        </button>
      </div>
    );
  }

  return (
    <div className="bg-green-50 border border-green-200 rounded-xl p-3 flex items-center justify-between">
      <div className="flex items-center gap-2">
        <span className="material-icons-round text-green-600 text-[18px]">check_circle</span>
        <p className="text-sm font-medium text-green-700">Auto-replies active</p>
      </div>
      <button
        onClick={toggle}
        disabled={loading}
        className="flex items-center gap-2 px-3 py-1.5 text-sm font-medium border border-amber-300 text-amber-700 bg-amber-50 rounded-lg hover:bg-amber-100 transition-colors disabled:opacity-50"
      >
        <span className="material-icons-round text-[16px]">pause</span>
        Pause All
      </button>
    </div>
  );
}
