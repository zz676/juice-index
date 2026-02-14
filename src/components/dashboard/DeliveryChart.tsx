"use client";

import { useState, useEffect, useCallback, useRef } from "react";
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
} from "recharts";

interface BrandMeta {
  label: string;
  color: string;
}

interface ChartDataPoint {
  label: string;
  yearMonth: string;
  [brand: string]: string | number;
}

interface DeliveryChartData {
  data: ChartDataPoint[];
  brands: string[];
  brandMeta: Record<string, BrandMeta>;
  range: { months: number; from: string | null; to: string | null };
}

const PERIOD_OPTIONS = [
  { label: "6M", value: 6 },
  { label: "12M", value: 12 },
  { label: "24M", value: 24 },
];

export function DeliveryChart() {
  const [chartData, setChartData] = useState<DeliveryChartData | null>(null);
  const [selectedBrands, setSelectedBrands] = useState<Set<string>>(new Set());
  const [chartType, setChartType] = useState<"bar" | "line">("bar");
  const [months, setMonths] = useState(12);
  const [loading, setLoading] = useState(true);
  const [filterOpen, setFilterOpen] = useState(false);
  const filterRef = useRef<HTMLDivElement>(null);

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const brandsParam = selectedBrands.size > 0
        ? `&brands=${Array.from(selectedBrands).join(",")}`
        : "";
      const res = await fetch(`/api/dashboard/delivery-chart?months=${months}${brandsParam}`);
      if (res.ok) {
        const json: DeliveryChartData = await res.json();
        setChartData(json);
        // Initialize selected brands on first load
        if (selectedBrands.size === 0 && json.brands.length > 0) {
          setSelectedBrands(new Set(json.brands.slice(0, 5)));
        }
      }
    } catch (error) {
      console.error("Failed to fetch delivery chart data", error);
    } finally {
      setLoading(false);
    }
  }, [months, selectedBrands]);

  useEffect(() => {
    fetchData();
  }, [months]); // eslint-disable-line react-hooks/exhaustive-deps

  // Close filter dropdown on outside click
  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (filterRef.current && !filterRef.current.contains(e.target as Node)) {
        setFilterOpen(false);
      }
    }
    if (filterOpen) {
      document.addEventListener("mousedown", handleClickOutside);
      return () => document.removeEventListener("mousedown", handleClickOutside);
    }
  }, [filterOpen]);

  const toggleBrand = (brand: string) => {
    setSelectedBrands((prev) => {
      const next = new Set(prev);
      if (next.has(brand)) {
        next.delete(brand);
      } else {
        next.add(brand);
      }
      return next;
    });
  };

  const activeBrands = chartData
    ? chartData.brands.filter((b) => selectedBrands.has(b))
    : [];

  const formatValue = (value: number) => {
    if (value >= 10000) return `${(value / 10000).toFixed(0)}w`;
    if (value >= 1000) return `${(value / 1000).toFixed(0)}k`;
    return String(value);
  };

  return (
    <div className="bg-white p-6 rounded-lg shadow-[0_2px_15px_rgba(0,0,0,0.04)] border border-slate-custom-100">
      {/* Header */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-6 gap-4">
        <div>
          <h3 className="text-lg font-bold text-slate-custom-900 flex items-center gap-2">
            Monthly Deliveries by Brand
            <span
              className="material-icons-round text-slate-custom-400 text-sm cursor-help"
              title="Monthly delivery data from EVMetric"
            >
              info
            </span>
          </h3>
          <p className="text-sm text-slate-custom-500">
            Comparing brand performance over time
          </p>
        </div>

        <div className="flex items-center gap-3">
          {/* Period selector */}
          <div className="flex items-center gap-1 bg-slate-custom-50 p-1 rounded-full">
            {PERIOD_OPTIONS.map((opt) => (
              <button
                key={opt.value}
                onClick={() => setMonths(opt.value)}
                className={`px-3 py-1.5 text-xs font-semibold rounded-full transition-colors ${
                  months === opt.value
                    ? "bg-white text-slate-custom-900 shadow-sm ring-1 ring-slate-custom-200"
                    : "text-slate-custom-500 hover:text-slate-custom-900"
                }`}
              >
                {opt.label}
              </button>
            ))}
          </div>

          {/* Chart type toggle */}
          <div className="flex items-center gap-1 bg-slate-custom-50 p-1 rounded-full">
            <button
              onClick={() => setChartType("bar")}
              className={`p-1.5 rounded-full transition-colors ${
                chartType === "bar"
                  ? "bg-white shadow-sm ring-1 ring-slate-custom-200 text-slate-custom-900"
                  : "text-slate-custom-500 hover:text-slate-custom-900"
              }`}
              title="Bar chart"
            >
              <span className="material-icons-round text-base">bar_chart</span>
            </button>
            <button
              onClick={() => setChartType("line")}
              className={`p-1.5 rounded-full transition-colors ${
                chartType === "line"
                  ? "bg-white shadow-sm ring-1 ring-slate-custom-200 text-slate-custom-900"
                  : "text-slate-custom-500 hover:text-slate-custom-900"
              }`}
              title="Line chart"
            >
              <span className="material-icons-round text-base">show_chart</span>
            </button>
          </div>

          {/* Brand filter dropdown */}
          <div ref={filterRef} className="relative">
            <button
              onClick={() => setFilterOpen(!filterOpen)}
              className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-full bg-slate-custom-50 text-slate-custom-700 hover:bg-slate-custom-100 transition-colors"
            >
              <span className="material-icons-round text-base">filter_list</span>
              Brands ({selectedBrands.size})
            </button>

            {filterOpen && chartData && (
              <div className="absolute right-0 top-full mt-2 bg-white rounded-xl border border-slate-custom-200 shadow-lg py-2 z-50 w-56">
                <div className="flex items-center justify-between px-3 pb-2 border-b border-slate-custom-100">
                  <button
                    onClick={() => setSelectedBrands(new Set(chartData.brands))}
                    className="text-[11px] font-semibold text-primary hover:text-primary/80"
                  >
                    Select All
                  </button>
                  <button
                    onClick={() => setSelectedBrands(new Set())}
                    className="text-[11px] font-semibold text-slate-custom-500 hover:text-slate-custom-700"
                  >
                    Clear
                  </button>
                </div>
                <div className="max-h-60 overflow-y-auto py-1">
                  {chartData.brands.map((brand) => {
                    const meta = chartData.brandMeta[brand];
                    return (
                      <label
                        key={brand}
                        className="flex items-center gap-2.5 px-3 py-1.5 hover:bg-slate-custom-50 cursor-pointer"
                      >
                        <input
                          type="checkbox"
                          checked={selectedBrands.has(brand)}
                          onChange={() => toggleBrand(brand)}
                          className="rounded border-slate-custom-300 text-primary focus:ring-primary/50"
                        />
                        <span
                          className="w-2.5 h-2.5 rounded-full flex-shrink-0"
                          style={{ backgroundColor: meta?.color || "#94a3b8" }}
                        />
                        <span className="text-sm text-slate-custom-700">
                          {meta?.label || brand}
                        </span>
                      </label>
                    );
                  })}
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Chart */}
      <div className="h-80">
        {loading ? (
          <div className="h-full bg-slate-custom-50 rounded-lg animate-pulse" />
        ) : !chartData || chartData.data.length === 0 ? (
          <div className="h-full flex items-center justify-center text-slate-custom-400">
            <div className="text-center">
              <span className="material-icons-round text-4xl mb-2">analytics</span>
              <p className="text-sm">No delivery data available</p>
            </div>
          </div>
        ) : (
          <ResponsiveContainer width="100%" height="100%">
            {chartType === "bar" ? (
              <BarChart data={chartData.data} margin={{ top: 5, right: 20, left: 10, bottom: 5 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                <XAxis
                  dataKey="label"
                  tick={{ fontSize: 11, fill: "#64748b" }}
                  tickLine={false}
                  axisLine={{ stroke: "#e2e8f0" }}
                />
                <YAxis
                  tick={{ fontSize: 11, fill: "#64748b" }}
                  tickLine={false}
                  axisLine={false}
                  tickFormatter={formatValue}
                />
                <Tooltip
                  contentStyle={{
                    borderRadius: "12px",
                    border: "1px solid #e2e8f0",
                    boxShadow: "0 4px 12px rgba(0,0,0,0.08)",
                    fontSize: "12px",
                  }}
                  formatter={(value: number | undefined, name?: string) => [
                    value != null ? value.toLocaleString() : "—",
                    name ? (chartData.brandMeta[name]?.label || name) : "",
                  ]}
                />
                {activeBrands.map((brand) => (
                  <Bar
                    key={brand}
                    dataKey={brand}
                    fill={chartData.brandMeta[brand]?.color || "#94a3b8"}
                    radius={[2, 2, 0, 0]}
                    maxBarSize={24}
                  />
                ))}
              </BarChart>
            ) : (
              <LineChart data={chartData.data} margin={{ top: 5, right: 20, left: 10, bottom: 5 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                <XAxis
                  dataKey="label"
                  tick={{ fontSize: 11, fill: "#64748b" }}
                  tickLine={false}
                  axisLine={{ stroke: "#e2e8f0" }}
                />
                <YAxis
                  tick={{ fontSize: 11, fill: "#64748b" }}
                  tickLine={false}
                  axisLine={false}
                  tickFormatter={formatValue}
                />
                <Tooltip
                  contentStyle={{
                    borderRadius: "12px",
                    border: "1px solid #e2e8f0",
                    boxShadow: "0 4px 12px rgba(0,0,0,0.08)",
                    fontSize: "12px",
                  }}
                  formatter={(value: number | undefined, name?: string) => [
                    value != null ? value.toLocaleString() : "—",
                    name ? (chartData.brandMeta[name]?.label || name) : "",
                  ]}
                />
                {activeBrands.map((brand) => (
                  <Line
                    key={brand}
                    type="monotone"
                    dataKey={brand}
                    stroke={chartData.brandMeta[brand]?.color || "#94a3b8"}
                    strokeWidth={2}
                    dot={{ r: 3 }}
                    activeDot={{ r: 5 }}
                  />
                ))}
              </LineChart>
            )}
          </ResponsiveContainer>
        )}
      </div>

      {/* Brand legend */}
      {chartData && activeBrands.length > 0 && (
        <div className="flex flex-wrap items-center gap-4 mt-4 text-sm">
          {activeBrands.map((brand) => {
            const meta = chartData.brandMeta[brand];
            return (
              <div key={brand} className="flex items-center gap-1.5">
                <span
                  className="w-2.5 h-2.5 rounded-full"
                  style={{ backgroundColor: meta?.color || "#94a3b8" }}
                />
                <span className="text-slate-custom-600 text-xs font-medium">
                  {meta?.label || brand}
                </span>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
