# State Sources of Truth

## Persistent State (Supabase Postgres — `xtyfljmwfwhzthwdhkly`)

| State | Table | Owner |
|-------|-------|-------|
| All signal data | tickers, mentions, predictions, validations | worker crons |
| Source credibility scores | sources.credibility_score, accuracy_rate | update-credibility-scores cron |
| ML predictions | model_predictions, model_configs | generate-predictions cron |
| Government events + impact | government_events, event_impact_scores | scan-government-calendar cron |
| User accounts + subscriptions | auth.users, user_profiles (via stripe-webhook) | Supabase Auth + Edge Functions |
| Alert preferences | alert_preferences | user settings page |
| Scan health | scan_log | every cron writes start/complete/error |
| Mention frequency history | mention_frequency | detect-spikes cron |

## Ephemeral State (worker process memory)

| State | Location | TTL |
|-------|----------|-----|
| Quote cache | `quoteCache` in `worker.ts` | 60s |
| pg connection pool | `dbPool` in `worker.ts` | process lifetime (max 5 connections) |

## Client State (React)

| State | Hook / Location | Notes |
|-------|-----------------|-------|
| Auth session | `useAuth()` — Supabase session cookie | persists across refreshes |
| Watchlist | `useWatchlist()` — localStorage | survives page reload, per-browser |
| URL filter state | `useUrlState()` — URL search params | shareable via link |
| Theme | `useTheme()` — localStorage | |
| Sample data toggle | `useSampleData()` — localStorage | onboarding only |

## Edge State (Supabase Edge Functions)

Stripe webhook writes to `user_profiles` table:
- `plan`: starter | pro | enterprise
- `stripe_customer_id`, `stripe_subscription_id`, `subscription_status`

## What Does NOT Have Persistent State

- Debate analysis intermediate steps (bull/bear cases are discarded after prediction is stored)
- LLM responses (not cached in DB, only the final verdict)
- Inngest job intermediate data (Inngest holds this, not Supabase)
