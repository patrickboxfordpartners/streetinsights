# Test Matrix

## Type Checking

```bash
npx tsc --noEmit
```

Catches all TypeScript errors across both the frontend SPA and the worker. This is the primary correctness check — run it before every commit.

**What it covers:** All `.ts` and `.tsx` files except those with `// @ts-nocheck` (notably `src/lib/debate-analysis-v2.ts`).

## Frontend Build

```bash
npm run build
```

Runs `tsc -b && vite build`. Catches import errors, missing assets, and build-time failures. Output goes to `dist/`.

**What it covers:** Full SPA build pipeline. A clean build = no broken imports or missing files.

## Worker Startup

```bash
npm run worker:dev
curl http://localhost:3001/health
```

Confirms the Express worker starts and all routes register correctly.

**What it covers:** Route registration, Inngest setup, Yahoo Finance initialization.

## MCP Endpoint

```bash
npm run worker:dev &
sleep 5
curl -X POST http://localhost:3001/mcp \
  -H "Authorization: Bearer $MCP_API_KEY" \
  -H "Content-Type: application/json" \
  -H "Accept: application/json, text/event-stream" \
  -d '{"jsonrpc":"2.0","id":1,"method":"tools/list","params":{}}'
```

Should return all 9 tools. Tests MCP auth and tool registration.

## NL Query Endpoint (requires SUPABASE_DB_URL)

```bash
curl -X POST http://localhost:3001/api/query \
  -H "Content-Type: application/json" \
  -d '{"question":"show me the top 3 tickers by mention count"}'
```

## Docs Endpoint

```bash
curl http://localhost:3001/docs                         # JSON index
curl -H "Accept: text/plain" http://localhost:3001/docs/mcp   # markdown
```

## Manual Verification Checklist

Before merging changes to Inngest functions:
- [ ] Function is exported from `src/inngest/functions/index.ts`
- [ ] Function has a unique `id` field
- [ ] Step names are unique within the function

Before merging changes to `worker.ts`:
- [ ] `DOCS_DIR` and module-level constants are before all `app.*()` calls
- [ ] New routes are registered before `app.listen()`
- [ ] `npx tsc --noEmit` passes

Before merging changes to Supabase schema:
- [ ] New migration file created in `supabase/migrations/`
- [ ] `src/integrations/supabase/types.ts` updated to match
- [ ] RLS policy added if new table contains user data

## No Automated Test Suite

There is currently no Jest/Vitest test suite. All verification is manual + type-checking + build verification. Adding a test suite for `src/lib/` (pure functions) would be the highest-leverage first test investment.
