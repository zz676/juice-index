"use client";

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

type ChartPoint = { label: string; value: number };
type QueryRow = Record<string, unknown>;

type ToastType = "success" | "error" | "info";

export default function DataExplorerPage() {
  const [mounted, setMounted] = useState(false);
  const [chartConfig, setChartConfig] =
    useState<ChartConfig>(DEFAULT_CHART_CONFIG);
  const [chartData, setChartData] = useState<ChartPoint[]>([]);
  const [rawData, setRawData] = useState<QueryRow[]>([]);
  const [showCustomizer, setShowCustomizer] = useState(false);
  const [chartImage, setChartImage] = useState<string | null>(null);
  const [isGeneratingImage, setIsGeneratingImage] = useState(false);
  const [prompt, setPrompt] = useState("");
  const [isGeneratingQueryPlan, setIsGeneratingQueryPlan] = useState(false);
  const [isRunningQuery, setIsRunningQuery] = useState(false);
  const [queryJsonText, setQueryJsonText] = useState("");
  const [generatedSql, setGeneratedSql] = useState("");
  const [tableName, setTableName] = useState("");
  const [xField, setXField] = useState("");
  const [yField, setYField] = useState("");
  const [rowCount, setRowCount] = useState(0);
  const [executionTimeMs, setExecutionTimeMs] = useState<number | null>(null);
  const [analysisExplanation, setAnalysisExplanation] = useState("");
  const [postDraft, setPostDraft] = useState("");
  const [isGeneratingPost, setIsGeneratingPost] = useState(false);
  const [toast, setToast] = useState<{ type: ToastType; message: string } | null>(
    null
  );

  const chartRef = useRef<HTMLDivElement>(null);
  const toastTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    setMounted(true);
    return () => {
      if (toastTimer.current) clearTimeout(toastTimer.current);
    };
  }, []);

  const showToast = useCallback((type: ToastType, message: string) => {
    setToast({ type, message });
    if (toastTimer.current) clearTimeout(toastTimer.current);
    toastTimer.current = setTimeout(() => setToast(null), 3200);
  }, []);

  const applyQueryExecutionResult = useCallback(
    (data: Record<string, unknown>) => {
      const previewData = Array.isArray(data.previewData)
        ? (data.previewData as Array<Record<string, unknown>>)
            .map((point) => ({
              label: String(point.label ?? ""),
              value: Number(point.value ?? 0),
            }))
            .filter((point) => point.label.trim().length > 0)
        : [];

      setChartData(previewData);
      setRawData(Array.isArray(data.data) ? (data.data as QueryRow[]) : []);
      setGeneratedSql(typeof data.sql === "string" ? data.sql : "");
      setTableName(typeof data.table === "string" ? data.table : "");
      setXField(typeof data.xField === "string" ? data.xField : "");
      setYField(typeof data.yField === "string" ? data.yField : "");
      setRowCount(
        typeof data.rowCount === "number" ? data.rowCount : previewData.length
      );
      setExecutionTimeMs(
        typeof data.executionTimeMs === "number" ? data.executionTimeMs : null
      );
      setChartImage(null);
      setPostDraft("");
      setQueryJsonText((prev) =>
        typeof data.queryJson === "string" ? data.queryJson : prev
      );

      setChartConfig((prev) => ({
        ...prev,
        chartType:
          data.chartType === "bar" ||
          data.chartType === "line" ||
          data.chartType === "horizontalBar"
            ? data.chartType
            : prev.chartType,
        title:
          typeof data.chartTitle === "string" && data.chartTitle.trim()
            ? data.chartTitle
            : prev.title,
      }));

      showToast(
        "success",
        previewData.length
          ? "Query executed successfully."
          : "Query ran successfully but returned no chartable rows."
      );

      setTimeout(() => {
        chartRef.current?.scrollIntoView({ behavior: "smooth" });
      }, 350);
    },
    [showToast]
  );

  const generateRunnableQuery = async () => {
    if (!prompt.trim()) {
      showToast("error", "Please enter a query first.");
      return;
    }

    setIsGeneratingQueryPlan(true);
    showToast("info", "Converting question to runnable query...");

    try {
      const res = await fetch("/api/dashboard/explorer/generate-chart", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ prompt, previewOnly: true }),
      });

      const data = (await res.json().catch(() => ({}))) as Record<
        string,
        unknown
      >;

      if (!res.ok) {
        throw new Error(
          (typeof data.message === "string" && data.message) ||
            (typeof data.error === "string" && data.error) ||
            "Failed to process query"
        );
      }

      const nextSql =
        typeof data.sql === "string" && data.sql.trim().length > 0
          ? data.sql
          : "-- SQL preview unavailable for this query.";
      const nextQueryJson =
        typeof data.queryJson === "string" && data.queryJson.trim().length > 0
          ? data.queryJson
          : data.query && typeof data.query === "object"
          ? JSON.stringify(data.query, null, 2)
          : "{}";

      setGeneratedSql(nextSql);
      setTableName(typeof data.table === "string" ? data.table : "");
      setQueryJsonText(nextQueryJson);
      setAnalysisExplanation(
        typeof data.explanation === "string" ? data.explanation : ""
      );
      setChartData([]);
      setRawData([]);
      setXField("");
      setYField("");
      setRowCount(0);
      setExecutionTimeMs(null);
      setChartImage(null);
      setPostDraft("");

      setChartConfig((prev) => ({
        ...prev,
        chartType:
          data.chartType === "bar" ||
          data.chartType === "line" ||
          data.chartType === "horizontalBar"
            ? data.chartType
            : prev.chartType,
        title:
          typeof data.chartTitle === "string" && data.chartTitle.trim()
            ? data.chartTitle
            : prev.title,
        description:
          typeof data.explanation === "string" && data.explanation.trim()
            ? data.explanation
            : prev.description,
      }));

      showToast("success", "Runnable query generated. Review and click Run Query.");
    } catch (err) {
      console.error(err);
      showToast(
        "error",
        err instanceof Error ? err.message : "Failed to generate query"
      );
    } finally {
      setIsGeneratingQueryPlan(false);
    }
  };

  const runGeneratedQuery = async () => {
    if (!tableName) {
      showToast("error", "Generate a query first.");
      return;
    }

    let parsedQuery: Record<string, unknown>;
    try {
      parsedQuery = JSON.parse(queryJsonText) as Record<string, unknown>;
      if (!parsedQuery || typeof parsedQuery !== "object" || Array.isArray(parsedQuery)) {
        throw new Error("Query JSON must be an object.");
      }
    } catch (error) {
      showToast(
        "error",
        error instanceof Error ? error.message : "Invalid query JSON."
      );
      return;
    }

    setIsRunningQuery(true);
    showToast("info", "Running query...");

    try {
      const res = await fetch("/api/dashboard/explorer/generate-chart", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          table: tableName,
          query: parsedQuery,
          chartType: chartConfig.chartType,
          chartTitle: chartConfig.title,
        }),
      });

      const data = (await res.json().catch(() => ({}))) as Record<
        string,
        unknown
      >;

      if (!res.ok) {
        throw new Error(
          (typeof data.message === "string" && data.message) ||
            (typeof data.error === "string" && data.error) ||
            "Failed to run query"
        );
      }

      applyQueryExecutionResult(data);
    } catch (err) {
      console.error(err);
      showToast(
        "error",
        err instanceof Error ? err.message : "Failed to run query"
      );
    } finally {
      setIsRunningQuery(false);
    }
  };

  const generateChartImage = useCallback(async () => {
    if (!chartData.length) {
      showToast("error", "Run a query first to generate chart image.");
      return;
    }

    setIsGeneratingImage(true);
    showToast("info", "Generating chart image...");

    try {
      const res = await fetch("/api/dashboard/explorer/generate-chart", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          data: chartData,
          chartType: chartConfig.chartType,
          title: chartConfig.title,
          chartOptions: {
            backgroundColor: chartConfig.backgroundColor,
            barColor: chartConfig.barColor,
            fontColor: chartConfig.fontColor,
            titleColor: chartConfig.titleColor,
            titleSize: chartConfig.titleSize,
            xAxisFontSize: chartConfig.xAxisFontSize,
            yAxisFontSize: chartConfig.yAxisFontSize,
            xAxisFontColor: chartConfig.xAxisFontColor,
            yAxisFontColor: chartConfig.yAxisFontColor,
            sourceText: chartConfig.sourceText,
            sourceColor: chartConfig.sourceColor,
            sourceFontSize: chartConfig.sourceFontSize,
            barWidth: chartConfig.barWidth,
            showValues: chartConfig.showValues,
            showGrid: chartConfig.showGrid,
          },
        }),
      });

      const result = (await res.json().catch(() => ({}))) as Record<
        string,
        unknown
      >;

      if (!res.ok) {
        throw new Error(
          (typeof result.message === "string" && result.message) ||
            (typeof result.error === "string" && result.error) ||
            "Failed to generate chart image"
        );
      }

      const image =
        typeof result.chartImageBase64 === "string"
          ? result.chartImageBase64
          : "";

      if (!image || image.length < 100) {
        throw new Error("Chart image generation failed.");
      }

      setChartImage(image);
      showToast("success", "Chart image ready!");
    } catch (err) {
      console.error(err);
      showToast(
        "error",
        err instanceof Error ? err.message : "Chart generation failed"
      );
    } finally {
      setIsGeneratingImage(false);
    }
  }, [chartConfig, chartData, showToast]);

  const generateDraft = useCallback(async () => {
    if (!prompt.trim()) {
      showToast("error", "Run a query first before generating a draft.");
      return;
    }

    setIsGeneratingPost(true);
    showToast("info", "Generating analyst draft...");

    try {
      const res = await fetch("/api/dashboard/explorer/generate-post", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          question: prompt,
          sql: generatedSql,
          chartTitle: chartConfig.title,
          chartType: chartConfig.chartType,
          data: rawData.slice(0, 60),
        }),
      });

      const data = (await res.json().catch(() => ({}))) as Record<
        string,
        unknown
      >;

      if (!res.ok) {
        throw new Error(
          (typeof data.message === "string" && data.message) ||
            (typeof data.error === "string" && data.error) ||
            "Failed to generate draft"
        );
      }

      const content = typeof data.content === "string" ? data.content.trim() : "";
      if (!content) {
        throw new Error("Draft generation returned empty content.");
      }

      setPostDraft(content);
      showToast("success", "Draft generated.");
    } catch (err) {
      console.error(err);
      showToast(
        "error",
        err instanceof Error ? err.message : "Failed to generate draft"
      );
    } finally {
      setIsGeneratingPost(false);
    }
  }, [chartConfig.chartType, chartConfig.title, generatedSql, prompt, rawData, showToast]);

  const copyDraft = useCallback(async () => {
    if (!postDraft) return;

    try {
      await navigator.clipboard.writeText(postDraft);
      showToast("success", "Draft copied.");
    } catch {
      showToast("error", "Failed to copy draft.");
    }
  }, [postDraft, showToast]);

  const copySql = useCallback(async () => {
    if (!generatedSql) return;
    try {
      await navigator.clipboard.writeText(generatedSql);
      showToast("success", "SQL copied.");
    } catch {
      showToast("error", "Failed to copy SQL.");
    }
  }, [generatedSql, showToast]);

  const copyChartToClipboard = useCallback(async () => {
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
    a.download = `chart-${
      chartConfig.title.replace(/[^a-z0-9]+/gi, "-").toLowerCase() || "data"
    }.png`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    showToast("success", "Download started!");
  }, [chartImage, chartConfig.title, showToast]);

  if (!mounted) return null;

  const hasChartData = chartData.length > 0;

  return (
    <div className="font-display text-slate-custom-800 h-full flex overflow-hidden -m-8 -mt-2">
      <div className="flex-1 flex flex-col h-full relative overflow-hidden">
        {toast && (
          <div
            className={`absolute top-4 right-4 z-50 px-4 py-2 rounded-lg border text-xs font-medium shadow-lg transition-all ${
              toast.type === "success"
                ? "border-primary/50 bg-primary/10 text-green-800"
                : toast.type === "error"
                ? "border-red-300 bg-red-50 text-red-700"
                : "border-slate-200 bg-white text-slate-700"
            }`}
          >
            {toast.message}
          </div>
        )}

        <header className="h-16 flex items-center justify-between px-6 border-b border-slate-custom-200 bg-white/80 backdrop-blur-sm z-10">
          <div className="flex items-center gap-4">
            <h1 className="font-bold text-slate-custom-900 text-lg">
              Market Analysis Workflow
            </h1>
            <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-slate-custom-100 text-slate-custom-500 uppercase tracking-wide border border-slate-custom-200">
              Draft
            </span>
          </div>
          <div className="flex items-center gap-3">
            <button
              onClick={() => setShowCustomizer((v) => !v)}
              className={`px-3 py-1.5 text-xs font-bold rounded-full flex items-center gap-1.5 transition-all border ${
                showCustomizer
                  ? "border-primary bg-primary/10 text-primary"
                  : "border-slate-200 text-slate-500 hover:text-primary hover:border-primary/50"
              }`}
            >
              <span className="material-icons-round text-sm">tune</span>
              Customize
            </button>
            <span className="text-xs text-slate-custom-400 flex items-center gap-1">
              <span className="material-icons-round text-sm">cloud_done</span> Saved
            </span>
            <button
              className="px-4 py-1.5 bg-primary text-slate-custom-900 text-sm font-bold rounded-full hover:shadow-[0_0_15px_rgba(106,218,27,0.4)] transition-all flex items-center gap-2"
              onClick={() => showToast("info", "Publish workflow will be wired next.")}
            >
              <span className="material-icons-round text-sm">rocket_launch</span>
              Publish
            </button>
          </div>
        </header>

        <div className="flex-1 overflow-hidden flex flex-col lg:flex-row">
          <div className="w-full lg:w-[450px] bg-slate-custom-50 border-r border-slate-custom-200 flex flex-col overflow-y-auto">
            <section className="p-6 border-b border-slate-custom-200 relative group transition-all hover:bg-white">
              <div className="absolute left-0 top-0 bottom-0 w-1 bg-primary" />
              <div className="flex items-center gap-2 mb-4">
                <span className="flex items-center justify-center w-6 h-6 rounded-full bg-primary text-slate-custom-900 text-xs font-bold ring-2 ring-primary/20">
                  1
                </span>
                <h3 className="font-bold text-sm text-slate-custom-900 uppercase tracking-wide">
                  Ask Intelligence
                </h3>
              </div>
              <div className="space-y-3">
                <textarea
                  value={prompt}
                  onChange={(e) => setPrompt(e.target.value)}
                  className="w-full h-32 bg-white border border-slate-custom-300 rounded-lg p-3 text-sm focus:ring-2 focus:ring-primary focus:border-primary transition-all resize-none shadow-sm placeholder-slate-custom-400 text-slate-custom-800"
                  placeholder="e.g. Compare Tesla Shanghai exports vs domestic sales for Q1 2024..."
                />
                <div className="flex items-center justify-between">
                  <button className="flex items-center gap-2 text-xs font-medium text-slate-custom-600 bg-white border border-slate-custom-200 px-3 py-1.5 rounded-full shadow-sm hover:border-primary/50 transition-all">
                    <span className="w-2 h-2 rounded-full bg-green-500 shadow-[0_0_5px_rgba(34,197,94,0.6)]" />
                    Juice-7B (Fast)
                    <span className="material-icons-round text-sm ml-1">
                      expand_more
                    </span>
                  </button>
                  <button
                    onClick={generateRunnableQuery}
                    disabled={isGeneratingQueryPlan}
                    className="flex items-center gap-1 text-xs font-bold text-primary hover:text-green-700 uppercase tracking-wide transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {isGeneratingQueryPlan ? "Generating..." : "Generate Query"}{" "}
                    <span
                      className={`material-icons-round text-sm ${
                        isGeneratingQueryPlan ? "animate-spin" : ""
                      }`}
                    >
                      {isGeneratingQueryPlan ? "refresh" : "auto_awesome"}
                    </span>
                  </button>
                </div>
              </div>
            </section>

            <section className="p-6 flex-1 bg-slate-custom-100/50">
              <div className="flex items-center gap-2 mb-4">
                <span
                  className={`flex items-center justify-center w-6 h-6 rounded-full text-xs font-bold border ${
                    generatedSql
                      ? "bg-primary text-slate-custom-900 border-primary/40"
                      : "bg-slate-custom-200 text-slate-custom-500 border-slate-custom-300"
                  }`}
                >
                  2
                </span>
                <h3
                  className={`font-bold text-sm uppercase tracking-wide ${
                    generatedSql ? "text-slate-custom-900" : "text-slate-custom-500"
                  }`}
                >
                  Review / Edit Query
                </h3>
              </div>

              <div className="bg-white rounded-xl border border-slate-custom-200 shadow-sm mb-5 overflow-hidden">
                <div className="px-3 py-2 border-b border-slate-custom-100 flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span className="font-semibold text-xs text-slate-custom-700">
                      Generated Query
                    </span>
                    {tableName && (
                      <span className="px-2 py-0.5 rounded bg-primary/15 text-primary text-[10px] font-bold">
                        {tableName}
                      </span>
                    )}
                  </div>
                  <div className="flex items-center gap-2">
                    <button
                      onClick={copySql}
                      disabled={!generatedSql}
                      className="px-2.5 py-1 rounded border border-slate-custom-200 text-[10px] font-bold text-slate-custom-600 hover:text-primary hover:border-primary/40 disabled:opacity-40"
                    >
                      Copy SQL
                    </button>
                    <button
                      onClick={runGeneratedQuery}
                      disabled={isRunningQuery || !tableName || !queryJsonText.trim()}
                      className="px-3 py-1 rounded bg-primary text-slate-custom-900 text-[10px] font-bold hover:shadow-[0_0_10px_rgba(106,218,27,0.45)] disabled:opacity-50"
                    >
                      {isRunningQuery ? "Running..." : "Run Query"}
                    </button>
                  </div>
                </div>
                <div className="px-3 py-2 border-b border-slate-custom-100 text-xs text-slate-custom-600">
                  {analysisExplanation || "Generate a query, review/edit JSON, then run it."}
                </div>
                <div className="p-3 grid grid-cols-1 gap-3">
                  <div>
                    <div className="text-[10px] font-bold uppercase tracking-wider text-slate-custom-400 mb-1">
                      Prisma
                    </div>
                    <textarea
                      value={queryJsonText}
                      onChange={(e) => setQueryJsonText(e.target.value)}
                      placeholder='{"where": {...}, "orderBy": [...], "take": 50}'
                      className="w-full h-28 rounded border border-primary/40 bg-primary/5 px-3 py-2 text-[11px] font-mono text-slate-custom-700 focus:outline-none focus:ring-2 focus:ring-primary/30"
                    />
                  </div>
                  <div>
                    <div className="text-[10px] font-bold uppercase tracking-wider text-slate-custom-400 mb-1">
                      SQL Preview
                    </div>
                    <textarea
                      value={generatedSql || ""}
                      readOnly
                      className="w-full h-24 rounded border border-primary/40 bg-primary/5 px-3 py-2 text-[11px] font-mono text-slate-custom-700"
                    />
                  </div>
                </div>
              </div>

              <div className="flex items-center gap-2 mb-4 opacity-70">
                <span className="flex items-center justify-center w-6 h-6 rounded-full bg-slate-custom-200 text-slate-custom-500 text-xs font-bold border border-slate-custom-300">
                  2.5
                </span>
                <h3 className="font-bold text-sm text-slate-custom-500 uppercase tracking-wide">
                  Logic Process
                </h3>
              </div>

              <div className="relative pl-3 border-l-2 border-slate-custom-200 space-y-6 ml-3">
                <div className="relative">
                  <span
                    className={`absolute -left-[19px] top-1 w-3 h-3 rounded-full ring-4 ring-slate-custom-50 ${
                      generatedSql ? "bg-green-400" : "bg-slate-300"
                    }`}
                  />
                  <div className="bg-white p-3 rounded border border-slate-custom-200 shadow-sm">
                    <div className="flex items-center justify-between text-xs mb-1">
                      <span className="font-mono text-slate-custom-500">
                        {tableName ? `TABLE ${tableName}` : "SQL GENERATION"}
                      </span>
                      {generatedSql && (
                        <span className="text-green-500 font-bold">Success</span>
                      )}
                    </div>
                    <code className="text-[10px] text-slate-custom-600 font-mono block overflow-hidden whitespace-nowrap text-ellipsis">
                      {generatedSql || "Waiting for query..."}
                    </code>
                  </div>
                </div>

                <div className="relative">
                  <span
                    className={`absolute -left-[19px] top-1 w-3 h-3 rounded-full ring-4 ring-slate-custom-50 ${
                      hasChartData ? "bg-green-400" : "bg-slate-300"
                    }`}
                  />
                  <div className="bg-white p-3 rounded border border-slate-custom-200 shadow-sm">
                    <div className="flex items-center justify-between text-xs mb-1">
                      <span className="font-mono text-slate-custom-500">
                        TRANSFORM
                      </span>
                      {hasChartData && (
                        <span className="text-green-500 font-bold flex items-center gap-1">
                          <span className="material-icons-round text-[10px]">check</span>
                          Done
                        </span>
                      )}
                    </div>
                    <div className="text-xs text-slate-custom-700">
                      {hasChartData
                        ? `Mapped ${chartData.length} points (${xField || "x"} → ${yField || "y"})`
                        : "Waiting for result rows..."}
                    </div>
                  </div>
                </div>

                <div className="relative">
                  <span
                    className={`absolute -left-[19px] top-1 w-3 h-3 rounded-full ring-4 ${
                      hasChartData
                        ? "bg-primary ring-primary/20"
                        : "bg-slate-300 ring-slate-custom-50"
                    }`}
                  />
                  <div
                    className={`bg-white p-3 rounded shadow-sm border ${
                      hasChartData
                        ? "border-primary/50"
                        : "border-slate-custom-200"
                    }`}
                  >
                    <div className="flex items-center justify-between text-xs mb-1">
                      <span
                        className={`font-mono font-bold ${
                          hasChartData ? "text-primary" : "text-slate-custom-500"
                        }`}
                      >
                        CHART READY
                      </span>
                      {hasChartData && (
                        <span className="text-primary font-bold flex items-center gap-1">
                          <span className="material-icons-round text-[10px]">
                            check_circle
                          </span>
                          Complete
                        </span>
                      )}
                    </div>
                    <div className="text-xs text-slate-custom-600">
                      {hasChartData
                        ? `${chartData.length} points rendered • ${chartConfig.chartType} chart`
                        : "Run a query to enable chart rendering."}
                    </div>
                    {analysisExplanation && (
                      <div className="text-[11px] text-slate-custom-500 mt-2">
                        {analysisExplanation}
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </section>
          </div>

          <div className="flex-1 bg-slate-custom-100 p-6 overflow-y-auto flex flex-col gap-6">
            <section
              ref={chartRef}
              className="bg-white rounded-2xl overflow-hidden relative border-l-4 border-l-primary shadow-sm border border-slate-custom-200"
            >
              <div className="absolute top-0 left-0 w-full h-[2px] bg-gradient-to-r from-primary to-transparent opacity-30" />
              <div className="p-5 border-b border-slate-custom-100 flex justify-between items-center bg-slate-custom-50/50">
                <div className="flex items-center gap-2">
                  <span className="flex items-center justify-center w-6 h-6 rounded-full bg-primary/20 text-primary text-xs font-bold ring-1 ring-primary/20">
                    3
                  </span>
                  <h3 className="font-bold text-sm text-slate-custom-900 tracking-wide">
                    Visualization &amp; Data
                  </h3>
                </div>
                <div className="flex items-center gap-3 text-xs text-slate-custom-500 font-medium">
                  <span className="flex items-center gap-1 bg-white border border-slate-custom-200 px-2 py-1 rounded shadow-sm">
                    <span className="material-icons-round text-sm text-primary">
                      table_rows
                    </span>
                    {rowCount || chartData.length} rows
                  </span>
                  <span className="flex items-center gap-1 bg-white border border-slate-custom-200 px-2 py-1 rounded shadow-sm">
                    <span className="material-icons-round text-sm text-primary">
                      timer
                    </span>
                    {executionTimeMs !== null ? `${executionTimeMs}ms` : "—"}
                  </span>
                </div>
              </div>

              <div
                className="p-8 min-h-[420px]"
                style={{ backgroundColor: chartConfig.backgroundColor }}
              >
                <div className="flex justify-between items-center mb-6">
                  <h4
                    className="font-bold"
                    style={{
                      color: chartConfig.titleColor,
                      fontSize: `${chartConfig.titleSize}px`,
                    }}
                  >
                    {chartConfig.title || "Data Results"}
                  </h4>

                  <div className="flex bg-slate-custom-100 rounded-lg p-1 border border-slate-custom-200">
                    {([
                      { value: "bar" as const, label: "Bar", icon: "bar_chart" },
                      { value: "line" as const, label: "Line", icon: "show_chart" },
                      {
                        value: "horizontalBar" as const,
                        label: "H-Bar",
                        icon: "align_horizontal_left",
                      },
                    ] as const).map((ct) => (
                      <button
                        key={ct.value}
                        onClick={() =>
                          setChartConfig((c) => ({ ...c, chartType: ct.value }))
                        }
                        className={`px-3 py-1 rounded-md text-xs font-medium flex items-center gap-1 transition-colors ${
                          chartConfig.chartType === ct.value
                            ? "bg-white text-primary shadow-sm border border-slate-custom-200 font-bold"
                            : "text-slate-custom-500 hover:text-slate-custom-900"
                        }`}
                      >
                        <span className="material-icons-round text-sm">
                          {ct.icon}
                        </span>
                        {ct.label}
                      </button>
                    ))}
                  </div>
                </div>

                <div className="h-72">
                  {hasChartData ? (
                    <ResponsiveContainer width="100%" height="100%">
                      {chartConfig.chartType === "line" ? (
                        <LineChart
                          data={chartData}
                          margin={{ top: 10, right: 20, bottom: 20, left: 20 }}
                        >
                          {chartConfig.showGrid && (
                            <CartesianGrid stroke="#e5e7eb" strokeDasharray="3 3" />
                          )}
                          <XAxis
                            dataKey="label"
                            tick={{
                              fontSize: chartConfig.xAxisFontSize,
                              fill: chartConfig.xAxisFontColor,
                            }}
                          />
                          <YAxis
                            tick={{
                              fontSize: chartConfig.yAxisFontSize,
                              fill: chartConfig.yAxisFontColor,
                            }}
                          />
                          <Tooltip />
                          <Line
                            type="monotone"
                            dataKey="value"
                            stroke={chartConfig.barColor}
                            strokeWidth={2.5}
                            dot={{ r: 4, fill: chartConfig.barColor }}
                            activeDot={{ r: 6 }}
                          />
                        </LineChart>
                      ) : chartConfig.chartType === "horizontalBar" ? (
                        <BarChart
                          data={chartData}
                          layout="vertical"
                          margin={{ top: 10, right: 20, bottom: 20, left: 40 }}
                        >
                          {chartConfig.showGrid && (
                            <CartesianGrid stroke="#e5e7eb" strokeDasharray="3 3" />
                          )}
                          <XAxis
                            type="number"
                            tick={{
                              fontSize: chartConfig.xAxisFontSize,
                              fill: chartConfig.xAxisFontColor,
                            }}
                          />
                          <YAxis
                            type="category"
                            dataKey="label"
                            width={40}
                            tick={{
                              fontSize: chartConfig.yAxisFontSize,
                              fill: chartConfig.yAxisFontColor,
                            }}
                          />
                          <Tooltip />
                          <Bar
                            dataKey="value"
                            fill={chartConfig.barColor}
                            radius={[0, 6, 6, 0]}
                            barSize={chartConfig.barWidth}
                          >
                            {chartConfig.showValues && (
                              <LabelList
                                dataKey="value"
                                position="right"
                                fill={chartConfig.fontColor}
                                fontSize={11}
                              />
                            )}
                          </Bar>
                        </BarChart>
                      ) : (
                        <BarChart
                          data={chartData}
                          margin={{ top: 10, right: 20, bottom: 20, left: 20 }}
                        >
                          {chartConfig.showGrid && (
                            <CartesianGrid stroke="#e5e7eb" strokeDasharray="3 3" />
                          )}
                          <XAxis
                            dataKey="label"
                            tick={{
                              fontSize: chartConfig.xAxisFontSize,
                              fill: chartConfig.xAxisFontColor,
                            }}
                          />
                          <YAxis
                            tick={{
                              fontSize: chartConfig.yAxisFontSize,
                              fill: chartConfig.yAxisFontColor,
                            }}
                          />
                          <Tooltip />
                          <Bar
                            dataKey="value"
                            fill={chartConfig.barColor}
                            radius={[6, 6, 0, 0]}
                            barSize={chartConfig.barWidth}
                          >
                            {chartConfig.showValues && (
                              <LabelList
                                dataKey="value"
                                position="top"
                                fill={chartConfig.fontColor}
                                fontSize={11}
                              />
                            )}
                          </Bar>
                        </BarChart>
                      )}
                    </ResponsiveContainer>
                  ) : (
                    <div className="h-full w-full flex items-center justify-center rounded-xl border border-dashed border-slate-custom-300 text-sm text-slate-custom-500 bg-slate-custom-50">
                      Run a query to visualize real data.
                    </div>
                  )}
                </div>

                {chartConfig.sourceText && (
                  <div
                    className="text-right italic mt-2"
                    style={{
                      color: chartConfig.sourceColor,
                      fontSize: `${chartConfig.sourceFontSize}px`,
                    }}
                  >
                    {chartConfig.sourceText}
                  </div>
                )}
              </div>

              <div className="px-5 py-3 border-t border-slate-custom-100 bg-slate-custom-50/50 flex items-center justify-between">
                <div className="flex items-center gap-2 text-xs text-slate-custom-500">
                  <span className="material-icons-round text-sm">info</span>
                  Generate a high-res image for export
                </div>
                <button
                  onClick={generateChartImage}
                  disabled={isGeneratingImage || !hasChartData}
                  className="px-4 py-1.5 bg-primary text-slate-custom-900 text-xs font-bold rounded-full hover:shadow-[0_0_15px_rgba(106,218,27,0.4)] transition-all flex items-center gap-1.5 disabled:opacity-50"
                >
                  <span
                    className={`material-icons-round text-sm ${
                      isGeneratingImage ? "animate-spin" : ""
                    }`}
                  >
                    {isGeneratingImage ? "refresh" : "image"}
                  </span>
                  {isGeneratingImage ? "Generating..." : "Generate Image"}
                </button>
              </div>

              {chartImage && (
                <div className="px-5 py-4 border-t border-slate-custom-100 bg-white">
                  <div className="flex items-center justify-between mb-3">
                    <span className="text-xs font-bold text-slate-custom-700 uppercase tracking-wide flex items-center gap-1">
                      <span className="material-icons-round text-sm text-primary">
                        check_circle
                      </span>
                      Generated Image
                    </span>
                    <button
                      onClick={() => setChartImage(null)}
                      className="text-xs text-slate-custom-400 hover:text-slate-custom-600 transition-colors"
                    >
                      <span className="material-icons-round text-sm">close</span>
                    </button>
                  </div>
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={chartImage}
                    alt="Generated chart"
                    className="w-full max-w-xl mx-auto rounded-lg border border-slate-custom-200 shadow-md"
                  />
                  <div className="flex justify-end gap-2 mt-3">
                    <button
                      onClick={copyChartToClipboard}
                      className="px-4 py-2 border border-slate-custom-200 rounded-lg text-xs font-bold text-slate-custom-600 hover:border-primary hover:text-primary transition-all flex items-center gap-2"
                    >
                      <span className="material-icons-round text-sm">content_copy</span>
                      Copy to Clipboard
                    </button>
                    <button
                      onClick={downloadImage}
                      className="px-4 py-2 border border-slate-custom-200 rounded-lg text-xs font-bold text-slate-custom-600 hover:border-primary hover:text-primary transition-all flex items-center gap-2"
                    >
                      <span className="material-icons-round text-sm">image</span>
                      Download PNG
                    </button>
                    <button
                      onClick={() =>
                        showToast("info", "Share link workflow will be wired next.")
                      }
                      className="px-4 py-2 bg-slate-custom-900 text-white rounded-lg text-xs font-bold hover:bg-slate-custom-800 transition-all flex items-center gap-2 shadow-lg shadow-slate-custom-900/20"
                    >
                      <span className="material-icons-round text-sm">share</span>
                      Share Link
                    </button>
                  </div>
                </div>
              )}
            </section>

            <section className="bg-white rounded-2xl overflow-hidden border border-slate-custom-200 shadow-sm">
              <div className="p-5 border-b border-slate-custom-100 flex justify-between items-center bg-slate-custom-50/50">
                <div className="flex items-center gap-2">
                  <span className="flex items-center justify-center w-6 h-6 rounded-full bg-primary/20 text-primary text-xs font-bold ring-1 ring-primary/20">
                    4
                  </span>
                  <h3 className="font-bold text-sm text-slate-custom-900 uppercase tracking-wide">
                    Analyst Composer
                  </h3>
                </div>
                <div className="flex gap-2">
                  <button
                    onClick={generateDraft}
                    disabled={isGeneratingPost || !prompt.trim()}
                    className="text-xs font-bold text-slate-custom-500 hover:text-primary transition-colors flex items-center gap-1 disabled:opacity-50"
                  >
                    <span
                      className={`material-icons-round text-sm ${
                        isGeneratingPost ? "animate-spin" : ""
                      }`}
                    >
                      {isGeneratingPost ? "refresh" : "auto_awesome"}
                    </span>
                    {isGeneratingPost ? "Generating..." : "Generate Draft"}
                  </button>
                  <button
                    onClick={copyDraft}
                    disabled={!postDraft}
                    className="text-xs font-bold text-slate-custom-500 hover:text-primary transition-colors flex items-center gap-1 disabled:opacity-50"
                  >
                    <span className="material-icons-round text-sm">content_copy</span>
                    Copy
                  </button>
                </div>
              </div>
              <div className="p-6">
                <div className="bg-slate-custom-50 p-4 rounded-lg border border-slate-custom-100 text-sm text-slate-custom-600 leading-relaxed font-serif min-h-[120px] whitespace-pre-wrap">
                  {postDraft ||
                    "Generate a draft to turn your data result into a publish-ready analyst summary."}
                </div>
                <div className="flex justify-end gap-3 mt-4">
                  <button
                    onClick={() => showToast("info", "PNG export is available in Step 3 above.")}
                    className="px-4 py-2 border border-slate-custom-200 rounded-lg text-xs font-bold text-slate-custom-600 hover:border-primary hover:text-primary transition-all flex items-center gap-2"
                  >
                    <span className="material-icons-round text-sm">image</span> PNG
                  </button>
                  <button
                    onClick={() => showToast("info", "PDF export will be wired next.")}
                    className="px-4 py-2 border border-slate-custom-200 rounded-lg text-xs font-bold text-slate-custom-600 hover:border-primary hover:text-primary transition-all flex items-center gap-2"
                  >
                    <span className="material-icons-round text-sm">description</span>
                    PDF
                  </button>
                  <button
                    onClick={() => showToast("info", "Share link workflow will be wired next.")}
                    className="px-4 py-2 bg-slate-custom-900 text-white rounded-lg text-xs font-bold hover:bg-slate-custom-800 transition-all flex items-center gap-2 shadow-lg shadow-slate-custom-900/20"
                  >
                    <span className="material-icons-round text-sm">share</span>
                    Share Link
                  </button>
                </div>
              </div>
            </section>
          </div>

          <ChartCustomizer
            config={chartConfig}
            onChange={setChartConfig}
            isOpen={showCustomizer}
            onToggle={() => setShowCustomizer(false)}
          />
        </div>
      </div>
    </div>
  );
}
