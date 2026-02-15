"use client";

import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";

export type PublishInfo = {
  tier: string;
  canPublish: boolean;
  hasXAccount: boolean;
  xUsername: string | null;
  xDisplayName: string | null;
  xAvatarUrl: string | null;
  publishUsed: number;
  publishLimit: number;
  publishReset: number;
};

interface PublishModalProps {
  open: boolean;
  onClose: () => void;
  onSaveDraft: () => void;
  onConfirm: () => void;
  onSchedule: (scheduledFor: string) => void;
  isPublishing: boolean;
  isScheduling: boolean;
  isLoading: boolean;
  info: PublishInfo | null;
  postDraft: string;
  attachImage: boolean;
  onAttachImageChange: (v: boolean) => void;
  chartImage: string | null;
}

export default function PublishModal({
  open,
  onClose,
  onSaveDraft,
  onConfirm,
  onSchedule,
  isPublishing,
  isScheduling,
  isLoading,
  info,
  postDraft,
  attachImage,
  onAttachImageChange,
  chartImage,
}: PublishModalProps) {
  const [scheduleMode, setScheduleMode] = useState(false);
  const [scheduleDate, setScheduleDate] = useState("");
  const [scheduleTime, setScheduleTime] = useState("");
  const [scheduleError, setScheduleError] = useState("");
  const [showSavePrompt, setShowSavePrompt] = useState(false);

  const handleDismiss = () => {
    setShowSavePrompt(true);
  };

  // Reset state when modal closes
  useEffect(() => {
    if (!open) {
      setScheduleMode(false);
      setScheduleDate("");
      setScheduleTime("");
      setScheduleError("");
      setShowSavePrompt(false);
    }
  }, [open]);

  const quotaExhausted =
    info !== null &&
    Number.isFinite(info.publishLimit) &&
    info.publishUsed >= info.publishLimit;
  const canConfirm =
    info !== null &&
    info.canPublish &&
    info.hasXAccount &&
    !quotaExhausted &&
    !isPublishing &&
    !isScheduling;

  const formatLimit = (limit: number) =>
    Number.isFinite(limit) ? String(limit) : "Unlimited";
  const formatUsed = (used: number, limit: number) =>
    Number.isFinite(limit) ? `${used}/${limit}` : "Unlimited";

  const resetDate = info?.publishReset
    ? new Date(info.publishReset * 1000).toLocaleDateString("en-US", {
        weekday: "short",
        month: "short",
        day: "numeric",
      })
    : null;

  const handleScheduleConfirm = () => {
    setScheduleError("");
    if (!scheduleDate || !scheduleTime) {
      setScheduleError("Please select both a date and time.");
      return;
    }
    const scheduledDate = new Date(`${scheduleDate}T${scheduleTime}`);
    if (isNaN(scheduledDate.getTime())) {
      setScheduleError("Invalid date or time.");
      return;
    }
    if (scheduledDate <= new Date()) {
      setScheduleError("Scheduled time must be in the future.");
      return;
    }
    onSchedule(scheduledDate.toISOString());
  };

  return (
    <AnimatePresence>
      {open && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.15 }}
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm"
          onClick={handleDismiss}
        >
          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: 10 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 10 }}
            transition={{ duration: 0.2, ease: "easeOut" }}
            className="bg-white rounded-2xl shadow-xl border border-slate-custom-200 w-full max-w-md mx-4 overflow-hidden"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Header */}
            <div className="px-5 py-3 border-b border-slate-custom-100 flex items-center justify-between bg-slate-custom-50/50">
              <h3 className="text-sm font-bold text-slate-custom-900 flex items-center gap-2">
                <span className="material-icons-round text-base text-primary">
                  rocket_launch
                </span>
                Publish to X
              </h3>
              <button
                onClick={handleDismiss}
                className="text-slate-custom-400 hover:text-slate-custom-600 transition-colors"
              >
                <span className="material-icons-round text-lg">close</span>
              </button>
            </div>

            {isLoading ? (
              <div className="p-8 flex items-center justify-center">
                <span className="material-icons-round text-xl text-primary animate-spin">
                  refresh
                </span>
                <span className="ml-2 text-sm text-slate-custom-500">
                  Loading publish info...
                </span>
              </div>
            ) : info ? (
              <div className="p-5 space-y-4">
                {/* X Account Status */}
                <div>
                  <label className="text-[10px] font-bold uppercase tracking-wider text-slate-custom-400 mb-1.5 block">
                    X Account
                  </label>
                  {info.hasXAccount ? (
                    <div className="flex items-center gap-3 p-3 rounded-lg border border-green-200 bg-green-50/50">
                      {info.xAvatarUrl ? (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img
                          src={info.xAvatarUrl}
                          alt={info.xUsername || "X avatar"}
                          className="w-8 h-8 rounded-full"
                        />
                      ) : (
                        <div className="w-8 h-8 rounded-full bg-slate-custom-200 flex items-center justify-center">
                          <span className="material-icons-round text-slate-custom-400 text-sm">
                            person
                          </span>
                        </div>
                      )}
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-slate-custom-900 truncate">
                          {info.xDisplayName || info.xUsername}
                        </p>
                        <p className="text-xs text-slate-custom-500">
                          @{info.xUsername}
                        </p>
                      </div>
                      <span className="material-icons-round text-green-500 text-sm">
                        check_circle
                      </span>
                    </div>
                  ) : (
                    <div className="p-3 rounded-lg border border-yellow-200 bg-yellow-50/50">
                      <div className="flex items-center gap-2 mb-1">
                        <span className="material-icons-round text-yellow-500 text-sm">
                          warning
                        </span>
                        <span className="text-sm font-medium text-yellow-700">
                          X account not connected
                        </span>
                      </div>
                      <p className="text-xs text-yellow-600">
                        Connect your X account in{" "}
                        <a
                          href="/dashboard/settings"
                          className="text-primary font-semibold underline hover:text-primary/80"
                        >
                          Settings
                        </a>{" "}
                        to publish posts.
                      </p>
                    </div>
                  )}
                </div>

                {/* Weekly Quota */}
                <div>
                  <label className="text-[10px] font-bold uppercase tracking-wider text-slate-custom-400 mb-1.5 block">
                    Weekly Publish Quota
                  </label>
                  <div className="p-3 rounded-lg border border-slate-custom-200 bg-slate-custom-50/50">
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-sm font-medium text-slate-custom-700">
                        {formatUsed(info.publishUsed, info.publishLimit)}
                      </span>
                      {quotaExhausted ? (
                        <span className="text-[10px] font-bold text-red-500 flex items-center gap-0.5">
                          <span className="material-icons-round text-xs">
                            error
                          </span>
                          Limit reached
                        </span>
                      ) : (
                        <span className="text-[10px] text-slate-custom-400">
                          {formatLimit(info.publishLimit)} / week
                        </span>
                      )}
                    </div>
                    {Number.isFinite(info.publishLimit) &&
                      info.publishLimit > 0 && (
                        <div className="w-full h-1.5 bg-slate-custom-200 rounded-full overflow-hidden">
                          <div
                            className={`h-full rounded-full transition-all ${
                              quotaExhausted ? "bg-red-400" : "bg-primary"
                            }`}
                            style={{
                              width: `${Math.min(100, (info.publishUsed / info.publishLimit) * 100)}%`,
                            }}
                          />
                        </div>
                      )}
                    {resetDate && (
                      <p className="text-[10px] text-slate-custom-400 mt-1.5">
                        Resets {resetDate}
                      </p>
                    )}
                  </div>
                </div>

                {/* Post Preview */}
                <div>
                  <label className="text-[10px] font-bold uppercase tracking-wider text-slate-custom-400 mb-1.5 block">
                    Post Preview
                  </label>
                  <div className="p-3 rounded-lg border border-slate-custom-200 bg-slate-custom-50/50">
                    <p className="text-sm text-slate-custom-800 leading-relaxed whitespace-pre-wrap line-clamp-6">
                      {postDraft}
                    </p>
                    <p className="text-[10px] text-slate-custom-400 mt-2 text-right">
                      {postDraft.length}/280
                    </p>
                  </div>
                </div>

                {/* Schedule Date/Time Picker */}
                <AnimatePresence>
                  {scheduleMode && (
                    <motion.div
                      initial={{ opacity: 0, height: 0 }}
                      animate={{ opacity: 1, height: "auto" }}
                      exit={{ opacity: 0, height: 0 }}
                      transition={{ duration: 0.2 }}
                      className="overflow-hidden"
                    >
                      <div className="p-3 rounded-lg border border-purple-200 bg-purple-50/50 space-y-3">
                        <label className="text-[10px] font-bold uppercase tracking-wider text-purple-500 block">
                          Schedule Date & Time
                        </label>
                        <div className="flex items-center gap-2">
                          <input
                            type="date"
                            value={scheduleDate}
                            onChange={(e) => {
                              setScheduleDate(e.target.value);
                              setScheduleError("");
                            }}
                            className="flex-1 px-3 py-1.5 border border-purple-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-purple-400/50 focus:border-purple-400 bg-white"
                          />
                          <input
                            type="time"
                            value={scheduleTime}
                            onChange={(e) => {
                              setScheduleTime(e.target.value);
                              setScheduleError("");
                            }}
                            className="flex-1 px-3 py-1.5 border border-purple-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-purple-400/50 focus:border-purple-400 bg-white"
                          />
                        </div>
                        {scheduleError && (
                          <p className="text-xs text-red-500 flex items-center gap-1">
                            <span className="material-icons-round text-xs">error</span>
                            {scheduleError}
                          </p>
                        )}
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>

                {/* Attach Image */}
                {chartImage && (
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={attachImage}
                      onChange={(e) => onAttachImageChange(e.target.checked)}
                      className="w-3.5 h-3.5 accent-primary cursor-pointer"
                    />
                    <span className="text-xs font-medium text-slate-custom-600">
                      Attach chart image
                    </span>
                  </label>
                )}
              </div>
            ) : null}

            {/* Actions */}
            {!isLoading && info && (
              <div className="px-5 py-3 border-t border-slate-custom-100 bg-slate-custom-50/50">
                <AnimatePresence mode="wait">
                  {showSavePrompt ? (
                    <motion.div
                      key="save-prompt"
                      initial={{ opacity: 0, y: 4 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, y: -4 }}
                      transition={{ duration: 0.15 }}
                      className="flex items-center justify-between gap-2"
                    >
                      <p className="text-xs text-slate-custom-500">
                        Save your draft before closing?
                      </p>
                      <div className="flex items-center gap-2">
                        <button
                          onClick={onClose}
                          className="px-3 py-1.5 text-xs font-medium text-slate-custom-500 border border-slate-custom-200 rounded-full hover:bg-slate-custom-100 transition-colors"
                        >
                          Don&apos;t Save
                        </button>
                        <button
                          onClick={onSaveDraft}
                          className="px-3 py-1.5 bg-primary text-slate-custom-900 text-xs font-bold rounded-full hover:bg-primary/90 transition-colors flex items-center gap-1"
                        >
                          <span className="material-icons-round text-sm">save</span>
                          Save Draft
                        </button>
                        <button
                          onClick={() => setShowSavePrompt(false)}
                          className="px-3 py-1.5 text-xs font-medium text-slate-custom-600 border border-slate-custom-200 rounded-full hover:bg-slate-custom-100 transition-colors"
                        >
                          Go Back
                        </button>
                      </div>
                    </motion.div>
                  ) : (
                    <motion.div
                      key="actions"
                      initial={{ opacity: 0, y: 4 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, y: -4 }}
                      transition={{ duration: 0.15 }}
                      className="flex items-center justify-end gap-2"
                    >
                      <button
                        onClick={handleDismiss}
                        className="px-4 py-1.5 text-xs font-medium text-slate-custom-600 border border-slate-custom-200 rounded-full hover:bg-slate-custom-100 transition-colors"
                      >
                        Cancel
                      </button>
                      <button
                        onClick={() => {
                          if (scheduleMode) {
                            handleScheduleConfirm();
                          } else {
                            setScheduleMode(true);
                          }
                        }}
                        disabled={!canConfirm}
                        className="px-4 py-1.5 bg-purple-600 text-white text-xs font-bold rounded-full hover:bg-purple-700 disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-200 flex items-center gap-1.5"
                      >
                        {isScheduling ? (
                          <>
                            <span className="material-icons-round text-sm animate-spin">
                              refresh
                            </span>
                            Scheduling...
                          </>
                        ) : (
                          <>
                            <span className="material-icons-round text-sm">
                              schedule
                            </span>
                            {scheduleMode ? "Confirm Schedule" : "Schedule For Later"}
                          </>
                        )}
                      </button>
                      <button
                        onClick={onConfirm}
                        disabled={!canConfirm}
                        className="px-4 py-1.5 bg-gradient-to-r from-primary to-green-400 text-slate-custom-900 text-xs font-bold rounded-full shadow-[0_0_10px_rgba(106,218,27,0.3)] hover:shadow-[0_0_22px_rgba(106,218,27,0.55)] disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-200 flex items-center gap-1.5"
                      >
                        {isPublishing ? (
                          <>
                            <span className="material-icons-round text-sm animate-spin">
                              refresh
                            </span>
                            Publishing...
                          </>
                        ) : (
                          <>
                            <span className="material-icons-round text-sm">
                              send
                            </span>
                            Publish Now
                          </>
                        )}
                      </button>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
            )}
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
