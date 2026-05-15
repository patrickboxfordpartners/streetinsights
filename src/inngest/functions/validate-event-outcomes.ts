import { inngest } from "../client.js";
import { supabase } from "../../integrations/supabase/client.js";

const SECTOR_ETF_MAP: Record<string, string> = {
  Technology: "XLK",
  Financials: "XLF",
  Healthcare: "XLV",
  Energy: "XLE",
  "Consumer Discretionary": "XLY",
  "Consumer Staples": "XLP",
  Industrials: "XLI",
  Materials: "XLB",
  Utilities: "XLU",
  "Real Estate": "XLRE",
  "Communication Services": "XLC",
  Defense: "ITA",
  Semiconductors: "SMH",
  Banks: "KBE",
};

const ALPHA_VANTAGE_KEY = process.env.ALPHA_VANTAGE_API_KEY || "";

async function fetchPriceChange(symbol: string): Promise<number | null> {
  if (!ALPHA_VANTAGE_KEY) return null;
  try {
    const url = `https://www.alphavantage.co/query?function=GLOBAL_QUOTE&symbol=${symbol}&apikey=${ALPHA_VANTAGE_KEY}`;
    const res = await fetch(url);
    if (!res.ok) return null;
    const data = await res.json();
    const pct = data["Global Quote"]?.["10. change percent"];
    if (!pct) return null;
    return parseFloat(pct.replace("%", ""));
  } catch {
    return null;
  }
}

export const validateEventOutcomes = inngest.createFunction(
  {
    id: "validate-event-outcomes",
    name: "Validate predicted vs actual impact after government events",
    triggers: [{ cron: "0 1 * * *" }], // 01:00 UTC = 9 PM ET
    retries: 1,
  },
  async ({ step }) => {
    // Find completed events that have scores but no validations
    const eventsToValidate = await step.run("fetch-events-to-validate", async () => {
      const yesterday = new Date(Date.now() - 48 * 3600000).toISOString();
      const { data } = await supabase
        .from("government_events")
        .select("id, title, event_date")
        .eq("status", "upcoming")
        .lt("event_date", new Date().toISOString())
        .gte("event_date", yesterday);

      return data || [];
    });

    if (eventsToValidate.length === 0) {
      return { validated: 0, message: "No events to validate" };
    }

    // Mark as completed
    await step.run("update-event-status", async () => {
      const ids = eventsToValidate.map((e) => e.id);
      await supabase
        .from("government_events")
        .update({ status: "completed" })
        .in("id", ids);
    });

    let validated = 0;

    for (const govEvent of eventsToValidate.slice(0, 5)) {
      await step.run(`validate-${govEvent.id}`, async () => {
        // Get the latest score
        const { data: score } = await supabase
          .from("event_impact_scores")
          .select("*")
          .eq("event_id", govEvent.id)
          .eq("is_latest", true)
          .single();

        if (!score) return;

        // Check if already validated
        const { data: existing } = await supabase
          .from("event_validations")
          .select("id")
          .eq("event_id", govEvent.id)
          .limit(1);

        if (existing && existing.length > 0) return;

        // Fetch price changes for predicted tickers
        const tickerOutcomes: any[] = [];
        for (const ticker of (score.affected_tickers || []).slice(0, 5)) {
          const change = await fetchPriceChange(ticker);
          if (change !== null) {
            const correct =
              (score.impact_direction === "bullish" && change > 0) ||
              (score.impact_direction === "bearish" && change < 0) ||
              (score.impact_direction === "uncertain" && Math.abs(change) < 2);
            tickerOutcomes.push({
              ticker,
              predicted_direction: score.impact_direction,
              actual_change_pct: change,
              correct,
            });
          }
          await new Promise((r) => setTimeout(r, 1500)); // AV rate limit
        }

        // Fetch sector ETF changes
        const sectorOutcomes: any[] = [];
        for (const sector of (score.affected_sectors || []).slice(0, 3)) {
          const etf = SECTOR_ETF_MAP[sector];
          if (!etf) continue;
          const change = await fetchPriceChange(etf);
          if (change !== null) {
            const correct =
              (score.impact_direction === "bullish" && change > 0) ||
              (score.impact_direction === "bearish" && change < 0);
            sectorOutcomes.push({
              sector,
              etf,
              predicted_direction: score.impact_direction,
              actual_change_pct: change,
              correct,
            });
          }
          await new Promise((r) => setTimeout(r, 1500));
        }

        // Calculate accuracy
        const tickerCorrect = tickerOutcomes.filter((t) => t.correct).length;
        const sectorCorrect = sectorOutcomes.filter((s) => s.correct).length;
        const tickerAccuracy =
          tickerOutcomes.length > 0
            ? (tickerCorrect / tickerOutcomes.length) * 100
            : null;
        const sectorAccuracy =
          sectorOutcomes.length > 0
            ? (sectorCorrect / sectorOutcomes.length) * 100
            : null;

        const maxMove = Math.max(
          ...tickerOutcomes.map((t) => Math.abs(t.actual_change_pct)),
          0
        );
        const actualMagnitude = Math.min(10, Math.ceil(maxMove / 0.5));
        const magnitudeError = Math.abs(score.impact_magnitude - actualMagnitude);

        const directionScore =
          tickerOutcomes.length > 0 ? (tickerCorrect / tickerOutcomes.length) * 40 : 20;
        const sectorScore =
          sectorOutcomes.length > 0 ? (sectorCorrect / sectorOutcomes.length) * 30 : 15;
        const magnitudeScore = Math.max(0, 30 - magnitudeError * 5);
        const overallScore = directionScore + sectorScore + magnitudeScore;

        const actualDirection =
          maxMove > 0.5
            ? tickerOutcomes.filter((t) => t.actual_change_pct > 0).length >
              tickerOutcomes.length / 2
              ? "bullish"
              : "bearish"
            : "neutral";

        await supabase.from("event_validations").insert({
          event_id: govEvent.id,
          score_id: score.id,
          actual_direction: actualDirection,
          actual_magnitude: actualMagnitude,
          ticker_outcomes: tickerOutcomes,
          sector_outcomes: sectorOutcomes,
          direction_correct: score.impact_direction === actualDirection,
          magnitude_error: magnitudeError,
          ticker_accuracy_pct: tickerAccuracy,
          sector_accuracy_pct: sectorAccuracy,
          overall_score: overallScore,
          validation_window_hours: 24,
        });

        validated++;
      });
    }

    return { validated, events_checked: eventsToValidate.length };
  }
);
