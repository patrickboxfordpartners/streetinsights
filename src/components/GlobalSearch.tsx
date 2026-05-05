/**
 * Global Search Component (Cmd+K)
 * Quick ticker lookup from anywhere in the app
 */

import { useState, useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { Search, TrendingUp, X } from "lucide-react";
import { supabase } from "../integrations/supabase/client";

interface Ticker {
  id: string;
  symbol: string;
  company_name: string | null;
  sector: string | null;
  avg_daily_mentions: number;
}

export function GlobalSearch() {
  const [isOpen, setIsOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<Ticker[]>([]);
  const [selectedIndex, setSelectedIndex] = useState(0);
  const [loading, setLoading] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const navigate = useNavigate();

  // Keyboard shortcut: Cmd+K or Ctrl+K
  useEffect(() => {
    function handleKeyDown(e: KeyboardEvent) {
      if ((e.metaKey || e.ctrlKey) && e.key === "k") {
        e.preventDefault();
        setIsOpen(true);
      }
      if (e.key === "Escape") {
        setIsOpen(false);
        setQuery("");
      }
    }

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, []);

  // Focus input when opened
  useEffect(() => {
    if (isOpen && inputRef.current) {
      inputRef.current.focus();
    }
  }, [isOpen]);

  // Search tickers
  useEffect(() => {
    if (!query.trim()) {
      setResults([]);
      return;
    }

    const searchTickers = async () => {
      setLoading(true);
      const { data } = await supabase
        .from("tickers")
        .select("id, symbol, company_name, sector, avg_daily_mentions")
        .or(`symbol.ilike.%${query}%,company_name.ilike.%${query}%`)
        .eq("is_active", true)
        .order("avg_daily_mentions", { ascending: false })
        .limit(10);

      setResults(data || []);
      setSelectedIndex(0);
      setLoading(false);
    };

    const debounce = setTimeout(searchTickers, 200);
    return () => clearTimeout(debounce);
  }, [query]);

  // Keyboard navigation
  function handleKeyDown(e: React.KeyboardEvent) {
    if (e.key === "ArrowDown") {
      e.preventDefault();
      setSelectedIndex((i) => (i + 1) % results.length);
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setSelectedIndex((i) => (i - 1 + results.length) % results.length);
    } else if (e.key === "Enter" && results[selectedIndex]) {
      selectTicker(results[selectedIndex]);
    }
  }

  function selectTicker(ticker: Ticker) {
    navigate(`/dashboard/tickers/${ticker.symbol}`);
    setIsOpen(false);
    setQuery("");
  }

  if (!isOpen) {
    return (
      <button
        onClick={() => setIsOpen(true)}
        className="flex items-center gap-2 px-3 py-2 text-sm text-muted-foreground hover:text-foreground bg-accent/50 hover:bg-accent rounded-lg border transition-colors"
      >
        <Search className="h-4 w-4" />
        <span>Search tickers...</span>
        <kbd className="hidden sm:inline-flex items-center gap-1 px-2 py-0.5 text-xs font-mono bg-background border rounded">
          <span>⌘K</span>
        </kbd>
      </button>
    );
  }

  return (
    <>
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50"
        onClick={() => setIsOpen(false)}
      />

      {/* Modal */}
      <div className="fixed top-[20vh] left-1/2 -translate-x-1/2 w-full max-w-2xl z-50 px-4">
        <div className="bg-card border rounded-lg shadow-2xl overflow-hidden">
          {/* Search Input */}
          <div className="flex items-center gap-3 px-4 py-3 border-b">
            <Search className="h-5 w-5 text-muted-foreground" />
            <input
              ref={inputRef}
              type="text"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder="Search by ticker or company name..."
              className="flex-1 bg-transparent text-sm outline-none placeholder:text-muted-foreground"
            />
            {query && (
              <button
                onClick={() => setQuery("")}
                className="p-1 hover:bg-accent rounded transition-colors"
              >
                <X className="h-4 w-4" />
              </button>
            )}
            <kbd className="hidden sm:inline-flex items-center gap-1 px-2 py-0.5 text-xs font-mono bg-accent border rounded">
              ESC
            </kbd>
          </div>

          {/* Results */}
          <div className="max-h-[400px] overflow-y-auto">
            {loading && (
              <div className="px-4 py-8 text-center text-sm text-muted-foreground">
                Searching...
              </div>
            )}

            {!loading && query && results.length === 0 && (
              <div className="px-4 py-8 text-center text-sm text-muted-foreground">
                No tickers found for "{query}"
              </div>
            )}

            {!loading && results.length > 0 && (
              <div className="py-2">
                {results.map((ticker, index) => (
                  <button
                    key={ticker.id}
                    onClick={() => selectTicker(ticker)}
                    onMouseEnter={() => setSelectedIndex(index)}
                    className={`w-full px-4 py-3 flex items-center justify-between text-left transition-colors ${
                      index === selectedIndex
                        ? "bg-primary/10 border-l-2 border-primary"
                        : "hover:bg-accent border-l-2 border-transparent"
                    }`}
                  >
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-3">
                        <div className="font-mono font-bold text-lg">
                          {ticker.symbol}
                        </div>
                        {ticker.sector && (
                          <span className="text-xs px-2 py-0.5 rounded bg-accent text-muted-foreground uppercase">
                            {ticker.sector}
                          </span>
                        )}
                      </div>
                      {ticker.company_name && (
                        <div className="text-sm text-muted-foreground truncate mt-0.5">
                          {ticker.company_name}
                        </div>
                      )}
                    </div>
                    <div className="flex items-center gap-2 ml-4">
                      <div className="text-right">
                        <div className="text-xs text-muted-foreground">
                          {ticker.avg_daily_mentions} mentions/day
                        </div>
                      </div>
                      <TrendingUp className="h-4 w-4 text-muted-foreground" />
                    </div>
                  </button>
                ))}
              </div>
            )}

            {/* Empty state / Tips */}
            {!query && (
              <div className="px-4 py-8 space-y-3">
                <div className="text-sm text-muted-foreground text-center">
                  Start typing to search tickers
                </div>
                <div className="flex items-center justify-center gap-4 text-xs text-muted-foreground">
                  <div className="flex items-center gap-1">
                    <kbd className="px-2 py-0.5 bg-accent border rounded font-mono">↑</kbd>
                    <kbd className="px-2 py-0.5 bg-accent border rounded font-mono">↓</kbd>
                    <span>navigate</span>
                  </div>
                  <div className="flex items-center gap-1">
                    <kbd className="px-2 py-0.5 bg-accent border rounded font-mono">↵</kbd>
                    <span>select</span>
                  </div>
                  <div className="flex items-center gap-1">
                    <kbd className="px-2 py-0.5 bg-accent border rounded font-mono">ESC</kbd>
                    <span>close</span>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </>
  );
}
