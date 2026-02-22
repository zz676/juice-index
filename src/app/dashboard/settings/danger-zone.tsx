"use client";

import { useFormStatus } from "react-dom";
import { deleteAccount } from "./actions";
import { useActionState, useState } from "react";

interface DangerZoneProps {
    userEmail: string;
}

const initialState = { message: "", type: "" };

function DeleteButton() {
    const { pending } = useFormStatus();

    return (
        <button
            type="submit"
            disabled={pending}
            className="inline-flex items-center px-4 py-2 text-sm font-medium rounded-lg bg-red-600 text-white hover:bg-red-700 disabled:opacity-70 disabled:cursor-not-allowed transition-colors"
        >
            {pending ? (
                <>
                    <span className="material-icons-round text-[16px] animate-spin mr-2">progress_activity</span>
                    Deleting...
                </>
            ) : (
                "Permanently Delete Account"
            )}
        </button>
    );
}

export default function DangerZone({ userEmail }: DangerZoneProps) {
    const [state, formAction] = useActionState(deleteAccount, initialState);
    const [showConfirm, setShowConfirm] = useState(false);

    if (!showConfirm) {
        return (
            <div className="space-y-3">
                <p className="text-sm text-slate-custom-600">
                    Permanently delete your account and all associated data. This action cannot be undone.
                </p>
                <div className="flex justify-end">
                    <button
                        onClick={() => setShowConfirm(true)}
                        className="inline-flex items-center px-4 py-2 text-sm font-medium rounded-lg border border-red-200 text-red-600 hover:bg-red-50 transition-colors"
                    >
                        <span className="material-icons-round text-[16px] mr-2">delete_forever</span>
                        Delete Account
                    </button>
                </div>
            </div>
        );
    }

    return (
        <form action={formAction} className="space-y-4">
            <div className="bg-red-50 border border-red-200 rounded-lg px-4 py-3">
                <div className="flex items-start gap-2">
                    <span className="material-icons-round text-[18px] text-red-500 mt-0.5">warning</span>
                    <div>
                        <p className="text-sm font-medium text-red-800">This action is irreversible</p>
                        <p className="text-sm text-red-700 mt-1">
                            All your data, API keys, subscriptions, and saved content will be permanently deleted.
                        </p>
                    </div>
                </div>
            </div>

            <div>
                <label htmlFor="confirmEmail" className="block text-sm font-medium text-slate-custom-700 mb-1">
                    Type <span className="font-mono text-red-600">{userEmail}</span> to confirm
                </label>
                <input
                    id="confirmEmail"
                    name="confirmEmail"
                    type="email"
                    required
                    autoComplete="off"
                    className="block w-full max-w-sm rounded-lg border border-red-200 bg-white px-3 py-2 text-sm text-slate-custom-900 focus:outline-none focus:ring-2 focus:ring-red-500/50 focus:border-red-500 transition-all"
                    placeholder="your@email.com"
                />
            </div>

            {state?.message && state.type === "error" && (
                <div className="flex items-center gap-2 text-sm text-red-600 bg-red-50 rounded-lg px-4 py-2">
                    <span className="material-icons-round text-[18px]">error</span>
                    {state.message}
                </div>
            )}

            <div className="flex items-center gap-3">
                <DeleteButton />
                <button
                    type="button"
                    onClick={() => setShowConfirm(false)}
                    className="px-4 py-2 text-sm font-medium rounded-lg text-slate-custom-600 hover:bg-slate-custom-50 transition-colors"
                >
                    Cancel
                </button>
            </div>
        </form>
    );
}
