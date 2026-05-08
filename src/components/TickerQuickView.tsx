/**
 * Ticker Quick View Modal
 * Fast ticker preview without full page navigation
 */

import { useEffect, useState } from "react";
import { X, TrendingUp, TrendingDown, Minus, ExternalLink } from "lucide-react";
import { Link } from "react-router-dom";
import { supabase } from "../integrations/supabase/client";
import { AIAgentSummary } from "./AIAgentSummary";
import { getTickerAgentAnalyses, type AgentAnalysis } from "../lib/ai-agents";

interface TickerQuickViewProps {
  symbol: string;
  onClose: () => void;
}

interface TickerData {
  id: string;
  symbol: string;
  company_name: string | null;
  sector: string | null;
  avg_daily_mentions: number;
  mention_spike_threshold: number;
}

interface SentimentBreakdown {
  bullish: number;
  bearish: number;
  neutral: number;
}

export function TickerQuickView({ symbol, onClose }: TickerQuickViewProps) {
  const [ticker, setTicker] = useState<TickerData | null>(null);
  const [sentiment, setSentiment] = useState<SentimentBreakdown>({ bullish: 0, bearish: 0, neutral: 0 });
  const [agentAnalyses, setAgentAnalyses] = useState<AgentAnalysis[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadTickerData();
  }, [symbol]);

  async function loadTickerData() {
    setLoading(true);

    // Fetch ticker
    const { data: tickerData } = await supabase
      .from("tickers")
      .select("*")
      .eq("symbol", symbol)
      .single();

    if (!tickerData) {
      setLoading(false);
      return;
    }

    setTicker(tickerData);

    // Fetch sentiment breakdown
    const { data: predictions } = await supabase
      .from("predictions")
      .select("sentiment")
      .eq("ticker_id", tickerData.id)
      .gte("prediction_date", new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString());

    if (predictions) {
      const breakdown = {
        bullish: predictions.filter((p) => p.sentiment === "bullish").length,
        bearish: predictions.filter((p) => p.sentiment === "bearish").length,
        neutral: predictions.filter((p) => p.sentiment === "neutral").length,
      };
      setSentiment(breakdown);
    }

    // Fetch AI agent analyses
    const analyses = await getTickerAgentAnalyses(tickerData.id);
    setAgentAnalyses(analyses);

    setLoading(false);
  }

  if (loading || !ticker) {
    return (
      <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
        <div className="bg-card rounded-lg border shadow-2xl w-full max-w-2xl p-8 text-center">
          <div className="text-sm text-muted-foreground">Loading {symbol}...</div>
        </div>
      </div>
    );
  }

  const total = sentiment.bullish + sentiment.bearish + sentiment.neutral;
  const bullishPct = total > 0 ? (sentiment.bullish / total) * 100 : 0;

  return (
    <>
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50"
        onClick={onClose}
      />

      {/* Modal */}
      <div className="fixed top-[10vh] left-1/2 -translate-x-1/2 w-full max-w-3xl z-50 px-4 max-h-[80vh] overflow-y-auto">
        <div className="bg-card rounded-lg border shadow-2xl">
          {/* Header */}
          <div className="px-6 py-4 border-b flex items-start justify-between">
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-3 mb-2">
                <h2 className="text-2xl font-bold font-mono">{ticker.symbol}</h2>
                {ticker.sector && (
                  <span className="text-xs px-2 py-1 rounded bg-accent text-muted-foreground uppercase">
                    {ticker.sector}
                  </span>
                )}
              </div>
              {ticker.company_name && (
                <p className="text-sm text-muted-foreground">{ticker.company_name}</p>
              )}
            </div>
            <div className="flex items-center gap-2">
              <Link
                to={`/dashboard/tickers/${ticker.symbol}`}
                className="p-2 hover:bg-accent rounded-lg transition-colors"
                title="View full details"
              >
                <ExternalLink className="h-4 w-4" />
              </Link>
              <button
                onClick={onClose}
                className="p-2 hover:bg-accent rounded-lg transition-colors"
              >
                <X className="h-4 w-4" />
              </button>
            </div>
          </div>

          {/* Stats */}
          <div className="grid grid-cols-3 gap-4 p-6 border-b">
            <div>
              <div className="text-xs text-muted-foreground uppercase mb-1">Avg Daily Mentions</div>
              <div className="text-2xl font-bold font-mono">{ticker.avg_daily_mentions}</div>
            </div>
            <div>
              <div className="text-xs text-muted-foreground uppercase mb-1">Spike Threshold</div>
              <div className="text-2xl font-bold font-mono">{ticker.mention_spike_threshold}</div>
            </div>
            <div>
              <div className="text-xs text-muted-foreground uppercase mb-1">7d Predictions</div>
              <div className="text-2xl font-bold font-mono">{total}</div>
            </div>
          </div>

          {/* Social Sentiment */}
          {total > 0 && (
            <div className="p-6 border-b">
              <h3 className="text-sm font-semibold uppercase text-muted-foreground mb-3">
                Social Sentiment
              </h3>
              <div className="space-y-3">
                <div className="flex items-center justify-between text-sm">
                  <div className="flex items-center gap-2">
                    <TrendingUp className="h-4 w-4 text-green-500" />
                    <span>Bullish</span>
                  </div>
                  <span className="font-mono font-bold">
                    {sentiment.bullish} ({bullishPct.toFixed(0)}%)
                  </span>
                </div>
                <div className="flex items-center justify-between text-sm">
                  <div className="flex items-center gap-2">
                    <TrendingDown className="h-4 w-4 text-red-500" />
                    <span>Bearish</span>
                  </div>
                  <span className="font-mono font-bold">
                    {sentiment.bearish} ({((sentiment.bearish / total) * 100).toFixed(0)}%)
                  </span>
                </div>
                <div className="flex items-center justify-between text-sm">
                  <div className="flex items-center gap-2">
                    <Minus className="h-4 w-4 text-gray-500" />
                    <span>Neutral</span>
                  </div>
                  <span className="font-mono font-bold">
                    {sentiment.neutral} ({((sentiment.neutral / total) * 100).toFixed(0)}%)
                  </span>
                </div>
              </div>
            </div>
          )}

          {/* AI Agent Summary */}
          {agentAnalyses.length > 0 && (
            <div className="p-6">
              <AIAgentSummary analyses={agentAnalyses} />
            </div>
          )}

          {/* Footer */}
          <div className="px-6 py-4 border-t bg-accent/20 flex items-center justify-between">
            <div className="text-xs text-muted-foreground">
              Quick view • <Link to={`/dashboard/tickers/${ticker.symbol}`} className="text-primary hover:underline">See full analysis →</Link>
            </div>
            <button
              onClick={onClose}
              className="text-xs text-muted-foreground hover:text-foreground"
            >
              Close (ESC)
            </button>
          </div>
        </div>
      </div>
    </>
  );
}
