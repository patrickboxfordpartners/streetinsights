import { parseSelect } from "../src/db/parse.ts";
import { buildSql } from "../src/db/sql.ts";
import type { QueryDescriptor } from "../src/db/types.ts";

function select(table: string, columns: string, extra: Partial<QueryDescriptor> = {}): QueryDescriptor {
  return {
    table,
    action: "select",
    fields: parseSelect(columns),
    countExact: false,
    head: false,
    filters: [],
    orders: [],
    single: false,
    ...extra,
  };
}

const nested = parseSelect("*, predictions ( tickers (symbol) )");
if (!nested.some((field) => field.relation === "predictions")) {
  throw new Error("nested relation was not parsed");
}
const inner = parseSelect("*, ai_agent_personas!inner ( name, slug )");
const persona = inner.find((field) => field.relation === "ai_agent_personas");
if (!persona?.inner) throw new Error("!inner was not parsed");

const counted = buildSql(select("mentions", "*", { countExact: true, head: true }));
if (!counted.text.startsWith("SELECT count(*)")) throw new Error(counted.text);

const upsert = buildSql({
  table: "sources",
  action: "upsert",
  fields: [{ column: "*" }],
  countExact: false,
  head: false,
  filters: [],
  orders: [],
  single: false,
  payload: { name: "Ada", platform: "adanos", username: "reddit", source_type: "publication" },
  onConflict: "platform,username",
  ignoreDuplicates: true,
});
if (!upsert.text.includes("ON CONFLICT (\"platform\", \"username\") DO NOTHING")) {
  throw new Error(upsert.text);
}

const emptyIn = buildSql({
  ...select("tickers", "id"),
  filters: [{ kind: "in", column: "symbol", values: [], negate: false }],
});
if (!emptyIn.text.includes("FALSE")) throw new Error(emptyIn.text);

console.log("query builder checks passed");
