/**
 * Enhanced scan-mentions with multi-source news aggregator
 * Replaces direct NewsAPI calls with fallback chain: SerpAPI → Tavily → NewsAPI → SearXNG
 */

import { inngest } from "../client.js";
import { supabase } from "../../integrations/supabase/client.js";
import { newsAggregator } from "../../integrations/news/index.js";

// Re-import existing types and logic from scan-mentions.ts
interface TwitterMention {
  id: string;
  text: string;
  author: { username: string; name: string; followers_count: number };
  created_at: string;
  public_metrics: { like_count: number; retweet_count: number; reply_count: number };
}

interface RedditMention {
  id: string;
  title?: string;
  body: string;
  author: string;
  created_utc: number;
  score: number;
  permalink: string;
}

const TWITTER_BEARER_TOKEN = process.env.TWITTER_BEARER_TOKEN;
const REDDIT_CLIENT_ID = process.env.REDDIT_CLIENT_ID;
const REDDIT_CLIENT_SECRET = process.env.REDDIT_CLIENT_SECRET;
const FINNHUB_API_KEY = process.env.FINNHUB_API_KEY;
const ALPHA_VANTAGE_API_KEY = process.env.ALPHA_VANTAGE_API_KEY;

// Ticker extraction helpers
const CASHTAG_REGEX = /\$([A-Z]{1,5})(?![a-z])/g;
const AMBIGUOUS_TICKERS = new Set([
  "A", "I", "IT", "ALL", "FOR", "NOW", "ON", "AT", "DO", "GO", "SO",
  "AN", "ARE", "BE", "CAN", "HAS", "HE", "HIM", "HIS", "HOW", "IF",
  "IS", "MAN", "NEW", "OLD", "ONE", "OR", "OUT", "RUN", "SAY", "SHE",
  "TWO", "WAR", "BIG", "LOW", "ODD", "ANY", "SEE", "WELL", "GOOD",
  "BEST", "FAST", "REAL", "PLAY", "OPEN", "TURN", "PEAK", "TRUE",
]);

function extractTickers(text: string, validSymbols: string[]): string[] {
  const found = new Set<string>();

  // First pass: cashtag matches
  let match;
  while ((match = CASHTAG_REGEX.exec(text)) !== null) {
    const symbol = match[1].toUpperCase();
    if (validSymbols.includes(symbol)) {
      found.add(symbol);
    }
  }
  CASHTAG_REGEX.lastIndex = 0;

  // Second pass: plain uppercase words (skip ambiguous)
  const wordRegex = /\b([A-Z]{2,5})\b/g;
  while ((match = wordRegex.exec(text)) !== null) {
    const symbol = match[1];
    if (validSymbols.includes(symbol) && !AMBIGUOUS_TICKERS.has(symbol)) {
      found.add(symbol);
    }
  }

  return [...found];
}

