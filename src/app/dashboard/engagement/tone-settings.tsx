"use client";

import { useCallback, useEffect, useRef, useState } from "react";
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

const DEFAULT_TONES: Pick<UserTone, "id" | "name" | "color">[] = [
  { id: "default-neutral", name: "Neutral", color: "slate" },
  { id: "default-professional", name: "Professional", color: "blue" },
  { id: "default-humor", name: "Humor", color: "yellow" },
  { id: "default-sarcastic", name: "Sarcastic", color: "orange" },
  { id: "default-hugefan", name: "Huge Fan", color: "pink" },
  { id: "default-cheers", name: "Cheers", color: "green" },
];

export interface PlaygroundPreset {
  toneWeights: Record<string, number> | null;
  temperature: number;
  accountContext: string | null;
  imageFrequency: number;
}

interface ToneSettingsProps {
  tones: UserTone[];
  onTonesChange: (tones: UserTone[]) => void;
  playgroundPreset?: PlaygroundPreset | null;
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

// ─── Playground ──────────────────────────────────────────────────────────────

interface PlaygroundResult {
  replyText: string;
  toneUsed: string;
  inputTokens: number;
  outputTokens: number;
  costs: { textCost: number; imageCost: number; apiCost: number; totalCost: number };
  imageBase64?: string;
}

interface PlaygroundSectionProps {
  tones: UserTone[];
  preset?: PlaygroundPreset | null;
}

function PlaygroundSection({ tones, preset }: PlaygroundSectionProps) {
  const sectionRef = useRef<HTMLDivElement>(null);
  const effectiveTones = tones.length > 0 ? tones : DEFAULT_TONES;

  // Form state
  const [tweetInput, setTweetInput] = useState("");
  const [toneMode, setToneMode] = useState<"single" | "weighted">("weighted");
  const [selectedToneId, setSelectedToneId] = useState<string>(effectiveTones[0]?.id ?? "");
  const [toneWeights, setToneWeights] = useState<Record<string, number>>({});
  const [temperature, setTemperature] = useState(0.8);
  const [accountContext, setAccountContext] = useState("");
  const [doImage, setDoImage] = useState(false);

  // Output state
  const [generating, setGenerating] = useState(false);
  const [result, setResult] = useState<PlaygroundResult | null>(null);
  const [error, setError] = useState<string | null>(null);

  // Populate from preset and auto-scroll
  useEffect(() => {
    if (!preset) return;

    if (preset.toneWeights && Object.keys(preset.toneWeights).length > 0) {
      setToneMode("weighted");
      setToneWeights(preset.toneWeights);
    } else {
      setToneMode("weighted");
      setToneWeights({});
    }
    setTemperature(Math.min(preset.temperature ?? 0.8, 1.0));
    setAccountContext(preset.accountContext ?? "");
    setDoImage(preset.imageFrequency > 0);

    // Auto-scroll into view
    setTimeout(() => {
      sectionRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
    }, 100);
  }, [preset]);

  const handleGenerate = useCallback(async () => {
    if (!tweetInput.trim()) return;
    setGenerating(true);
    setError(null);
    setResult(null);

    try {
      const body: Record<string, unknown> = {
        tweetInput: tweetInput.trim(),
        temperature,
        accountContext: accountContext.trim() || undefined,
        generateImage: doImage,
      };

      if (toneMode === "single" && selectedToneId) {
        body.toneId = selectedToneId;
      } else if (toneMode === "weighted") {
        body.toneWeights = toneWeights;
      }

      const res = await fetch("/api/dashboard/engagement/playground", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });

      const json = await res.json();
      if (!res.ok) {
        setError(json.message || "Generation failed.");
        return;
      }
      setResult(json as PlaygroundResult);
    } catch {
      setError("Network error. Please try again.");
    } finally {
      setGenerating(false);
    }
  }, [tweetInput, toneMode, selectedToneId, toneWeights, temperature, accountContext, doImage]);

