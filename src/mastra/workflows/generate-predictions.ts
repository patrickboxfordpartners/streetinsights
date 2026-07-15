// @ts-nocheck
/**
 * Mastra workflow for daily ML prediction generation.
 *
 * Replaces the monolithic Inngest step block with typed, composable steps.
 * The Inngest function still owns scheduling and retry; it calls
 * `runGeneratePredictionsWorkflow()` as its core logic.
 *
 * Steps:
 *   load-config → fetch-tickers → generate-predictions → store → trigger-alerts
 */

import { createStep, createWorkflow } from "@mastra/core/workflows";
import { z } from "zod";
import { supabase } from "../../integrations/supabase/client.js";
import { extractFeatures } from "../../lib/ml-features.js";
import { predict, DEFAULT_MODEL_CONFIG, type ModelConfig } from "../../lib/ml-model.js";

// ── Schemas ────────────────────────────────────────────────────────────────

const workflowInput = z.object({
  prediction_date: z.string(), // ISO timestamp
});

const modelConfigSchema = z.object({
  version: z.string(),
  weights: z.record(z.number()),
  thresholds: z.record(z.number()),
});

const tickerSchema = z.object({ id: z.string(), symbol: z.string() });

const predictionRecordSchema = z.object({
  ticker_id: z.string(),
  symbol: z.string(),
  model_type: z.string(),
  direction: z.string(),
  confidence: z.number(),
  magnitude: z.number().nullable(),
  features: z.record(z.unknown()),
  target_date: z.string(),
});

// ── Step 1: Load active model config ──────────────────────────────────────

const loadModelConfig = createStep({
  id: "load-config",
  inputSchema: workflowInput,
  outputSchema: z.object({
    config: modelConfigSchema,
    prediction_date: z.string(),
  }),
  execute: async ({ inputData }) => {
    const { data } = await supabase
      .from("model_configs")
      .select("config")
      .eq("model_type", "price_movement_24h")
      .eq("is_active", true)
      .order("trained_at", { ascending: false })
      .limit(1)
      .single();

    return {
      config: (data?.config as ModelConfig) ?? DEFAULT_MODEL_CONFIG,
      prediction_date: inputData.prediction_date,
    };
  },
});

// ── Step 2: Fetch active tickers ──────────────────────────────────────────

const fetchTickers = createStep({
  id: "fetch-tickers",
  inputSchema: z.object({
    config: modelConfigSchema,
    prediction_date: z.string(),
  }),
  outputSchema: z.object({
    config: modelConfigSchema,
    prediction_date: z.string(),
    tickers: z.array(tickerSchema),
  }),
  execute: async ({ inputData }) => {
    const { data, error } = await supabase
      .from("tickers")
      .select("id, symbol")
      .eq("is_active", true);

    if (error) throw error;

    return {
      config: inputData.config,
      prediction_date: inputData.prediction_date,
      tickers: data ?? [],
    };
  },
});

// ── Step 3: Extract features + generate predictions ───────────────────────

const generatePredictions = createStep({
  id: "generate-predictions",
  inputSchema: z.object({
    config: modelConfigSchema,
    prediction_date: z.string(),
    tickers: z.array(tickerSchema),
  }),
  outputSchema: z.object({
    predictions: z.array(predictionRecordSchema),
    prediction_date: z.string(),
    model_version: z.string(),
  }),
  execute: async ({ inputData }) => {
    const today = new Date(inputData.prediction_date);
    const config = inputData.config as ModelConfig;
    const predictions: z.infer<typeof predictionRecordSchema>[] = [];

    for (const ticker of inputData.tickers) {
      const features = await extractFeatures(ticker.id, today, ticker.symbol);
      if (!features) continue;

      for (const [model_type, daysAhead] of [["price_movement_24h", 1], ["price_movement_7d", 7]] as const) {
        const result = predict(features, config);
        const target = new Date(today);
        target.setDate(target.getDate() + daysAhead);

        predictions.push({
          ticker_id: ticker.id,
          symbol: ticker.symbol,
          model_type,
          direction: result.direction,
          confidence: result.confidence,
          magnitude: result.magnitude,
          features: features as Record<string, unknown>,
          target_date: target.toISOString(),
        });
      }
    }

    return {
      predictions,
      prediction_date: inputData.prediction_date,
      model_version: config.version,
    };
  },
});

