"use client";

import Link from "next/link";
import { useState, useEffect, useCallback } from "react";
import { StatusBadge } from "./StatusBadge";

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

const STATUS_TABS = ["All", "SCHEDULED", "PUBLISHED", "DRAFT", "FAILED"];

export function CompactPostTable() {
  const [posts, setPosts] = useState<UserPostItem[]>([]);
  const [activeTab, setActiveTab] = useState("All");
  const [loading, setLoading] = useState(true);
  const [actionId, setActionId] = useState<string | null>(null);

  const fetchPosts = useCallback(async () => {
    setLoading(true);
    try {
      const statusParam = activeTab !== "All" ? `&status=${activeTab}` : "";
      const res = await fetch(`/api/dashboard/user-posts?limit=8${statusParam}`);
      if (res.ok) {
        const json = await res.json();
        setPosts(json.posts);
      }
    } catch (error) {
      console.error("Failed to fetch posts", error);
    } finally {
      setLoading(false);
    }
  }, [activeTab]);

  useEffect(() => {
    fetchPosts();
  }, [fetchPosts]);

  const handleCancel = async (id: string) => {
    setActionId(id);
    try {
      const res = await fetch(`/api/dashboard/user-posts/${id}/cancel`, { method: "POST" });
      if (res.ok) fetchPosts();
    } catch (error) {
      console.error("Failed to cancel post", error);
    } finally {
      setActionId(null);
    }
  };

  const handleDelete = async (id: string) => {
    setActionId(id);
    try {
      const res = await fetch(`/api/dashboard/user-posts/${id}`, { method: "DELETE" });
      if (res.ok) {
        setPosts((prev) => prev.filter((p) => p.id !== id));
      }
    } catch (error) {
      console.error("Failed to delete post", error);
    } finally {
      setActionId(null);
    }
  };

  const statusIcon = (status: string) => {
    switch (status) {
      case "DRAFT": return "edit_note";
      case "SCHEDULED": return "schedule";
      case "PUBLISHING": return "sync";
      case "PUBLISHED": return "check_circle";
      case "FAILED": return "error_outline";
      default: return "article";
    }
  };

  const formatDate = (post: UserPostItem) => {
    if (post.status === "SCHEDULED" && post.scheduledFor) {
      return new Date(post.scheduledFor).toLocaleDateString();
    }
    if (post.status === "PUBLISHED" && post.publishedAt) {
      return new Date(post.publishedAt).toLocaleDateString();
    }
    return new Date(post.createdAt).toLocaleDateString();
  };

  return (
    <div className="bg-card rounded-lg shadow-[0_2px_10px_rgba(0,0,0,0.04),0_0_28px_rgba(155,199,84,0.35)] border border-lime-200">
      <div className="p-4 border-b border-slate-custom-100">
        <div className="flex items-center justify-between mb-3">
          <h3 className="font-bold text-slate-custom-900">My Posts</h3>
          <Link
            href="/dashboard/posts"
            className="text-xs font-semibold text-primary hover:text-primary/80 uppercase tracking-wide"
          >
            View All
          </Link>
        </div>

        {/* Status tabs */}
        <div className="flex gap-1 overflow-x-auto">
          {STATUS_TABS.map((tab) => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              className={`px-2.5 py-1 text-[11px] font-semibold rounded-full whitespace-nowrap transition-colors ${
                activeTab === tab
                  ? "bg-slate-custom-900 text-white"
                  : "text-slate-custom-500 hover:bg-slate-custom-50"
              }`}
            >
              {tab === "All" ? "All" : tab.charAt(0) + tab.slice(1).toLowerCase()}
            </button>
          ))}
        </div>
      </div>

      {/* Posts list */}
      <div className="divide-y divide-slate-custom-50">
        {loading ? (
          <div className="p-4 space-y-3">
            {[...Array(4)].map((_, i) => (
              <div key={i} className="h-10 bg-slate-custom-50 rounded animate-pulse" />
            ))}
          </div>
        ) : posts.length === 0 ? (
          <div className="p-8 text-center text-slate-custom-400 text-sm">
            No posts found
          </div>
        ) : (
          posts.map((post) => (
            <div key={post.id} className="flex items-center gap-3 px-4 py-2.5 hover:bg-slate-custom-50 transition-colors">
              <span className="material-icons-round text-slate-custom-400 text-base flex-shrink-0">
                {statusIcon(post.status)}
              </span>
              <div className="flex-1 min-w-0">
                <p className="text-sm text-slate-custom-800 truncate font-medium">
                  {post.content}
                </p>
                <p className="text-[11px] text-slate-custom-400">
                  {formatDate(post)}
                </p>
                {post.status === "FAILED" && post.lastError && (
                  <p className="text-[10px] text-red-500 truncate" title={post.lastError}>
                    {post.lastError}
                  </p>
                )}
              </div>
              <StatusBadge status={post.status} />
              <div className="flex items-center gap-1 flex-shrink-0">
                {/* Published: link to tweet */}
                {post.status === "PUBLISHED" && post.tweetUrl && (
                  <a
                    href={post.tweetUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="p-1 rounded hover:bg-slate-custom-100 text-slate-custom-400 hover:text-slate-custom-700 transition-colors"
                    title="View on X"
                  >
                    <span className="material-icons-round text-base">open_in_new</span>
                  </a>
                )}

                {/* Scheduled: cancel */}
                {post.status === "SCHEDULED" && (
                  <button
                    onClick={() => handleCancel(post.id)}
                    disabled={actionId === post.id}
                    className="p-1 rounded hover:bg-yellow-50 text-slate-custom-400 hover:text-yellow-600 transition-colors disabled:opacity-50"
                    title="Cancel schedule"
                  >
                    <span className="material-icons-round text-base">cancel</span>
                  </button>
                )}

                {/* Draft / Failed: delete */}
                {(post.status === "DRAFT" || post.status === "FAILED") && (
                  <button
                    onClick={() => handleDelete(post.id)}
                    disabled={actionId === post.id}
                    className="p-1 rounded hover:bg-red-50 text-slate-custom-400 hover:text-red-500 transition-colors disabled:opacity-50"
                    title="Delete"
                  >
                    <span className="material-icons-round text-base">delete_outline</span>
                  </button>
                )}

              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
