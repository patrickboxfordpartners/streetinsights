/**
 * Adanos Market Sentiment Scanner
 *
 * Runs every 15 minutes. For each active ticker, fetches structured sentiment
 * from Adanos (Reddit, X, News, Polymarket) and stores results in:
 *   - mentions        — one row per source with signal data
 *   - mention_frequency — daily aggregate with avg_sentiment_score update
 *   - scan_log        — per-run audit entry
 *
 * Adanos replaces the manual Reddit scraper in scan-mentions.ts for social
 * sentiment. It runs as a parallel step alongside the existing StockTwits /
 * Finnhub / Alpha Vantage steps, not as a replacement for the whole function.
 */

import { inngest } from "../client.js";
import { supabase } from "../../integrations/supabase/client.js";
import { fetchMarketSentiment } from "../../integrations/adanos/client.js";
import type { MarketSentimentSnapshot, SentimentSourceSnapshot } from "../../integrations/adanos/types.js";

const ADANOS_API_KEY = process.env.ADANOS_API_KEY ?? "";
const SENTIMENT_DAYS = 1; // last 24h window — tighter signal for 15-min scans
const CONCURRENT_TICKERS = 5; // parallel ticker requests to stay within rate limits

export const scanAdanosSentiment = inngest.createFunction(
  {
    id: "scan-adanos-sentiment",
    name: "Scan Adanos multi-source market sentiment",
    triggers: [{ cron: "*/15 * * * *" }],
    // Retry once on transient failures; Adanos 4xx should not retry
    retries: 1,
  },
  async ({ step }) => {
    if (!ADANOS_API_KEY) {
      return { skipped: true, reason: "ADANOS_API_KEY not configured" };
    }

    // -------------------------------------------------------------------------
    // 1. Fetch active tickers
    // -------------------------------------------------------------------------
    const activeTickers = await step.run("fetch-active-tickers", async () => {
      const { data, error } = await supabase
        .from("tickers")
        .select("id, symbol")
        .eq("is_active", true);
      if (error) throw error;
      return data ?? [];
    });

    if (activeTickers.length === 0) {
      return { skipped: true, reason: "No active tickers" };
    }

    // -------------------------------------------------------------------------
    // 2. Fetch Adanos snapshots — batched to avoid hammering the API
    //    Adanos requires one call per ticker per source (4 calls/ticker).
    //    With CONCURRENT_TICKERS=5 we fire 20 parallel requests at a time.
    // -------------------------------------------------------------------------
    const snapshots: MarketSentimentSnapshot[] = await step.run(
      "fetch-adanos-snapshots",
      async () => {
        const results: MarketSentimentSnapshot[] = [];

        for (let i = 0; i < activeTickers.length; i += CONCURRENT_TICKERS) {
          const batch = activeTickers.slice(i, i + CONCURRENT_TICKERS);
          const batchResults = await Promise.all(
            batch.map((t) =>
              fetchMarketSentiment(t.symbol, {
                apiKey: ADANOS_API_KEY,
                days: SENTIMENT_DAYS,
              }).then((snap) => ({ ...snap, ticker_id: t.id }))
            )
          );
          results.push(...batchResults);
        }

        return results;
      }
    );

    // -------------------------------------------------------------------------
    // 3. Upsert Adanos as a virtual source in the sources table
    //    One row per Adanos sub-source (reddit, x, news, polymarket)
    // -------------------------------------------------------------------------
    const adanosSources = await step.run("upsert-adanos-sources", async () => {
      const sourceRecords = [
        { name: "Adanos — Reddit",     platform: "adanos", username: "reddit",     source_type: "publication" },
        { name: "Adanos — X",          platform: "adanos", username: "x",          source_type: "publication" },
        { name: "Adanos — News",       platform: "adanos", username: "news",        source_type: "publication" },
        { name: "Adanos — Polymarket", platform: "adanos", username: "polymarket", source_type: "publication" },
      ];

      const { data, error } = await supabase
        .from("sources")
        .upsert(sourceRecords, { onConflict: "platform,username" })
        .select("id, username");

      if (error) throw error;

      return Object.fromEntries((data ?? []).map((s) => [s.username, s.id])) as Record<string, string>;
    });

    // -------------------------------------------------------------------------
    // 4. Build mentions rows from available source snapshots
    // -------------------------------------------------------------------------
    const stored = await step.run("store-adanos-mentions", async () => {
      const mentionsToStore: Array<{
        ticker_id: string;
        source_id: string;
        content: string;
        url: string;
        platform: string;
        mentioned_at: string;
        engagement_score: number;
      }> = [];

      for (const snap of snapshots) {
        if (snap.status !== "ok" || !snap.ticker_id) continue;

        for (const src of snap.sources as SentimentSourceSnapshot[]) {
          if (!src.available) continue;
          const sourceId = adanosSources[src.source_id];
          if (!sourceId) continue;

          // Encode the structured signal as JSON in the content field so
          // extract-predictions and detect-spikes can consume it normally.
          const content = JSON.stringify({
            symbol: snap.symbol,
            source: src.source_id,
            buzz_score: src.buzz_score,
            bullish_pct: src.bullish_pct,
            sentiment_score: src.sentiment_score,
            activity_count: src.activity_count,
            source_alignment: snap.source_alignment,
            average_bullish_pct: snap.average_bullish_pct,
          });

          // Use a synthetic URL so the UNIQUE(ticker_id, platform, url)
          // constraint gives us one row per ticker+source per scan bucket.
          const bucketMinute = new Date(snap.fetched_at);
          bucketMinute.setMinutes(Math.floor(bucketMinute.getMinutes() / 15) * 15, 0, 0);
          const bucket = bucketMinute.toISOString().replace(/[:.]/g, "-").slice(0, 19);
          const url = `https://api.adanos.io/${src.source_id}/${snap.symbol}/${bucket}`;

          mentionsToStore.push({
            ticker_id: snap.ticker_id!,
            source_id: sourceId,
            content,
            url,
            platform: "adanos",
            mentioned_at: snap.fetched_at,
            // Use bullish_pct as a proxy engagement score (0-100)
            engagement_score: Math.round(src.bullish_pct),
          });
        }
      }

      if (mentionsToStore.length === 0) return { stored: 0 };

      const { error } = await supabase
        .from("mentions")
        .insert(mentionsToStore);

      // 23505 = unique_violation — expected on duplicate 15-min buckets
      if (error && error.code !== "23505") {
        console.error("[adanos] Error storing mentions:", error);
        return { stored: 0 };
      }

      return { stored: mentionsToStore.length };
    });

    // -------------------------------------------------------------------------
    // 5. Update mention_frequency.avg_sentiment_score with Adanos signal
    //    Maps bullish_pct (0-100) → sentiment score (-1 to +1)
    // -------------------------------------------------------------------------
    await step.run("update-mention-frequency", async () => {
      const today = new Date().toISOString().split("T")[0];

      const updates = snapshots
        .filter((s) => s.status === "ok" && s.ticker_id && s.coverage > 0)
        .map((s) => ({
          ticker_id: s.ticker_id!,
          date: today,
          // Convert bullish_pct 0-100 → sentiment -1 to +1
          avg_sentiment_score: parseFloat(
            ((s.average_bullish_pct / 100) * 2 - 1).toFixed(4)
          ),
        }));

      if (updates.length === 0) return;

      // Upsert — only update the sentiment column if a row already exists
      // from the main scan-mentions function (which owns mention_count).
      for (const u of updates) {
        await supabase
          .from("mention_frequency")
          .upsert(
            { ticker_id: u.ticker_id, date: u.date, avg_sentiment_score: u.avg_sentiment_score },
            { onConflict: "ticker_id,date" }
          );
      }
    });

    // -------------------------------------------------------------------------
    // 6. Scan log
    // -------------------------------------------------------------------------
    await step.run("log-scan-results", async () => {
      const okCount = snapshots.filter((s) => s.status === "ok").length;
      const unavailableCount = snapshots.filter((s) => s.status === "unavailable").length;

      await supabase.from("scan_log").insert({
        scan_type: "adanos",
        status: "success",
        mentions_found: stored.stored,
        error_message:
          unavailableCount > 0
            ? `${unavailableCount} tickers had no Adanos coverage`
            : null,
        completed_at: new Date().toISOString(),
      });
    });

    return {
      tickers_scanned: activeTickers.length,
      snapshots_ok: snapshots.filter((s) => s.status === "ok").length,
      snapshots_unavailable: snapshots.filter((s) => s.status === "unavailable").length,
      mentions_stored: stored.stored,
    };
  }
);
