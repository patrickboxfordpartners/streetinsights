import "dotenv/config";
import express from "express";
import cors from "cors";
import { readFileSync } from "fs";
import { join, dirname } from "path";
import { fileURLToPath } from "url";
import { serve } from "inngest/express";
import { inngest } from "./src/inngest/client.js";
import * as functions from "./src/inngest/functions/index.js";
import { handleMcp } from "./src/mcp/server.js";
import { naturalLanguageToSQL, explainSQL, isSafeQuery } from "./src/lib/nl-query.js";
import { calculateTechnicalIndicators } from "./src/lib/technical-indicators.js";
import YahooFinance from "yahoo-finance2";
import { rawQuery } from "./src/db/execute.js";
import { mountApi, mountStripeWebhook } from "./src/server/routes.js";

const __dirname = dirname(fileURLToPath(import.meta.url));
const AVAILABLE_DOCS = ["overview", "mcp", "query"] as const;
type DocSlug = (typeof AVAILABLE_DOCS)[number];
const DOCS_DIR = join(__dirname, "docs");
const docCache = new Map<string, string>();

function readDoc(slug: string): string {
  const hit = docCache.get(slug);
  if (hit !== undefined) return hit;
  const md = readFileSync(join(DOCS_DIR, `${slug}.md`), "utf8");
  docCache.set(slug, md);
  return md;
}

const yahooFinance = new YahooFinance({ suppressNotices: ["yahooSurvey"] });

// Per-symbol quote cache. A single shared blob was replaced on every
// distinct symbol list, so a one-ticker page wiped the dashboard cache.
const QUOTE_CACHE_TTL_MS = 60_000;
const MAX_QUOTE_SYMBOLS = 40;
const MAX_CACHED_QUOTES = 200;
const quoteCache = new Map<string, { quote: CachedQuote; ts: number }>();

interface CachedQuote {
  symbol: string;
  price: number;
  change: number;
  changePercent: number;
  marketState: string | undefined;
  dayLow: number;
  dayHigh: number;
  yearHigh: number;
  yearLow: number;
  marketCap: number;
  volume: number;
  avgVolume: number;
  open: number;
  previousClose: number;
  pe: number;
  forwardPE: number;
  eps: number;
  forwardEps: number;
  fiftyDayAvg: number;
  twoHundredDayAvg: number;
  bookValue: number;
  priceToBook: number;
  revenue: number;
  revenuePerShare: number;
  profitMargins: number;
  operatingMargins: number;
  returnOnAssets: number;
  returnOnEquity: number;
  debtToEquity: number;
  currentRatio: number;
  quickRatio: number;
  grossMargins: number;
  ebitdaMargins: number;
}

interface YahooQuoteFields {
  symbol?: string;
  regularMarketPrice?: number;
  regularMarketChange?: number;
  regularMarketChangePercent?: number;
  marketState?: string;
  regularMarketDayLow?: number;
  regularMarketDayHigh?: number;
  fiftyTwoWeekHigh?: number;
  fiftyTwoWeekLow?: number;
  marketCap?: number;
  regularMarketVolume?: number;
  averageDailyVolume3Month?: number;
  regularMarketOpen?: number;
  regularMarketPreviousClose?: number;
  trailingPE?: number;
  forwardPE?: number;
  trailingEps?: number;
  epsForward?: number;
  fiftyDayAverage?: number;
  twoHundredDayAverage?: number;
  bookValue?: number;
  priceToBook?: number;
  totalRevenue?: number;
  revenuePerShare?: number;
  profitMargins?: number;
  operatingMargins?: number;
  returnOnAssets?: number;
  returnOnEquity?: number;
  debtToEquity?: number;
  currentRatio?: number;
  quickRatio?: number;
  grossMargins?: number;
  ebitdaMargins?: number;
}

