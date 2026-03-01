"use client";

import { useEffect, useState } from "react";
import type { StockQuote } from "@/app/api/stocks/route";

const CURRENCY_SYMBOLS: Record<string, string> = {
  USD: "$",
  HKD: "HK$",
  EUR: "€",
  KRW: "₩",
  JPY: "¥",
};

function formatPrice(price: number | null, currency: string): string {
  if (price === null || !isFinite(price)) return "—";
  const sym = CURRENCY_SYMBOLS[currency] ?? currency + " ";
  const decimals = currency === "JPY" || currency === "KRW" ? 0 : 2;
  return `${sym}${price.toLocaleString("en-US", { minimumFractionDigits: decimals, maximumFractionDigits: decimals })}`;
}

function TickerItem({ quote }: { quote: StockQuote }) {
  const positive = quote.change >= 0;
  const arrow = positive ? "▲" : "▼";
  const changeColor = positive ? "text-primary" : "text-red-400";
  const yahooUrl = `https://finance.yahoo.com/quote/${encodeURIComponent(quote.symbol)}`;

  const changeDir = positive ? "up" : "down";
  const priceStr = formatPrice(quote.price, quote.currency);
  const ariaLabel = `${quote.brand} (${quote.symbol}) ${priceStr}, ${changeDir} ${Math.abs(quote.change).toFixed(2)}%`;

  return (
    <a
      href={yahooUrl}
      target="_blank"
      rel="noopener noreferrer"
      aria-label={ariaLabel}
      className="inline-flex items-center gap-1.5 px-4 hover:bg-white/10 transition-colors rounded cursor-pointer shrink-0 h-full"
    >
      <span className="font-semibold text-white text-[11px] tracking-wide">{quote.brand}</span>
      <span className="text-slate-custom-400 text-[10px]">{quote.symbol}</span>
      <span className="text-white text-[11px] tabular-nums">{formatPrice(quote.price, quote.currency)}</span>
      <span className={`${changeColor} text-[11px] tabular-nums font-medium`}>
        <span aria-hidden="true">{arrow}</span> {Math.abs(quote.change).toFixed(2)}%
      </span>
      <span aria-hidden="true" className="text-slate-custom-600 text-[11px] ml-2 select-none">|</span>
    </a>
  );
}

export default function StockTicker() {
  const [quotes, setQuotes] = useState<StockQuote[]>([]);
  const [error, setError] = useState(false);

  useEffect(() => {
    async function fetchQuotes() {
      try {
        const res = await fetch("/api/stocks");
        if (!res.ok) throw new Error("non-ok");
        const data: StockQuote[] = await res.json();
        if (Array.isArray(data) && data.length > 0) {
          setQuotes(data);
          setError(false);
        }
      } catch (err) {
        console.warn("StockTicker: failed to fetch quotes", err);
        setError(true);
      }
    }
    fetchQuotes();
    const id = setInterval(fetchQuotes, 60_000);
    return () => clearInterval(id);
  }, []);

  // Hide if no data or error
  if (error || quotes.length === 0) return null;

  // Duplicate items for seamless loop
  const items = [...quotes, ...quotes];

  return (
    <div className="w-full bg-slate-custom-900 border-b border-slate-custom-800 overflow-hidden flex items-center h-9 mb-4 rounded-lg">
      {/* LIVE label */}
      <div className="flex items-center gap-1.5 px-3 border-r border-slate-custom-700 h-full shrink-0">
        <span className="relative flex h-1.5 w-1.5">
          <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-primary opacity-75" />
          <span className="relative inline-flex rounded-full h-1.5 w-1.5 bg-primary" />
        </span>
        <span className="text-[10px] font-bold uppercase tracking-widest text-slate-custom-400">Live</span>
      </div>

      {/* Scrolling track */}
      <div className="flex-1 overflow-hidden relative">
        <div className="ticker-track flex items-center h-9 w-max">
          {items.map((q, i) => (
            <TickerItem key={`${q.symbol}-${i}`} quote={q} />
          ))}
        </div>
      </div>
    </div>
  );
}
