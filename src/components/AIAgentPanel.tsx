/**
 * AI Agent Analysis Panel
 * Display investment framework analyses from different personas
 */

import { useEffect, useState } from "react";
import { TrendingUp, TrendingDown, Minus, Brain, AlertCircle, CheckCircle2 } from "lucide-react";
import { getTickerAgentAnalyses, type AgentAnalysis } from "../lib/ai-agents";

interface AIAgentPanelProps {
  tickerId: string;
}

export function AIAgentPanel({ tickerId }: AIAgentPanelProps) {
  const [analyses, setAnalyses] = useState<AgentAnalysis[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedAgent, setSelectedAgent] = useState<string | null>(null);

  useEffect(() => {
    loadAnalyses();
  }, [tickerId]);

  async function loadAnalyses() {
    setLoading(true);
    const data = await getTickerAgentAnalyses(tickerId);
    setAnalyses(data);
    if (data.length > 0 && !selectedAgent) {
      setSelectedAgent(data[0].id);
    }
    setLoading(false);
  }

  if (loading) {
    return (
      <div className="bg-card rounded-lg border p-6">
        <div className="flex items-center gap-2 mb-4">
          <Brain className="h-5 w-5 text-primary" />
          <h2 className="text-lg font-semibold">AI Agent Analysis</h2>
        </div>
        <div className="text-sm text-muted-foreground">Loading analyses...</div>
      </div>
    );
  }

  if (analyses.length === 0) {
    return (
      <div className="bg-card rounded-lg border p-6">
        <div className="flex items-center gap-2 mb-4">
          <Brain className="h-5 w-5 text-primary" />
          <h2 className="text-lg font-semibold">AI Agent Analysis</h2>
        </div>
        <div className="text-sm text-muted-foreground">
          No analyses available yet. Check back soon!
        </div>
      </div>
    );
  }

  const selected = analyses.find((a) => a.id === selectedAgent) || analyses[0];

  return (
    <div className="bg-card rounded-lg border">
      {/* Header */}
      <div className="p-4 border-b">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Brain className="h-5 w-5 text-primary" />
            <h2 className="text-lg font-semibold">AI Agent Analysis</h2>
          </div>
          <div className="text-xs text-muted-foreground">
            {analyses.length} {analyses.length === 1 ? "agent" : "agents"}
          </div>
        </div>
        <p className="text-xs text-muted-foreground mt-1">
          Investment framework perspectives from legendary investors
        </p>
      </div>

      {/* Agent Tabs */}
      <div className="flex overflow-x-auto border-b">
        {analyses.map((analysis) => {
          const isSelected = analysis.id === selectedAgent;
          const sentiment = analysis.sentiment;

          return (
            <button
              key={analysis.id}
              onClick={() => setSelectedAgent(analysis.id)}
              className={`flex-shrink-0 px-4 py-3 text-sm font-medium border-b-2 transition-colors ${
                isSelected
                  ? "border-primary text-primary bg-primary/5"
                  : "border-transparent text-muted-foreground hover:text-foreground hover:bg-accent"
              }`}
            >
              <div className="flex items-center gap-2">
                <span>{analysis.persona_name}</span>
                {sentiment === "bullish" && <TrendingUp className="h-4 w-4 text-green-500" />}
                {sentiment === "bearish" && <TrendingDown className="h-4 w-4 text-red-500" />}
                {sentiment === "neutral" && <Minus className="h-4 w-4 text-gray-500" />}
                {sentiment === "hold" && <Minus className="h-4 w-4 text-yellow-500" />}
              </div>
            </button>
          );
        })}
      </div>

      {/* Analysis Content */}
      <div className="p-6 space-y-6">
        {/* Agent Info */}
        <div>
          <div className="flex items-start justify-between mb-2">
            <div>
              <h3 className="text-xl font-bold">{selected.persona_name}</h3>
              {selected.persona_framework && (
                <p className="text-sm text-muted-foreground mt-1">{selected.persona_framework}</p>
              )}
            </div>
            <div className="text-right">
              <div className="flex items-center gap-2">
                {getSentimentIcon(selected.sentiment)}
                <span className="text-lg font-bold capitalize">{selected.sentiment}</span>
              </div>
              <div className="text-sm text-muted-foreground">
                {selected.confidence_score}% confidence
              </div>
            </div>
          </div>
          <div className="h-2 bg-accent rounded-full overflow-hidden">
            <div
              className={`h-full transition-all ${
                selected.sentiment === "bullish"
                  ? "bg-green-500"
                  : selected.sentiment === "bearish"
                    ? "bg-red-500"
                    : selected.sentiment === "hold"
                      ? "bg-yellow-500"
                      : "bg-gray-500"
              }`}
              style={{ width: `${selected.confidence_score}%` }}
            />
          </div>
        </div>

        {/* Recommendation */}
        {selected.recommendation && (
          <div className="bg-primary/5 border border-primary/20 rounded-lg p-4">
            <div className="flex items-start gap-3">
              <CheckCircle2 className="h-5 w-5 text-primary flex-shrink-0 mt-0.5" />
              <div>
                <div className="text-sm font-semibold text-primary mb-1">Recommendation</div>
                <div className="text-sm">{selected.recommendation}</div>
              </div>
            </div>
          </div>
        )}

        {/* Key Factors */}
        {selected.key_factors && selected.key_factors.length > 0 && (
          <div>
            <div className="flex items-center gap-2 mb-3">
              <CheckCircle2 className="h-4 w-4 text-green-500" />
              <h4 className="text-sm font-semibold uppercase tracking-wider text-muted-foreground">
                Key Factors
              </h4>
            </div>
            <ul className="space-y-2">
              {selected.key_factors.map((factor, i) => (
                <li key={i} className="flex items-start gap-2 text-sm">
                  <span className="text-green-500 mt-1">•</span>
                  <span>{factor}</span>
                </li>
              ))}
            </ul>
          </div>
        )}

        {/* Risks */}
        {selected.risks && selected.risks.length > 0 && (
          <div>
            <div className="flex items-center gap-2 mb-3">
              <AlertCircle className="h-4 w-4 text-red-500" />
              <h4 className="text-sm font-semibold uppercase tracking-wider text-muted-foreground">
                Risks
              </h4>
            </div>
            <ul className="space-y-2">
              {selected.risks.map((risk, i) => (
                <li key={i} className="flex items-start gap-2 text-sm">
                  <span className="text-red-500 mt-1">•</span>
                  <span>{risk}</span>
                </li>
              ))}
            </ul>
          </div>
        )}

        {/* Full Analysis */}
        <div>
          <h4 className="text-sm font-semibold uppercase tracking-wider text-muted-foreground mb-3">
            Full Analysis
          </h4>
          <div className="text-sm leading-relaxed whitespace-pre-wrap bg-accent/30 rounded-lg p-4 border">
            {selected.analysis_text}
          </div>
        </div>

        {/* Metadata */}
        <div className="flex items-center justify-between text-xs text-muted-foreground pt-4 border-t">
          <div>
            Analyzed {new Date(selected.analyzed_at).toLocaleDateString()} at{" "}
            {new Date(selected.analyzed_at).toLocaleTimeString()}
          </div>
          {selected.price_at_analysis && (
            <div>Price at analysis: ${selected.price_at_analysis.toFixed(2)}</div>
          )}
        </div>
      </div>
    </div>
  );
}

function getSentimentIcon(sentiment: string) {
  switch (sentiment) {
    case "bullish":
      return <TrendingUp className="h-5 w-5 text-green-500" />;
    case "bearish":
      return <TrendingDown className="h-5 w-5 text-red-500" />;
    case "hold":
      return <Minus className="h-5 w-5 text-yellow-500" />;
    default:
      return <Minus className="h-5 w-5 text-gray-500" />;
  }
}
