"use client";

import { useEffect, useState } from "react";
import { StatusBadge } from "@/components/dashboard/StatusBadge";
import type {
  AdminEngagementUser,
  AdminEngagementSummary,
  AdminEngagementReply,
} from "./types";

interface Pagination {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
}

type UserSortBy = "totalReplies" | "successRate" | "totalCost" | "lastReplyDate" | "name" | "email";

function MetricCard({ label, value }: { label: string; value: string }) {
  return (
    <div className="bg-white rounded-xl border border-slate-custom-200 p-4">
      <p className="text-xs font-medium text-slate-custom-500 mb-1">{label}</p>
      <p className="text-xl font-bold text-slate-custom-900">{value}</p>
    </div>
  );
}

function fmtUSD(n: number) {
  return n.toLocaleString("en-US", {
    style: "currency",
    currency: "USD",
    minimumFractionDigits: 4,
    maximumFractionDigits: 4,
  });
}

function fmt(n: number) {
  return n.toLocaleString("en-US");
}

// ── User sub-table (replies for a single user) ─────────────────────────────

interface UserRepliesTableProps {
  userId: string;
}

function UserRepliesTable({ userId }: UserRepliesTableProps) {
  const [replies, setReplies] = useState<AdminEngagementReply[]>([]);
  const [pagination, setPagination] = useState<Pagination>({
    page: 1,
    limit: 10,
    total: 0,
    totalPages: 0,
  });
  const [loading, setLoading] = useState(false);

  const fetchReplies = async (page = 1) => {
    setLoading(true);
    try {
      const params = new URLSearchParams({ page: String(page), limit: "10" });
      const res = await fetch(
        `/api/dashboard/admin/engagement/${userId}/replies?${params}`,
      );
      const data = await res.json();
      setReplies(data.replies ?? []);
      setPagination(data.pagination);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchReplies(1);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [userId]);

  if (loading && replies.length === 0) {
    return (
      <div className="p-4 space-y-2">
        {[...Array(3)].map((_, i) => (
          <div key={i} className="h-8 bg-slate-custom-50 rounded animate-pulse" />
        ))}
      </div>
    );
  }

  if (replies.length === 0) {
    return <p className="p-4 text-sm text-slate-custom-500">No replies found.</p>;
  }

  return (
    <div className="border-t border-slate-custom-100">
      <div className="overflow-x-auto">
        <table className="w-full text-xs">
          <thead>
            <tr className="bg-slate-custom-50 border-b border-slate-custom-100">
              <th className="px-4 py-2 text-left font-semibold text-slate-custom-500">Status</th>
              <th className="px-4 py-2 text-left font-semibold text-slate-custom-500">Reply</th>
              <th className="px-4 py-2 text-left font-semibold text-slate-custom-500">Source Tweet</th>
              <th className="px-4 py-2 text-left font-semibold text-slate-custom-500">Account</th>
              <th className="px-4 py-2 text-left font-semibold text-slate-custom-500">Tone</th>
              <th className="px-4 py-2 text-right font-semibold text-slate-custom-500">Text cost</th>
              <th className="px-4 py-2 text-right font-semibold text-slate-custom-500">Img cost</th>
              <th className="px-4 py-2 text-right font-semibold text-slate-custom-500">Total</th>
              <th className="px-4 py-2 text-left font-semibold text-slate-custom-500">Date</th>
            </tr>
          </thead>
          <tbody>
            {replies.map((r) => (
              <tr key={r.id} className="border-b border-slate-custom-50 hover:bg-slate-custom-50/50">
                <td className="px-4 py-2">
                  <StatusBadge status={r.status} />
                </td>
                <td className="px-4 py-2 max-w-[160px]">
                  {r.replyTweetUrl ? (
                    <a
                      href={r.replyTweetUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-primary hover:underline flex items-center gap-1"
                    >
                      <span className="material-icons-round text-[12px]">open_in_new</span>
                      View
                    </a>
                  ) : (
                    <span
                      className="text-slate-custom-500 truncate block max-w-[140px]"
                      title={r.replyText ?? ""}
                    >
                      {r.replyText?.slice(0, 60) ?? "—"}
                    </span>
                  )}
                </td>
                <td className="px-4 py-2 max-w-[160px]">
                  {r.sourceTweetUrl ? (
                    <a
                      href={r.sourceTweetUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-slate-custom-500 hover:text-primary truncate block max-w-[140px]"
                      title={r.sourceTweetText ?? ""}
                    >
                      {r.sourceTweetText?.slice(0, 50) ?? r.sourceTweetId}
                      {(r.sourceTweetText?.length ?? 0) > 50 ? "…" : ""}
                    </a>
                  ) : (
                    <span className="text-slate-custom-400">—</span>
                  )}
                </td>
                <td className="px-4 py-2">
                  <span className="text-slate-custom-700">
                    @{r.MonitoredAccount?.username ?? "—"}
                  </span>
                </td>
                <td className="px-4 py-2 capitalize text-slate-custom-500">
                  {r.tone.toLowerCase().replace(/_/g, " ")}
                </td>
                <td className="px-4 py-2 text-right text-slate-custom-600 font-mono">
                  ${r.textGenerationCost.toFixed(4)}
                </td>
                <td className="px-4 py-2 text-right text-slate-custom-600 font-mono">
                  ${r.imageGenerationCost.toFixed(4)}
                </td>
                <td className="px-4 py-2 text-right text-slate-custom-800 font-mono font-semibold">
                  ${r.totalCost.toFixed(4)}
                </td>
                <td className="px-4 py-2 text-slate-custom-500 whitespace-nowrap">
                  {new Date(r.createdAt).toLocaleDateString("en-US", {
                    month: "short",
                    day: "numeric",
                    hour: "2-digit",
                    minute: "2-digit",
                  })}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Sub-pagination */}
      {pagination.totalPages > 1 && (
        <div className="flex items-center justify-between px-4 py-3 border-t border-slate-custom-100">
          <p className="text-xs text-slate-custom-500">
            {(pagination.page - 1) * pagination.limit + 1}–
            {Math.min(pagination.page * pagination.limit, pagination.total)} of {pagination.total}
          </p>
          <div className="flex items-center gap-1">
            <button
              onClick={() => fetchReplies(pagination.page - 1)}
              disabled={pagination.page <= 1}
              className="px-2 py-1 text-xs font-medium rounded border border-slate-custom-200 hover:bg-slate-custom-50 disabled:opacity-40 transition-colors"
            >
              Prev
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
                  onClick={() => fetchReplies(pageNum)}
                  className={`w-6 h-6 text-xs font-medium rounded transition-colors ${
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
              onClick={() => fetchReplies(pagination.page + 1)}
              disabled={pagination.page >= pagination.totalPages}
              className="px-2 py-1 text-xs font-medium rounded border border-slate-custom-200 hover:bg-slate-custom-50 disabled:opacity-40 transition-colors"
            >
              Next
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

// ── Main EngagementTab ─────────────────────────────────────────────────────

export function EngagementTab() {
  const [users, setUsers] = useState<AdminEngagementUser[]>([]);
  const [summary, setSummary] = useState<AdminEngagementSummary | null>(null);
  const [pagination, setPagination] = useState<Pagination>({
    page: 1,
    limit: 10,
    total: 0,
    totalPages: 0,
  });
  const [loading, setLoading] = useState(false);
  const [expandedUserId, setExpandedUserId] = useState<string | null>(null);
  const [sortBy, setSortBy] = useState<UserSortBy>("totalReplies");
  const [sortOrder, setSortOrder] = useState<"asc" | "desc">("desc");

  const fetchData = async (
    page = 1,
    sort = sortBy,
    order = sortOrder,
  ) => {
    setLoading(true);
    try {
      const params = new URLSearchParams({
        page: String(page),
        limit: "10",
        sortBy: sort,
        sortOrder: order,
      });
      const res = await fetch(`/api/dashboard/admin/engagement?${params}`);
      if (!res.ok) {
        const text = await res.text();
        throw new Error(text || `HTTP ${res.status}`);
      }
      const data = await res.json();
      setUsers(data.users ?? []);
      setSummary(data.summary ?? null);
      setPagination(data.pagination);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData(1);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleSort = (field: UserSortBy) => {
    const newOrder = sortBy === field && sortOrder === "desc" ? "asc" : "desc";
    setSortBy(field);
    setSortOrder(newOrder);
    fetchData(1, field, newOrder);
  };

  const handlePage = (page: number) => {
    fetchData(page, sortBy, sortOrder);
  };

  const toggleExpand = (userId: string) => {
    setExpandedUserId((prev) => (prev === userId ? null : userId));
  };

  const SortIcon = ({ field }: { field: UserSortBy }) => {
    if (sortBy !== field) {
      return (
        <span className="material-icons-round text-[14px] text-slate-custom-300">
          unfold_more
        </span>
      );
    }
    return (
      <span className="material-icons-round text-[14px] text-primary">
        {sortOrder === "desc" ? "arrow_downward" : "arrow_upward"}
      </span>
    );
  };

  return (
    <div className="space-y-6">
      {/* KPI Cards */}
      {summary && (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <MetricCard label="Total Replies" value={fmt(summary.totalReplies)} />
          <MetricCard label="Total Cost" value={fmtUSD(summary.totalCost)} />
          <MetricCard
            label="Avg Cost / Reply"
            value={summary.totalReplies > 0 ? fmtUSD(summary.avgCostPerReply) : "$0.0000"}
          />
          <MetricCard label="Active Users" value={fmt(summary.activeUsers)} />
        </div>
      )}

      {/* User table */}
      <div className="bg-white rounded-xl border border-slate-custom-200 overflow-hidden">
        {loading && users.length === 0 ? (
          <div className="p-6 space-y-4">
            {[...Array(5)].map((_, i) => (
              <div key={i} className="h-12 bg-slate-custom-50 rounded animate-pulse" />
            ))}
          </div>
        ) : users.length === 0 ? (
          <div className="p-10 text-center">
            <span className="material-icons-round text-[40px] text-slate-custom-300">forum</span>
            <p className="mt-3 text-sm text-slate-custom-500">No engagement activity yet.</p>
          </div>
        ) : (
          <>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-slate-custom-100 bg-slate-custom-50">
                    <th className="px-4 py-3 text-left">
                      <button
                        onClick={() => handleSort("name")}
                        className="flex items-center gap-1 text-xs font-semibold text-slate-custom-500 hover:text-slate-custom-700"
                      >
                        Name
                        <SortIcon field="name" />
                      </button>
                    </th>
                    <th className="px-4 py-3 text-left">
                      <button
                        onClick={() => handleSort("email")}
                        className="flex items-center gap-1 text-xs font-semibold text-slate-custom-500 hover:text-slate-custom-700"
                      >
                        Email
                        <SortIcon field="email" />
                      </button>
                    </th>
                    <th className="px-4 py-3 text-right">
                      <button
                        onClick={() => handleSort("totalReplies")}
                        className="flex items-center gap-1 text-xs font-semibold text-slate-custom-500 hover:text-slate-custom-700 ml-auto"
                      >
                        Replies
                        <SortIcon field="totalReplies" />
                      </button>
                    </th>
                    <th className="px-4 py-3 text-right">
                      <button
                        onClick={() => handleSort("successRate")}
                        className="flex items-center gap-1 text-xs font-semibold text-slate-custom-500 hover:text-slate-custom-700 ml-auto"
                      >
                        Success
                        <SortIcon field="successRate" />
                      </button>
                    </th>
                    <th className="px-4 py-3 text-right">
                      <button
                        onClick={() => handleSort("totalCost")}
                        className="flex items-center gap-1 text-xs font-semibold text-slate-custom-500 hover:text-slate-custom-700 ml-auto"
                      >
                        Total Cost
                        <SortIcon field="totalCost" />
                      </button>
                    </th>
                    <th className="px-4 py-3 text-left">
                      <button
                        onClick={() => handleSort("lastReplyDate")}
                        className="flex items-center gap-1 text-xs font-semibold text-slate-custom-500 hover:text-slate-custom-700"
                      >
                        Last Reply
                        <SortIcon field="lastReplyDate" />
                      </button>
                    </th>
                    <th className="px-4 py-3 text-center text-xs font-semibold text-slate-custom-500 w-10" />
                  </tr>
                </thead>
                <tbody>
                  {users.map((user) => (
                    <>
                      <tr
                        key={user.userId}
                        className={`border-b border-slate-custom-50 hover:bg-slate-custom-50/50 cursor-pointer transition-colors ${
                          expandedUserId === user.userId ? "bg-slate-custom-50" : ""
                        }`}
                        onClick={() => toggleExpand(user.userId)}
                      >
                        <td className="px-4 py-3 text-slate-custom-800 font-medium">
                          {user.name || "—"}
                        </td>
                        <td className="px-4 py-3 text-slate-custom-600 font-mono text-xs">
                          {user.email}
                        </td>
                        <td className="px-4 py-3 text-right text-slate-custom-800">
                          {fmt(user.totalReplies)}
                          {user.failedReplies > 0 && (
                            <span className="ml-1 text-xs text-red-500">
                              ({fmt(user.failedReplies)} failed)
                            </span>
                          )}
                        </td>
                        <td className="px-4 py-3 text-right">
                          <span
                            className={`text-sm font-medium ${
                              user.successRate >= 90
                                ? "text-green-600"
                                : user.successRate >= 70
                                ? "text-amber-600"
                                : "text-red-600"
                            }`}
                          >
                            {user.successRate}%
                          </span>
                        </td>
                        <td className="px-4 py-3 text-right text-slate-custom-800 font-mono text-xs">
                          {fmtUSD(user.totalCost)}
                        </td>
                        <td className="px-4 py-3 text-slate-custom-500 text-xs">
                          {user.lastReplyDate
                            ? new Date(user.lastReplyDate).toLocaleDateString("en-US", {
                                month: "short",
                                day: "numeric",
                                hour: "2-digit",
                                minute: "2-digit",
                              })
                            : "—"}
                        </td>
                        <td className="px-4 py-3 text-center">
                          <span className="material-icons-round text-[18px] text-slate-custom-400">
                            {expandedUserId === user.userId ? "expand_less" : "expand_more"}
                          </span>
                        </td>
                      </tr>
                      {expandedUserId === user.userId && (
                        <tr key={`${user.userId}-expanded`} className="bg-slate-custom-50">
                          <td colSpan={7} className="p-0">
                            <UserRepliesTable userId={user.userId} />
                          </td>
                        </tr>
                      )}
                    </>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Pagination */}
            {pagination.totalPages > 1 && (
              <div className="flex items-center justify-between px-4 py-3 border-t border-slate-custom-100">
                <p className="text-sm text-slate-custom-500">
                  Showing {(pagination.page - 1) * pagination.limit + 1}–
                  {Math.min(pagination.page * pagination.limit, pagination.total)} of{" "}
                  {pagination.total}
                </p>
                <div className="flex items-center gap-1">
                  <button
                    onClick={() => handlePage(pagination.page - 1)}
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
                        onClick={() => handlePage(pageNum)}
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
                    onClick={() => handlePage(pagination.page + 1)}
                    disabled={pagination.page >= pagination.totalPages}
                    className="px-3 py-1.5 text-sm font-medium rounded-lg border border-slate-custom-200 hover:bg-slate-custom-50 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
                  >
                    Next
                  </button>
                </div>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}
