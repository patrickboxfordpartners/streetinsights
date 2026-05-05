/**
 * AI Agent Analysis Service
 * Generate investment framework analyses from different personas (Buffett, Lynch, Graham, etc.)
 */

import { supabase } from "../integrations/supabase/client";
import { routeLLMRequest } from "./llm-router";
import { getEconomicContextForAI } from "./economic-data";

export interface AgentPersona {
  id: string;
  name: string;
  slug: string;
  description: string;
  framework: string;
  prompt_template: string;
  display_order: number;
}

export interface AgentAnalysis {
  id: string;
  ticker_id: string;
  agent_persona_id: string;
  sentiment: "bullish" | "bearish" | "neutral" | "hold";
  confidence_score: number;
  analysis_text: string;
  key_factors: string[];
  risks: string[];
  recommendation: string;
  analyzed_at: string;
  price_at_analysis: number | null;
  expires_at: string;
  // Joined persona data
  persona_name?: string;
  persona_slug?: string;
  persona_framework?: string;
}

export interface TickerContext {
  symbol: string;
  company_name: string;
  sector?: string;
  industry?: string;
  price?: number;
  market_cap?: number;
  avg_mentions?: number;
  sentiment_breakdown?: {
    bullish: number;
    bearish: number;
    neutral: number;
  };
  recent_news?: string[];
  technical_signals?: string[];
}

/**
 * Fetch all agent personas
 */
export async function getAgentPersonas(): Promise<AgentPersona[]> {
  const { data, error } = await supabase
    .from("ai_agent_personas")
    .select("*")
    .eq("is_active", true)
    .order("display_order");

  if (error) {
    console.error("[ai-agents] Error fetching personas:", error);
    return [];
  }

  return data || [];
}

/**
 * Fetch analyses for a ticker (check cache first)
 */
export async function getTickerAgentAnalyses(tickerId: string): Promise<AgentAnalysis[]> {
  const { data, error } = await supabase
    .from("ai_agent_analyses")
    .select(
      `
      *,
      ai_agent_personas!inner (
        name,
        slug,
        framework
      )
    `
    )
    .eq("ticker_id", tickerId)
    .gt("expires_at", new Date().toISOString()) // Only non-expired
    .order("analyzed_at", { ascending: false });

  if (error) {
    console.error("[ai-agents] Error fetching analyses:", error);
    return [];
  }

  // Flatten the joined persona data
  return (data || []).map((item: any) => ({
    ...item,
    persona_name: item.ai_agent_personas?.name,
    persona_slug: item.ai_agent_personas?.slug,
    persona_framework: item.ai_agent_personas?.framework,
  }));
}

/**
 * Generate analysis for a ticker using a specific agent persona
 * This would typically be called server-side via an Edge Function or worker
 */
export async function generateAgentAnalysis(
  tickerId: string,
  personaId: string,
  context: TickerContext,
  llmApiKey: string
): Promise<AgentAnalysis | null> {
  try {
    // 1. Get the persona
    const { data: persona } = await supabase
      .from("ai_agent_personas")
      .select("*")
      .eq("id", personaId)
      .single();

    if (!persona) {
      console.error("[ai-agents] Persona not found:", personaId);
      return null;
    }

    // 2. Build context string
    const contextStr = buildContextString(context);

    // 2b. Add economic context
    const economicContext = await getEconomicContextForAI().catch(() => "");

    // 3. Fill in the prompt template
    let prompt = persona.prompt_template
      .replace("{symbol}", context.symbol)
      .replace("{company_name}", context.company_name || context.symbol)
      .replace("{context}", contextStr);

    // Append economic context if available
    if (economicContext) {
      prompt += `\n\n${economicContext}`;
    }

    // 4. Call LLM (with automatic fallback)
    const llmResponse = await routeLLMRequest({
      systemPrompt: "You are an expert financial analyst embodying a specific investment philosophy. Provide structured, actionable analysis.",
      userPrompt: prompt,
      temperature: 0.7,
      maxTokens: 1000,
    });

    const analysisText = llmResponse.content;
    console.log(`[ai-agents] Generated analysis using ${llmResponse.provider} (${llmResponse.model}) in ${llmResponse.latencyMs}ms`);

    // 5. Parse the LLM response
    const parsed = parseAgentResponse(analysisText);

    // 6. Save to database
    const { data: analysis, error } = await supabase
      .from("ai_agent_analyses")
      .insert({
        ticker_id: tickerId,
        agent_persona_id: personaId,
        sentiment: parsed.sentiment,
        confidence_score: parsed.confidence,
        analysis_text: analysisText,
        key_factors: parsed.keyFactors,
        risks: parsed.risks,
        recommendation: parsed.recommendation,
        price_at_analysis: context.price || null,
        ttl_hours: 24,
        expires_at: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(),
      })
      .select()
      .single();

    if (error) {
      console.error("[ai-agents] Error saving analysis:", error);
      return null;
    }

    return {
      ...analysis,
      persona_name: persona.name,
      persona_slug: persona.slug,
      persona_framework: persona.framework,
    };
  } catch (err) {
    console.error("[ai-agents] Error generating analysis:", err);
    return null;
  }
}

