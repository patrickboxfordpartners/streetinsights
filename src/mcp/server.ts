import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StreamableHTTPServerTransport } from "@modelcontextprotocol/sdk/server/streamableHttp.js";
import { z } from "zod";
import type { Request, Response } from "express";
import { supabase } from "../integrations/supabase/client.js";

function createServer(): McpServer {
  const server = new McpServer({
    name: "street-insights",
    version: "1.0.0",
  });

  // ── Tickers ────────────────────────────────────────────────────────────────

  server.registerTool(
    "get_tickers",
    {
      title: "Get Tracked Tickers",
      description: "List all tickers Street Insights is monitoring, with sector, market cap, and mention thresholds.",
      inputSchema: z.object({
        active_only: z.boolean().optional().describe("Filter to active tickers only (default true)"),
      }),
    },
    async ({ active_only = true }) => {
      let query = supabase.from("tickers").select("symbol, company_name, sector, industry, market_cap, avg_daily_mentions, mention_spike_threshold, is_active").order("symbol");
      if (active_only) query = query.eq("is_active", true);
      const { data, error } = await query;
      if (error) return { content: [{ type: "text", text: `Error: ${error.message}` }] };
      return { content: [{ type: "text", text: JSON.stringify(data, null, 2) }] };
    }
  );

  // ── Mentions ───────────────────────────────────────────────────────────────

  server.registerTool(
    "get_mentions",
    {
      title: "Get Mentions",
      description: "Retrieve recent mentions for a ticker. Returns content, platform, engagement score, and whether it contains a prediction.",
      inputSchema: z.object({
        symbol: z.string().describe("Ticker symbol e.g. NVDA"),
        limit: z.number().int().min(1).max(100).optional().describe("Number of results (default 20, max 100)"),
        predictions_only: z.boolean().optional().describe("Return only mentions flagged as predictions"),
        platform: z.string().optional().describe("Filter by platform e.g. twitter, reddit"),
      }),
    },
    async ({ symbol, limit = 20, predictions_only = false, platform }) => {
      const { data: ticker } = await supabase.from("tickers").select("id").eq("symbol", symbol.toUpperCase()).single();
      if (!ticker) return { content: [{ type: "text", text: `Ticker ${symbol} not found` }] };

      let query = supabase.from("mentions")
        .select("content, url, platform, mentioned_at, engagement_score, is_prediction")
        .eq("ticker_id", ticker.id)
        .order("mentioned_at", { ascending: false })
        .limit(limit);

      if (predictions_only) query = query.eq("is_prediction", true);
      if (platform) query = query.eq("platform", platform);

      const { data, error } = await query;
      if (error) return { content: [{ type: "text", text: `Error: ${error.message}` }] };
      return { content: [{ type: "text", text: JSON.stringify(data, null, 2) }] };
    }
  );

  server.registerTool(
    "get_mention_frequency",
    {
      title: "Get Mention Frequency",
      description: "Get daily mention counts and spike detection history for a ticker.",
      inputSchema: z.object({
        symbol: z.string().describe("Ticker symbol"),
        days: z.number().int().min(1).max(90).optional().describe("Number of days of history (default 14)"),
      }),
    },
    async ({ symbol, days = 14 }) => {
      const { data: ticker } = await supabase.from("tickers").select("id").eq("symbol", symbol.toUpperCase()).single();
      if (!ticker) return { content: [{ type: "text", text: `Ticker ${symbol} not found` }] };

      const since = new Date();
      since.setDate(since.getDate() - days);

      const { data, error } = await supabase.from("mention_frequency")
        .select("date, mention_count, unique_sources, avg_sentiment_score, spike_detected")
        .eq("ticker_id", ticker.id)
        .gte("date", since.toISOString().split("T")[0])
        .order("date", { ascending: false });

      if (error) return { content: [{ type: "text", text: `Error: ${error.message}` }] };
      return { content: [{ type: "text", text: JSON.stringify(data, null, 2) }] };
    }
  );

  // ── Predictions ────────────────────────────────────────────────────────────

  server.registerTool(
    "get_predictions",
    {
      title: "Get Predictions",
      description: "Retrieve analyst predictions for a ticker — sentiment, price target, confidence, reasoning, and catalysts.",
      inputSchema: z.object({
        symbol: z.string().describe("Ticker symbol"),
        sentiment: z.enum(["bullish", "bearish", "neutral"]).optional().describe("Filter by sentiment direction"),
        confidence: z.enum(["low", "medium", "high"]).optional().describe("Minimum confidence level"),
        limit: z.number().int().min(1).max(50).optional().describe("Number of results (default 10)"),
      }),
    },
    async ({ symbol, sentiment, confidence, limit = 10 }) => {
      const { data: ticker } = await supabase.from("tickers").select("id").eq("symbol", symbol.toUpperCase()).single();
      if (!ticker) return { content: [{ type: "text", text: `Ticker ${symbol} not found` }] };

      let query = supabase.from("predictions")
        .select("sentiment, price_target, timeframe_days, confidence_level, reasoning, data_sources_cited, catalysts, reasoning_quality_score, prediction_date, target_date")
        .eq("ticker_id", ticker.id)
        .order("prediction_date", { ascending: false })
        .limit(limit);

      if (sentiment) query = query.eq("sentiment", sentiment);
      if (confidence) query = query.eq("confidence_level", confidence);

      const { data, error } = await query;
      if (error) return { content: [{ type: "text", text: `Error: ${error.message}` }] };
      return { content: [{ type: "text", text: JSON.stringify(data, null, 2) }] };
    }
  );

  server.registerTool(
    "get_prediction_accuracy",
    {
      title: "Get Prediction Accuracy",
      description: "Get validated prediction outcomes for a ticker — which predictions were correct, price changes, and accuracy scores.",
      inputSchema: z.object({
        symbol: z.string().describe("Ticker symbol"),
        limit: z.number().int().min(1).max(50).optional().describe("Number of validated predictions to return (default 20)"),
      }),
    },
    async ({ symbol, limit = 20 }) => {
      const { data: ticker } = await supabase.from("tickers").select("id").eq("symbol", symbol.toUpperCase()).single();
      if (!ticker) return { content: [{ type: "text", text: `Ticker ${symbol} not found` }] };

      const { data: predictions } = await supabase.from("predictions")
        .select("id, sentiment, price_target, prediction_date")
        .eq("ticker_id", ticker.id)
        .limit(limit);

      if (!predictions?.length) return { content: [{ type: "text", text: "No predictions found" }] };

      const ids = predictions.map((p) => p.id);
      const { data, error } = await supabase.from("validations")
        .select("prediction_id, price_at_prediction, price_at_validation, price_change_percent, was_correct, accuracy_score, days_to_outcome, validation_date")
        .in("prediction_id", ids)
        .order("validation_date", { ascending: false });

      if (error) return { content: [{ type: "text", text: `Error: ${error.message}` }] };
      return { content: [{ type: "text", text: JSON.stringify(data, null, 2) }] };
    }
  );

  // ── Sources ────────────────────────────────────────────────────────────────

  server.registerTool(
    "get_sources",
    {
      title: "Get Sources",
      description: "List analyst/influencer sources tracked by Street Insights, ranked by credibility score.",
      inputSchema: z.object({
        platform: z.string().optional().describe("Filter by platform e.g. twitter, youtube"),
        min_accuracy: z.number().min(0).max(1).optional().describe("Minimum accuracy rate 0–1"),
        limit: z.number().int().min(1).max(100).optional().describe("Number of results (default 20)"),
      }),
    },
    async ({ platform, min_accuracy, limit = 20 }) => {
      let query = supabase.from("sources")
        .select("name, platform, username, source_type, credibility_score, accuracy_rate, total_predictions, correct_predictions, reasoning_quality, url, verified")
        .eq("is_active", true)
        .order("credibility_score", { ascending: false })
        .limit(limit);

      if (platform) query = query.eq("platform", platform);
      if (min_accuracy !== undefined) query = query.gte("accuracy_rate", min_accuracy);

      const { data, error } = await query;
      if (error) return { content: [{ type: "text", text: `Error: ${error.message}` }] };
      return { content: [{ type: "text", text: JSON.stringify(data, null, 2) }] };
    }
  );

  // ── Government Events ──────────────────────────────────────────────────────

  server.registerTool(
    "get_government_events",
    {
      title: "Get Government Events",
      description: "Retrieve upcoming government/Fed/Treasury/Congress events with market impact scores.",
      inputSchema: z.object({
        days_ahead: z.number().int().min(1).max(90).optional().describe("How many days ahead to look (default 14)"),
        source_category: z.string().optional().describe("Filter by category: fed, treasury, congress"),
        topic: z.string().optional().describe("Filter by related topic keyword"),
      }),
    },
    async ({ days_ahead = 14, source_category, topic }) => {
      const now = new Date().toISOString();
      const until = new Date();
      until.setDate(until.getDate() + days_ahead);

      let query = supabase.from("government_events")
        .select("title, description, event_type, source_category, event_date, participants, related_topics, source_url, status")
        .gte("event_date", now)
        .lte("event_date", until.toISOString())
        .order("event_date", { ascending: true });

      if (source_category) query = query.eq("source_category", source_category);
      if (topic) query = query.contains("related_topics", [topic]);

      const { data, error } = await query;
      if (error) return { content: [{ type: "text", text: `Error: ${error.message}` }] };
      return { content: [{ type: "text", text: JSON.stringify(data, null, 2) }] };
    }
  );

  server.registerTool(
    "get_event_impact",
    {
      title: "Get Event Impact Scores",
      description: "Get AI-generated market impact analysis for a government event — affected sectors, tickers, and reasoning.",
      inputSchema: z.object({
        event_id: z.string().uuid().describe("Government event ID"),
      }),
    },
    async ({ event_id }) => {
      const { data, error } = await supabase.from("event_impact_scores")
        .select("impact_magnitude, impact_direction, confidence, timeframe, affected_sectors, affected_tickers, reasoning, key_factors, historical_precedent, model_name")
        .eq("event_id", event_id)
        .eq("is_latest", true)
        .single();

      if (error) return { content: [{ type: "text", text: `No impact score found: ${error.message}` }] };
      return { content: [{ type: "text", text: JSON.stringify(data, null, 2) }] };
    }
  );

  // ── Scan Status ────────────────────────────────────────────────────────────

  server.registerTool(
    "get_scan_status",
    {
      title: "Get Scan Status",
      description: "Check the status and health of recent Inngest scan jobs (mention scanning, prediction extraction, etc.).",
      inputSchema: z.object({
        scan_type: z.string().optional().describe("Filter by scan type e.g. mentions, predictions, government"),
        limit: z.number().int().min(1).max(50).optional().describe("Number of recent scans (default 10)"),
      }),
    },
    async ({ scan_type, limit = 10 }) => {
      let query = supabase.from("scan_log")
        .select("scan_type, status, mentions_found, error_message, started_at, completed_at")
        .order("started_at", { ascending: false })
        .limit(limit);

      if (scan_type) query = query.ilike("scan_type", `%${scan_type}%`);

      const { data, error } = await query;
      if (error) return { content: [{ type: "text", text: `Error: ${error.message}` }] };
      return { content: [{ type: "text", text: JSON.stringify(data, null, 2) }] };
    }
  );

  return server;
}

export async function handleMcp(req: Request, res: Response): Promise<void> {
  const transport = new StreamableHTTPServerTransport({ sessionIdGenerator: undefined });
  const server = createServer();

  res.on("close", () => {
    transport.close();
    server.close();
  });

  await server.connect(transport);
  await transport.handleRequest(req, res, req.body);
}
