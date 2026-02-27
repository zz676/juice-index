"use client";

import { useState, useEffect } from "react";

type ChartStyle = { id: string; name: string };

export default function ChartStylesSection() {
    const [styles, setStyles] = useState<ChartStyle[]>([]);
    const [loading, setLoading] = useState(true);
    const [fetchError, setFetchError] = useState<string | null>(null);
    const [renamingId, setRenamingId] = useState<string | null>(null);
    const [renameValue, setRenameValue] = useState("");
    const [renameError, setRenameError] = useState<string | null>(null);
    const [deletingId, setDeletingId] = useState<string | null>(null);
    const [deleteError, setDeleteError] = useState<string | null>(null);

    const fetchStyles = async () => {
        try {
            const res = await fetch("/api/dashboard/studio/chart-styles");
            if (!res.ok) {
                setFetchError("Failed to load styles.");
                return;
            }
            const data = await res.json();
            setStyles(data.styles ?? []);
            setFetchError(null);
        } catch {
            setFetchError("Failed to load styles.");
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
        try {
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
        } catch {
            setRenameError("Failed to rename.");
        }
    };

    const handleDelete = async (id: string) => {
        setDeletingId(id);
        setDeleteError(null);
        try {
            const res = await fetch(`/api/dashboard/studio/chart-styles/${id}`, { method: "DELETE" });
            if (!res.ok) {
                setDeleteError("Failed to delete style.");
                return;
            }
            fetchStyles();
        } catch {
            setDeleteError("Failed to delete style.");
        } finally {
            setDeletingId(null);
        }
    };

    if (loading) {
        return <p className="text-sm text-slate-custom-400">Loading styles…</p>;
    }

    if (fetchError) {
        return <p className="text-sm text-red-500">{fetchError}</p>;
    }

    if (styles.length === 0) {
        return (
            <p className="text-sm text-slate-custom-500 italic">
                No saved styles yet. Save your first style from the{" "}
                <a href="/dashboard/studio" className="text-primary hover:underline">Studio chart customizer</a>.
            </p>
        );
    }

    return (
        <div className="space-y-2">
            {deleteError && <p className="text-xs text-red-500 mb-2">{deleteError}</p>}
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
                                className="flex-1 rounded-lg border border-slate-custom-200 bg-white px-3 py-2 text-sm text-slate-custom-900 focus:outline-none focus:ring-2 focus:ring-primary/50 focus:border-primary transition-all"
                            />
                            <button
                                onClick={() => commitRename(style.id)}
                                className="text-xs font-bold text-primary hover:underline"
                            >
                                Save
                            </button>
                            <button
                                onClick={() => { setRenamingId(null); setRenameError(null); }}
                                className="text-xs font-bold text-slate-custom-400 hover:text-slate-custom-600"
                            >
                                Cancel
                            </button>
                            {renameError && <span className="text-xs text-red-500">{renameError}</span>}
                        </>
                    ) : (
                        <>
                            <span className="flex-1 text-sm text-slate-custom-900">{style.name}</span>
                            <button
                                onClick={() => startRename(style)}
                                className="text-xs font-medium text-slate-custom-400 hover:text-primary transition-colors"
                            >
                                Rename
                            </button>
                            <button
                                onClick={() => handleDelete(style.id)}
                                disabled={deletingId === style.id}
                                className="text-xs font-medium text-slate-custom-400 hover:text-red-500 transition-colors disabled:opacity-40"
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
