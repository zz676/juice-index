"use client";

import { useState } from "react";
import { useSearchParams } from "next/navigation";

interface XPostingAccountProps {
  xAccount: {
    username: string;
    displayName: string | null;
    avatarUrl: string | null;
  } | null;
  tier: string;
  hasXLoginIdentity?: boolean;
}

export default function XPostingAccount({ xAccount, tier, hasXLoginIdentity }: XPostingAccountProps) {
  const searchParams = useSearchParams();
  const xConnected = searchParams.get("x_connected") === "true";
  const xError = searchParams.get("x_error");
  const [disconnecting, setDisconnecting] = useState(false);
  const [disconnected, setDisconnected] = useState(false);

  const isFree = tier === "FREE";

  const handleDisconnect = async () => {
    if (!confirm("Disconnect your X account? You won't be able to publish posts until you reconnect.")) {
      return;
    }
    setDisconnecting(true);
    try {
      const res = await fetch("/api/x/disconnect", { method: "POST" });
      if (res.ok) {
        setDisconnected(true);
      }
    } catch {
      // Silently fail — user can retry
    } finally {
      setDisconnecting(false);
    }
  };

  const errorMessages: Record<string, string> = {
    not_authenticated: "You must be logged in to connect an X account.",
    invalid_request: "Invalid OAuth request. Please try again.",
    invalid_state: "OAuth state validation failed. Please try again.",
    state_mismatch: "OAuth state mismatch. Please try again.",
    token_exchange_failed: "Failed to connect your X account. Please try again.",
    access_denied: "You denied access to your X account.",
  };

  const showConnected = xAccount && !disconnected;

  return (
    <div className="space-y-4">
      {/* Success message */}
      {xConnected && (
        <div className="flex items-center gap-2 bg-green-50 border border-green-200 rounded-lg px-4 py-2.5">
          <span className="material-icons-round text-green-600 text-base">check_circle</span>
          <p className="text-sm text-green-700">X account connected successfully.</p>
        </div>
      )}

      {/* Error message */}
      {xError && (
        <div className="flex items-center gap-2 bg-red-50 border border-red-200 rounded-lg px-4 py-2.5">
          <span className="material-icons-round text-red-500 text-base">error</span>
          <p className="text-sm text-red-700">
            {errorMessages[xError] || `Failed to connect X account: ${xError}`}
          </p>
        </div>
      )}

      {/* Disconnected confirmation */}
      {disconnected && (
        <div className="flex items-center gap-2 bg-yellow-50 border border-yellow-200 rounded-lg px-4 py-2.5">
          <span className="material-icons-round text-yellow-600 text-base">info</span>
          <p className="text-sm text-yellow-700">X account disconnected. Refresh the page to reconnect.</p>
        </div>
      )}

      {showConnected ? (
        /* Connected state */
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            {xAccount.avatarUrl ? (
              <img
                src={xAccount.avatarUrl}
                alt={xAccount.username}
                className="w-10 h-10 rounded-full"
              />
            ) : (
              <div className="w-10 h-10 rounded-full bg-slate-custom-200 flex items-center justify-center">
                <span className="material-icons-round text-slate-custom-400 text-xl">person</span>
              </div>
            )}
            <div>
              <p className="text-sm font-medium text-slate-custom-900">
                {xAccount.displayName || xAccount.username}
              </p>
              <p className="text-xs text-slate-custom-500">@{xAccount.username}</p>
            </div>
          </div>
          <button
            onClick={handleDisconnect}
            disabled={disconnecting}
            className="px-3 py-1.5 text-sm font-medium text-red-600 border border-red-200 rounded-lg hover:bg-red-50 transition-colors disabled:opacity-50"
          >
            {disconnecting ? "Disconnecting..." : "Disconnect"}
          </button>
        </div>
      ) : isFree ? (
        /* FREE tier — cannot connect */
        <div className="space-y-3">
          <p className="text-sm text-slate-custom-500">
            Connect an X account to publish posts directly from your dashboard.
          </p>
          <div className="flex items-center gap-2 bg-primary/5 border border-primary/20 rounded-lg px-4 py-2.5">
            <span className="material-icons-round text-primary text-base">lock</span>
            <p className="text-xs text-slate-custom-600">
              X posting requires <span className="font-semibold text-primary">Starter</span> or higher.{" "}
              <a href="/pricing" className="text-primary font-semibold underline hover:text-primary/80">
                Upgrade now
              </a>
            </p>
          </div>
        </div>
      ) : (
        /* Eligible tier, not connected */
        <div className="space-y-3">
          <p className="text-sm text-slate-custom-500">
            Connect your X account to publish posts directly from your dashboard.
          </p>
          {hasXLoginIdentity && (
            <p className="text-sm font-medium text-blue-700">
              You&apos;re already signed in with X — connect it for posting in one click.
            </p>
          )}
          <a
            href="/api/x/authorize"
            className="inline-flex items-center gap-2 px-4 py-2 text-sm font-medium rounded-lg bg-slate-custom-900 text-white hover:bg-slate-custom-800 transition-colors"
          >
            <svg className="w-4 h-4" viewBox="0 0 24 24" fill="currentColor">
              <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z" />
            </svg>
            Connect X for Posting
          </a>
        </div>
      )}
    </div>
  );
}
