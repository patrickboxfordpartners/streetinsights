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
import pg from "pg";
import YahooFinance from "yahoo-finance2";

const __dirname = dirname(fileURLToPath(import.meta.url));
const AVAILABLE_DOCS = ["overview", "mcp", "query"] as const;
type DocSlug = (typeof AVAILABLE_DOCS)[number];
const DOCS_DIR = join(__dirname, "docs");

const { Pool } = pg;
const dbPool = process.env.SUPABASE_DB_URL
  ? new Pool({ connectionString: process.env.SUPABASE_DB_URL, max: 5 })
  : null;
const yahooFinance = new YahooFinance({ suppressNotices: ["yahooSurvey"] });

const app = express();
const port = process.env.PORT || 3001;

app.use(cors());
app.use(express.json({ limit: "4mb" }));

// Inngest endpoint — serveHost tells Inngest Cloud how to reach this worker
app.use(
  "/api/inngest",
  serve({
    client: inngest,
    functions: Object.values(functions),
    serveHost: process.env.RAILWAY_PUBLIC_DOMAIN
      ? `https://${process.env.RAILWAY_PUBLIC_DOMAIN}`
      : undefined,
    servePath: "/api/inngest",
  })
);

// In-memory quote cache (refreshes every 60s max)
let quoteCache: { data: any[]; ts: number } = { data: [], ts: 0 };
const CACHE_TTL = 60_000;

const DEFAULT_SYMBOLS = [
  "NVDA", "TSLA", "AAPL", "MSFT", "GOOGL", "META", "AMD", "PLTR",
  "AMZN", "NFLX", "SPY", "QQQ", "COIN", "SOFI", "SMCI", "ARM",
];

app.get("/api/quotes", async (req, res) => {
  try {
    const symbolsParam = req.query.symbols as string | undefined;
    const symbols = symbolsParam
      ? symbolsParam.split(",").map((s) => s.trim().toUpperCase())
      : DEFAULT_SYMBOLS;

    const now = Date.now();
    const cacheKey = symbols.join(",");

    // Return cache if fresh and same symbols
    if (
      quoteCache.data.length > 0 &&
      now - quoteCache.ts < CACHE_TTL &&
      quoteCache.data.map((q) => q.symbol).join(",") === cacheKey
    ) {
      return res.json(quoteCache.data);
    }

    const results = await yahooFinance.quote(symbols);
    const quotes = (Array.isArray(results) ? results : [results]).map((q) => ({
      symbol: q.symbol,
      price: q.regularMarketPrice ?? 0,
      change: q.regularMarketChange ?? 0,
      changePercent: q.regularMarketChangePercent ?? 0,
      marketState: q.marketState,
    }));

    quoteCache = { data: quotes, ts: now };
    res.json(quotes);
  } catch (err: any) {
    // Return stale cache on error instead of spamming logs
    if (quoteCache.data.length > 0) {
      return res.json(quoteCache.data);
    }
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
  if (!dbPool) {
    res.status(503).json({ error: "SUPABASE_DB_URL not configured" });
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

    const result = await dbPool.query(sql);
    const columns = result.fields.map((f) => f.name);
    const [explanation] = await Promise.all([explainSQL(question, sql)]);

    res.json({ sql, results: { rows: result.rows, columns }, explanation });
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
    const md = readFileSync(join(DOCS_DIR, `${slug}.md`), "utf8");
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
