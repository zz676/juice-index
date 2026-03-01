"use client";

import { useState, useEffect, useCallback } from "react";
import { StatusBadge } from "@/components/dashboard/StatusBadge";

interface UserPostItem {
  id: string;
  content: string;
  status: string;
  scheduledFor: string | null;
  publishedAt: string | null;
  tweetUrl: string | null;
  lastError: string | null;
  attempts?: number;
  createdAt: string;
}

interface Pagination {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
}

const STATUS_TABS = ["All", "DRAFT", "SCHEDULED", "PUBLISHED", "FAILED"];

function formatRelativeTime(dateStr: string): string {
  const date = new Date(dateStr);
  const now = new Date();
  const diffMs = date.getTime() - now.getTime();
  const absDiffMs = Math.abs(diffMs);
  const isFuture = diffMs > 0;

  const rtf = new Intl.RelativeTimeFormat("en", { numeric: "auto" });

  if (absDiffMs < 60_000) return rtf.format(isFuture ? 1 : -1, "minute");
  if (absDiffMs < 3_600_000) {
    const mins = Math.round(diffMs / 60_000);
    return rtf.format(mins, "minute");
  }
  if (absDiffMs < 86_400_000) {
    const hours = Math.round(diffMs / 3_600_000);
    return rtf.format(hours, "hour");
  }
  const days = Math.round(diffMs / 86_400_000);
  return rtf.format(days, "day");
}

const EMPTY_STATES: Record<string, { icon: string; title: string; description: string }> = {
  All: {
    icon: "edit_note",
    title: "No posts yet",
    description: "Compose your first post above.",
  },
  DRAFT: {
    icon: "draft",
    title: "No drafts",
    description: "Create posts in Juice AI or compose one here.",
  },
  SCHEDULED: {
    icon: "schedule",
    title: "No scheduled posts",
    description: "Schedule posts to publish automatically.",
  },
  PUBLISHED: {
    icon: "check_circle",
    title: "No published posts yet",
    description: "Publish your first post to X!",
  },
  FAILED: {
    icon: "celebration",
    title: "No failed posts",
    description: "Everything is working!",
  },
};

