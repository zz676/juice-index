"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";

type NewsResult = {
  id: string;
  title: string;
  summary: string;
  sourceUrl: string;
  time: string;
  category: string;
};

type BrandResult = {
  code: string;
  label: string;
};

type SearchResults = {
  news: NewsResult[];
  brands: BrandResult[];
};

export default function SearchOverlay() {
  const router = useRouter();
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<SearchResults | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [isOpen, setIsOpen] = useState(false);
  const [activeIndex, setActiveIndex] = useState(-1);

  const inputRef = useRef<HTMLInputElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Total number of results for keyboard navigation
  const totalResults =
    (results?.brands.length ?? 0) + (results?.news.length ?? 0);

  // Click outside to close
  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (
        containerRef.current &&
        !containerRef.current.contains(e.target as Node)
      ) {
        setIsOpen(false);
      }
    }
    if (isOpen) {
      document.addEventListener("mousedown", handleClickOutside);
      return () => document.removeEventListener("mousedown", handleClickOutside);
    }
  }, [isOpen]);

  // Cmd+K / Ctrl+K shortcut
  useEffect(() => {
    function handleKeyDown(e: KeyboardEvent) {
      if ((e.metaKey || e.ctrlKey) && e.key === "k") {
        e.preventDefault();
        inputRef.current?.focus();
        setIsOpen(true);
      }
    }
    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, []);

  // Debounced fetch
  const fetchResults = useCallback(async (term: string) => {
    if (term.length < 2) {
      setResults(null);
      setIsLoading(false);
      return;
    }

    setIsLoading(true);
    try {
      const res = await fetch(
        `/api/dashboard/search?q=${encodeURIComponent(term)}`
      );
      if (res.ok) {
        const data = (await res.json()) as SearchResults;
        setResults(data);
      }
    } catch {
      // silently fail
    } finally {
      setIsLoading(false);
    }
  }, []);

  const handleInputChange = (value: string) => {
    setQuery(value);
    setActiveIndex(-1);
    setIsOpen(true);

    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => {
      fetchResults(value.trim());
    }, 300);
  };

  // Select a result by index
  const selectResult = useCallback(
    (index: number) => {
      if (!results) return;
      const brandCount = results.brands.length;

      if (index < brandCount) {
        // Brand result — navigate to Studio with prompt pre-filled
        const brand = results.brands[index];
        router.push(
          `/dashboard/studio?prompt=${encodeURIComponent(
            `Show ${brand.label} monthly deliveries for 2024`
          )}`
        );
      } else {
        // News result — open source URL in new tab
        const newsIndex = index - brandCount;
        const newsItem = results.news[newsIndex];
        if (newsItem?.sourceUrl) {
          window.open(newsItem.sourceUrl, "_blank", "noopener,noreferrer");
        }
      }
      setIsOpen(false);
      setQuery("");
      setResults(null);
    },
    [results, router]
  );

  // Keyboard navigation
  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Escape") {
      setIsOpen(false);
      inputRef.current?.blur();
      return;
    }

    if (!isOpen || totalResults === 0) return;

    if (e.key === "ArrowDown") {
      e.preventDefault();
      setActiveIndex((prev) => (prev + 1) % totalResults);
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setActiveIndex((prev) => (prev - 1 + totalResults) % totalResults);
    } else if (e.key === "Enter" && activeIndex >= 0) {
      e.preventDefault();
      selectResult(activeIndex);
    }
  };

  const showDropdown =
    isOpen && query.length >= 2 && (isLoading || results !== null);

  return (
    <div ref={containerRef} className="relative w-[28rem] group">
      <span className="material-icons-round absolute left-4 top-1/2 -translate-y-1/2 text-slate-custom-400 group-focus-within:text-primary transition-colors duration-200 z-10 text-[20px]">
        search
      </span>
      <input
        ref={inputRef}
        value={query}
        onChange={(e) => handleInputChange(e.target.value)}
        onFocus={() => {
          if (query.length >= 2) setIsOpen(true);
        }}
        onKeyDown={handleKeyDown}
        className="w-full pl-11 pr-20 py-2 bg-slate-custom-50 border border-slate-custom-200 rounded-xl text-sm focus:outline-none focus:bg-white focus:ring-2 focus:ring-primary/40 focus:border-primary/60 transition-all duration-200 placeholder-slate-custom-400 text-slate-custom-700"
        placeholder="Search tickers, reports, or news..."
        type="text"
      />
      <kbd className="absolute right-3 top-1/2 -translate-y-1/2 hidden sm:inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded-md bg-white border border-slate-custom-200 text-[10px] font-medium text-slate-custom-400 pointer-events-none shadow-[0_1px_0_rgba(0,0,0,0.05)]">
        <span className="text-xs">&#8984;</span>K
      </kbd>

      {/* Dropdown */}
      {showDropdown && (
        <div className="absolute top-full left-0 right-0 mt-1.5 bg-white rounded-xl border border-slate-custom-200 shadow-[0_8px_30px_rgba(0,0,0,0.08)] overflow-hidden z-50 max-h-[420px] overflow-y-auto">
          {isLoading && !results && (
            <div className="p-4 space-y-3">
              {[1, 2, 3].map((i) => (
                <div key={i} className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-lg bg-slate-custom-100 animate-pulse" />
                  <div className="flex-1 space-y-1.5">
                    <div className="h-3 w-3/4 bg-slate-custom-100 rounded animate-pulse" />
                    <div className="h-2.5 w-1/2 bg-slate-custom-100 rounded animate-pulse" />
                  </div>
                </div>
              ))}
            </div>
          )}

          {results &&
            results.brands.length === 0 &&
            results.news.length === 0 && (
              <div className="px-4 py-8 text-center">
                <span className="material-icons-round text-3xl text-slate-custom-300 mb-2 block">
                  search_off
                </span>
                <p className="text-sm text-slate-custom-500">
                  No results for &ldquo;{query}&rdquo;
                </p>
              </div>
            )}

          {/* Brands section */}
          {results && results.brands.length > 0 && (
            <div>
              <div className="px-4 pt-3 pb-1.5">
                <span className="text-[10px] font-bold uppercase tracking-wider text-slate-custom-400">
                  Brands
                </span>
              </div>
              {results.brands.map((brand, i) => (
                <button
                  key={brand.code}
                  onClick={() => selectResult(i)}
                  onMouseEnter={() => setActiveIndex(i)}
                  className={`w-full flex items-center gap-3 px-4 py-2.5 text-left transition-colors ${
                    activeIndex === i
                      ? "bg-primary/10"
                      : "hover:bg-slate-custom-50"
                  }`}
                >
                  <span className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center flex-shrink-0">
                    <span className="material-icons-round text-sm text-primary">
                      electric_car
                    </span>
                  </span>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-semibold text-slate-custom-800 truncate">
                      {brand.label}
                    </p>
                    <p className="text-xs text-slate-custom-400">
                      Open in Juice AI
                    </p>
                  </div>
                  <span className="material-icons-round text-sm text-slate-custom-300">
                    arrow_forward
                  </span>
                </button>
              ))}
            </div>
          )}

          {/* News section */}
          {results && results.news.length > 0 && (
            <div>
              {results.brands.length > 0 && (
                <div className="border-t border-slate-custom-100" />
              )}
              <div className="px-4 pt-3 pb-1.5">
                <span className="text-[10px] font-bold uppercase tracking-wider text-slate-custom-400">
                  News
                </span>
              </div>
              {results.news.map((item, i) => {
                const idx = (results.brands?.length ?? 0) + i;
                return (
                  <button
                    key={item.id}
                    onClick={() => selectResult(idx)}
                    onMouseEnter={() => setActiveIndex(idx)}
                    className={`w-full flex items-center gap-3 px-4 py-2.5 text-left transition-colors ${
                      activeIndex === idx
                        ? "bg-primary/10"
                        : "hover:bg-slate-custom-50"
                    }`}
                  >
                    <span className="w-8 h-8 rounded-lg bg-blue-50 flex items-center justify-center flex-shrink-0">
                      <span className="material-icons-round text-sm text-blue-500">
                        article
                      </span>
                    </span>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-slate-custom-800 truncate">
                        {item.title}
                      </p>
                      <p className="text-xs text-slate-custom-400 truncate">
                        {item.summary}
                      </p>
                    </div>
                    <div className="flex flex-col items-end gap-1 flex-shrink-0">
                      <span className="px-1.5 py-0.5 rounded bg-slate-custom-100 text-[10px] font-medium text-slate-custom-500">
                        {item.category}
                      </span>
                      <span className="text-[10px] text-slate-custom-400">
                        {item.time}
                      </span>
                    </div>
                  </button>
                );
              })}
            </div>
          )}

          {/* Footer hint */}
          {results &&
            (results.brands.length > 0 || results.news.length > 0) && (
              <div className="px-4 py-2 border-t border-slate-custom-100 bg-slate-custom-50/50 flex items-center justify-between text-[10px] text-slate-custom-400">
                <span className="flex items-center gap-2">
                  <kbd className="px-1 py-0.5 rounded bg-white border border-slate-custom-200 font-mono">
                    &uarr;&darr;
                  </kbd>
                  Navigate
                  <kbd className="px-1 py-0.5 rounded bg-white border border-slate-custom-200 font-mono">
                    &crarr;
                  </kbd>
                  Select
                  <kbd className="px-1 py-0.5 rounded bg-white border border-slate-custom-200 font-mono">
                    Esc
                  </kbd>
                  Close
                </span>
              </div>
            )}
        </div>
      )}
    </div>
  );
}
