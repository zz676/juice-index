"use client";

import { useState, useEffect, useCallback } from "react";

export type ChartType = "bar" | "line" | "horizontalBar" | "multiLine";

export interface ChartConfig {
    chartType: ChartType;
    title: string;
    description: string;
    backgroundColor: string;
    barColor: string;
    fontColor: string;
    titleColor: string;
    titleSize: number;
    titleFont: string;
    titlePaddingTop: number;
    titlePaddingBottom: number;
    xAxisFontSize: number;
    yAxisFontSize: number;
    xAxisFontColor: string;
    yAxisFontColor: string;
    axisFont: string;
    sourceText: string;
    bottomRightText: string;
    sourceColor: string;
    sourceFontSize: number;
    sourceFont: string;
    sourcePaddingTop: number;
    sourcePaddingBottom: number;
    barWidth: number | undefined;
    xAxisLineColor: string;
    yAxisLineColor: string;
    xAxisLineWidth: number;
    yAxisLineWidth: number;
    paddingTop: number;
    paddingBottom: number;
    paddingLeft: number;
    paddingRight: number;
    showValues: boolean;
    showGrid: boolean;
    gridLineStyle: "solid" | "dashed" | "dotted";
    gridColor: string;
}

export const DEFAULT_CHART_CONFIG: ChartConfig = {
    chartType: "bar",
    title: "Data Results",
    description: "Visualization of requested data",
    backgroundColor: "#ffffff",
    barColor: "#6ada1b",
    fontColor: "#1e293b",
    titleColor: "#1e293b",
    titleSize: 24,
    titleFont: "Inter",
    titlePaddingTop: 18,
    titlePaddingBottom: 18,
    xAxisFontSize: 12,
    yAxisFontSize: 12,
    xAxisFontColor: "#64748b",
    yAxisFontColor: "#64748b",
    axisFont: "Inter",
    sourceText: "Powered by juiceindex.io",
    bottomRightText: "",
    sourceColor: "#6ada1b",
    sourceFontSize: 18,
    sourceFont: "Inter",
    sourcePaddingTop: 6,
    sourcePaddingBottom: 20,
    barWidth: undefined,
    xAxisLineColor: "#e5e7eb",
    yAxisLineColor: "#e5e7eb",
    xAxisLineWidth: 1,
    yAxisLineWidth: 1,
    paddingTop: 20,
    paddingBottom: 20,
    paddingLeft: 40,
    paddingRight: 70,
    showValues: true,
    showGrid: true,
    gridLineStyle: "dashed",
    gridColor: "#e5e7eb",
};

type SavedStyle = { id: string; name: string; config: ChartConfig };

interface ChartCustomizerProps {
    config: ChartConfig;
    onChange: (config: ChartConfig) => void;
    isOpen: boolean;
    onToggle: () => void;
    // Axis selection (only rendered when columns.length > 1)
    columns?: string[];
    numericColumns?: string[];
    xField?: string;
    yField?: string;
    onAxisChange?: (xField: string, yField: string) => void;
}