export default function PostsPage() {
  const [posts, setPosts] = useState<UserPostItem[]>([]);
  const [pagination, setPagination] = useState<Pagination>({ page: 1, limit: 20, total: 0, totalPages: 0 });
  const [activeTab, setActiveTab] = useState("All");
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState<string | null>(null);
  const [statusCounts, setStatusCounts] = useState<Record<string, number>>({});
  const [isPro, setIsPro] = useState(false);
  const [hasXAccount, setHasXAccount] = useState(true);
  const [hasXLoginIdentity, setHasXLoginIdentity] = useState(false);
  const [charLimit, setCharLimit] = useState(280);

  // Compose state
  const [composeOpen, setComposeOpen] = useState(false);
  const [composeContent, setComposeContent] = useState("");
  const [editingId, setEditingId] = useState<string | null>(null);
  const [scheduleDate, setScheduleDate] = useState("");
  const [scheduleTime, setScheduleTime] = useState("");
  const [composeLoading, setComposeLoading] = useState(false);
  const [composeError, setComposeError] = useState("");

  // Expanded row state
  const [expandedId, setExpandedId] = useState<string | null>(null);

  // Reschedule state
  const [rescheduleId, setRescheduleId] = useState<string | null>(null);
  const [rescheduleDate, setRescheduleDate] = useState("");
  const [rescheduleTime, setRescheduleTime] = useState("");
  const [rescheduleError, setRescheduleError] = useState("");

  const fetchPosts = useCallback(async (page = 1) => {
    setLoading(true);
    try {
      const params = new URLSearchParams({ page: String(page), limit: "20" });
      if (activeTab !== "All") params.set("status", activeTab);
      if (search) params.set("search", search);

      const res = await fetch(`/api/dashboard/user-posts?${params}`);
      if (res.ok) {
        const json = await res.json();
        setPosts(json.posts);
        setPagination(json.pagination);
        setIsPro(json.isPro);
        setHasXAccount(json.hasXAccount ?? true);
        setHasXLoginIdentity(json.hasXLoginIdentity ?? false);
        if (json.charLimit) setCharLimit(json.charLimit);
      }
    } catch (error) {
      console.error("Failed to fetch posts", error);
    } finally {
      setLoading(false);
    }
  }, [activeTab, search]);

  // Fetch status counts
  const fetchCounts = useCallback(async () => {
    try {
      const counts: Record<string, number> = {};
      const statuses = ["DRAFT", "SCHEDULED", "PUBLISHED", "FAILED"];
      const responses = await Promise.all(
        statuses.map((s) => fetch(`/api/dashboard/user-posts?status=${s}&limit=1`))
      );
      for (let i = 0; i < statuses.length; i++) {
        if (responses[i].ok) {
          const json = await responses[i].json();
          counts[statuses[i]] = json.pagination.total;
        }
      }
      setStatusCounts(counts);
    } catch {
      // Counts are non-critical
    }
  }, []);

  useEffect(() => {
    fetchCounts();
  }, [fetchCounts]);

  useEffect(() => {
    fetchPosts();
  }, [fetchPosts]);

  const refreshAll = useCallback((page?: number) => {
    fetchPosts(page ?? pagination.page);
    fetchCounts();
  }, [fetchPosts, fetchCounts, pagination.page]);

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    fetchPosts(1);
  };

  const resetCompose = () => {
    setComposeContent("");
    setEditingId(null);
    setScheduleDate("");
    setScheduleTime("");
    setComposeError("");
  };

  const handleCompose = async (action: "draft" | "publish" | "schedule") => {
    if (!composeContent.trim()) {
      setComposeError("Content is required");
      return;
    }
    if (composeContent.length > charLimit) {
      setComposeError(`Content must be ${charLimit.toLocaleString()} characters or less`);
      return;
    }

    setComposeLoading(true);
    setComposeError("");

    try {
      const body: Record<string, string> = { content: composeContent, action };

      if (action === "schedule") {
        if (!scheduleDate || !scheduleTime) {
          setComposeError("Please select a date and time for scheduling");
          setComposeLoading(false);
          return;
        }
        body.scheduledFor = new Date(`${scheduleDate}T${scheduleTime}`).toISOString();
      }

      const url = editingId
        ? `/api/dashboard/user-posts/${editingId}`
        : "/api/dashboard/user-posts";

      const res = await fetch(url, {
        method: editingId ? "PATCH" : "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });

      if (res.ok) {
        resetCompose();
        setComposeOpen(false);
        refreshAll();
      } else {
        const json = await res.json();
        setComposeError(json.message || "Failed to save post");
      }
    } catch {
      setComposeError("Failed to save post");
    } finally {
      setComposeLoading(false);
    }
  };

  const handleEdit = (post: UserPostItem) => {
    setComposeContent(post.content);
    setEditingId(post.id);
    setComposeOpen(true);
    setComposeError("");
    if (post.status === "SCHEDULED" && post.scheduledFor) {
      const d = new Date(post.scheduledFor);
      setScheduleDate(d.toISOString().slice(0, 10));
      setScheduleTime(d.toTimeString().slice(0, 5));
    } else {
      setScheduleDate("");
      setScheduleTime("");
    }
  };

  const handleDelete = async (postId: string) => {
    setActionLoading(postId);
    try {
      const res = await fetch(`/api/dashboard/user-posts/${postId}`, { method: "DELETE" });
      if (res.ok) refreshAll();
    } catch (error) {
      console.error("Failed to delete post", error);
    } finally {
      setActionLoading(null);
    }
  };

  const handleCancel = async (postId: string) => {
    setActionLoading(postId);
    try {
      const res = await fetch(`/api/dashboard/user-posts/${postId}/cancel`, { method: "POST" });
      if (res.ok) refreshAll();
    } catch (error) {
      console.error("Failed to cancel post", error);
    } finally {
      setActionLoading(null);
    }
  };

  const handleRetry = async (post: UserPostItem) => {
    setActionLoading(post.id);
    try {
      const res = await fetch(`/api/dashboard/user-posts/${post.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "publish" }),
      });
      if (res.ok) refreshAll();
    } catch (error) {
      console.error("Failed to retry post", error);
    } finally {
      setActionLoading(null);
    }
  };

  const handleReschedule = async (postId: string) => {
    setRescheduleError("");
    if (!rescheduleDate || !rescheduleTime) {
      setRescheduleError("Please select both a date and time.");
      return;
    }
    const scheduledDate = new Date(`${rescheduleDate}T${rescheduleTime}`);
    if (isNaN(scheduledDate.getTime()) || scheduledDate <= new Date()) {
      setRescheduleError("Scheduled time must be in the future.");
      return;
    }

    setActionLoading(postId);
    try {
      const res = await fetch(`/api/dashboard/user-posts/${postId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "schedule", scheduledFor: scheduledDate.toISOString() }),
      });
      if (res.ok) {
        setRescheduleId(null);
        setRescheduleDate("");
        setRescheduleTime("");
        refreshAll();
      } else {
        const json = await res.json();
        setRescheduleError(json.message || "Failed to reschedule");
      }
    } catch {
      setRescheduleError("Failed to reschedule");
    } finally {
      setActionLoading(null);
    }
  };

  const charCount = composeContent.length;
  const charColor = charCount > charLimit ? "text-red-600" : charCount > charLimit * 0.9 ? "text-yellow-600" : "text-slate-custom-400";

  const totalCount = Object.values(statusCounts).reduce((a, b) => a + b, 0);
  const failedCount = statusCounts["FAILED"] || 0;

  return (
    <div className="pt-8 pb-8 px-4 sm:px-6 lg:px-8 h-full overflow-y-auto">
      <div className="w-full max-w-7xl mx-auto space-y-6">
      {/* Header + Stats Row */}
      <div className="flex items-center justify-between gap-3">
        {/* Stat boxes */}
        <div className="flex items-end gap-2">
          <div className="flex items-center gap-2 bg-card rounded-lg border border-lime-200 shadow-[0_2px_10px_rgba(0,0,0,0.04),0_0_28px_rgba(155,199,84,0.35)] px-3 py-2">
            <span className="material-icons-round text-base text-slate-custom-400">description</span>
            <div>
              <p className="text-sm font-bold text-slate-custom-900 leading-none">{totalCount}</p>
              <p className="text-[10px] text-slate-custom-500 font-medium mt-0.5">Total</p>
            </div>
          </div>
          <div className="flex items-center gap-2 bg-card rounded-lg border border-purple-200 shadow-[0_2px_10px_rgba(0,0,0,0.04),0_0_28px_rgba(155,199,84,0.35)] px-3 py-2">
            <span className="material-icons-round text-base text-purple-500">schedule</span>
            <div>
              <p className="text-sm font-bold text-purple-700 leading-none">{statusCounts["SCHEDULED"] || 0}</p>
              <p className="text-[10px] text-purple-500 font-medium mt-0.5">Scheduled</p>
            </div>
          </div>
          <div className="flex items-center gap-2 bg-card rounded-lg border border-green-200 shadow-[0_2px_10px_rgba(0,0,0,0.04),0_0_28px_rgba(155,199,84,0.35)] px-3 py-2">
            <span className="material-icons-round text-base text-green-500">check_circle</span>
            <div>
              <p className="text-sm font-bold text-green-700 leading-none">{statusCounts["PUBLISHED"] || 0}</p>
              <p className="text-[10px] text-green-500 font-medium mt-0.5">Published</p>
            </div>
          </div>
          {failedCount > 0 && (
            <div className="flex items-center gap-2 bg-card rounded-lg border border-red-200 shadow-[0_2px_10px_rgba(0,0,0,0.04),0_0_28px_rgba(155,199,84,0.35)] px-3 py-2">
              <span className="material-icons-round text-base text-red-500">error</span>
              <div>
                <p className="text-sm font-bold text-red-700 leading-none">{failedCount}</p>
                <p className="text-[10px] text-red-500 font-medium mt-0.5">Failed</p>
              </div>
            </div>
          )}
          <form onSubmit={handleSearchSubmit} className="relative w-48">
            <span className="material-icons-round absolute left-3 top-1/2 -translate-y-1/2 text-slate-custom-400 text-base">
              search
            </span>
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search posts..."
              className="w-full pl-10 pr-4 py-2 bg-card border border-slate-custom-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary/50 focus:border-primary transition-all"
            />
          </form>
        </div>
        {/* Compose */}
        <button
          onClick={() => { resetCompose(); setComposeOpen(!composeOpen); }}
          className="px-3 py-1.5 rounded-lg bg-gradient-to-r from-primary to-green-400 text-slate-custom-900 text-[13px] font-bold shadow-[0_0_12px_rgba(106,218,27,0.6),0_0_24px_rgba(106,218,27,0.3)] hover:shadow-[0_0_20px_rgba(106,218,27,0.8),0_0_40px_rgba(106,218,27,0.4)] transition-all duration-200 flex items-center gap-1 whitespace-nowrap"
        >
          <span className="material-icons-round text-[15px]">add</span>
          Compose
        </button>
      </div>

      {/* X Account Warning */}
      {isPro && !hasXAccount && hasXLoginIdentity && (
        <div className="flex items-center gap-3 bg-blue-50 border border-blue-200 rounded-lg px-4 py-3">
          <span className="material-icons-round text-blue-600 text-xl">info</span>
          <div className="flex-1">
            <p className="text-sm font-medium text-blue-800">You signed in with X — connect it for posting</p>
            <p className="text-xs text-blue-700 mt-0.5">
              Publish directly from your dashboard.{" "}
              <a href="/dashboard/settings" className="font-semibold underline hover:text-blue-900">
                Connect in Settings &rarr;
              </a>
            </p>
          </div>
        </div>
      )}
      {isPro && !hasXAccount && !hasXLoginIdentity && (
        <div className="flex items-center gap-3 bg-yellow-50 border border-yellow-200 rounded-lg px-4 py-3">
          <span className="material-icons-round text-yellow-600 text-xl">warning</span>
          <div className="flex-1">
            <p className="text-sm font-medium text-yellow-800">No X account connected</p>
            <p className="text-xs text-yellow-700 mt-0.5">
              Connect an X account in{" "}
              <a href="/dashboard/settings" className="font-semibold underline hover:text-yellow-900">
                Settings
              </a>{" "}
              before you can publish posts.
            </p>
          </div>
        </div>
      )}

      {/* Compose Panel */}
      {composeOpen && (
        <div className="bg-card rounded-lg border border-lime-200 shadow-[0_2px_10px_rgba(0,0,0,0.04),0_0_28px_rgba(155,199,84,0.35)] p-5 space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="font-semibold text-slate-custom-900">
              {editingId ? "Edit Post" : "Compose New Post"}
            </h3>
            <button
              onClick={() => { resetCompose(); setComposeOpen(false); }}
              className="text-slate-custom-400 hover:text-slate-custom-600 transition-colors"
            >
              <span className="material-icons-round text-xl">close</span>
            </button>
          </div>

          <div className="relative">
            <textarea
              value={composeContent}
              onChange={(e) => setComposeContent(e.target.value)}
              placeholder="What's happening?"
              rows={4}
              className="w-full px-4 py-3 bg-slate-custom-50 border border-slate-custom-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary/50 focus:border-primary transition-all resize-none"
            />
            <span className={`absolute bottom-3 right-3 text-xs font-medium ${charColor}`}>
              {charCount}/{charLimit.toLocaleString()}
            </span>
          </div>

          {composeError && (
            <p className="text-sm text-red-600">{composeError}</p>
          )}

          <div className="flex flex-wrap items-center gap-3">
            <button
              onClick={() => handleCompose("draft")}
              disabled={composeLoading}
              className="px-4 py-2 border border-slate-custom-200 text-slate-custom-700 rounded-lg text-sm font-semibold hover:bg-slate-custom-50 transition-colors disabled:opacity-50"
            >
              Save Draft
            </button>

            {/* Post Now — PRO+ only */}
            {isPro ? (
              <button
                onClick={() => handleCompose("publish")}
                disabled={composeLoading}
                className="px-4 py-2 bg-slate-custom-900 text-white rounded-lg text-sm font-semibold hover:bg-slate-custom-800 transition-colors disabled:opacity-50"
              >
                Post Now
              </button>
            ) : (
              <button
                disabled
                className="px-4 py-2 border border-slate-custom-200 text-slate-custom-400 rounded-lg text-sm font-semibold cursor-not-allowed flex items-center gap-1.5"
                title="Publishing to X requires a Pro subscription"
              >
                Post Now
                <span className="text-[10px] bg-primary/10 text-primary px-1.5 py-0.5 rounded-full font-bold">
                  PRO
                </span>
              </button>
            )}

            {/* Schedule — PRO+ only */}
            <div className="flex items-center gap-2">
              {isPro ? (
                <>
                  <input
                    type="date"
                    value={scheduleDate}
                    onChange={(e) => setScheduleDate(e.target.value)}
                    className="px-3 py-2 border border-slate-custom-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary/50"
                  />
                  <input
                    type="time"
                    value={scheduleTime}
                    onChange={(e) => setScheduleTime(e.target.value)}
                    className="px-3 py-2 border border-slate-custom-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary/50"
                  />
                  <button
                    onClick={() => handleCompose("schedule")}
                    disabled={composeLoading}
                    className="px-4 py-2 bg-purple-600 text-white rounded-lg text-sm font-semibold hover:bg-purple-700 transition-colors disabled:opacity-50"
                  >
                    Schedule
                  </button>
                </>
              ) : (
                <button
                  disabled
                  className="px-4 py-2 border border-slate-custom-200 text-slate-custom-400 rounded-lg text-sm font-semibold cursor-not-allowed flex items-center gap-1.5"
                  title="Scheduling requires a Pro subscription"
                >
                  Schedule
                  <span className="text-[10px] bg-purple-100 text-purple-700 px-1.5 py-0.5 rounded-full font-bold">
                    PRO
                  </span>
                </button>
              )}
            </div>

            {composeLoading && (
              <span className="material-icons-round text-slate-custom-400 animate-spin text-xl">sync</span>
            )}
          </div>

          {/* Upgrade prompt for free users */}
          {!isPro && (
            <div className="flex items-center gap-2 bg-primary/5 border border-primary/20 rounded-lg px-4 py-2.5 mt-1">
              <span className="material-icons-round text-primary text-base">lock</span>
              <p className="text-xs text-slate-custom-600">
                Publishing and scheduling to X requires <span className="font-semibold text-primary">Pro</span>.{" "}
                <a href="/dashboard/billing" className="text-primary font-semibold underline hover:text-primary/80">Upgrade now</a>
              </p>
            </div>
          )}
        </div>
      )}

      {/* Status Tabs */}
      <div className="flex gap-2 border-b border-slate-custom-200 pb-px">
        {STATUS_TABS.map((tab) => {
          const count = tab === "All"
            ? totalCount
            : statusCounts[tab] || 0;
          return (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              className={`px-4 py-2.5 text-sm font-semibold border-b-2 transition-colors ${
                activeTab === tab
                  ? "border-primary text-slate-custom-900"
                  : "border-transparent text-slate-custom-500 hover:text-slate-custom-700"
              }`}
            >
              {tab === "All" ? "All" : tab.charAt(0) + tab.slice(1).toLowerCase()}
              {count > 0 && (
                <span className="ml-1.5 text-[11px] bg-slate-custom-100 text-slate-custom-600 px-1.5 py-0.5 rounded-full">
                  {count}
                </span>
              )}
            </button>
          );
        })}
      </div>

      {/* Table */}
      <div className="w-full">
        {loading ? (
          <div className="w-full space-y-1.5">
            {[...Array(8)].map((_, i) => (
              <div key={i} className="w-full h-12 bg-white/50 rounded-xl animate-pulse" />
            ))}
          </div>
        ) : posts.length === 0 ? (
          (() => {
            const empty = search
              ? { icon: "search_off", title: "No results", description: "Try adjusting your search query." }
              : EMPTY_STATES[activeTab] || EMPTY_STATES.All;
            return (
              <div className="p-16 text-center">
                <span className="material-icons-round text-5xl text-slate-custom-300 mb-3">{empty.icon}</span>
                <p className="text-slate-custom-500 font-medium">{empty.title}</p>
                <p className="text-sm text-slate-custom-400 mt-1">{empty.description}</p>
              </div>
            );
          })()
        ) : (
          <div className="w-full overflow-x-auto">
            <table className="w-full border-separate border-spacing-y-1.5">
              <thead>
                <tr className="bg-slate-custom-50/50">
                  <th className="text-left px-4 py-3 text-xs font-semibold text-slate-custom-500 uppercase tracking-wider rounded-l-xl">Content</th>
                  <th className="text-left px-4 py-3 text-xs font-semibold text-slate-custom-500 uppercase tracking-wider">Status</th>
                  <th className="text-left px-4 py-3 text-xs font-semibold text-slate-custom-500 uppercase tracking-wider">Date</th>
                  <th className="text-center px-4 py-3 text-xs font-semibold text-slate-custom-500 uppercase tracking-wider">X Post</th>
                  <th className="text-right px-4 py-3 text-xs font-semibold text-slate-custom-500 uppercase tracking-wider rounded-r-xl">Actions</th>
                </tr>
              </thead>
              <tbody>
                {posts.map((post) => {
                  const isExpanded = expandedId === post.id;
                  return (
                    <tr key={post.id} className="bg-white/50 hover:bg-white/75 transition-colors group [&>td:first-child]:rounded-l-xl [&>td:last-child]:rounded-r-xl">
                      {/* Content */}
                      <td className="px-4 py-3 max-w-md">
                        <div
                          className="cursor-pointer"
                          onClick={() => setExpandedId(isExpanded ? null : post.id)}
                        >
                          <div className="flex items-start gap-1.5">
                            <span className="material-icons-round text-xs text-slate-custom-300 mt-1 transition-transform shrink-0" style={{ transform: isExpanded ? "rotate(90deg)" : "rotate(0deg)" }}>
                              chevron_right
                            </span>
                            <div className="min-w-0 flex-1">
                              {isExpanded ? (
                                <p className="text-sm font-medium text-slate-custom-800 whitespace-pre-wrap break-words">
                                  {post.content}
                                </p>
                              ) : (
                                <p className="text-sm font-medium text-slate-custom-800 truncate">
                                  {post.content}
                                </p>
                              )}
                              <span className="text-[10px] text-slate-custom-400 font-medium">
                                {post.content.length}/{charLimit.toLocaleString()}
                              </span>
                            </div>
                          </div>

                          {/* Expanded details */}
                          {isExpanded && (
                            <div className="mt-2 ml-5 space-y-1 text-xs text-slate-custom-500">
                              <p>Created: {new Date(post.createdAt).toLocaleString()}</p>
                              {post.scheduledFor && (
                                <p>Scheduled for: {new Date(post.scheduledFor).toLocaleString()}</p>
                              )}
                              {post.publishedAt && (
                                <p>Published: {new Date(post.publishedAt).toLocaleString()}</p>
                              )}
                              {post.status === "FAILED" && post.lastError && (
                                <div className="mt-1 p-2 rounded bg-red-50 border border-red-100">
                                  <p className="text-red-600 font-medium">Error: {post.lastError}</p>
                                  {post.attempts !== undefined && post.attempts > 0 && (
                                    <p className="text-red-500 mt-0.5">Attempts: {post.attempts}</p>
                                  )}
                                </div>
                              )}
                            </div>
                          )}
                        </div>
                      </td>

                      {/* Status */}
                      <td className="px-4 py-3">
                        <StatusBadge status={post.status} />
                        {post.status === "FAILED" && post.lastError && (
                          <p className="text-[11px] text-red-500 mt-1 max-w-[200px] truncate" title={post.lastError}>
                            {post.lastError}
                          </p>
                        )}
                      </td>

                      {/* Date */}
                      <td className="px-4 py-3 text-xs text-slate-custom-500 whitespace-nowrap">
                        {post.status === "SCHEDULED" && post.scheduledFor ? (
                          <div className="flex items-center gap-1">
                            <span className="material-icons-round text-purple-400 text-sm">schedule</span>
                            <div>
                              <p className="font-medium text-slate-custom-700">
                                {new Date(post.scheduledFor).toLocaleString()}
                              </p>
                              <p className="text-[10px] text-purple-500">
                                ({formatRelativeTime(post.scheduledFor)})
                              </p>
                            </div>
                          </div>
                        ) : post.status === "PUBLISHED" && post.publishedAt ? (
                          <div className="flex items-center gap-1">
                            <span className="material-icons-round text-green-400 text-sm">check_circle</span>
                            <div>
                              <p className="font-medium text-slate-custom-700">
                                {new Date(post.publishedAt).toLocaleString()}
                              </p>
                              <p className="text-[10px] text-green-500">
                                ({formatRelativeTime(post.publishedAt)})
                              </p>
                            </div>
                          </div>
                        ) : (
                          <span>{new Date(post.createdAt).toLocaleDateString()}</span>
                        )}
                      </td>

                      {/* X Post link */}
                      <td className="px-4 py-3 text-center">
                        {post.status === "PUBLISHED" && post.tweetUrl ? (
                          <a
                            href={post.tweetUrl}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="inline-flex items-center gap-1 text-slate-custom-500 hover:text-slate-custom-800 transition-colors"
                            title="View on X"
                          >
                            <svg viewBox="0 0 24 24" className="w-4 h-4 fill-current" aria-hidden="true">
                              <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z" />
                            </svg>
                            <span className="material-icons-round text-sm">open_in_new</span>
                          </a>
                        ) : (
                          <span className="text-slate-custom-300">&mdash;</span>
                        )}
                      </td>

                      {/* Actions */}
                      <td className="px-4 py-3">
                        <div className="flex items-center justify-end gap-1">
                          {/* DRAFT actions */}
                          {post.status === "DRAFT" && (
                            <>
                              <button
                                onClick={() => handleEdit(post)}
                                className="p-1.5 rounded hover:bg-slate-custom-100 text-slate-custom-400 hover:text-slate-custom-700 transition-colors"
                                title="Edit"
                              >
                                <span className="material-icons-round text-base">edit</span>
                              </button>
                              {isPro ? (
                                <button
                                  onClick={() => handleRetry(post)}
                                  disabled={actionLoading === post.id}
                                  className="p-1.5 rounded hover:bg-green-50 text-slate-custom-400 hover:text-green-600 transition-colors disabled:opacity-50"
                                  title="Post Now"
                                >
                                  <span className="material-icons-round text-base">send</span>
                                </button>
                              ) : (
                                <button
                                  disabled
                                  className="p-1.5 rounded text-slate-custom-300 cursor-not-allowed"
                                  title="Upgrade to Pro to post"
                                >
                                  <span className="material-icons-round text-base">send</span>
                                </button>
                              )}
                              {isPro && (
                                <button
                                  onClick={() => handleEdit(post)}
                                  className="p-1.5 rounded hover:bg-purple-50 text-slate-custom-400 hover:text-purple-600 transition-colors"
                                  title="Schedule"
                                >
                                  <span className="material-icons-round text-base">schedule</span>
                                </button>
                              )}
                              <button
                                onClick={() => handleDelete(post.id)}
                                disabled={actionLoading === post.id}
                                className="p-1.5 rounded hover:bg-red-50 text-slate-custom-400 hover:text-red-500 transition-colors disabled:opacity-50"
                                title="Delete"
                              >
                                <span className="material-icons-round text-base">delete_outline</span>
                              </button>
                            </>
                          )}

                          {/* SCHEDULED actions */}
                          {post.status === "SCHEDULED" && (
                            <>
                              <button
                                onClick={() => handleEdit(post)}
                                className="p-1.5 rounded hover:bg-slate-custom-100 text-slate-custom-400 hover:text-slate-custom-700 transition-colors"
                                title="Edit"
                              >
                                <span className="material-icons-round text-base">edit</span>
                              </button>
                              <button
                                onClick={() => {
                                  if (rescheduleId === post.id) {
                                    setRescheduleId(null);
                                  } else {
                                    setRescheduleId(post.id);
                                    setRescheduleDate("");
                                    setRescheduleTime("");
                                    setRescheduleError("");
                                  }
                                }}
                                className="p-1.5 rounded hover:bg-purple-50 text-slate-custom-400 hover:text-purple-600 transition-colors"
                                title="Reschedule"
                              >
                                <span className="material-icons-round text-base">schedule</span>
                              </button>
                              <button
                                onClick={() => handleCancel(post.id)}
                                disabled={actionLoading === post.id}
                                className="p-1.5 rounded hover:bg-yellow-50 text-slate-custom-400 hover:text-yellow-600 transition-colors disabled:opacity-50"
                                title="Cancel"
                              >
                                <span className="material-icons-round text-base">cancel</span>
                              </button>
                              <button
                                onClick={() => handleDelete(post.id)}
                                disabled={actionLoading === post.id}
                                className="p-1.5 rounded hover:bg-red-50 text-slate-custom-400 hover:text-red-500 transition-colors disabled:opacity-50"
                                title="Delete"
                              >
                                <span className="material-icons-round text-base">delete_outline</span>
                              </button>
                            </>
                          )}

                          {/* PUBLISHING — spinner only */}
                          {post.status === "PUBLISHING" && (
                            <span className="material-icons-round text-slate-custom-400 animate-spin text-base">sync</span>
                          )}

                          {/* PUBLISHED actions */}
                          {post.status === "PUBLISHED" && post.tweetUrl && (
                            <a
                              href={post.tweetUrl}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="p-1.5 rounded hover:bg-slate-custom-100 text-slate-custom-400 hover:text-slate-custom-700 transition-colors"
                              title="View on X"
                            >
                              <span className="material-icons-round text-base">open_in_new</span>
                            </a>
                          )}

                          {/* FAILED actions */}
                          {post.status === "FAILED" && (
                            <>
                              <button
                                onClick={() => handleRetry(post)}
                                disabled={actionLoading === post.id}
                                className="p-1.5 rounded hover:bg-green-50 text-slate-custom-400 hover:text-green-600 transition-colors disabled:opacity-50"
                                title="Retry"
                              >
                                <span className="material-icons-round text-base">refresh</span>
                              </button>
                              <button
                                onClick={() => handleEdit(post)}
                                className="p-1.5 rounded hover:bg-slate-custom-100 text-slate-custom-400 hover:text-slate-custom-700 transition-colors"
                                title="Edit"
                              >
                                <span className="material-icons-round text-base">edit</span>
                              </button>
                              <button
                                onClick={() => handleDelete(post.id)}
                                disabled={actionLoading === post.id}
                                className="p-1.5 rounded hover:bg-red-50 text-slate-custom-400 hover:text-red-500 transition-colors disabled:opacity-50"
                                title="Delete"
                              >
                                <span className="material-icons-round text-base">delete_outline</span>
                              </button>
                            </>
                          )}
                        </div>

                        {/* Inline Reschedule Row */}
                        {rescheduleId === post.id && post.status === "SCHEDULED" && (
                          <div className="mt-2 p-2 rounded-lg border border-purple-200 bg-purple-50/50 space-y-2">
                            <div className="flex items-center gap-2">
                              <input
                                type="date"
                                value={rescheduleDate}
                                onChange={(e) => { setRescheduleDate(e.target.value); setRescheduleError(""); }}
                                className="flex-1 px-2 py-1 border border-purple-200 rounded text-xs focus:outline-none focus:ring-1 focus:ring-purple-400 bg-card"
                              />
                              <input
                                type="time"
                                value={rescheduleTime}
                                onChange={(e) => { setRescheduleTime(e.target.value); setRescheduleError(""); }}
                                className="flex-1 px-2 py-1 border border-purple-200 rounded text-xs focus:outline-none focus:ring-1 focus:ring-purple-400 bg-card"
                              />
                              <button
                                onClick={() => handleReschedule(post.id)}
                                disabled={actionLoading === post.id}
                                className="px-3 py-1 bg-purple-600 text-white text-xs font-semibold rounded hover:bg-purple-700 transition-colors disabled:opacity-50"
                              >
                                Confirm
                              </button>
                            </div>
                            {rescheduleError && (
                              <p className="text-xs text-red-500">{rescheduleError}</p>
                            )}
                          </div>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Pagination */}
      {pagination.totalPages > 1 && (
        <div className="flex items-center justify-between">
          <p className="text-sm text-slate-custom-500">
            Showing {(pagination.page - 1) * pagination.limit + 1}-{Math.min(pagination.page * pagination.limit, pagination.total)} of {pagination.total}
          </p>
          <div className="flex items-center gap-1">
            <button
              onClick={() => fetchPosts(pagination.page - 1)}
              disabled={pagination.page <= 1}
              className="px-3 py-1.5 text-sm font-medium rounded-lg border border-slate-custom-200 hover:bg-slate-custom-50 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
            >
              Previous
            </button>
            {Array.from({ length: Math.min(pagination.totalPages, 5) }, (_, i) => {
              let pageNum: number;
              if (pagination.totalPages <= 5) {
                pageNum = i + 1;
              } else if (pagination.page <= 3) {
                pageNum = i + 1;
              } else if (pagination.page >= pagination.totalPages - 2) {
                pageNum = pagination.totalPages - 4 + i;
              } else {
                pageNum = pagination.page - 2 + i;
              }
              return (
                <button
                  key={pageNum}
                  onClick={() => fetchPosts(pageNum)}
                  className={`w-8 h-8 text-sm font-medium rounded-lg transition-colors ${
                    pagination.page === pageNum
                      ? "bg-slate-custom-900 text-white"
                      : "hover:bg-slate-custom-50 text-slate-custom-600"
                  }`}
                >
                  {pageNum}
                </button>
              );
            })}
            <button
              onClick={() => fetchPosts(pagination.page + 1)}
              disabled={pagination.page >= pagination.totalPages}
              className="px-3 py-1.5 text-sm font-medium rounded-lg border border-slate-custom-200 hover:bg-slate-custom-50 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
            >
              Next
            </button>
          </div>
        </div>
      )}
      </div>
    </div>
  );
}
