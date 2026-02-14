"use client";

import { useFormStatus } from "react-dom";
import { updatePreferences } from "./actions";
import { useActionState, useEffect, useState } from "react";

const BRANDS = [
    "BYD", "NIO", "XPENG", "LI_AUTO", "ZEEKR",
    "XIAOMI", "TESLA_CHINA", "LEAPMOTOR", "GEELY", "INDUSTRY",
] as const;

const TOPICS = [
    "DELIVERY", "EARNINGS", "LAUNCH", "TECHNOLOGY", "CHARGING",
    "POLICY", "EXPANSION", "RECALL", "PARTNERSHIP", "EXECUTIVE",
] as const;

const BRAND_LABELS: Record<string, string> = {
    BYD: "BYD",
    NIO: "NIO",
    XPENG: "XPeng",
    LI_AUTO: "Li Auto",
    ZEEKR: "Zeekr",
    XIAOMI: "Xiaomi",
    TESLA_CHINA: "Tesla China",
    LEAPMOTOR: "Leapmotor",
    GEELY: "Geely",
    INDUSTRY: "Industry",
};

const TOPIC_LABELS: Record<string, string> = {
    DELIVERY: "Deliveries",
    EARNINGS: "Earnings",
    LAUNCH: "Launches",
    TECHNOLOGY: "Technology",
    CHARGING: "Charging",
    POLICY: "Policy",
    EXPANSION: "Expansion",
    RECALL: "Recalls",
    PARTNERSHIP: "Partnerships",
    EXECUTIVE: "Executive",
};

interface NotificationPrefsProps {
    preferences: {
        language: string;
        digestFrequency: string;
        alertsEnabled: boolean;
        alertThreshold: number;
        brands: string[];
        topics: string[];
    } | null;
}

const initialState = { message: "", type: "" };

function SubmitButton() {
    const { pending } = useFormStatus();

    return (
        <button
            type="submit"
            disabled={pending}
            className="inline-flex items-center px-5 py-2 text-sm font-medium rounded-lg text-white bg-primary hover:bg-primary/90 disabled:opacity-70 disabled:cursor-not-allowed transition-colors"
        >
            {pending ? (
                <>
                    <span className="material-icons-round text-[16px] animate-spin mr-2">progress_activity</span>
                    Saving...
                </>
            ) : (
                "Save Preferences"
            )}
        </button>
    );
}

export default function NotificationPrefs({ preferences }: NotificationPrefsProps) {
    const [state, formAction] = useActionState(updatePreferences, initialState);
    const [showToast, setShowToast] = useState(false);
    const [alertsEnabled, setAlertsEnabled] = useState(preferences?.alertsEnabled ?? true);
    const [alertThreshold, setAlertThreshold] = useState(preferences?.alertThreshold ?? 80);

    useEffect(() => {
        if (state?.message) {
            setShowToast(true);
            const timer = setTimeout(() => setShowToast(false), 3000);
            return () => clearTimeout(timer);
        }
    }, [state]);

    return (
        <form action={formAction} className="space-y-6">
            {/* Language */}
            <fieldset>
                <legend className="text-sm font-medium text-slate-custom-700 mb-2">Language</legend>
                <div className="flex gap-4">
                    {[
                        { value: "EN", label: "English" },
                        { value: "ZH", label: "Chinese" },
                    ].map((opt) => (
                        <label key={opt.value} className="flex items-center gap-2 cursor-pointer">
                            <input
                                type="radio"
                                name="language"
                                value={opt.value}
                                defaultChecked={(preferences?.language ?? "EN") === opt.value}
                                className="text-primary focus:ring-primary"
                            />
                            <span className="text-sm text-slate-custom-700">{opt.label}</span>
                        </label>
                    ))}
                </div>
            </fieldset>

            {/* Digest Frequency */}
            <fieldset>
                <legend className="text-sm font-medium text-slate-custom-700 mb-2">Digest Frequency</legend>
                <div className="flex gap-4">
                    {[
                        { value: "DAILY", label: "Daily" },
                        { value: "WEEKLY", label: "Weekly" },
                        { value: "NONE", label: "None" },
                    ].map((opt) => (
                        <label key={opt.value} className="flex items-center gap-2 cursor-pointer">
                            <input
                                type="radio"
                                name="digestFrequency"
                                value={opt.value}
                                defaultChecked={(preferences?.digestFrequency ?? "DAILY") === opt.value}
                                className="text-primary focus:ring-primary"
                            />
                            <span className="text-sm text-slate-custom-700">{opt.label}</span>
                        </label>
                    ))}
                </div>
            </fieldset>

            {/* Alerts Enabled */}
            <div>
                <div className="flex items-center justify-between">
                    <label htmlFor="alertsEnabled" className="text-sm font-medium text-slate-custom-700">
                        Alert Notifications
                    </label>
                    <button
                        type="button"
                        role="switch"
                        aria-checked={alertsEnabled}
                        onClick={() => setAlertsEnabled((v) => !v)}
                        className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                            alertsEnabled ? "bg-primary" : "bg-slate-custom-200"
                        }`}
                    >
                        <span
                            className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                                alertsEnabled ? "translate-x-6" : "translate-x-1"
                            }`}
                        />
                    </button>
                </div>
                <input type="hidden" name="alertsEnabled" value={alertsEnabled ? "true" : "false"} />
            </div>

            {/* Alert Threshold */}
            {alertsEnabled && (
                <div>
                    <div className="flex items-center justify-between mb-2">
                        <label htmlFor="alertThreshold" className="text-sm font-medium text-slate-custom-700">
                            Alert Threshold
                        </label>
                        <span className="text-sm text-slate-custom-500">{alertThreshold}%</span>
                    </div>
                    <input
                        type="range"
                        name="alertThreshold"
                        id="alertThreshold"
                        min="0"
                        max="100"
                        value={alertThreshold}
                        onChange={(e) => setAlertThreshold(Number(e.target.value))}
                        className="w-full accent-primary"
                    />
                </div>
            )}

            {/* Brand Watchlist */}
            <fieldset>
                <legend className="text-sm font-medium text-slate-custom-700 mb-3">Brand Watchlist</legend>
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                    {BRANDS.map((brand) => (
                        <label key={brand} className="flex items-center gap-2 cursor-pointer">
                            <input
                                type="checkbox"
                                name="brands"
                                value={brand}
                                defaultChecked={preferences?.brands.includes(brand)}
                                className="rounded text-primary focus:ring-primary"
                            />
                            <span className="text-sm text-slate-custom-700">{BRAND_LABELS[brand]}</span>
                        </label>
                    ))}
                </div>
            </fieldset>

            {/* Topic Interests */}
            <fieldset>
                <legend className="text-sm font-medium text-slate-custom-700 mb-3">Topic Interests</legend>
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                    {TOPICS.map((topic) => (
                        <label key={topic} className="flex items-center gap-2 cursor-pointer">
                            <input
                                type="checkbox"
                                name="topics"
                                value={topic}
                                defaultChecked={preferences?.topics.includes(topic)}
                                className="rounded text-primary focus:ring-primary"
                            />
                            <span className="text-sm text-slate-custom-700">{TOPIC_LABELS[topic]}</span>
                        </label>
                    ))}
                </div>
            </fieldset>

            <div className="flex justify-end">
                <SubmitButton />
            </div>

            {/* Toast */}
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
