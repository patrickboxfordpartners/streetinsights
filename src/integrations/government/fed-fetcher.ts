import type { GovernmentEvent, GovernmentEventFetcher } from "./types.js";

const FED_SPEECHES_RSS = "https://www.federalreserve.gov/feeds/speeches.xml";
const FED_PRESS_RSS = "https://www.federalreserve.gov/feeds/press_monetary.xml";
const FOMC_CALENDAR_URL = "https://www.federalreserve.gov/monetarypolicy/fomccalendars.htm";

function parseRssDate(dateStr: string): string {
  const d = new Date(dateStr);
  return isNaN(d.getTime()) ? new Date().toISOString() : d.toISOString();
}

function extractXmlTag(xml: string, tag: string): string {
  const match = xml.match(new RegExp(`<${tag}[^>]*>([\\s\\S]*?)</${tag}>`));
  return match ? match[1].replace(/<!\[CDATA\[([\s\S]*?)\]\]>/g, "$1").trim() : "";
}

function extractItems(xml: string): string[] {
  const items: string[] = [];
  const regex = /<item>([\s\S]*?)<\/item>/g;
  let match;
  while ((match = regex.exec(xml)) !== null) {
    items.push(match[1]);
  }
  return items;
}

async function fetchFedSpeeches(): Promise<GovernmentEvent[]> {
  try {
    const res = await fetch(FED_SPEECHES_RSS, {
      headers: { "User-Agent": "market-signals/1.0" },
    });
    if (!res.ok) return [];
    const xml = await res.text();
    const items = extractItems(xml);

    return items.slice(0, 15).map((item) => {
      const title = extractXmlTag(item, "title");
      const link = extractXmlTag(item, "link");
      const pubDate = extractXmlTag(item, "pubDate");
      const description = extractXmlTag(item, "description");

      const speaker = title.match(/^(.*?)(?:\s*[-:,])/)?.[1] || "";

      return {
        title: title || "Fed Speech",
        description: description.slice(0, 500),
        event_type: "fed_speech" as const,
        source_category: "fed_treasury" as const,
        event_date: parseRssDate(pubDate),
        source_url: link,
        source_feed: "fed_speeches_rss",
        external_id: link || `fed-speech-${pubDate}`,
        participants: speaker ? [speaker] : [],
        related_topics: ["monetary_policy", "interest_rates"],
      };
    });
  } catch (e) {
    console.error("[fed-fetcher] speeches RSS error:", e);
    return [];
  }
}

async function fetchFedPressReleases(): Promise<GovernmentEvent[]> {
  try {
    const res = await fetch(FED_PRESS_RSS, {
      headers: { "User-Agent": "market-signals/1.0" },
    });
    if (!res.ok) return [];
    const xml = await res.text();
    const items = extractItems(xml);

    return items.slice(0, 10).map((item) => {
      const title = extractXmlTag(item, "title");
      const link = extractXmlTag(item, "link");
      const pubDate = extractXmlTag(item, "pubDate");
      const description = extractXmlTag(item, "description");

      const isRate = /rate|funds rate|basis point/i.test(title + description);

      return {
        title,
        description: description.slice(0, 500),
        event_type: isRate ? ("rate_decision" as const) : ("fed_speech" as const),
        source_category: "fed_treasury" as const,
        event_date: parseRssDate(pubDate),
        source_url: link,
        source_feed: "fed_press_rss",
        external_id: link || `fed-press-${pubDate}`,
        related_topics: ["monetary_policy", "interest_rates", "inflation"],
      };
    });
  } catch (e) {
    console.error("[fed-fetcher] press RSS error:", e);
    return [];
  }
}

async function fetchFomcCalendar(): Promise<GovernmentEvent[]> {
  try {
    const res = await fetch(FOMC_CALENDAR_URL, {
      headers: { "User-Agent": "market-signals/1.0" },
    });
    if (!res.ok) return [];
    const html = await res.text();

    const events: GovernmentEvent[] = [];
    const year = new Date().getFullYear();

    // Match patterns like "January 28-29" or "March 18-19*"
    const datePattern = /(January|February|March|April|May|June|July|August|September|October|November|December)\s+(\d{1,2})(?:-(\d{1,2}))?\*?/g;
    let match;
    while ((match = datePattern.exec(html)) !== null) {
      const month = match[1];
      const startDay = match[2];
      const endDay = match[3];

      const startDate = new Date(`${month} ${startDay}, ${year}`);
      if (isNaN(startDate.getTime())) continue;
      // Skip past events
      if (startDate < new Date(Date.now() - 86400000)) continue;

      const endDate = endDay
        ? new Date(`${month} ${endDay}, ${year}`)
        : undefined;

      events.push({
        title: `FOMC Meeting - ${month} ${startDay}${endDay ? `-${endDay}` : ""}, ${year}`,
        description: "Federal Open Market Committee meeting. Rate decision and economic projections may be released.",
        event_type: "fomc_meeting",
        source_category: "fed_treasury",
        event_date: startDate.toISOString(),
        event_end_date: endDate?.toISOString(),
        all_day: true,
        source_url: FOMC_CALENDAR_URL,
        source_feed: "fomc_calendar",
        external_id: `fomc-${year}-${month}-${startDay}`,
        related_topics: ["interest_rates", "monetary_policy", "inflation", "employment"],
      });
    }

    return events;
  } catch (e) {
    console.error("[fed-fetcher] FOMC calendar error:", e);
    return [];
  }
}

export const fedFetcher: GovernmentEventFetcher = {
  name: "Fed/FOMC",
  async fetch() {
    const [speeches, press, fomc] = await Promise.all([
      fetchFedSpeeches(),
      fetchFedPressReleases(),
      fetchFomcCalendar(),
    ]);
    return [...fomc, ...press, ...speeches];
  },
};
