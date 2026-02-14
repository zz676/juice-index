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
  createdAt: string;
}

interface Pagination {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
}

const STATUS_TABS = ["All", "DRAFT", "SCHEDULED", "PUBLISHED", "FAILED"];

export default function PostsPage() {
  const [posts, setPosts] = useState<UserPostItem[]>([]);
  const [pagination, setPagination] = useState<Pagination>({ page: 1, limit: 20, total: 0, totalPages: 0 });
  const [activeTab, setActiveTab] = useState("All");
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState<string | null>(null);
  const [statusCounts, setStatusCounts] = useState<Record<string, number>>({});
  const [isPro, setIsPro] = useState(false);

  // Compose state
  const [composeOpen, setComposeOpen] = useState(false);
  const [composeContent, setComposeContent] = useState("");
  const [editingId, setEditingId] = useState<string | null>(null);
  const [scheduleDate, setScheduleDate] = useState("");
  const [scheduleTime, setScheduleTime] = useState("");
  const [composeLoading, setComposeLoading] = useState(false);
  const [composeError, setComposeError] = useState("");

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
      }
    } catch (error) {
      console.error("Failed to fetch posts", error);
    } finally {
      setLoading(false);
    }
  }, [activeTab, search]);

  // Fetch status counts
  useEffect(() => {
    async function fetchCounts() {
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
    }
    fetchCounts();
  }, []);

  useEffect(() => {
    fetchPosts();
  }, [fetchPosts]);

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
    if (composeContent.length > 280) {
      setComposeError("Content must be 280 characters or less");
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
        fetchPosts(pagination.page);
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
  };

  const handleDelete = async (postId: string) => {
    setActionLoading(postId);
    try {
      const res = await fetch(`/api/dashboard/user-posts/${postId}`, { method: "DELETE" });
      if (res.ok) fetchPosts(pagination.page);
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
      if (res.ok) fetchPosts(pagination.page);
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
      if (res.ok) fetchPosts(pagination.page);
    } catch (error) {
      console.error("Failed to retry post", error);
    } finally {
      setActionLoading(null);
    }
  };

  const charCount = composeContent.length;
  const charColor = charCount > 260 ? (charCount > 280 ? "text-red-600" : "text-yellow-600") : "text-slate-custom-400";

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h2 className="text-2xl font-bold text-slate-custom-900">My Posts</h2>
          <p className="text-sm text-slate-custom-500 mt-1">
            Compose, schedule, and manage your X posts
          </p>
        </div>
        <div className="flex items-center gap-3">
          <form onSubmit={handleSearchSubmit} className="relative w-full md:w-64">
            <span className="material-icons-round absolute left-3 top-1/2 -translate-y-1/2 text-slate-custom-400 text-base">
              search
            </span>
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search posts..."
              className="w-full pl-10 pr-4 py-2 bg-white border border-slate-custom-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary/50 focus:border-primary transition-all"
            />
          </form>
          <button
            onClick={() => { resetCompose(); setComposeOpen(!composeOpen); }}
            className="flex items-center gap-2 px-4 py-2 bg-slate-custom-900 text-white rounded-lg text-sm font-semibold hover:bg-slate-custom-800 transition-colors whitespace-nowrap"
          >
            <span className="material-icons-round text-base">add</span>
            Compose
          </button>
        </div>
      </div>

      {/* Compose Panel */}
      {composeOpen && (
        <div className="bg-white rounded-lg border border-slate-custom-200 p-5 space-y-4">
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
              {charCount}/280
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
            <button
              onClick={() => handleCompose("publish")}
              disabled={composeLoading}
              className="px-4 py-2 bg-slate-custom-900 text-white rounded-lg text-sm font-semibold hover:bg-slate-custom-800 transition-colors disabled:opacity-50"
            >
              Post Now
            </button>

            {/* Schedule — PRO only */}
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
        </div>
      )}

      {/* Status Tabs */}
      <div className="flex gap-2 border-b border-slate-custom-200 pb-px">
        {STATUS_TABS.map((tab) => {
          const count = tab === "All"
            ? Object.values(statusCounts).reduce((a, b) => a + b, 0)
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
      <div className="bg-white rounded-lg border border-slate-custom-100 overflow-hidden">
        {loading ? (
          <div className="p-6 space-y-4">
            {[...Array(8)].map((_, i) => (
              <div key={i} className="h-12 bg-slate-custom-50 rounded animate-pulse" />
            ))}
          </div>
        ) : posts.length === 0 ? (
          <div className="p-16 text-center">
            <span className="material-icons-round text-5xl text-slate-custom-300 mb-3">edit_note</span>
            <p className="text-slate-custom-500 font-medium">No posts yet</p>
            <p className="text-sm text-slate-custom-400 mt-1">
              {search ? "Try adjusting your search query" : "Compose your first post above."}
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-slate-custom-100 bg-slate-custom-50/50">
                  <th className="text-left px-4 py-3 text-xs font-semibold text-slate-custom-500 uppercase tracking-wider">Content</th>
                  <th className="text-left px-4 py-3 text-xs font-semibold text-slate-custom-500 uppercase tracking-wider">Status</th>
                  <th className="text-left px-4 py-3 text-xs font-semibold text-slate-custom-500 uppercase tracking-wider">Date</th>
                  <th className="text-right px-4 py-3 text-xs font-semibold text-slate-custom-500 uppercase tracking-wider">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-custom-50">
                {posts.map((post) => (
                  <tr key={post.id} className="hover:bg-slate-custom-50/50 transition-colors">
                    <td className="px-4 py-3 max-w-md">
                      <p className="text-sm font-medium text-slate-custom-800 truncate">
                        {post.content}
                      </p>
                      {post.status === "FAILED" && post.lastError && (
                        <p className="text-xs text-red-500 truncate mt-0.5">
                          {post.lastError}
                        </p>
                      )}
                    </td>
                    <td className="px-4 py-3">
                      <StatusBadge status={post.status} />
                    </td>
                    <td className="px-4 py-3 text-xs text-slate-custom-500 whitespace-nowrap">
                      {post.status === "SCHEDULED" && post.scheduledFor ? (
                        <span title="Scheduled for">
                          {new Date(post.scheduledFor).toLocaleString()}
                        </span>
                      ) : post.status === "PUBLISHED" && post.publishedAt ? (
                        <span title="Published at">
                          {new Date(post.publishedAt).toLocaleString()}
                        </span>
                      ) : (
                        new Date(post.createdAt).toLocaleDateString()
                      )}
                    </td>
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
                            <button
                              onClick={() => handleRetry(post)}
                              disabled={actionLoading === post.id}
                              className="p-1.5 rounded hover:bg-green-50 text-slate-custom-400 hover:text-green-600 transition-colors disabled:opacity-50"
                              title="Post Now"
                            >
                              <span className="material-icons-round text-base">send</span>
                            </button>
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
                    </td>
                  </tr>
                ))}
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
  );
}
