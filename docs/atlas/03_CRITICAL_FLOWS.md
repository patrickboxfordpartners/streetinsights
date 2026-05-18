# Critical Flows

## Flow 1: Mention → Prediction (hourly, `extract-predictions`)

```
src/inngest/functions/extract-predictions.ts
  1. Fetch unprocessed mentions (.eq("processed", false), limit 50)
  2. Fetch ticker symbols for context
  3. Split: shouldRunFullDebate(content) → debate vs quick path

  DEBATE PATH (substantive mentions):
    src/lib/debate-analysis-v2.ts::runDebateAnalysis()
      → runBullResearcher()      [llmClient — Grok → GPT-4 → Claude → Gemini]
      → runBearResearcher()
      → runReasoningManager()    [Claude Sonnet 4.5 + thinking: 10k budget tokens]
        → Anthropic messages.create with thinking enabled
        → Returns DebateVerdict JSON + thinking trace prepended to reasoning

  QUICK PATH (short/low-signal mentions):
    src/lib/debate-analysis-v2.ts::runQuickAnalysis()
      → single llmClient call, returns DebateVerdict

  4. storePrediction() → predictions table
  5. mark mentions processed
  6. high-confidence alert event if confidence_level === "high"
```

## Flow 2: Daily ML Prediction Generation (6 AM, `generate-predictions`)

```
src/inngest/functions/generate-predictions.ts
  1. step.run("mastra-generate-predictions")
       → src/mastra/workflows/generate-predictions.ts::runGeneratePredictionsWorkflow()
           Step: load-config    → Supabase model_configs
           Step: fetch-tickers  → Supabase tickers (is_active: true)
           Step: generate       → extractFeatures() + predict() per ticker × 2 timeframes
                                   extractFeatures calls /api/technicals/:symbol (worker)
           Step: store          → model_predictions upsert
           Step: trigger-alerts → assembles high-confidence list
  2. if high_confidence_predictions → step.sendEvent("ml-predictions/high-confidence")
```

## Flow 3: Prediction Validation + Reasoning Score (9 PM, `validate-predictions`)

```
src/inngest/functions/validate-predictions.ts
  1. Fetch predictions where target_date <= today (limit 100)
  2. Fetch current prices via Alpha Vantage (5 req/min free tier, chunked)
  3. Fetch historical prices via Alpha Vantage TIME_SERIES_DAILY
  4. For each prediction: compute price_change_percent → was_correct → accuracy_score
  5. Insert validations rows
  6. step.run("validate-reasoning"):
       if ANTHROPIC_API_KEY:
         src/lib/reasoning-validator.ts::validateReasoning()
           → classifyReasoning() [Claude Haiku — checkable?]
           → groundClaims()      [Perplexity sonar — optional, needs PERPLEXITY_API_KEY]
           → scoreReasoning()    [Claude Haiku — re-scores quality post-outcome]
         → updates predictions.reasoning_quality_score
```

## Flow 4: User Dashboard Load

```
Browser → app.getstreetinsights.com (Vercel SPA)
  src/main.tsx → src/App.tsx
  AuthProvider (src/hooks/useAuth.tsx)
    → supabase.auth.getSession()
    → if no session → redirect to /login

  Dashboard routes → DashboardLayout
    src/pages/WatchlistOverview.tsx (default /dashboard)
      → supabase.from("tickers").select() + mentions + predictions
      → useWatchlist() hook for persisted watchlist
      → real-time subscription: supabase.channel("predictions-changes")

  Market Ticker (src/components/dashboard/MarketTicker.tsx)
    → fetch(`${VITE_WORKER_URL}/api/quotes?symbols=...`) every 60s
```

## Flow 5: Natural Language Query

```
User on /dashboard/query → src/pages/QuerySignals.tsx
  POST ${VITE_WORKER_URL}/api/query { question }

worker.ts /api/query
  → src/lib/nl-query.ts::naturalLanguageToSQL(question)
      → llmClient.chat() with SCHEMA prompt → SELECT SQL string
  → isSafeQuery(sql) — blocks non-SELECT
  → pg Pool query against Supabase Postgres (SUPABASE_DB_URL, port 6543)
  → src/lib/nl-query.ts::explainSQL() → plain-English explanation
  → returns { sql, results: { rows, columns }, explanation }
```
