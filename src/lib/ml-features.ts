import { supabase } from "../integrations/supabase/client.js";

const WORKER_URL = process.env.VITE_WORKER_URL || "http://localhost:3001";

export interface FeatureVector {
  // Mention-based features
  mention_count: number;
  mention_delta_pct: number; // % change from 7-day avg
  mention_velocity: number; // Rate of change
  unique_sources: number;

  // Sentiment features
  sentiment_ratio: number; // Bullish / (Bullish + Bearish), 0-1 scale
  sentiment_intensity: number; // How strong the sentiment is

  // Source quality features
  avg_source_credibility: number; // Average win rate of sources
  high_quality_source_count: number; // Sources with >60% win rate

  // Prediction features
  recent_predictions_count: number;
  high_confidence_predictions: number;
  prediction_sentiment_alignment: number; // Do predictions align with sentiment?

  // Spike features
  recent_spike: boolean;
  days_since_last_spike: number;

  // Temporal features
  day_of_week: number; // 0-6
  is_market_open: boolean;

  // Technical indicator features (from Yahoo Finance via worker)
  rsi14: number | null;
  ma50: number | null;
  ma200: number | null;
  macd: number | null;
  macd_signal: number | null;
  volume_ratio: number | null;   // current volume vs 20-day avg
  price_above_ma50: boolean | null;
  price_above_ma200: boolean | null;
  golden_cross: boolean | null;  // ma50 > ma200
}

/**
 * Extract features for a ticker on a given date
 */
export async function extractFeatures(
  tickerId: string,
  date: Date,
  symbol?: string
): Promise<FeatureVector | null> {
  const dateStr = date.toISOString().split("T")[0];
  const sevenDaysAgo = new Date(date);
  sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
  const sevenDaysAgoStr = sevenDaysAgo.toISOString().split("T")[0];

  try {
    // Fetch mention frequency for today
    const { data: todayData } = await supabase
      .from("mention_frequency")
      .select("*")
      .eq("ticker_id", tickerId)
      .eq("date", dateStr)
      .single();

    if (!todayData) return null;

    // Fetch 7-day history for baseline
    const { data: historyData } = await supabase
      .from("mention_frequency")
      .select("mention_count, spike_detected")
      .eq("ticker_id", tickerId)
      .gte("date", sevenDaysAgoStr)
      .lt("date", dateStr)
      .order("date", { ascending: false });

    // Calculate mention delta and velocity
    const avgMentions = historyData && historyData.length > 0
      ? historyData.reduce((sum, d) => sum + d.mention_count, 0) / historyData.length
      : todayData.mention_count;

    const mentionDeltaPct = avgMentions > 0
      ? ((todayData.mention_count - avgMentions) / avgMentions) * 100
      : 0;

    const recentSpikes = historyData?.filter(d => d.spike_detected) || [];
    const daysSinceLastSpike = recentSpikes.length > 0 ? 0 : 7;

    // Fetch recent predictions (last 7 days)
    const { data: predictions } = await supabase
      .from("predictions")
      .select("confidence_level, sentiment")
      .eq("ticker_id", tickerId)
      .gte("prediction_date", sevenDaysAgoStr + "T00:00:00Z")
      .lt("prediction_date", dateStr + "T23:59:59Z");

    const highConfidencePredictions = predictions?.filter(
      p => p.confidence_level === "high"
    ).length || 0;

    // Calculate sentiment ratio from predictions
    const bullishCount = predictions?.filter(p => p.sentiment === "bullish").length || 0;
    const bearishCount = predictions?.filter(p => p.sentiment === "bearish").length || 0;
    const sentimentRatio = (bullishCount + bearishCount) > 0
      ? bullishCount / (bullishCount + bearishCount)
      : 0.5;

    // Fetch source quality metrics
    const { data: sources } = await supabase
      .from("mentions")
      .select("source_id, sources(win_rate, total_predictions)")
      .eq("ticker_id", tickerId)
      .gte("mentioned_at", sevenDaysAgoStr + "T00:00:00Z")
      .lt("mentioned_at", dateStr + "T23:59:59Z");

    const sourceStats = sources?.map(m => (m as any).sources).filter(Boolean) || [];
    const avgCredibility = sourceStats.length > 0
      ? sourceStats.reduce((sum, s) => sum + (s.win_rate || 0), 0) / sourceStats.length
      : 0.5;

    const highQualitySourceCount = sourceStats.filter(s => (s.win_rate || 0) >= 0.6).length;

    // Temporal features
    const dayOfWeek = date.getDay();
    const hour = date.getHours();
    const isMarketOpen = dayOfWeek >= 1 && dayOfWeek <= 5 && hour >= 9 && hour < 16;

    // Technical indicator features — fetched from worker endpoint (best-effort)
    let rsi14: number | null = null;
    let ma50: number | null = null;
    let ma200: number | null = null;
    let macd: number | null = null;
    let macd_signal: number | null = null;
    let volume_ratio: number | null = null;
    let price_above_ma50: boolean | null = null;
    let price_above_ma200: boolean | null = null;
    let golden_cross: boolean | null = null;

    if (symbol) {
      try {
        const techRes = await fetch(`${WORKER_URL}/api/technicals/${symbol}`);
        if (techRes.ok) {
          const techData = await techRes.json();
          const ind = techData.indicators;
          rsi14 = ind.rsi14 ?? null;
          ma50 = ind.ma50 ?? null;
          ma200 = ind.ma200 ?? null;
          macd = ind.macd ?? null;
          macd_signal = ind.macdSignal ?? null;
          volume_ratio = ind.volumeRatio ?? null;
          const price = ind.currentPrice ?? 0;
          price_above_ma50 = ma50 !== null ? price > ma50 : null;
          price_above_ma200 = ma200 !== null ? price > ma200 : null;
          golden_cross = (ma50 !== null && ma200 !== null) ? ma50 > ma200 : null;
        }
      } catch {
        // non-fatal — technical features remain null
      }
    }

    return {
      mention_count: todayData.mention_count,
      mention_delta_pct: mentionDeltaPct,
      mention_velocity: mentionDeltaPct / 7,
      unique_sources: todayData.unique_sources,

      sentiment_ratio: sentimentRatio,
      sentiment_intensity: Math.abs(sentimentRatio - 0.5) * 2,

      avg_source_credibility: avgCredibility,
      high_quality_source_count: highQualitySourceCount,

      recent_predictions_count: predictions?.length || 0,
      high_confidence_predictions: highConfidencePredictions,
      prediction_sentiment_alignment: sentimentRatio,

      recent_spike: todayData.spike_detected,
      days_since_last_spike: daysSinceLastSpike,

      day_of_week: dayOfWeek,
      is_market_open: isMarketOpen,

      rsi14,
      ma50,
      ma200,
      macd,
      macd_signal,
      volume_ratio,
      price_above_ma50,
      price_above_ma200,
      golden_cross,
    };
  } catch (error) {
    console.error("Error extracting features:", error);
    return null;
  }
}

