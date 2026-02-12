"use client";

import { useFormStatus } from "react-dom";
import { updateProfile } from "./actions";
import { useFormState } from "react-dom";
import { Loader2, CheckCircle, AlertCircle } from "lucide-react";
import { useEffect, useState } from "react";

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
            className="inline-flex justify-center py-2 px-4 border border-transparent shadow-sm text-sm font-medium rounded-md text-white bg-primary hover:bg-primary/90 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary disabled:opacity-70 disabled:cursor-not-allowed transition-colors"
        >
            {pending ? (
                <>
                    <Loader2 className="animate-spin -ml-1 mr-2 h-4 w-4" />
                    Saving...
                </>
            ) : (
                "Save Changes"
            )}
        </button>
    );
}

export default function ProfileForm({ user }: { user: any }) {
    const [state, formAction] = useFormState(updateProfile, initialState);
    const [showToast, setShowToast] = useState(false);

    useEffect(() => {
        if (state?.message) {
            setShowToast(true);
            const timer = setTimeout(() => setShowToast(false), 3000);
            return () => clearTimeout(timer);
        }
    }, [state]);

    return (
        <form action={formAction} className="space-y-6">
            <div className="grid grid-cols-1 gap-y-6 sm:grid-cols-6 sm:gap-x-6">
                <div className="sm:col-span-3">
                    <label htmlFor="name" className="block text-sm font-medium text-slate-700">
                        Full Name
                    </label>
                    <div className="mt-1">
                        <input
                            type="text"
                            name="name"
                            id="name"
                            defaultValue={user.name || ""}
                            autoComplete="given-name"
                            className="shadow-sm focus:ring-primary focus:border-primary block w-full sm:text-sm border-slate-300 rounded-md py-2 px-3"
                        />
                    </div>
                </div>

                <div className="sm:col-span-3">
                    <label htmlFor="email" className="block text-sm font-medium text-slate-700">
                        Email address
                    </label>
                    <div className="mt-1">
                        <input
                            id="email"
                            name="email"
                            type="email"
                            disabled
                            defaultValue={user.email}
                            className="shadow-sm bg-slate-50 block w-full sm:text-sm border-slate-300 rounded-md py-2 px-3 text-slate-500 cursor-not-allowed"
                        />
                    </div>
                    <p className="mt-2 text-xs text-slate-500">Email cannot be changed.</p>
                </div>
            </div>

            <div className="flex justify-end">
                <SubmitButton />
            </div>

            {/* Toast Notification */}
            {showToast && (
                <div className="fixed bottom-4 right-4 z-50 animate-in slide-in-from-bottom-5 fade-in duration-300">
                    <div
                        className={`rounded-lg p-4 shadow-lg border flex items-center gap-3 ${state.type === "success"
                                ? "bg-white border-green-200 text-green-800"
                                : "bg-white border-red-200 text-red-800"
                            }`}
                    >
                        {state.type === "success" ? (
                            <CheckCircle className="h-5 w-5 text-green-500" />
                        ) : (
                            <AlertCircle className="h-5 w-5 text-red-500" />
                        )}
                        <p className="text-sm font-medium">{state.message}</p>
                    </div>
                </div>
            )}
        </form>
    );
}
