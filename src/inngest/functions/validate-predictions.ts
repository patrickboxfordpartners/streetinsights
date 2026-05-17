import { inngest } from "../client.js";
import { supabase } from "../../integrations/supabase/client.js";
import { validateReasoning } from "../../lib/reasoning-validator.js";

const ALPHA_VANTAGE_API_KEY = process.env.ALPHA_VANTAGE_API_KEY;

interface StockPrice {
  symbol: string;
  price: number;
  timestamp: string;
}

export const validatePredictions = inngest.createFunction(
  {
    id: "validate-predictions",
    name: "Validate predictions against actual outcomes",
    triggers: [{ cron: "0 21 * * *" }]
  },
  async ({ step }) => {
    const today = new Date();

    // Find predictions that need validation
    const predictionsToValidate = await step.run("fetch-predictions-due", async () => {
      const { data, error } = await supabase
        .from("predictions")
        .select(
          `
          id,
          ticker_id,
          source_id,
          sentiment,
          price_target,
          timeframe_days,
          prediction_date,
          target_date
        `
        )
        .lte("target_date", today.toISOString())
        .order("target_date", { ascending: true })
        .limit(100);

      if (error) throw error;

      if (!data || data.length === 0) return [];
      const tickerIds = [...new Set(data.map(p => p.ticker_id))];
      const { data: tickers } = await supabase.from("tickers").select("id, symbol").in("id", tickerIds);
      const tickerMap = new Map((tickers || []).map(t => [t.id, t.symbol]));

      return data.map(p => ({
        ...p,
        ticker_symbol: tickerMap.get(p.ticker_id) || "UNKNOWN",
      }));
    });

    if (predictionsToValidate.length === 0) {
      return { message: "No predictions due for validation" };
    }

    // Get unique ticker symbols
    const symbols = [...new Set(predictionsToValidate.map(p => p.ticker_symbol))].filter(
      s => s !== "UNKNOWN"
    );

    // Fetch current prices, process in chunks of 5 to respect Alpha Vantage rate limits
    // Free tier: 5 requests per minute, 25 per day
    const currentPrices: Record<string, StockPrice> = {};

    // Split symbols into chunks of 5
    const symbolChunks: string[][] = [];
    for (let i = 0; i < symbols.length; i += 5) {
      symbolChunks.push(symbols.slice(i, i + 5));
    }

    for (let chunkIdx = 0; chunkIdx < symbolChunks.length; chunkIdx++) {
      const chunk = symbolChunks[chunkIdx];
      const chunkPrices = await step.run(`fetch-prices-chunk-${chunkIdx}`, async () => {
        const prices: Record<string, StockPrice> = {};

        for (const symbol of chunk) {
          try {
            const price = await fetchStockPrice(symbol);
            prices[symbol] = price;

            // Alpha Vantage free tier: 5 requests per minute
            await new Promise(resolve => setTimeout(resolve, 12500));
          } catch (error) {
            console.error(`Error fetching price for ${symbol}:`, error);
          }
        }

        return prices;
      });

      Object.assign(currentPrices, chunkPrices);
    }

    // Fetch historical prices, also chunked
    // Collect unique (symbol, date) pairs to minimize API calls
    const historicalNeeded = new Map<string, Set<string>>();
    for (const prediction of predictionsToValidate) {
      const symbol = prediction.ticker_symbol;
      if (symbol === "UNKNOWN") continue;
      const predictionDate = new Date(prediction.prediction_date).toISOString().split("T")[0];
      if (!historicalNeeded.has(symbol)) {
        historicalNeeded.set(symbol, new Set());
      }
      historicalNeeded.get(symbol)!.add(predictionDate);
    }

    const historicalPrices: Record<string, Record<string, number>> = {};

    // Each TIME_SERIES_DAILY call returns 100 days of data for a symbol,
    // so we only need one call per symbol (not per date)
    const histSymbols = [...historicalNeeded.keys()];
    const histChunks: string[][] = [];
    for (let i = 0; i < histSymbols.length; i += 5) {
      histChunks.push(histSymbols.slice(i, i + 5));
    }

    for (let chunkIdx = 0; chunkIdx < histChunks.length; chunkIdx++) {
      const chunk = histChunks[chunkIdx];
      const chunkPrices = await step.run(`fetch-historical-chunk-${chunkIdx}`, async () => {
        const prices: Record<string, Record<string, number>> = {};

        for (const symbol of chunk) {
          try {
            const timeSeries = await fetchDailyTimeSeries(symbol);
            prices[symbol] = {};

            const datesNeeded = historicalNeeded.get(symbol)!;
            for (const date of datesNeeded) {
              if (timeSeries[date]) {
                prices[symbol][date] = parseFloat(timeSeries[date]["4. close"]);
              }
            }

            await new Promise(resolve => setTimeout(resolve, 12500));
          } catch (error) {
            console.error(`Error fetching historical data for ${symbol}:`, error);
          }
        }

        return prices;
      });

      // Merge
      for (const [symbol, dates] of Object.entries(chunkPrices)) {
        historicalPrices[symbol] = { ...historicalPrices[symbol], ...dates };
      }
    }

    // Validate each prediction
    const validated = await step.run("validate-and-store", async () => {
      let validationCount = 0;

      for (const prediction of predictionsToValidate) {
        const symbol = prediction.ticker_symbol;
        const predictionDate = new Date(prediction.prediction_date)
          .toISOString()
          .split("T")[0];

        const currentPrice = currentPrices[symbol]?.price;
        const priceAtPrediction = historicalPrices[symbol]?.[predictionDate];

        if (!currentPrice || !priceAtPrediction) {
          console.warn(`Missing price data for ${symbol}, skipping validation`);
          continue;
        }

        const priceChangePercent =
          ((currentPrice - priceAtPrediction) / priceAtPrediction) * 100;

        let wasCorrect = false;
        let accuracyScore = 0;

        if (prediction.sentiment === "bullish") {
          wasCorrect = priceChangePercent > 0;
          accuracyScore = Math.min(100, Math.max(0, 50 + priceChangePercent * 5));
        } else if (prediction.sentiment === "bearish") {
          wasCorrect = priceChangePercent < 0;
          accuracyScore = Math.min(100, Math.max(0, 50 + Math.abs(priceChangePercent) * 5));
        } else {
          wasCorrect = Math.abs(priceChangePercent) < 5;
          accuracyScore = Math.max(0, 100 - Math.abs(priceChangePercent) * 10);
        }

        if (prediction.price_target) {
          const targetAccuracy =
            100 - Math.abs(((currentPrice - prediction.price_target) / prediction.price_target) * 100);
          accuracyScore = (accuracyScore + Math.max(0, targetAccuracy)) / 2;
        }

        const targetDate = prediction.target_date || prediction.prediction_date;
        const daysToOutcome = Math.round(
          (new Date(targetDate).getTime() -
            new Date(prediction.prediction_date).getTime()) /
            (1000 * 60 * 60 * 24)
        );

        const { error } = await supabase.from("validations").insert({
          prediction_id: prediction.id,
          price_at_prediction: priceAtPrediction,
          price_at_validation: currentPrice,
          price_change_percent: parseFloat(priceChangePercent.toFixed(2)),
          was_correct: wasCorrect,
          accuracy_score: parseFloat(accuracyScore.toFixed(2)),
          days_to_outcome: daysToOutcome,
          validation_date: today.toISOString(),
          validation_method: "target_date_reached",
        });

        if (!error) {
          validationCount++;
        }
      }

      return { validated: validationCount };
    });

    // Validate reasoning quality for predictions that now have outcomes.
    // Runs after price validation — skipped if ANTHROPIC_API_KEY is absent.
    // Perplexity grounding is best-effort; missing PERPLEXITY_API_KEY falls back
    // to Claude-only scoring without external grounding.
    const reasoningValidated = await step.run("validate-reasoning", async () => {
      if (!process.env.ANTHROPIC_API_KEY) {
        return { skipped: true, count: 0 };
      }

      // Fetch predictions that were just validated, with their reasoning fields
      const predictionIds = predictionsToValidate.map(p => p.id);
      const { data: predictionDetails } = await supabase
        .from("predictions")
        .select("id, ticker_id, sentiment, reasoning, data_sources_cited, catalysts")
        .in("id", predictionIds);

      if (!predictionDetails || predictionDetails.length === 0) {
        return { skipped: false, count: 0 };
      }

      // Build a map of prediction_id → was_correct from the validations we just created
      const { data: freshValidations } = await supabase
        .from("validations")
        .select("prediction_id, was_correct")
        .in("prediction_id", predictionIds)
        .order("validation_date", { ascending: false });

      const outcomeMap = new Map(
        (freshValidations || []).map(v => [v.prediction_id, v.was_correct])
      );

      // Build ticker symbol map
      const tickerIds = [...new Set(predictionDetails.map(p => p.ticker_id))];
      const { data: tickers } = await supabase
        .from("tickers")
        .select("id, symbol")
        .in("id", tickerIds);
      const tickerMap = new Map((tickers || []).map(t => [t.id, t.symbol]));

      let count = 0;

      for (const pred of predictionDetails) {
        const was_correct = outcomeMap.get(pred.id);
        if (was_correct === undefined) continue; // not validated this run

        const ticker = tickerMap.get(pred.ticker_id) ?? "UNKNOWN";

        try {
          const result = await validateReasoning({
            prediction_id: pred.id,
            ticker,
            sentiment: pred.sentiment as "bullish" | "bearish" | "neutral",
            reasoning: pred.reasoning ?? "",
            data_sources_cited: pred.data_sources_cited ?? [],
            catalysts: pred.catalysts ?? [],
            was_correct,
          });

          await supabase
            .from("predictions")
            .update({
              reasoning_quality_score: result.reasoning_quality_score,
              data_discipline_score: result.data_discipline_score,
              transparency_score: result.transparency_score,
            })
            .eq("id", pred.id);

          count++;
        } catch (err) {
          console.warn(`[validate-reasoning] failed for ${pred.id}:`, err);
        }

        // Pace calls: Claude Haiku is fast but Perplexity has rate limits
        await new Promise(r => setTimeout(r, 1500));
      }

      return { skipped: false, count };
    });

    return {
      predictions_checked: predictionsToValidate.length,
      validations_created: validated.validated,
      reasoning_validated: reasoningValidated.count,
    };
  }
);