export const scanMentionsV2 = inngest.createFunction(
  {
    id: "scan-mentions-v2",
    name: "Scan social media for ticker mentions (multi-source news)",
    triggers: [{ cron: "*/15 * * * *" }],
  },
  async ({ step }) => {
    // Get active tickers
    const activeTickers = await step.run("fetch-active-tickers", async () => {
      const { data, error } = await supabase
        .from("tickers")
        .select("id, symbol")
        .eq("is_active", true);

      if (error) throw error;
      return data || [];
    });

    if (activeTickers.length === 0) {
      return { message: "No active tickers to scan" };
    }

    const tickerSymbols = activeTickers.map((t) => t.symbol);

    // Twitter mentions (Pro tier required)
    const twitterMentions: TwitterMention[] = [];

    // StockTwits (existing logic - keep as-is)
    const stockTwitsMentions = await step.run("scan-stocktwits", async () => {
      const messages: any[] = [];
      const priorityTickers = tickerSymbols.slice(0, 20);

      for (const symbol of priorityTickers) {
        try {
          const response = await fetch(
            `https://api.stocktwits.com/api/2/streams/symbol/${symbol}.json?limit=30`,
            { headers: { "User-Agent": "market-signals/1.0" } }
          );

          if (!response.ok) {
            if (response.status === 429) break;
            continue;
          }

          const data = await response.json();
          if (data.messages) {
            for (const msg of data.messages) {
              messages.push({ ...msg, symbols: msg.symbols || [{ symbol }] });
            }
          }

          await new Promise((resolve) => setTimeout(resolve, 500));
        } catch (error) {
          console.error(`StockTwits error for ${symbol}:`, error);
        }
      }

      return messages;
    });

    // Reddit (existing logic - keep as-is)
    const redditMentions = await step.run("scan-reddit", async () => {
      if (!REDDIT_CLIENT_ID || !REDDIT_CLIENT_SECRET) {
        console.warn("Reddit credentials not configured");
        return [];
      }

      const tokenResponse = await fetch("https://www.reddit.com/api/v1/access_token", {
        method: "POST",
        headers: {
          "Content-Type": "application/x-www-form-urlencoded",
          Authorization: `Basic ${btoa(`${REDDIT_CLIENT_ID}:${REDDIT_CLIENT_SECRET}`)}`,
        },
        body: "grant_type=client_credentials",
      });

      if (!tokenResponse.ok) {
        console.error("Reddit auth failed");
        return [];
      }

      const { access_token } = await tokenResponse.json();
      const mentions: RedditMention[] = [];
      const subreddits = ["stocks", "investing", "wallstreetbets", "StockMarket"];

      const chunkSize = 15;
      const tickerChunks = [];
      for (let i = 0; i < tickerSymbols.length; i += chunkSize) {
        tickerChunks.push(tickerSymbols.slice(i, i + chunkSize));
      }

      for (const subreddit of subreddits) {
        for (const chunk of tickerChunks) {
          try {
            const response = await fetch(
              `https://oauth.reddit.com/r/${subreddit}/search?q=${encodeURIComponent(chunk.join(" OR "))}&limit=25&restrict_sr=1&sort=new`,
              {
                headers: {
                  Authorization: `Bearer ${access_token}`,
                  "User-Agent": "market-signals/1.0",
                },
              }
            );

            if (!response.ok) continue;

            const data = await response.json();
            if (data.data?.children) {
              mentions.push(...data.data.children.map((child: any) => child.data));
            }

            await new Promise((resolve) => setTimeout(resolve, 1000));
          } catch (error) {
            console.error(`Error scanning Reddit r/${subreddit}:`, error);
          }
        }
      }

      return mentions;
    });

    // 🆕 Multi-source news with automatic fallback
    const newsArticles = await step.run("scan-news-aggregated", async () => {
      const articles: any[] = [];

      const popularTickers = ["NVDA", "TSLA", "AAPL", "MSFT", "GOOGL", "META", "AMD", "COIN", "PLTR", "GME"];
      const tickersToQuery = tickerSymbols.filter((s) => popularTickers.includes(s)).slice(0, 5);

      const yesterday = new Date();
      yesterday.setDate(yesterday.getDate() - 1);

      for (const symbol of tickersToQuery) {
        try {
          const result = await newsAggregator.search({
            query: `${symbol} stock`,
            limit: 5,
            fromDate: yesterday,
          });

          console.log(`[scan-news] ${symbol}: ${result.articles.length} articles from ${result.provider}`);

          // Convert to scan-mentions format
          for (const article of result.articles) {
            articles.push({
              source: { name: article.source },
              title: article.title,
              description: article.summary,
              url: article.url,
              publishedAt: article.publishedAt,
              content: article.content || article.summary,
            });
          }

          // Rate limit between tickers
          await new Promise((resolve) => setTimeout(resolve, 500));
        } catch (error: any) {
          console.error(`News aggregator error for ${symbol}:`, error.message);
          // Continue with next ticker - don't fail the whole function
        }
      }

      return articles;
    });

    // Finnhub (existing logic - keep as-is)
    const finnhubArticles = await step.run("scan-finnhub", async () => {
      if (!FINNHUB_API_KEY) {
        console.warn("Finnhub API key not configured");
        return [];
      }

      const articles: any[] = [];
      const today = new Date();
      const yesterday = new Date(today);
      yesterday.setDate(yesterday.getDate() - 1);
      const from = yesterday.toISOString().split("T")[0];
      const to = today.toISOString().split("T")[0];

      for (const symbol of tickerSymbols) {
        try {
          const response = await fetch(
            `https://finnhub.io/api/v1/company-news?symbol=${symbol}&from=${from}&to=${to}&token=${FINNHUB_API_KEY}`
          );

          if (!response.ok) {
            console.error(`Finnhub error for ${symbol}:`, response.status);
            continue;
          }

          const data: any[] = await response.json();
          for (const article of data.slice(0, 10)) {
            if (!article.related) article.related = symbol;
            articles.push(article);
          }

          await new Promise((resolve) => setTimeout(resolve, 200));
        } catch (error) {
          console.error(`Error fetching Finnhub news for ${symbol}:`, error);
        }
      }

      return articles;
    });

    // Alpha Vantage (existing logic - keep as-is)
    const avArticles = await step.run("scan-alpha-vantage-news", async () => {
      if (!ALPHA_VANTAGE_API_KEY) {
        console.warn("Alpha Vantage API key not configured");
        return [];
      }

      const articles: any[] = [];
      const chunks: string[][] = [];
      for (let i = 0; i < tickerSymbols.length; i += 5) {
        chunks.push(tickerSymbols.slice(i, i + 5));
      }

      for (const chunk of chunks.slice(0, 3)) {
        try {
          const tickers = chunk.join(",");
          const response = await fetch(
            `https://www.alphavantage.co/query?function=NEWS_SENTIMENT&tickers=${tickers}&limit=10&apikey=${ALPHA_VANTAGE_API_KEY}`
          );

          if (!response.ok) {
            console.error("AV News Sentiment error:", response.status);
            continue;
          }

          const data = await response.json();
          if (data.feed) {
            articles.push(...data.feed);
          }

          await new Promise((resolve) => setTimeout(resolve, 15000));
        } catch (error) {
          console.error("Error fetching AV news sentiment:", error);
        }
      }

      return articles;
    });

    // Store mentions in database
    const stored = await step.run("store-mentions", async () => {
      const mentionsToStore: Array<{
        ticker_id: string;
        source_id: string;
        content: string;
        url: string;
        platform: string;
        mentioned_at: string;
        engagement_score: number;
      }> = [];

      // Batch-resolve sources to avoid N+1
      const sourceKeys = new Set<string>();
      for (const msg of stockTwitsMentions) sourceKeys.add(`stocktwits:${msg.user?.username || "unknown"}`);
      for (const post of redditMentions)    sourceKeys.add(`reddit:${post.author || "unknown"}`);
      for (const a of newsArticles)         sourceKeys.add(`news:${a.source?.name || "unknown"}`);
      for (const a of finnhubArticles)      sourceKeys.add(`finnhub:${a.source || "unknown"}`);
      for (const a of avArticles)           sourceKeys.add(`alphavantage:${a.source || "unknown"}`);

      const platformUsernames = [...sourceKeys].map(k => {
        const [platform, ...rest] = k.split(":");
        return { platform, username: rest.join(":") };
      });

      const sourceMap = new Map<string, string>();
      if (platformUsernames.length > 0) {
        const { data: existing } = await supabase
          .from("sources")
          .select("id, platform, username")
          .in("platform", [...new Set(platformUsernames.map(s => s.platform))])
          .in("username", [...new Set(platformUsernames.map(s => s.username))]);
        for (const s of existing || []) sourceMap.set(`${s.platform}:${s.username}`, s.id);

        const missing = platformUsernames.filter(s => !sourceMap.has(`${s.platform}:${s.username}`));
        if (missing.length > 0) {
          const { data: created } = await supabase
            .from("sources")
            .upsert(missing.map(s => ({
              name: s.username,
              platform: s.platform,
              username: s.username,
              source_type: s.platform === "news" || s.platform === "finnhub" || s.platform === "alphavantage"
                ? "publication" : "individual",
              follower_count: 0,
            })), { onConflict: "platform,username" })
            .select("id, platform, username");
          for (const s of created || []) sourceMap.set(`${s.platform}:${s.username}`, s.id);
        }
      }

      // StockTwits
      for (const msg of stockTwitsMentions) {
        const tickers = extractTickers(msg.body || "", tickerSymbols);
        for (const symbol of tickers) {
          const ticker = activeTickers.find(t => t.symbol === symbol);
          const sourceId = sourceMap.get(`stocktwits:${msg.user?.username || "unknown"}`);
          if (!ticker || !sourceId) continue;
          mentionsToStore.push({
            ticker_id: ticker.id,
            source_id: sourceId,
            content: msg.body || "",
            url: `https://stocktwits.com/${msg.user?.username}/message/${msg.id}`,
            platform: "stocktwits",
            mentioned_at: msg.created_at || new Date().toISOString(),
            engagement_score: (msg.likes?.total || 0) + (msg.reshares_count || 0) * 2,
          });
        }
      }

      // Reddit
      for (const post of redditMentions) {
        const text = `${post.title || ""} ${post.selftext || ""}`;
        const tickers = extractTickers(text, tickerSymbols);
        for (const symbol of tickers) {
          const ticker = activeTickers.find(t => t.symbol === symbol);
          const sourceId = sourceMap.get(`reddit:${post.author || "unknown"}`);
          if (!ticker || !sourceId) continue;
          mentionsToStore.push({
            ticker_id: ticker.id,
            source_id: sourceId,
            content: text.slice(0, 2000),
            url: `https://reddit.com${post.permalink || ""}`,
            platform: "reddit",
            mentioned_at: post.created_utc
              ? new Date(post.created_utc * 1000).toISOString()
              : new Date().toISOString(),
            engagement_score: (post.score || 0) + (post.num_comments || 0) * 3,
          });
        }
      }

      // News (aggregated — already symbol-targeted, so all articles are relevant)
      for (const article of newsArticles) {
        const sourceName = article.source?.name || "unknown";
        const sourceId = sourceMap.get(`news:${sourceName}`);
        const tickers = extractTickers(`${article.title} ${article.description || ""}`, tickerSymbols);
        for (const symbol of tickers) {
          const ticker = activeTickers.find(t => t.symbol === symbol);
          if (!ticker || !sourceId) continue;
          mentionsToStore.push({
            ticker_id: ticker.id,
            source_id: sourceId,
            content: `${article.title}. ${article.description || ""}`.slice(0, 2000),
            url: article.url || "",
            platform: "news",
            mentioned_at: article.publishedAt || new Date().toISOString(),
            engagement_score: 10,
          });
        }
      }

      // Finnhub
      for (const article of finnhubArticles) {
        const sourceId = sourceMap.get(`finnhub:${article.source || "unknown"}`);
        const symbol = article.related || "";
        const ticker = activeTickers.find(t => t.symbol === symbol);
        if (!ticker || !sourceId) continue;
        mentionsToStore.push({
          ticker_id: ticker.id,
          source_id: sourceId,
          content: `${article.headline}. ${article.summary || ""}`.slice(0, 2000),
          url: article.url || "",
          platform: "finnhub",
          mentioned_at: article.datetime
            ? new Date(article.datetime * 1000).toISOString()
            : new Date().toISOString(),
          engagement_score: 0,
        });
      }

      // Alpha Vantage
      for (const article of avArticles) {
        const sourceName = article.source || "alphavantage";
        const sourceId = sourceMap.get(`alphavantage:${sourceName}`);
        const tickerSentiments: any[] = article.ticker_sentiment || [];
        for (const ts of tickerSentiments) {
          const symbol = ts.ticker;
          const ticker = activeTickers.find(t => t.symbol === symbol);
          if (!ticker || !sourceId) continue;
          mentionsToStore.push({
            ticker_id: ticker.id,
            source_id: sourceId,
            content: `${article.title}. ${article.summary || ""}`.slice(0, 2000),
            url: article.url || "",
            platform: "alphavantage",
            mentioned_at: article.time_published
              ? new Date(article.time_published).toISOString()
              : new Date().toISOString(),
            engagement_score: Math.round(parseFloat(ts.relevance_score || "0") * 100),
          });
        }
      }

      if (mentionsToStore.length > 0) {
        const { error } = await supabase.from("mentions").insert(mentionsToStore);
        if (error && error.code !== "23505") {
          console.error("Error storing mentions:", error);
          return { stored: 0 };
        }
        return { stored: mentionsToStore.length };
      }
      return { stored: 0 };
    });

    // Log scan results for gap detection
    await step.run("log-scan-results", async () => {
      const logs = [
        { scan_type: "stocktwits", status: "success", mentions_found: stockTwitsMentions.length, error_message: null, completed_at: new Date().toISOString() },
        { scan_type: "reddit", status: !REDDIT_CLIENT_ID ? "skipped" : "success", mentions_found: redditMentions.length, error_message: !REDDIT_CLIENT_ID ? "Reddit credentials not configured" : null, completed_at: new Date().toISOString() },
        { scan_type: "news-aggregated", status: "success", mentions_found: newsArticles.length, error_message: null, completed_at: new Date().toISOString() },
        { scan_type: "finnhub", status: !FINNHUB_API_KEY ? "skipped" : "success", mentions_found: finnhubArticles.length, error_message: !FINNHUB_API_KEY ? "Finnhub key not configured" : null, completed_at: new Date().toISOString() },
        { scan_type: "alphavantage", status: !ALPHA_VANTAGE_API_KEY ? "skipped" : "success", mentions_found: avArticles.length, error_message: !ALPHA_VANTAGE_API_KEY ? "Alpha Vantage key not configured" : null, completed_at: new Date().toISOString() },
      ];
      await supabase.from("scan_log").insert(logs);
    });

    return {
      tickers_scanned: tickerSymbols.length,
      twitter_mentions: twitterMentions.length,
      stocktwits_mentions: stockTwitsMentions.length,
      reddit_mentions: redditMentions.length,
      news_articles: newsArticles.length,
      finnhub_articles: finnhubArticles.length,
      av_articles: avArticles.length,
      stored: stored.stored,
    };
  }
);