/**
 * Build context string from ticker data
 */
function buildContextString(context: TickerContext): string {
  const parts: string[] = [];

  if (context.price) parts.push(`Current Price: $${context.price.toFixed(2)}`);
  if (context.market_cap)
    parts.push(`Market Cap: $${(context.market_cap / 1e9).toFixed(2)}B`);
  if (context.sector) parts.push(`Sector: ${context.sector}`);
  if (context.industry) parts.push(`Industry: ${context.industry}`);

  if (context.sentiment_breakdown) {
    const total =
      context.sentiment_breakdown.bullish +
      context.sentiment_breakdown.bearish +
      context.sentiment_breakdown.neutral;
    if (total > 0) {
      parts.push(
        `Social Sentiment: ${((context.sentiment_breakdown.bullish / total) * 100).toFixed(0)}% bullish, ${((context.sentiment_breakdown.bearish / total) * 100).toFixed(0)}% bearish`
      );
    }
  }

  if (context.avg_mentions) {
    parts.push(`Avg Daily Mentions: ${context.avg_mentions}`);
  }

  if (context.recent_news && context.recent_news.length > 0) {
    parts.push(`Recent News:\n${context.recent_news.join("\n")}`);
  }

  if (context.technical_signals && context.technical_signals.length > 0) {
    parts.push(`Technical Signals: ${context.technical_signals.join(", ")}`);
  }

  return parts.join("\n");
}

/**
 * Parse LLM response into structured data
 * This is a simple parser - production would be more robust
 */
function parseAgentResponse(text: string): {
  sentiment: "bullish" | "bearish" | "neutral" | "hold";
  confidence: number;
  keyFactors: string[];
  risks: string[];
  recommendation: string;
} {
  // Default values
  let sentiment: "bullish" | "bearish" | "neutral" | "hold" = "neutral";
  let confidence = 50;
  const keyFactors: string[] = [];
  const risks: string[] = [];
  let recommendation = "";

  // Extract sentiment
  const sentimentMatch = text.match(
    /sentiment[:\s]+(\w+)/i
  );
  if (sentimentMatch) {
    const s = sentimentMatch[1].toLowerCase();
    if (["bullish", "bearish", "neutral", "hold"].includes(s)) {
      sentiment = s as any;
    }
  }

  // Extract confidence
  const confidenceMatch = text.match(/confidence[:\s]+(\d+)/i);
  if (confidenceMatch) {
    confidence = parseInt(confidenceMatch[1], 10);
  }

  // Extract key factors (look for bullet points or numbered lists)
  const factorMatches = text.match(/(?:key factors?|factors?)[:\s]+([\s\S]*?)(?=risks?|recommendation|$)/i);
  if (factorMatches) {
    const factorText = factorMatches[1];
    const bullets = factorText.match(/[-•*]\s*(.+)/g);
    if (bullets) {
      keyFactors.push(...bullets.map((b) => b.replace(/^[-•*]\s*/, "").trim()));
    }
  }

  // Extract risks
  const riskMatches = text.match(/risks?[:\s]+([\s\S]*?)(?=recommendation|$)/i);
  if (riskMatches) {
    const riskText = riskMatches[1];
    const bullets = riskText.match(/[-•*]\s*(.+)/g);
    if (bullets) {
      risks.push(...bullets.map((b) => b.replace(/^[-•*]\s*/, "").trim()));
    }
  }

  // Extract recommendation
  const recMatch = text.match(/recommendation[:\s]+([\s\S]*?)$/i);
  if (recMatch) {
    recommendation = recMatch[1].trim();
  }

  return { sentiment, confidence, keyFactors, risks, recommendation };
}

/**
 * Trigger analysis generation for all personas for a ticker
 * This should be called server-side (Edge Function or Inngest worker)
 */
export async function triggerFullAnalysis(tickerId: string, context: TickerContext): Promise<void> {
  console.log(`[ai-agents] Triggering full analysis for ${context.symbol}`);
  // This would call an Edge Function or queue an Inngest job
  // For now, just log it
  // await fetch('/api/ai-agents/analyze', { method: 'POST', body: JSON.stringify({ tickerId, context }) })
}
