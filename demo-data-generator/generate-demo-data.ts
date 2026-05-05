#!/usr/bin/env tsx

/**
 * Demo Data Generator for Market Signals
 *
 * Generates realistic stock mention scenarios with:
 * - Synthetic social media posts
 * - Source profiles with track records
 * - Mention spikes with predictions
 * - Validated outcomes
 *
 * Run: npx tsx demo-data-generator/generate-demo-data.ts
 */

import "dotenv/config";
import Anthropic from "@anthropic-ai/sdk";
import * as fs from "fs";
import * as path from "path";
import { fileURLToPath } from 'url';
import { dirname } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const client = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY!,
});

interface SourceProfile {
  id: string;
  name: string;
  username: string;
  platform: "twitter" | "reddit" | "seeking_alpha";
  follower_count: number;
  bio: string;
  credibility_score: number; // 0-100
  total_predictions: number;
  correct_predictions: number;
  accuracy_rate: number;
  reasoning_quality: number; // 0-1
  personality: string;
  source_type: "individual" | "publication" | "analyst_firm" | "influencer";
}

interface SocialPost {
  id: string;
  source_id: string;
  ticker: string;
  content: string;
  timestamp: string;
  platform: "twitter" | "reddit";
  engagement_score: number;
  is_prediction: boolean;
  sentiment?: "bullish" | "bearish" | "neutral";
  price_target?: number;
  timeframe_days?: number;
  reasoning?: string;
}

interface SpikeScenario {
  stock: string;
  company_name: string;
  trigger_event: string;
  baseline_volume: number; // mentions per day
  spike_volume: number; // mentions at peak
  days_before_spike: number;
  days_after_spike: number;
  outcome_price_change: number; // percentage
  outcome_days: number;
}

// Pre-defined spike scenarios for drama
const SPIKE_SCENARIOS: SpikeScenario[] = [
  {
    stock: "NVDA",
    company_name: "NVIDIA",
    trigger_event: "H100 supply constraint rumors intensify",
    baseline_volume: 15,
    spike_volume: 180,
    days_before_spike: 14,
    days_after_spike: 76,
    outcome_price_change: 15.2,
    outcome_days: 90,
  },
  {
    stock: "COIN",
    company_name: "Coinbase",
    trigger_event: "SEC drops investigation hints",
    baseline_volume: 8,
    spike_volume: 95,
    days_before_spike: 10,
    days_after_spike: 80,
    outcome_price_change: -12.5,
    outcome_days: 90,
  },
  {
    stock: "PLTR",
    company_name: "Palantir",
    trigger_event: "Major defense contract leaked",
    baseline_volume: 12,
    spike_volume: 140,
    days_before_spike: 7,
    days_after_spike: 83,
    outcome_price_change: 22.8,
    outcome_days: 90,
  },
];

async function generateSourceProfiles(count: number = 100): Promise<SourceProfile[]> {
  console.log(`\n📊 Generating ${count} source profiles...`);

  const prompt = `Generate ${count} realistic stock market commentator profiles.

Distribution:
- 10% credible analysts (75-90 credibility, data-driven, high reasoning quality)
- 20% decent traders (60-74 credibility, mix of data + intuition)
- 40% noise (30-59 credibility, inconsistent, some lucky calls)
- 30% permabulls/bears (5-29 credibility, pure sentiment, no substance)

For each profile, generate:
{
  "name": "Full name or pseudonym",
  "username": "realistic platform handle",
  "platform": "twitter|reddit|seeking_alpha",
  "follower_count": realistic number based on credibility,
  "bio": "1-2 sentence bio",
  "credibility_score": 0-100,
  "total_predictions": 10-50,
  "correct_predictions": based on credibility,
  "accuracy_rate": percentage (correct/total),
  "reasoning_quality": 0.0-1.0,
  "personality": "brief personality description",
  "source_type": "individual|publication|analyst_firm|influencer"
}

Make usernames and personalities REALISTIC. Include typos in some bios. Mix of serious and meme traders.

Output ONLY a JSON array of ${count} profiles. No other text.`;

  const response = await client.messages.create({
    model: "claude-sonnet-4-20250514",
    max_tokens: 16000,
    messages: [{ role: "user", content: prompt }],
  });

  const content = response.content[0];
  if (content.type !== "text") {
    throw new Error("Expected text response");
  }

  // Strip markdown code fences if present
  let jsonText = content.text.trim();
  if (jsonText.startsWith("```json")) {
    jsonText = jsonText.replace(/^```json\n/, "").replace(/\n```$/, "");
  } else if (jsonText.startsWith("```")) {
    jsonText = jsonText.replace(/^```\n/, "").replace(/\n```$/, "");
  }

  const profiles = JSON.parse(jsonText);

  // Add IDs
  profiles.forEach((p: SourceProfile, i: number) => {
    p.id = `source_${i.toString().padStart(3, "0")}`;
  });

  console.log(`✅ Generated ${profiles.length} source profiles`);
  return profiles;
}