function mapYahooQuote(q: YahooQuoteFields): CachedQuote {
  return {
    symbol: q.symbol ?? "",
    price: q.regularMarketPrice ?? 0,
    change: q.regularMarketChange ?? 0,
    changePercent: q.regularMarketChangePercent ?? 0,
    marketState: q.marketState,
    dayLow: q.regularMarketDayLow ?? 0,
    dayHigh: q.regularMarketDayHigh ?? 0,
    yearHigh: q.fiftyTwoWeekHigh ?? 0,
    yearLow: q.fiftyTwoWeekLow ?? 0,
    marketCap: q.marketCap ?? 0,
    volume: q.regularMarketVolume ?? 0,
    avgVolume: q.averageDailyVolume3Month ?? 0,
    open: q.regularMarketOpen ?? 0,
    previousClose: q.regularMarketPreviousClose ?? 0,
    pe: q.trailingPE ?? 0,
    forwardPE: q.forwardPE ?? 0,
    eps: q.trailingEps ?? 0,
    forwardEps: q.epsForward ?? 0,
    fiftyDayAvg: q.fiftyDayAverage ?? 0,
    twoHundredDayAvg: q.twoHundredDayAverage ?? 0,
    bookValue: q.bookValue ?? 0,
    priceToBook: q.priceToBook ?? 0,
    revenue: q.totalRevenue ?? 0,
    revenuePerShare: q.revenuePerShare ?? 0,
    profitMargins: q.profitMargins ?? 0,
    operatingMargins: q.operatingMargins ?? 0,
    returnOnAssets: q.returnOnAssets ?? 0,
    returnOnEquity: q.returnOnEquity ?? 0,
    debtToEquity: q.debtToEquity ?? 0,
    currentRatio: q.currentRatio ?? 0,
    quickRatio: q.quickRatio ?? 0,
    grossMargins: q.grossMargins ?? 0,
    ebitdaMargins: q.ebitdaMargins ?? 0,
  };
}

function rememberQuote(quote: CachedQuote, ts: number) {
  if (!quote.symbol) return;
  quoteCache.delete(quote.symbol);
  quoteCache.set(quote.symbol, { quote, ts });
  while (quoteCache.size > MAX_CACHED_QUOTES) {
    const oldest = quoteCache.keys().next().value;
    if (!oldest) break;
    quoteCache.delete(oldest);
  }
}

const DEFAULT_SYMBOLS = [
  "NVDA", "TSLA", "AAPL", "MSFT", "GOOGL", "META", "AMD", "PLTR",
  "AMZN", "NFLX", "SPY", "QQQ", "COIN", "SOFI", "SMCI", "ARM",
];

const TECHNICALS_TTL_MS = 5 * 60_000;
const MAX_CACHED_TECHNICALS = 50;
const technicalsCache = new Map<string, { body: unknown; ts: number }>();

function rememberTechnicals(symbol: string, body: unknown) {
  technicalsCache.delete(symbol);
  technicalsCache.set(symbol, { body, ts: Date.now() });
  while (technicalsCache.size > MAX_CACHED_TECHNICALS) {
    const oldest = technicalsCache.keys().next().value;
    if (!oldest) break;
    technicalsCache.delete(oldest);
  }
}

const app = express();
const port = process.env.PORT || 3001;

// Stripe signature verification needs the raw body, so this route is mounted
// before the JSON parser.
mountStripeWebhook(app);
app.use(cors());
app.use(express.json({ limit: "4mb" }));
mountApi(app);

// Inngest endpoint — serveHost tells Inngest Cloud how to reach this worker
app.use(
  "/api/inngest",
  serve({
    client: inngest,
    functions: Object.values(functions),
    serveHost: process.env.WORKER_HOST || (process.env.RAILWAY_PUBLIC_DOMAIN
      ? `https://${process.env.RAILWAY_PUBLIC_DOMAIN}`
      : undefined),
    servePath: "/api/inngest",
  })
);

