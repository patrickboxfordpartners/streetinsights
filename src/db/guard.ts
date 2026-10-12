import type { Filter, QueryDescriptor } from "./types.js";

const PUBLIC_READ = new Set([
  "tickers",
  "sources",
  "mentions",
  "predictions",
  "validations",
  "mention_frequency",
  "government_events",
  "event_impact_scores",
  "event_validations",
  "swarm_signals",
  "options_flow",
  "ai_agent_personas",
  "ai_agent_analyses",
  "model_predictions",
  "model_configs",
  "model_training_data",
]);

const USER_TABLES = new Set([
  "user_profiles",
  "user_watchlist",
  "user_ticker_tracking",
  "alert_preferences",
  "alert_log",
  "source_follows",
]);

const AUTH_WRITE = new Set(["tickers", "content_drafts"]);

function ownerColumn(table: string): string {
  return table === "user_profiles" ? "id" : "user_id";
}

export function guardQuery(query: QueryDescriptor, userId: string | null): QueryDescriptor | { error: string; status: number } {
  if (query.limit !== undefined && query.limit > 5000) query.limit = 5000;
  if (query.action === "select" && query.limit === undefined && PUBLIC_READ.has(query.table)) {
    query.limit = 5000;
  }

  if (USER_TABLES.has(query.table)) {
    if (!userId) {
      if (query.action === "select") return { ...query, filters: [{ kind: "cmp", op: "eq", column: ownerColumn(query.table), value: "__anonymous__" }] };
      return { error: "Sign in required", status: 401 };
    }
    return scopeToUser(query, userId);
  }

  if (query.table === "content_drafts") {
    if (!userId) return { error: "Sign in required", status: 401 };
    return query;
  }

  if (query.action === "select" && PUBLIC_READ.has(query.table)) return query;

  if (query.action !== "select" && AUTH_WRITE.has(query.table)) {
    if (!userId) return { error: "Sign in required", status: 401 };
    return query;
  }

  return { error: "This query is not available from the browser", status: 403 };
}

function scopeToUser(query: QueryDescriptor, userId: string): QueryDescriptor {
  const column = ownerColumn(query.table);
  const filters: Filter[] = query.filters.filter((filter) => !("column" in filter) || filter.column !== column);
  filters.push({ kind: "cmp", op: "eq", column, value: userId });

  if (query.action === "insert" || query.action === "upsert") {
    const many = Array.isArray(query.payload);
    const rows: unknown[] = many ? query.payload as unknown[] : [query.payload];
    const stamped = rows.map((row) => {
      if (!row || typeof row !== "object") return row;
      return { ...(row as Record<string, unknown>), [column]: userId };
    });
    query.payload = many ? stamped : stamped[0];
  }
  return { ...query, filters };
}
