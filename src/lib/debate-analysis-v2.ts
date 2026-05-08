/**
 * Bull/Bear Researcher Debate Pipeline - V2 with LLM Failover
 *
 * CHANGED: Uses llmClient for multi-provider failover (Grok → GPT-4 → Claude → Gemini)
 * SAME: All debate logic, prompts, and output format unchanged
 */

// @ts-nocheck
/**
 *
 * Migration from debate-analysis.ts:
 * - Replaced direct XAI API calls with llmClient.chat()
 * - Added automatic failover on rate limits / outages
 * - Maintains exact same interface and behavior
 */

import { llmClient } from "../integrations/llm/client.js";

// ---------------------------------------------------------------------------
// Types (unchanged from v1)
// ---------------------------------------------------------------------------

export interface MentionContext {
  ticker: string;
  content: string;
  platform: string;
  recentSentimentSummary?: string;
  recentNewsSummary?: string;
  priceContext?: string;
}

export interface DebateVerdict {
  is_prediction: boolean;
  sentiment: "bullish" | "bearish" | "neutral";
  confidence_level: "low" | "medium" | "high";
  price_target: number | null;
  timeframe_days: number | null;
  reasoning: string;
  bull_case: string;
  bear_case: string;
  catalysts: string[];
  risks: string[];
  data_sources_cited: string[];
  reasoning_quality_score: number;
  data_discipline_score: number;
  transparency_score: number;
  debate_rounds: number;
}

// ---------------------------------------------------------------------------
// Core LLM call with failover
// ---------------------------------------------------------------------------

async function callLLM(
  systemPrompt: string,
  userPrompt: string,
  temperature = 0.4,
  maxTokens = 1200
): Promise<string> {
  const result = await llmClient.chat({
    messages: [
      { role: "system", content: systemPrompt },
      { role: "user", content: userPrompt },
    ],
    temperature,
    maxTokens,
  });

  // Log which provider was used (helpful for debugging)
  console.log(`[debate-analysis] Used provider: ${result.provider}`);

  return result.content;
}

// ---------------------------------------------------------------------------
// Bull Researcher (unchanged logic, just uses callLLM)
// ---------------------------------------------------------------------------

async function runBullResearcher(ctx: MentionContext): Promise<string> {
  const prompt = `You are a Bull Analyst making the strongest possible case FOR investing in ${ctx.ticker}.

Build an evidence-based bull case focused on:
- Growth potential and revenue catalysts
- Competitive advantages and market positioning
- Positive indicators from the data provided
- Why risks are overstated or manageable

Source material:
- Post/mention: "${ctx.content}"
- Platform: ${ctx.platform}
${ctx.priceContext ? `- Price context: ${ctx.priceContext}` : ""}
${ctx.recentSentimentSummary ? `- Recent sentiment: ${ctx.recentSentimentSummary}` : ""}
${ctx.recentNewsSummary ? `- Recent news: ${ctx.recentNewsSummary}` : ""}

Write a concise, specific bull case (3-5 sentences). Cite concrete evidence. Avoid generic statements.`;

  return callLLM(
    "You are an equity analyst. Be specific and evidence-based.",
    prompt,
    0.5,
    600
  );
}

// ---------------------------------------------------------------------------
// Bear Researcher (unchanged logic, just uses callLLM)
// ---------------------------------------------------------------------------

async function runBearResearcher(ctx: MentionContext, bullCase: string): Promise<string> {
  const prompt = `You are a Bear Analyst making the strongest possible case AGAINST investing in ${ctx.ticker}.

The bull analyst argued:
"${bullCase}"

Now build an evidence-based bear case focused on:
- Key risks and challenges the bull case understates
- Financial vulnerabilities, competitive threats, or macro headwinds
- Why the bull catalyst may not materialize
- What could go wrong

Source material:
- Post/mention: "${ctx.content}"
- Platform: ${ctx.platform}
${ctx.priceContext ? `- Price context: ${ctx.priceContext}` : ""}
${ctx.recentSentimentSummary ? `- Recent sentiment: ${ctx.recentSentimentSummary}` : ""}
${ctx.recentNewsSummary ? `- Recent news: ${ctx.recentNewsSummary}` : ""}

Write a concise, specific bear case (3-5 sentences). Directly counter the bull argument with evidence. Avoid generic warnings.`;

  return callLLM(
    "You are an equity analyst. Be specific and evidence-based.",
    prompt,
    0.5,
    600
  );
}

// ---------------------------------------------------------------------------
// Research Manager (unchanged logic, just uses callLLM)
// ---------------------------------------------------------------------------

