import { createClient } from "./chain.js";
import { executeQuery } from "./execute.js";

export function createDb(connectionString: string | undefined) {
  return createClient((query) => executeQuery(query, connectionString));
}

export const db = createDb(process.env.DATABASE_URL);
