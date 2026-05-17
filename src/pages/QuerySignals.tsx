import { useState, useRef } from "react";
import { MessageSquare, Search, X, ChevronDown, ChevronUp, Loader2, Database } from "lucide-react";

const WORKER_URL = (typeof import.meta !== "undefined" && import.meta.env?.VITE_WORKER_URL) || "";

const SUGGESTED_QUERIES = [
  "Which tickers had the most mention spikes in the last 30 days?",
  "Top 10 sources by accuracy rate with at least 10 predictions",
  "Bullish predictions for NVDA in the last 60 days",
  "Which sectors have the most active tickers?",
  "Show prediction accuracy by platform",
  "Which government events this month affect the financial sector?",
  "Sources with accuracy above 70% and high reasoning quality",
  "Most mentioned tickers this week ranked by engagement score",
];

interface QueryResult {
  rows: Record<string, unknown>[];
  columns: string[];
}

interface QueryResponse {
  sql: string;
  results: QueryResult;
  explanation: string;
}

export function QuerySignals() {
  const [question, setQuestion] = useState("");
  const [loading, setLoading] = useState(false);
  const [response, setResponse] = useState<QueryResponse | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [sqlExpanded, setSqlExpanded] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  async function runQuery(q: string) {
    if (!q.trim() || loading) return;
    setLoading(true);
    setError(null);
    setResponse(null);
    setSqlExpanded(false);

    try {
      const res = await fetch(`${WORKER_URL}/api/query`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ question: q.trim() }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Query failed");
      setResponse(data);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }

  function handleSubmit() {
    runQuery(question);
  }

  function handleSuggestion(s: string) {
    setQuestion(s);
    runQuery(s);
  }

  function handleClear() {
    setQuestion("");
    setResponse(null);
    setError(null);
    inputRef.current?.focus();
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center gap-2.5">
        <Database className="h-5 w-5 text-primary" />
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Query Signals</h1>
          <p className="text-sm text-muted-foreground mt-0.5">
            Ask questions about your market signals data in plain English
          </p>
        </div>
      </div>

      {/* Search bar */}
      <form
        onSubmit={(e) => { e.preventDefault(); handleSubmit(); }}
        className="flex gap-2"
      >
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <input
            ref={inputRef}
            type="text"
            value={question}
            onChange={(e) => setQuestion(e.target.value)}
            placeholder="e.g. Which tickers had the most bullish predictions this week?"
            className="w-full pl-9 pr-4 py-2.5 text-sm bg-background border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary/50"
          />
        </div>
        {response || error ? (
          <button
            type="button"
            onClick={handleClear}
            className="px-4 py-2.5 text-sm border rounded-lg hover:bg-accent transition-colors flex items-center gap-1.5"
          >
            <X className="h-3.5 w-3.5" /> Clear
          </button>
        ) : (
          <button
            type="submit"
            disabled={loading || !question.trim()}
            className="px-4 py-2.5 text-sm bg-primary text-primary-foreground rounded-lg hover:bg-primary/90 disabled:opacity-50 transition-colors flex items-center gap-1.5"
          >
            {loading ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <MessageSquare className="h-3.5 w-3.5" />}
            Ask
          </button>
        )}
      </form>

      {/* Suggested queries (shown when idle) */}
      {!response && !error && !loading && (
        <div>
          <p className="text-sm font-medium text-muted-foreground mb-3">Try asking:</p>
          <div className="flex flex-wrap gap-2">
            {SUGGESTED_QUERIES.map((s) => (
              <button
                key={s}
                onClick={() => handleSuggestion(s)}
                className="px-3 py-1.5 text-xs border rounded-full hover:bg-accent transition-colors text-left"
              >
                {s}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Loading state */}
      {loading && (
        <div className="flex items-center gap-3 text-sm text-muted-foreground py-8 justify-center">
          <Loader2 className="h-4 w-4 animate-spin" />
          Generating query and fetching results...
        </div>
      )}

      {/* Error */}
      {error && (
        <div className="p-4 bg-destructive/10 border border-destructive/20 rounded-lg text-sm text-destructive">
          {error}
        </div>
      )}

      {/* Results */}
      {response && (
        <div className="space-y-4">
          {/* Explanation */}
          <div className="p-4 bg-accent/50 rounded-lg text-sm text-foreground leading-relaxed">
            {response.explanation}
          </div>

          {/* SQL toggle */}
          <button
            onClick={() => setSqlExpanded((v) => !v)}
            className="flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground transition-colors"
          >
            {sqlExpanded ? <ChevronUp className="h-3.5 w-3.5" /> : <ChevronDown className="h-3.5 w-3.5" />}
            {sqlExpanded ? "Hide SQL" : "Show SQL"}
          </button>

          {sqlExpanded && (
            <pre className="text-xs bg-card border rounded-lg p-4 overflow-x-auto font-mono text-muted-foreground whitespace-pre-wrap">
              {response.sql}
            </pre>
          )}

          {/* Table */}
          {response.results.rows.length === 0 ? (
            <div className="text-sm text-muted-foreground text-center py-8">
              No results found for that query.
            </div>
          ) : (
            <div className="border rounded-lg overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="bg-accent/50 border-b">
                      {response.results.columns.map((col) => (
                        <th
                          key={col}
                          className="px-4 py-2.5 text-left text-xs font-semibold text-muted-foreground uppercase tracking-wide whitespace-nowrap"
                        >
                          {col.replace(/_/g, " ")}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {response.results.rows.map((row, i) => (
                      <tr
                        key={i}
                        className="border-b last:border-0 hover:bg-accent/30 transition-colors"
                      >
                        {response.results.columns.map((col) => {
                          const val = row[col];
                          return (
                            <td
                              key={col}
                              className="px-4 py-2.5 text-xs font-mono whitespace-nowrap max-w-xs truncate"
                            >
                              {val === null || val === undefined
                                ? <span className="text-muted-foreground/50">—</span>
                                : typeof val === "boolean"
                                ? <span className={val ? "text-green-500" : "text-muted-foreground"}>{val ? "yes" : "no"}</span>
                                : typeof val === "number"
                                ? Number.isInteger(val) ? val.toLocaleString() : Number(val).toFixed(4)
                                : String(val)}
                            </td>
                          );
                        })}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              <div className="px-4 py-2 bg-accent/20 border-t text-xs text-muted-foreground">
                {response.results.rows.length} row{response.results.rows.length !== 1 ? "s" : ""}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
