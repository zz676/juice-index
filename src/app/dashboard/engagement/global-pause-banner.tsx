"use client";

import { useEffect, useState, useCallback } from "react";

type PauseException = { id: string; date: string };

type PauseSchedule = {
  id: string;
  label: string | null;
  startTime: string;
  endTime: string;
  enabled: boolean;
  PauseExceptions: PauseException[];
};

type ConfigData = {
  globalPaused: boolean;
  timezone: string;
  schedules: PauseSchedule[];
};

type Props = {
  onPauseStateChange?: (paused: boolean) => void;
};

// All IANA timezones supported by the runtime
const TIMEZONES: string[] = (() => {
  try {
    return Intl.supportedValuesOf("timeZone");
  } catch {
    return ["America/New_York", "America/Los_Angeles", "America/Chicago", "UTC", "Europe/London"];
  }
})();

function isWithinWindow(now: Date, timezone: string, schedule: PauseSchedule): boolean {
  const dateParts = new Intl.DateTimeFormat("en-CA", {
    timeZone: timezone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).formatToParts(now);

  const timeParts = new Intl.DateTimeFormat("en-GB", {
    timeZone: timezone,
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  }).formatToParts(now);

  const get = (parts: Intl.DateTimeFormatPart[], type: string) =>
    parts.find((p) => p.type === type)?.value ?? "00";

  const todayDate = `${get(dateParts, "year")}-${get(dateParts, "month")}-${get(dateParts, "day")}`;
  const currentTime = `${get(timeParts, "hour")}:${get(timeParts, "minute")}`;

  if (schedule.PauseExceptions.some((e) => e.date === todayDate)) return false;

  const { startTime: s, endTime: e } = schedule;
  if (s === e) return false;
  if (s < e) return currentTime >= s && currentTime < e;
  return currentTime >= s || currentTime < e;
}

function getActiveSchedule(schedules: PauseSchedule[], timezone: string): PauseSchedule | null {
  const now = new Date();
  return schedules.find((sc) => sc.enabled && isWithinWindow(now, timezone, sc)) ?? null;
}

export function GlobalPauseBanner({ onPauseStateChange }: Props) {
  const [config, setConfig] = useState<ConfigData | null>(null);
  const [loading, setLoading] = useState(false);
  const [expanded, setExpanded] = useState(false);

  // New schedule form state
  const [newLabel, setNewLabel] = useState("");
  const [newStart, setNewStart] = useState("22:00");
  const [newEnd, setNewEnd] = useState("07:00");
  const [addingSchedule, setAddingSchedule] = useState(false);

  const fetchConfig = useCallback(async () => {
    try {
      const res = await fetch("/api/dashboard/engagement/config");
      const data: ConfigData = await res.json();
      setConfig(data);
      onPauseStateChange?.(data.globalPaused);
    } catch {
      // keep existing state
    }
  }, [onPauseStateChange]);

  useEffect(() => {
    fetchConfig();
  }, [fetchConfig]);

  const toggleGlobalPause = async () => {
    if (!config || loading) return;
    setLoading(true);
    try {
      const res = await fetch("/api/dashboard/engagement/config", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ globalPaused: !config.globalPaused }),
      });
      const data = await res.json();
      const next = { ...config, globalPaused: data.globalPaused };
      setConfig(next);
      onPauseStateChange?.(data.globalPaused);
    } finally {
      setLoading(false);
    }
  };

  const updateTimezone = async (tz: string) => {
    if (!config) return;
    setConfig({ ...config, timezone: tz });
    await fetch("/api/dashboard/engagement/config", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ timezone: tz }),
    });
  };

  const toggleScheduleEnabled = async (schedule: PauseSchedule) => {
    const res = await fetch(`/api/dashboard/engagement/schedules/${schedule.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ enabled: !schedule.enabled }),
    });
    if (res.ok) {
      const data = await res.json();
      setConfig((prev) =>
        prev
          ? { ...prev, schedules: prev.schedules.map((s) => (s.id === schedule.id ? data.schedule : s)) }
          : prev
      );
    }
  };

  const deleteSchedule = async (id: string) => {
    const res = await fetch(`/api/dashboard/engagement/schedules/${id}`, { method: "DELETE" });
    if (res.ok) {
      setConfig((prev) =>
        prev ? { ...prev, schedules: prev.schedules.filter((s) => s.id !== id) } : prev
      );
    }
  };

  const addSchedule = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newStart || !newEnd || addingSchedule) return;
    setAddingSchedule(true);
    try {
      const res = await fetch("/api/dashboard/engagement/schedules", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ label: newLabel.trim() || null, startTime: newStart, endTime: newEnd }),
      });
      if (res.ok) {
        const data = await res.json();
        setConfig((prev) =>
          prev ? { ...prev, schedules: [...prev.schedules, data.schedule] } : prev
        );
        setNewLabel("");
        setNewStart("22:00");
        setNewEnd("07:00");
      }
    } finally {
      setAddingSchedule(false);
    }
  };

  const addException = async (scheduleId: string, date: string) => {
    if (!date) return;
    const res = await fetch(`/api/dashboard/engagement/schedules/${scheduleId}/exceptions`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ date }),
    });
    if (res.ok) {
      const data = await res.json();
      setConfig((prev) =>
        prev
          ? {
              ...prev,
              schedules: prev.schedules.map((s) =>
                s.id === scheduleId
                  ? { ...s, PauseExceptions: [...s.PauseExceptions, data.exception] }
                  : s
              ),
            }
          : prev
      );
    }
  };

  const deleteException = async (scheduleId: string, exceptionId: string) => {
    const res = await fetch(
      `/api/dashboard/engagement/schedules/${scheduleId}/exceptions/${exceptionId}`,
      { method: "DELETE" }
    );
    if (res.ok) {
      setConfig((prev) =>
        prev
          ? {
              ...prev,
              schedules: prev.schedules.map((s) =>
                s.id === scheduleId
                  ? { ...s, PauseExceptions: s.PauseExceptions.filter((ex) => ex.id !== exceptionId) }
                  : s
              ),
            }
          : prev
      );
    }
  };

  if (!config) return null;

  const activeSchedule = getActiveSchedule(config.schedules, config.timezone);
  const isSchedulePaused = !config.globalPaused && activeSchedule !== null;
  const isPaused = config.globalPaused || isSchedulePaused;

  const bannerBg = isPaused ? "bg-amber-50 border-amber-200" : "bg-green-50 border-green-200";
  const statusIcon = isPaused ? "pause_circle" : "check_circle";
  const statusIconClass = isPaused ? "text-amber-600" : "text-green-600";
  const statusText = config.globalPaused
    ? "Paused (manual override)"
    : isSchedulePaused
    ? `Paused until ${activeSchedule!.endTime}${activeSchedule!.label ? ` · ${activeSchedule!.label}` : ""}`
    : "Auto-replies active";
  const statusTextClass = isPaused ? "text-amber-800" : "text-green-700";

  return (
    <div className={`border rounded-xl overflow-hidden ${bannerBg}`}>
      {/* ── Top bar ── */}
      <div className="px-4 py-3 flex items-center justify-between gap-3">
        <div className="flex items-center gap-2 min-w-0">
          <span className={`material-icons-round text-[18px] shrink-0 ${statusIconClass}`}>
            {statusIcon}
          </span>
          <p className={`text-sm font-medium truncate ${statusTextClass}`}>{statusText}</p>
          {config.schedules.length > 0 && (
            <span className="hidden sm:inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-white/60 text-slate-custom-600 border border-slate-custom-200 shrink-0">
              {config.schedules.filter((s) => s.enabled).length}/{config.schedules.length} schedule
              {config.schedules.length !== 1 ? "s" : ""}
            </span>
          )}
        </div>

        <div className="flex items-center gap-2 shrink-0">
          {config.globalPaused ? (
            <button
              onClick={toggleGlobalPause}
              disabled={loading}
              className="flex items-center gap-1.5 px-3 py-1.5 text-sm font-semibold bg-green-500 text-white rounded-lg hover:bg-green-600 transition-colors disabled:opacity-50"
            >
              <span className="material-icons-round text-[15px]">play_arrow</span>
              Resume
            </button>
          ) : isSchedulePaused ? (
            <button
              onClick={toggleGlobalPause}
              disabled={loading}
              className="flex items-center gap-1.5 px-3 py-1.5 text-sm font-semibold bg-green-500 text-white rounded-lg hover:bg-green-600 transition-colors disabled:opacity-50"
            >
              <span className="material-icons-round text-[15px]">play_arrow</span>
              Override On
            </button>
          ) : (
            <button
              onClick={toggleGlobalPause}
              disabled={loading}
              className="flex items-center gap-1.5 px-3 py-1.5 text-sm font-medium border border-amber-300 text-amber-700 bg-amber-50 rounded-lg hover:bg-amber-100 transition-colors disabled:opacity-50"
            >
              <span className="material-icons-round text-[15px]">pause</span>
              Pause All
            </button>
          )}

          <button
            onClick={() => setExpanded((v) => !v)}
            className="flex items-center gap-1 px-2 py-1.5 text-xs font-medium text-slate-custom-500 hover:text-slate-custom-700 transition-colors"
            aria-label={expanded ? "Collapse schedules" : "Manage schedules"}
          >
            <span className="material-icons-round text-[16px]">schedule</span>
            <span
              className="material-icons-round text-[14px] transition-transform duration-200"
              style={{ transform: expanded ? "rotate(180deg)" : "rotate(0deg)" }}
            >
              expand_more
            </span>
          </button>
        </div>
      </div>

      {/* ── Expanded panel ── */}
      {expanded && (
        <div className="border-t border-slate-custom-100 bg-white px-4 py-4 space-y-4">
          {/* Timezone */}
          <div className="flex items-center gap-3">
            <span className="text-xs font-medium text-slate-custom-500 w-20 shrink-0">Timezone</span>
            <select
              value={config.timezone}
              onChange={(e) => updateTimezone(e.target.value)}
              className="flex-1 text-xs px-2 py-1.5 border border-slate-custom-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary/30 bg-white text-slate-custom-700"
            >
              {TIMEZONES.map((tz) => (
                <option key={tz} value={tz}>
                  {tz}
                </option>
              ))}
            </select>
          </div>

          {/* Existing schedules */}
          {config.schedules.length > 0 && (
            <div className="space-y-2">
              {config.schedules.map((schedule) => (
                <ScheduleRow
                  key={schedule.id}
                  schedule={schedule}
                  onToggle={() => toggleScheduleEnabled(schedule)}
                  onDelete={() => deleteSchedule(schedule.id)}
                  onAddException={(date) => addException(schedule.id, date)}
                  onDeleteException={(exId) => deleteException(schedule.id, exId)}
                />
              ))}
            </div>
          )}

          {/* Add new schedule form */}
          <form onSubmit={addSchedule} className="pt-1 border-t border-slate-custom-100">
            <p className="text-xs font-medium text-slate-custom-600 mb-2 mt-3">Add Schedule</p>
            <div className="flex flex-wrap gap-2 items-end">
              <div className="flex flex-col gap-1">
                <label className="text-[11px] text-slate-custom-400">Label (optional)</label>
                <input
                  type="text"
                  placeholder="e.g. Overnight"
                  value={newLabel}
                  onChange={(e) => setNewLabel(e.target.value)}
                  className="w-36 text-xs px-2 py-1.5 border border-slate-custom-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary/30"
                />
              </div>
              <div className="flex flex-col gap-1">
                <label className="text-[11px] text-slate-custom-400">Start</label>
                <input
                  type="time"
                  value={newStart}
                  onChange={(e) => setNewStart(e.target.value)}
                  required
                  className="text-xs px-2 py-1.5 border border-slate-custom-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary/30"
                />
              </div>
              <div className="flex flex-col gap-1">
                <label className="text-[11px] text-slate-custom-400">End</label>
                <input
                  type="time"
                  value={newEnd}
                  onChange={(e) => setNewEnd(e.target.value)}
                  required
                  className="text-xs px-2 py-1.5 border border-slate-custom-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary/30"
                />
              </div>
              <button
                type="submit"
                disabled={addingSchedule}
                className="flex items-center gap-1 px-3 py-1.5 text-xs font-semibold bg-primary text-slate-custom-900 rounded-lg hover:bg-primary/90 transition-colors disabled:opacity-50"
              >
                <span className="material-icons-round text-[14px]">add</span>
                {addingSchedule ? "Adding…" : "Add"}
              </button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
}

// ── Schedule row sub-component ────────────────────────────────────────────────

type ScheduleRowProps = {
  schedule: PauseSchedule;
  onToggle: () => void;
  onDelete: () => void;
  onAddException: (date: string) => void;
  onDeleteException: (exId: string) => void;
};

function ScheduleRow({ schedule, onToggle, onDelete, onAddException, onDeleteException }: ScheduleRowProps) {
  const [showExceptions, setShowExceptions] = useState(false);
  const [newExDate, setNewExDate] = useState("");

  return (
    <div className="border border-slate-custom-200 rounded-lg p-3 bg-slate-custom-50">
      <div className="flex items-center gap-3">
        {/* Enabled toggle */}
        <button
          onClick={onToggle}
          className={`w-8 h-5 rounded-full relative transition-colors shrink-0 ${
            schedule.enabled ? "bg-green-500" : "bg-slate-custom-300"
          }`}
          aria-label={schedule.enabled ? "Disable schedule" : "Enable schedule"}
        >
          <span
            className={`absolute top-0.5 w-4 h-4 bg-white rounded-full shadow transition-transform ${
              schedule.enabled ? "translate-x-3" : "translate-x-0.5"
            }`}
          />
        </button>

        {/* Time range */}
        <span className="text-sm font-mono text-slate-custom-700">
          {schedule.startTime} → {schedule.endTime}
        </span>

        {/* Label */}
        {schedule.label && (
          <span className="text-xs text-slate-custom-500 truncate flex-1">{schedule.label}</span>
        )}

        <div className="ml-auto flex items-center gap-2 shrink-0">
          {/* Exceptions toggle */}
          <button
            onClick={() => setShowExceptions((v) => !v)}
            className="flex items-center gap-0.5 text-xs text-slate-custom-500 hover:text-slate-custom-700 transition-colors"
            aria-label="Toggle exceptions"
          >
            <span className="material-icons-round text-[14px]">event_busy</span>
            {schedule.PauseExceptions.length > 0 && (
              <span className="text-[11px]">{schedule.PauseExceptions.length}</span>
            )}
            <span className="material-icons-round text-[12px]">
              {showExceptions ? "expand_less" : "expand_more"}
            </span>
          </button>

          {/* Delete */}
          <button
            onClick={onDelete}
            className="text-slate-custom-400 hover:text-red-500 transition-colors"
            aria-label="Delete schedule"
          >
            <span className="material-icons-round text-[16px]">delete_outline</span>
          </button>
        </div>
      </div>

      {/* Exceptions panel */}
      {showExceptions && (
        <div className="mt-3 pt-3 border-t border-slate-custom-200 space-y-2">
          {schedule.PauseExceptions.length > 0 && (
            <div className="flex flex-wrap gap-1.5">
              {schedule.PauseExceptions.map((ex) => (
                <span
                  key={ex.id}
                  className="flex items-center gap-1 px-2 py-0.5 text-xs bg-white border border-slate-custom-200 rounded-full text-slate-custom-600"
                >
                  {ex.date}
                  <button
                    onClick={() => onDeleteException(ex.id)}
                    className="text-slate-custom-400 hover:text-red-500 transition-colors leading-none"
                    aria-label={`Remove exception ${ex.date}`}
                  >
                    <span className="material-icons-round text-[11px]">close</span>
                  </button>
                </span>
              ))}
            </div>
          )}
          <div className="flex gap-2 items-center">
            <input
              type="date"
              value={newExDate}
              onChange={(e) => setNewExDate(e.target.value)}
              className="text-xs px-2 py-1 border border-slate-custom-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary/30"
            />
            <button
              onClick={() => {
                if (newExDate) {
                  onAddException(newExDate);
                  setNewExDate("");
                }
              }}
              disabled={!newExDate}
              className="text-xs px-2 py-1 font-medium bg-white border border-slate-custom-200 rounded-lg hover:bg-slate-custom-50 transition-colors disabled:opacity-40"
            >
              Skip this date
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
