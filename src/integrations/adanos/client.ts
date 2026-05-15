import type {
  AdanosSourceId,
  MarketSentimentSnapshot,
  SentimentSourceSnapshot,
  SourceAlignment,
} from "./types.js";

const BASE_URL = "https://api.adanos.io";
const SOURCE_IDS: AdanosSourceId[] = ["reddit", "x", "news", "polymarket"];
const SOURCE_LABELS: Record<AdanosSourceId, string> = {
  reddit: "Reddit",
  x: "X",
  news: "News",
  polymarket: "Polymarket",
};
const DAYS_DEFAULT = 7;

function parseSourcePayload(
  source_id: AdanosSourceId,
  payload: Record<string, unknown>
): SentimentSourceSnapshot {
  // Response may be wrapped: { data: { stocks: [...] } } or { stocks: [...] }
  const root =
    payload.data && typeof payload.data === "object"
      ? (payload.data as Record<string, unknown>)
      : payload;

  const stocksRaw = root.stocks ?? root.results;
  const stocks = Array.isArray(stocksRaw) ? stocksRaw : [];
  const stock: Record<string, unknown> =
    stocks.length > 0 && typeof stocks[0] === "object" ? stocks[0] : {};

  const num = (keys: string[]): number => {
    for (const k of keys) {
      const v = stock[k];
      if (typeof v === "number") return v;
      if (typeof v === "string" && v !== "") {
        const n = parseFloat(v);
        if (!isNaN(n)) return n;
      }
    }
    return 0;
  };

  const buzz_score = num(["buzz_score"]);
  const bullish_pct = num(["bullish_pct"]);
  const sentiment_score = num(["sentiment_score", "sentiment"]);
  const activity_count = num([
    "mentions",
    "trade_count",
    "unique_posts",
    "source_count",
    "subreddit_count",
    "market_count",
    "unique_traders",
  ]);

  const available =
    activity_count > 0 || buzz_score > 0 || bullish_pct > 0 || sentiment_score !== 0;

  return {
    source_id,
    label: SOURCE_LABELS[source_id],
    available,
    buzz_score,
    bullish_pct,
    sentiment_score,
    activity_count,
  };
}

function computeAlignment(sources: SentimentSourceSnapshot[]): SourceAlignment {
  const values = sources.filter((s) => s.available).map((s) => s.bullish_pct);
  if (values.length === 0) return "unavailable";
  if (values.length === 1) return "single_source";
  const spread = Math.max(...values) - Math.min(...values);
  if (spread <= 12) return "aligned";
  if (spread <= 25) return "mixed";
  return "divergent";
}

async function fetchSource(
  symbol: string,
  source_id: AdanosSourceId,
  apiKey: string,
  days: number
): Promise<SentimentSourceSnapshot> {
  const url = new URL(`${BASE_URL}/${source_id}/stocks/v1/compare`);
  url.searchParams.set("tickers", symbol.toUpperCase());
  url.searchParams.set("days", String(days));

  const res = await fetch(url.toString(), {
    headers: {
      "Content-Type": "application/json",
      "User-Agent": "market-signals/1.0",
      "X-API-Key": apiKey,
    },
  });

  if (!res.ok) {
    console.warn(`[adanos] ${source_id}/${symbol} HTTP ${res.status}`);
    return {
      source_id,
      label: SOURCE_LABELS[source_id],
      available: false,
      buzz_score: 0,
      bullish_pct: 0,
      sentiment_score: 0,
      activity_count: 0,
    };
  }

  const body = (await res.json()) as Record<string, unknown>;
  return parseSourcePayload(source_id, body);
}

export async function fetchMarketSentiment(
  symbol: string,
  options: { apiKey?: string; days?: number } = {}
): Promise<MarketSentimentSnapshot> {
  const apiKey = options.apiKey ?? process.env.ADANOS_API_KEY ?? "";
  const days = options.days ?? DAYS_DEFAULT;
  const normalized = symbol.toUpperCase().trim();

  if (!apiKey) {
    return {
      symbol: normalized,
      status: "not_configured",
      message: "ADANOS_API_KEY not configured.",
      average_buzz: 0,
      average_bullish_pct: 0,
      coverage: 0,
      source_alignment: "unavailable",
      sources: [],
      fetched_at: new Date().toISOString(),
    };
  }

  const sources = await Promise.all(
    SOURCE_IDS.map((id) => fetchSource(normalized, id, apiKey, days))
  );

  const available = sources.filter((s) => s.available);
  const coverage = available.length;

  if (coverage === 0) {
    return {
      symbol: normalized,
      status: "unavailable",
      message: `No Adanos sentiment data available for ${normalized} yet.`,
      average_buzz: 0,
      average_bullish_pct: 0,
      coverage: 0,
      source_alignment: "unavailable",
      sources,
      fetched_at: new Date().toISOString(),
    };
  }

  const average_buzz =
    available.reduce((sum, s) => sum + s.buzz_score, 0) / coverage;
  const average_bullish_pct =
    available.reduce((sum, s) => sum + s.bullish_pct, 0) / coverage;

  return {
    symbol: normalized,
    status: "ok",
    average_buzz,
    average_bullish_pct,
    coverage,
    source_alignment: computeAlignment(sources),
    sources,
    fetched_at: new Date().toISOString(),
  };
}
