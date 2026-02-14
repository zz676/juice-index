"use client";

import { useFormStatus } from "react-dom";
import { updateProfile } from "./actions";
import { useActionState, useEffect, useState } from "react";

const initialState = {
    message: "",
    type: "",
};

function SubmitButton() {
    const { pending } = useFormStatus();

    return (
        <button
            type="submit"
            disabled={pending}
            className="inline-flex items-center justify-center py-2 px-5 text-sm font-medium rounded-lg text-white bg-primary hover:bg-primary/90 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary disabled:opacity-70 disabled:cursor-not-allowed transition-colors"
        >
            {pending ? (
                <>
                    <span className="material-icons-round text-[16px] animate-spin mr-2">progress_activity</span>
                    Saving...
                </>
            ) : (
                "Save Changes"
            )}
        </button>
    );
}

interface ProfileFormProps {
    name: string;
    email: string;
    avatarUrl: string | null;
}

export default function ProfileForm({ name, email, avatarUrl }: ProfileFormProps) {
    const [state, formAction] = useActionState(updateProfile, initialState);
    const [showToast, setShowToast] = useState(false);

    const initials = name
        ? name.split(" ").map((p) => p[0]).join("").toUpperCase().slice(0, 2)
        : email[0]?.toUpperCase() ?? "?";

    useEffect(() => {
        if (state?.message) {
            setShowToast(true);
            const timer = setTimeout(() => setShowToast(false), 3000);
            return () => clearTimeout(timer);
        }
    }, [state]);

    return (
        <form action={formAction} className="space-y-6">
            <div className="flex items-start gap-6">
                {/* Avatar */}
                <div className="flex-shrink-0">
                    {avatarUrl ? (
                        <img
                            src={avatarUrl}
                            alt={name || "Avatar"}
                            referrerPolicy="no-referrer"
                            className="w-16 h-16 rounded-full object-cover"
                        />
                    ) : (
                        <div className="w-16 h-16 rounded-full bg-slate-custom-800 flex items-center justify-center text-white text-lg font-semibold">
                            {initials}
                        </div>
                    )}
                </div>

                {/* Fields */}
                <div className="flex-1 grid grid-cols-1 gap-y-4 sm:grid-cols-2 sm:gap-x-4">
                    <div>
                        <label htmlFor="name" className="block text-sm font-medium text-slate-custom-700 mb-1">
                            Full Name
                        </label>
                        <input
                            type="text"
                            name="name"
                            id="name"
                            defaultValue={name}
                            autoComplete="given-name"
                            className="block w-full rounded-lg border border-slate-custom-200 bg-white px-3 py-2 text-sm text-slate-custom-900 placeholder-slate-custom-400 focus:outline-none focus:ring-2 focus:ring-primary/50 focus:border-primary transition-all"
                        />
                    </div>

                    <div>
                        <label htmlFor="email" className="block text-sm font-medium text-slate-custom-700 mb-1">
                            Email
                        </label>
                        <input
                            id="email"
                            name="email"
                            type="email"
                            disabled
                            defaultValue={email}
                            className="block w-full rounded-lg border border-slate-custom-200 bg-slate-custom-50 px-3 py-2 text-sm text-slate-custom-400 cursor-not-allowed"
                        />
                        <p className="mt-1 text-xs text-slate-custom-400">Email cannot be changed.</p>
                    </div>
                </div>
            </div>

            <div className="flex justify-end">
                <SubmitButton />
            </div>

            {/* Toast Notification */}
            {showToast && (
                <div className="fixed bottom-4 right-4 z-50 animate-in slide-in-from-bottom-5 fade-in duration-300">
                    <div
                        className={`rounded-lg p-4 shadow-lg border flex items-center gap-3 ${
                            state.type === "success"
                                ? "bg-white border-green-200 text-green-800"
                                : "bg-white border-red-200 text-red-800"
                        }`}
                    >
                        <span className={`material-icons-round text-[20px] ${
                            state.type === "success" ? "text-green-500" : "text-red-500"
                        }`}>
                            {state.type === "success" ? "check_circle" : "error"}
                        </span>
                        <p className="text-sm font-medium">{state.message}</p>
                    </div>
                </div>
            )}
        </form>
    );
}
