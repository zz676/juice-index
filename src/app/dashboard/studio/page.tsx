"use client";

import { useState, useEffect, useRef, useCallback, Suspense } from "react";
import { useSearchParams } from "next/navigation";
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
import {
  MODEL_REGISTRY,
  DEFAULT_MODEL_ID,
  DEFAULT_TEMPERATURE,
  canAccessModel,
  type ModelDefinition,
} from "@/lib/studio/models";
import type { ApiTier } from "@/lib/api/tier";
import { encodeShareState, decodeShareState } from "@/lib/studio/share";
import { buildChartData, buildMultiSeriesChartData, detectGroupField, deriveColumns, type MultiSeriesPoint } from "@/lib/studio/build-chart-data";
import PublishModal, { type PublishInfo } from "./publish-modal";
import SearchOverlay from "@/components/dashboard/SearchOverlay";
import NotificationBell from "@/components/dashboard/NotificationBell";

const SERIES_COLORS = [
  "#6366f1",
  "#f97316",
  "#00c853",
  "#e60012",
  "#0ea5e9",
  "#a855f7",
  "#eab308",
];

type ChartPoint = { label: string; value: number };

function hexLuminance(hex: string): number {
  const h = (hex || "#000").replace("#", "");
  if (h.length < 6) return 1;
  return (0.299 * parseInt(h.slice(0, 2), 16) + 0.587 * parseInt(h.slice(2, 4), 16) + 0.114 * parseInt(h.slice(4, 6), 16)) / 255;
}
function ensureContrast(color: string, bg: string, light = "#e2e8f0", dark = "#1e293b"): string {
  try {
    if (Math.abs(hexLuminance(color) - hexLuminance(bg)) < 0.25) {
      return hexLuminance(bg) < 0.5 ? light : dark;
    }
  } catch { /* ignore */ }
  return color;
}

const DEMO_CHART_DATA: ChartPoint[] = [
  { label: "Tesla", value: 1808 },
  { label: "BYD", value: 1572 },
  { label: "VW Group", value: 742 },
  { label: "Stellantis", value: 538 },
  { label: "Hyundai", value: 492 },
  { label: "BMW", value: 376 },
  { label: "Geely", value: 354 },
  { label: "Mercedes", value: 298 },
];
type QueryRow = Record<string, unknown>;

type ToastType = "success" | "error" | "info";

function WorkflowStepper({
  currentStep,
  steps,
  onStepClick,
}: {
  currentStep: number;
  steps: { id: string; stepNum: number; title: string; detail: string }[];
  onStepClick: (id: string) => void;
}) {
  const currentStepInfo = steps.find((s) => s.stepNum === currentStep);
  return (
    <div className="space-y-3">
      <div className="bg-card rounded-2xl border-[1.3px] border-lime-300 shadow-[0_0_20px_rgba(106,218,27,0.12),_0_1px_4px_rgba(0,0,0,0.05),_inset_0_1px_0_rgba(106,218,27,0.15)] overflow-hidden">
        <div className="bg-lime-50 px-4 py-2.5 border-b border-lime-200">
          <div className="text-[11px] font-bold uppercase tracking-widest text-lime-800 text-center">Workflow</div>
        </div>
        <div className="p-4">
        <div className="relative">
          {/* Vertical connector line through circle centres */}
          <div className="absolute left-[17px] top-5 bottom-5 w-0.5 bg-primary/25" />
          <div className="space-y-1">
            {steps.map((step) => {
              const isComplete = currentStep > step.stepNum;
              const isCurrent = currentStep === step.stepNum;
              const isAccessible = currentStep >= step.stepNum;
              return (
                <button
                  key={step.id}
                  onClick={() => onStepClick(step.id)}
                  disabled={!isAccessible}
                  className={`w-full flex items-center gap-3 px-2 py-2 rounded-lg text-left transition-all ${
                    isCurrent
                      ? "bg-primary/5"
                      : isAccessible
                      ? "hover:bg-slate-custom-50"
                      : "opacity-40 cursor-not-allowed"
                  }`}
                >
                  <span
                    className={`relative z-10 flex-shrink-0 w-[18px] h-[18px] rounded-full flex items-center justify-center transition-all ${
                      isComplete
                        ? "bg-primary shadow-[0_0_8px_rgba(106,218,27,0.45)]"
                        : isCurrent
                        ? "bg-card border-2 border-primary shadow-[0_0_8px_rgba(106,218,27,0.35)]"
                        : "bg-card border-2 border-slate-custom-200"
                    }`}
                  >
                    {isComplete ? (
                      <span className="material-icons-round text-white text-[9px]">check</span>
                    ) : isCurrent ? (
                      <span className="w-[6px] h-[6px] rounded-full bg-primary" />
                    ) : (
                      <span className="w-[5px] h-[5px] rounded-full bg-slate-custom-300" />
                    )}
                  </span>
                  <div className="min-w-0 flex-1">
                    <div className={`text-[12px] font-bold leading-tight ${isCurrent ? "text-slate-custom-900" : "text-slate-custom-600"}`}>
                      {step.title}
                    </div>
                    <div className="text-[11px] text-slate-custom-400 mt-0.5">{step.detail}</div>
                  </div>
                </button>
              );
            })}
          </div>
        </div>
        </div>
      </div>
      {currentStepInfo && (
        <div className="bg-card rounded-2xl border-[1.3px] border-lime-300 shadow-[0_0_28px_rgba(106,218,27,0.22),_0_2px_8px_rgba(106,218,27,0.1),_inset_0_1px_0_rgba(106,218,27,0.3),_inset_0_-1px_0_rgba(106,218,27,0.06)] p-4">
          <div className="text-[11px] font-bold uppercase tracking-wide text-slate-custom-400 mb-1">Current Step</div>
          <div className="text-[15px] font-bold text-slate-custom-800">{currentStepInfo.title}</div>
          <div className="text-[12px] text-slate-custom-500 mt-0.5">{currentStepInfo.detail}</div>
        </div>
      )}
    </div>
  );
}

export default function StudioPage() {
  return (
    <Suspense>
      <StudioPageInner />
    </Suspense>
  );
}

