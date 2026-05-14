/**
 * Swarm Signal Panel
 * Displays the latest Vibe-Trading sentiment_intelligence_team output
 * for a ticker — composite score, component breakdown, day-over-day delta,
 * and reversal signal status.
 */

import { useEffect, useState } from "react";
import { TrendingUp, TrendingDown, Minus, RefreshCw, AlertTriangle, ChevronDown, ChevronUp, Zap } from "lucide-react";
import { supabase } from "../integrations/supabase/client";
import { inngest } from "../inngest/client";

interface SwarmSignal {
  id: string;
  symbol: string;
  run_date: string;
  composite_score: number | null;
  composite_label: string | null;
  historical_pct_1yr: number | null;
  reversal_signal: string | null;
  reversal_triggered: boolean;
  news_score: number | null;
  social_score: number | null;
  flow_score: number | null;
  composite_delta: number | null;
  news_delta: number | null;
  social_delta: number | null;
  flow_delta: number | null;
  fear_greed_score: number | null;
  overheat_watch: boolean;
  news_report: string | null;
  social_report: string | null;
  flow_report: string | null;
  synthesis_report: string | null;
  created_at: string;
}

interface SwarmSignalPanelProps {
  tickerId: string;
  symbol: string;
}

function scoreColor(score: number | null): string {
  if (score === null) return "text-muted-foreground";
  if (score >= 60) return "text-emerald-400";
  if (score >= 40) return "text-blue-400";
  if (score >= 20) return "text-yellow-400";
  if (score >= -20) return "text-gray-400";
  if (score >= -40) return "text-orange-400";
  return "text-red-400";
}

function deltaDisplay(delta: number | null) {
  if (delta === null) return null;
  const abs = Math.abs(delta).toFixed(1);
  if (delta > 0) return <span className="text-emerald-400 text-xs">+{abs}</span>;
  if (delta < 0) return <span className="text-red-400 text-xs">{delta.toFixed(1)}</span>;
  return <span className="text-muted-foreground text-xs">—</span>;
}

function ComponentBar({ label, score, weight, delta }: {
  label: string; score: number | null; weight: number; delta: number | null;
}) {
  const pct = score !== null ? ((score + 100) / 200) * 100 : 50;
  return (
    <div className="space-y-1">
      <div className="flex items-center justify-between text-xs">
        <div className="flex items-center gap-1.5">
          <span className="text-muted-foreground">{label}</span>
          <span className="text-muted-foreground/50 text-[10px]">{Math.round(weight * 100)}%</span>
        </div>
        <div className="flex items-center gap-1.5">
          {deltaDisplay(delta)}
          <span className={`font-semibold ${scoreColor(score)}`}>
            {score !== null ? (score > 0 ? `+${score.toFixed(1)}` : score.toFixed(1)) : "—"}
          </span>
        </div>
      </div>
      <div className="h-1.5 rounded-full bg-border/30 overflow-hidden">
        <div
          className="h-full rounded-full transition-all duration-500"
          style={{
            width: `${pct}%`,
            background: score === null ? "#6b7280" :
              score >= 40 ? "#10b981" : score >= 0 ? "#3b82f6" : "#f59e0b",
          }}
        />
      </div>
    </div>
  );
}

function ScoreRing({ score, size = 72 }: { score: number; size?: number }) {
  const sw = 7;
  const r = (size - sw * 2) / 2;
  const circ = 2 * Math.PI * r;
  // Map -100..+100 to 0..100%
  const pct = (score + 100) / 200;
  const dash = pct * circ;
  const color = score >= 60 ? "#10b981" : score >= 40 ? "#3b82f6" : score >= 0 ? "#f59e0b" : "#ef4444";

  return (
    <div className="relative flex items-center justify-center" style={{ width: size, height: size }}>
      <svg width={size} height={size} className="-rotate-90">
        <circle cx={size / 2} cy={size / 2} r={r} fill="none"
          stroke="currentColor" strokeWidth={sw} className="text-border/30" />
        <circle cx={size / 2} cy={size / 2} r={r} fill="none"
          strokeWidth={sw} strokeDasharray={`${dash} ${circ}`}
          strokeLinecap="round" stroke={color} />
      </svg>
      <div className="absolute flex flex-col items-center">
        <span className="text-sm font-bold text-foreground leading-none">{score.toFixed(0)}</span>
        <span className="text-[9px] text-muted-foreground">/100</span>
      </div>
    </div>
  );
}

