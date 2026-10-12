import type { Filter, QueryDescriptor, SelectField } from "./types.js";

const IDENT = /^[a-z_][a-z0-9_]*$/i;

export interface Relation {
  table: string;
  local: string;
  foreign: string;
  many: boolean;
}

export const RELATIONS: Record<string, Record<string, Relation>> = {
  mentions: {
    tickers: { table: "tickers", local: "ticker_id", foreign: "id", many: false },
    sources: { table: "sources", local: "source_id", foreign: "id", many: false },
  },
  predictions: {
    tickers: { table: "tickers", local: "ticker_id", foreign: "id", many: false },
    sources: { table: "sources", local: "source_id", foreign: "id", many: false },
    validations: { table: "validations", local: "id", foreign: "prediction_id", many: true },
    mentions: { table: "mentions", local: "mention_id", foreign: "id", many: false },
  },
  validations: {
    predictions: { table: "predictions", local: "prediction_id", foreign: "id", many: false },
  },
  mention_frequency: {
    tickers: { table: "tickers", local: "ticker_id", foreign: "id", many: false },
  },
  model_predictions: {
    tickers: { table: "tickers", local: "ticker_id", foreign: "id", many: false },
  },
  government_events: {
    event_impact_scores: { table: "event_impact_scores", local: "id", foreign: "event_id", many: true },
  },
  ai_agent_analyses: {
    ai_agent_personas: { table: "ai_agent_personas", local: "agent_persona_id", foreign: "id", many: false },
  },
  source_follows: {
    user_profiles: { table: "user_profiles", local: "user_id", foreign: "id", many: false },
    auth_users: { table: "user_profiles", local: "user_id", foreign: "id", many: false },
  },
  options_flow: {
    tickers: { table: "tickers", local: "ticker_id", foreign: "id", many: false },
  },
  swarm_signals: {
    tickers: { table: "tickers", local: "ticker_id", foreign: "id", many: false },
  },
};

const ARRAY_COLUMNS = new Set([
  "predictions.data_sources_cited",
  "predictions.catalysts",
  "predictions.risks",
  "government_events.participants",
  "government_events.related_topics",
  "event_impact_scores.affected_sectors",
  "event_impact_scores.affected_tickers",
  "event_impact_scores.key_factors",
  "ai_agent_analyses.key_factors",
  "ai_agent_analyses.risks",
]);

const JSON_COLUMNS = new Set([
  "alert_log.metadata",
  "content_drafts.metadata",
  "model_predictions.features",
  "model_configs.config",
  "model_configs.metrics_by_class",
  "model_training_data.features",
  "event_validations.ticker_outcomes",
  "event_validations.sector_outcomes",
  "debates.personas",
  "debates.transcript",
]);

export interface BuiltSql {
  text: string;
  params: unknown[];
  embeds: SelectField[];
}

export function quoteIdent(name: string): string {
  if (!IDENT.test(name)) throw new Error(`Invalid identifier "${name}"`);
  return `"${name}"`;
}

