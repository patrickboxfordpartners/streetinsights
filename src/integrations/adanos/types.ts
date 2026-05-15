export type AdanosSourceId = "reddit" | "x" | "news" | "polymarket";

export type SourceAlignment = "aligned" | "mixed" | "divergent" | "single_source" | "unavailable";

export interface SentimentSourceSnapshot {
  source_id: AdanosSourceId;
  label: string;
  available: boolean;
  buzz_score: number;
  bullish_pct: number;
  sentiment_score: number;
  activity_count: number;
}

export interface MarketSentimentSnapshot {
  symbol: string;
  ticker_id?: string;
  status: "ok" | "unavailable" | "not_configured" | "error";
  message?: string;
  average_buzz: number;
  average_bullish_pct: number;
  coverage: number;
  source_alignment: SourceAlignment;
  sources: SentimentSourceSnapshot[];
  fetched_at: string;
}