function ColorInput({ label, value, onChange }: { label: string; value: string; onChange: (v: string) => void }) {
    const [inputVal, setInputVal] = useState(value || "#000000");
    useEffect(() => { setInputVal(value || "#000000"); }, [value]);
    return (
        <div className="flex items-center justify-between gap-2">
            <span className="text-xs font-medium text-slate-600">{label}</span>
            <div className="flex items-center gap-1.5">
                <input
                    type="color"
                    value={value || "#000000"}
                    onChange={(e) => onChange(e.target.value)}
                    className="h-7 w-7 cursor-pointer rounded border border-slate-200 bg-white p-0.5 shrink-0"
                />
                <input
                    type="text"
                    value={inputVal}
                    onChange={(e) => {
                        setInputVal(e.target.value);
                        if (/^#[0-9a-fA-F]{6}$/.test(e.target.value)) onChange(e.target.value);
                    }}
                    onBlur={() => setInputVal(value || "#000000")}
                    className="w-20 text-xs font-mono border border-slate-200 rounded px-2 py-1 text-slate-700 focus:outline-none focus:ring-1 focus:ring-primary/50"
                    maxLength={7}
                />
            </div>
        </div>
    );
}

function NumberInput({ label, value, onChange, placeholder, min, max }: { label: string; value: number | undefined; onChange: (v: number | undefined) => void; placeholder?: string; min?: number; max?: number }) {
    return (
        <label className="flex items-center justify-between gap-2">
            <span className="text-xs font-medium text-slate-600">{label}</span>
            <input
                type="number"
                value={value ?? ""}
                onChange={(e) => { const v = Number(e.target.value); onChange(Number.isFinite(v) && v > 0 ? v : undefined); }}
                placeholder={placeholder || "Auto"}
                min={min}
                max={max}
                className="h-7 w-16 rounded border border-slate-200 bg-white px-2 text-center text-xs text-slate-700 focus:outline-none focus:ring-1 focus:ring-primary"
            />
        </label>
    );
}

export function ChartCustomizer({
    config, onChange, isOpen, onToggle,
    columns = [], numericColumns = [], xField = "", yField = "",
    onAxisChange,
}: ChartCustomizerProps) {
    const [activeSection, setActiveSection] = useState<string>("chart");

    const update = (partial: Partial<ChartConfig>) => onChange({ ...config, ...partial });

    const chartTypes: { value: ChartType; icon: string; label: string }[] = [
        { value: "bar", icon: "bar_chart", label: "Bar" },
        { value: "line", icon: "show_chart", label: "Line" },
        { value: "horizontalBar", icon: "align_horizontal_left", label: "H-Bar" },
        { value: "multiLine", icon: "stacked_line_chart", label: "Multi" },
    ];

    const sections = [
        { id: "chart", icon: "dashboard", label: "Chart" },
        { id: "style", icon: "palette", label: "Style" },
        { id: "saved", icon: "bookmarks", label: "Saved" },
    ];

    const hasMultipleColumns = columns.length > 1;
    const visibleSections = sections;

    const [savedStyles, setSavedStyles] = useState<SavedStyle[]>([]);
    const [selectedStyleId, setSelectedStyleId] = useState<string>("");
    const [newStyleName, setNewStyleName] = useState("");
    const [isSaving, setIsSaving] = useState(false);
    const [isDeleting, setIsDeleting] = useState(false);
    const [deleteConfirm, setDeleteConfirm] = useState(false);
    const [stylesError, setStylesError] = useState<string | null>(null);

    const fetchStyles = useCallback(async () => {
        try {
            const res = await fetch("/api/dashboard/studio/chart-styles");
            if (!res.ok) return;
            const data = await res.json();
            setSavedStyles(data.styles ?? []);
        } catch {
            // silent — not critical
        }
    }, []);

    useEffect(() => {
        if (isOpen) fetchStyles();
    }, [isOpen, fetchStyles]);

    const handleSaveStyle = async () => {
        if (!newStyleName.trim()) return;
        setIsSaving(true);
        setStylesError(null);
        try {
            const res = await fetch("/api/dashboard/studio/chart-styles", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ name: newStyleName.trim(), config }),
            });
            if (res.status === 409) {
                setStylesError("A style with that name already exists.");
                return;
            }
            if (!res.ok) {
                setStylesError("Failed to save style.");
                return;
            }
            setNewStyleName("");
            await fetchStyles();
        } catch {
            setStylesError("Failed to save style.");
        } finally {
            setIsSaving(false);
        }
    };

    const handleDeleteStyle = async () => {
        if (!selectedStyleId) return;
        if (!deleteConfirm) {
            setDeleteConfirm(true);
            return;
        }
        setIsDeleting(true);
        try {
            await fetch(`/api/dashboard/studio/chart-styles/${selectedStyleId}`, {
                method: "DELETE",
            });
            setSelectedStyleId("");
            await fetchStyles();
        } catch {
            setStylesError("Failed to delete style.");
        } finally {
            setDeleteConfirm(false);
            setIsDeleting(false);
        }
    };

    const handleApplyStyle = () => {
        const found = savedStyles.find((s) => s.id === selectedStyleId);
        if (found) onChange({ ...DEFAULT_CHART_CONFIG, ...(found.config as Partial<ChartConfig>) });
    };

    // No per-section reset needed — axes are now embedded inside the Chart tab

    if (!isOpen) return null;

    return (
        <div className="w-full bg-white border-[1.3px] border-lime-300 rounded-2xl flex flex-col h-full overflow-hidden shadow-[-6px_0_32px_rgba(106,218,27,0.18),_0_0_20px_rgba(106,218,27,0.07),_inset_0_1px_0_rgba(106,218,27,0.25),_inset_1px_0_0_rgba(106,218,27,0.08)]">
            {/* Header */}
            <div className="flex items-center justify-between px-4 py-3 border-b border-slate-100 bg-gradient-to-b from-primary/[0.075] to-primary/[0.03]">
                <div className="flex items-center gap-2">
                    <span className="material-icons-round text-primary text-lg">tune</span>
                    <h3 className="text-sm font-bold text-slate-800">Customize</h3>
                </div>
                <button onClick={onToggle} className="w-7 h-7 flex items-center justify-center rounded-full hover:bg-slate-100 text-slate-400 hover:text-slate-600 transition-colors">
                    <span className="material-icons-round text-lg">close</span>
                </button>
            </div>

            {/* Section Tabs */}
            <div className="flex border-b border-slate-100 px-2 py-1">
                {visibleSections.map((s) => (
                    <button
                        key={s.id}
                        onClick={() => setActiveSection(s.id)}
                        className={`flex-1 flex flex-col items-center gap-0.5 px-2 py-2 rounded-lg text-[10px] font-bold uppercase tracking-wide transition-colors ${activeSection === s.id ? "bg-primary/10 text-primary" : "text-slate-400 hover:text-slate-600"}`}
                    >
                        <span className="material-icons-round text-base">{s.icon}</span>
                        {s.label}
                    </button>
                ))}
            </div>

            {/* Content */}
            <div className="flex-1 overflow-y-auto p-4 space-y-4">
                {/* ── CHART tab: type + display + layout + axes + axis text + axis lines ── */}
                {activeSection === "chart" && (
                    <div className="space-y-2">
                        {/* Chart type icons */}
                        <div className="grid grid-cols-4 gap-1.5">
                            {chartTypes.map((ct) => (
                                <button key={ct.value} onClick={() => update({ chartType: ct.value })} title={ct.label} className={`flex items-center justify-center p-2 rounded-lg border transition-all ${config.chartType === ct.value ? "border-primary bg-primary/10 text-primary shadow-sm" : "border-slate-200 text-slate-500 hover:border-primary/50 hover:text-primary"}`}>
                                    <span className="material-icons-round text-xl">{ct.icon}</span>
                                </button>
                            ))}
                        </div>

                        {/* Show Values + Show Grid toggles */}
                        <div className="border-t border-slate-100 pt-2 space-y-1.5">
                            <div className="flex items-center justify-between">
                                <span className="text-xs font-medium text-slate-600">Show Values</span>
                                <button onClick={() => update({ showValues: !config.showValues })} className={`w-9 h-5 rounded-full transition-colors relative ${config.showValues ? "bg-primary" : "bg-slate-300"}`}>
                                    <span className={`absolute top-0.5 w-4 h-4 bg-white rounded-full shadow transition-transform ${config.showValues ? "left-[18px]" : "left-0.5"}`} />
                                </button>
                            </div>
                            <div className="flex items-center justify-between">
                                <span className="text-xs font-medium text-slate-600">Show Grid</span>
                                <button onClick={() => update({ showGrid: !config.showGrid })} className={`w-9 h-5 rounded-full transition-colors relative ${config.showGrid ? "bg-primary" : "bg-slate-300"}`}>
                                    <span className={`absolute top-0.5 w-4 h-4 bg-white rounded-full shadow transition-transform ${config.showGrid ? "left-[18px]" : "left-0.5"}`} />
                                </button>
                            </div>
                            {config.showGrid && (
                                <div className="space-y-1.5 pt-0.5">
                                    <div className="grid grid-cols-3 gap-1">
                                        {([
                                            { value: "solid", label: "Solid" },
                                            { value: "dashed", label: "Dashed" },
                                            { value: "dotted", label: "Dotted" },
                                        ] as const).map((opt) => (
                                            <button
                                                key={opt.value}
                                                onClick={() => update({ gridLineStyle: opt.value })}
                                                className={`py-1 text-[10px] font-bold rounded border transition-all ${config.gridLineStyle === opt.value ? "border-primary bg-primary/10 text-primary" : "border-slate-200 text-slate-500 hover:border-primary/50 hover:text-primary"}`}
                                            >
                                                {opt.label}
                                            </button>
                                        ))}
                                    </div>
                                    <ColorInput label="Grid Color" value={config.gridColor} onChange={(v) => update({ gridColor: v })} />
                                </div>
                            )}
                        </div>

                        {/* Layout */}
                        <div className="border-t border-slate-100 pt-2 space-y-1.5">
                            <label className="text-xs font-semibold text-slate-500 uppercase tracking-wide block">Layout</label>
                            <NumberInput label="Bar Width" value={config.barWidth} onChange={(v) => update({ barWidth: v })} min={1} max={100} />
                            <NumberInput label="X-Axis Thickness" value={config.xAxisLineWidth} onChange={(v) => update({ xAxisLineWidth: v ?? 1 })} min={0} max={10} />
                            <NumberInput label="Y-Axis Thickness" value={config.yAxisLineWidth} onChange={(v) => update({ yAxisLineWidth: v ?? 1 })} min={0} max={10} />
                            <div>
                                <label className="text-xs font-semibold text-slate-500 uppercase tracking-wide mb-1 block">Padding</label>
                                <div className="grid grid-cols-2 gap-1.5">
                                    <NumberInput label="Top" value={config.paddingTop} onChange={(v) => update({ paddingTop: v ?? 20 })} placeholder="20" min={0} max={100} />
                                    <NumberInput label="Bottom" value={config.paddingBottom} onChange={(v) => update({ paddingBottom: v ?? 20 })} placeholder="20" min={0} max={100} />
                                    <NumberInput label="Left" value={config.paddingLeft} onChange={(v) => update({ paddingLeft: v ?? 20 })} placeholder="20" min={0} max={100} />
                                    <NumberInput label="Right" value={config.paddingRight} onChange={(v) => update({ paddingRight: v ?? 20 })} placeholder="20" min={0} max={100} />
                                </div>
                            </div>
                        </div>

                        {/* Axes */}
                        {hasMultipleColumns && (
                            <div className="border-t border-slate-100 pt-2 space-y-1.5">
                                <label className="text-xs font-semibold text-slate-500 uppercase tracking-wide block">Axes</label>
                                <div className="flex items-center justify-between gap-2">
                                    <span className="text-xs font-medium text-slate-600 shrink-0">X Axis</span>
                                    <select
                                        value={xField}
                                        onChange={(e) => onAxisChange?.(e.target.value, yField)}
                                        className="flex-1 rounded border border-slate-200 bg-white px-2 py-1 text-xs text-slate-700 focus:outline-none focus:ring-1 focus:ring-primary"
                                    >
                                        {columns.map((col) => (
                                            <option key={col} value={col}>{col}</option>
                                        ))}
                                    </select>
                                </div>
                                <div className="flex items-center justify-between gap-2">
                                    <span className="text-xs font-medium text-slate-600 shrink-0">Y Axis</span>
                                    <select
                                        value={yField}
                                        onChange={(e) => onAxisChange?.(xField, e.target.value)}
                                        className="flex-1 rounded border border-slate-200 bg-white px-2 py-1 text-xs text-slate-700 focus:outline-none focus:ring-1 focus:ring-primary"
                                    >
                                        {numericColumns.map((col) => (
                                            <option key={col} value={col}>{col}</option>
                                        ))}
                                    </select>
                                </div>
                            </div>
                        )}

                        {/* Axis Text */}
                        <div className="border-t border-slate-100 pt-2 space-y-1.5">
                            <label className="text-xs font-semibold text-slate-500 uppercase tracking-wide block">Axis Text</label>
                            <label className="flex items-center justify-between gap-2">
                                <span className="text-xs font-medium text-slate-600">Axis Font</span>
                                <select
                                    value={config.axisFont}
                                    onChange={(e) => update({ axisFont: e.target.value })}
                                    className="h-7 rounded border border-slate-200 bg-white px-2 text-xs text-slate-700 focus:outline-none focus:ring-1 focus:ring-primary"
                                >
                                    {["Inter", "Arial", "Helvetica", "Georgia", "Times New Roman", "Courier New", "Verdana", "Trebuchet MS"].map((f) => (
                                        <option key={f} value={f} style={{ fontFamily: f }}>{f}</option>
                                    ))}
                                </select>
                            </label>
                            <NumberInput label="X-Axis Font Size" value={config.xAxisFontSize} onChange={(v) => update({ xAxisFontSize: v ?? 12 })} min={8} max={24} />
                            <ColorInput label="X-Axis Font Color" value={config.xAxisFontColor} onChange={(v) => update({ xAxisFontColor: v })} />
                            <NumberInput label="Y-Axis Font Size" value={config.yAxisFontSize} onChange={(v) => update({ yAxisFontSize: v ?? 12 })} min={8} max={24} />
                            <ColorInput label="Y-Axis Font Color" value={config.yAxisFontColor} onChange={(v) => update({ yAxisFontColor: v })} />
                        </div>

                        {/* Axis Lines */}
                        <div className="border-t border-slate-100 pt-2 space-y-1.5">
                            <label className="text-xs font-semibold text-slate-500 uppercase tracking-wide block">Axis Lines</label>
                            <ColorInput label="X-Axis Color" value={config.xAxisLineColor} onChange={(v) => update({ xAxisLineColor: v })} />
                            <ColorInput label="Y-Axis Color" value={config.yAxisLineColor} onChange={(v) => update({ yAxisLineColor: v })} />
                        </div>
                    </div>
                )}

                {/* ── STYLE tab: colors + typography + source ── */}
                {activeSection === "style" && (
                    <div className="space-y-3">
                        <label className="text-xs font-semibold text-slate-500 uppercase tracking-wide mb-1 block">Palette</label>
                        <div className="flex gap-2 mb-3">
                            {[
                                { bg: "#ffffff", bar: "#6ada1b", label: "Lime", fontColor: "#1e293b", titleColor: "#0f172a", axisFont: "#64748b", axisLine: "#e5e7eb", grid: "#e5e7eb" },
                                { bg: "#0f172a", bar: "#6ada1b", label: "Dark", fontColor: "#e2e8f0", titleColor: "#f1f5f9", axisFont: "#94a3b8", axisLine: "#334155", grid: "#1e293b" },
                                { bg: "#ffffff", bar: "#3b82f6", label: "Blue", fontColor: "#1e293b", titleColor: "#0f172a", axisFont: "#64748b", axisLine: "#e5e7eb", grid: "#e5e7eb" },
                                { bg: "#fefce8", bar: "#eab308", label: "Gold", fontColor: "#713f12", titleColor: "#451a03", axisFont: "#92400e", axisLine: "#fde68a", grid: "#fef3c7" },
                            ].map((preset) => (
                                <button key={preset.label} onClick={() => update({ backgroundColor: preset.bg, barColor: preset.bar, fontColor: preset.fontColor, titleColor: preset.titleColor, xAxisFontColor: preset.axisFont, yAxisFontColor: preset.axisFont, xAxisLineColor: preset.axisLine, yAxisLineColor: preset.axisLine, gridColor: preset.grid })} className="flex-1 flex flex-col items-center gap-1 p-2 rounded-lg border border-slate-200 hover:border-primary/50 transition-colors group" title={preset.label}>
                                    <div className="flex gap-0.5 w-full h-4 rounded overflow-hidden">
                                        <div className="flex-1 rounded-l" style={{ backgroundColor: preset.bg }} />
                                        <div className="flex-1 rounded-r" style={{ backgroundColor: preset.bar }} />
                                    </div>
                                    <span className="text-[9px] font-bold text-slate-400 group-hover:text-primary uppercase">{preset.label}</span>
                                </button>
                            ))}
                        </div>
                        <ColorInput label="Background" value={config.backgroundColor} onChange={(v) => update({ backgroundColor: v })} />
                        <ColorInput label="Bar / Line Color" value={config.barColor} onChange={(v) => update({ barColor: v })} />
                        <ColorInput label="Font Color" value={config.fontColor} onChange={(v) => update({ fontColor: v })} />
                        <div className="border-t border-slate-100 pt-3 mt-1">
                            <label className="text-xs font-semibold text-slate-500 uppercase tracking-wide mb-2 block">Title</label>
                        </div>
                        <input type="text" value={config.title} onChange={(e) => update({ title: e.target.value })} className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm text-slate-800 focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary" placeholder="Chart title..." />
                        <label className="flex items-center justify-between gap-2">
                            <span className="text-xs font-medium text-slate-600">Title Font</span>
                            <select
                                value={config.titleFont}
                                onChange={(e) => update({ titleFont: e.target.value })}
                                className="h-7 rounded border border-slate-200 bg-white px-2 text-xs text-slate-700 focus:outline-none focus:ring-1 focus:ring-primary"
                            >
                                {["Inter", "Arial", "Helvetica", "Georgia", "Times New Roman", "Courier New", "Verdana", "Trebuchet MS"].map((f) => (
                                    <option key={f} value={f} style={{ fontFamily: f }}>{f}</option>
                                ))}
                            </select>
                        </label>
                        <ColorInput label="Title Color" value={config.titleColor} onChange={(v) => update({ titleColor: v })} />
                        <NumberInput label="Title Size" value={config.titleSize} onChange={(v) => update({ titleSize: v ?? 24 })} min={10} max={48} />
                        <NumberInput label="Title Padding Top" value={config.titlePaddingTop} onChange={(v) => update({ titlePaddingTop: v ?? 18 })} min={0} max={80} />
                        <NumberInput label="Title Padding Bottom" value={config.titlePaddingBottom} onChange={(v) => update({ titlePaddingBottom: v ?? 18 })} min={0} max={80} />

                        <div className="border-t border-slate-100 pt-3 mt-1">
                            <label className="text-xs font-semibold text-slate-500 uppercase tracking-wide mb-2 block">Source / Watermark</label>
                        </div>
                        <div>
                            <span className="text-xs font-medium text-slate-600 mb-1 block">Bottom Left Text</span>
                            <input type="text" value={config.sourceText} onChange={(e) => update({ sourceText: e.target.value })} className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm text-slate-800 focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary" placeholder="Powered by juiceindex.io" />
                        </div>
                        <div>
                            <span className="text-xs font-medium text-slate-600 mb-1 block">Bottom Right Text</span>
                            <input type="text" value={config.bottomRightText} onChange={(e) => update({ bottomRightText: e.target.value })} className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm text-slate-800 focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary" placeholder="e.g. Source: Company data" />
                        </div>
                        <label className="flex items-center justify-between gap-2">
                            <span className="text-xs font-medium text-slate-600">Bottom Text Font</span>
                            <select
                                value={config.sourceFont || "Inter"}
                                onChange={(e) => update({ sourceFont: e.target.value })}
                                className="h-7 rounded border border-slate-200 bg-white px-2 text-xs text-slate-700 focus:outline-none focus:ring-1 focus:ring-primary"
                            >
                                {["Inter", "Arial", "Helvetica", "Georgia", "Times New Roman", "Courier New", "Verdana", "Trebuchet MS"].map((f) => (
                                    <option key={f} value={f} style={{ fontFamily: f }}>{f}</option>
                                ))}
                            </select>
                        </label>
                        <ColorInput label="Bottom Text Color" value={config.sourceColor} onChange={(v) => update({ sourceColor: v })} />
                        <NumberInput label="Bottom Text Size" value={config.sourceFontSize} onChange={(v) => update({ sourceFontSize: v ?? 11 })} min={8} max={24} />
                        <NumberInput label="Bottom Row Padding Top" value={config.sourcePaddingTop} onChange={(v) => update({ sourcePaddingTop: v ?? 6 })} min={0} max={80} />
                        <NumberInput label="Bottom Row Padding Bottom" value={config.sourcePaddingBottom} onChange={(v) => update({ sourcePaddingBottom: v ?? 20 })} min={0} max={80} />
                    </div>
                )}

                {activeSection === "saved" && (
                    <div className="space-y-5">
                        {/* Saved styles picker */}
                        <div>
                            <label className="text-xs font-semibold text-slate-500 uppercase tracking-wide mb-2 block">
                                Saved Styles
                            </label>
                            {savedStyles.length === 0 ? (
                                <p className="text-xs text-slate-400 italic">No saved styles yet. Save your current settings below.</p>
                            ) : (
                                <>
                                    <select
                                        value={selectedStyleId}
                                        onChange={(e) => { setSelectedStyleId(e.target.value); setDeleteConfirm(false); }}
                                        className="w-full rounded border border-slate-200 bg-white px-2 py-1.5 text-xs text-slate-700 focus:outline-none focus:ring-1 focus:ring-primary mb-2"
                                    >
                                        <option value="">— Select a style —</option>
                                        {savedStyles.map((s) => (
                                            <option key={s.id} value={s.id}>{s.name}</option>
                                        ))}
                                    </select>
                                    <div className="flex gap-2">
                                        <button
                                            onClick={handleApplyStyle}
                                            disabled={!selectedStyleId}
                                            aria-label="Apply selected style"
                                            className="flex-1 py-1.5 text-xs font-bold rounded border border-primary text-primary hover:bg-primary/10 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
                                        >
                                            Apply
                                        </button>
                                        <button
                                            onClick={handleDeleteStyle}
                                            disabled={!selectedStyleId || isDeleting}
                                            aria-label="Delete selected style"
                                            className={`flex-1 py-1.5 text-xs font-bold rounded border transition-colors disabled:opacity-40 disabled:cursor-not-allowed ${deleteConfirm ? "border-red-500 bg-red-50 text-red-600" : "border-slate-200 text-slate-500 hover:border-red-300 hover:text-red-500"}`}
                                        >
                                            {deleteConfirm ? "Confirm Delete" : "Delete"}
                                        </button>
                                    </div>
                                </>
                            )}
                        </div>

                        {/* Divider */}
                        <div className="border-t border-slate-100" />

                        {/* Save current as */}
                        <div>
                            <label className="text-xs font-semibold text-slate-500 uppercase tracking-wide mb-2 block">
                                Save Current As
                            </label>
                            <input
                                type="text"
                                value={newStyleName}
                                onChange={(e) => { setNewStyleName(e.target.value); setStylesError(null); }}
                                placeholder="Style name..."
                                className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm text-slate-800 focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary mb-2"
                                onKeyDown={(e) => { if (e.key === "Enter") handleSaveStyle(); }}
                            />
                            {stylesError && <p className="text-xs text-red-500 mb-2">{stylesError}</p>}
                            <button
                                onClick={handleSaveStyle}
                                disabled={!newStyleName.trim() || isSaving}
                                className="w-full py-2 text-xs font-bold rounded bg-primary text-white hover:bg-primary/90 disabled:opacity-40 disabled:cursor-not-allowed transition-colors flex items-center justify-center gap-1"
                            >
                                <span className="material-icons-round text-sm">save</span>
                                {isSaving ? "Saving…" : "Save Style"}
                            </button>
                        </div>
                    </div>
                )}
            </div>

            {/* Reset */}
            <div className="border-t border-slate-100 p-3">
                <button onClick={() => onChange(DEFAULT_CHART_CONFIG)} className="w-full py-2 text-xs font-bold text-slate-500 hover:text-primary uppercase tracking-wide transition-colors flex items-center justify-center gap-1">
                    <span className="material-icons-round text-sm">restart_alt</span>
                    Reset All
                </button>
            </div>
        </div>
    );
}
