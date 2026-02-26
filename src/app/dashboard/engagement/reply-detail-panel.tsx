"use client";

import { useState } from "react";
import { StatusBadge } from "@/components/dashboard/StatusBadge";
import type { EngagementReplyStatus } from "@prisma/client";

export interface ReplyRow {
  id: string;
  sourceTweetId: string;
  sourceTweetText: string | null;
  sourceTweetUrl: string | null;
  replyText: string | null;
  replyImageUrl: string | null;
  replyTweetId: string | null;
  replyTweetUrl: string | null;
  tone: string;
  status: EngagementReplyStatus;
  lastError: string | null;
  totalCost: number;
  createdAt: string;
  sourceTweetCreatedAt: string | null;
  monitoredAccountId: string;
  MonitoredAccount: {
    username: string;
    displayName: string | null;
    avatarUrl: string | null;
  } | null;
}

interface ReplyDetailPanelProps {
  reply: ReplyRow | null;
  onClose: () => void;
  onUpdate: (updated: ReplyRow) => void;
}

export function ReplyDetailPanel({ reply, onClose, onUpdate }: ReplyDetailPanelProps) {
  const [editedText, setEditedText] = useState<string>("");
  const [prevReplyId, setPrevReplyId] = useState<string | null>(null);
  const [loading, setLoading] = useState<string | null>(null); // action name being processed
  const [withImage, setWithImage] = useState(false);

  // Sync editedText when reply changes
  if (reply && reply.id !== prevReplyId) {
    setPrevReplyId(reply.id);
    setEditedText(reply.replyText ?? "");
  }

  if (!reply) return null;

  const isEditable =
    reply.status === "SENT_TO_TELEGRAM" || reply.status === "DISCARDED";

  async function callAction(
    action: string,
    extra?: Record<string, unknown>,
    onSuccess?: (updated: ReplyRow) => void,
  ) {
    if (!reply) return;
    setLoading(action);
    try {
      const res = await fetch(`/api/dashboard/engagement/replies/${reply.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action, ...extra }),
      });
      if (res.ok) {
        const json = await res.json();
        const updated = json.reply as ReplyRow;
        onUpdate(updated);
        onSuccess?.(updated);
      } else {
        const json = await res.json().catch(() => ({}));
        alert(json.message ?? "Action failed");
      }
    } catch {
      alert("Network error");
    } finally {
      setLoading(null);
    }
  }

  const handleSaveEdit = () => callAction("update-text", { replyText: editedText });
  const handlePostToX = () => callAction("post-to-x");
  const handleMarkPosted = () => callAction("mark-posted");
  const handleDiscard = () => callAction("discard");
  const handleRegenerate = () =>
    callAction("regenerate", { withImage }, (updated) => setEditedText(updated.replyText ?? ""));

  return (
    <div className="fixed inset-0 z-50 flex">
      {/* Backdrop */}
      <div className="flex-1 bg-black/30" onClick={onClose} />

      {/* Panel */}
      <div className="w-[480px] max-w-full bg-white h-full overflow-y-auto flex flex-col shadow-xl">
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-slate-custom-200 flex-shrink-0">
          <div className="flex items-center gap-2">
            <StatusBadge status={reply.status} />
            {reply.MonitoredAccount && (
              <span className="text-sm text-slate-custom-500">
                @{reply.MonitoredAccount.username}
              </span>
            )}
          </div>
          <button
            onClick={onClose}
            className="text-slate-custom-400 hover:text-slate-custom-700 transition-colors"
          >
            <span className="material-icons-round text-[20px]">close</span>
          </button>
        </div>

        <div className="flex-1 overflow-y-auto px-5 py-4 space-y-5">
          {/* Source tweet */}
          <div>
            <p className="text-xs font-semibold text-slate-custom-500 mb-1.5 uppercase tracking-wide">
              Source Tweet
            </p>
            <div className="bg-slate-custom-50 rounded-lg p-3 text-sm text-slate-custom-700 leading-relaxed">
              {reply.sourceTweetText || <span className="text-slate-custom-400">—</span>}
            </div>
            {reply.sourceTweetUrl && (
              <a
                href={reply.sourceTweetUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="mt-1.5 flex items-center gap-1 text-xs text-primary hover:underline"
              >
                <span className="material-icons-round text-[12px]">open_in_new</span>
                View on X
              </a>
            )}
          </div>

          {/* Reply text */}
          <div>
            <p className="text-xs font-semibold text-slate-custom-500 mb-1.5 uppercase tracking-wide">
              Reply
            </p>
            {isEditable ? (
              <textarea
                value={editedText}
                onChange={(e) => setEditedText(e.target.value)}
                rows={5}
                className="w-full text-sm text-slate-custom-700 border border-slate-custom-200 rounded-lg p-3 focus:outline-none focus:ring-2 focus:ring-primary/30 resize-none"
                disabled={loading !== null}
              />
            ) : (
              <div className="bg-slate-custom-50 rounded-lg p-3 text-sm text-slate-custom-700 leading-relaxed whitespace-pre-wrap">
                {reply.replyText || <span className="text-slate-custom-400">—</span>}
              </div>
            )}
            {reply.replyTweetUrl && (
              <a
                href={reply.replyTweetUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="mt-1.5 flex items-center gap-1 text-xs text-primary hover:underline"
              >
                <span className="material-icons-round text-[12px]">open_in_new</span>
                View reply on X
              </a>
            )}
          </div>

          {/* Image preview */}
          {reply.replyImageUrl && (
            <div>
              <p className="text-xs font-semibold text-slate-custom-500 mb-1.5 uppercase tracking-wide">
                Image
              </p>
              <div className="aspect-[2/1] overflow-hidden rounded-lg border border-slate-custom-200">
                <img
                  src={reply.replyImageUrl}
                  alt="Reply image"
                  className="w-full h-full object-cover"
                />
              </div>
            </div>
          )}

          {/* Metadata */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <p className="text-[11px] font-semibold text-slate-custom-400 uppercase tracking-wide mb-0.5">
                Tone
              </p>
              <p className="text-sm text-slate-custom-700 capitalize">
                {reply.tone.toLowerCase().replace(/_/g, " ")}
              </p>
            </div>
            <div>
              <p className="text-[11px] font-semibold text-slate-custom-400 uppercase tracking-wide mb-0.5">
                Cost
              </p>
              <p className="text-sm text-slate-custom-700">${reply.totalCost.toFixed(4)}</p>
            </div>
            <div>
              <p className="text-[11px] font-semibold text-slate-custom-400 uppercase tracking-wide mb-0.5">
                Generated
              </p>
              <p className="text-sm text-slate-custom-700">
                {new Date(reply.createdAt).toLocaleDateString("en-US", {
                  month: "short",
                  day: "numeric",
                  hour: "2-digit",
                  minute: "2-digit",
                })}
              </p>
            </div>
            {reply.lastError && (
              <div className="col-span-2">
                <p className="text-[11px] font-semibold text-red-400 uppercase tracking-wide mb-0.5">
                  Error
                </p>
                <p className="text-xs text-red-600 break-words">{reply.lastError}</p>
              </div>
            )}
          </div>
        </div>

        {/* Action buttons */}
        <div className="flex-shrink-0 border-t border-slate-custom-200 px-5 py-4">
          {reply.status === "SENT_TO_TELEGRAM" && (
            <div className="flex flex-col gap-2">
              <div className="flex gap-2">
                <button
                  onClick={handleSaveEdit}
                  disabled={loading !== null || editedText === reply.replyText}
                  className="flex-1 px-3 py-2 text-sm font-medium border border-slate-custom-200 rounded-lg hover:bg-slate-custom-50 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
                >
                  {loading === "update-text" ? "Saving…" : "Save Edit"}
                </button>
                <button
                  onClick={handlePostToX}
                  disabled={loading !== null}
                  className="flex-1 px-3 py-2 text-sm font-medium bg-slate-custom-900 text-white rounded-lg hover:bg-slate-custom-700 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
                >
                  {loading === "post-to-x" ? "Posting…" : "Post to X"}
                </button>
              </div>
              <div className="flex gap-2">
                <button
                  onClick={handleMarkPosted}
                  disabled={loading !== null}
                  className="flex-1 px-3 py-2 text-sm font-medium border border-green-200 text-green-700 rounded-lg hover:bg-green-50 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
                >
                  {loading === "mark-posted" ? "Updating…" : "Mark as Posted"}
                </button>
                <button
                  onClick={handleDiscard}
                  disabled={loading !== null}
                  className="flex-1 px-3 py-2 text-sm font-medium border border-red-200 text-red-600 rounded-lg hover:bg-red-50 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
                >
                  {loading === "discard" ? "Discarding…" : "Discard"}
                </button>
              </div>
              <RegenerateRow
                withImage={withImage}
                onToggleImage={() => setWithImage((v) => !v)}
                onRegenerate={handleRegenerate}
                loading={loading}
              />
            </div>
          )}

          {reply.status === "DISCARDED" && (
            <div className="flex flex-col gap-2">
              <div className="flex gap-2">
                <button
                  onClick={handleSaveEdit}
                  disabled={loading !== null || editedText === reply.replyText}
                  className="flex-1 px-3 py-2 text-sm font-medium border border-slate-custom-200 rounded-lg hover:bg-slate-custom-50 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
                >
                  {loading === "update-text" ? "Saving…" : "Save Edit"}
                </button>
                <button
                  onClick={handlePostToX}
                  disabled={loading !== null}
                  className="flex-1 px-3 py-2 text-sm font-medium bg-slate-custom-900 text-white rounded-lg hover:bg-slate-custom-700 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
                >
                  {loading === "post-to-x" ? "Posting…" : "Post to X"}
                </button>
              </div>
              <button
                onClick={handleMarkPosted}
                disabled={loading !== null}
                className="w-full px-3 py-2 text-sm font-medium border border-green-200 text-green-700 rounded-lg hover:bg-green-50 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
              >
                {loading === "mark-posted" ? "Updating…" : "Mark as Posted"}
              </button>
              <RegenerateRow
                withImage={withImage}
                onToggleImage={() => setWithImage((v) => !v)}
                onRegenerate={handleRegenerate}
                loading={loading}
              />
            </div>
          )}

          {(reply.status === "PENDING" || reply.status === "FAILED") && (
            <div className="flex flex-col gap-2">
              <button
                onClick={handleDiscard}
                disabled={loading !== null}
                className="w-full px-3 py-2 text-sm font-medium border border-red-200 text-red-600 rounded-lg hover:bg-red-50 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
              >
                {loading === "discard" ? "Discarding…" : "Discard"}
              </button>
              <RegenerateRow
                withImage={withImage}
                onToggleImage={() => setWithImage((v) => !v)}
                onRegenerate={handleRegenerate}
                loading={loading}
              />
            </div>
          )}

          {reply.status === "POSTED" && !reply.replyTweetUrl && (
            <p className="text-sm text-slate-custom-400 text-center">
              Posted manually — no tweet link available.
            </p>
          )}
        </div>
      </div>
    </div>
  );
}

function RegenerateRow({
  withImage,
  onToggleImage,
  onRegenerate,
  loading,
}: {
  withImage: boolean;
  onToggleImage: () => void;
  onRegenerate: () => void;
  loading: string | null;
}) {
  return (
    <div className="pt-2 border-t border-slate-custom-100 flex items-center gap-2">
      <button
        onClick={onRegenerate}
        disabled={loading !== null}
        className="flex-1 flex items-center justify-center gap-1.5 px-3 py-2 text-sm font-medium border border-slate-custom-200 rounded-lg hover:bg-slate-custom-50 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
      >
        <span className="material-icons-round text-[15px]">refresh</span>
        {loading === "regenerate" ? "Regenerating…" : "Regenerate"}
      </button>
      <button
        type="button"
        onClick={onToggleImage}
        disabled={loading !== null}
        className="flex items-center gap-1.5 px-3 py-2 text-sm border border-slate-custom-200 rounded-lg hover:bg-slate-custom-50 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
        title={withImage ? "Image generation on" : "Image generation off"}
      >
        <span className="material-icons-round text-[15px] text-slate-custom-500">image</span>
        <div
          className={`relative inline-flex h-4 w-8 flex-shrink-0 rounded-full border-2 border-transparent transition-colors duration-200 ${
            withImage ? "bg-primary" : "bg-slate-custom-200"
          }`}
        >
          <span
            className={`pointer-events-none inline-block h-3 w-3 transform rounded-full bg-white shadow transition duration-200 ease-in-out ${
              withImage ? "translate-x-4" : "translate-x-0"
            }`}
          />
        </div>
      </button>
    </div>
  );
}
