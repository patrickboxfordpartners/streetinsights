/**
 * Reasoning Validator — post-hoc grounded quality scoring
 *
 * Mirrors the ai-facts three-tier pipeline:
 *   1. Classify: is the reasoning checkable at all?
 *   2. Ground:   hit Perplexity sonar for claims that need current/specific data
 *   3. Score:    re-evaluate reasoning_quality_score + data_discipline_score
 *      using the grounded context, replacing the LLM-estimated scores from
 *      extraction time with post-validation evidence.
 */

import Anthropic from "@anthropic-ai/sdk";

export interface ReasoningInput {
  prediction_id: string;
  ticker: string;
  sentiment: "bullish" | "bearish" | "neutral";
  reasoning: string;
  data_sources_cited: string[];
  catalysts: string[];
  was_correct: boolean;
}

export interface ReasoningValidationResult {
  prediction_id: string;
  checkable_type: "not-checkable" | "immediately-checkable" | "needs-grounding";
  grounded_context: string | null;
  reasoning_quality_score: number;
  data_discipline_score: number;
  transparency_score: number;
  validation_notes: string;
}

// Perplexity via OpenAI-compatible endpoint
async function queryPerplexity(prompt: string): Promise<string> {
  const apiKey = process.env.PERPLEXITY_API_KEY;
  if (!apiKey) throw new Error("PERPLEXITY_API_KEY not set");

  const res = await fetch("https://api.perplexity.ai/chat/completions", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${apiKey}`,
    },
    body: JSON.stringify({
      model: "sonar",
      max_tokens: 300,
      messages: [{ role: "user", content: prompt }],
    }),
  });

  if (!res.ok) throw new Error(`Perplexity error: ${res.status}`);
  const data = await res.json();
  return data.choices[0].message.content as string;
}

// Step 1: classify whether this reasoning is worth grounding
async function classifyReasoning(
  input: ReasoningInput
): Promise<"not-checkable" | "immediately-checkable" | "needs-grounding"> {
  const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

  const prompt = `A financial analyst made a ${input.sentiment} prediction on ${input.ticker}.

Their reasoning: "${input.reasoning}"
Cited sources: ${input.data_sources_cited.length > 0 ? input.data_sources_cited.join(", ") : "none"}
Catalysts: ${input.catalysts.length > 0 ? input.catalysts.join(", ") : "none"}

Classify this reasoning as one of:
- "not-checkable": vague opinion with no verifiable claims (e.g. "I think this will go up", "momentum looks good")
- "immediately-checkable": makes concrete claims verifiable from general knowledge (e.g. cites specific earnings numbers, known product launches)
- "needs-grounding": cites specific sources, filings, people, or recent events that require looking up to verify

Respond with only one of the three labels.`;

  const response = await anthropic.messages.create({
    model: "claude-haiku-4-5",
    max_tokens: 20,
    messages: [{ role: "user", content: prompt }],
  });

  const text = response.content[0].type === "text" ? response.content[0].text.trim().toLowerCase() : "";
  if (text.includes("immediately")) return "immediately-checkable";
  if (text.includes("needs")) return "needs-grounding";
  return "not-checkable";
}

// Step 2: ground specific claims via Perplexity
async function groundClaims(input: ReasoningInput): Promise<string> {
  const sourcesText = input.data_sources_cited.length > 0
    ? `Cited sources: ${input.data_sources_cited.join(", ")}. `
    : "";
  const catalystsText = input.catalysts.length > 0
    ? `Stated catalysts: ${input.catalysts.join(", ")}. `
    : "";

  return queryPerplexity(
    `A financial analyst predicted ${input.sentiment} for ${input.ticker}. ${sourcesText}${catalystsText}` +
    `Their reasoning: "${input.reasoning}". ` +
    `The prediction turned out to be ${input.was_correct ? "correct" : "incorrect"}. ` +
    `In 2-3 sentences: were the cited sources and catalysts real and accurate at the time? ` +
    `Did the stated reasons actually materialize?`
  );
}

// Step 3: score reasoning quality given optional grounded context
async function scoreReasoning(
  input: ReasoningInput,
  groundedContext: string | null
): Promise<{ reasoning_quality: number; data_discipline: number; transparency: number; notes: string }> {
  const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

  const contextBlock = groundedContext
    ? `\n\nGrounded fact-check result: "${groundedContext}"`
    : "";

  const prompt = `Score the quality of this financial prediction's reasoning.

Ticker: ${input.ticker} | Sentiment: ${input.sentiment} | Outcome: ${input.was_correct ? "CORRECT" : "INCORRECT"}
Reasoning: "${input.reasoning}"
Cited sources: ${input.data_sources_cited.join(", ") || "none"}
Catalysts: ${input.catalysts.join(", ") || "none"}${contextBlock}

Score each dimension 0.0–1.0:
- reasoning_quality: clarity and specificity of thesis (0.1 = vague opinion, 1.0 = clear thesis with supporting evidence)
- data_discipline: use of real data sources and numbers (0.1 = pure speculation, 1.0 = cites filings/numbers/documents)
- transparency: acknowledgment of uncertainty and risks (0.1 = overconfident, 1.0 = explicit about risks and limitations)

Important: a prediction that was correct for the wrong reasons should score lower on reasoning_quality and data_discipline than one that was correct for the right reasons. An incorrect prediction with sound, evidence-based reasoning should score higher than a correct guess.

Respond with valid JSON only:
{"reasoning_quality": 0.0, "data_discipline": 0.0, "transparency": 0.0, "notes": "one sentence"}`;

  const response = await anthropic.messages.create({
    model: "claude-haiku-4-5",
    max_tokens: 150,
    messages: [{ role: "user", content: prompt }],
  });

  const text = response.content[0].type === "text" ? response.content[0].text.trim() : "{}";
  const cleaned = text.replace(/^```(?:json)?\n?/m, "").replace(/\n?```$/m, "").trim();

  try {
    const parsed = JSON.parse(cleaned);
    return {
      reasoning_quality: Math.min(1, Math.max(0, Number(parsed.reasoning_quality) || 0.3)),
      data_discipline: Math.min(1, Math.max(0, Number(parsed.data_discipline) || 0.3)),
      transparency: Math.min(1, Math.max(0, Number(parsed.transparency) || 0.3)),
      notes: String(parsed.notes || ""),
    };
  } catch {
    return { reasoning_quality: 0.3, data_discipline: 0.3, transparency: 0.3, notes: "scoring parse failed" };
  }
}

export async function validateReasoning(
  input: ReasoningInput
): Promise<ReasoningValidationResult> {
  // Skip predictions with no reasoning content
  if (!input.reasoning || input.reasoning.trim().length < 20) {
    return {
      prediction_id: input.prediction_id,
      checkable_type: "not-checkable",
      grounded_context: null,
      reasoning_quality_score: 0.1,
      data_discipline_score: 0.1,
      transparency_score: 0.1,
      validation_notes: "no meaningful reasoning provided",
    };
  }

  const checkableType = await classifyReasoning(input);

  let groundedContext: string | null = null;
  if (checkableType === "needs-grounding" && process.env.PERPLEXITY_API_KEY) {
    try {
      groundedContext = await groundClaims(input);
    } catch (err) {
      console.warn(`[reasoning-validator] Perplexity grounding failed for ${input.prediction_id}:`, err);
    }
  }

  const scores = await scoreReasoning(input, groundedContext);

  return {
    prediction_id: input.prediction_id,
    checkable_type: checkableType,
    grounded_context: groundedContext,
    reasoning_quality_score: scores.reasoning_quality,
    data_discipline_score: scores.data_discipline,
    transparency_score: scores.transparency,
    validation_notes: scores.notes,
  };
}
