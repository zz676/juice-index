"use client";

import { useState, useEffect, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";

interface QueryScene {
  query: string;
  bars: { label: string; value: number; color: string }[];
  stats: { label: string; value: string; change: string }[];
}

const scenes: QueryScene[] = [
  {
    query: "Show Tesla monthly deliveries for 2024",
    bars: [
      { label: "Jan", value: 72, color: "bg-primary/50" },
      { label: "Feb", value: 45, color: "bg-primary/40" },
      { label: "Mar", value: 88, color: "bg-primary/60" },
      { label: "Apr", value: 65, color: "bg-primary/50" },
      { label: "May", value: 78, color: "bg-primary/55" },
      { label: "Jun", value: 95, color: "bg-primary" },
    ],
    stats: [
      { label: "Total Deliveries", value: "443K", change: "+12.4%" },
      { label: "Market Share", value: "8.2%", change: "+0.6%" },
    ],
  },
  {
    query: "Compare BYD vs NIO insurance registrations",
    bars: [
      { label: "BYD", value: 100, color: "bg-primary" },
      { label: "NIO", value: 38, color: "bg-primary/50" },
      { label: "XPEV", value: 28, color: "bg-primary/40" },
      { label: "Li", value: 52, color: "bg-primary/60" },
      { label: "AITO", value: 45, color: "bg-primary/55" },
      { label: "Zeekr", value: 30, color: "bg-primary/45" },
    ],
    stats: [
      { label: "BYD Registrations", value: "312K", change: "+24.1%" },
      { label: "NIO Growth", value: "118K", change: "+8.7%" },
    ],
  },
  {
    query: "LFP battery cost trend last 6 months",
    bars: [
      { label: "Jul", value: 90, color: "bg-primary/60" },
      { label: "Aug", value: 82, color: "bg-primary/55" },
      { label: "Sep", value: 75, color: "bg-primary/50" },
      { label: "Oct", value: 68, color: "bg-primary/45" },
      { label: "Nov", value: 60, color: "bg-primary/40" },
      { label: "Dec", value: 55, color: "bg-primary" },
    ],
    stats: [
      { label: "Avg $/kWh", value: "$56", change: "-18.3%" },
      { label: "YoY Change", value: "-22%", change: "-22%" },
    ],
  },
];

type Phase = "typing" | "processing" | "chart" | "stats" | "hold";

export default function HeroViz() {
  const [sceneIdx, setSceneIdx] = useState(0);
  const [phase, setPhase] = useState<Phase>("typing");
  const [typedChars, setTypedChars] = useState(0);

  const scene = scenes[sceneIdx];

  const advanceScene = useCallback(() => {
    setSceneIdx((prev) => (prev + 1) % scenes.length);
    setTypedChars(0);
    setPhase("typing");
  }, []);

  // Typewriter effect
  useEffect(() => {
    if (phase !== "typing") return;
    if (typedChars >= scene.query.length) {
      const timer = setTimeout(() => setPhase("processing"), 200);
      return () => clearTimeout(timer);
    }
    const speed = 30 + Math.random() * 40;
    const timer = setTimeout(() => setTypedChars((c) => c + 1), speed);
    return () => clearTimeout(timer);
  }, [phase, typedChars, scene.query.length]);

  // Phase progression
  useEffect(() => {
    if (phase === "processing") {
      const timer = setTimeout(() => setPhase("chart"), 500);
      return () => clearTimeout(timer);
    }
    if (phase === "chart") {
      const timer = setTimeout(() => setPhase("stats"), 1500);
      return () => clearTimeout(timer);
    }
    if (phase === "stats") {
      const timer = setTimeout(() => setPhase("hold"), 800);
      return () => clearTimeout(timer);
    }
    if (phase === "hold") {
      const timer = setTimeout(advanceScene, 3000);
      return () => clearTimeout(timer);
    }
  }, [phase, advanceScene]);

  return (
    <div className="w-full max-w-lg mx-auto lg:mx-0">
      <div className="bg-white rounded-2xl border border-slate-custom-200 shadow-xl overflow-hidden">
        {/* Query bar */}
        <div className="px-5 py-4 border-b border-slate-custom-100 flex items-center gap-3">
          <div className="w-6 h-6 rounded-full bg-primary/10 flex items-center justify-center shrink-0">
            <span className="material-icons-round text-primary text-sm">
              search
            </span>
          </div>
          <div className="flex-1 min-h-[24px] text-sm text-slate-custom-700 font-mono">
            <span>{scene.query.slice(0, typedChars)}</span>
            {phase === "typing" && (
              <span className="inline-block w-[2px] h-4 bg-primary ml-0.5 animate-pulse align-text-bottom" />
            )}
          </div>
        </div>

        {/* Visualization area */}
        <div className="px-5 py-5 min-h-[220px] flex flex-col justify-end">
          {/* Processing shimmer */}
          <AnimatePresence>
            {phase === "processing" && (
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="flex items-center gap-2 mb-4"
              >
                <div className="flex gap-1">
                  {[0, 1, 2].map((i) => (
                    <motion.div
                      key={i}
                      className="w-1.5 h-1.5 rounded-full bg-primary"
                      animate={{ opacity: [0.3, 1, 0.3] }}
                      transition={{
                        duration: 0.8,
                        repeat: Infinity,
                        delay: i * 0.2,
                      }}
                    />
                  ))}
                </div>
                <span className="text-xs text-slate-custom-400">
                  Querying...
                </span>
              </motion.div>
            )}
          </AnimatePresence>

          {/* Bar chart */}
          {(phase === "chart" || phase === "stats" || phase === "hold") && (
            <div className="flex items-end gap-2 h-[140px] mb-4">
              {scene.bars.map((bar, i) => (
                <div
                  key={bar.label}
                  className="flex-1 flex flex-col items-center gap-1"
                >
                  <motion.div
                    className={`w-full rounded-t-md ${bar.color}`}
                    initial={{ height: 0 }}
                    animate={{ height: `${bar.value}%` }}
                    transition={{
                      duration: 0.6,
                      delay: i * 0.08,
                      ease: [0.22, 1, 0.36, 1],
                    }}
                  />
                  <span className="text-[10px] text-slate-custom-400 font-medium">
                    {bar.label}
                  </span>
                </div>
              ))}
            </div>
          )}

          {/* Stat cards */}
          {(phase === "stats" || phase === "hold") && (
            <div className="flex gap-3">
              {scene.stats.map((stat, i) => (
                <motion.div
                  key={stat.label}
                  initial={{ opacity: 0, scale: 0.9, y: 8 }}
                  animate={{ opacity: 1, scale: 1, y: 0 }}
                  transition={{
                    type: "spring",
                    stiffness: 300,
                    damping: 24,
                    delay: i * 0.15,
                  }}
                  className="flex-1 bg-slate-custom-50 rounded-lg p-3 border border-slate-custom-100"
                >
                  <p className="text-[10px] text-slate-custom-400 mb-1">
                    {stat.label}
                  </p>
                  <div className="flex items-baseline gap-2">
                    <span className="text-lg font-bold text-slate-custom-900">
                      {stat.value}
                    </span>
                    <span
                      className={`text-xs font-semibold ${stat.change.startsWith("-") ? "text-red-500" : "text-primary"}`}
                    >
                      {stat.change}
                    </span>
                  </div>
                </motion.div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