function StudioPageInner() {
  const searchParams = useSearchParams();
  const [mounted, setMounted] = useState(false);
  const [chartConfig, setChartConfig] =
    useState<ChartConfig>(DEFAULT_CHART_CONFIG);
  const [chartData, setChartData] = useState<ChartPoint[]>([]);
  const [multiSeriesData, setMultiSeriesData] = useState<MultiSeriesPoint[]>([]);
  const [seriesKeys, setSeriesKeys] = useState<string[]>([]);
  const [groupField, setGroupField] = useState<string>("");
  const [rawData, setRawData] = useState<QueryRow[]>([]);
  const [showCustomizer, setShowCustomizer] = useState(false);
  const [chartImage, setChartImage] = useState<string | null>(null);
  const [isGeneratingImage, setIsGeneratingImage] = useState(false);
  const [chartResolution, setChartResolution] = useState<"hd" | "fhd" | "2k" | "4k">("hd");
  const [imgZoom, setImgZoom] = useState(1);
  const [imgPan, setImgPan] = useState({ x: 0, y: 0 });
  const [isPanning, setIsPanning] = useState(false);
  const [panMode, setPanMode] = useState(false);
  const panStart = useRef({ x: 0, y: 0 });
  const panOrigin = useRef({ x: 0, y: 0 });
  const promptRef = useRef<HTMLTextAreaElement>(null);
  const [prompt, setPrompt] = useState("");
  const [isGeneratingQueryPlan, setIsGeneratingQueryPlan] = useState(false);
  const [isRunningQuery, setIsRunningQuery] = useState(false);
  const [queryJsonText, setQueryJsonText] = useState("");
  const [generatedSql, setGeneratedSql] = useState("");
  const [sqlUserEdited, setSqlUserEdited] = useState(false);
  const [tableName, setTableName] = useState("");
  const [xField, setXField] = useState("");
  const [yField, setYField] = useState("");
  const [columns, setColumns] = useState<string[]>([]);
  const [numericColumns, setNumericColumns] = useState<string[]>([]);
  const [rowCount, setRowCount] = useState(0);
  const [executionTimeMs, setExecutionTimeMs] = useState<number | null>(null);
  const [analysisExplanation, setAnalysisExplanation] = useState("");
  const [postDraft, setPostDraft] = useState("");
  const [isGeneratingPost, setIsGeneratingPost] = useState(false);
  const [attachImage, setAttachImage] = useState(true);
  const [toast, setToast] = useState<{ type: ToastType; message: string } | null>(
    null
  );
  const [selectedModelId, setSelectedModelId] = useState(DEFAULT_MODEL_ID);
  const [temperature, setTemperature] = useState(DEFAULT_TEMPERATURE);
  const [userTier, setUserTier] = useState<ApiTier>("FREE");
  const [isModelDropdownOpen, setIsModelDropdownOpen] = useState(false);
  const [queryModelId, setQueryModelId] = useState(DEFAULT_MODEL_ID);
  const [isQueryModelDropdownOpen, setIsQueryModelDropdownOpen] = useState(false);
  const [activeSection, setActiveSection] = useState<number>(1);
  const [queryUsageCount, setQueryUsageCount] = useState(0);
  const [queryLimitCount, setQueryLimitCount] = useState(Infinity);
  const [composerUsageCount, setComposerUsageCount] = useState(0);
  const [draftLimitCount, setDraftLimitCount] = useState(Infinity);
  const [chartUsageCount, setChartUsageCount] = useState(0);
  const [chartLimitCount, setChartLimitCount] = useState(Infinity);
  const [publishUsageCount, setPublishUsageCount] = useState(0);
  const [publishLimitCount, setPublishLimitCount] = useState(Infinity);
  const [modelUsage, setModelUsage] = useState<Array<{
    modelId: string;
    queryUsed: number;
    queryLimit: number;
    draftUsed: number;
    draftLimit: number;
  }>>([]);
  const [showPublishModal, setShowPublishModal] = useState(false);
  const [isPublishing, setIsPublishing] = useState(false);
  const [isScheduling, setIsScheduling] = useState(false);
  const [publishInfo, setPublishInfo] = useState<PublishInfo | null>(null);
  const [isLoadingPublishInfo, setIsLoadingPublishInfo] = useState(false);
  const [publishError, setPublishError] = useState<string | null>(null);

  const [examplesOpen, setExamplesOpen] = useState(false);
  const [activeCategory, setActiveCategory] = useState<string | null>(null);

  const sampleQuestions: Record<string, string[]> = {
    "Brand Deliveries": [
      "Show Tesla monthly deliveries for 2024",
      "Compare BYD vs Tesla deliveries by month in 2024",
      "Top 10 EV brands by delivery volume in 2024",
    ],
    "Industry Sales": [
      "CAAM NEV sales by month for 2024",
      "CPCA NEV retail sales trend for 2024",
      "Weekly NEV sales summary for 2024",
    ],
    "Market Health": [
      "Dealer inventory factor by month 2024",
      "Passenger vehicle inventory levels 2024",
      "Vehicle Inventory Alert Index trend for 2024",
    ],
    "Battery Industry": [
      "CATL vs BYD battery installation volume 2024",
      "Top battery makers ranked by market share 2024",
      "Monthly battery installation and production in 2024",
    ],
    "Exports": [
      "Tesla Shanghai plant exports by month 2024",
      "All plant exports ranked by value in 2024",
      "BYD plant exports month over month in 2024",
    ],
    "Vehicle Specs": [
      "Compare Tesla models by range and price",
      "Top EVs by battery capacity",
      "BYD vehicle specs with starting price and range",
    ],
  };

  const categoryIcons: Record<string, string> = {
    "Brand Deliveries": "local_shipping",
    "Industry Sales": "trending_up",
    "Market Health": "monitor_heart",
    "Battery Industry": "battery_charging_full",
    "Exports": "public",
    "Vehicle Specs": "directions_car",
  };

  const toastTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    setMounted(true);

    const shareParam = searchParams.get("s");
    if (shareParam) {
      const result = decodeShareState(shareParam);
      if (result) {
        const { state: s, expired } = result;
        setPrompt(s.prompt);
        setQueryJsonText(s.queryJsonText);
        setGeneratedSql(s.generatedSql);
        setTableName(s.tableName);
        setXField(s.xField);
        setYField(s.yField);
        setRawData(s.rawData);
        const { columns: restCols, numericColumns: restNumCols } = deriveColumns(s.rawData);
        setColumns(restCols);
        setNumericColumns(restNumCols);
        setChartData(s.chartData);
        setChartConfig(s.chartConfig);
        if (s.postDraft) setPostDraft(s.postDraft);
        setActiveSection(s.postDraft ? 4 : 3);
        if (expired) {
          setTimeout(() => showToast("info", "This share link is older than 7 days. Data may be outdated."), 300);
        }
      }
      window.history.replaceState({}, "", window.location.pathname);
    }

    return () => {
      if (toastTimer.current) clearTimeout(toastTimer.current);
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const showToast = useCallback((type: ToastType, message: string) => {
    setToast({ type, message });
    if (toastTimer.current) clearTimeout(toastTimer.current);
    toastTimer.current = setTimeout(() => setToast(null), 3200);
  }, []);

  const fetchUsage = useCallback(() => {
    fetch("/api/dashboard/studio/usage")
      .then((res) => res.json())
      .then((data: Record<string, unknown>) => {
        if (typeof data.queryUsed === "number") setQueryUsageCount(data.queryUsed);
        if (typeof data.queryLimit === "number") setQueryLimitCount(data.queryLimit);
        if (typeof data.draftUsed === "number") setComposerUsageCount(data.draftUsed);
        if (typeof data.draftLimit === "number") setDraftLimitCount(data.draftLimit);
        if (typeof data.chartUsed === "number") setChartUsageCount(data.chartUsed);
        if (typeof data.chartLimit === "number") setChartLimitCount(data.chartLimit);
        if (typeof data.publishUsed === "number") setPublishUsageCount(data.publishUsed);
        if (typeof data.publishLimit === "number") setPublishLimitCount(data.publishLimit);
        if (Array.isArray(data.modelUsage)) setModelUsage(data.modelUsage as typeof modelUsage);
      })
      .catch(() => {});
  }, []);

  const fetchPublishInfo = useCallback(async () => {
    setIsLoadingPublishInfo(true);
    try {
      const res = await fetch("/api/dashboard/studio/publish-info");
      const data = (await res.json()) as PublishInfo;
      setPublishInfo(data);
    } catch {
      showToast("error", "Failed to load publish info.");
    } finally {
      setIsLoadingPublishInfo(false);
    }
  }, [showToast]);

  // Fetch user tier, usage, and publish info on mount
  useEffect(() => {
    fetch("/api/dashboard/tier")
      .then((res) => res.json())
      .then((data: Record<string, unknown>) => {
        if (typeof data.tier === "string") setUserTier(data.tier as ApiTier);
      })
      .catch(() => {});
    fetchUsage();
    fetchPublishInfo();
  }, [fetchUsage, fetchPublishInfo]);

  // Pre-fill prompt from URL param (e.g., from brand search results)
  useEffect(() => {
    const urlPrompt = searchParams.get("prompt");
    if (urlPrompt && !prompt) {
      setPrompt(urlPrompt);
    }
    // Only run on mount
    // eslint-disable-next-line react-hooks/exhaustive-deps
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
      const rows = Array.isArray(data.data) ? (data.data as QueryRow[]) : [];
      setRawData(rows);
      const { columns: allCols, numericColumns: numCols } = deriveColumns(rows);
      setColumns(allCols);
      setNumericColumns(numCols);
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

      // Multi-series data (multiLine chart)
      if (Array.isArray(data.multiSeriesData) && Array.isArray(data.series) && (data.series as unknown[]).length > 0) {
        setMultiSeriesData(
          (data.multiSeriesData as Array<Record<string, unknown>>).map((pt) => {
            const entry: MultiSeriesPoint = { label: String(pt.label ?? "") };
            for (const key of Object.keys(pt)) {
              if (key !== "label") entry[key] = typeof pt[key] === "number" ? pt[key] as number : 0;
            }
            return entry;
          })
        );
        setSeriesKeys((data.series as unknown[]).map(String));
        setGroupField(typeof data.groupField === "string" ? data.groupField : "year");
      } else {
        setMultiSeriesData([]);
        setSeriesKeys([]);
        setGroupField("");
      }

      setChartConfig((prev) => ({
        ...prev,
        chartType:
          data.chartType === "bar" ||
          data.chartType === "line" ||
          data.chartType === "horizontalBar" ||
          data.chartType === "multiLine"
            ? data.chartType
            : prev.chartType,
        title:
          typeof data.chartTitle === "string" && data.chartTitle.trim()
            ? data.chartTitle
            : prev.title,
      }));

      showToast(
        "success",
        previewData.length || (Array.isArray(data.multiSeriesData) && (data.multiSeriesData as unknown[]).length)
          ? "Query executed successfully."
          : "Query ran successfully but returned no chartable rows."
      );

      setTimeout(() => {
        document.getElementById("step-3")?.scrollIntoView({ behavior: "smooth", block: "start" });
      }, 350);
    },
    [showToast]
  );

  const handleAxisChange = useCallback(
    (newXField: string, newYField: string) => {
      setXField(newXField);
      setYField(newYField);
      const { points } = buildChartData(rawData, newXField, newYField);
      setChartData(points);
      // Also rebuild multi-series data if there's a groupField
      if (groupField) {
        const multi = buildMultiSeriesChartData(rawData, groupField, newXField, newYField);
        setMultiSeriesData(multi.points);
        setSeriesKeys(multi.series);
      }
    },
    [rawData, groupField]
  );

  const generateRunnableQuery = async () => {
    if (!prompt.trim()) {
      showToast("error", "Please enter a query first.");
      return;
    }

    setIsGeneratingQueryPlan(true);
    showToast("info", "Converting question to runnable query...");

    try {
      const res = await fetch("/api/dashboard/studio/generate-chart", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ prompt, previewOnly: true, modelId: queryModelId }),
      });

      const data = (await res.json().catch(() => ({}))) as Record<
        string,
        unknown
      >;

      if (!res.ok) {
        const msg =
          (typeof data.message === "string" && data.message) ||
          (typeof data.error === "string" && data.error) ||
          "Failed to process query";
        console.log("[studio] generate-query error:", msg, data);
        showToast("error", msg);
        return;
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
      setSqlUserEdited(false);
      setTableName(typeof data.table === "string" ? data.table : "");
      setQueryJsonText(nextQueryJson);
      setAnalysisExplanation(
        typeof data.explanation === "string" ? data.explanation : ""
      );
      setChartData([]);
      setMultiSeriesData([]);
      setSeriesKeys([]);
      setGroupField("");
      setRawData([]);
      setColumns([]);
      setNumericColumns([]);
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
          data.chartType === "horizontalBar" ||
          data.chartType === "multiLine"
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
      fetchUsage();

      setTimeout(() => {
        document.getElementById("step-2")?.scrollIntoView({ behavior: "smooth", block: "start" });
      }, 100);
    } catch (err) {
      console.log("[studio] generate-query unexpected error:", err);
      showToast(
        "error",
        err instanceof Error ? err.message : "Failed to generate query"
      );
    } finally {
      setIsGeneratingQueryPlan(false);
    }
  };

  const runRawSql = async (sql: string) => {
    setIsRunningQuery(true);
    showToast("info", "Running query...");
    try {
      const res = await fetch("/api/dashboard/studio/generate-chart", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ rawSql: sql }),
      });
      const data = (await res.json().catch(() => ({}))) as Record<string, unknown>;
      if (!res.ok) {
        throw new Error(
          (typeof data.message === "string" && data.message) ||
            (typeof data.error === "string" && data.error) ||
            "Failed to run query"
        );
      }
      applyQueryExecutionResult(data);
      fetchUsage();
    } catch (err) {
      console.error(err);
      showToast("error", err instanceof Error ? err.message : "Failed to run query");
    } finally {
      setIsRunningQuery(false);
    }
  };

  const runGeneratedQuery = async () => {
    // If SQL was manually edited or no tableName, use raw SQL path
    if (sqlUserEdited || !tableName) {
      if (!generatedSql.trim()) {
        showToast("error", "Enter or generate SQL first.");
        return;
      }
      await runRawSql(generatedSql);
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
      const res = await fetch("/api/dashboard/studio/generate-chart", {
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
      fetchUsage();
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
    const isMultiLine = chartConfig.chartType === "multiLine" && multiSeriesData.length > 0;
    if (!chartData.length && !isMultiLine) {
      showToast("error", "Run a query first to generate chart image.");
      return;
    }

    setIsGeneratingImage(true);
    showToast("info", "Generating chart image...");

    try {
      const res = await fetch("/api/dashboard/studio/generate-chart", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          data: isMultiLine ? undefined : chartData,
          ...(isMultiLine ? { multiSeriesData, series: seriesKeys, groupField } : {}),
          chartType: chartConfig.chartType,
          title: chartConfig.title,
          resolution: chartResolution,
          chartOptions: {
            backgroundColor: chartConfig.backgroundColor,
            barColor: chartConfig.barColor,
            fontColor: chartConfig.fontColor,
            titleColor: chartConfig.titleColor,
            titleSize: chartConfig.titleSize,
            titleFont: chartConfig.titleFont,
            titlePaddingTop: chartConfig.titlePaddingTop,
            titlePaddingBottom: chartConfig.titlePaddingBottom,
            xAxisFontSize: chartConfig.xAxisFontSize,
            yAxisFontSize: chartConfig.yAxisFontSize,
            xAxisFontColor: chartConfig.xAxisFontColor,
            yAxisFontColor: chartConfig.yAxisFontColor,
            axisFont: chartConfig.axisFont,
            sourceText: chartConfig.sourceText,
            bottomRightText: chartConfig.bottomRightText,
            sourceColor: chartConfig.sourceColor,
            sourceFontSize: chartConfig.sourceFontSize,
            sourceFont: chartConfig.sourceFont,
            sourcePaddingTop: chartConfig.sourcePaddingTop,
            sourcePaddingBottom: chartConfig.sourcePaddingBottom,
            barWidth: chartConfig.barWidth,
            showValues: chartConfig.showValues,
            showGrid: chartConfig.showGrid,
            gridLineStyle: chartConfig.gridLineStyle,
            gridColor: chartConfig.gridColor,
            xAxisLineColor: chartConfig.xAxisLineColor,
            yAxisLineColor: chartConfig.yAxisLineColor,
            xAxisLineWidth: chartConfig.xAxisLineWidth,
            yAxisLineWidth: chartConfig.yAxisLineWidth,
            paddingTop: chartConfig.paddingTop,
            paddingBottom: chartConfig.paddingBottom,
            paddingLeft: chartConfig.paddingLeft,
            paddingRight: chartConfig.paddingRight,
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
      setImgZoom(1);
      setImgPan({ x: 0, y: 0 });
      fetchUsage();
      showToast("success", "Chart image ready!");
      setActiveSection(4);
      setTimeout(() => {
        const el = document.getElementById("step-4");
        if (el) el.scrollIntoView({ behavior: "smooth", block: "start" });
      }, 100);
    } catch (err) {
      console.error(err);
      showToast(
        "error",
        err instanceof Error ? err.message : "Chart generation failed"
      );
    } finally {
      setIsGeneratingImage(false);
    }
  }, [chartConfig, chartData, multiSeriesData, seriesKeys, groupField, chartResolution, showToast, fetchUsage]);

  const generateDraft = useCallback(async () => {
    if (!prompt.trim()) {
      showToast("error", "Run a query first before generating a draft.");
      return;
    }

    setIsGeneratingPost(true);
    showToast("info", "Generating analyst draft...");

    try {
      const res = await fetch("/api/dashboard/studio/generate-post", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          question: prompt,
          sql: generatedSql,
          chartTitle: chartConfig.title,
          chartType: chartConfig.chartType,
          data: rawData.slice(0, 60),
          model: selectedModelId,
          temperature,
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
      fetchUsage();
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
  }, [chartConfig.chartType, chartConfig.title, generatedSql, prompt, rawData, selectedModelId, temperature, showToast, fetchUsage]);

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
      const base64 = chartImage.split(",")[1];
      const binary = atob(base64);
      const bytes = new Uint8Array(binary.length);
      for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);
      const blob = new Blob([bytes], { type: "image/png" });
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

  const downloadPdf = useCallback(async () => {
    if (!chartImage) return;
    const { jsPDF } = await import("jspdf");

    const img = new Image();
    img.src = chartImage;
    await new Promise<void>((resolve) => { img.onload = () => resolve(); });

    const imgWidth = img.naturalWidth;
    const imgHeight = img.naturalHeight;
    const landscape = imgWidth > imgHeight;
    const pdf = new jsPDF({ orientation: landscape ? "landscape" : "portrait", unit: "px", format: [imgWidth, imgHeight] });
    pdf.addImage(chartImage, "PNG", 0, 0, imgWidth, imgHeight);
    pdf.save(`chart-${chartConfig.title.replace(/[^a-z0-9]+/gi, "-").toLowerCase() || "data"}.pdf`);
    showToast("success", "PDF download started!");
  }, [chartImage, chartConfig.title, showToast]);

  const copyShareLink = useCallback(() => {
    const encoded = encodeShareState({
      prompt,
      queryJsonText,
      generatedSql,
      tableName,
      xField,
      yField,
      rawData,
      chartData,
      chartConfig,
      postDraft,
    });
    const url = `${window.location.origin}${window.location.pathname}?s=${encoded}`;
    if (url.length > 8000) {
      showToast("error", "Dataset too large for a share link. Try reducing rows.");
      return;
    }
    navigator.clipboard.writeText(url).then(
      () => showToast("success", "Share link copied!"),
      () => showToast("error", "Failed to copy link.")
    );
  }, [prompt, queryJsonText, generatedSql, tableName, xField, yField, rawData, chartData, chartConfig, postDraft, showToast]);

  const handlePublishClick = useCallback(() => {
    if (userTier === "FREE") {
      showToast("info", "Publishing requires a Starter plan or higher. Upgrade to publish.");
      return;
    }
    if (publishInfo && !publishInfo.hasXAccount) {
      showToast("error", "X account not connected. Connect in Settings to publish.");
      return;
    }
    setPublishError(null);
    setShowPublishModal(true);
    fetchPublishInfo();
  }, [userTier, publishInfo, showToast, fetchPublishInfo]);

  const handleConfirmPublish = useCallback(async () => {
    if (!postDraft) return;
    const limit = publishInfo?.charLimit ?? 280;
    if (postDraft.length > limit) {
      setPublishError(`Post exceeds ${limit.toLocaleString()} character limit. Please shorten it.`);
      return;
    }
    setPublishError(null);
    setIsPublishing(true);
    try {
      const res = await fetch("/api/dashboard/user-posts", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          content: postDraft,
          action: "publish",
          ...(attachImage && chartImage ? { imageBase64: chartImage } : {}),
        }),
      });
      const data = (await res.json()) as Record<string, unknown>;
      if (!res.ok) {
        throw new Error(
          (typeof data.message === "string" && data.message) ||
            "Failed to publish"
        );
      }
      showToast("success", "Post published to X!");
      setShowPublishModal(false);
      // Refresh publish info so quota display updates
      fetchPublishInfo();
    } catch (err) {
      setPublishError(err instanceof Error ? err.message : "Failed to publish");
    } finally {
      setIsPublishing(false);
    }
  }, [postDraft, publishInfo, showToast, fetchPublishInfo, attachImage, chartImage]);

  const handleSaveDraft = useCallback(async () => {
    if (!postDraft) return;
    try {
      const res = await fetch("/api/dashboard/user-posts", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          content: postDraft,
          action: "draft",
          ...(attachImage && chartImage ? { imageBase64: chartImage } : {}),
        }),
      });
      if (!res.ok) {
        const data = (await res.json()) as Record<string, unknown>;
        throw new Error(
          (typeof data.message === "string" && data.message) || "Failed to save draft"
        );
      }
      showToast("success", "Draft saved!");
    } catch (err) {
      showToast("error", err instanceof Error ? err.message : "Failed to save draft");
    } finally {
      setShowPublishModal(false);
    }
  }, [postDraft, showToast, attachImage, chartImage]);

  const handleConfirmSchedule = useCallback(async (scheduledFor: string) => {
    if (!postDraft) return;
    const limit = publishInfo?.charLimit ?? 280;
    if (postDraft.length > limit) {
      setPublishError(`Post exceeds ${limit.toLocaleString()} character limit. Please shorten it.`);
      return;
    }
    setPublishError(null);
    setIsScheduling(true);
    try {
      const res = await fetch("/api/dashboard/user-posts", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          content: postDraft,
          action: "schedule",
          scheduledFor,
          ...(attachImage && chartImage ? { imageBase64: chartImage } : {}),
        }),
      });
      const data = (await res.json()) as Record<string, unknown>;
      if (!res.ok) {
        throw new Error(
          (typeof data.message === "string" && data.message) ||
            "Failed to schedule post"
        );
      }
      const formatted = new Date(scheduledFor).toLocaleString("en-US", {
        weekday: "short",
        month: "short",
        day: "numeric",
        hour: "numeric",
        minute: "2-digit",
      });
      showToast("success", `Post scheduled for ${formatted}!`);
      setShowPublishModal(false);
      fetchPublishInfo();
    } catch (err) {
      setPublishError(err instanceof Error ? err.message : "Failed to schedule post");
    } finally {
      setIsScheduling(false);
    }
  }, [postDraft, publishInfo, showToast, fetchPublishInfo, attachImage, chartImage]);

  if (!mounted) return null;

  const hasMultiSeriesChartData = chartConfig.chartType === "multiLine" && multiSeriesData.length > 0 && seriesKeys.length > 0;
  const hasChartData = chartData.length > 0 || hasMultiSeriesChartData;
  const queryQuotaExhausted = queryUsageCount >= queryLimitCount;
  const chartQuotaExhausted = chartUsageCount >= chartLimitCount;
  const draftQuotaExhausted = composerUsageCount >= draftLimitCount;

  const selectedQueryModelExhausted = (() => {
    const mu = modelUsage.find((u) => u.modelId === queryModelId);
    if (!mu || !Number.isFinite(mu.queryLimit)) return false;
    return mu.queryUsed >= mu.queryLimit;
  })();
  const selectedComposerModelExhausted = (() => {
    const mu = modelUsage.find((u) => u.modelId === selectedModelId);
    if (!mu || !Number.isFinite(mu.draftLimit)) return false;
    return mu.draftUsed >= mu.draftLimit;
  })();

  const currentStep = chartImage ? 4 : chartData.length > 0 ? 3 : (generatedSql || tableName) ? 2 : 1;
  const workflowSteps = [
    { id: "step-1", stepNum: 1, title: "Ask Intelligence", detail: "Enter your data question" },
    { id: "step-2", stepNum: 2, title: "Review Query", detail: "Review and run SQL" },
    { id: "step-3", stepNum: 3, title: "Visualization & Data", detail: "Explore your chart" },
    { id: "step-4", stepNum: 4, title: "Analyst Composer", detail: "Draft and publish" },
  ];
  const scrollToStep = (stepId: string) => {
    const el = document.getElementById(stepId);
    if (el) el.scrollIntoView({ behavior: "smooth", block: "start" });
  };

  return (
    <div className="font-display text-slate-custom-800 min-h-full -m-8" style={{ background: "repeating-linear-gradient(45deg, rgba(112,185,60,0.07) 0px, rgba(112,185,60,0.07) 1px, transparent 1px, transparent 8px), radial-gradient(ellipse at top left, rgba(155,199,84,0.28) 0%, transparent 50%), radial-gradient(ellipse at top right, rgba(176,208,91,0.30) 0%, transparent 50%), radial-gradient(ellipse at bottom left, rgba(133,192,72,0.30) 0%, transparent 50%), radial-gradient(ellipse at bottom right, rgba(155,199,84,0.26) 0%, transparent 50%), linear-gradient(135deg, rgba(212,233,173,0.55) 0%, rgba(255,255,255,0.92) 45%, rgba(212,233,173,0.50) 100%)" }}>

      <header className="h-[61px] flex items-center justify-between px-6 border-b border-slate-custom-200 bg-gradient-to-r from-white via-white to-slate-custom-50/80 backdrop-blur-sm z-10 sticky top-0 relative">
        <div className="flex items-center gap-4">
          <h1 className="font-extrabold text-[20px] flex items-center gap-1.5">
            <span className="bg-gradient-to-r from-primary via-emerald-400 to-teal-400 bg-clip-text text-transparent drop-shadow-[0_0_8px_rgba(106,218,27,0.4)] animate-[pulse_3s_ease-in-out_infinite]">
              Juice AI
            </span>
            <span className="material-icons-round text-primary text-[18px] animate-[spin_4s_linear_infinite] drop-shadow-[0_0_6px_rgba(106,218,27,0.5)]">
              auto_awesome
            </span>
          </h1>
        </div>
        {toast ? (
          <div
            className={`absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 z-50 px-4 py-1.5 rounded-lg border text-[13px] font-medium shadow-sm transition-all whitespace-nowrap ${
              toast.type === "success"
                ? "border-primary bg-primary text-green-900"
                : toast.type === "error"
                ? "border-red-300 bg-red-200 text-red-700"
                : "border-slate-200 bg-card text-slate-700"
            }`}
          >
            {toast.message}
          </div>
        ) : (
          <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
            <div className="pointer-events-auto">
              <SearchOverlay />
            </div>
          </div>
        )}
        <div className="flex items-center gap-3">
          <NotificationBell />
        </div>
      </header>

      <main className="px-6 pt-24 pb-5 w-full max-w-7xl mx-auto">
        <div className="xl:grid gap-5 xl:grid-cols-[1fr_16rem]">

          {/* Main content column - all steps stacked */}
          <div className="space-y-5 min-w-0">

            {/* Step 1 - Always visible */}
            <section
              id="step-1"
              onFocusCapture={() => setActiveSection(1)}
              onClickCapture={() => setActiveSection(1)}
              className={`bg-card rounded-2xl border-[1.3px] border-lime-300 transition-all duration-200 relative group pt-10 px-6 pb-3 ${activeSection === 1 ? "shadow-[0_0_22px_rgba(106,218,27,0.22),_0_4px_12px_rgba(106,218,27,0.1),_inset_0_1px_0_rgba(106,218,27,0.2)]" : "shadow-sm hover:shadow-md"}`}
            >
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-2">
                  <span className={`flex items-center justify-center w-6 h-6 rounded-full text-[13px] font-bold ring-2 transition-colors duration-300 ${activeSection === 1 ? "bg-primary text-slate-custom-900 ring-primary/20 shadow-[0_0_8px_rgba(106,218,27,0.4)]" : "bg-slate-custom-200 text-slate-custom-500 ring-slate-custom-200"}`}>
                    1
                  </span>
                  <h3 className={`font-bold text-[15px] uppercase tracking-wide transition-colors duration-300 ${activeSection === 1 ? "text-slate-custom-900" : "text-slate-custom-500"}`}>
                    Ask Intelligence
                  </h3>
                </div>
                <button
                  onClick={() => setExamplesOpen((v) => !v)}
                  className="flex items-center gap-1 text-[12px] font-medium text-slate-custom-500 hover:text-primary transition-colors"
                >
                  <span className="material-icons-round text-[15px]">lightbulb</span>
                  Examples
                  <span className="material-icons-round text-[15px] transition-transform duration-200" style={{ transform: examplesOpen ? "rotate(180deg)" : "rotate(0deg)" }}>
                    expand_more
                  </span>
                </button>
              </div>
              <div className="space-y-1.5">
                {/* Sample Questions */}
                {examplesOpen && (
                  <div className="bg-card border border-slate-custom-200 rounded-lg shadow-sm p-3">
                      <div className="grid grid-cols-3 gap-2">
                        {Object.keys(sampleQuestions).map((category) => (
                          <button
                            key={category}
                            title={category}
                            onClick={() => setActiveCategory(activeCategory === category ? null : category)}
                            className={`flex items-center gap-1.5 px-2 py-1.5 rounded-lg border text-[12px] font-semibold transition-all select-none ${
                              activeCategory === category
                                ? "border-primary/40 bg-primary/10 text-slate-custom-900"
                                : "border-slate-custom-100 text-slate-custom-700 hover:bg-slate-custom-50"
                            }`}
                          >
                            <span className={`material-icons-round text-[15px] ${activeCategory === category ? "text-primary" : "text-slate-custom-400"}`}>{categoryIcons[category]}</span>
                            <span className="truncate">{category}</span>
                          </button>
                        ))}
                      </div>
                      {activeCategory && sampleQuestions[activeCategory] && (
                        <div className="mt-2 rounded-lg border border-slate-custom-100 overflow-hidden">
                          {sampleQuestions[activeCategory].map((q) => (
                            <button
                              key={q}
                              onClick={() => {
                                setPrompt(q);
                                setExamplesOpen(false);
                                setActiveCategory(null);
                              }}
                              className="w-full text-left px-3 py-0 text-[12px] text-slate-custom-600 hover:bg-primary/5 hover:text-slate-custom-900 transition-all border-b border-slate-custom-50 last:border-b-0 flex items-start gap-2"
                            >
                              <span className="material-icons-round text-[13px] text-slate-custom-300 mt-px">arrow_right</span>
                              {q}
                            </button>
                          ))}
                        </div>
                      )}
                  </div>
                )}

                <textarea
                  ref={promptRef}
                  value={prompt}
                  onChange={(e) => setPrompt(e.target.value)}
                  className="w-full min-h-[66px] bg-card border border-slate-custom-300 rounded-lg pt-3 px-3 pb-0 text-[15px] focus:ring-2 focus:ring-primary/50 focus:border-primary focus:outline-none transition-colors resize-y shadow-sm placeholder-slate-custom-400 text-slate-custom-800"
                  placeholder="e.g. Compare Tesla Shanghai exports vs domestic sales for Q1 2024..."
                />
                <div className="flex items-center justify-between">
                  <div className="flex flex-col">
                    <div className="relative">
                      <button
                        onClick={() => setIsQueryModelDropdownOpen((v) => !v)}
                        className="flex items-center gap-1.5 text-[13px] font-medium text-slate-custom-600 px-2.5 py-1.5 rounded-lg hover:text-primary hover:shadow-[0_0_8px_rgba(106,218,27,0.35)] transition-all duration-200"
                      >
                        <span className="material-icons-round text-[15px] text-primary">smart_toy</span>
                        <span className="max-w-[100px] truncate">
                          {MODEL_REGISTRY.find((m) => m.id === queryModelId)?.displayName ?? "GPT-4o Mini"}
                        </span>
                      <span className="material-icons-round text-[15px] text-slate-custom-400">expand_more</span>
                    </button>
                    {isQueryModelDropdownOpen && (
                      <>
                        <div
                          className="fixed inset-0 z-40"
                          onClick={() => setIsQueryModelDropdownOpen(false)}
                        />
                        <div className="absolute left-0 top-full mt-1 z-50 w-64 bg-card border border-slate-custom-200 rounded-xl shadow-lg overflow-hidden">
                          {MODEL_REGISTRY.map((model: ModelDefinition) => {
                            const accessible = canAccessModel(userTier, model.id);
                            const isSelected = model.id === queryModelId;
                            const mu = modelUsage.find((u) => u.modelId === model.id);
                            const modelExhausted = accessible && mu && Number.isFinite(mu.queryLimit) && mu.queryUsed >= mu.queryLimit;
                            return (
                              <button
                                key={model.id}
                                onClick={() => {
                                  if (accessible && !modelExhausted) {
                                    setQueryModelId(model.id);
                                    setIsQueryModelDropdownOpen(false);
                                  } else if (modelExhausted) {
                                    showToast("info", `${model.displayName} daily limit reached. Try another model.`);
                                  } else {
                                    showToast("info", `Upgrade to ${model.minTier} to unlock ${model.displayName}`);
                                  }
                                }}
                                className={`w-full text-left px-3 py-2.5 flex items-center justify-between gap-2 transition-colors border-b border-slate-custom-50 last:border-b-0 ${
                                  accessible && !modelExhausted
                                    ? "hover:bg-primary/5 cursor-pointer"
                                    : "opacity-50 cursor-not-allowed"
                                } ${isSelected ? "bg-primary/10" : ""}`}
                              >
                                <div className="flex-1 min-w-0">
                                  <div className="flex items-center gap-1.5">
                                    <span className={`text-[13px] font-bold ${accessible ? "text-slate-custom-800" : "text-slate-custom-400"}`}>
                                      {model.displayName}
                                    </span>
                                    {accessible && mu && (
                                      <span className={`text-[10px] font-mono px-1 py-0.5 rounded ${
                                        modelExhausted
                                          ? "bg-red-100 text-red-600"
                                          : "bg-slate-custom-100 text-slate-custom-500"
                                      }`}>
                                        {Number.isFinite(mu.queryLimit) ? `${mu.queryUsed}/${mu.queryLimit}` : "Unlimited"}
                                      </span>
                                    )}
                                  </div>
                                  <div className={`text-[11px] ${accessible ? "text-slate-custom-500" : "text-slate-custom-300"}`}>
                                    {model.description}
                                  </div>
                                </div>
                                {isSelected && accessible && (
                                  <span className="material-icons-round text-[15px] text-primary">check</span>
                                )}
                                {!accessible && (
                                  <span className="material-icons-round text-[15px] text-slate-custom-300">lock</span>
                                )}
                              </button>
                            );
                          })}
                        </div>
                      </>
                    )}
                    </div>
                    <span className="text-[11px] font-mono text-slate-custom-400 pl-2.5">
                      {queryUsageCount}/{Number.isFinite(queryLimitCount) ? queryLimitCount : "\u221E"} queries
                      {(() => {
                        const mu = modelUsage.find((u) => u.modelId === queryModelId);
                        if (!mu || !Number.isFinite(mu.queryLimit)) return null;
                        return ` \u00B7 ${mu.queryUsed}/${mu.queryLimit} ${MODEL_REGISTRY.find((m) => m.id === queryModelId)?.displayName ?? queryModelId}`;
                      })()}
                    </span>
                  </div>
                  <div className="flex flex-col items-end gap-1">
                    <button
                      onClick={generateRunnableQuery}
                      disabled={isGeneratingQueryPlan || !prompt.trim() || queryQuotaExhausted || selectedQueryModelExhausted}
                      className="px-2.5 py-1 rounded-full bg-gradient-to-r from-primary to-green-400 text-slate-custom-900 text-[11px] font-bold shadow-[0_0_12px_rgba(106,218,27,0.5)] hover:shadow-[0_0_22px_rgba(106,218,27,0.8),0_0_40px_rgba(106,218,27,0.3)] disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-200 flex items-center gap-1"
                    >
                      {isGeneratingQueryPlan && (
                        <span className="material-icons-round text-[13px] animate-spin">refresh</span>
                      )}
                      {!isGeneratingQueryPlan && (
                        <span className="material-icons-round text-[13px]">auto_awesome</span>
                      )}
                      {isGeneratingQueryPlan ? "Generating..." : "Generate Query"}
                    </button>
                    {queryQuotaExhausted && (
                      <span className="text-[11px] text-amber-600 font-medium flex items-center gap-0.5">
                        <span className="material-icons-round text-[13px]">info</span>
                        Daily query limit reached ({queryLimitCount}/{queryLimitCount})
                      </span>
                    )}
                    {selectedQueryModelExhausted && !queryQuotaExhausted && (
                      <span className="text-[11px] text-amber-600 font-medium flex items-center gap-0.5">
                        <span className="material-icons-round text-[13px]">info</span>
                        {MODEL_REGISTRY.find((m) => m.id === queryModelId)?.displayName} limit reached. Try another model.
                      </span>
                    )}
                  </div>
                </div>
              </div>
            </section>

            {/* Step 2 - Visible when generatedSql || tableName */}
            {(generatedSql || tableName) && (
              <section
                id="step-2"
                onFocusCapture={() => setActiveSection(2)}
                onClickCapture={() => setActiveSection(2)}
                className={`bg-card rounded-2xl border-[1.3px] border-lime-300 transition-all duration-200 relative p-6 ${activeSection === 2 ? "shadow-[0_0_22px_rgba(106,218,27,0.22),_0_4px_12px_rgba(106,218,27,0.1),_inset_0_1px_0_rgba(106,218,27,0.2)]" : "shadow-sm hover:shadow-md"}`}
              >
                <div className="flex items-center gap-2 mb-4">
                  <span
                    className={`flex items-center justify-center w-6 h-6 rounded-full text-[13px] font-bold ring-2 transition-colors duration-300 ${
                      activeSection === 2
                        ? "bg-primary text-slate-custom-900 ring-primary/20"
                        : "bg-slate-custom-200 text-slate-custom-500 ring-slate-custom-200"
                    }`}
                  >
                    2
                  </span>
                  <h3
                    className={`font-bold text-[15px] uppercase tracking-wide transition-colors duration-300 ${
                      activeSection === 2 ? "text-slate-custom-900" : "text-slate-custom-500"
                    }`}
                  >
                    Review Query
                  </h3>
                </div>

                <div className="bg-card rounded-xl border border-slate-custom-200 shadow-sm hover:shadow-md transition-shadow duration-200 mb-5 overflow-hidden">
                  <div className="px-3 py-2 border-b border-slate-custom-100 flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <span className="font-semibold text-[13px] text-slate-custom-700">
                        Generated Query
                      </span>
                      {tableName && !sqlUserEdited && (
                        <span className="px-2 py-0.5 rounded bg-primary/15 text-primary text-[11px] font-bold">
                          {tableName}
                        </span>
                      )}
                      <button
                        onClick={() => {
                          promptRef.current?.scrollIntoView({ behavior: "smooth" });
                          promptRef.current?.focus();
                        }}
                        className="text-[11px] text-primary hover:underline"
                      >
                        ← Revise question
                      </button>
                    </div>
                    <div className="flex flex-col items-end gap-1">
                      <button
                        onClick={runGeneratedQuery}
                        disabled={isRunningQuery || !generatedSql.trim() || queryQuotaExhausted}
                        className="px-2.5 py-1.5 rounded-full bg-gradient-to-r from-primary to-green-400 text-slate-custom-900 text-[11px] font-bold shadow-[0_0_12px_rgba(106,218,27,0.5)] hover:shadow-[0_0_22px_rgba(106,218,27,0.8),0_0_40px_rgba(106,218,27,0.3)] disabled:opacity-50 transition-all duration-200 flex items-center gap-1"
                      >
                        {isRunningQuery ? (
                          <span className="material-icons-round text-[11px] animate-spin">refresh</span>
                        ) : (
                          <svg className="w-3 h-3" viewBox="0 0 16 16" fill="currentColor"><path d="M4 2l10 6-10 6V2z" /></svg>
                        )}
                        {isRunningQuery ? "Running..." : "Run Query"}
                      </button>
                      {queryQuotaExhausted && (
                        <span className="text-[11px] text-amber-600 font-medium flex items-center gap-0.5">
                          <span className="material-icons-round text-[13px]">info</span>
                          Daily query limit reached ({queryLimitCount}/{queryLimitCount})
                        </span>
                      )}
                    </div>
                  </div>
                  <div className="px-3 py-2 border-b border-slate-custom-100 text-[13px] text-slate-custom-600">
                    {analysisExplanation || "Generate a query, review it, then run it."}
                  </div>
                  <div className="px-3 pb-3">
                    <div>
                      <div className="flex items-center justify-between mb-0.5">
                        <span className="text-[11px] font-bold uppercase tracking-wider text-slate-custom-400">
                          SQL Preview
                        </span>
                        <div className="relative group">
                          <button
                            onClick={copySql}
                            disabled={!generatedSql}
                            className="p-0.5 rounded text-primary hover:text-green-400 hover:drop-shadow-[0_0_6px_rgba(106,218,27,0.6)] disabled:opacity-40 transition-all flex items-center"
                          >
                            <span className="material-icons-round text-[15px]">content_copy</span>
                          </button>
                          <span className="absolute bottom-full left-1/2 -translate-x-1/2 mb-1.5 px-2 py-0.5 rounded text-[11px] font-bold text-primary bg-card border border-green-200 shadow-sm whitespace-nowrap opacity-0 group-hover:opacity-100 pointer-events-none transition-opacity z-50">Copy SQL</span>
                        </div>
                      </div>
                      <textarea
                        value={generatedSql || ""}
                        onChange={(e) => {
                          setGeneratedSql(e.target.value);
                          setSqlUserEdited(true);
                        }}
                        placeholder="Paste SQL here to run directly, or generate one above..."
                        className="w-full h-[120px] rounded border border-primary/40 bg-primary/5 px-3 py-2 text-[12px] font-mono text-slate-custom-700 focus:outline-none focus:ring-2 focus:ring-primary/40 cursor-text resize-y"
                      />
                    </div>
                  </div>
                </div>

                <div className="flex items-center justify-between mb-4 opacity-70">
                  <div className="flex items-center gap-2">
                    <span className="flex items-center justify-center w-6 h-6 rounded-full bg-slate-custom-200 text-slate-custom-500 text-[13px] font-bold border border-slate-custom-300">
                      2.5
                    </span>
                    <h3 className="font-bold text-[15px] text-slate-custom-500 uppercase tracking-wide">
                      Logic Process
                    </h3>
                  </div>
                  <div className="flex items-center gap-3 text-[13px] text-slate-custom-500 font-medium">
                    <span className="flex items-center gap-1 px-2 py-1">
                      <span className="material-icons-round text-[15px] text-primary">
                        table_rows
                      </span>
                      {rowCount || chartData.length} rows
                    </span>
                    <span className="flex items-center gap-1 px-2 py-1">
                      <span className="material-icons-round text-[15px] text-primary">
                        timer
                      </span>
                      {executionTimeMs !== null ? `${executionTimeMs}ms` : "—"}
                    </span>
                  </div>
                </div>

                <div className="relative pl-3 border-l-2 border-slate-custom-200 space-y-3 ml-3">
                  <div className="relative">
                    <span
                      className={`absolute -left-[19px] top-1 w-3 h-3 rounded-full ring-4 ring-slate-custom-50 ${
                        generatedSql ? "bg-green-400 shadow-[0_0_6px_rgba(74,222,128,0.6)]" : isGeneratingQueryPlan ? "bg-yellow-400 animate-pulse shadow-[0_0_6px_rgba(250,204,21,0.5)]" : "bg-slate-300"
                      }`}
                    />
                    <div className="bg-card p-3 rounded border border-slate-custom-200 shadow-sm">
                      <div className="flex items-center justify-between text-[13px] mb-1">
                        <span className="font-mono text-slate-custom-500">
                          {tableName ? `TABLE ${tableName}` : "SQL GENERATION"}
                        </span>
                        {isGeneratingQueryPlan && (
                          <span className="text-yellow-500 font-bold flex items-center gap-1">
                            <span className="material-icons-round text-[11px] animate-spin">refresh</span>
                            In Progress
                          </span>
                        )}
                        {!isGeneratingQueryPlan && generatedSql && (
                          <span className="text-green-500 font-bold flex items-center gap-1">
                            <span className="material-icons-round text-[11px]">check</span>
                            Success
                          </span>
                        )}
                      </div>
                      <code className="text-[11px] text-slate-custom-600 font-mono block overflow-hidden whitespace-nowrap text-ellipsis">
                        {isGeneratingQueryPlan ? "Generating SQL..." : generatedSql || "Waiting for query..."}
                      </code>
                    </div>
                  </div>

                  <div className="relative">
                    <span
                      className={`absolute -left-[19px] top-1 w-3 h-3 rounded-full ring-4 ring-slate-custom-50 ${
                        hasChartData ? "bg-green-400 shadow-[0_0_6px_rgba(74,222,128,0.6)]" : isRunningQuery ? "bg-yellow-400 animate-pulse shadow-[0_0_6px_rgba(250,204,21,0.5)]" : "bg-slate-300"
                      }`}
                    />
                    <div className="bg-card p-3 rounded border border-slate-custom-200 shadow-sm">
                      <div className="flex items-center justify-between text-[13px] mb-1">
                        <span className="font-mono text-slate-custom-500">
                          TRANSFORM
                        </span>
                        {isRunningQuery && (
                          <span className="text-yellow-500 font-bold flex items-center gap-1">
                            <span className="material-icons-round text-[11px] animate-spin">refresh</span>
                            Running
                          </span>
                        )}
                        {!isRunningQuery && hasChartData && (
                          <span className="text-green-500 font-bold flex items-center gap-1">
                            <span className="material-icons-round text-[11px]">check</span>
                            Done
                          </span>
                        )}
                      </div>
                      <div className="text-[13px] text-slate-custom-700">
                        {isRunningQuery
                          ? "Executing query and transforming data..."
                          : hasChartData
                          ? hasMultiSeriesChartData
                            ? `Mapped ${multiSeriesData.length} points × ${seriesKeys.length} series`
                            : `Mapped ${chartData.length} points (${xField || "x"} → ${yField || "y"})`
                          : "Waiting for result rows..."}
                      </div>
                    </div>
                  </div>

                  <div className="relative">
                    <span
                      className={`absolute -left-[19px] top-1 w-3 h-3 rounded-full ring-4 ${
                        hasChartData
                          ? "bg-primary ring-primary/20"
                          : isRunningQuery
                          ? "bg-yellow-400 ring-slate-custom-50 animate-pulse"
                          : "bg-slate-300 ring-slate-custom-50"
                      }`}
                    />
                    <div
                      className={`bg-card p-3 rounded shadow-sm border ${
                        hasChartData
                          ? "border-primary/50"
                          : "border-slate-custom-200"
                      }`}
                    >
                      <div className="flex items-center justify-between text-[13px] mb-1">
                        <span
                          className={`font-mono font-bold ${
                            hasChartData ? "text-primary" : "text-slate-custom-500"
                          }`}
                        >
                          CHART READY
                        </span>
                        {hasChartData && (
                          <span className="text-primary font-bold flex items-center gap-1">
                            <span className="material-icons-round text-[11px]">
                              check_circle
                            </span>
                            Complete
                          </span>
                        )}
                      </div>
                      <div className="text-[13px] text-slate-custom-600">
                        {hasChartData
                          ? hasMultiSeriesChartData
                            ? `${multiSeriesData.length} points • ${seriesKeys.length} series (${seriesKeys.join(", ")}) • multiLine chart`
                            : `${chartData.length} points rendered • ${chartConfig.chartType} chart`
                          : "Run a query to enable chart rendering."}
                      </div>
                      {analysisExplanation && (
                        <div className="text-[12px] text-slate-custom-500 mt-2">
                          {analysisExplanation}
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              </section>
            )}

            {/* Step 3 - Visible when chartData or rawData exists */}
            {(chartData.length > 0 || rawData.length > 0) && (
              <section
                id="step-3"
                onFocusCapture={() => setActiveSection(3)}
                onClickCapture={() => setActiveSection(3)}
                className={`bg-card rounded-2xl overflow-y-auto max-h-[80vh] relative border-[1.3px] border-lime-300 transition-all duration-200 pt-[18px] ${activeSection === 3 ? "shadow-[0_0_22px_rgba(106,218,27,0.22),_0_4px_12px_rgba(106,218,27,0.1),_inset_0_1px_0_rgba(106,218,27,0.2)]" : "shadow-sm hover:shadow-md"}`}
              >
                <div className="absolute top-0 left-0 w-full h-[2px] bg-gradient-to-r from-primary to-transparent opacity-30" />
                <div className="px-5 pt-1 border-b border-slate-custom-100 flex justify-between items-center bg-slate-custom-50/50">
                  <div className="flex items-center gap-2">
                    <span className={`flex items-center justify-center w-6 h-6 rounded-full text-[13px] font-bold ring-2 transition-colors duration-300 ${activeSection === 3 ? "bg-primary text-slate-custom-900 ring-primary/20 shadow-[0_0_8px_rgba(106,218,27,0.4)]" : "bg-slate-custom-200 text-slate-custom-500 ring-slate-custom-200"}`}>
                      3
                    </span>
                    <h3 className={`font-bold text-[15px] uppercase tracking-wide transition-colors duration-300 ${activeSection === 3 ? "text-slate-custom-900" : "text-slate-custom-500"}`}>
                      Visualization &amp; Data
                    </h3>
                  </div>
                  <div className="flex items-start gap-1.5 pb-1">
                    <div className="flex bg-slate-custom-100 rounded p-px border border-slate-custom-200">
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
                          className={`px-1.5 py-0 rounded text-[8px] font-medium flex items-center gap-px transition-colors leading-tight ${
                            chartConfig.chartType === ct.value
                              ? "bg-card text-primary shadow-sm border border-slate-custom-200 font-bold"
                              : "text-slate-custom-500 hover:text-slate-custom-900"
                          }`}
                        >
                          <span className="material-icons-round text-[10px]">
                            {ct.icon}
                          </span>
                          {ct.label}
                        </button>
                      ))}
                    </div>
                    {multiSeriesData.length > 0 && seriesKeys.length > 1 && chartData.length > 0 && (
                      <div className="flex bg-slate-custom-100 rounded p-px border border-slate-custom-200">
                        <button
                          onClick={() => setChartConfig((c) => ({ ...c, chartType: "line" }))}
                          className={`px-1.5 py-0 rounded text-[8px] font-medium flex items-center gap-px transition-colors leading-tight ${
                            chartConfig.chartType !== "multiLine"
                              ? "bg-card text-primary shadow-sm border border-slate-custom-200 font-bold"
                              : "text-slate-custom-500 hover:text-slate-custom-900"
                          }`}
                        >
                          <span className="material-icons-round text-[10px]">show_chart</span>
                          1 Line
                        </button>
                        <button
                          onClick={() => setChartConfig((c) => ({ ...c, chartType: "multiLine" }))}
                          className={`px-1.5 py-0 rounded text-[8px] font-medium flex items-center gap-px transition-colors leading-tight ${
                            chartConfig.chartType === "multiLine"
                              ? "bg-card text-primary shadow-sm border border-slate-custom-200 font-bold"
                              : "text-slate-custom-500 hover:text-slate-custom-900"
                          }`}
                        >
                          <span className="material-icons-round text-[10px]">stacked_line_chart</span>
                          {seriesKeys.length} Lines
                        </button>
                      </div>
                    )}
                    <button
                      onClick={() => setShowCustomizer((v) => !v)}
                      className={`flex items-center gap-1 px-2 py-0.5 rounded-md text-[11px] font-bold transition-all duration-200 ${
                        showCustomizer
                          ? "bg-card border border-green-200 shadow-[0_0_8px_rgba(22,163,74,0.15)] text-green-600"
                          : "bg-card border border-green-200 shadow-[0_0_8px_rgba(22,163,74,0.15)] hover:shadow-[0_0_14px_rgba(22,163,74,0.3)] text-green-600 hover:text-green-500"
                      }`}
                    >
                      <span className="material-icons-round text-[13px]">tune</span>
                      Customize
                    </button>
                  </div>
                </div>

                <div
                  className="px-4 min-h-[370px]"
                  style={{ backgroundColor: chartConfig.backgroundColor }}
                >
                  {chartConfig.title && (
                    <h4
                      className="text-center font-bold"
                      style={{
                        color: ensureContrast(chartConfig.titleColor, chartConfig.backgroundColor, "#f1f5f9"),
                        fontSize: `${chartConfig.titleSize}px`,
                        fontFamily: chartConfig.titleFont,
                        paddingTop: `${chartConfig.titlePaddingTop}px`,
                        paddingBottom: `${chartConfig.titlePaddingBottom}px`,
                      }}
                    >
                      {chartConfig.title}
                    </h4>
                  )}

                  <div className={hasMultiSeriesChartData ? "h-[340px]" : "h-[320px]"}>
                    {hasChartData ? (
                      <ResponsiveContainer width="100%" height="100%">
                        {chartConfig.chartType === "multiLine" && hasMultiSeriesChartData ? (
                          <LineChart
                            data={multiSeriesData}
                            margin={{ top: chartConfig.paddingTop, right: chartConfig.paddingRight, bottom: chartConfig.paddingBottom, left: chartConfig.paddingLeft }}
                          >
                            {chartConfig.showGrid && (
                              <CartesianGrid stroke={chartConfig.gridColor} strokeDasharray={chartConfig.gridLineStyle === "dotted" ? "2 4" : chartConfig.gridLineStyle === "solid" ? "0" : "4 4"} />
                            )}
                            <XAxis
                              dataKey="label"
                              tick={{
                                fontSize: chartConfig.xAxisFontSize,
                                fill: ensureContrast(chartConfig.xAxisFontColor, chartConfig.backgroundColor, "#94a3b8"),
                                fontFamily: chartConfig.axisFont,
                              }}
                              axisLine={{ stroke: chartConfig.xAxisLineColor, strokeWidth: chartConfig.xAxisLineWidth }}
                              tickLine={{ stroke: chartConfig.xAxisLineColor }}
                            />
                            <YAxis
                              tick={{
                                fontSize: chartConfig.yAxisFontSize,
                                fill: ensureContrast(chartConfig.yAxisFontColor, chartConfig.backgroundColor, "#94a3b8"),
                                fontFamily: chartConfig.axisFont,
                              }}
                              axisLine={{ stroke: chartConfig.yAxisLineColor, strokeWidth: chartConfig.yAxisLineWidth }}
                              tickLine={{ stroke: chartConfig.yAxisLineColor }}
                              tickFormatter={(v: number) => v.toLocaleString("en-US")}
                            />
                            <Tooltip formatter={(value: number | undefined) => (value ?? 0).toLocaleString("en-US")} />
                            {seriesKeys.map((key, i) => (
                              <Line
                                key={key}
                                type="monotone"
                                dataKey={key}
                                stroke={SERIES_COLORS[i % SERIES_COLORS.length]}
                                strokeWidth={2.5}
                                dot={{ r: 3, fill: SERIES_COLORS[i % SERIES_COLORS.length] }}
                                activeDot={{ r: 5 }}
                              />
                            ))}
                          </LineChart>
                        ) : chartConfig.chartType === "line" ? (
                          <LineChart
                            data={chartData}
                            margin={{ top: chartConfig.paddingTop, right: chartConfig.paddingRight, bottom: chartConfig.paddingBottom, left: chartConfig.paddingLeft }}
                          >
                            {chartConfig.showGrid && (
                              <CartesianGrid stroke={chartConfig.gridColor} strokeDasharray={chartConfig.gridLineStyle === "dotted" ? "2 4" : chartConfig.gridLineStyle === "solid" ? "0" : "4 4"} />
                            )}
                            <XAxis
                              dataKey="label"
                              tick={{
                                fontSize: chartConfig.xAxisFontSize,
                                fill: ensureContrast(chartConfig.xAxisFontColor, chartConfig.backgroundColor, "#94a3b8"),
                                fontFamily: chartConfig.axisFont,
                              }}
                              axisLine={{ stroke: chartConfig.xAxisLineColor, strokeWidth: chartConfig.xAxisLineWidth }}
                              tickLine={{ stroke: chartConfig.xAxisLineColor }}
                            />
                            <YAxis
                              tick={{
                                fontSize: chartConfig.yAxisFontSize,
                                fill: ensureContrast(chartConfig.yAxisFontColor, chartConfig.backgroundColor, "#94a3b8"),
                                fontFamily: chartConfig.axisFont,
                              }}
                              axisLine={{ stroke: chartConfig.yAxisLineColor, strokeWidth: chartConfig.yAxisLineWidth }}
                              tickLine={{ stroke: chartConfig.yAxisLineColor }}
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
                            margin={{ top: chartConfig.paddingTop, right: chartConfig.paddingRight, bottom: chartConfig.paddingBottom, left: chartConfig.paddingLeft }}
                          >
                            {chartConfig.showGrid && (
                              <CartesianGrid stroke={chartConfig.gridColor} strokeDasharray={chartConfig.gridLineStyle === "dotted" ? "2 4" : chartConfig.gridLineStyle === "solid" ? "0" : "4 4"} />
                            )}
                            <XAxis
                              type="number"
                              tick={{
                                fontSize: chartConfig.xAxisFontSize,
                                fill: ensureContrast(chartConfig.xAxisFontColor, chartConfig.backgroundColor, "#94a3b8"),
                                fontFamily: chartConfig.axisFont,
                              }}
                              axisLine={{ stroke: chartConfig.xAxisLineColor, strokeWidth: chartConfig.xAxisLineWidth }}
                              tickLine={{ stroke: chartConfig.xAxisLineColor }}
                            />
                            <YAxis
                              type="category"
                              dataKey="label"
                              width={40}
                              tick={{
                                fontSize: chartConfig.yAxisFontSize,
                                fill: ensureContrast(chartConfig.yAxisFontColor, chartConfig.backgroundColor, "#94a3b8"),
                                fontFamily: chartConfig.axisFont,
                              }}
                              axisLine={{ stroke: chartConfig.yAxisLineColor, strokeWidth: chartConfig.yAxisLineWidth }}
                              tickLine={{ stroke: chartConfig.yAxisLineColor }}
                            />
                            <Tooltip />
                            <Bar
                              dataKey="value"
                              fill={chartConfig.barColor}
                              radius={[0, 6, 6, 0]}
                              barSize={chartConfig.barWidth ?? 28}
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
                            margin={{ top: chartConfig.paddingTop, right: chartConfig.paddingRight, bottom: chartConfig.paddingBottom, left: chartConfig.paddingLeft }}
                          >
                            {chartConfig.showGrid && (
                              <CartesianGrid stroke={chartConfig.gridColor} strokeDasharray={chartConfig.gridLineStyle === "dotted" ? "2 4" : chartConfig.gridLineStyle === "solid" ? "0" : "4 4"} />
                            )}
                            <XAxis
                              dataKey="label"
                              tick={{
                                fontSize: chartConfig.xAxisFontSize,
                                fill: ensureContrast(chartConfig.xAxisFontColor, chartConfig.backgroundColor, "#94a3b8"),
                                fontFamily: chartConfig.axisFont,
                              }}
                              axisLine={{ stroke: chartConfig.xAxisLineColor, strokeWidth: chartConfig.xAxisLineWidth }}
                              tickLine={{ stroke: chartConfig.xAxisLineColor }}
                            />
                            <YAxis
                              tick={{
                                fontSize: chartConfig.yAxisFontSize,
                                fill: ensureContrast(chartConfig.yAxisFontColor, chartConfig.backgroundColor, "#94a3b8"),
                                fontFamily: chartConfig.axisFont,
                              }}
                              axisLine={{ stroke: chartConfig.yAxisLineColor, strokeWidth: chartConfig.yAxisLineWidth }}
                              tickLine={{ stroke: chartConfig.yAxisLineColor }}
                            />
                            <Tooltip />
                            <Bar
                              dataKey="value"
                              fill={chartConfig.barColor}
                              radius={[6, 6, 0, 0]}
                              barSize={chartConfig.barWidth ?? 28}
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
                      <div className="h-full w-full relative">
                        <div className="absolute inset-0 opacity-40 pointer-events-none">
                          <ResponsiveContainer width="100%" height="100%">
                            <BarChart data={DEMO_CHART_DATA} margin={{ top: 10, right: 20, bottom: 20, left: 20 }}>
                              <CartesianGrid stroke={chartConfig.gridColor} strokeDasharray={chartConfig.gridLineStyle === "dotted" ? "2 4" : chartConfig.gridLineStyle === "solid" ? "0" : "4 4"} />
                              <XAxis dataKey="label" tick={{ fontSize: 10, fill: "#94a3b8" }} />
                              <YAxis tick={{ fontSize: 10, fill: "#94a3b8" }} />
                              <Bar dataKey="value" fill="#6ada1b" radius={[6, 6, 0, 0]} barSize={28} />
                            </BarChart>
                          </ResponsiveContainer>
                        </div>
                        <div className="absolute inset-0 flex items-center justify-center">
                          <span className="px-4 py-2 rounded-full bg-card/90 border border-slate-custom-200 text-[13px] font-medium text-slate-custom-500 shadow-sm backdrop-blur-sm">
                            Run a query to visualize real data
                          </span>
                        </div>
                      </div>
                    )}
                  </div>

                  {hasMultiSeriesChartData && (
                    <div className="flex flex-wrap items-center justify-center gap-3 px-4 py-1.5">
                      {seriesKeys.map((key, i) => (
                        <div key={key} className="flex items-center gap-2.5">
                          <span
                            className="inline-block w-3 h-3 rounded-full flex-shrink-0"
                            style={{ backgroundColor: SERIES_COLORS[i % SERIES_COLORS.length] }}
                          />
                          <span className="text-[11px] font-semibold text-slate-custom-600">{key}</span>
                        </div>
                      ))}
                    </div>
                  )}

                  {(chartConfig.sourceText || chartConfig.bottomRightText) && (
                    <div
                      className="flex justify-between items-end italic"
                      style={{
                        color: chartConfig.sourceColor,
                        fontSize: `${chartConfig.sourceFontSize * 0.7}px`,
                        fontFamily: chartConfig.sourceFont,
                        paddingTop: `${chartConfig.sourcePaddingTop}px`,
                        paddingBottom: `${chartConfig.sourcePaddingBottom}px`,
                      }}
                    >
                      <span>{chartConfig.sourceText}</span>
                      <span>{chartConfig.bottomRightText}</span>
                    </div>
                  )}
                </div>

                <div className="px-5 py-1 border-t border-slate-custom-100 bg-slate-custom-50/50 flex items-center justify-between">
                  <div className="flex items-center gap-2 text-[13px] text-slate-custom-500">
                    <span className="material-icons-round text-[15px]">info</span>
                    Generate a high-res image for export
                  </div>
                  <div className="flex flex-col items-end gap-1">
                    {multiSeriesData.length > 0 && seriesKeys.length > 1 && chartData.length > 0 && (
                      <div className="flex items-center gap-1.5">
                        <span className="text-[10px] text-slate-custom-400 font-medium">Style:</span>
                        <div className="flex bg-slate-custom-100 rounded p-px border border-slate-custom-200">
                          <button
                            onClick={() => setChartConfig((c) => ({ ...c, chartType: "line" }))}
                            className={`px-1.5 py-0.5 rounded text-[10px] font-medium flex items-center gap-0.5 transition-colors leading-tight ${
                              chartConfig.chartType !== "multiLine"
                                ? "bg-card text-primary shadow-sm border border-slate-custom-200 font-bold"
                                : "text-slate-custom-500 hover:text-slate-custom-900"
                            }`}
                          >
                            <span className="material-icons-round text-[10px]">show_chart</span>
                            1 Line
                          </button>
                          <button
                            onClick={() => setChartConfig((c) => ({ ...c, chartType: "multiLine" }))}
                            className={`px-1.5 py-0.5 rounded text-[10px] font-medium flex items-center gap-0.5 transition-colors leading-tight ${
                              chartConfig.chartType === "multiLine"
                                ? "bg-card text-primary shadow-sm border border-slate-custom-200 font-bold"
                                : "text-slate-custom-500 hover:text-slate-custom-900"
                            }`}
                          >
                            <span className="material-icons-round text-[10px]">stacked_line_chart</span>
                            {seriesKeys.length} Lines
                          </button>
                        </div>
                      </div>
                    )}
                    <div className="flex items-center gap-2">
                      <select
                        value={chartResolution}
                        onChange={(e) => setChartResolution(e.target.value as "hd" | "fhd" | "2k" | "4k")}
                        disabled={isGeneratingImage}
                        className="text-[11px] font-mono bg-card border border-slate-custom-200 rounded-md px-1.5 py-1 text-slate-custom-600 focus:outline-none focus:border-primary/50 disabled:opacity-50"
                      >
                        <option value="hd">HD  1200×675</option>
                        <option value="fhd">FHD 1920×1080</option>
                        <option value="2k">2K  2560×1440</option>
                        <option value="4k">4K  3840×2160</option>
                      </select>
                      <span className="text-[11px] font-mono text-slate-custom-400">
                        {chartUsageCount}/{chartLimitCount}
                      </span>
                      <button
                        onClick={generateChartImage}
                        disabled={isGeneratingImage || !hasChartData || chartQuotaExhausted}
                        className="px-2.5 py-1.5 rounded-full bg-gradient-to-r from-primary to-green-400 text-slate-custom-900 text-[11px] font-bold shadow-[0_0_12px_rgba(106,218,27,0.5)] hover:shadow-[0_0_22px_rgba(106,218,27,0.8),0_0_40px_rgba(106,218,27,0.3)] disabled:opacity-50 transition-all duration-200 flex items-center gap-1"
                      >
                      {isGeneratingImage ? (
                        <span className="material-icons-round text-[15px] animate-spin">refresh</span>
                      ) : (
                        <svg className="w-3 h-3" viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                          <rect x="3" y="5" width="14" height="11" rx="2" />
                          <path d="M3 13l4-4 3 3 2.5-2.5L17 13" />
                          <circle cx="7.5" cy="8.5" r="1" fill="currentColor" stroke="none" />
                          <path d="M15 2l0.6 1.4L17 4l-1.4 0.6L15 6l-0.6-1.4L13 4l1.4-0.6Z" fill="currentColor" stroke="none" />
                          <path d="M1.5 3l0.4 0.9L3 4.3l-1.1 0.4L1.5 5.6l-0.4-0.9L0 4.3l1.1-0.4Z" fill="currentColor" stroke="none" />
                        </svg>
                      )}
                        {isGeneratingImage ? "Generating..." : "Generate Image"}
                      </button>
                    </div>
                    {chartQuotaExhausted && (
                      <span className="text-[11px] text-amber-600 font-medium flex items-center gap-0.5">
                        <span className="material-icons-round text-[13px]">info</span>
                        Daily chart limit reached ({chartLimitCount}/{chartLimitCount})
                      </span>
                    )}
                  </div>
                </div>

                {chartImage && (
                  <div className="px-5 pt-1.5 pb-4 border-t border-slate-custom-100 bg-card">
                    <div className="flex items-center">
                      {/* Left: label */}
                      <span className="text-[13px] font-bold text-slate-custom-700 uppercase tracking-wide flex items-center gap-1 flex-shrink-0">
                        <span className="material-icons-round text-[15px] text-primary">
                          check_circle
                        </span>
                        Generated Image
                      </span>
                      {/* Center: zoom/pan controls */}
                      <div className="flex-1 flex items-center justify-center gap-1.5">
                        <button
                          onClick={() => { setImgZoom((z) => Math.max(0.25, Math.round((z - 0.1) * 10) / 10)); }}
                          className="w-6 h-6 rounded-md border border-slate-custom-200 flex items-center justify-center text-slate-custom-500 hover:text-primary hover:border-primary/50 hover:shadow-[0_0_8px_rgba(106,218,27,0.45)] transition-all"
                          title="Zoom out"
                        >
                          <span className="material-icons-round text-[13px]">remove</span>
                        </button>
                        <span className="text-[10px] font-mono text-slate-custom-500 w-8 text-center">
                          {Math.round(imgZoom * 100)}%
                        </span>
                        <button
                          onClick={() => { setImgZoom((z) => Math.min(5, Math.round((z + 0.1) * 10) / 10)); }}
                          className="w-6 h-6 rounded-md border border-slate-custom-200 flex items-center justify-center text-slate-custom-500 hover:text-primary hover:border-primary/50 hover:shadow-[0_0_8px_rgba(106,218,27,0.45)] transition-all"
                          title="Zoom in"
                        >
                          <span className="material-icons-round text-[13px]">add</span>
                        </button>
                        <button
                          onClick={() => setPanMode((v) => !v)}
                          className={`w-6 h-6 rounded-md border flex items-center justify-center transition-all ${
                            panMode
                              ? "border-primary bg-primary/10 text-primary"
                              : "border-slate-custom-200 text-slate-custom-500 hover:text-primary hover:border-primary/50"
                          }`}
                          title="Pan / drag"
                        >
                          <span className="material-icons-round text-[13px]">pan_tool</span>
                        </button>
                        <button
                          onClick={() => { setImgZoom(1); setImgPan({ x: 0, y: 0 }); setPanMode(false); }}
                          className="w-6 h-6 rounded-md border border-slate-custom-200 flex items-center justify-center text-slate-custom-500 hover:text-primary hover:border-primary/50 hover:shadow-[0_0_8px_rgba(106,218,27,0.45)] transition-all"
                          title="Reset view"
                        >
                          <span className="material-icons-round text-[13px]">fit_screen</span>
                        </button>
                      </div>
                      {/* Right: export actions */}
                      <div className="flex items-center gap-1.5 flex-shrink-0">
                        <div className="relative group">
                          <button
                            onClick={copyChartToClipboard}
                            className="text-slate-custom-400 hover:text-primary hover:drop-shadow-[0_0_6px_rgba(106,218,27,0.6)] transition-all"
                          >
                            <span className="material-icons-round text-[15px]">content_copy</span>
                          </button>
                          <span className="absolute bottom-full left-1/2 -translate-x-1/2 mb-1.5 px-2 py-0.5 rounded text-[11px] font-bold text-primary bg-card border border-green-200 shadow-sm whitespace-nowrap opacity-0 group-hover:opacity-100 pointer-events-none transition-opacity">Copy Image</span>
                        </div>
                        <div className="relative group">
                          <button
                            onClick={downloadImage}
                            className="text-slate-custom-400 hover:text-primary hover:drop-shadow-[0_0_6px_rgba(106,218,27,0.6)] transition-all"
                          >
                            <span className="material-icons-round text-[15px]">download</span>
                          </button>
                          <span className="absolute bottom-full left-1/2 -translate-x-1/2 mb-1.5 px-2 py-0.5 rounded text-[11px] font-bold text-primary bg-card border border-green-200 shadow-sm whitespace-nowrap opacity-0 group-hover:opacity-100 pointer-events-none transition-opacity">Download PNG Image</span>
                        </div>
                        <div className="relative group">
                          <button
                            onClick={() => setChartImage(null)}
                            className="text-slate-custom-400 hover:text-slate-custom-600 transition-colors"
                          >
                            <span className="material-icons-round text-[15px]">close</span>
                          </button>
                          <span className="absolute bottom-full left-1/2 -translate-x-1/2 mb-1.5 px-2 py-0.5 rounded text-[11px] font-bold text-primary bg-card border border-green-200 shadow-sm whitespace-nowrap opacity-0 group-hover:opacity-100 pointer-events-none transition-opacity">Delete the image</span>
                        </div>
                      </div>
                    </div>
                    <div className="relative w-full h-[600px] flex items-center justify-center rounded-lg border border-slate-custom-200 shadow-[0_4px_24px_rgba(0,0,0,0.10)] overflow-hidden select-none"
                      onWheel={(e) => {
                        e.preventDefault();
                        setImgZoom((z) => Math.min(5, Math.max(0.25, z + (e.deltaY < 0 ? 0.1 : -0.1))));
                      }}
                      onMouseDown={(e) => {
                        if (!panMode) return;
                        e.preventDefault();
                        setIsPanning(true);
                        panStart.current = { x: e.clientX, y: e.clientY };
                        panOrigin.current = { ...imgPan };
                      }}
                      onMouseMove={(e) => {
                        if (!isPanning) return;
                        setImgPan({
                          x: panOrigin.current.x + (e.clientX - panStart.current.x),
                          y: panOrigin.current.y + (e.clientY - panStart.current.y),
                        });
                      }}
                      onMouseUp={() => setIsPanning(false)}
                      onMouseLeave={() => setIsPanning(false)}
                      style={{ cursor: panMode ? (isPanning ? "grabbing" : "grab") : "default" }}
                    >
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img
                        src={chartImage}
                        alt="Generated chart"
                        draggable={false}
                        className="max-h-full max-w-full block mx-auto transition-transform duration-100"
                        style={{
                          transform: `scale(${imgZoom}) translate(${imgPan.x / imgZoom}px, ${imgPan.y / imgZoom}px)`,
                          transformOrigin: "center center",
                        }}
                      />
                    </div>
                  </div>
                )}
              </section>
            )}

            {/* Step 4 - Visible when chartData exists */}
            {chartData.length > 0 && (
              <section
                id="step-4"
                onFocusCapture={() => setActiveSection(4)}
                onClickCapture={() => setActiveSection(4)}
                className={`bg-card rounded-2xl overflow-auto border-[1.3px] border-lime-300 transition-all duration-200 ${activeSection === 4 ? "shadow-[0_0_22px_rgba(106,218,27,0.22),_0_4px_12px_rgba(106,218,27,0.1),_inset_0_1px_0_rgba(106,218,27,0.2)]" : "shadow-sm hover:shadow-md"}`}
              >
                <div className="px-5 pt-1 border-b border-slate-custom-100 flex justify-between items-center bg-slate-custom-50/50">
                  <div className="flex items-center gap-2">
                    <span className={`flex items-center justify-center w-6 h-6 rounded-full text-[13px] font-bold ring-2 transition-colors duration-300 ${activeSection === 4 ? "bg-primary text-slate-custom-900 ring-primary/20 shadow-[0_0_8px_rgba(106,218,27,0.4)]" : "bg-slate-custom-200 text-slate-custom-500 ring-slate-custom-200"}`}>
                      4
                    </span>
                    <h3 className={`font-bold text-[15px] uppercase tracking-wide transition-colors duration-300 ${activeSection === 4 ? "text-slate-custom-900" : "text-slate-custom-500"}`}>
                      Analyst Composer
                    </h3>
                  </div>
                  <div className="flex items-center gap-2">
                    {/* Model Dropdown */}
                    <div className="flex flex-col">
                      <div className="relative">
                        <button
                          onClick={() => setIsModelDropdownOpen((v) => !v)}
                          className="flex items-center gap-1.5 text-[13px] font-medium text-slate-custom-600 px-2.5 py-1.5 rounded-lg hover:text-primary hover:shadow-[0_0_8px_rgba(106,218,27,0.35)] transition-all duration-200"
                        >
                          <span className="material-icons-round text-[15px] text-primary">smart_toy</span>
                          <span className="max-w-[100px] truncate">
                            {MODEL_REGISTRY.find((m) => m.id === selectedModelId)?.displayName ?? "GPT-4o Mini"}
                          </span>
                          <span className="material-icons-round text-[15px] text-slate-custom-400">expand_more</span>
                        </button>
                      {isModelDropdownOpen && (
                        <>
                          <div
                            className="fixed inset-0 z-40"
                            onClick={() => setIsModelDropdownOpen(false)}
                          />
                          <div className="absolute right-0 top-full mt-1 z-50 w-64 bg-card border border-slate-custom-200 rounded-xl shadow-lg overflow-hidden">
                            {MODEL_REGISTRY.map((model: ModelDefinition) => {
                              const accessible = canAccessModel(userTier, model.id);
                              const isSelected = model.id === selectedModelId;
                              const mu = modelUsage.find((u) => u.modelId === model.id);
                              const modelExhausted = accessible && mu && Number.isFinite(mu.draftLimit) && mu.draftUsed >= mu.draftLimit;
                              return (
                                <button
                                  key={model.id}
                                  onClick={() => {
                                    if (accessible && !modelExhausted) {
                                      setSelectedModelId(model.id);
                                      setIsModelDropdownOpen(false);
                                    } else if (modelExhausted) {
                                      showToast("info", `${model.displayName} daily draft limit reached. Try another model.`);
                                    } else {
                                      showToast("info", `Upgrade to ${model.minTier} to unlock ${model.displayName}`);
                                    }
                                  }}
                                  className={`w-full text-left px-3 py-2.5 flex items-center justify-between gap-2 transition-colors border-b border-slate-custom-50 last:border-b-0 ${
                                    accessible && !modelExhausted
                                      ? "hover:bg-primary/5 cursor-pointer"
                                      : "opacity-50 cursor-not-allowed"
                                  } ${isSelected ? "bg-primary/10" : ""}`}
                                >
                                  <div className="flex-1 min-w-0">
                                    <div className="flex items-center gap-1.5">
                                      <span className={`text-[13px] font-bold ${accessible ? "text-slate-custom-800" : "text-slate-custom-400"}`}>
                                        {model.displayName}
                                      </span>
                                      {accessible && mu && (
                                        <span className={`text-[10px] font-mono px-1 py-0.5 rounded ${
                                          modelExhausted
                                            ? "bg-red-100 text-red-600"
                                            : "bg-slate-custom-100 text-slate-custom-500"
                                        }`}>
                                          {Number.isFinite(mu.draftLimit) ? `${mu.draftUsed}/${mu.draftLimit}` : "Unlimited"}
                                        </span>
                                      )}
                                    </div>
                                    <div className={`text-[11px] ${accessible ? "text-slate-custom-500" : "text-slate-custom-300"}`}>
                                      {model.description}
                                    </div>
                                  </div>
                                  {isSelected && accessible && (
                                    <span className="material-icons-round text-[15px] text-primary">check</span>
                                  )}
                                  {!accessible && (
                                    <span className="material-icons-round text-[15px] text-slate-custom-300">lock</span>
                                  )}
                                </button>
                              );
                            })}
                          </div>
                        </>
                      )}
                      </div>
                      <span className="text-[11px] font-mono text-slate-custom-400 pl-2.5">
                        {composerUsageCount}/{Number.isFinite(draftLimitCount) ? draftLimitCount : "\u221E"} drafts
                        {(() => {
                          const mu = modelUsage.find((u) => u.modelId === selectedModelId);
                          if (!mu || !Number.isFinite(mu.draftLimit)) return null;
                          return ` \u00B7 ${mu.draftUsed}/${mu.draftLimit} ${MODEL_REGISTRY.find((m) => m.id === selectedModelId)?.displayName ?? selectedModelId}`;
                        })()}
                      </span>
                    </div>

                    {/* Temperature Slider */}
                    <div className="flex items-center gap-1.5 text-[13px] font-medium text-slate-custom-600 px-2.5 py-1.5 rounded-lg hover:text-primary hover:shadow-[0_0_8px_rgba(106,218,27,0.35)] transition-all duration-200">
                      <span className="material-icons-round text-[15px] text-orange-400">thermostat</span>
                      <input
                        type="range"
                        min={0}
                        max={1}
                        step={0.1}
                        value={temperature}
                        onChange={(e) => setTemperature(parseFloat(e.target.value))}
                        className="w-16 h-1 accent-primary cursor-pointer"
                      />
                      <span className="text-[11px] font-mono font-bold text-slate-custom-500 w-5 text-right">
                        {temperature.toFixed(1)}
                      </span>
                    </div>

                    <div className="flex flex-col items-end gap-1">
                      <button
                        onClick={generateDraft}
                        disabled={isGeneratingPost || !prompt.trim() || draftQuotaExhausted || selectedComposerModelExhausted}
                        className="px-2.5 py-1.5 rounded-full bg-gradient-to-r from-primary to-green-400 text-slate-custom-900 text-[11px] font-bold shadow-[0_0_12px_rgba(106,218,27,0.5)] hover:shadow-[0_0_22px_rgba(106,218,27,0.8),0_0_40px_rgba(106,218,27,0.3)] disabled:opacity-50 transition-all duration-200 flex items-center gap-1"
                      >
                        <span
                          className={`material-icons-round text-[11px] ${
                            isGeneratingPost ? "animate-spin" : ""
                          }`}
                        >
                          {isGeneratingPost ? "refresh" : "auto_awesome"}
                        </span>
                        {isGeneratingPost ? "Generating..." : "Generate Draft"}
                      </button>
                      {draftQuotaExhausted && (
                        <span className="text-[11px] text-amber-600 font-medium flex items-center gap-0.5">
                          <span className="material-icons-round text-[13px]">info</span>
                          Daily draft limit reached ({draftLimitCount}/{draftLimitCount})
                        </span>
                      )}
                      {selectedComposerModelExhausted && !draftQuotaExhausted && (
                        <span className="text-[11px] text-amber-600 font-medium flex items-center gap-0.5">
                          <span className="material-icons-round text-[13px]">info</span>
                          {MODEL_REGISTRY.find((m) => m.id === selectedModelId)?.displayName} limit reached. Try another model.
                        </span>
                      )}
                    </div>
                  </div>
                </div>
                <div className="p-3">
                  <textarea
                    value={postDraft}
                    onChange={(e) => setPostDraft(e.target.value)}
                    placeholder="Generate a draft to turn your data result into a publish-ready analyst summary."
                    className="w-full bg-slate-custom-50 p-4 rounded-lg border border-slate-custom-100 text-[15px] text-slate-custom-800 leading-relaxed min-h-[120px] resize-y focus:outline-none focus:ring-2 focus:ring-primary/50 focus:border-primary transition-all"
                  />
                  {postDraft && (() => {
                    const limit = publishInfo?.charLimit ?? 280;
                    const len = postDraft.length;
                    const color = len > limit ? "text-red-600" : len > limit * 0.9 ? "text-yellow-600" : "text-slate-custom-400";
                    return (
                      <p className={`text-[11px] font-medium mt-1 text-right ${color}`}>
                        {len.toLocaleString()}/{limit.toLocaleString()}
                      </p>
                    );
                  })()}
                  <div className="flex items-center justify-between mt-2">
                    <div className="flex items-center gap-3">
                      <div className="relative group">
                        <button
                          onClick={copyShareLink}
                          disabled={!hasChartData}
                          className="text-slate-custom-400 hover:text-primary hover:drop-shadow-[0_0_6px_rgba(106,218,27,0.6)] transition-all disabled:opacity-50"
                        >
                          <span className="material-icons-round text-[15px]">share</span>
                        </button>
                        <span className="absolute bottom-full left-1/2 -translate-x-1/2 mb-1.5 px-2 py-0.5 rounded text-[11px] font-bold text-primary bg-card border border-green-200 shadow-sm whitespace-nowrap opacity-0 group-hover:opacity-100 pointer-events-none transition-opacity z-50">Copy Chart Link</span>
                      </div>
                      <div className="relative group">
                        <button
                          onClick={copyDraft}
                          disabled={!postDraft}
                          className="text-slate-custom-400 hover:text-primary hover:drop-shadow-[0_0_6px_rgba(106,218,27,0.6)] transition-all disabled:opacity-50"
                        >
                          <span className="material-icons-round text-[15px]">content_copy</span>
                        </button>
                        <span className="absolute bottom-full left-1/2 -translate-x-1/2 mb-1.5 px-2 py-0.5 rounded text-[11px] font-bold text-primary bg-card border border-green-200 shadow-sm whitespace-nowrap opacity-0 group-hover:opacity-100 pointer-events-none transition-opacity z-50">Copy Post</span>
                      </div>
                    </div>
                    <div className="flex items-center gap-3">
                      <label className="flex items-center gap-1 cursor-pointer">
                        <input
                          type="checkbox"
                          checked={attachImage}
                          onChange={(e) => setAttachImage(e.target.checked)}
                          className="w-3.5 h-3.5 accent-primary cursor-pointer"
                        />
                        <span className="text-[11px] font-medium text-slate-custom-500">Attach image</span>
                      </label>
                      {userTier !== "FREE" && (
                        <span className="text-[11px] font-medium text-slate-custom-400">
                          {publishUsageCount}/{Number.isFinite(publishLimitCount) ? publishLimitCount : "\u221E"} this week
                        </span>
                      )}
                      <div className="relative group">
                        {userTier === "FREE" ? (
                          <button
                            className="px-4 py-1.5 bg-slate-custom-200 text-slate-custom-500 text-[13px] font-bold rounded-full cursor-not-allowed flex items-center gap-1.5"
                            onClick={() => showToast("info", "Publishing requires a Starter plan or higher. Upgrade to publish.")}
                          >
                            <span className="material-icons-round text-[15px]">lock</span>
                            Publish
                          </button>
                        ) : (
                          <button
                            className="px-4 py-1.5 bg-gradient-to-r from-primary to-green-400 text-slate-custom-900 text-[13px] font-bold rounded-full shadow-[0_0_10px_rgba(106,218,27,0.3)] hover:shadow-[0_0_22px_rgba(106,218,27,0.55)] disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-200 flex items-center gap-1.5"
                            disabled={!postDraft}
                            onClick={handlePublishClick}
                          >
                            <span className="material-icons-round text-[15px]">rocket_launch</span>
                            Publish
                          </button>
                        )}
                        <span className="absolute bottom-full left-1/2 -translate-x-1/2 mb-1.5 px-2 py-0.5 rounded text-[11px] font-bold text-primary bg-card border border-green-200 shadow-sm whitespace-nowrap opacity-0 group-hover:opacity-100 pointer-events-none transition-opacity z-50">Publish</span>
                      </div>
                    </div>
                  </div>
                </div>
              </section>
            )}

          </div>

          {/* Right sidebar - WorkflowStepper or ChartCustomizer */}
          <aside className="hidden xl:block xl:sticky xl:top-16 xl:self-start xl:max-h-[calc(100vh-5rem)] xl:overflow-y-auto">
            {showCustomizer ? (
              <ChartCustomizer
                config={chartConfig}
                onChange={setChartConfig}
                isOpen={true}
                onToggle={() => setShowCustomizer(false)}
                columns={columns}
                numericColumns={numericColumns}
                xField={xField}
                yField={yField}
                onAxisChange={handleAxisChange}
              />
            ) : (
              <WorkflowStepper
                currentStep={currentStep}
                steps={workflowSteps}
                onStepClick={scrollToStep}
              />
            )}
          </aside>

        </div>
      </main>

      <PublishModal
        open={showPublishModal}
        onClose={() => setShowPublishModal(false)}
        onSaveDraft={handleSaveDraft}
        onConfirm={handleConfirmPublish}
        onSchedule={handleConfirmSchedule}
        isPublishing={isPublishing}
        isScheduling={isScheduling}
        isLoading={isLoadingPublishInfo}
        info={publishInfo}
        postDraft={postDraft}
        attachImage={attachImage}
        onAttachImageChange={setAttachImage}
        chartImage={chartImage}
        error={publishError}
      />
    </div>
  );
}
