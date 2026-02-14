"use client";

import { useMemo, useState } from "react";
import { createClient } from "@/lib/supabase/client";

interface PasswordSectionProps {
    hasPassword: boolean;
    email: string;
}

export default function PasswordSection({ hasPassword, email }: PasswordSectionProps) {
    const supabase = useMemo(() => createClient(), []);
    const [expanded, setExpanded] = useState(false);
    const [currentPassword, setCurrentPassword] = useState("");
    const [newPassword, setNewPassword] = useState("");
    const [confirmPassword, setConfirmPassword] = useState("");
    const [isLoading, setIsLoading] = useState(false);
    const [status, setStatus] = useState<{ type: "success" | "error"; message: string } | null>(null);

    async function handleSubmit(e: React.FormEvent) {
        e.preventDefault();

        if (newPassword !== confirmPassword) {
            setStatus({ type: "error", message: "Passwords do not match" });
            return;
        }

        if (newPassword.length < 6) {
            setStatus({ type: "error", message: "Password must be at least 6 characters" });
            return;
        }

        setIsLoading(true);
        setStatus(null);

        try {
            // If user has a password, verify current one first
            if (hasPassword) {
                const { error: signInError } = await supabase.auth.signInWithPassword({
                    email,
                    password: currentPassword,
                });
                if (signInError) {
                    setStatus({ type: "error", message: "Current password is incorrect" });
                    setIsLoading(false);
                    return;
                }
            }

            const { error } = await supabase.auth.updateUser({
                password: newPassword,
            });
            if (error) throw error;

            setStatus({ type: "success", message: hasPassword ? "Password updated successfully!" : "Password set successfully!" });
            setCurrentPassword("");
            setNewPassword("");
            setConfirmPassword("");
            setExpanded(false);
        } catch (err) {
            setStatus({
                type: "error",
                message: err instanceof Error ? err.message : "Failed to update password",
            });
        } finally {
            setIsLoading(false);
        }
    }

    if (!expanded) {
        return (
            <div className="space-y-3">
                {!hasPassword && (
                    <p className="text-sm text-slate-custom-500">
                        You signed in with a social account. Set a password to also log in with email.
                    </p>
                )}
                <button
                    onClick={() => setExpanded(true)}
                    className="inline-flex items-center px-4 py-2 text-sm font-medium rounded-lg border border-slate-custom-200 text-slate-custom-700 hover:bg-slate-custom-50 transition-colors"
                >
                    <span className="material-icons-round text-[16px] mr-2">
                        {hasPassword ? "lock_reset" : "add"}
                    </span>
                    {hasPassword ? "Change Password" : "Set Password"}
                </button>

                {status && (
                    <div className={`flex items-center gap-2 text-sm rounded-lg px-4 py-2 ${
                        status.type === "success" ? "text-green-700 bg-green-50" : "text-red-600 bg-red-50"
                    }`}>
                        <span className="material-icons-round text-[18px]">
                            {status.type === "success" ? "check_circle" : "error"}
                        </span>
                        {status.message}
                    </div>
                )}
            </div>
        );
    }

    return (
        <form onSubmit={handleSubmit} className="space-y-4 max-w-sm">
            {hasPassword && (
                <div>
                    <label htmlFor="currentPassword" className="block text-sm font-medium text-slate-custom-700 mb-1">
                        Current Password
                    </label>
                    <input
                        id="currentPassword"
                        type="password"
                        autoComplete="current-password"
                        required
                        value={currentPassword}
                        onChange={(e) => setCurrentPassword(e.target.value)}
                        className="block w-full rounded-lg border border-slate-custom-200 bg-white px-3 py-2 text-sm text-slate-custom-900 focus:outline-none focus:ring-2 focus:ring-primary/50 focus:border-primary transition-all"
                        placeholder="Enter current password"
                    />
                </div>
            )}

            <div>
                <label htmlFor="newPassword" className="block text-sm font-medium text-slate-custom-700 mb-1">
                    New Password
                </label>
                <input
                    id="newPassword"
                    type="password"
                    autoComplete="new-password"
                    required
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                    className="block w-full rounded-lg border border-slate-custom-200 bg-white px-3 py-2 text-sm text-slate-custom-900 focus:outline-none focus:ring-2 focus:ring-primary/50 focus:border-primary transition-all"
                    placeholder="Enter new password"
                />
            </div>

            <div>
                <label htmlFor="confirmPassword" className="block text-sm font-medium text-slate-custom-700 mb-1">
                    Confirm Password
                </label>
                <input
                    id="confirmPassword"
                    type="password"
                    autoComplete="new-password"
                    required
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    className="block w-full rounded-lg border border-slate-custom-200 bg-white px-3 py-2 text-sm text-slate-custom-900 focus:outline-none focus:ring-2 focus:ring-primary/50 focus:border-primary transition-all"
                    placeholder="Confirm new password"
                />
            </div>

            {status && (
                <div className={`flex items-center gap-2 text-sm rounded-lg px-4 py-2 ${
                    status.type === "success" ? "text-green-700 bg-green-50" : "text-red-600 bg-red-50"
                }`}>
                    <span className="material-icons-round text-[18px]">
                        {status.type === "success" ? "check_circle" : "error"}
                    </span>
                    {status.message}
                </div>
            )}

            <div className="flex items-center gap-3">
                <button
                    type="submit"
                    disabled={isLoading}
                    className="inline-flex items-center px-4 py-2 text-sm font-medium rounded-lg text-white bg-primary hover:bg-primary/90 disabled:opacity-70 disabled:cursor-not-allowed transition-colors"
                >
                    {isLoading ? (
                        <>
                            <span className="material-icons-round text-[16px] animate-spin mr-2">progress_activity</span>
                            Saving...
                        </>
                    ) : (
                        hasPassword ? "Update Password" : "Set Password"
                    )}
                </button>
                <button
                    type="button"
                    onClick={() => {
                        setExpanded(false);
                        setStatus(null);
                        setCurrentPassword("");
                        setNewPassword("");
                        setConfirmPassword("");
                    }}
                    className="px-4 py-2 text-sm font-medium rounded-lg text-slate-custom-600 hover:bg-slate-custom-50 transition-colors"
                >
                    Cancel
                </button>
            </div>
        </form>
    );
}
