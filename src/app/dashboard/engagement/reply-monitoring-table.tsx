"use client";

import { useEffect, useState } from "react";
import { StatusBadge } from "@/components/dashboard/StatusBadge";
import type { EngagementReplyStatus } from "@prisma/client";

interface ReplyRow {
  id: string;
  sourceTweetId: string;
  sourceTweetText: string | null;
  sourceTweetUrl: string | null;
  replyText: string | null;
  replyTweetId: string | null;
  replyTweetUrl: string | null;
  tone: string;
  status: EngagementReplyStatus;
  lastError: string | null;
  totalCost: number;
  createdAt: string;
  MonitoredAccount: {
    username: string;
    displayName: string | null;
    avatarUrl: string | null;
  } | null;
}

interface Pagination {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
}

type SortField = "createdAt" | "status" | "tone";
const STATUS_TABS: Array<"All" | EngagementReplyStatus> = [
  "All",
  "POSTED",
  "PENDING",
  "GENERATING",
  "POSTING",
  "FAILED",
  "SKIPPED",
];

export function ReplyMonitoringTable() {
  const [replies, setReplies] = useState<ReplyRow[]>([]);
  const [pagination, setPagination] = useState<Pagination>({
    page: 1,
    limit: 10,
    total: 0,
    totalPages: 0,
  });
  const [statusCounts, setStatusCounts] = useState<Partial<Record<EngagementReplyStatus, number>>>(
    {},
  );
  const [activeTab, setActiveTab] = useState<"All" | EngagementReplyStatus>("All");
  const [sortBy, setSortBy] = useState<SortField>("createdAt");
  const [sortOrder, setSortOrder] = useState<"asc" | "desc">("desc");
  const [loading, setLoading] = useState(false);

  const fetchReplies = async (
    page = 1,
    tab: "All" | EngagementReplyStatus = activeTab,
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
      if (tab !== "All") params.set("status", tab);
      const res = await fetch(`/api/dashboard/engagement/replies?${params}`);
      const data = await res.json();
      setReplies(data.replies ?? []);
      setPagination(data.pagination);
      setStatusCounts(data.statusCounts ?? {});
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchReplies(1);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleTabChange = (tab: "All" | EngagementReplyStatus) => {
    setActiveTab(tab);
    fetchReplies(1, tab, sortBy, sortOrder);
  };

  const handleSort = (field: SortField) => {
    const newOrder = sortBy === field && sortOrder === "desc" ? "asc" : "desc";
    setSortBy(field);
    setSortOrder(newOrder);
    fetchReplies(1, activeTab, field, newOrder);
  };

  const handlePage = (page: number) => {
    fetchReplies(page, activeTab, sortBy, sortOrder);
  };

  const totalCount = Object.values(statusCounts).reduce((s, c) => s + (c ?? 0), 0);

  const SortIcon = ({ field }: { field: SortField }) => {
    if (sortBy !== field) {
      return <span className="material-icons-round text-[14px] text-slate-custom-300">unfold_more</span>;
    }
    return (
      <span className="material-icons-round text-[14px] text-primary">
        {sortOrder === "desc" ? "arrow_downward" : "arrow_upward"}
      </span>
    );
  };

  return (
    <div className="space-y-4">
      {/* Status Tabs */}
      <div className="flex gap-2 border-b border-slate-custom-200 pb-px overflow-x-auto">
        {STATUS_TABS.map((tab) => {
          const count = tab === "All" ? totalCount : statusCounts[tab] || 0;
          return (
            <button
              key={tab}
              onClick={() => handleTabChange(tab)}
              className={`px-4 py-2.5 text-sm font-semibold border-b-2 transition-colors whitespace-nowrap ${
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
            {[...Array(5)].map((_, i) => (
              <div key={i} className="h-12 bg-slate-custom-50 rounded animate-pulse" />
            ))}
          </div>
        ) : replies.length === 0 ? (
          <div className="p-10 text-center">
            <span className="material-icons-round text-[40px] text-slate-custom-300">forum</span>
            <p className="mt-3 text-sm text-slate-custom-500">
              {activeTab === "All" ? "No replies yet." : `No ${activeTab.toLowerCase()} replies.`}
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-slate-custom-100 bg-slate-custom-50">
                  <th className="px-4 py-3 text-left">
                    <button
                      onClick={() => handleSort("status")}
                      className="flex items-center gap-1 text-xs font-semibold text-slate-custom-500 hover:text-slate-custom-700"
                    >
                      Status
                      <SortIcon field="status" />
                    </button>
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-slate-custom-500">
                    Reply
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-slate-custom-500">
                    Source Tweet
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-slate-custom-500">
                    Account
                  </th>
                  <th className="px-4 py-3 text-left">
                    <button
                      onClick={() => handleSort("tone")}
                      className="flex items-center gap-1 text-xs font-semibold text-slate-custom-500 hover:text-slate-custom-700"
                    >
                      Tone
                      <SortIcon field="tone" />
                    </button>
                  </th>
                  <th className="px-4 py-3 text-right text-xs font-semibold text-slate-custom-500">
                    Cost
                  </th>
                  <th className="px-4 py-3 text-left">
                    <button
                      onClick={() => handleSort("createdAt")}
                      className="flex items-center gap-1 text-xs font-semibold text-slate-custom-500 hover:text-slate-custom-700"
                    >
                      Date
                      <SortIcon field="createdAt" />
                    </button>
                  </th>
                </tr>
              </thead>
              <tbody>
                {replies.map((reply) => (
                  <tr
                    key={reply.id}
                    className="border-b border-slate-custom-50 hover:bg-slate-custom-50/50 transition-colors"
                  >
                    <td className="px-4 py-3">
                      <div className="flex flex-col gap-1">
                        <StatusBadge status={reply.status} />
                        {reply.lastError && (
                          <span
                            className="text-[10px] text-red-500 truncate max-w-[120px]"
                            title={reply.lastError}
                          >
                            {reply.lastError}
                          </span>
                        )}
                      </div>
                    </td>
                    <td className="px-4 py-3 max-w-[200px]">
                      {reply.replyTweetUrl ? (
                        <a
                          href={reply.replyTweetUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-primary hover:underline text-xs font-medium flex items-center gap-1"
                        >
                          <span className="material-icons-round text-[12px]">open_in_new</span>
                          View reply
                        </a>
                      ) : (
                        <span className="text-xs text-slate-custom-400 truncate block max-w-[180px]" title={reply.replyText ?? ""}>
                          {reply.replyText || "—"}
                        </span>
                      )}
                    </td>
                    <td className="px-4 py-3 max-w-[180px]">
                      {reply.sourceTweetUrl ? (
                        <a
                          href={reply.sourceTweetUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-xs text-slate-custom-500 hover:text-primary truncate block max-w-[160px]"
                          title={reply.sourceTweetText ?? ""}
                        >
                          {reply.sourceTweetText?.slice(0, 60) || reply.sourceTweetId}
                          {(reply.sourceTweetText?.length ?? 0) > 60 ? "…" : ""}
                        </a>
                      ) : (
                        <span className="text-xs text-slate-custom-400">—</span>
                      )}
                    </td>
                    <td className="px-4 py-3">
                      {reply.MonitoredAccount ? (
                        <div className="flex items-center gap-2">
                          {reply.MonitoredAccount.avatarUrl ? (
                            <img
                              src={reply.MonitoredAccount.avatarUrl}
                              alt={reply.MonitoredAccount.username}
                              className="w-5 h-5 rounded-full object-cover flex-shrink-0"
                              referrerPolicy="no-referrer"
                            />
                          ) : null}
                          <span className="text-xs text-slate-custom-700">
                            @{reply.MonitoredAccount.username}
                          </span>
                        </div>
                      ) : (
                        <span className="text-xs text-slate-custom-400">—</span>
                      )}
                    </td>
                    <td className="px-4 py-3">
                      <span className="text-xs text-slate-custom-500 capitalize">
                        {reply.tone.toLowerCase().replace(/_/g, " ")}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-right">
                      <span className="text-xs text-slate-custom-600">
                        ${reply.totalCost.toFixed(4)}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <span className="text-xs text-slate-custom-500">
                        {new Date(reply.createdAt).toLocaleDateString("en-US", {
                          month: "short",
                          day: "numeric",
                          hour: "2-digit",
                          minute: "2-digit",
                        })}
                      </span>
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
            Showing {(pagination.page - 1) * pagination.limit + 1}–
            {Math.min(pagination.page * pagination.limit, pagination.total)} of {pagination.total}
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
    </div>
  );
}