export function buildSql(query: QueryDescriptor): BuiltSql {
  const params: unknown[] = [];
  const table = quoteIdent(query.table);
  const embeds = query.fields.filter((field) => field.relation);
  const where = compileFilters(query.table, query.filters, params);
  const whereSql = where ? ` WHERE ${where}` : "";

  if (query.action === "select") {
    if (query.countExact && query.head) {
      return {
        text: `SELECT count(*)::int AS count FROM ${table}${whereSql}`,
        params,
        embeds: [],
      };
    }
    const columns = scalarColumns(query.fields);
    const columnSql = columns.length === 0 ? "*" : columns.map(quoteIdent).join(", ");
    const orderSql = compileOrder(query.orders);
    const limitSql = query.limit !== undefined ? ` LIMIT ${assertLimit(query.limit)}` : "";
    return {
      text: `SELECT ${columnSql} FROM ${table}${whereSql}${orderSql}${limitSql}`,
      params,
      embeds,
    };
  }

  if (query.action === "insert" || query.action === "upsert") {
    const rows = normalizeRows(query.payload);
    if (rows.length === 0) throw new Error("Insert requires at least one row");
    const columns = [...new Set(rows.flatMap((row) => Object.keys(row)))];
    columns.forEach((column) => quoteIdent(column));
    const values = rows.map((row) => {
      const slots = columns.map((column) => bind(query.table, column, row[column] ?? null, params));
      return `(${slots.join(", ")})`;
    });
    let text = `INSERT INTO ${table} (${columns.map(quoteIdent).join(", ")}) VALUES ${values.join(", ")}`;
    if (query.action === "upsert") {
      const conflict = (query.onConflict ?? "").split(",").map((part) => part.trim()).filter(Boolean);
      if (conflict.length === 0) throw new Error("upsert requires onConflict");
      conflict.forEach((column) => quoteIdent(column));
      const updates = columns.filter((column) => !conflict.includes(column));
      if (query.ignoreDuplicates || updates.length === 0) {
        text += ` ON CONFLICT (${conflict.map(quoteIdent).join(", ")}) DO NOTHING`;
      } else {
        const setSql = updates.map((column) => `${quoteIdent(column)} = EXCLUDED.${quoteIdent(column)}`).join(", ");
        text += ` ON CONFLICT (${conflict.map(quoteIdent).join(", ")}) DO UPDATE SET ${setSql}`;
      }
    }
    const returning = returningColumns(query.fields);
    text += ` RETURNING ${returning}`;
    return { text, params, embeds };
  }

  if (query.action === "update") {
    if (!where) throw new Error("Refusing to update without a filter");
    const row = normalizeRows(query.payload)[0];
    if (!row) throw new Error("Update requires a row");
    const assignments = Object.keys(row).map((column) => {
      quoteIdent(column);
      return `${quoteIdent(column)} = ${bind(query.table, column, row[column], params)}`;
    });
    if (assignments.length === 0) throw new Error("Update requires columns");
    return {
      text: `UPDATE ${table} SET ${assignments.join(", ")}${whereSql} RETURNING *`,
      params,
      embeds,
    };
  }

  if (!where) throw new Error("Refusing to delete without a filter");
  return { text: `DELETE FROM ${table}${whereSql} RETURNING *`, params, embeds };
}

export function buildEmbedSql(table: string, foreign: string, columns: string[], ids: unknown[]): BuiltSql {
  const params: unknown[] = [ids.map((id) => (id === null || id === undefined ? null : String(id)))];
  const selected = columns.length === 0
    ? "*"
    : [...new Set([foreign, ...columns])].map(quoteIdent).join(", ");
  return {
    text: `SELECT ${selected} FROM ${quoteIdent(table)} WHERE ${quoteIdent(foreign)}::text = ANY($${params.length}::text[])`,
    params,
    embeds: [],
  };
}

function scalarColumns(fields: SelectField[]): string[] {
  const columns = fields.filter((field) => field.column && field.column !== "*").map((field) => field.column as string);
  if (fields.some((field) => field.column === "*") || columns.length === 0) return [];
  return columns;
}

function returningColumns(fields: SelectField[]): string {
  const columns = fields.filter((field) => field.column && field.column !== "*").map((field) => quoteIdent(field.column as string));
  if (columns.length === 0) return "*";
  return columns.join(", ");
}

function compileOrder(orders: QueryDescriptor["orders"]): string {
  if (orders.length === 0) return "";
  const parts = orders.map((order) => `${quoteIdent(order.column)} ${order.ascending ? "ASC" : "DESC"}`);
  return ` ORDER BY ${parts.join(", ")}`;
}

function compileFilters(table: string, filters: Filter[], params: unknown[]): string {
  return filters.map((filter) => compileFilter(table, filter, params)).filter(Boolean).join(" AND ");
}

