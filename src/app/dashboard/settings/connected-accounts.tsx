"use client";

import { useMemo, useState, useTransition } from "react";
import { createClient } from "@/lib/supabase/client";
import { useRouter } from "next/navigation";
import { toggleXPremium } from "./actions";

interface Identity {
    provider: string;
    identity_id: string;
    email?: string;
    name?: string;
}

interface ConnectedAccountsProps {
    identities: Identity[];
    hasPassword: boolean;
    xAccount: {
        username: string;
        displayName: string | null;
        avatarUrl: string | null;
        isXPremium: boolean;
    } | null;
    tier: string;
    hasXLoginIdentity: boolean;
    xConnected?: boolean;
    xError?: string | null;
}

const providers = [
    {
        id: "google",
        matchIds: ["google"],
        name: "Google",
        icon: (
            <svg className="w-5 h-5" viewBox="0 0 24 24">
                <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 0 1-2.2 3.32v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.1z" />
                <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
                <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" />
                <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" />
            </svg>
        ),
    },
    {
        id: "twitter",
        matchIds: ["twitter", "x"],
        name: "X (Twitter)",
        icon: (
            <svg className="w-5 h-5" viewBox="0 0 24 24" fill="currentColor">
                <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z" />
            </svg>
        ),
    },
];

const xErrorMessages: Record<string, string> = {
    not_authenticated: "You must be logged in to connect an X account.",
    invalid_request: "Invalid OAuth request. Please try again.",
    invalid_state: "OAuth state validation failed. Please try again.",
    state_mismatch: "OAuth state mismatch. Please try again.",
    token_exchange_failed: "Failed to connect your X account. Please try again.",
    empty_tokens: "X returned empty credentials. Please disconnect and reconnect your account.",
    access_denied: "You denied access to your X account.",
};

