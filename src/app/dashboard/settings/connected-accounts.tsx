"use client";

import { useMemo, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { useRouter } from "next/navigation";

interface Identity {
    provider: string;
    identity_id: string;
    email?: string;
    name?: string;
}

interface ConnectedAccountsProps {
    identities: Identity[];
    hasPassword: boolean;
}

const providers = [
    {
        id: "google",
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
        name: "X (Twitter)",
        icon: (
            <svg className="w-5 h-5" viewBox="0 0 24 24" fill="currentColor">
                <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z" />
            </svg>
        ),
    },
] as const;

export default function ConnectedAccounts({ identities, hasPassword }: ConnectedAccountsProps) {
    const supabase = useMemo(() => createClient(), []);
    const router = useRouter();
    const [loading, setLoading] = useState<string | null>(null);
    const [error, setError] = useState<string | null>(null);

    const canUnlink = identities.length > 1 || hasPassword;

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

    return (
        <div className="space-y-4">
            {providers.map((p) => {
                const linked = identities.find((i) => i.provider === p.id);
                const isLoading = loading === p.id;

                return (
                    <div
                        key={p.id}
                        className="flex items-center justify-between py-3 px-4 rounded-lg border border-slate-custom-100 bg-slate-custom-50/50"
                    >
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
                                onClick={() => handleUnlink(p.id, linked.identity_id)}
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
