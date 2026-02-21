"use client";

import { useState } from "react";
import type { UserTone } from "@prisma/client";

const COLOR_OPTIONS = [
  { key: "slate", label: "Slate", dot: "bg-slate-500" },
  { key: "blue", label: "Blue", dot: "bg-blue-500" },
  { key: "yellow", label: "Yellow", dot: "bg-yellow-500" },
  { key: "orange", label: "Orange", dot: "bg-orange-500" },
  { key: "pink", label: "Pink", dot: "bg-pink-500" },
  { key: "green", label: "Green", dot: "bg-green-500" },
  { key: "purple", label: "Purple", dot: "bg-purple-500" },
  { key: "teal", label: "Teal", dot: "bg-teal-500" },
];

const COLOR_DOT: Record<string, string> = {
  slate: "bg-slate-500",
  blue: "bg-blue-500",
  yellow: "bg-yellow-500",
  orange: "bg-orange-500",
  pink: "bg-pink-500",
  green: "bg-green-500",
  purple: "bg-purple-500",
  teal: "bg-teal-500",
};

interface ToneSettingsProps {
  tones: UserTone[];
  onTonesChange: (tones: UserTone[]) => void;
}

interface ToneCardProps {
  tone: UserTone;
  onSave: (id: string, data: { name: string; prompt: string; color: string }) => Promise<void>;
  onDelete: (id: string) => Promise<void>;
}

