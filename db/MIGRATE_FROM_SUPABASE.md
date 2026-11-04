# Move Street Insights from Supabase to Neon

This repo no longer talks to Supabase. Postgres lives on Neon. The browser never receives the database URL.

Do not run these steps against a database you cannot replace. This repository does not apply the schema or copy rows for you.

## What replaced Supabase

| Supabase | Replacement |
| --- | --- |
| Postgres + anon key | Neon via `DATABASE_URL`. Server code uses `@neondatabase/serverless`. Drizzle schema is `src/db/schema.ts`. |
| Browser queries | `POST /api/db` on the worker. `src/db/guard.ts` allowlists tables and forces user-owned rows to the signed-in Clerk id. |
| Auth | Clerk, already used by the SPA. The worker checks the session with `CLERK_SECRET_KEY`. |
| Stripe edge functions | `POST /api/billing/checkout` and `POST /api/billing/webhook` on the worker. |
| FRED and LLM proxies | `POST /api/fred` and `POST /api/llm` on the worker. |
| Realtime `postgres_changes` | No Neon equivalent. Overview, live signals, and the activity timeline refetch every 30 seconds. |
| Storage | Not used. |
| ReviewSniper project | Optional second Neon database, `REVIEWSNIPER_DATABASE_URL`. The Monday job skips when it is unset. |
| RoundtAIble `debates` | Local `debates` table. It stays empty until you import those rows yourself. |

User ids are Clerk ids (`user_...`), stored as text. Old `auth.users` UUIDs do not match. Do not load `user_profiles`, `user_watchlist`, `user_ticker_tracking`, `alert_preferences`, `alert_log`, or `source_follows` from the Supabase dump unless you map each UUID to a Clerk id by hand.

## 1. Create the Neon database

Create an empty Neon project and copy its connection string into `DATABASE_URL` in your shell. Prefer the pooled host for the running worker. Use the direct host if a tool you run locally needs it. Do not commit the URL.

Apply the schema:

```bash
psql "$DATABASE_URL" -v ON_ERROR_STOP=1 -f db/migrations/0001_init.sql
```

`npm run db:generate` writes Drizzle kit output under `db/drizzle/`. The SQL file above is the migration to apply. Do not run `npm run db:migrate` until you have reviewed that output against `0001_init.sql`.

The HTTP driver cannot set `statement_timeout` per query. In the Neon console, set a statement timeout (15 seconds is enough for the interactive SQL page) so one natural-language query cannot run forever.

## 2. Copy market data

`scripts/export-import.sh` reads `SOURCE_DATABASE_URL` (the old Postgres URL) and `DATABASE_URL` (Neon). It never prints either URL.

```bash
export SOURCE_DATABASE_URL="postgresql://..."
export DATABASE_URL="postgresql://..."
bash scripts/export-import.sh
```

The script dumps market tables only, applies `0001_init.sql` if you pass `--apply-schema`, then loads the dump in one session with triggers paused. If `debates` does not exist on the source, delete that name from the table list in the script and run it again.

Review the dump file before loading it. Delete the dump when you are done. It contains market content, not secrets from this repo, but it is still your data.

## 3. Point Stripe at the worker

In the Stripe dashboard, set the webhook endpoint to:

```text
https://<worker-host>/api/billing/webhook
```

The live worker host in `.env.example` is `https://streetinsights-worker.fly.dev`. Subscribe to `checkout.session.completed`, `customer.subscription.updated`, and `customer.subscription.deleted`.

Checkout metadata now stores `clerk_user_id`. The webhook still reads a legacy `supabase_user_id` if that is the only id on an old subscription.

## Environment variables

Set these before the new worker and the Vercel build serve traffic. Values stay in the host dashboards. Do not paste them into git.

### Required for the app to boot