async function generateSocialPosts(
  scenario: SpikeScenario,
  sources: SourceProfile[]
): Promise<SocialPost[]> {
  console.log(`\n📱 Generating posts for ${scenario.stock} spike scenario...`);

  const totalDays = scenario.days_before_spike + scenario.days_after_spike;
  const spikeDay = scenario.days_before_spike;

  const prompt = `Generate realistic social media posts about ${scenario.stock} (${scenario.company_name}) over ${totalDays} days.

SCENARIO:
- Days 1-${scenario.days_before_spike}: Baseline chatter (${scenario.baseline_volume} posts/day)
- Day ${spikeDay}: ${scenario.trigger_event}
- Day ${spikeDay}-${spikeDay + 3}: Spike volume (${scenario.spike_volume} posts/day)
- Days ${spikeDay + 4}-${totalDays}: Gradual fade back to baseline

Generate ${Math.min(totalDays * 5, 400)} total posts with timestamps distributed accordingly.

Post mix:
- 30% data-driven analysis (charts, fundamentals, frameworks like Lynch/Munger)
- 30% sentiment-driven (fear/greed, momentum)
- 20% news reactions
- 20% meme/noise

For posts during the spike (days ${spikeDay}-${spikeDay + 3}), include predictions:
- 15-20 posts should have price_target and timeframe_days
- Mix of bullish (65%), bearish (25%), neutral (10%)
- Include reasoning for predictions (1-2 sentences)

For each post:
{
  "source_username": pick from realistic usernames,
  "ticker": "${scenario.stock}",
  "content": "realistic social media text with emojis, typos, varying quality",
  "day": 1-${totalDays},
  "platform": "twitter|reddit",
  "engagement_score": realistic likes/retweets based on content quality,
  "is_prediction": true if includes price target,
  "sentiment": "bullish|bearish|neutral" (if applicable),
  "price_target": dollar amount (if prediction),
  "timeframe_days": 30-120 (if prediction),
  "reasoning": "why they think this" (if prediction)
}

Make posts FEEL REAL. Include:
- Emojis (🚀💎📈📉⚠️)
- Slang ("hedgies r fuk", "to the moon", "copium")
- Typos and grammar mistakes
- Chart analysis mentions
- Catalyst discussions
- FUD and FOMO

Output ONLY a JSON array. No other text.`;

  const stream = await client.messages.stream({
    model: "claude-sonnet-4-20250514",
    max_tokens: 32000,
    messages: [{ role: "user", content: prompt }],
  });

  let responseText = "";
  for await (const chunk of stream) {
    if (chunk.type === "content_block_delta" && chunk.delta.type === "text_delta") {
      responseText += chunk.delta.text;
    }
  }

  const response = { content: [{ type: "text" as const, text: responseText }] };

  const content = response.content[0];
  if (content.type !== "text") {
    throw new Error("Expected text response");
  }

  // Strip markdown code fences if present
  let jsonText = content.text.trim();
  if (jsonText.startsWith("```json")) {
    jsonText = jsonText.replace(/^```json\n/, "").replace(/\n```$/, "");
  } else if (jsonText.startsWith("```")) {
    jsonText = jsonText.replace(/^```\n/, "").replace(/\n```$/, "");
  }

  console.log(`[DEBUG] Response length: ${jsonText.length} chars`);

  let rawPosts;
  try {
    rawPosts = JSON.parse(jsonText);
  } catch (err) {
    console.error("[ERROR] Failed to parse JSON. First 500 chars:", jsonText.slice(0, 500));
    console.error("[ERROR] Last 500 chars:", jsonText.slice(-500));
    throw err;
  }

  // Process posts: assign to sources, generate timestamps, add IDs
  const posts: SocialPost[] = rawPosts.map((post: any, i: number) => {
    // Find matching source or pick random
    const source = sources.find((s) => s.username === post.source_username) || sources[Math.floor(Math.random() * sources.length)];

    // Generate timestamp for the day
    const baseDate = new Date();
    baseDate.setDate(baseDate.getDate() - (totalDays - post.day));
    baseDate.setHours(Math.floor(Math.random() * 24), Math.floor(Math.random() * 60), 0, 0);

    return {
      id: `post_${scenario.stock}_${i.toString().padStart(4, "0")}`,
      source_id: source.id,
      ticker: scenario.stock,
      content: post.content,
      timestamp: baseDate.toISOString(),
      platform: post.platform,
      engagement_score: post.engagement_score,
      is_prediction: post.is_prediction || false,
      sentiment: post.sentiment,
      price_target: post.price_target,
      timeframe_days: post.timeframe_days,
      reasoning: post.reasoning,
    };
  });

  console.log(`✅ Generated ${posts.length} posts (${posts.filter(p => p.is_prediction).length} predictions)`);
  return posts;
}

