# Architecture

## Deployment Topology

```
Browser
  └── Vercel (app.getstreetinsights.com)
        └── Vite SPA (src/main.tsx → src/App.tsx)
              └── Direct Supabase calls (anon key, RLS)

Railway (worker-production-c529.up.railway.app)
  └── worker.ts (Express server, port 3001/PORT)
        ├── /api/inngest     — Inngest function host
        ├── /api/quotes      — Yahoo Finance proxy (cached 60s)
        ├── /api/query       — Natural language → SQL (pg + LLM)
        ├── /api/backtest    — Strategy backtest (Yahoo Finance)
        ├── /api/technicals/:symbol — Technical indicators
        ├── /api/swarm/run   — Trigger swarm sentiment
        ├── /mcp             — MCP server (9 tools, bearer auth)
        └── /docs/:slug      — Markdown docs for agents

Supabase (xtyfljmwfwhzthwdhkly)
  └── PostgreSQL (schema in supabase-schema.sql + migrations/)
  └── Edge Functions (stripe-checkout, stripe-webhook)
  └── Auth (email, no email confirmation)

Inngest Cloud
  └── Receives events from worker /api/inngest
  └── Schedules and retries cron functions
```

## Same-Repo Dual Deployment

**Why:** Vercel cannot run persistent processes or crons. Railway runs the long-lived Express worker.

**Vercel build:** `tsc -b && vite build` → static HTML/JS/CSS from `src/`

**Railway build:** `Dockerfile` → `tsx worker.ts` via `npm run worker`

Both deployments read from the same Supabase instance. The frontend calls Supabase directly using the anon key + RLS. The worker uses the same anon key but also has `SUPABASE_DB_URL` for direct Postgres access (NL query endpoint).

## Module Boundaries

```
src/integrations/   ← all external I/O (Supabase, LLM, news, gov APIs)
src/lib/            ← pure logic (no I/O): ML model, indicators, NL query, reasoning validator
src/inngest/        ← orchestration: schedules, retries, event flow
src/mastra/         ← AI workflow definitions (called from Inngest)
src/mcp/            ← MCP server (calls Supabase via integration client)
src/pages/          ← React pages (call Supabase directly via hooks)
src/hooks/          ← shared React state (auth, data, URL params)
```

**Key invariant:** `src/lib/` files must not import from `src/inngest/` or `src/pages/`. They are pure functions usable in any context.

## Data Flow: Prediction Pipeline

```
scan-mentions (every 15min)
  → mentions table

extract-predictions (hourly)
  → debate-analysis-v2.ts (Bull → Bear → ReasoningManager w/ Claude thinking)
  → predictions table

generate-predictions (6 AM daily)
  → ml-features.ts (Supabase + /api/technicals) + ml-model.ts
  → Mastra workflow (5 typed steps)
  → model_predictions table

validate-predictions (9 PM daily)
  → Alpha Vantage price comparison
  → validations table
  → reasoning-validator.ts (Perplexity + Claude Haiku)
  → updates predictions.reasoning_quality_score
```