app.get("/api/quotes", async (req, res) => {
  try {
    const symbolsParam = req.query.symbols;
    const requested = typeof symbolsParam === "string"
      ? symbolsParam.split(",").map((s) => s.trim().toUpperCase()).filter(Boolean)
      : DEFAULT_SYMBOLS;
    const symbols = [...new Set(requested)].slice(0, MAX_QUOTE_SYMBOLS);
    if (symbols.length === 0) {
      res.status(400).json({ error: "symbols is required" });
      return;
    }

    const now = Date.now();
    const fresh = new Map<string, CachedQuote>();
    const missing: string[] = [];
    for (const symbol of symbols) {
      const hit = quoteCache.get(symbol);
      if (hit && now - hit.ts < QUOTE_CACHE_TTL_MS) fresh.set(symbol, hit.quote);
      else missing.push(symbol);
    }

    if (missing.length > 0) {
      try {
        const results = await yahooFinance.quote(missing);
        const quotes = (Array.isArray(results) ? results : [results]).map((q) => mapYahooQuote(q));
        for (const quote of quotes) {
          rememberQuote(quote, now);
          if (quote.symbol) fresh.set(quote.symbol, quote);
        }
      } catch {
        const stale = symbols
          .map((symbol) => quoteCache.get(symbol)?.quote)
          .filter((quote): quote is CachedQuote => !!quote);
        if (stale.length > 0) {
          res.json(stale);
          return;
        }
        res.status(502).json({ error: "Quote service temporarily unavailable" });
        return;
      }
    }

    res.json(
      symbols
        .map((symbol) => fresh.get(symbol))
        .filter((quote): quote is CachedQuote => !!quote),
    );
  } catch {
    res.status(502).json({ error: "Quote service temporarily unavailable" });
  }
});

