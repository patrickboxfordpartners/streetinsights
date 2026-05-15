import type { GovernmentEvent, GovernmentEventFetcher } from "./types.js";

const CONGRESS_API_KEY = process.env.CONGRESS_API_KEY || "";
const CONGRESS_API_BASE = "https://api.congress.gov/v3";

// Key committees that move markets
const MARKET_COMMITTEES = [
  { chamber: "senate", code: "SSBK", name: "Senate Banking" },
  { chamber: "senate", code: "SSFI", name: "Senate Finance" },
  { chamber: "house", code: "HSBA", name: "House Financial Services" },
  { chamber: "house", code: "HSWM", name: "House Ways and Means" },
  { chamber: "senate", code: "SSCM", name: "Senate Commerce" },
  { chamber: "house", code: "HSIF", name: "House Energy and Commerce" },
];

const TOPIC_KEYWORDS: Record<string, string[]> = {
  interest_rates: ["interest rate", "fed", "monetary", "inflation"],
  tech_regulation: ["big tech", "antitrust", "ai", "data privacy", "algorithm"],
  banking: ["bank", "credit", "lending", "capital requirement"],
  crypto: ["crypto", "digital asset", "stablecoin", "bitcoin", "blockchain"],
  trade: ["tariff", "trade", "import", "export", "china"],
  defense: ["defense", "military", "pentagon", "arms"],
  healthcare: ["pharma", "drug pricing", "medicare", "health"],
  energy: ["oil", "gas", "renewable", "climate", "carbon"],
};

function detectTopics(text: string): string[] {
  const lower = text.toLowerCase();
  const topics: string[] = [];
  for (const [topic, keywords] of Object.entries(TOPIC_KEYWORDS)) {
    if (keywords.some((k) => lower.includes(k))) {
      topics.push(topic);
    }
  }
  return topics;
}

async function fetchCommitteeHearings(): Promise<GovernmentEvent[]> {
  if (!CONGRESS_API_KEY) {
    console.warn("[congress-fetcher] CONGRESS_API_KEY not set, skipping");
    return [];
  }

  const events: GovernmentEvent[] = [];
  const today = new Date().toISOString().split("T")[0];

  for (const committee of MARKET_COMMITTEES) {
    try {
      const url = `${CONGRESS_API_BASE}/committee/${committee.chamber}/${committee.code}/hearings?api_key=${CONGRESS_API_KEY}&fromDateTime=${today}T00:00:00Z&limit=10&format=json`;
      const res = await fetch(url, {
        headers: { "User-Agent": "market-signals/1.0" },
      });

      if (!res.ok) continue;
      const data = await res.json();
      const hearings = data.hearings || [];

      for (const hearing of hearings) {
        const title = hearing.title || hearing.description || `${committee.name} Hearing`;
        const date = hearing.date || hearing.updateDate;
        if (!date) continue;

        events.push({
          title: `${committee.name}: ${title}`.slice(0, 200),
          description: hearing.description?.slice(0, 500),
          event_type: "congressional_hearing",
          source_category: "white_house_congress",
          event_date: new Date(date).toISOString(),
          all_day: true,
          source_url: hearing.url || `https://www.congress.gov/committee/${committee.chamber}-${committee.code}`,
          source_feed: `congress_${committee.code}`,
          external_id: `hearing-${committee.code}-${date}-${(hearing.number || hearing.jacketNumber || title.slice(0, 20))}`,
          participants: hearing.witnesses?.map((w: any) => w.name) || [],
          related_topics: detectTopics(title + " " + (hearing.description || "")),
        });
      }

      await new Promise((r) => setTimeout(r, 500));
    } catch (e) {
      console.error(`[congress-fetcher] ${committee.name} error:`, e);
    }
  }

  return events;
}

async function fetchUpcomingBillVotes(): Promise<GovernmentEvent[]> {
  if (!CONGRESS_API_KEY) return [];

  try {
    const congress = 119; // 2025-2027
    const url = `${CONGRESS_API_BASE}/bill/${congress}?api_key=${CONGRESS_API_KEY}&sort=updateDate+desc&limit=20&format=json`;
    const res = await fetch(url, {
      headers: { "User-Agent": "market-signals/1.0" },
    });
    if (!res.ok) return [];

    const data = await res.json();
    const bills = data.bills || [];

    return bills
      .filter((b: any) => {
        const action = b.latestAction?.text || "";
        return /passed|vote|cloture|floor/i.test(action);
      })
      .slice(0, 10)
      .map((b: any) => ({
        title: `Bill Vote: ${b.title || b.number}`.slice(0, 200),
        description: `${b.number} - ${b.title}. Latest action: ${b.latestAction?.text || "Unknown"}`.slice(0, 500),
        event_type: "bill_vote" as const,
        source_category: "white_house_congress" as const,
        event_date: new Date(b.latestAction?.actionDate || b.updateDate).toISOString(),
        source_url: b.url || `https://www.congress.gov/bill/${congress}th-congress/${b.type?.toLowerCase()}-bill/${b.number}`,
        source_feed: "congress_bills_api",
        external_id: `bill-${b.congress}-${b.type}-${b.number}`,
        related_topics: detectTopics(b.title || ""),
      }));
  } catch (e) {
    console.error("[congress-fetcher] bills error:", e);
    return [];
  }
}

export const congressFetcher: GovernmentEventFetcher = {
  name: "Congress",
  async fetch() {
    const [hearings, bills] = await Promise.all([
      fetchCommitteeHearings(),
      fetchUpcomingBillVotes(),
    ]);
    return [...hearings, ...bills];
  },
};