// ── Step 4: Store predictions ─────────────────────────────────────────────

const storePredictions = createStep({
  id: "store",
  inputSchema: z.object({
    predictions: z.array(predictionRecordSchema),
    prediction_date: z.string(),
    model_version: z.string(),
  }),
  outputSchema: z.object({
    stored: z.number(),
    high_confidence: z.array(z.object({ ticker_id: z.string(), symbol: z.string(), direction: z.string(), confidence: z.number(), magnitude: z.number().nullable() })),
    prediction_date: z.string(),
  }),
  execute: async ({ inputData }) => {
    const records = inputData.predictions.map((p) => ({
      ticker_id: p.ticker_id,
      model_type: p.model_type,
      prediction_direction: p.direction,
      confidence_score: p.confidence,
      predicted_magnitude: p.magnitude,
      features: p.features,
      model_version: inputData.model_version,
      trained_at: new Date().toISOString(),
      prediction_date: inputData.prediction_date,
      target_date: p.target_date,
    }));

    const { error } = await supabase
      .from("model_predictions")
      .upsert(records, { onConflict: "ticker_id,model_type,prediction_date" });

    if (error) throw error;

    const highConfidence = inputData.predictions
      .filter((p) => p.model_type === "price_movement_24h" && p.confidence >= 0.70)
      .map((p) => ({ ticker_id: p.ticker_id, symbol: p.symbol, direction: p.direction, confidence: p.confidence, magnitude: p.magnitude }));

    return {
      stored: records.length,
      high_confidence: highConfidence,
      prediction_date: inputData.prediction_date,
    };
  },
});

// ── Step 5: Trigger high-confidence alerts ────────────────────────────────

const triggerAlerts = createStep({
  id: "trigger-alerts",
  inputSchema: z.object({
    stored: z.number(),
    high_confidence: z.array(z.object({ ticker_id: z.string(), symbol: z.string(), direction: z.string(), confidence: z.number(), magnitude: z.number().nullable() })),
    prediction_date: z.string(),
  }),
  outputSchema: z.object({
    tickers_analyzed: z.number(),
    predictions_stored: z.number(),
    high_confidence_count: z.number(),
    alerts_triggered: z.boolean(),
  }),
  execute: async ({ inputData }) => {
    const alerts_triggered = inputData.high_confidence.length > 0;
    // Event sending happens in the Inngest wrapper — this step assembles the final summary
    return {
      tickers_analyzed: Math.floor(inputData.stored / 2), // 2 timeframes per ticker
      predictions_stored: inputData.stored,
      high_confidence_count: inputData.high_confidence.length,
      alerts_triggered,
    };
  },
});

// ── Workflow definition ────────────────────────────────────────────────────

const workflowOutput = z.object({
  tickers_analyzed: z.number(),
  predictions_stored: z.number(),
  high_confidence_count: z.number(),
  alerts_triggered: z.boolean(),
});

export const generatePredictionsWorkflow = createWorkflow({
  id: "generate-predictions",
  inputSchema: workflowInput,
  outputSchema: workflowOutput,
})
  .then(loadModelConfig)
  .then(fetchTickers)
  .then(generatePredictions)
  .then(storePredictions)
  .then(triggerAlerts)
  .commit();

// ── Runner — called from Inngest function ─────────────────────────────────

export async function runGeneratePredictionsWorkflow(predictionDate: string) {
  const run = await generatePredictionsWorkflow.createRun();
  const result = await run.start({ inputData: { prediction_date: predictionDate } });

  if (result.status === "failed") {
    throw new Error(`Mastra workflow failed: ${JSON.stringify(result.error)}`);
  }

  // Extract high-confidence predictions for Inngest event sending
  const storeStep = result.steps?.store;
  const storeOutput = storeStep?.status === "success" ? (storeStep.output as {
    high_confidence: { ticker_id: string; symbol: string; direction: string; confidence: number; magnitude: number | null }[];
  } | undefined) : undefined;

  const alertsStep = result.steps?.["trigger-alerts"];
  return {
    result: alertsStep?.status === "success" ? alertsStep.output : undefined,
    high_confidence_predictions: storeOutput?.high_confidence ?? [],
  };
}