  return (
    <div ref={sectionRef} className="space-y-4">
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-sm font-semibold text-slate-custom-900">Reply Playground</h2>
          <p className="text-xs text-slate-custom-500 mt-0.5">
            Preview how a reply would look with your current settings — no posting.
          </p>
        </div>
      </div>

      <div className="bg-white rounded-xl border border-slate-custom-200 p-5 space-y-4">
        {/* Tweet input */}
        <div>
          <p className="text-xs font-medium text-slate-custom-700 mb-1">Tweet</p>
          <textarea
            value={tweetInput}
            onChange={(e) => setTweetInput(e.target.value)}
            rows={3}
            placeholder="Paste a tweet URL (x.com/…/status/…) or raw tweet text"
            className="w-full text-sm text-slate-custom-700 border border-slate-custom-200 rounded-lg p-2.5 focus:outline-none focus:ring-2 focus:ring-primary/30 resize-none"
          />
          <p className="text-[11px] text-slate-custom-400 mt-0.5">
            Paste a URL to auto-fetch the tweet text, or type directly.
          </p>
        </div>

        {/* Tone mode toggle */}
        <div>
          <p className="text-xs font-medium text-slate-custom-700 mb-2">Tone Mode</p>
          <div className="flex gap-2">
            <button
              onClick={() => setToneMode("single")}
              className={`px-3 py-1.5 text-xs font-medium rounded-lg transition-colors ${
                toneMode === "single"
                  ? "bg-primary text-slate-custom-900"
                  : "bg-slate-custom-100 text-slate-custom-600 hover:bg-slate-custom-200"
              }`}
            >
              Single Tone
            </button>
            <button
              onClick={() => setToneMode("weighted")}
              className={`px-3 py-1.5 text-xs font-medium rounded-lg transition-colors ${
                toneMode === "weighted"
                  ? "bg-primary text-slate-custom-900"
                  : "bg-slate-custom-100 text-slate-custom-600 hover:bg-slate-custom-200"
              }`}
            >
              Weight-Based
            </button>
          </div>
        </div>

        {/* Single tone picker */}
        {toneMode === "single" && (
          <div>
            <p className="text-xs font-medium text-slate-custom-700 mb-1">Select Tone</p>
            <select
              value={selectedToneId}
              onChange={(e) => setSelectedToneId(e.target.value)}
              className="w-full text-sm border border-slate-custom-200 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-primary/30 bg-white text-slate-custom-700"
            >
              {effectiveTones.map((t) => (
                <option key={t.id} value={t.id}>{t.name}</option>
              ))}
            </select>
          </div>
        )}

        {/* Weight-based sliders */}
        {toneMode === "weighted" && (
          <div>
            <p className="text-xs font-medium text-slate-custom-700 mb-2">Tone Weights</p>
            <div className="flex flex-col gap-2">
              {effectiveTones.map((tone) => {
                const weight = toneWeights[tone.id] ?? 0;
                return (
                  <div key={tone.id} className="flex items-center gap-2">
                    <div className={`w-2.5 h-2.5 rounded-full flex-shrink-0 ${COLOR_DOT[tone.color] ?? "bg-slate-500"}`} />
                    <span className="text-xs text-slate-custom-600 w-20 truncate flex-shrink-0">{tone.name}</span>
                    <input
                      type="range"
                      min={0}
                      max={100}
                      step={5}
                      value={weight}
                      onChange={(e) =>
                        setToneWeights((prev) => ({ ...prev, [tone.id]: Number(e.target.value) }))
                      }
                      className="flex-1 min-w-0 h-1.5 accent-primary"
                    />
                    <span className="text-xs text-slate-custom-400 w-7 text-right flex-shrink-0">{weight}</span>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* Creativity slider */}
        <div>
          <p className="text-xs font-medium text-slate-custom-700 mb-1.5">
            Creativity
            <span className="ml-1 font-normal text-slate-custom-400">({temperature.toFixed(1)})</span>
          </p>
          <input
            type="range"
            min={0.1}
            max={1.0}
            step={0.1}
            value={temperature}
            onChange={(e) => setTemperature(Number(e.target.value))}
            className="w-full h-1.5 accent-primary"
          />
          <div className="flex justify-between text-[10px] text-slate-custom-400 mt-0.5">
            <span>Focused</span>
            <span>Creative</span>
          </div>
        </div>

        {/* Account context */}
        <div>
          <p className="text-xs font-medium text-slate-custom-700 mb-1">Account Context</p>
          <textarea
            value={accountContext}
            onChange={(e) => setAccountContext(e.target.value)}
            rows={2}
            placeholder="e.g., Tech blogger covering AI startups"
            className="w-full text-xs text-slate-custom-700 border border-slate-custom-200 rounded-lg p-2 focus:outline-none focus:ring-2 focus:ring-primary/30 resize-none"
          />
        </div>

        {/* Image generation toggle */}
        <div className="flex items-center justify-between">
          <div>
            <p className="text-xs font-medium text-slate-custom-700">Generate Image</p>
            <p className="text-[11px] text-slate-custom-400">Include a DALL-E image with the reply</p>
          </div>
          <div
            role="switch"
            aria-checked={doImage}
            onClick={() => setDoImage((v) => !v)}
            className={`relative w-11 h-6 rounded-full transition-colors cursor-pointer flex-shrink-0 ${
              doImage ? "bg-primary" : "bg-slate-custom-200"
            }`}
          >
            <div
              className={`absolute top-0.5 left-0.5 w-5 h-5 bg-white rounded-full shadow transition-transform ${
                doImage ? "translate-x-5" : "translate-x-0"
              }`}
            />
          </div>
        </div>

        {/* Generate button */}
        <button
          onClick={handleGenerate}
          disabled={generating || !tweetInput.trim()}
          className="w-full py-2.5 text-sm font-semibold bg-primary text-slate-custom-900 rounded-lg hover:bg-primary/90 transition-colors disabled:opacity-50"
        >
          {generating ? (
            <span className="flex items-center justify-center gap-2">
              <span className="material-icons-round text-[16px] animate-spin">refresh</span>
              Generating…
            </span>
          ) : (
            "Generate Reply"
          )}
        </button>

        {/* Error */}
        {error && (
          <div className="p-3 bg-red-50 border border-red-200 rounded-lg text-xs text-red-700">
            {error}
          </div>
        )}

        {/* Output */}
        {result && (
          <div className="space-y-3 pt-1">
            <div className="p-4 bg-slate-custom-50 rounded-xl border border-slate-custom-200">
              <div className="flex items-start justify-between gap-2 mb-2">
                <p className="text-xs font-semibold text-slate-custom-700">Generated Reply</p>
                <span className="text-[10px] text-slate-custom-400 bg-white border border-slate-custom-200 rounded px-1.5 py-0.5">
                  {result.toneUsed}
                </span>
              </div>
              <p className="text-sm text-slate-custom-900 leading-relaxed">{result.replyText}</p>
            </div>

            {result.imageBase64 && (
              <div className="rounded-xl overflow-hidden border border-slate-custom-200">
                <img
                  src={`data:image/png;base64,${result.imageBase64}`}
                  alt="Generated reply image"
                  className="w-full object-cover"
                />
              </div>
            )}

            {/* Cost breakdown */}
            <div className="p-3 bg-white rounded-xl border border-slate-custom-200 text-[11px] text-slate-custom-500 space-y-1">
              <p className="font-medium text-slate-custom-700 mb-1.5">Cost Estimate</p>
              <div className="flex justify-between">
                <span>Input tokens</span>
                <span>{result.inputTokens.toLocaleString()}</span>
              </div>
              <div className="flex justify-between">
                <span>Output tokens</span>
                <span>{result.outputTokens.toLocaleString()}</span>
              </div>
              <div className="flex justify-between">
                <span>Text generation</span>
                <span>${result.costs.textCost.toFixed(5)}</span>
              </div>
              {result.costs.imageCost > 0 && (
                <div className="flex justify-between">
                  <span>Image generation</span>
                  <span>${result.costs.imageCost.toFixed(4)}</span>
                </div>
              )}
              <div className="flex justify-between font-semibold text-slate-custom-700 pt-1 border-t border-slate-custom-100">
                <span>Total</span>
                <span>${result.costs.totalCost.toFixed(5)}</span>
              </div>
            </div>

            {/* Regenerate */}
            <button
              onClick={handleGenerate}
              disabled={generating}
              className="flex items-center gap-1.5 text-xs font-medium text-slate-custom-600 hover:text-slate-custom-900 transition-colors disabled:opacity-50"
            >
              <span className="material-icons-round text-[14px]">refresh</span>
              Regenerate
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

// ─── Main export ──────────────────────────────────────────────────────────────

export function ToneSettings({ tones, onTonesChange, playgroundPreset }: ToneSettingsProps) {
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
    <div className="space-y-10">
      {/* ── Tone Library ── */}
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

      {/* Divider */}
      <div className="border-t border-slate-custom-200" />

      {/* ── Playground ── */}
      <PlaygroundSection tones={tones} preset={playgroundPreset} />
    </div>
  );
}