// Trigger swarm sentiment run for a ticker
app.post("/api/swarm/run", async (req, res) => {
  const { symbol, tickerId } = req.body || {};
  if (!symbol) {
    return res.status(400).json({ error: "symbol is required" });
  }
  try {
    await inngest.send({
      name: "ticker/swarm-sentiment.requested",
      data: { symbol: symbol.toUpperCase(), tickerId: tickerId || undefined },
    });
    res.json({ ok: true, symbol: symbol.toUpperCase() });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// Natural language query endpoint
app.post("/api/query", async (req, res) => {
  if (!process.env.DATABASE_URL) {
    res.status(503).json({ error: "DATABASE_URL not configured" });
    return;
  }

  const { question } = req.body || {};
  if (!question || typeof question !== "string" || question.trim().length < 3) {
    res.status(400).json({ error: "question is required" });
    return;
  }

  try {
    const sql = await naturalLanguageToSQL(question.trim());

    if (!isSafeQuery(sql)) {
      res.status(400).json({ error: "Generated query was not a safe SELECT statement", sql });
      return;
    }

    const explanationPromise = explainSQL(question, sql).catch(() => "Explanation unavailable.");
    const rows = await rawQuery(sql);
    const columns = rows[0] ? Object.keys(rows[0]) : [];
    const explanation = await explanationPromise;

    res.json({ sql, results: { rows, columns }, explanation });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// Technical indicators endpoint — fetches 200d history from Yahoo Finance and computes RSI, MA, MACD
app.get("/api/technicals/:symbol", async (req, res) => {
  const symbol = req.params.symbol.toUpperCase();
  if (!/^[A-Z0-9.\-]{1,10}$/.test(symbol)) {
    res.status(400).json({ error: "invalid symbol" });
    return;
  }
  const cached = technicalsCache.get(symbol);
  if (cached && Date.now() - cached.ts < TECHNICALS_TTL_MS) {
    res.json(cached.body);
    return;
  }
  try {
    const end = new Date();
    const start = new Date();
    start.setFullYear(start.getFullYear() - 1); // 1 year of history for MA200

    const history = await yahooFinance.historical(symbol, {
      period1: start.toISOString().split("T")[0],
      period2: end.toISOString().split("T")[0],
      interval: "1d",
    });

    if (!history || history.length === 0) {
      res.status(404).json({ error: `No price history for ${symbol}` });
      return;
    }

    const bars = history.map((d) => ({
      date: d.date.toISOString().split("T")[0],
      open: d.open ?? 0,
      high: d.high ?? 0,
      low: d.low ?? 0,
      close: d.close ?? 0,
      volume: d.volume ?? 0,
    }));

    const indicators = calculateTechnicalIndicators(bars);
    const body = { symbol, bars_fetched: bars.length, indicators };
    rememberTechnicals(symbol, body);
    res.json(body);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// Strategy backtest endpoint — runs a rules-based strategy over Yahoo Finance history
app.post("/api/backtest", async (req, res) => {
  const { symbol, start_date, end_date, initial_cash = 10000, strategy = "ma_crossover" } = req.body || {};

  if (!symbol || !start_date || !end_date) {
    res.status(400).json({ error: "symbol, start_date, and end_date are required" });
    return;
  }

  try {
    const history = await yahooFinance.historical(symbol.toUpperCase(), {
      period1: start_date,
      period2: end_date,
      interval: "1d",
    });

    if (!history || history.length < 50) {
      res.status(400).json({ error: "Insufficient price history for backtest (need 50+ days)" });
      return;
    }

    const bars = history.map((d: any) => ({
      date: d.date.toISOString().split("T")[0],
      close: d.close ?? 0,
      volume: d.volume ?? 0,
    }));

    const closes = bars.map((b: any) => b.close);

    // Compute rolling indicators
    const sma50 = (i: number) => i >= 49 ? closes.slice(i - 49, i + 1).reduce((s: number, v: number) => s + v, 0) / 50 : null;
    const sma200 = (i: number) => i >= 199 ? closes.slice(i - 199, i + 1).reduce((s: number, v: number) => s + v, 0) / 200 : null;

    // RSI helper
    const rsi = (i: number) => {
      if (i < 14) return null;
      const changes = closes.slice(i - 14, i + 1).map((v: number, j: number, arr: number[]) => j === 0 ? 0 : v - arr[j - 1]).slice(1);
      const gains = changes.filter((c: number) => c > 0).reduce((s: number, c: number) => s + c, 0) / 14;
      const losses = changes.filter((c: number) => c < 0).map(Math.abs).reduce((s: number, c: number) => s + c, 0) / 14;
      return losses === 0 ? 100 : 100 - 100 / (1 + gains / losses);
    };

    let cash = initial_cash;
    let shares = 0;
    let inPosition = false;
    const trades: any[] = [];
    const equity: { date: string; value: number }[] = [];
    let entryPrice = 0;
    let entryDate = "";
    let peak = initial_cash;
    let maxDrawdown = 0;

    for (let i = 0; i < bars.length; i++) {
      const { date, close } = bars[i];
      const ma50 = sma50(i);
      const ma200 = sma200(i);
      const rsiVal = rsi(i);
      const portfolioValue = cash + shares * close;
      equity.push({ date, value: Math.round(portfolioValue * 100) / 100 });
      if (portfolioValue > peak) peak = portfolioValue;
      const dd = (peak - portfolioValue) / peak * 100;
      if (dd > maxDrawdown) maxDrawdown = dd;

      if (strategy === "ma_crossover" && ma50 !== null && ma200 !== null) {
        if (!inPosition && ma50 > ma200 && (rsiVal === null || rsiVal < 70)) {
          shares = Math.floor(cash / close);
          if (shares > 0) { cash -= shares * close; inPosition = true; entryPrice = close; entryDate = date; }
        } else if (inPosition && (ma50 < ma200 || (rsiVal !== null && rsiVal > 80))) {
          const proceeds = shares * close;
          trades.push({ entry_date: entryDate, exit_date: date, entry_price: entryPrice, exit_price: close, change_pct: ((close - entryPrice) / entryPrice) * 100, was_correct: close > entryPrice });
          cash += proceeds; shares = 0; inPosition = false;
        }
      }
    }

    // Close any open position at end
    if (inPosition && bars.length > 0) {
      const last = bars[bars.length - 1];
      trades.push({ entry_date: entryDate, exit_date: last.date, entry_price: entryPrice, exit_price: last.close, change_pct: ((last.close - entryPrice) / entryPrice) * 100, was_correct: last.close > entryPrice });
      cash += shares * last.close;
    }

    const finalValue = cash;
    const totalReturn = ((finalValue - initial_cash) / initial_cash) * 100;
    const wins = trades.filter((t) => t.was_correct).length;
    const winRate = trades.length > 0 ? (wins / trades.length) * 100 : 0;
    const avgReturn = trades.length > 0 ? trades.reduce((s, t) => s + t.change_pct, 0) / trades.length : 0;

    // Sharpe (simplified — annualized vs 0% risk-free)
    const dailyReturns = equity.slice(1).map((e, i) => (e.value - equity[i].value) / equity[i].value);
    const avgDaily = dailyReturns.reduce((s, v) => s + v, 0) / (dailyReturns.length || 1);
    const stdDaily = Math.sqrt(dailyReturns.reduce((s, v) => s + (v - avgDaily) ** 2, 0) / (dailyReturns.length || 1));
    const sharpe = stdDaily > 0 ? (avgDaily / stdDaily) * Math.sqrt(252) : 0;

    res.json({
      symbol: symbol.toUpperCase(),
      strategy,
      start_date,
      end_date,
      initial_cash,
      final_value: Math.round(finalValue * 100) / 100,
      total_return: Math.round(totalReturn * 100) / 100,
      win_rate: Math.round(winRate * 100) / 100,
      max_drawdown: Math.round(maxDrawdown * 100) / 100,
      sharpe_ratio: Math.round(sharpe * 100) / 100,
      total_trades: trades.length,
      avg_return_per_trade: Math.round(avgReturn * 100) / 100,
      trades: trades.slice(-50),
      equity_curve: equity,
    });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// MCP endpoint — bearer token auth, then handles GET/POST/DELETE
app.all("/mcp", (req, res, next) => {
  const token = process.env.MCP_API_KEY;
  if (!token) {
    res.set("Content-Type", "application/json").status(503).end(JSON.stringify({ error: "MCP_API_KEY not configured" }));
    return;
  }
  const auth = req.headers["authorization"] ?? "";
  if (auth !== `Bearer ${token}`) {
    res.set("Content-Type", "application/json").status(401).end(JSON.stringify({ error: "Unauthorized" }));
    return;
  }
  next();
}, handleMcp);

// Docs — content-negotiated: text/plain or text/markdown → raw markdown (for agents),
// everything else → JSON metadata. Claude Code requests text/plain.
app.get("/docs", (_req, res) => {
  res.set("Content-Type", "application/json").end(
    JSON.stringify({ available: AVAILABLE_DOCS, hint: "GET /docs/:slug with Accept: text/plain for markdown" })
  );
});

app.get("/docs/:slug", (req, res) => {
  const slug = req.params.slug;
  const valid = (AVAILABLE_DOCS as readonly string[]).includes(slug);
  if (!valid) {
    res.set("Content-Type", "application/json").status(404).end(
      JSON.stringify({ error: "Not found", available: AVAILABLE_DOCS })
    );
    return;
  }
  const accept = req.headers["accept"] ?? "";
  const wantsMarkdown = /text\/(plain|markdown)/.test(accept) && !/text\/html/.test(accept);
  if (wantsMarkdown) {
    const md = readDoc(slug);
    res.set("Content-Type", "text/markdown; charset=utf-8").end(md);
    return;
  }
  res.set("Content-Type", "application/json").end(
    JSON.stringify({ slug, docs_url: `/docs/${slug}`, hint: "Request with Accept: text/plain to get markdown" })
  );
});

// Health check
app.get("/health", (req, res) => {
  res.json({ status: "ok", service: "market-signals-worker" });
});

app.listen(port, () => {
  console.log(`🔄 Market Signals Worker running on port ${port}`);
  console.log(`📊 Inngest endpoint: http://localhost:${port}/api/inngest`);
  console.log(`\nFunctions registered:`);
  Object.values(functions).forEach(fn => {
    console.log(`  - ${fn.name}`);
  });
});
