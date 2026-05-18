# External Dependencies

## Hosting

| Service | What | Config |
|---------|------|--------|
| Vercel | Frontend SPA | `vercel.json`, env: `VITE_*` |
| Railway | Express worker | `railway.toml`, `Dockerfile`, env: server secrets |
| Supabase | Postgres + Auth + Edge Functions | project `xtyfljmwfwhzthwdhkly` |

## LLM Providers (`src/integrations/llm/client.ts`)

Fallback chain: **Grok → GPT-4o-mini → Claude Haiku → Gemini Flash**

| Provider | Model | Env var | Used for |
|----------|-------|---------|----------|
| xAI Grok | grok-3-latest | `XAI_API_KEY` | Primary LLM (debate, quick analysis) |
| OpenAI | gpt-4o-mini | `OPENAI_API_KEY` | Fallback |
| Anthropic | claude-3-5-haiku | `ANTHROPIC_API_KEY` | Fallback + reasoning validator + ReasoningManager |
| Google | gemini-2.0-flash-exp | `GOOGLE_API_KEY` | Last resort |
| Perplexity | sonar | `PERPLEXITY_API_KEY` | Grounding claims in reasoning validator (optional) |

**Note:** Anthropic SDK is also used directly in `debate-analysis-v2.ts` (ReasoningManager) and `reasoning-validator.ts` — bypasses the failover client.

## Market Data

| Service | Purpose | Env var | Limits |
|---------|---------|---------|--------|
| Yahoo Finance (`yahoo-finance2`) | Live quotes, historical prices (worker) | none | Unofficial, may break |
| Alpha Vantage | Historical prices for validation | `ALPHA_VANTAGE_API_KEY` | 5 req/min, 25/day (free) |
| FMP (Financial Modeling Prep) | Fundamentals | `FMP_API_KEY` | — |

## News / Mentions

| Service | Env var | Priority |
|---------|---------|----------|
| SerpAPI | `SERPAPI_API_KEY` | 1st |
| Tavily | `TAVILY_API_KEY` | 2nd |
| NewsAPI | `NEWS_API_KEY` | 3rd |
| SearXNG | `SEARXNG_BASE_URL` | 4th (self-hosted fallback) |
| Adanos (Reddit + X + News + Polymarket) | `ADANOS_API_KEY` | Parallel sentiment scan |

## Government Data (`src/integrations/government/`)

| Source | Fetcher | Notes |
|--------|---------|-------|
| Fed (FRED) | `fed-fetcher.ts` | FOMC meetings, rate decisions |
| Treasury | `treasury-fetcher.ts` | Auction announcements |
| Congress | `congress-fetcher.ts` | Key votes, hearings |

## Billing

| Service | Where | Env vars |
|---------|-------|---------|
| Stripe | `supabase/functions/stripe-checkout/`, `stripe-webhook/` | `STRIPE_SECRET_KEY`, `VITE_STRIPE_PRICE_*` |

## Notifications

| Channel | Env vars |
|---------|---------|
| Email (Resend) | `RESEND_API_KEY`, `FROM_EMAIL` |
| Telegram | `TELEGRAM_BOT_TOKEN`, `TELEGRAM_CHAT_ID` |
| Discord | `DISCORD_BOT_TOKEN`, `DISCORD_CHANNEL_ID` |
| Slack | `SLACK_BOT_TOKEN`, `SLACK_CHANNEL_ID` |

## Other

| Service | Purpose | Env var |
|---------|---------|---------|
| Inngest | Cron scheduling + durable execution | `INNGEST_EVENT_KEY`, `INNGEST_SIGNING_KEY` |
| Sentry | Error monitoring | `VITE_SENTRY_DSN` |
| Umami | Analytics | embedded script |
| Mastra (`@mastra/core`) | AI workflow framework | none (local) |
