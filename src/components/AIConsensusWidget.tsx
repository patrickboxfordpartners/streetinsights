/**
 * AI Consensus Widget
 * Dashboard widget showing recent AI agent sentiment changes
 */

import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { Brain, TrendingUp, TrendingDown, ArrowRight, Sparkles } from "lucide-react";
import { supabase } from "../integrations/supabase/client";

interface AgentChange {
  ticker_symbol: string;
  ticker_id: string;
  company_name: string | null;
  agent_name: string;
  sentiment: "bullish" | "bearish" | "neutral" | "hold";
  confidence_score: number;
  analyzed_at: string;
  bullish_count: number;
  bearish_count: number;
  total_agents: number;
}

export function AIConsensusWidget() {
  const [changes, setChanges] = useState<AgentChange[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadRecentChanges();
  }, []);

  async function loadRecentChanges() {
    setLoading(true);

    // Get recent analyses grouped by ticker
    const { data: analyses } = await supabase
      .from("ai_agent_analyses")
      .select(
        `
        ticker_id,
        agent_persona_id,
        sentiment,
        confidence_score,
        analyzed_at,
        tickers!inner (
          symbol,
          company_name
        ),
        ai_agent_personas!inner (
          name
        )
      `
      )
      .gte("analyzed_at", new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString()) // Last 24h
      .order("analyzed_at", { ascending: false })
      .limit(50);

    if (!analyses || analyses.length === 0) {
      setLoading(false);
      return;
    }

    // Group by ticker and calculate consensus
    const tickerMap = new Map<string, any>();

    analyses.forEach((a: any) => {
      const tickerId = a.ticker_id;
      if (!tickerMap.has(tickerId)) {
        tickerMap.set(tickerId, {
          ticker_id: tickerId,
          ticker_symbol: a.tickers.symbol,
          company_name: a.tickers.company_name,
          agents: [],
        });
      }

      tickerMap.get(tickerId).agents.push({
        name: a.ai_agent_personas.name,
        sentiment: a.sentiment,
        confidence: a.confidence_score,
        analyzed_at: a.analyzed_at,
      });
    });

    // Calculate consensus and sort by most interesting
    const interesting: AgentChange[] = [];

    tickerMap.forEach((ticker) => {
      const bullish = ticker.agents.filter((a: any) => a.sentiment === "bullish").length;
      const bearish = ticker.agents.filter((a: any) => a.sentiment === "bearish").length;
      const total = ticker.agents.length;

      // Only show if we have at least 3 agents analyzed
      if (total >= 3) {
        // Most recent agent
        const latest = ticker.agents[0];

        interesting.push({
          ticker_symbol: ticker.ticker_symbol,
          ticker_id: ticker.ticker_id,
          company_name: ticker.company_name,
          agent_name: latest.name,
          sentiment: latest.sentiment,
          confidence_score: latest.confidence,
          analyzed_at: latest.analyzed_at,
          bullish_count: bullish,
          bearish_count: bearish,
          total_agents: total,
        });
      }
    });

    // Sort by consensus strength (most skewed = most interesting)
    interesting.sort((a, b) => {
      const aSkew = Math.abs(a.bullish_count - a.bearish_count) / a.total_agents;
      const bSkew = Math.abs(b.bullish_count - b.bearish_count) / b.total_agents;
      return bSkew - aSkew;
    });

    setChanges(interesting.slice(0, 5));
    setLoading(false);
  }

  if (loading) {
    return (
      <div className="bg-card rounded-lg border p-6">
        <div className="flex items-center gap-2 mb-4">
          <Brain className="h-5 w-5 text-primary animate-pulse" />
          <h2 className="text-lg font-semibold">AI Agent Highlights</h2>
        </div>
        <div className="text-sm text-muted-foreground">Loading agent analyses...</div>
      </div>
    );
  }

  if (changes.length === 0) {
    return (
      <div className="bg-card rounded-lg border p-6">
        <div className="flex items-center gap-2 mb-4">
          <Brain className="h-5 w-5 text-primary" />
          <h2 className="text-lg font-semibold">AI Agent Highlights</h2>
        </div>
        <div className="text-sm text-muted-foreground">
          No recent agent analyses. Check back soon!
        </div>
      </div>
    );
  }

  return (
    <div className="bg-card rounded-lg border">
      {/* Header */}
      <div className="p-4 border-b">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Brain className="h-5 w-5 text-primary" />
            <h2 className="text-lg font-semibold">AI Agent Highlights</h2>
          </div>
          <div className="flex items-center gap-1 text-xs text-muted-foreground">
            <Sparkles className="h-3 w-3" />
            <span>Last 24h</span>
          </div>
        </div>
        <p className="text-xs text-muted-foreground mt-1">
          Recent consensus from legendary investor personas
        </p>
      </div>

      {/* Changes List */}
      <div className="divide-y">
        {changes.map((change) => {
          const consensus =
            change.bullish_count > change.bearish_count
              ? "bullish"
              : change.bearish_count > change.bullish_count
                ? "bearish"
                : "mixed";

          const consensusPct =
            consensus === "bullish"
              ? (change.bullish_count / change.total_agents) * 100
              : consensus === "bearish"
                ? (change.bearish_count / change.total_agents) * 100
                : 50;

          return (
            <Link
              key={change.ticker_id}
              to={`/dashboard/tickers/${change.ticker_symbol}`}
              className="block p-4 hover:bg-accent/30 transition-colors"
            >
              <div className="flex items-start justify-between gap-4">
                <div className="flex-1 min-w-0">
                  {/* Ticker */}
                  <div className="flex items-center gap-2 mb-1">
                    <span className="font-mono font-bold text-lg">
                      {change.ticker_symbol}
                    </span>
                    {consensus === "bullish" && (
                      <TrendingUp className="h-4 w-4 text-green-500" />
                    )}
                    {consensus === "bearish" && (
                      <TrendingDown className="h-4 w-4 text-red-500" />
                    )}
                  </div>

                  {/* Company name */}
                  {change.company_name && (
                    <div className="text-sm text-muted-foreground truncate mb-2">
                      {change.company_name}
                    </div>
                  )}

                  {/* Consensus */}
                  <div className="flex items-center gap-3">
                    <div className="text-sm">
                      <span
                        className={`font-semibold ${
                          consensus === "bullish"
                            ? "text-green-500"
                            : consensus === "bearish"
                              ? "text-red-500"
                              : "text-yellow-500"
                        }`}
                      >
                        {change.bullish_count}/{change.total_agents} bullish
                      </span>
                      <span className="text-muted-foreground mx-1">•</span>
                      <span className="text-muted-foreground">
                        {consensusPct.toFixed(0)}% consensus
                      </span>
                    </div>
                  </div>

                  {/* Latest agent */}
                  <div className="text-xs text-muted-foreground mt-2">
                    Latest: {change.agent_name} •{" "}
                    {new Date(change.analyzed_at).toLocaleTimeString([], {
                      hour: "2-digit",
                      minute: "2-digit",
                    })}
                  </div>
                </div>

                {/* Arrow */}
                <div className="flex-shrink-0 pt-2">
                  <ArrowRight className="h-5 w-5 text-muted-foreground" />
                </div>
              </div>
            </Link>
          );
        })}
      </div>

      {/* Footer */}
      <div className="p-4 border-t bg-accent/20">
        <div className="text-xs text-center text-muted-foreground">
          Powered by 6 legendary investor frameworks
        </div>
      </div>
    </div>
  );
}