export default function ConnectedAccounts({
    identities,
    hasPassword,
    xAccount,
    tier,
    hasXLoginIdentity,
    xConnected,
    xError,
}: ConnectedAccountsProps) {
    const supabase = useMemo(() => createClient(), []);
    const router = useRouter();
    const [loading, setLoading] = useState<string | null>(null);
    const [error, setError] = useState<string | null>(null);
    const [xDisconnecting, setXDisconnecting] = useState(false);
    const [xDisconnected, setXDisconnected] = useState(false);
    const [xPremium, setXPremium] = useState(xAccount?.isXPremium ?? false);
    const [isPremiumToggling, startPremiumTransition] = useTransition();

    const canUnlink = identities.length > 1 || hasPassword;
    const isFree = tier === "FREE";
    const showXPosting = xAccount && !xDisconnected;

    async function handleLink(provider: "google" | "twitter") {
        setLoading(provider);
        setError(null);
        try {
            const { error } = await supabase.auth.linkIdentity({
                provider,
                options: {
                    redirectTo: window.location.origin + "/auth/callback?next=/dashboard/settings",
                },
            });
            if (error) throw error;
        } catch (err) {
            setError(err instanceof Error ? err.message : "Failed to link account");
            setLoading(null);
        }
    }

    async function handleUnlink(provider: string, identityId: string) {
        setLoading(provider);
        setError(null);
        try {
            const { error } = await supabase.auth.unlinkIdentity({
                provider,
                identity_id: identityId,
            } as any);
            if (error) throw error;
            router.refresh();
        } catch (err) {
            setError(err instanceof Error ? err.message : "Failed to unlink account");
        } finally {
            setLoading(null);
        }
    }

    async function handleXDisconnect() {
        if (!confirm("Disconnect your X posting account? You won't be able to publish posts until you reconnect.")) {
            return;
        }
        setXDisconnecting(true);
        try {
            const res = await fetch("/api/x/disconnect", { method: "POST" });
            if (res.ok) setXDisconnected(true);
        } catch {
            // Silently fail — user can retry
        } finally {
            setXDisconnecting(false);
        }
    }

    return (
        <div className="space-y-4">
            {providers.map((p) => {
                const linked = identities.find((i) => p.matchIds.includes(i.provider));
                const isLoading = loading === p.id;

                return (
                    <div key={p.id}>
                        <div className="flex items-center justify-between py-3 px-4 rounded-lg border border-slate-custom-100 bg-slate-custom-50/50">
                            <div className="flex items-center gap-3">
                                <div className="flex-shrink-0">{p.icon}</div>
                                <div>
                                    <p className="text-sm font-medium text-slate-custom-900">{p.name}</p>
                                    <p className="text-xs text-slate-custom-500">
                                        {linked ? linked.email || linked.name || "Connected" : "Not connected"}
                                    </p>
                                </div>
                            </div>

                            {linked ? (
                                <button
                                    onClick={() => handleUnlink(linked.provider, linked.identity_id)}
                                    disabled={!canUnlink || isLoading}
                                    title={!canUnlink ? "Set a password before unlinking your only login method" : undefined}
                                    className="inline-flex items-center px-3 py-1.5 text-xs font-medium rounded-lg border border-slate-custom-200 text-slate-custom-600 hover:bg-slate-custom-100 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                                >
                                    {isLoading ? (
                                        <span className="material-icons-round text-[14px] animate-spin">progress_activity</span>
                                    ) : (
                                        "Unlink"
                                    )}
                                </button>
                            ) : (
                                <button
                                    onClick={() => handleLink(p.id as "google" | "twitter")}
                                    disabled={isLoading}
                                    className="inline-flex items-center px-3 py-1.5 text-xs font-medium rounded-lg bg-primary text-white hover:bg-primary/90 disabled:opacity-50 transition-colors"
                                >
                                    {isLoading ? (
                                        <span className="material-icons-round text-[14px] animate-spin">progress_activity</span>
                                    ) : (
                                        "Connect"
                                    )}
                                </button>
                            )}
                        </div>

                        {/* X Posting sub-section */}
                        {p.id === "twitter" && (
                            <div className="ml-8 mt-2 pl-4 border-l-2 border-slate-custom-100 space-y-2">
                                {xConnected && (
                                    <div className="flex items-center gap-2 bg-green-50 border border-green-200 rounded-lg px-3 py-2">
                                        <span className="material-icons-round text-green-600 text-sm">check_circle</span>
                                        <p className="text-xs text-green-700">X posting account connected successfully.</p>
                                    </div>
                                )}
                                {xError && (
                                    <div className="flex items-center gap-2 bg-red-50 border border-red-200 rounded-lg px-3 py-2">
                                        <span className="material-icons-round text-red-500 text-sm">error</span>
                                        <p className="text-xs text-red-700">
                                            {xErrorMessages[xError] || `Failed to connect X account: ${xError}`}
                                        </p>
                                    </div>
                                )}
                                {xDisconnected && (
                                    <div className="flex items-center gap-2 bg-yellow-50 border border-yellow-200 rounded-lg px-3 py-2">
                                        <span className="material-icons-round text-yellow-600 text-sm">info</span>
                                        <p className="text-xs text-yellow-700">X posting account disconnected.</p>
                                    </div>
                                )}

                                {showXPosting ? (
                                    <>
                                    <div className="flex items-center justify-between py-2">
                                        <div className="flex items-center gap-2.5">
                                            {xAccount.avatarUrl ? (
                                                <img src={xAccount.avatarUrl} alt={xAccount.username} className="w-7 h-7 rounded-full" />
                                            ) : (
                                                <div className="w-7 h-7 rounded-full bg-slate-custom-200 flex items-center justify-center">
                                                    <span className="material-icons-round text-slate-custom-400 text-sm">person</span>
                                                </div>
                                            )}
                                            <div>
                                                <p className="text-xs font-medium text-slate-custom-900">
                                                    Posting as @{xAccount.username}
                                                </p>
                                            </div>
                                        </div>
                                        <button
                                            onClick={handleXDisconnect}
                                            disabled={xDisconnecting}
                                            className="px-2.5 py-1 text-xs font-medium text-red-600 border border-red-200 rounded-lg hover:bg-red-50 transition-colors disabled:opacity-50"
                                        >
                                            {xDisconnecting ? "..." : "Disconnect"}
                                        </button>
                                    </div>
                                    <div className="flex items-center justify-between py-2 border-t border-slate-custom-100 mt-1 pt-2">
                                        <div>
                                            <p className="text-xs font-medium text-slate-custom-900 flex items-center gap-1.5">
                                                X Premium
                                                {xPremium && (
                                                    <span className="inline-flex items-center px-1.5 py-0.5 rounded text-[9px] font-bold bg-blue-100 text-blue-700">
                                                        Active
                                                    </span>
                                                )}
                                            </p>
                                            <p className="text-[10px] text-slate-custom-500 mt-0.5">
                                                Enable for 25,000 character limit
                                            </p>
                                        </div>
                                        <button
                                            type="button"
                                            role="switch"
                                            aria-checked={xPremium}
                                            disabled={isPremiumToggling}
                                            onClick={() => {
                                                startPremiumTransition(async () => {
                                                    const result = await toggleXPremium();
                                                    if (result.type === "success" && "isXPremium" in result) {
                                                        setXPremium(result.isXPremium as boolean);
                                                    }
                                                });
                                            }}
                                            className={`relative inline-flex h-5 w-9 items-center rounded-full transition-colors disabled:opacity-50 ${
                                                xPremium ? "bg-blue-600" : "bg-slate-custom-300"
                                            }`}
                                        >
                                            <span
                                                className={`inline-block h-3.5 w-3.5 transform rounded-full bg-white transition-transform ${
                                                    xPremium ? "translate-x-4.5" : "translate-x-0.5"
                                                }`}
                                            />
                                        </button>
                                    </div>
                                    </>
                                ) : isFree ? (
                                    <div className="flex items-center gap-2 bg-primary/5 border border-primary/20 rounded-lg px-3 py-2">
                                        <span className="material-icons-round text-primary text-sm">lock</span>
                                        <p className="text-xs text-slate-custom-600">
                                            Posting requires <span className="font-semibold text-primary">Starter</span> or higher.{" "}
                                            <a href="/dashboard/billing" className="text-primary font-semibold underline hover:text-primary/80">
                                                Upgrade
                                            </a>
                                        </p>
                                    </div>
                                ) : (
                                    <div className="flex items-center justify-between py-2">
                                        <p className="text-xs text-slate-custom-500">
                                            {hasXLoginIdentity
                                                ? "Enable posting with your X account in one click."
                                                : "Connect X for posting to publish from your dashboard."}
                                        </p>
                                        <a
                                            href="/api/x/authorize"
                                            className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-lg bg-slate-custom-900 text-white hover:bg-slate-custom-800 transition-colors flex-shrink-0"
                                        >
                                            Enable Posting
                                        </a>
                                    </div>
                                )}
                            </div>
                        )}
                    </div>
                );
            })}

            {error && (
                <div className="flex items-center gap-2 text-sm text-red-600 bg-red-50 rounded-lg px-4 py-2">
                    <span className="material-icons-round text-[18px]">error</span>
                    {error}
                </div>
            )}
        </div>
    );
}
