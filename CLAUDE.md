# Street Insights — Agent Instructions

## Stack

- **Frontend:** Vite + React 19 + TypeScript, deployed to Vercel
- **Worker:** Express + Inngest + Mastra, deployed to Railway
- **DB:** Supabase (Postgres) — project `xtyfljmwfwhzthwdhkly`
- **Package manager:** npm

## Commands

```bash
npm run dev          # frontend dev server (port 5173)
npm run worker:dev   # worker dev server (port 3001)
npm run build        # production build
npx tsc --noEmit     # type-check only
```

## Atlas — Codebase Context

The `docs/atlas/` folder is the persistent context system for this repo. Load it before coding.

**Start here:** `docs/atlas/repo-map.md` — directory tree, router table (where to find X), danger zones.

**Key docs:**
- `docs/atlas/01_ARCHITECTURE.md` — deployment topology, data flow
- `docs/atlas/02_DOMAIN_MODEL.md` — entities, types, state machines
- `docs/atlas/03_CRITICAL_FLOWS.md` — top 5 flows traced through code
- `docs/atlas/06_GOTCHAS.md` — real bugs; read before touching danger zones
- `docs/atlas/07_TEST_MATRIX.md` — how to verify changes

**Two-agent workflow:**

Agent A (implement): Load `repo-map.md` → find files via Router Table → load domain doc → load `06_GOTCHAS.md` → read source → implement.

Agent B (review): Load diff → check against `06_GOTCHAS.md` → verify flows via `03_CRITICAL_FLOWS.md` → confirm tests per `07_TEST_MATRIX.md`.

**Regenerate atlas after structural changes:**
```bash
make atlas-generate
```

## Code Style

- TypeScript strict mode — never use `any` unless the file already has `@ts-nocheck`
- Straight quotes only (`"` and `'`) — never curly/smart quotes
- No comments unless the WHY is non-obvious
- No emojis unless explicitly requested