async function runResearchManager(
  ctx: MentionContext,
  bullCase: string,
  bearCase: string
): Promise<DebateVerdict> {
  const prompt = `You are a Research Manager synthesizing a bull/bear debate on ${ctx.ticker} into a structured investment verdict.

Original trigger:
"${ctx.content}" (${ctx.platform})

Bull case:
${bullCase}

Bear case:
${bearCase}

${ctx.priceContext ? `Price context: ${ctx.priceContext}` : ""}

Evaluate both arguments critically and produce a verdict. Score the reasoning quality honestly:

**reasoning_quality_score (0-1):** Does the source post show a clear thesis with supporting evidence (Lynch Pitch standard)?
**data_discipline_score (0-1):** Does it cite real sources, numbers, or documents (not just "I think")?
**transparency_score (0-1):** Does it acknowledge uncertainty and risks (Munger Invert standard)?

A post with no data citations and pure speculation scores 0.1-0.3. A post with filings, numbers, and explicit risk acknowledgment scores 0.7-1.0.

Respond ONLY with valid JSON:
{
  "is_prediction": boolean,
  "sentiment": "bullish" | "bearish" | "neutral",
  "confidence_level": "low" | "medium" | "high",
  "price_target": number | null,
  "timeframe_days": number | null,
  "reasoning": "2-3 sentence synthesis of why this verdict",
  "bull_case": "1-2 sentence summary of strongest bull argument",
  "bear_case": "1-2 sentence summary of strongest bear argument",
  "catalysts": ["specific catalyst 1", "specific catalyst 2"],
  "risks": ["specific risk 1", "specific risk 2"],
  "data_sources_cited": ["source1", "source2"],
  "reasoning_quality_score": 0.0-1.0,
  "data_discipline_score": 0.0-1.0,
  "transparency_score": 0.0-1.0
}`;

  const raw = await callLLM(
    "You are a research manager. Respond only with valid JSON.",
    prompt,
    0.2,
    1000
  );

  // Strip markdown code fences if present
  const cleaned = raw.replace(/^```(?:json)?\n?/m, "").replace(/\n?```$/m, "").trim();
  return JSON.parse(cleaned) as DebateVerdict;
}

// ---------------------------------------------------------------------------
// Public API (unchanged from v1)
// ---------------------------------------------------------------------------

/**
 * Run the full bull/bear debate pipeline on a mention.
 * NOW WITH AUTOMATIC LLM FAILOVER!
 *
 * If Grok fails (rate limit, outage), automatically tries:
 * Grok → GPT-4 → Claude → Gemini
 *
 * @param ctx  Mention + ticker context
 * @returns    Structured debate verdict ready to store in predictions table
 */
export async function runDebateAnalysis(ctx: MentionContext): Promise<DebateVerdict> {
  const bullCase = await runBullResearcher(ctx);
  const bearCase = await runBearResearcher(ctx, bullCase);
  const verdict = await runResearchManager(ctx, bullCase, bearCase);

  return {
    ...verdict,
    bull_case: bullCase,
    bear_case: bearCase,
    debate_rounds: 1,
  };
}

/**
 * Lightweight version for bulk processing, single LLM call, no debate.
 * NOW WITH AUTOMATIC LLM FAILOVER!
 */
export async function runQuickAnalysis(content: string): Promise<DebateVerdict> {
  const prompt = `You are an equity analyst evaluating a social media post.

Post: "${content}"

Respond ONLY with valid JSON:
{
  "is_prediction": boolean,
  "sentiment": "bullish" | "bearish" | "neutral",
  "confidence_level": "low" | "medium" | "high",
  "price_target": number | null,
  "timeframe_days": number | null,
  "reasoning": "brief explanation",
  "bull_case": "strongest bull point",
  "bear_case": "strongest bear point",
  "catalysts": ["catalyst1"],
  "risks": ["risk1"],
  "data_sources_cited": [],
  "reasoning_quality_score": 0.0-1.0,
  "data_discipline_score": 0.0-1.0,
  "transparency_score": 0.0-1.0
}`;

  const raw = await callLLM(
    "You are an equity analyst. Respond only with valid JSON.",
    prompt,
    0.3,
    800
  );

  const cleaned = raw.replace(/^```(?:json)?\n?/m, "").replace(/\n?```$/m, "").trim();
  const verdict = JSON.parse(cleaned) as DebateVerdict;

  return {
    ...verdict,
    debate_rounds: 0,
  };
}

/**
 * Heuristic: should we run full debate or quick analysis?
 * (unchanged from v1)
 */
export function shouldRunFullDebate(content: string): boolean {
  const hasSubstance = content.length > 100;
  const hasPriceTarget = /\$\d+|\d+\s*(?:dollars?|usd)/i.test(content);
  const hasTimeframe = /week|month|quarter|year|days?|target|by\s+\w+/i.test(content);

  return hasSubstance && (hasPriceTarget || hasTimeframe);
}

/**
 * Quick mention context builder (unchanged from v1)
 */
export type { MentionContext, DebateVerdict };
