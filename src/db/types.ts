export type Filter =
  | { kind: "cmp"; op: "eq" | "neq" | "gt" | "gte" | "lt" | "lte"; column: string; value: unknown }
  | { kind: "in"; column: string; values: unknown[]; negate: boolean }
  | { kind: "is"; column: string; value: null; negate: boolean }
  | { kind: "ilike"; column: string; pattern: string }
  | { kind: "contains"; column: string; value: unknown }
  | { kind: "or"; parts: OrPart[] };

export interface OrPart {
  column: string;
  op: "eq" | "neq" | "gt" | "gte" | "lt" | "lte" | "ilike" | "is";
  value: unknown;
}

export interface SelectField {
  column?: string;
  relation?: string;
  inner?: boolean;
  children?: SelectField[];
}

export interface QueryDescriptor {
  table: string;
  action: "select" | "insert" | "update" | "delete" | "upsert";
  fields: SelectField[];
  countExact: boolean;
  head: boolean;
  filters: Filter[];
  orders: { column: string; ascending: boolean }[];
  limit?: number;
  single: boolean;
  payload?: unknown;
  onConflict?: string;
  ignoreDuplicates?: boolean;
}

export interface QueryResult<T = unknown> {
  data: T;
  error: { message: string; code?: string } | null;
  count: number | null;
}