export function SwarmSignalPanel({ tickerId, symbol }: SwarmSignalPanelProps) {
  const [signal, setSignal] = useState<SwarmSignal | null>(null);
  const [loading, setLoading] = useState(true);
  const [running, setRunning] = useState(false);
  const [expanded, setExpanded] = useState<string | null>(null);

  useEffect(() => { loadSignal(); }, [symbol]);

  async function loadSignal() {
    setLoading(true);
    const { data } = await supabase
      .from("swarm_signals")
      .select("*")
      .eq("symbol", symbol.toUpperCase())
      .order("run_date", { ascending: false })
      .limit(1)
      .single();
    setSignal(data || null);
    setLoading(false);
  }

  async function requestRefresh() {
    setRunning(true);
    try {
      await inngest.send({
        name: "ticker/swarm-sentiment.requested",
        data: { symbol: symbol.toUpperCase(), tickerId },
      });
      // Poll for up to 8 minutes
      for (let i = 0; i < 48; i++) {
        await new Promise(r => setTimeout(r, 10_000));
        const { data } = await supabase
          .from("swarm_signals")
          .select("*")
          .eq("symbol", symbol.toUpperCase())
          .order("run_date", { ascending: false })
          .limit(1)
          .single();
        if (data && data.id !== signal?.id) {
          setSignal(data);
          break;
        }
      }
    } catch (e) {
      console.error("[SwarmSignalPanel] refresh error:", e);
    } finally {
      setRunning(false);
    }
  }

  const isToday = signal?.run_date === new Date().toISOString().split("T")[0];

  return (
    <div className="bg-card rounded-lg border border-border">
      {/* Header */}
      <div className="flex items-center justify-between px-5 py-4 border-b border-border/50">
        <div className="flex items-center gap-2">
          <Zap className="h-4 w-4 text-violet-400" />
          <h2 className="text-sm font-semibold text-foreground">Sentiment Intelligence</h2>
          {signal && (
            <span className={`text-[10px] px-1.5 py-0.5 rounded-full ring-1 ${
              isToday
                ? "bg-emerald-500/10 text-emerald-400 ring-emerald-500/20"
                : "bg-amber-500/10 text-amber-400 ring-amber-500/20"
            }`}>
              {isToday ? "Today" : signal.run_date}
            </span>
          )}
        </div>
        <button
          onClick={requestRefresh}
          disabled={running}
          className="flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground transition-colors disabled:opacity-40"
        >
          <RefreshCw className={`h-3.5 w-3.5 ${running ? "animate-spin" : ""}`} />
          {running ? "Running swarm…" : "Refresh"}
        </button>
      </div>

      <div className="p-5">
        {loading ? (
          <div className="flex items-center gap-2 text-sm text-muted-foreground py-4">
            <RefreshCw className="h-4 w-4 animate-spin" /> Loading signal...
          </div>
        ) : !signal ? (
          <div className="space-y-3 py-2">
            <p className="text-sm text-muted-foreground">
              No swarm signal yet for {symbol}. Run the sentiment intelligence swarm to generate one.
            </p>
            <button
              onClick={requestRefresh}
              disabled={running}
              className="flex items-center gap-2 px-4 py-2 rounded-lg bg-violet-600 hover:bg-violet-500 disabled:opacity-40 text-white text-sm font-medium transition-colors"
            >
              <Zap className="h-3.5 w-3.5" />
              {running ? "Running swarm (3–5 min)…" : `Run swarm for ${symbol}`}
            </button>
          </div>
        ) : (
          <div className="space-y-5">

            {/* Composite + label */}
            <div className="flex items-center gap-5">
              {signal.composite_score !== null && (
                <ScoreRing score={signal.composite_score} />
              )}
              <div className="space-y-1.5">
                <div className="flex items-center gap-2">
                  <span className={`text-lg font-bold ${scoreColor(signal.composite_score)}`}>
                    {signal.composite_label || "—"}
                  </span>
                  {signal.composite_delta !== null && (
                    <span className={`text-xs px-1.5 py-0.5 rounded-full ${
                      signal.composite_delta > 0
                        ? "bg-emerald-500/10 text-emerald-400"
                        : signal.composite_delta < 0
                        ? "bg-red-500/10 text-red-400"
                        : "bg-secondary text-muted-foreground"
                    }`}>
                      {signal.composite_delta > 0 ? "+" : ""}{signal.composite_delta.toFixed(1)} DoD
                    </span>
                  )}
                </div>
                {signal.historical_pct_1yr !== null && (
                  <p className="text-xs text-muted-foreground">
                    {signal.historical_pct_1yr}th percentile (1yr)
                  </p>
                )}
                <div className="flex items-center gap-2">
                  {signal.reversal_triggered ? (
                    <span className={`flex items-center gap-1 text-xs font-medium ${
                      signal.reversal_signal === "LONG" ? "text-emerald-400" : "text-red-400"
                    }`}>
                      {signal.reversal_signal === "LONG" ? <TrendingUp className="h-3 w-3" /> : <TrendingDown className="h-3 w-3" />}
                      {signal.reversal_signal} reversal triggered
                    </span>
                  ) : (
                    <span className="flex items-center gap-1 text-xs text-muted-foreground">
                      <Minus className="h-3 w-3" /> No reversal signal
                    </span>
                  )}
                  {signal.overheat_watch && (
                    <span className="flex items-center gap-1 text-xs text-amber-400">
                      <AlertTriangle className="h-3 w-3" /> Overheat watch
                    </span>
                  )}
                </div>
              </div>
            </div>

            {/* Component bars */}
            <div className="space-y-2.5">
              <ComponentBar label="News" score={signal.news_score} weight={0.25} delta={signal.news_delta} />
              <ComponentBar label="Social" score={signal.social_score} weight={0.35} delta={signal.social_delta} />
              <ComponentBar label="Flow" score={signal.flow_score} weight={0.40} delta={signal.flow_delta} />
            </div>

            {/* Fear & Greed */}
            {signal.fear_greed_score !== null && (
              <div className="flex items-center justify-between px-3 py-2 rounded-lg bg-secondary/30 border border-border/30 text-xs">
                <span className="text-muted-foreground">Fear & Greed</span>
                <div className="flex items-center gap-2">
                  <div className="w-16 h-1.5 rounded-full bg-border/30 overflow-hidden">
                    <div className="h-full rounded-full transition-all"
                      style={{
                        width: `${signal.fear_greed_score}%`,
                        background: signal.fear_greed_score >= 80 ? "#ef4444" :
                          signal.fear_greed_score >= 60 ? "#f59e0b" : "#3b82f6"
                      }} />
                  </div>
                  <span className={`font-medium ${
                    signal.fear_greed_score >= 80 ? "text-red-400" :
                    signal.fear_greed_score >= 60 ? "text-amber-400" : "text-blue-400"
                  }`}>{signal.fear_greed_score.toFixed(0)}/100</span>
                </div>
              </div>
            )}

            {/* Collapsible agent reports */}
            {[
              { key: "synthesis", label: "Synthesis", content: signal.synthesis_report },
              { key: "news", label: "News Report", content: signal.news_report },
              { key: "social", label: "Social Report", content: signal.social_report },
              { key: "flow", label: "Flow Report", content: signal.flow_report },
            ].filter(r => r.content).map(report => (
              <div key={report.key} className="border border-border/30 rounded-lg overflow-hidden">
                <button
                  onClick={() => setExpanded(expanded === report.key ? null : report.key)}
                  className="w-full flex items-center justify-between px-4 py-2.5 text-xs font-medium text-muted-foreground hover:text-foreground hover:bg-secondary/20 transition-colors"
                >
                  {report.label}
                  {expanded === report.key ? <ChevronUp className="h-3.5 w-3.5" /> : <ChevronDown className="h-3.5 w-3.5" />}
                </button>
                {expanded === report.key && (
                  <div className="px-4 pb-4 pt-1">
                    <pre className="text-xs text-muted-foreground whitespace-pre-wrap font-mono leading-relaxed max-h-64 overflow-y-auto">
                      {report.content}
                    </pre>
                  </div>
                )}
              </div>
            ))}

          </div>
        )}
      </div>
    </div>
  );
}
