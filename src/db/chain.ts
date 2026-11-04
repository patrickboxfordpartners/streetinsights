import type { Database } from "./database.js";
import { parseInList, parseOr, parseSelect } from "./parse.js";
import type { Filter, QueryDescriptor, QueryResult } from "./types.js";

type Tables = Database["public"]["Tables"];
type RowFor<Table extends string> = Table extends keyof Tables ? Tables[Table]["Row"] : { [key: string]: unknown };
type Selected<T, Mode extends "many" | "one"> = Mode extends "one" ? T | null : T[] | null;

export type Executor = (query: QueryDescriptor) => Promise<QueryResult>;

export function createClient(execute: Executor) {
  return {
    from<Table extends string>(table: Table) {
      return new Query<RowFor<Table>>(table, execute);
    },
    channel(name: string) {
      return new Channel(name);
    },
  };
}

// Neon does not stream postgres_changes. These callers refetch on a timer.
class Channel {
  private handlers: Array<() => void> = [];
  private timer: ReturnType<typeof setInterval> | null = null;

  constructor(name: string) {
    void name;
  }

  on(_event: string, _filter: unknown, handler: () => void) {
    this.handlers.push(handler);
    return this;
  }

  subscribe() {
    this.timer = setInterval(() => {
      for (const handler of this.handlers) handler();
    }, 30_000);
    return this;
  }

  unsubscribe() {
    if (this.timer) clearInterval(this.timer);
    this.timer = null;
  }
}

class Query<T, Mode extends "many" | "one" = "many"> {
  private readonly descriptor: QueryDescriptor;
  private readonly execute: Executor;

  constructor(table: string, execute: Executor) {
    this.execute = execute;
    this.descriptor = {
      table,
      action: "select",
      fields: [{ column: "*" }],
      countExact: false,
      head: false,
      filters: [],
      orders: [],
      single: false,
    };
  }

  select(columns?: string, options?: { count?: "exact"; head?: boolean }) {
    this.descriptor.fields = parseSelect(columns);
    this.descriptor.countExact = options?.count === "exact";
    this.descriptor.head = options?.head === true;
    return this;
  }

  insert(payload: unknown) {
    this.descriptor.action = "insert";
    this.descriptor.payload = payload;
    return this;
  }

  upsert(payload: unknown, options?: { onConflict?: string; ignoreDuplicates?: boolean }) {
    this.descriptor.action = "upsert";
    this.descriptor.payload = payload;
    this.descriptor.onConflict = options?.onConflict;
    this.descriptor.ignoreDuplicates = options?.ignoreDuplicates;
    return this;
  }

  update(payload: unknown) {
    this.descriptor.action = "update";
    this.descriptor.payload = payload;
    return this;
  }

  delete() {
    this.descriptor.action = "delete";
    return this;
  }

  eq(column: string, value: unknown) { return this.cmp("eq", column, value); }
  neq(column: string, value: unknown) { return this.cmp("neq", column, value); }
  gt(column: string, value: unknown) { return this.cmp("gt", column, value); }
  gte(column: string, value: unknown) { return this.cmp("gte", column, value); }
  lt(column: string, value: unknown) { return this.cmp("lt", column, value); }
  lte(column: string, value: unknown) { return this.cmp("lte", column, value); }

  in(column: string, values: unknown[]) {
    this.descriptor.filters.push({ kind: "in", column, values: values ?? [], negate: false });
    return this;
  }

  is(column: string, value: null) {
    this.descriptor.filters.push({ kind: "is", column, value, negate: false });
    return this;
  }

  not(column: string, operator: string, value: unknown) {
    if (operator === "is") {
      this.descriptor.filters.push({ kind: "is", column, value: null, negate: true });
      return this;
    }
    if (operator === "in") {
      const values = typeof value === "string" ? parseInList(value) : Array.isArray(value) ? value : [];
      this.descriptor.filters.push({ kind: "in", column, values, negate: true });
      return this;
    }
    throw new Error(`Unsupported not() operator "${operator}"`);
  }

  or(raw: string) {
    this.descriptor.filters.push({ kind: "or", parts: parseOr(raw) });
    return this;
  }

  ilike(column: string, pattern: string) {
    this.descriptor.filters.push({ kind: "ilike", column, pattern });
    return this;
  }

  contains(column: string, value: unknown) {
    this.descriptor.filters.push({ kind: "contains", column, value });
    return this;
  }

  order(column: string, options?: { ascending?: boolean }) {
    this.descriptor.orders.push({ column, ascending: options?.ascending !== false });
    return this;
  }

  limit(count: number) {
    this.descriptor.limit = count;
    return this;
  }

  single(): Query<T, "one"> {
    this.descriptor.single = true;
    return this as unknown as Query<T, "one">;
  }

  then(
    onfulfilled?: ((value: QueryResult<Selected<T, Mode>>) => unknown) | null,
    onrejected?: ((reason: unknown) => unknown) | null,
  ): Promise<QueryResult<Selected<T, Mode>>> {
    const pending = this.execute(this.descriptor);
    return pending.then(
      onfulfilled as ((value: QueryResult) => unknown) | null | undefined,
      onrejected,
    ) as Promise<QueryResult<Selected<T, Mode>>>;
  }

  private cmp(op: "eq" | "neq" | "gt" | "gte" | "lt" | "lte", column: string, value: unknown) {
    const filter: Filter = { kind: "cmp", op, column, value };
    this.descriptor.filters.push(filter);
    return this;
  }
}
