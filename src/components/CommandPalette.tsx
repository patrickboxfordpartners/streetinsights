/**
 * Command Palette
 * Extended Cmd+K with actions beyond search
 */

import { useState, useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";
import {
  Search,
  TrendingUp,
  Bell,
  Radio,
  Star,
  Plus,
  Settings,
  Moon,
  Sun,
  LogOut,
  Zap,
  Target,
  FileText,
} from "lucide-react";
import { cn } from "../lib/utils";
import { supabase } from "../integrations/supabase/client";
import { useAuth } from "../hooks/useAuth";
import { useTheme } from "../hooks/useTheme";
import { useToast } from "./Toast";

interface CommandAction {
  id: string;
  label: string;
  icon: React.ReactNode;
  keywords: string[];
  action: () => void | Promise<void>;
  category: "navigation" | "actions" | "settings";
}

interface Ticker {
  id: string;
  symbol: string;
  company_name: string | null;
}

export function CommandPalette() {
  const [isOpen, setIsOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [mode, setMode] = useState<"search" | "actions">("search");
  const [selectedIndex, setSelectedIndex] = useState(0);
  const [tickerResults, setTickerResults] = useState<Ticker[]>([]);
  const [loadingTickers, setLoadingTickers] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const navigate = useNavigate();
  const { signOut } = useAuth();
  const { theme, toggleTheme } = useTheme();
  const { showToast } = useToast();

  // Command actions
  const actions: CommandAction[] = [
    {
      id: "nav-overview",
      label: "Go to Overview",
      icon: <TrendingUp className="h-4 w-4" />,
      keywords: ["overview", "dashboard", "home"],
      action: () => navigate("/dashboard"),
      category: "navigation",
    },
    {
      id: "nav-signals",
      label: "Go to Live Signals",
      icon: <Radio className="h-4 w-4" />,
      keywords: ["signals", "live", "mentions"],
      action: () => navigate("/dashboard/signals"),
      category: "navigation",
    },
    {
      id: "nav-tickers",
      label: "Go to Tickers",
      icon: <Star className="h-4 w-4" />,
      keywords: ["tickers", "stocks"],
      action: () => navigate("/dashboard/tickers"),
      category: "navigation",
    },
    {
      id: "nav-predictions",
      label: "Go to Predictions",
      icon: <Target className="h-4 w-4" />,
      keywords: ["predictions", "forecasts"],
      action: () => navigate("/dashboard/predictions"),
      category: "navigation",
    },
    {
      id: "nav-alerts",
      label: "Go to Alerts",
      icon: <Bell className="h-4 w-4" />,
      keywords: ["alerts", "notifications"],
      action: () => navigate("/dashboard/alerts"),
      category: "navigation",
    },
    {
      id: "action-create-alert",
      label: "Create Alert",
      icon: <Plus className="h-4 w-4" />,
      keywords: ["create", "new", "alert", "notification"],
      action: () => {
        navigate("/dashboard/alerts");
        showToast("info", "Set up your alert preferences");
      },
      category: "actions",
    },
    {
      id: "action-add-ticker",
      label: "Add Ticker",
      icon: <Plus className="h-4 w-4" />,
      keywords: ["add", "new", "ticker", "stock"],
      action: () => {
        navigate("/dashboard/tickers");
        showToast("info", "Click 'Add Ticker' to add a new stock");
      },
      category: "actions",
    },
    {
      id: "action-refresh-data",
      label: "Refresh Data",
      icon: <Zap className="h-4 w-4" />,
      keywords: ["refresh", "reload", "sync"],
      action: () => {
        window.location.reload();
      },
      category: "actions",
    },
    {
      id: "setting-toggle-theme",
      label: `Switch to ${theme === "dark" ? "Light" : "Dark"} Mode`,
      icon: theme === "dark" ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />,
      keywords: ["theme", "dark", "light", "mode"],
      action: () => {
        toggleTheme();
        showToast("success", `Switched to ${theme === "dark" ? "light" : "dark"} mode`);
      },
      category: "settings",
    },
    {
      id: "setting-open-settings",
      label: "Open Settings",
      icon: <Settings className="h-4 w-4" />,
      keywords: ["settings", "preferences", "config"],
      action: () => navigate("/dashboard/settings"),
      category: "settings",
    },
    {
      id: "action-sign-out",
      label: "Sign Out",
      icon: <LogOut className="h-4 w-4" />,
      keywords: ["sign out", "logout", "exit"],
      action: async () => {
        await signOut();
        navigate("/");
      },
      category: "actions",
    },
  ];

  // Keyboard shortcut: Cmd+K or Ctrl+K
  useEffect(() => {
    function handleKeyDown(e: KeyboardEvent) {
      if ((e.metaKey || e.ctrlKey) && e.key === "k") {
        e.preventDefault();
        setIsOpen(true);
        setMode("search");
      }
      if ((e.metaKey || e.ctrlKey) && e.shiftKey && e.key === "p") {
        e.preventDefault();
        setIsOpen(true);
        setMode("actions");
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

  // Search tickers (mode: search)
  useEffect(() => {
    if (mode !== "search" || !query.trim()) {
      setTickerResults([]);
      return;
    }

    const searchTickers = async () => {
      setLoadingTickers(true);
      const { data } = await supabase
        .from("tickers")
        .select("id, symbol, company_name")
        .or(`symbol.ilike.%${query}%,company_name.ilike.%${query}%`)
        .eq("is_active", true)
        .limit(5);

      setTickerResults(data || []);
      setSelectedIndex(0);
      setLoadingTickers(false);
    };

    const debounce = setTimeout(searchTickers, 200);
    return () => clearTimeout(debounce);
  }, [query, mode]);

  // Filter actions (mode: actions)
  const filteredActions = actions.filter((action) => {
    if (mode !== "actions") return false;
    if (!query) return true;
    const searchStr = query.toLowerCase();
    return (
      action.label.toLowerCase().includes(searchStr) ||
      action.keywords.some((kw) => kw.includes(searchStr))
    );
  });

  const allResults =
    mode === "search"
      ? tickerResults
      : filteredActions;

  // Keyboard navigation
  function handleKeyDown(e: React.KeyboardEvent) {
    if (e.key === "ArrowDown") {
      e.preventDefault();
      setSelectedIndex((i) => (i + 1) % allResults.length);
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setSelectedIndex((i) => (i - 1 + allResults.length) % allResults.length);
    } else if (e.key === "Enter" && allResults.length > 0) {
      if (mode === "search") {
        const ticker = tickerResults[selectedIndex];
        if (ticker) selectTicker(ticker);
      } else {
        const action = filteredActions[selectedIndex];
        if (action) executeAction(action);
      }
    } else if (e.key === ">") {
      e.preventDefault();
      setMode("actions");
      setQuery("");
      setSelectedIndex(0);
    }
  }

  function selectTicker(ticker: Ticker) {
    navigate(`/dashboard/tickers/${ticker.symbol}`);
    setIsOpen(false);
    setQuery("");
  }

  async function executeAction(action: CommandAction) {
    setIsOpen(false);
    setQuery("");
    await action.action();
  }

  if (!isOpen) return null;

  return (
    <>
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-black/50 backdrop-blur-sm z-[100]"
        onClick={() => setIsOpen(false)}
      />

      {/* Modal */}
      <div className="fixed top-[20vh] left-1/2 -translate-x-1/2 w-full max-w-2xl z-[100] px-4">
        <div className="bg-card border rounded-lg shadow-2xl overflow-hidden">
          {/* Header */}
          <div className="flex items-center gap-2 px-4 py-3 border-b">
            <Search className="h-5 w-5 text-muted-foreground" />
            <input
              ref={inputRef}
              type="text"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder={
                mode === "search"
                  ? "Search tickers... (type '>' for commands)"
                  : "Type a command..."
              }
              className="flex-1 bg-transparent text-sm outline-none placeholder:text-muted-foreground"
            />
            <div className="flex items-center gap-2">
              <button
                onClick={() => {
                  setMode(mode === "search" ? "actions" : "search");
                  setQuery("");
                  setSelectedIndex(0);
                }}
                className="text-xs px-2 py-1 bg-accent rounded hover:bg-accent/80 transition-colors"
              >
                {mode === "search" ? "Actions" : "Search"}
              </button>
              <kbd className="hidden sm:inline-flex items-center gap-1 px-2 py-0.5 text-xs font-mono bg-accent border rounded">
                ESC
              </kbd>
            </div>
          </div>

          {/* Results */}
          <div className="max-h-[400px] overflow-y-auto">
            {mode === "search" && loadingTickers && (
              <div className="px-4 py-8 text-center text-sm text-muted-foreground">
                Searching...
              </div>
            )}

            {mode === "search" && !loadingTickers && query && tickerResults.length === 0 && (
              <div className="px-4 py-8 text-center text-sm text-muted-foreground">
                No tickers found for "{query}"
              </div>
            )}

            {mode === "search" && tickerResults.length > 0 && (
              <div className="py-2">
                {tickerResults.map((ticker, index) => (
                  <button
                    key={ticker.id}
                    onClick={() => selectTicker(ticker)}
                    onMouseEnter={() => setSelectedIndex(index)}
                    className={cn(
                      "w-full px-4 py-3 flex items-center gap-3 text-left transition-colors",
                      index === selectedIndex
                        ? "bg-primary/10 border-l-2 border-primary"
                        : "hover:bg-accent border-l-2 border-transparent"
                    )}
                  >
                    <FileText className="h-4 w-4 text-muted-foreground" />
                    <div className="flex-1">
                      <div className="font-mono font-bold">{ticker.symbol}</div>
                      {ticker.company_name && (
                        <div className="text-sm text-muted-foreground">{ticker.company_name}</div>
                      )}
                    </div>
                  </button>
                ))}
              </div>
            )}

            {mode === "actions" && (
              <div className="py-2">
                {filteredActions.length === 0 && (
                  <div className="px-4 py-8 text-center text-sm text-muted-foreground">
                    No commands found
                  </div>
                )}
                {filteredActions.map((action, index) => (
                  <button
                    key={action.id}
                    onClick={() => executeAction(action)}
                    onMouseEnter={() => setSelectedIndex(index)}
                    className={cn(
                      "w-full px-4 py-3 flex items-center gap-3 text-left transition-colors",
                      index === selectedIndex
                        ? "bg-primary/10 border-l-2 border-primary"
                        : "hover:bg-accent border-l-2 border-transparent"
                    )}
                  >
                    {action.icon}
                    <span className="flex-1">{action.label}</span>
                    <span className="text-xs text-muted-foreground capitalize">{action.category}</span>
                  </button>
                ))}
              </div>
            )}

            {/* Empty state */}
            {!query && mode === "search" && (
              <div className="px-4 py-8 space-y-3">
                <div className="text-sm text-muted-foreground text-center">
                  Search tickers or type <kbd className="px-1.5 py-0.5 bg-accent border rounded text-xs">&gt;</kbd> for commands
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
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </>
  );
}