| Variable | Where | Purpose |
| --- | --- | --- |
| `DATABASE_URL` | Worker | Neon connection string. Replaces `SUPABASE_DB_URL`, `VITE_SUPABASE_URL`, and `VITE_SUPABASE_ANON_KEY`. |
| `VITE_CLERK_PUBLISHABLE_KEY` | Vercel build | Clerk frontend. `src/main.tsx` throws if it is missing. |
| `CLERK_SECRET_KEY` | Worker | Verifies browser session tokens and reads the email for Stripe customers. |
| `VITE_WORKER_URL` | Vercel build | Browser API base. Example: `https://streetinsights-worker.fly.dev`. |

### Required for billing

| Variable | Where | Purpose |
| --- | --- | --- |
| `STRIPE_SECRET_KEY` | Worker | Checkout and webhook. |
| `STRIPE_WEBHOOK_SECRET` | Worker | Signature check on `/api/billing/webhook`. |
| `VITE_STRIPE_PRICE_PRO_MONTHLY` | Vercel build | Price id the pricing page sends. |
| `VITE_STRIPE_PRICE_PRO_YEARLY` | Vercel build | Price id. |
| `VITE_STRIPE_PRICE_ENTERPRISE_MONTHLY` | Vercel build | Price id. |
| `VITE_STRIPE_PRICE_ENTERPRISE_YEARLY` | Vercel build | Price id. |

The worker also reads `STRIPE_PRICE_PRO_MONTHLY`, `STRIPE_PRICE_PRO_YEARLY`, `STRIPE_PRICE_ENTERPRISE_MONTHLY`, and `STRIPE_PRICE_ENTERPRISE_YEARLY` when those names are set on the worker. If they are absent, it uses the `VITE_STRIPE_PRICE_*` values above to map a paid checkout back to `pro` or `enterprise`.

### Required for data feeds you still want

| Variable | Where | Purpose |
| --- | --- | --- |
| `FRED_API_KEY` | Worker | `/api/fred` and server-side macro context. |
| `XAI_API_KEY` or `AI_PROXY_KEY` + `AI_PROXY_BASE` | Worker | First LLM provider. |
| `OPENAI_API_KEY` | Worker | LLM fallback. |
| `ANTHROPIC_API_KEY` | Worker | LLM fallback. |
| `GOOGLE_API_KEY` | Worker | LLM fallback. |

### Optional

| Variable | Where | Purpose |
| --- | --- | --- |
| `REVIEWSNIPER_DATABASE_URL` | Worker | Neon URL for the ReviewSniper database. Unset skips the Monday roundup. Replaces `REVIEWSNIPER_SUPABASE_URL` and `REVIEWSNIPER_SUPABASE_SERVICE_KEY`. |
| `SOURCE_DATABASE_URL` | Your laptop only | Old database URL for `scripts/export-import.sh`. Not read by the app. |

### Remove

Do not set these anymore: `VITE_SUPABASE_URL`, `VITE_SUPABASE_ANON_KEY`, `SUPABASE_DB_URL`, `SUPABASE_SERVICE_ROLE_KEY`, `SUPABASE_URL`, `SUPABASE_ANON_KEY`, `REVIEWSNIPER_SUPABASE_URL`, `REVIEWSNIPER_SUPABASE_SERVICE_KEY`.

Keep the existing worker secrets that are unrelated to Supabase: `MCP_API_KEY`, Inngest keys, Postmark or Resend, news keys, Alpha Vantage, FMP, Adanos, Twitter, Reddit, Telegram, Discord, Slack, `VIBE_*`, `WORKER_HOST` or `RAILWAY_PUBLIC_DOMAIN`, and Sentry.

If the worker origin is not `https://streetinsights-worker.fly.dev`, add that origin to `connect-src` in `vercel.json` before deploying the frontend.

## Deploy order

1. Create Neon and apply `0001_init.sql`.
2. Load market data if you want history.
3. Set the worker env vars and deploy the worker.
4. Point the Stripe webhook at the worker.
5. Set the Vercel env vars and deploy the frontend.

Shipping this frontend also ships the Clerk login that is already on `main`. The September 30, 2026 production build does not include Clerk or `/terms` yet.