function compileFilter(table: string, filter: Filter, params: unknown[]): string {
  if (filter.kind === "cmp") {
    return `${quoteIdent(filter.column)} ${cmpOp(filter.op)} ${bind(table, filter.column, filter.value, params)}`;
  }
  if (filter.kind === "in") {
    if (filter.values.length === 0) return filter.negate ? "TRUE" : "FALSE";
    params.push(filter.values.map((value) => value === null || value === undefined ? null : String(value)));
    const expr = `${quoteIdent(filter.column)}::text = ANY($${params.length}::text[])`;
    return filter.negate ? `NOT (${expr})` : expr;
  }
  if (filter.kind === "is") {
    return `${quoteIdent(filter.column)} IS ${filter.negate ? "NOT " : ""}NULL`;
  }
  if (filter.kind === "ilike") {
    params.push(filter.pattern);
    return `${quoteIdent(filter.column)} ILIKE $${params.length}`;
  }
  if (filter.kind === "contains") {
    const values = Array.isArray(filter.value) ? filter.value : [filter.value];
    params.push(JSON.stringify(values));
    return `${quoteIdent(filter.column)} @> ARRAY(SELECT jsonb_array_elements_text($${params.length}::jsonb))`;
  }
  const parts = filter.parts.map((part) => {
    if (part.op === "is") return `${quoteIdent(part.column)} IS ${part.value === null ? "" : "NOT "}NULL`;
    if (part.op === "ilike") {
      params.push(part.value);
      return `${quoteIdent(part.column)} ILIKE $${params.length}`;
    }
    return `${quoteIdent(part.column)} ${cmpOp(part.op)} ${bind(table, part.column, part.value, params)}`;
  });
  return parts.length > 0 ? `(${parts.join(" OR ")})` : "";
}

function cmpOp(op: "eq" | "neq" | "gt" | "gte" | "lt" | "lte"): string {
  switch (op) {
    case "eq": return "=";
    case "neq": return "<>";
    case "gt": return ">";
    case "gte": return ">=";
    case "lt": return "<";
    case "lte": return "<=";
  }
}

function bind(table: string, column: string, value: unknown, params: unknown[]): string {
  const key = `${table}.${column}`;
  if (value === undefined) {
    params.push(null);
    return `$${params.length}`;
  }
  if (ARRAY_COLUMNS.has(key) && Array.isArray(value)) {
    params.push(JSON.stringify(value));
    return `ARRAY(SELECT jsonb_array_elements_text($${params.length}::jsonb))`;
  }
  if (JSON_COLUMNS.has(key) && value !== null && typeof value === "object") {
    params.push(JSON.stringify(value));
    return `$${params.length}::jsonb`;
  }
  if (Array.isArray(value) && value.every((item) => typeof item === "string")) {
    params.push(JSON.stringify(value));
    return `ARRAY(SELECT jsonb_array_elements_text($${params.length}::jsonb))`;
  }
  if (value !== null && typeof value === "object" && !(value instanceof Date)) {
    params.push(JSON.stringify(value));
    return `$${params.length}::jsonb`;
  }
  params.push(value instanceof Date ? value.toISOString() : value);
  return `$${params.length}`;
}

function normalizeRows(payload: unknown): Record<string, unknown>[] {
  if (payload === undefined || payload === null) return [];
  const rows = Array.isArray(payload) ? payload : [payload];
  return rows.map((row) => {
    if (!row || typeof row !== "object" || Array.isArray(row)) {
      throw new Error("Row payload must be an object");
    }
    return row as Record<string, unknown>;
  });
}

function assertLimit(limit: number): number {
  if (!Number.isInteger(limit) || limit < 0 || limit > 100000) {
    throw new Error("Invalid limit");
  }
  return limit;
}

export function embedColumns(field: SelectField): string[] {
  const columns = (field.children ?? []).filter((child) => child.column && child.column !== "*").map((child) => child.column as string);
  if ((field.children ?? []).some((child) => child.column === "*") || columns.length === 0) return [];
  return columns.map((column) => (column === "win_rate" ? "accuracy_rate" : column));
}