// Fetch current stock price using Alpha Vantage
async function fetchStockPrice(symbol: string): Promise<StockPrice> {
  if (!ALPHA_VANTAGE_API_KEY) {
    throw new Error("Alpha Vantage API key not configured");
  }

  const response = await fetch(
    `https://www.alphavantage.co/query?function=GLOBAL_QUOTE&symbol=${symbol}&apikey=${ALPHA_VANTAGE_API_KEY}`
  );

  if (!response.ok) {
    throw new Error(`Alpha Vantage API error: ${response.status}`);
  }

  const data = await response.json();

  if (data["Error Message"]) {
    throw new Error(`Invalid symbol: ${symbol}`);
  }

  const quote = data["Global Quote"];
  if (!quote || !quote["05. price"]) {
    throw new Error(`No price data for ${symbol}`);
  }

  return {
    symbol,
    price: parseFloat(quote["05. price"]),
    timestamp: quote["07. latest trading day"],
  };
}

// Fetch full daily time series (returns ~100 days of data in one call)
async function fetchDailyTimeSeries(
  symbol: string
): Promise<Record<string, Record<string, string>>> {
  if (!ALPHA_VANTAGE_API_KEY) {
    throw new Error("Alpha Vantage API key not configured");
  }

  const response = await fetch(
    `https://www.alphavantage.co/query?function=TIME_SERIES_DAILY&symbol=${symbol}&apikey=${ALPHA_VANTAGE_API_KEY}`
  );

  if (!response.ok) {
    throw new Error(`Alpha Vantage API error: ${response.status}`);
  }

  const data = await response.json();

  if (data["Error Message"]) {
    throw new Error(`Invalid symbol: ${symbol}`);
  }

  const timeSeries = data["Time Series (Daily)"];
  if (!timeSeries) {
    throw new Error(`No time series data for ${symbol}`);
  }

  return timeSeries;
}