function ToneCard({ tone, onSave, onDelete }: ToneCardProps) {
  const [name, setName] = useState(tone.name);
  const [prompt, setPrompt] = useState(tone.prompt);
  const [color, setColor] = useState(tone.color);
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [dirty, setDirty] = useState(false);

  const handleSave = async () => {
    setSaving(true);
    try {
      await onSave(tone.id, { name, prompt, color });
      setDirty(false);
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async () => {
    if (!confirm(`Delete tone "${tone.name}"?`)) return;
    setDeleting(true);
    try {
      await onDelete(tone.id);
    } finally {
      setDeleting(false);
    }
  };

  return (
    <div className="bg-white rounded-xl border border-slate-custom-200 p-4 flex flex-col gap-3">
      {/* Name + color dot */}
      <div className="flex items-center gap-2">
        <div className={`w-3 h-3 rounded-full flex-shrink-0 ${COLOR_DOT[color] ?? "bg-slate-500"}`} />
        <input
          type="text"
          value={name}
          onChange={(e) => { setName(e.target.value); setDirty(true); }}
          className="flex-1 text-sm font-semibold text-slate-custom-900 border-0 bg-transparent focus:outline-none focus:ring-1 focus:ring-primary/30 rounded px-1 py-0.5"
          placeholder="Tone name"
        />
      </div>

      {/* Prompt textarea */}
      <div>
        <p className="text-xs font-medium text-slate-custom-500 mb-1">System Prompt</p>
        <textarea
          value={prompt}
          onChange={(e) => { setPrompt(e.target.value); setDirty(true); }}
          rows={4}
          className="w-full text-xs text-slate-custom-700 border border-slate-custom-200 rounded-lg p-2 focus:outline-none focus:ring-2 focus:ring-primary/30 resize-y"
          placeholder="Write the system prompt for this tone..."
        />
      </div>

      {/* Color picker */}
      <div>
        <p className="text-xs font-medium text-slate-custom-500 mb-1.5">Color</p>
        <div className="flex flex-wrap gap-1.5">
          {COLOR_OPTIONS.map((c) => (
            <button
              key={c.key}
              onClick={() => { setColor(c.key); setDirty(true); }}
              title={c.label}
              className={`w-5 h-5 rounded-full ${c.dot} transition-all ${
                color === c.key ? "ring-2 ring-offset-1 ring-slate-custom-500 scale-110" : "opacity-60 hover:opacity-100"
              }`}
            />
          ))}
        </div>
      </div>

      {/* Actions */}
      <div className="flex items-center justify-between pt-1">
        <button
          onClick={handleDelete}
          disabled={deleting}
          className="flex items-center gap-1 text-xs text-red-500 hover:text-red-700 transition-colors disabled:opacity-50"
        >
          <span className="material-icons-round text-[14px]">delete</span>
          {deleting ? "Deleting..." : "Delete"}
        </button>
        {dirty && (
          <button
            onClick={handleSave}
            disabled={saving || !name.trim() || !prompt.trim()}
            className="px-3 py-1 text-xs font-semibold bg-primary text-slate-custom-900 rounded-lg hover:bg-primary/90 transition-colors disabled:opacity-50"
          >
            {saving ? "Saving..." : "Save"}
          </button>
        )}
      </div>
    </div>
  );
}

export function ToneSettings({ tones, onTonesChange }: ToneSettingsProps) {
  const [adding, setAdding] = useState(false);
  const [newName, setNewName] = useState("");
  const [newPrompt, setNewPrompt] = useState("");
  const [newColor, setNewColor] = useState("slate");
  const [createError, setCreateError] = useState<string | null>(null);
  const [createLoading, setCreateLoading] = useState(false);

  const handleSave = async (id: string, data: { name: string; prompt: string; color: string }) => {
    const res = await fetch(`/api/dashboard/engagement/tones/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(data),
    });
    if (res.ok) {
      const json = await res.json();
      onTonesChange(tones.map((t) => (t.id === id ? (json.tone as UserTone) : t)));
    }
  };

  const handleDelete = async (id: string) => {
    const res = await fetch(`/api/dashboard/engagement/tones/${id}`, { method: "DELETE" });
    if (res.ok || res.status === 204) {
      onTonesChange(tones.filter((t) => t.id !== id));
    }
  };

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newName.trim() || !newPrompt.trim()) return;
    setCreateLoading(true);
    setCreateError(null);
    try {
      const res = await fetch("/api/dashboard/engagement/tones", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: newName.trim(), prompt: newPrompt.trim(), color: newColor }),
      });
      const json = await res.json();
      if (!res.ok) {
        setCreateError(json.message || "Failed to create tone.");
        return;
      }
      onTonesChange([...tones, json.tone as UserTone]);
      setNewName("");
      setNewPrompt("");
      setNewColor("slate");
      setAdding(false);
    } finally {
      setCreateLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Add tone button */}
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-sm font-semibold text-slate-custom-900">Tone Library</h2>
          <p className="text-xs text-slate-custom-500 mt-0.5">
            Define how replies are written. Assign tone weights per account.
          </p>
        </div>
        <button
          onClick={() => setAdding((v) => !v)}
          className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold bg-primary text-slate-custom-900 rounded-lg hover:bg-primary/90 transition-colors"
        >
          <span className="material-icons-round text-[14px]">{adding ? "close" : "add"}</span>
          {adding ? "Cancel" : "Add Custom Tone"}
        </button>
      </div>

      {/* New tone form */}
      {adding && (
        <form
          onSubmit={handleCreate}
          className="bg-white rounded-xl border border-primary/40 p-4 flex flex-col gap-3"
        >
          <p className="text-xs font-semibold text-slate-custom-900">New Tone</p>
          <input
            type="text"
            placeholder="Tone name"
            value={newName}
            onChange={(e) => setNewName(e.target.value)}
            className="px-3 py-2 text-sm border border-slate-custom-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary/30"
          />
          <textarea
            placeholder="System prompt text..."
            value={newPrompt}
            onChange={(e) => setNewPrompt(e.target.value)}
            rows={4}
            className="px-3 py-2 text-sm border border-slate-custom-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary/30 resize-y"
          />
          <div>
            <p className="text-xs font-medium text-slate-custom-500 mb-1.5">Color</p>
            <div className="flex flex-wrap gap-1.5">
              {COLOR_OPTIONS.map((c) => (
                <button
                  key={c.key}
                  type="button"
                  onClick={() => setNewColor(c.key)}
                  title={c.label}
                  className={`w-5 h-5 rounded-full ${c.dot} transition-all ${
                    newColor === c.key
                      ? "ring-2 ring-offset-1 ring-slate-custom-500 scale-110"
                      : "opacity-60 hover:opacity-100"
                  }`}
                />
              ))}
            </div>
          </div>
          {createError && <p className="text-xs text-red-500">{createError}</p>}
          <button
            type="submit"
            disabled={createLoading || !newName.trim() || !newPrompt.trim()}
            className="self-end px-4 py-2 text-xs font-semibold bg-primary text-slate-custom-900 rounded-lg hover:bg-primary/90 transition-colors disabled:opacity-50"
          >
            {createLoading ? "Creating..." : "Create Tone"}
          </button>
        </form>
      )}

      {/* Tone cards grid */}
      {tones.length === 0 ? (
        <div className="bg-white rounded-xl border border-slate-custom-200 p-10 text-center">
          <span className="material-icons-round text-[48px] text-slate-custom-300">tune</span>
          <p className="mt-3 text-sm text-slate-custom-500">No tones yet. Add a custom tone above.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {tones.map((tone) => (
            <ToneCard
              key={tone.id}
              tone={tone}
              onSave={handleSave}
              onDelete={handleDelete}
            />
          ))}
        </div>
      )}
    </div>
  );
}
