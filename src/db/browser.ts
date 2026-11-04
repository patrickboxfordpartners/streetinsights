import { createClient, type Executor } from "./chain";
import type { QueryDescriptor, QueryResult } from "./types";

const WORKER_URL = import.meta.env.VITE_WORKER_URL || "http://localhost:3001";

let tokenProvider: (() => Promise<string | null>) | null = null;

export function setDbAuthToken(provider: (() => Promise<string | null>) | null) {
  tokenProvider = provider;
}

const execute: Executor = async (query: QueryDescriptor): Promise<QueryResult> => {
  try {
    const token = tokenProvider ? await tokenProvider() : null;
    const response = await fetch(`${WORKER_URL}/api/db`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
      },
      body: JSON.stringify(query),
    });
    const body = await response.json() as QueryResult;
    if (!response.ok && !body.error) {
      return { data: null, error: { message: `Request failed (${response.status})` }, count: null };
    }
    return body;
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    return { data: null, error: { message }, count: null };
  }
};

export const db = createClient(execute);
