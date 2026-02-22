"use client";

import { useEffect, useRef, useState, useCallback } from "react";
import { useRouter } from "next/navigation";

interface Notification {
  id: string;
  type: "DIGEST_READY" | "ALERT" | "WELCOME" | "SYSTEM";
  title: string;
  message: string;
  link: string | null;
  read: boolean;
  createdAt: string;
}

const TYPE_CONFIG: Record<
  Notification["type"],
  { icon: string; bg: string; text: string }
> = {
  DIGEST_READY: { icon: "summarize", bg: "bg-green-100", text: "text-green-600" },
  ALERT: { icon: "trending_up", bg: "bg-orange-100", text: "text-orange-600" },
  WELCOME: { icon: "waving_hand", bg: "bg-blue-100", text: "text-blue-600" },
  SYSTEM: { icon: "info", bg: "bg-slate-100", text: "text-slate-600" },
};

function timeAgo(dateStr: string): string {
  const seconds = Math.floor((Date.now() - new Date(dateStr).getTime()) / 1000);
  if (seconds < 60) return "just now";
  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  if (days < 7) return `${days}d ago`;
  return new Date(dateStr).toLocaleDateString();
}

export default function NotificationBell() {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [loading, setLoading] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  const fetchNotifications = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/dashboard/notifications?limit=20");
      if (!res.ok) return;
      const data = await res.json();
      setNotifications(data.notifications);
      setUnreadCount(data.unreadCount);
    } finally {
      setLoading(false);
    }
  }, []);

  // Fetch unread count on mount
  useEffect(() => {
    fetchNotifications();
  }, [fetchNotifications]);

  // Refetch when dropdown opens
  useEffect(() => {
    if (open) fetchNotifications();
  }, [open, fetchNotifications]);

  // Close on click outside
  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        setOpen(false);
      }
    }
    if (open) {
      document.addEventListener("mousedown", handleClickOutside);
      return () => document.removeEventListener("mousedown", handleClickOutside);
    }
  }, [open]);

  const markAllRead = async () => {
    const res = await fetch("/api/dashboard/notifications", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ all: true }),
    });
    if (!res.ok) return;
    const data = await res.json();
    setUnreadCount(data.unreadCount);
    setNotifications((prev) => prev.map((n) => ({ ...n, read: true })));
  };

  const handleNotificationClick = async (notification: Notification) => {
    if (!notification.read) {
      const res = await fetch("/api/dashboard/notifications", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ids: [notification.id] }),
      });
      if (res.ok) {
        const data = await res.json();
        setUnreadCount(data.unreadCount);
        setNotifications((prev) =>
          prev.map((n) => (n.id === notification.id ? { ...n, read: true } : n))
        );
      }
    }
    setOpen(false);
    if (notification.link) {
      router.push(notification.link);
    }
  };

  return (
    <div ref={ref} className="relative">
      {/* Bell Button */}
      <button
        onClick={() => setOpen((v) => !v)}
        className="w-10 h-10 rounded-full bg-white border border-slate-custom-200 flex items-center justify-center text-slate-custom-500 hover:text-primary hover:border-primary/50 transition-all shadow-sm relative"
      >
        <span className="material-icons-round">notifications_none</span>
        {unreadCount > 0 && (
          <span className="absolute top-2 right-2.5 w-2 h-2 bg-primary rounded-full ring-2 ring-white"></span>
        )}
      </button>

      {/* Dropdown Panel */}
      {open && (
        <div className="absolute right-0 top-full mt-2 w-96 bg-white rounded-xl border border-slate-custom-200 shadow-lg z-50 overflow-hidden">
          {/* Header */}
          <div className="flex items-center justify-between px-4 py-3 border-b border-slate-custom-100">
            <h3 className="text-sm font-semibold text-slate-custom-900">Notifications</h3>
            {unreadCount > 0 && (
              <button
                onClick={markAllRead}
                className="text-xs text-primary hover:text-primary/80 font-medium transition-colors"
              >
                Mark all as read
              </button>
            )}
          </div>

          {/* Notification List */}
          <div className="max-h-[400px] overflow-y-auto">
            {loading && notifications.length === 0 ? (
              <div className="p-4 space-y-3">
                {[1, 2, 3].map((i) => (
                  <div key={i} className="flex gap-3 animate-pulse">
                    <div className="w-9 h-9 rounded-lg bg-slate-custom-100 flex-shrink-0" />
                    <div className="flex-1 space-y-2">
                      <div className="h-3 bg-slate-custom-100 rounded w-3/4" />
                      <div className="h-3 bg-slate-custom-100 rounded w-full" />
                    </div>
                  </div>
                ))}
              </div>
            ) : notifications.length === 0 ? (
              <div className="p-8 text-center">
                <span className="material-icons-round text-[32px] text-slate-custom-300">
                  notifications_none
                </span>
                <p className="text-sm text-slate-custom-500 mt-2">No notifications yet</p>
              </div>
            ) : (
              notifications.map((notification) => {
                const config = TYPE_CONFIG[notification.type];
                return (
                  <button
                    key={notification.id}
                    onClick={() => handleNotificationClick(notification)}
                    className={`w-full flex gap-3 px-4 py-3 text-left hover:bg-slate-custom-50 transition-colors ${
                      !notification.read ? "bg-primary/5" : ""
                    }`}
                  >
                    <div
                      className={`w-9 h-9 rounded-lg ${config.bg} flex items-center justify-center flex-shrink-0`}
                    >
                      <span className={`material-icons-round text-[18px] ${config.text}`}>
                        {config.icon}
                      </span>
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <p
                          className={`text-sm truncate ${
                            !notification.read
                              ? "font-semibold text-slate-custom-900"
                              : "font-medium text-slate-custom-700"
                          }`}
                        >
                          {notification.title}
                        </p>
                        {!notification.read && (
                          <span className="w-1.5 h-1.5 bg-primary rounded-full flex-shrink-0" />
                        )}
                      </div>
                      <p className="text-xs text-slate-custom-500 line-clamp-2 mt-0.5">
                        {notification.message}
                      </p>
                      <p className="text-xs text-slate-custom-400 mt-1">
                        {timeAgo(notification.createdAt)}
                      </p>
                    </div>
                  </button>
                );
              })
            )}
          </div>

          {/* Footer */}
          <div className="border-t border-slate-custom-100">
            <button
              onClick={() => {
                setOpen(false);
                router.push("/dashboard/settings");
              }}
              className="w-full px-4 py-2.5 text-xs text-center text-slate-custom-500 hover:text-primary hover:bg-slate-custom-50 transition-colors font-medium"
            >
              View all notifications
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
