import { db } from "../db/browser";

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
  persona_name?: string;
  persona_slug?: string;
  persona_framework?: string;
  thesis?: string;
  catalysts?: string[];
  invalidators?: string[];
  watch_items?: string[];
  risk_flags?: string[];
  signal_type?: "momentum" | "reversal" | "breakout" | "hold" | "avoid";
  time_sensitivity?: "immediate" | "days" | "weeks" | "months";
}

export async function getTickerAgentAnalyses(tickerId: string): Promise<AgentAnalysis[]> {
  const { data, error } = await db
    .from("ai_agent_analyses")
    .select(`
      *,
      ai_agent_personas!inner (
        name,
        slug,
        framework
      )
    `)
    .eq("ticker_id", tickerId)
    .gt("expires_at", new Date().toISOString())
    .order("analyzed_at", { ascending: false });

  if (error || !Array.isArray(data)) {
    console.error("[ai-agents] Error fetching analyses:", error);
    return [];
  }

  return data.map((item) => {
    const row = item as unknown as AgentAnalysis & { ai_agent_personas?: { name?: string; slug?: string; framework?: string } | null };
    return {
      ...row,
      persona_name: row.ai_agent_personas?.name,
      persona_slug: row.ai_agent_personas?.slug,
      persona_framework: row.ai_agent_personas?.framework,
    };
  });
}
