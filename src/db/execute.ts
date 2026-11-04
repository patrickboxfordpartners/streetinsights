import { neon } from "@neondatabase/serverless";
import { buildEmbedSql, buildSql, embedColumns, RELATIONS } from "./sql.js";
import type { QueryDescriptor, QueryResult, SelectField } from "./types.js";

type SqlRunner = (text: string, params: unknown[]) => Promise<Record<string, unknown>[]>;

const runners = new Map<string, SqlRunner>();

function runnerFor(connectionString: string): SqlRunner {
  const existing = runners.get(connectionString);
  if (existing) return existing;
  const sql = neon(connectionString);
  const run: SqlRunner = async (text, params) => {
    const result = await sql.query(text, params);
    if (Array.isArray(result)) return result as Record<string, unknown>[];
    if (result && typeof result === "object" && Array.isArray((result as { rows?: unknown }).rows)) {
      return (result as { rows: Record<string, unknown>[] }).rows;
    }
    return [];
  };
  runners.set(connectionString, run);
  return run;
}

export async function rawQuery(text: string, connectionString = process.env.DATABASE_URL): Promise<Record<string, unknown>[]> {
  if (!connectionString) throw new Error("DATABASE_URL is not set");
  return runnerFor(connectionString)(text, []);
}

export async function executeQuery(query: QueryDescriptor, connectionString: string | undefined): Promise<QueryResult> {
  if (!connectionString) {
    return { data: null, error: { message: "DATABASE_URL is not set", code: "NO_DATABASE" }, count: null };
  }
  try {
    const run = runnerFor(connectionString);
    const built = buildSql(query);
    const rows = await run(built.text, built.params);

    if (query.action === "select" && query.countExact && query.head) {
      const count = Number(rows[0]?.count ?? 0);
      return { data: null, error: null, count };
    }

    let records = rows;
    if (query.action === "select" && built.embeds.length > 0) {
      records = await attachEmbeds(query.table, rows, built.embeds, run);
    }

    if (query.head) {
      return { data: null, error: null, count: records.length };
    }
    if (query.single) {
      if (records.length !== 1) {
        return {
          data: null,
          error: { message: records.length === 0 ? "No rows found" : "Multiple rows found", code: "PGRST116" },
          count: records.length,
        };
      }
      return { data: records[0], error: null, count: 1 };
    }
    return { data: records, error: null, count: query.countExact ? records.length : null };
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    const rawCode = typeof error === "object" && error && "code" in error ? String((error as { code?: string }).code) : undefined;
    const code = rawCode || (message.includes("23505") || message.toLowerCase().includes("duplicate key") ? "23505" : undefined);
    return { data: null, error: { message, code }, count: null };
  }
}

async function attachEmbeds(
  table: string,
  rows: Record<string, unknown>[],
  embeds: SelectField[],
  run: SqlRunner,
): Promise<Record<string, unknown>[]> {
  let current = rows;
  for (const embed of embeds) {
    const relationName = embed.relation;
    if (!relationName) continue;
    const relation = RELATIONS[table]?.[relationName];
    if (!relation) {
      for (const row of current) row[relationName] = null;
      continue;
    }
    const ids = [...new Set(current.map((row) => row[relation.local]).filter((id) => id !== null && id !== undefined))];
    const wantedWinRate = (embed.children ?? []).some((child) => child.column === "win_rate");
    let related: Record<string, unknown>[] = [];
    if (ids.length > 0) {
      const built = buildEmbedSql(relation.table, relation.foreign, embedColumns(embed), ids);
      related = await run(built.text, built.params);
      const nested = (embed.children ?? []).filter((child) => child.relation);
      if (nested.length > 0) related = await attachEmbeds(relation.table, related, nested, run);
    }
    if (wantedWinRate) {
      for (const item of related) {
        if (item.win_rate === undefined) item.win_rate = item.accuracy_rate ?? null;
      }
    }
    const grouped = new Map<string, Record<string, unknown>[]>();
    for (const item of related) {
      const key = String(item[relation.foreign]);
      const list = grouped.get(key) ?? [];
      list.push(item);
      grouped.set(key, list);
    }
    for (const row of current) {
      const matches = grouped.get(String(row[relation.local])) ?? [];
      row[relationName] = relation.many ? matches : (matches[0] ?? null);
    }
    if (embed.inner) {
      current = current.filter((row) => {
        const value = row[relationName];
        return relation.many ? Array.isArray(value) && value.length > 0 : value != null;
      });
    }
  }
  return current;
}