async function generateDemoData() {
  console.log("🚀 Starting Market Signals Demo Data Generation\n");
  console.log("This will generate realistic spike scenarios with predictions and outcomes.\n");

  const outputDir = path.join(__dirname, "output");
  if (!fs.existsSync(outputDir)) {
    fs.mkdirSync(outputDir, { recursive: true });
  }

  // Step 1: Generate source profiles
  const sources = await generateSourceProfiles(100);
  fs.writeFileSync(
    path.join(outputDir, "sources.json"),
    JSON.stringify(sources, null, 2)
  );

  // Step 2: Generate posts for each scenario
  const allScenarios = [];

  for (const scenario of SPIKE_SCENARIOS) {
    const posts = await generateSocialPosts(scenario, sources);

    const scenarioData = {
      ...scenario,
      posts,
      predictions: posts.filter(p => p.is_prediction),
      outcome: {
        price_change_percent: scenario.outcome_price_change,
        days_elapsed: scenario.outcome_days,
        correct_predictions: 0, // Will calculate after generation
      },
    };

    allScenarios.push(scenarioData);

    fs.writeFileSync(
      path.join(outputDir, `scenario_${scenario.stock}.json`),
      JSON.stringify(scenarioData, null, 2)
    );

    console.log(`\n💾 Saved scenario: ${scenario.stock}`);
  }

  // Step 3: Generate master summary
  const summary = {
    generated_at: new Date().toISOString(),
    total_sources: sources.length,
    total_scenarios: allScenarios.length,
    total_posts: allScenarios.reduce((sum, s) => sum + s.posts.length, 0),
    total_predictions: allScenarios.reduce((sum, s) => sum + s.predictions.length, 0),
    scenarios: allScenarios.map(s => ({
      stock: s.stock,
      trigger: s.trigger_event,
      posts: s.posts.length,
      predictions: s.predictions.length,
      outcome: `${s.outcome_price_change > 0 ? "+" : ""}${s.outcome_price_change}%`,
    })),
  };

  fs.writeFileSync(
    path.join(outputDir, "summary.json"),
    JSON.stringify(summary, null, 2)
  );

  console.log("\n\n✨ DEMO DATA GENERATION COMPLETE ✨\n");
  console.log(`📁 Output directory: ${outputDir}`);
  console.log(`📊 Sources: ${summary.total_sources}`);
  console.log(`📈 Scenarios: ${summary.total_scenarios}`);
  console.log(`📱 Posts: ${summary.total_posts}`);
  console.log(`🎯 Predictions: ${summary.total_predictions}`);
  console.log("\nNext steps:");
  console.log("1. Review generated JSON files in demo-data-generator/output/");
  console.log("2. Import into Supabase or use for static demo");
  console.log("3. Build time-travel UI to scrub through scenarios");
}

// Run it
generateDemoData().catch(console.error);
