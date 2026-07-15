/**
 * Finnhub company news integration
 * https://finnhub.io/docs/api/company-news
 *
 * Provides ticker-specific news and earnings context to enrich prediction scoring.
 * Key already used in scan-mentions — no new credentials required.
 */

import type { NewsProvider, NewsArticle, NewsSearchOptions } from "./types.js";

interface FinnhubArticle {
  id: number;
  headline: string;
  url: string;
  source: string;
  datetime: number; // Unix timestamp
  summary: string;
  category: string;
}

export class FinnhubNewsProvider implements NewsProvider {
  name = "finnhub";
  private apiKey: string | undefined;

  constructor(apiKey?: string) {
    this.apiKey = apiKey || process.env.FINNHUB_API_KEY;
  }

  isConfigured(): boolean {
    return !!this.apiKey;
  }

  async search(options: NewsSearchOptions): Promise<NewsArticle[]> {
    if (!this.apiKey) {
      throw new Error("Finnhub API key not configured");
    }

    // Extract ticker symbol from query (e.g. "NVDA earnings" → "NVDA")
    const tickerMatch = options.query.match(/\b([A-Z]{1,5})\b/);
    if (!tickerMatch) {
      // Finnhub company-news requires a ticker — skip if no symbol in query
      return [];
    }
    const symbol = tickerMatch[1];

    const today = new Date();
    const from = options.fromDate
      ? options.fromDate.toISOString().split("T")[0]
      : new Date(today.getTime() - 7 * 24 * 60 * 60 * 1000).toISOString().split("T")[0];
    const to = options.toDate
      ? options.toDate.toISOString().split("T")[0]
      : today.toISOString().split("T")[0];

    const response = await fetch(
      `https://finnhub.io/api/v1/company-news?symbol=${symbol}&from=${from}&to=${to}&token=${this.apiKey}`
    );

    if (!response.ok) {
      throw new Error(`Finnhub error: ${response.status} ${response.statusText}`);
    }

    const data = await response.json() as FinnhubArticle[];

    return data
      .slice(0, options.limit || 20)
      .map((item) => ({
        title: item.headline,
        url: item.url,
        source: item.source,
        publishedAt: new Date(item.datetime * 1000).toISOString(),
        summary: item.summary,
        relevanceScore: item.category === "company news" ? 0.9 : 0.75,
      }));
  }
}