/**
 * Fetch historical price data from Alpha Vantage
 */
export async function fetchPriceMovement(
  symbol: string,
  startDate: Date,
  endDate: Date
): Promise<{ direction: "up" | "down" | "neutral"; magnitude: number } | null> {
  const ALPHA_VANTAGE_KEY = process.env.ALPHA_VANTAGE_API_KEY;

  if (!ALPHA_VANTAGE_KEY) {
    console.error("Alpha Vantage API key not configured");
    return null;
  }

  try {
    const url = `https://www.alphavantage.co/query?function=TIME_SERIES_DAILY&symbol=${symbol}&apikey=${ALPHA_VANTAGE_KEY}`;
    const response = await fetch(url);
    const data = await response.json();

    if (!data["Time Series (Daily)"]) {
      console.error("No price data available for", symbol);
      return null;
    }

    const timeSeries = data["Time Series (Daily)"];
    const startDateStr = startDate.toISOString().split("T")[0];
    const endDateStr = endDate.toISOString().split("T")[0];

    const startPrice = timeSeries[startDateStr]?.["4. close"];
    const endPrice = timeSeries[endDateStr]?.["4. close"];

    if (!startPrice || !endPrice) {
      console.error("Price data missing for date range", startDateStr, endDateStr);
      return null;
    }

    const magnitude = ((parseFloat(endPrice) - parseFloat(startPrice)) / parseFloat(startPrice)) * 100;

    let direction: "up" | "down" | "neutral";
    if (magnitude > 1) direction = "up";
    else if (magnitude < -1) direction = "down";
    else direction = "neutral";

    return { direction, magnitude };
  } catch (error) {
    console.error("Error fetching price data:", error);
    return null;
  }
}
