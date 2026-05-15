import type { GovernmentEvent } from "./types.js";
import { fedFetcher } from "./fed-fetcher.js";
import { treasuryFetcher } from "./treasury-fetcher.js";
import { congressFetcher } from "./congress-fetcher.js";

const FETCHERS = [fedFetcher, treasuryFetcher, congressFetcher];

export async function fetchAllGovernmentEvents(): Promise<{
  events: GovernmentEvent[];
  errors: string[];
}> {
  const events: GovernmentEvent[] = [];
  const errors: string[] = [];

  const results = await Promise.allSettled(
    FETCHERS.map((f) =>
      f.fetch().then((evts) => ({ name: f.name, events: evts }))
    )
  );

  for (const result of results) {
    if (result.status === "fulfilled") {
      events.push(...result.value.events);
    } else {
      errors.push(result.reason?.message || "Unknown fetcher error");
    }
  }

  console.log(
    `[gov-aggregator] Fetched ${events.length} events (${errors.length} errors)`
  );

  return { events, errors };
}
