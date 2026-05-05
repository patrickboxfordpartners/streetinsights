/**
 * Inngest functions for AI Agent analysis generation
 */

import { inngest } from "./client";
import { generateAgentAnalysis, getAgentPersonas, type TickerContext } from "../lib/ai-agents";
import { supabase } from "../integrations/supabase/client";

/**
 * Generate AI agent analyses for a ticker
 * Triggered daily or on-demand
 */
export const generateTickerAgentAnalyses = inngest.createFunction(
  { id: "generate-ticker-agent-analyses" },
  { event: "ticker/agent-analysis.requested" },
  async ({ event, step }) => {
    const { tickerId, symbol } = event.data;

    // Step 1: Get ticker data
    const tickerData = await step.run("fetch-ticker-data", async () => {
      const { data: ticker } = await supabase
        .from("tickers")
        .select("*")
        .eq("id", tickerId)
        .single();

      if (!ticker) {
        throw new Error(`Ticker not found: ${tickerId}`);
      }

      // Get sentiment breakdown
      const { data: predictions } = await supabase
        .from("predictions")
        .select("sentiment")
        .eq("ticker_id", tickerId)
        .gte("prediction_date", new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString());

      const breakdown = {
        bullish: predictions?.filter((p) => p.sentiment === "bullish").length || 0,
        bearish: predictions?.filter((p) => p.sentiment === "bearish").length || 0,
        neutral: predictions?.filter((p) => p.sentiment === "neutral").length || 0,
      };

      return { ticker, breakdown };
    });

    // Step 2: Get all active agent personas
    const personas = await step.run("fetch-personas", async () => {
      return await getAgentPersonas();
    });

    // Step 3: Build context
    const context: TickerContext = {
      symbol: symbol || tickerData.ticker.symbol,
      company_name: tickerData.ticker.company_name || symbol,
      sector: tickerData.ticker.sector,
      industry: tickerData.ticker.industry,
      market_cap: tickerData.ticker.market_cap,
      avg_mentions: tickerData.ticker.avg_daily_mentions,
      sentiment_breakdown: tickerData.breakdown,
    };

    // Step 4: Generate analysis for each persona (parallel)
    const analyses = await Promise.all(
      personas.map((persona) =>
        step.run(`generate-${persona.slug}`, async () => {
          const apiKey = process.env.XAI_API_KEY;
          if (!apiKey) {
            console.error("[ai-agents] XAI_API_KEY not configured");
            return null;
          }

          return await generateAgentAnalysis(tickerId, persona.id, context, apiKey);
        })
      )
    );

    const successful = analyses.filter((a) => a !== null).length;

    return {
      tickerId,
      symbol,
      personasProcessed: personas.length,
      analysesGenerated: successful,
    };
  }
);

/**
 * Daily batch job to refresh analyses for active tickers
 */
export const dailyAgentAnalysisRefresh = inngest.createFunction(
  { id: "daily-agent-analysis-refresh" },
  { cron: "0 6 * * *" }, // Run at 6 AM UTC daily
  async ({ step }) => {
    // Get active tickers with mentions in the last 7 days
    const tickers = await step.run("fetch-active-tickers", async () => {
      const { data } = await supabase
        .from("tickers")
        .select("id, symbol")
        .eq("is_active", true)
        .gte("avg_daily_mentions", 5) // Only tickers with meaningful activity
        .limit(100); // Limit to avoid rate limits

      return data || [];
    });

    // Trigger analysis for each ticker (with stagger)
    await step.run("trigger-analyses", async () => {
      for (let i = 0; i < tickers.length; i++) {
        const ticker = tickers[i];

        // Send event to generate analyses
        await inngest.send({
          name: "ticker/agent-analysis.requested",
          data: {
            tickerId: ticker.id,
            symbol: ticker.symbol,
          },
        });

        // Stagger requests to avoid rate limits (1 per 5 seconds)
        if (i < tickers.length - 1) {
          await new Promise((resolve) => setTimeout(resolve, 5000));
        }
      }
    });

    return {
      tickersProcessed: tickers.length,
    };
  }
);
