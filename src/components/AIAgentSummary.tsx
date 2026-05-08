/**
 * AI Agent Analysis Summary
 * Compact view showing consensus across all agents
 */

import { Brain, TrendingUp, TrendingDown, Minus } from "lucide-react";
import { type AgentAnalysis } from "../lib/ai-agents";

interface AIAgentSummaryProps {
  analyses: AgentAnalysis[];
}

export function AIAgentSummary({ analyses }: AIAgentSummaryProps) {
  if (analyses.length === 0) {
    return null;
  }

  // Calculate consensus
  const sentimentCounts = {
    bullish: analyses.filter((a) => a.sentiment === "bullish").length,
    bearish: analyses.filter((a) => a.sentiment === "bearish").length,
    neutral: analyses.filter((a) => a.sentiment === "neutral").length,
    hold: analyses.filter((a) => a.sentiment === "hold").length,
  };

  const total = analyses.length;
  const avgConfidence =
    analyses.reduce((sum, a) => sum + (a.confidence_score || 0), 0) / total;

  // Determine consensus
  let consensus: "bullish" | "bearish" | "mixed" | "neutral" = "neutral";
  const bullishPct = (sentimentCounts.bullish / total) * 100;
  const bearishPct = (sentimentCounts.bearish / total) * 100;

  if (bullishPct >= 60) consensus = "bullish";
  else if (bearishPct >= 60) consensus = "bearish";
  else if (Math.abs(bullishPct - bearishPct) <= 20) consensus = "mixed";

  return (
    <div className="bg-card rounded-lg border p-4">
      {/* Header */}
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <Brain className="h-4 w-4 text-primary" />
          <h3 className="text-sm font-semibold">AI Agent Consensus</h3>
        </div>
        <div className="text-xs text-muted-foreground">
          {total} {total === 1 ? "agent" : "agents"}
        </div>
      </div>

      {/* Consensus Badge */}
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          {consensus === "bullish" && <TrendingUp className="h-5 w-5 text-green-500" />}
          {consensus === "bearish" && <TrendingDown className="h-5 w-5 text-red-500" />}
          {consensus === "mixed" && <Minus className="h-5 w-5 text-yellow-500" />}
          {consensus === "neutral" && <Minus className="h-5 w-5 text-gray-500" />}
          <div>
            <div className="text-lg font-bold capitalize">{consensus}</div>
            <div className="text-xs text-muted-foreground">
              {avgConfidence.toFixed(0)}% avg confidence
            </div>
          </div>
        </div>
      </div>

      {/* Breakdown */}
      <div className="space-y-2">
        <div className="flex items-center justify-between text-sm">
          <div className="flex items-center gap-2">
            <TrendingUp className="h-4 w-4 text-green-500" />
            <span className="text-muted-foreground">Bullish</span>
          </div>
          <div className="font-mono font-semibold">
            {sentimentCounts.bullish}/{total}
          </div>
        </div>
        <div className="flex items-center justify-between text-sm">
          <div className="flex items-center gap-2">
            <TrendingDown className="h-4 w-4 text-red-500" />
            <span className="text-muted-foreground">Bearish</span>
          </div>
          <div className="font-mono font-semibold">
            {sentimentCounts.bearish}/{total}
          </div>
        </div>
        <div className="flex items-center justify-between text-sm">
          <div className="flex items-center gap-2">
            <Minus className="h-4 w-4 text-gray-500" />
            <span className="text-muted-foreground">Neutral/Hold</span>
          </div>
          <div className="font-mono font-semibold">
            {sentimentCounts.neutral + sentimentCounts.hold}/{total}
          </div>
        </div>
      </div>

      {/* Agent Names */}
      <div className="mt-4 pt-4 border-t">
        <div className="text-xs text-muted-foreground mb-2">Active Agents:</div>
        <div className="flex flex-wrap gap-2">
          {analyses.map((a) => (
            <div
              key={a.id}
              className="inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs bg-accent"
            >
              {a.sentiment === "bullish" && (
                <TrendingUp className="h-3 w-3 text-green-500" />
              )}
              {a.sentiment === "bearish" && (
                <TrendingDown className="h-3 w-3 text-red-500" />
              )}
              {a.sentiment === "neutral" && <Minus className="h-3 w-3 text-gray-500" />}
              {a.sentiment === "hold" && <Minus className="h-3 w-3 text-yellow-500" />}
              <span>{a.persona_name?.split(" ")[1] || a.persona_name}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
