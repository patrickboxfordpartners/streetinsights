# Gotchas

Real bugs and footguns found in this codebase. Read before touching Danger Zones.

## 1. DOCS_DIR must be at module top-level in worker.ts

**What happened:** Declaring `const DOCS_DIR = join(__dirname, "docs")` between route registrations caused all Express routes registered after that line to silently fail with 404. The tsx compiler has issues with `const` declarations interleaved with `app.get()` calls.

**Fix:** `DOCS_DIR` must be defined at the top of `worker.ts` before any route registration.

**Files:** `worker.ts` lines 15-18

## 2. Inngest function must be exported from index.ts to be scheduled

**What happened:** A function added to `src/inngest/functions/` but not exported from `src/inngest/functions/index.ts` simply never ran. No error, no warning — Inngest just didn't know it existed.

**Fix:** Every new Inngest function needs a named export in `src/inngest/functions/index.ts`.

## 3. generate-predictions naming collision (fixed 2026-04-30)

**What happened:** `generate-predictions.ts` had a variable `activeConfig` from `step.run()` shadowing the `defaultConfig` import alias. Fixed by renaming the import.

**Current state:** Import is `DEFAULT_MODEL_CONFIG as defaultConfig`. The Mastra workflow now owns the config loading — this risk is lower.

## 4. debate-analysis-v2.ts has @ts-nocheck

**What happened:** The file was migrated from debate-analysis.ts with a quick `// @ts-nocheck` to suppress type errors. TypeScript silently ignores all type errors in this file.

**Risk:** Adding new code here can introduce runtime type mismatches that only surface in production.

**Mitigation:** Manually test any changes to this file. Consider removing `@ts-nocheck` as a future cleanup.

**File:** `src/lib/debate-analysis-v2.ts` line 8

## 5. Alpha Vantage rate limits: 5 req/min, 25/day (free tier)

**What happened:** `validate-predictions.ts` fetches prices in chunks of 5 with 12.5s delays to stay under the 5 req/min limit. If you add more tickers or shrink the delay, you'll hit `{ "Note": "Thank you for using Alpha Vantage!" }` responses which silently return no data.

**Pattern:** The worker always checks `if (data["Error Message"])` and `if (!timeSeries)` before using Alpha Vantage responses.

**Files:** `src/inngest/functions/validate-predictions.ts`

## 6. Mastra workflow inside Inngest step may double-store on retry

**What happened:** If `runGeneratePredictionsWorkflow()` throws after partially writing to `model_predictions`, Inngest retries the full `step.run("mastra-generate-predictions")`. The `upsert` with `onConflict: "ticker_id,model_type,prediction_date"` handles this correctly — re-runs are idempotent.

**Risk:** Only a problem if the conflict constraint is ever removed or changed.

## 7. Supabase anon key is public — RLS is the security boundary

The `VITE_SUPABASE_ANON_KEY` is embedded in the frontend bundle and visible to anyone. Row Level Security (RLS) policies in Supabase are what prevent unauthorized data access. Never put sensitive data in Supabase without a corresponding RLS policy.

## 8. Yahoo Finance is unofficial and may silently break

`yahoo-finance2` is an unofficial library scraping Yahoo's undocumented API. It periodically breaks when Yahoo changes its internal API. The `/api/quotes` endpoint returns stale cached data on error rather than failing. Historical data via `yahooFinance.historical()` has no such fallback.

## 9. Reasoning validator is best-effort — never blocks prediction storage

`validate-reasoning` runs after `validate-and-store` and catches its own errors with `console.warn`. A failure in the reasoning validator does not prevent the validation from being recorded. Scores simply remain at their extraction-time values.

## 10. useUrlState uses replace:true — browser back navigates to previous page, not previous filter

This is intentional to avoid polluting browser history with every filter interaction. If a user expects Back to restore a previous filter state, it won't — it goes to the previous page entirely.
