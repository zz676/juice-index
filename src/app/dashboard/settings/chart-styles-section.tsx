"use client";

import { useState, useEffect } from "react";

type ChartStyle = { id: string; name: string };

export default function ChartStylesSection() {
    const [styles, setStyles] = useState<ChartStyle[]>([]);
    const [loading, setLoading] = useState(true);
    const [renamingId, setRenamingId] = useState<string | null>(null);
    const [renameValue, setRenameValue] = useState("");
    const [renameError, setRenameError] = useState<string | null>(null);
    const [deletingId, setDeletingId] = useState<string | null>(null);

    const fetchStyles = async () => {
        try {
            const res = await fetch("/api/dashboard/studio/chart-styles");
            if (!res.ok) return;
            const data = await res.json();
            setStyles(data.styles ?? []);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => { fetchStyles(); }, []);

    const startRename = (style: ChartStyle) => {
        setRenamingId(style.id);
        setRenameValue(style.name);
        setRenameError(null);
    };

    const commitRename = async (id: string) => {
        const trimmed = renameValue.trim();
        if (!trimmed) { setRenameError("Name cannot be empty."); return; }
        const res = await fetch(`/api/dashboard/studio/chart-styles/${id}`, {
            method: "PATCH",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ name: trimmed }),
        });
        if (res.status === 409) { setRenameError("That name is already taken."); return; }
        if (!res.ok) { setRenameError("Failed to rename."); return; }
        setRenamingId(null);
        setRenameError(null);
        fetchStyles();
    };

    const handleDelete = async (id: string) => {
        setDeletingId(id);
        try {
            await fetch(`/api/dashboard/studio/chart-styles/${id}`, { method: "DELETE" });
            fetchStyles();
        } finally {
            setDeletingId(null);
        }
    };

    if (loading) {
        return <p className="text-sm text-slate-400">Loading styles…</p>;
    }

    if (styles.length === 0) {
        return (
            <p className="text-sm text-slate-500 italic">
                No saved styles yet. Save your first style from the{" "}
                <a href="/dashboard/studio" className="text-primary hover:underline">Studio chart customizer</a>.
            </p>
        );
    }

    return (
        <div className="space-y-2">
            {styles.map((style) => (
                <div key={style.id} className="flex items-center gap-2">
                    {renamingId === style.id ? (
                        <>
                            <input
                                autoFocus
                                value={renameValue}
                                onChange={(e) => { setRenameValue(e.target.value); setRenameError(null); }}
                                onKeyDown={(e) => {
                                    if (e.key === "Enter") commitRename(style.id);
                                    if (e.key === "Escape") { setRenamingId(null); setRenameError(null); }
                                }}
                                className="flex-1 rounded border border-slate-200 px-2 py-1 text-sm text-slate-800 focus:outline-none focus:ring-1 focus:ring-primary"
                            />
                            <button
                                onClick={() => commitRename(style.id)}
                                className="text-xs font-bold text-primary hover:underline"
                            >
                                Save
                            </button>
                            <button
                                onClick={() => { setRenamingId(null); setRenameError(null); }}
                                className="text-xs font-bold text-slate-400 hover:text-slate-600"
                            >
                                Cancel
                            </button>
                            {renameError && <span className="text-xs text-red-500">{renameError}</span>}
                        </>
                    ) : (
                        <>
                            <span className="flex-1 text-sm text-slate-700">{style.name}</span>
                            <button
                                onClick={() => startRename(style)}
                                className="text-xs font-medium text-slate-400 hover:text-primary transition-colors"
                            >
                                Rename
                            </button>
                            <button
                                onClick={() => handleDelete(style.id)}
                                disabled={deletingId === style.id}
                                className="text-xs font-medium text-slate-400 hover:text-red-500 transition-colors disabled:opacity-40"
                            >
                                {deletingId === style.id ? "Deleting…" : "Delete"}
                            </button>
                        </>
                    )}
                </div>
            ))}
        </div>
    );
}
