"use client";

import Link from "next/link";
import { useState, useEffect, useRef, useCallback } from "react";
import {
    ResponsiveContainer,
    BarChart,
    Bar,
    LineChart,
    Line,
    XAxis,
    YAxis,
    CartesianGrid,
    Tooltip,
    LabelList,
} from "recharts";
import {
    ChartCustomizer,
    DEFAULT_CHART_CONFIG,
    type ChartConfig,
} from "@/components/explorer/ChartCustomizer";

// --- Sample data for demonstration ---
const SAMPLE_DATA = [
    { label: "Jan", domestic: 62500, exports: 38400 },
    { label: "Feb", domestic: 45200, exports: 31800 },
    { label: "Mar", domestic: 71300, exports: 42100 },
    { label: "Apr", domestic: 58900, exports: 35600 },
    { label: "May", domestic: 67100, exports: 44200 },
    { label: "Jun", domestic: 53400, exports: 29800 },
];

export default function DataExplorerPage() {
    const [mounted, setMounted] = useState(false);
    const [chartConfig, setChartConfig] = useState<ChartConfig>(DEFAULT_CHART_CONFIG);
    const [chartData, setChartData] = useState<any[]>(SAMPLE_DATA);
    const [showCustomizer, setShowCustomizer] = useState(false);
    const [chartImage, setChartImage] = useState<string | null>(null);
    const [isGenerating, setIsGenerating] = useState(false);
    const [prompt, setPrompt] = useState("");
    const [isLoadingQuery, setIsLoadingQuery] = useState(false);
    const [generatedSql, setGeneratedSql] = useState("");
    const [toast, setToast] = useState<{ type: "success" | "error" | "info"; message: string } | null>(null);
    const chartRef = useRef<HTMLDivElement>(null);
    const toastTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

    useEffect(() => {
        setMounted(true);
    }, []);

    const showToast = useCallback((type: "success" | "error" | "info", message: string) => {
        setToast({ type, message });
        if (toastTimer.current) clearTimeout(toastTimer.current);
        toastTimer.current = setTimeout(() => setToast(null), 3000);
    }, []);

    const handleQuery = async () => {
        if (!prompt.trim()) {
            showToast("error", "Please enter a query first.");
            return;
        }

        setIsLoadingQuery(true);
        showToast("info", "Analyzing query...");

        try {
            const res = await fetch("/api/dashboard/explorer/generate-chart", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ prompt }),
            });

            if (!res.ok) {
                const err = await res.json();
                throw new Error(err.error || "Failed to process query");
            }

            const data = await res.json();

            setChartData(data.data);
            setChartConfig(prev => ({
                ...prev,
                ...data.config,
                title: data.title || prev.title,
                description: data.description || prev.description
            }));
            setGeneratedSql(data.sql);

            showToast("success", "Analysis complete!");

            // Scroll to visualization
            setTimeout(() => {
                chartRef.current?.scrollIntoView({ behavior: 'smooth' });
            }, 500);

        } catch (err) {
            console.error(err);
            showToast("error", err instanceof Error ? err.message : "Failed to run query");
        } finally {
            setIsLoadingQuery(false);
        }
    };

    const generateChart = useCallback(async () => {
        // ... existing implementation ...
        setIsGenerating(true);
        showToast("info", "Generating chart image feature coming soon...");
        setTimeout(() => setIsGenerating(false), 1000);
    }, [showToast]);

    const copyToClipboard = useCallback(async () => {
        if (!chartImage) return;
        try {
            const res = await fetch(chartImage);
            const blob = await res.blob();
            await navigator.clipboard.write([new ClipboardItem({ "image/png": blob })]);
            showToast("success", "Chart copied to clipboard!");
        } catch {
            showToast("error", "Failed to copy. Try downloading instead.");
        }
    }, [chartImage, showToast]);

    const downloadImage = useCallback(() => {
        if (!chartImage) return;
        const a = document.createElement("a");
        a.href = chartImage;
        a.download = `chart-${chartConfig.title.replace(/[^a-z0-9]+/gi, "-").toLowerCase() || "data"}.png`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        showToast("success", "Download started!");
    }, [chartImage, chartConfig.title, showToast]);

    if (!mounted) return null;

    return (
        <div className="font-display text-slate-custom-800 h-full flex overflow-hidden -m-8 -mt-2">
            {/* Main Workflow Area */}
            <div className="flex-1 flex flex-col h-full relative overflow-hidden">
                {/* Toast */}
                {toast && (
                    <div className={`absolute top-4 right-4 z-50 px-4 py-2 rounded-lg border text-xs font-medium shadow-lg transition-all ${toast.type === "success" ? "border-primary/50 bg-primary/10 text-green-800"
                        : toast.type === "error" ? "border-red-300 bg-red-50 text-red-700"
                            : "border-slate-200 bg-white text-slate-700"
                        }`}>
                        {toast.message}
                    </div>
                )}

                {/* Header */}
                <header className="h-16 flex items-center justify-between px-6 border-b border-slate-custom-200 bg-white/80 backdrop-blur-sm z-10">
                    <div className="flex items-center gap-4">
                        <h1 className="font-bold text-slate-custom-900 text-lg">Market Analysis Workflow</h1>
                        <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-slate-custom-100 text-slate-custom-500 uppercase tracking-wide border border-slate-custom-200">Draft</span>
                    </div>
                    <div className="flex items-center gap-3">
                        <button onClick={() => setShowCustomizer((v) => !v)} className={`px-3 py-1.5 text-xs font-bold rounded-full flex items-center gap-1.5 transition-all border ${showCustomizer ? "border-primary bg-primary/10 text-primary" : "border-slate-200 text-slate-500 hover:text-primary hover:border-primary/50"}`}>
                            <span className="material-icons-round text-sm">tune</span>
                            Customize
                        </button>
                        <span className="text-xs text-slate-custom-400 flex items-center gap-1">
                            <span className="material-icons-round text-sm">cloud_done</span> Saved
                        </span>
                        <button className="px-4 py-1.5 bg-primary text-slate-custom-900 text-sm font-bold rounded-full hover:shadow-[0_0_15px_rgba(106,218,27,0.4)] transition-all flex items-center gap-2">
                            <span className="material-icons-round text-sm">rocket_launch</span>
                            Publish
                        </button>
                    </div>
                </header>

                {/* 2-Column Layout */}
                <div className="flex-1 overflow-hidden flex flex-col lg:flex-row">
                    {/* LEFT: Input & Logic */}
                    <div className="w-full lg:w-[450px] bg-slate-custom-50 border-r border-slate-custom-200 flex flex-col overflow-y-auto">
                        {/* Step 1 */}
                        <section className="p-6 border-b border-slate-custom-200 relative group transition-all hover:bg-white">
                            <div className="absolute left-0 top-0 bottom-0 w-1 bg-primary" />
                            <div className="flex items-center gap-2 mb-4">
                                <span className="flex items-center justify-center w-6 h-6 rounded-full bg-primary text-slate-custom-900 text-xs font-bold ring-2 ring-primary/20">1</span>
                                <h3 className="font-bold text-sm text-slate-custom-900 uppercase tracking-wide">Ask Intelligence</h3>
                            </div>
                            <div className="space-y-3">
                                <textarea
                                    value={prompt}
                                    onChange={(e) => setPrompt(e.target.value)}
                                    className="w-full h-32 bg-white border border-slate-custom-300 rounded-lg p-3 text-sm focus:ring-2 focus:ring-primary focus:border-primary transition-all resize-none shadow-sm placeholder-slate-custom-400 text-slate-custom-800"
                                    placeholder="e.g. Compare Tesla Shanghai exports vs domestic sales for Q1 2023..."
                                />
                                <div className="flex items-center justify-between">
                                    <button className="flex items-center gap-2 text-xs font-medium text-slate-custom-600 bg-white border border-slate-custom-200 px-3 py-1.5 rounded-full shadow-sm hover:border-primary/50 transition-all">
                                        <span className="w-2 h-2 rounded-full bg-green-500 shadow-[0_0_5px_rgba(34,197,94,0.6)]" />
                                        Juice-7B (Fast)
                                        <span className="material-icons-round text-sm ml-1">expand_more</span>
                                    </button>
                                    <button
                                        onClick={handleQuery}
                                        disabled={isLoadingQuery}
                                        className="flex items-center gap-1 text-xs font-bold text-primary hover:text-green-700 uppercase tracking-wide transition-colors disabled:opacity-50 disabled:cursor-not-allowed">
                                        {isLoadingQuery ? "Running..." : "Run Query"} <span className={`material-icons-round text-sm ${isLoadingQuery ? "animate-spin" : ""}`}>{isLoadingQuery ? "refresh" : "play_arrow"}</span>
                                    </button>
                                </div>
                            </div>
                        </section>

                        {/* Step 2: Logic Process */}
                        <section className="p-6 flex-1 bg-slate-custom-100/50">
                            <div className="flex items-center gap-2 mb-4 opacity-50">
                                <span className="flex items-center justify-center w-6 h-6 rounded-full bg-slate-custom-200 text-slate-custom-500 text-xs font-bold border border-slate-custom-300">2</span>
                                <h3 className="font-bold text-sm text-slate-custom-500 uppercase tracking-wide">Logic Process</h3>
                            </div>
                            <div className="relative pl-3 border-l-2 border-slate-custom-200 space-y-6 ml-3">
                                <div className="relative">
                                    <span className={`absolute -left-[19px] top-1 w-3 h-3 rounded-full ring-4 ring-slate-custom-50 ${generatedSql ? "bg-green-400" : "bg-slate-300"}`} />
                                    <div className="bg-white p-3 rounded border border-slate-custom-200 shadow-sm">
                                        <div className="flex items-center justify-between text-xs mb-1">
                                            <span className="font-mono text-slate-custom-500">SQL GENERATION</span>
                                            {generatedSql && <span className="text-green-500 font-bold">Success</span>}
                                        </div>
                                        <code className="text-[10px] text-slate-custom-600 font-mono block overflow-hidden whitespace-nowrap text-ellipsis">
                                            {generatedSql || "Waiting for query..."}
                                        </code>
                                    </div>
                                </div>
                                <div className="relative">
                                    <span className="absolute -left-[19px] top-1 w-3 h-3 rounded-full bg-green-400 ring-4 ring-slate-custom-50" />
                                    <div className="bg-white p-3 rounded border border-slate-custom-200 shadow-sm">
                                        <div className="flex items-center justify-between text-xs mb-1">
                                            <span className="font-mono text-slate-custom-500">TRANSFORM</span>
                                            <span className="text-green-500 font-bold flex items-center gap-1"><span className="material-icons-round text-[10px]">check</span> Done</span>
                                        </div>
                                        <div className="text-xs text-slate-custom-700">Aggregated 6 months of data, split by domestic/export.</div>
                                    </div>
                                </div>
                                <div className="relative">
                                    <span className="absolute -left-[19px] top-1 w-3 h-3 rounded-full bg-primary ring-4 ring-primary/20" />
                                    <div className="bg-white p-3 rounded border border-primary/50 shadow-sm">
                                        <div className="flex items-center justify-between text-xs mb-1">
                                            <span className="font-mono text-primary font-bold">CHART READY</span>
                                            <span className="text-primary font-bold flex items-center gap-1"><span className="material-icons-round text-[10px]">check_circle</span> Complete</span>
                                        </div>
                                        <div className="text-xs text-slate-custom-600">6 data points rendered • {chartConfig.chartType} chart</div>
                                    </div>
                                </div>
                            </div>
                        </section>
                    </div>

                    {/* RIGHT: Visualization */}
                    <div className="flex-1 bg-slate-custom-100 p-6 overflow-y-auto flex flex-col gap-6">
                        {/* Step 3: Visualization */}
                        <section ref={chartRef} className="bg-white rounded-2xl overflow-hidden relative border-l-4 border-l-primary shadow-sm border border-slate-custom-200">
                            <div className="absolute top-0 left-0 w-full h-[2px] bg-gradient-to-r from-primary to-transparent opacity-30" />
                            <div className="p-5 border-b border-slate-custom-100 flex justify-between items-center bg-slate-custom-50/50">
                                <div className="flex items-center gap-2">
                                    <span className="flex items-center justify-center w-6 h-6 rounded-full bg-primary/20 text-primary text-xs font-bold ring-1 ring-primary/20">3</span>
                                    <h3 className="font-bold text-sm text-slate-custom-900 tracking-wide">Visualization &amp; Data</h3>
                                </div>
                                <div className="flex items-center gap-3 text-xs text-slate-custom-500 font-medium">
                                    <span className="flex items-center gap-1 bg-white border border-slate-custom-200 px-2 py-1 rounded shadow-sm">
                                        <span className="material-icons-round text-sm text-primary">table_rows</span>
                                        {SAMPLE_DATA.length} rows
                                    </span>
                                    <span className="flex items-center gap-1 bg-white border border-slate-custom-200 px-2 py-1 rounded shadow-sm">
                                        <span className="material-icons-round text-sm text-primary">timer</span>
                                        38ms
                                    </span>
                                </div>
                            </div>

                            <div className="p-8 min-h-[420px]" style={{ backgroundColor: chartConfig.backgroundColor }}>
                                <div className="flex justify-between items-center mb-6">
                                    <h4 className="font-bold" style={{ color: chartConfig.titleColor, fontSize: `${chartConfig.titleSize}px` }}>
                                        {chartConfig.title || "Data Results"}
                                    </h4>
                                    <div className="flex bg-slate-custom-100 rounded-lg p-1 border border-slate-custom-200">
                                        {([
                                            { value: "bar" as const, label: "Bar", icon: "bar_chart" },
                                            { value: "line" as const, label: "Line", icon: "show_chart" },
                                            { value: "horizontalBar" as const, label: "H-Bar", icon: "align_horizontal_left" },
                                        ] as const).map((ct) => (
                                            <button key={ct.value} onClick={() => setChartConfig((c) => ({ ...c, chartType: ct.value }))} className={`px-3 py-1 rounded-md text-xs font-medium flex items-center gap-1 transition-colors ${chartConfig.chartType === ct.value ? "bg-white text-primary shadow-sm border border-slate-custom-200 font-bold" : "text-slate-custom-500 hover:text-slate-custom-900"}`}>
                                                <span className="material-icons-round text-sm">{ct.icon}</span>
                                                {ct.label}
                                            </button>
                                        ))}
                                    </div>
                                </div>

                                {/* Recharts */}
                                <div className="h-72">
                                    <ResponsiveContainer width="100%" height="100%">
                                        {chartConfig.chartType === "line" ? (
                                            <LineChart data={chartData} margin={{ top: 10, right: 20, bottom: 20, left: 20 }}>
                                                {chartConfig.showGrid && <CartesianGrid stroke="#e5e7eb" strokeDasharray="3 3" />}
                                                <XAxis dataKey="label" tick={{ fontSize: chartConfig.xAxisFontSize, fill: chartConfig.xAxisFontColor }} />
                                                <YAxis tick={{ fontSize: chartConfig.yAxisFontSize, fill: chartConfig.yAxisFontColor }} />
                                                <Tooltip />
                                                <Line type="monotone" dataKey="value" stroke={chartConfig.barColor} strokeWidth={2.5} dot={{ r: 4, fill: chartConfig.barColor }} activeDot={{ r: 6 }} />
                                            </LineChart>
                                        ) : chartConfig.chartType === "horizontalBar" ? (
                                            <BarChart data={chartData} layout="vertical" margin={{ top: 10, right: 20, bottom: 20, left: 40 }}>
                                                {chartConfig.showGrid && <CartesianGrid stroke="#e5e7eb" strokeDasharray="3 3" />}
                                                <XAxis type="number" tick={{ fontSize: chartConfig.xAxisFontSize, fill: chartConfig.xAxisFontColor }} />
                                                <YAxis type="category" dataKey="label" width={40} tick={{ fontSize: chartConfig.yAxisFontSize, fill: chartConfig.yAxisFontColor }} />
                                                <Tooltip />
                                                <Bar dataKey="value" fill={chartConfig.barColor} radius={[0, 6, 6, 0]} barSize={chartConfig.barWidth}>
                                                    {chartConfig.showValues && <LabelList dataKey="value" position="right" fill={chartConfig.fontColor} fontSize={11} />}
                                                </Bar>
                                            </BarChart>
                                        ) : (
                                            <BarChart data={chartData} margin={{ top: 10, right: 20, bottom: 20, left: 20 }}>
                                                {chartConfig.showGrid && <CartesianGrid stroke="#e5e7eb" strokeDasharray="3 3" />}
                                                <XAxis dataKey="label" tick={{ fontSize: chartConfig.xAxisFontSize, fill: chartConfig.xAxisFontColor }} />
                                                <YAxis tick={{ fontSize: chartConfig.yAxisFontSize, fill: chartConfig.yAxisFontColor }} />
                                                <Tooltip />
                                                <Bar dataKey="value" fill={chartConfig.barColor} radius={[6, 6, 0, 0]} barSize={chartConfig.barWidth}>
                                                    {chartConfig.showValues && <LabelList dataKey="value" position="top" fill={chartConfig.fontColor} fontSize={11} />}
                                                </Bar>
                                            </BarChart>
                                        )}
                                    </ResponsiveContainer>
                                </div>

                                {chartConfig.sourceText && (
                                    <div className="text-right italic mt-2" style={{ color: chartConfig.sourceColor, fontSize: `${chartConfig.sourceFontSize}px` }}>
                                        {chartConfig.sourceText}
                                    </div>
                                )}
                            </div>

                            {/* Export Bar */}
                            <div className="px-5 py-3 border-t border-slate-custom-100 bg-slate-custom-50/50 flex items-center justify-between">
                                <div className="flex items-center gap-2 text-xs text-slate-custom-500">
                                    <span className="material-icons-round text-sm">info</span>
                                    Generate a high-res image for export
                                </div>
                                <button onClick={generateChart} disabled={isGenerating} className="px-4 py-1.5 bg-primary text-slate-custom-900 text-xs font-bold rounded-full hover:shadow-[0_0_15px_rgba(106,218,27,0.4)] transition-all flex items-center gap-1.5 disabled:opacity-50">
                                    <span className={`material-icons-round text-sm ${isGenerating ? "animate-spin" : ""}`}>{isGenerating ? "refresh" : "image"}</span>
                                    {isGenerating ? "Generating..." : "Generate Image"}
                                </button>
                            </div>

                            {/* Generated Image Preview */}
                            {chartImage && (
                                <div className="px-5 py-4 border-t border-slate-custom-100 bg-white">
                                    <div className="flex items-center justify-between mb-3">
                                        <span className="text-xs font-bold text-slate-custom-700 uppercase tracking-wide flex items-center gap-1">
                                            <span className="material-icons-round text-sm text-primary">check_circle</span>
                                            Generated Image
                                        </span>
                                        <button onClick={() => setChartImage(null)} className="text-xs text-slate-custom-400 hover:text-slate-custom-600 transition-colors">
                                            <span className="material-icons-round text-sm">close</span>
                                        </button>
                                    </div>
                                    {/* eslint-disable-next-line @next/next/no-img-element */}
                                    <img src={chartImage} alt="Generated chart" className="w-full max-w-xl mx-auto rounded-lg border border-slate-custom-200 shadow-md" />
                                    <div className="flex justify-end gap-2 mt-3">
                                        <button onClick={copyToClipboard} className="px-4 py-2 border border-slate-custom-200 rounded-lg text-xs font-bold text-slate-custom-600 hover:border-primary hover:text-primary transition-all flex items-center gap-2">
                                            <span className="material-icons-round text-sm">content_copy</span>
                                            Copy to Clipboard
                                        </button>
                                        <button onClick={downloadImage} className="px-4 py-2 border border-slate-custom-200 rounded-lg text-xs font-bold text-slate-custom-600 hover:border-primary hover:text-primary transition-all flex items-center gap-2">
                                            <span className="material-icons-round text-sm">image</span>
                                            Download PNG
                                        </button>
                                        <button onClick={downloadImage} className="px-4 py-2 bg-slate-custom-900 text-white rounded-lg text-xs font-bold hover:bg-slate-custom-800 transition-all flex items-center gap-2 shadow-lg shadow-slate-custom-900/20">
                                            <span className="material-icons-round text-sm">share</span>
                                            Share Link
                                        </button>
                                    </div>
                                </div>
                            )}
                        </section>

                        {/* Step 4: Analyst Composer */}
                        <section className="bg-white rounded-2xl overflow-hidden border border-slate-custom-200 shadow-sm">
                            <div className="p-5 border-b border-slate-custom-100 flex justify-between items-center bg-slate-custom-50/50">
                                <div className="flex items-center gap-2">
                                    <span className="flex items-center justify-center w-6 h-6 rounded-full bg-primary/20 text-primary text-xs font-bold ring-1 ring-primary/20">4</span>
                                    <h3 className="font-bold text-sm text-slate-custom-900 uppercase tracking-wide">Analyst Composer</h3>
                                </div>
                                <div className="flex gap-2">
                                    <button className="text-xs font-bold text-slate-custom-500 hover:text-primary transition-colors flex items-center gap-1">
                                        <span className="material-icons-round text-sm">auto_awesome</span> Generate Draft
                                    </button>
                                    <button className="text-xs font-bold text-slate-custom-500 hover:text-primary transition-colors flex items-center gap-1">
                                        <span className="material-icons-round text-sm">content_copy</span> Copy
                                    </button>
                                </div>
                            </div>
                            <div className="p-6">
                                <div className="bg-slate-custom-50 p-4 rounded-lg border border-slate-custom-100 text-sm text-slate-custom-600 leading-relaxed font-serif">
                                    <p className="mb-2">
                                        <strong className="text-slate-custom-900">Headline:</strong> Tesla&apos;s Shanghai Export Strategy Shifts in Q1
                                    </p>
                                    <p>
                                        Data from Q1 2024 reveals a significant pivot in Tesla&apos;s export strategy from Giga Shanghai. While overall production remained steady, the allocation between domestic sales and exports saw a 14% swing towards...{" "}
                                        <span className="text-primary cursor-pointer hover:underline">[Read more]</span>
                                    </p>
                                </div>
                                <div className="flex justify-end gap-3 mt-4">
                                    <button className="px-4 py-2 border border-slate-custom-200 rounded-lg text-xs font-bold text-slate-custom-600 hover:border-primary hover:text-primary transition-all flex items-center gap-2">
                                        <span className="material-icons-round text-sm">image</span> PNG
                                    </button>
                                    <button className="px-4 py-2 border border-slate-custom-200 rounded-lg text-xs font-bold text-slate-custom-600 hover:border-primary hover:text-primary transition-all flex items-center gap-2">
                                        <span className="material-icons-round text-sm">description</span> PDF
                                    </button>
                                    <button className="px-4 py-2 bg-slate-custom-900 text-white rounded-lg text-xs font-bold hover:bg-slate-custom-800 transition-all flex items-center gap-2 shadow-lg shadow-slate-custom-900/20">
                                        <span className="material-icons-round text-sm">share</span> Share Link
                                    </button>
                                </div>
                            </div>
                        </section>
                    </div>

                    {/* Chart Customizer Panel */}
                    <ChartCustomizer config={chartConfig} onChange={setChartConfig} isOpen={showCustomizer} onToggle={() => setShowCustomizer(false)} />
                </div>
            </div>
        </div>
    );
}
