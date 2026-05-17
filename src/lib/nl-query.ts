import { llmClient } from "../integrations/llm/client.js";

const SCHEMA = `
Tables in the Street Insights database:

tickers(id uuid, symbol text, company_name text, sector text, industry text, market_cap numeric, avg_daily_mentions numeric, mention_spike_threshold numeric, is_active boolean, created_at timestamptz, updated_at timestamptz)

sources(id uuid, name text, platform text, username text, source_type text, follower_count int, credibility_score numeric, total_predictions int, correct_predictions int, accuracy_rate numeric, avg_days_to_target numeric, uses_data_sources boolean, reasoning_quality numeric, transparency_score numeric, bio text, url text, verified boolean, is_active boolean, created_at timestamptz, updated_at timestamptz)

mentions(id uuid, ticker_id uuid, source_id uuid, content text, url text, platform text, mentioned_at timestamptz, detected_at timestamptz, engagement_score numeric, is_prediction boolean, processed boolean, created_at timestamptz)
  -- ticker_id → tickers.id, source_id → sources.id

predictions(id uuid, ticker_id uuid, source_id uuid, mention_id uuid, sentiment text CHECK(sentiment IN ('bullish','bearish','neutral')), price_target numeric, timeframe_days int, confidence_level text CHECK(confidence_level IN ('low','medium','high')), reasoning text, data_sources_cited text[], catalysts text[], reasoning_quality_score numeric, data_discipline_score numeric, transparency_score numeric, prediction_date timestamptz, target_date timestamptz, created_at timestamptz, updated_at timestamptz)
  -- ticker_id → tickers.id, source_id → sources.id

validations(id uuid, prediction_id uuid, price_at_prediction numeric, price_at_validation numeric, price_change_percent numeric, was_correct boolean, accuracy_score numeric, days_to_outcome int, validation_date timestamptz, validation_method text, notes text, created_at timestamptz)
  -- prediction_id → predictions.id

mention_frequency(id uuid, ticker_id uuid, date date, mention_count int, unique_sources int, avg_sentiment_score numeric, spike_detected boolean, created_at timestamptz)
  -- ticker_id → tickers.id

government_events(id uuid, title text, description text, event_type text, source_category text CHECK(source_category IN ('fed','treasury','congress')), event_date timestamptz, event_end_date timestamptz, all_day boolean, source_url text, source_feed text, external_id text, status text, participants text[], related_topics text[], created_at timestamptz, updated_at timestamptz)

event_impact_scores(id uuid, event_id uuid, impact_magnitude numeric, impact_direction text, confidence numeric, timeframe text, affected_sectors text[], affected_tickers text[], reasoning text, key_factors text[], historical_precedent text, model_provider text, model_name text, is_latest boolean, created_at timestamptz)
  -- event_id → government_events.id

scan_log(id uuid, scan_type text, status text, mentions_found int, error_message text, started_at timestamptz, completed_at timestamptz)
`;

const SYSTEM_PROMPT = `You are a SQL (PostgreSQL) expert for a financial market signals platform called Street Insights.
Your job is to convert the user's natural language question into a safe SELECT query against the schema below.

${SCHEMA}

Rules:
- Only generate SELECT queries — never INSERT, UPDATE, DELETE, DROP, TRUNCATE, ALTER, CREATE, GRANT, or REVOKE.
- Do not use subqueries that modify data.
- Use ILIKE with LOWER() for case-insensitive text matching.
- Always join via the foreign keys described in the schema.
- Limit results to 200 rows maximum unless the user asks for more.
- Return only the raw SQL query, no explanation, no markdown fences.
- The query MUST return at least two columns so it can be displayed as a table.
- Prefer readable column aliases (e.g. ticker_symbol instead of t.symbol).
- When the user asks for "top", "best", or "most", add ORDER BY and LIMIT appropriately.`;

const EXPLAIN_SYSTEM = `You are a SQL expert for a financial market signals platform. Explain the following SQL query to a non-technical user in plain English. Be concise — 2-3 sentences max.`;

export interface QueryResult {
  rows: Record<string, unknown>[];
  columns: string[];
}

export interface NLQueryResponse {
  sql: string;
  results: QueryResult;
  explanation: string;
}

export async function naturalLanguageToSQL(question: string): Promise<string> {
  const result = await llmClient.chat({
    messages: [
      { role: "system", content: SYSTEM_PROMPT },
      { role: "user", content: question },
    ],
    temperature: 0,
    maxTokens: 500,
    json: false,
  });
  return result.content.trim();
}

export async function explainSQL(question: string, sql: string): Promise<string> {
  const result = await llmClient.chat({
    messages: [
      { role: "system", content: EXPLAIN_SYSTEM },
      { role: "user", content: `User asked: "${question}"\n\nSQL generated:\n${sql}` },
    ],
    temperature: 0.3,
    maxTokens: 200,
    json: false,
  });
  return result.content.trim();
}

export function isSafeQuery(sql: string): boolean {
  const upper = sql.trim().toUpperCase();
  if (!upper.startsWith("SELECT")) return false;
  const forbidden = ["INSERT", "UPDATE", "DELETE", "DROP", "TRUNCATE", "ALTER", "CREATE", "GRANT", "REVOKE", "--", ";--"];
  return !forbidden.some((kw) => upper.includes(kw));
}
