# Atlas — How to Use This

The `docs/atlas/` folder is a persistent context system for Street Insights. Load it before coding, not after.

## Files

| File | What It Is |
|------|-----------|
| `repo-map.md` | Directory tree, entrypoints, router table, danger zones |
| `01_ARCHITECTURE.md` | Deployment topology, data flow, module boundaries |
| `02_DOMAIN_MODEL.md` | Core entities, relationships, key types |
| `03_CRITICAL_FLOWS.md` | Top 5 end-to-end flows traced through the code |
| `04_STATE_SOURCES_OF_TRUTH.md` | Where state lives (DB, cache, local state) |
| `05_EXTERNAL_DEPENDENCIES.md` | Every third-party service and how it's integrated |
| `06_GOTCHAS.md` | Real bugs and footguns found in this codebase |
| `07_TEST_MATRIX.md` | How to run tests and verify changes |
| `08_CHANGELOG_LAST_14_DAYS.md` | Auto-generated recent commits by category |

## Two-Agent Workflow

**Agent A (implement):**
1. Load `repo-map.md` → find relevant files via Router Table
2. Load the domain doc (`02_DOMAIN_MODEL.md`) for the area you're changing
3. Load `06_GOTCHAS.md` before touching any Danger Zone
4. Read the actual source files → implement
5. Run `make atlas-check` after structural changes

**Agent B (review):**
1. Load the diff
2. Check against `06_GOTCHAS.md` — does this introduce a known pattern?
3. Verify affected flows via `03_CRITICAL_FLOWS.md`
4. Confirm tests per `07_TEST_MATRIX.md`

## Working Rules

- Read atlas before coding, not after discovering a bug
- Update atlas docs when architecture changes (not just for major changes)
- Run `make atlas-generate` after adding/removing directories or entrypoints
- Never edit `repo-map.md` or `08_CHANGELOG_LAST_14_DAYS.md` manually — they are auto-generated
- `06_GOTCHAS.md` is the most valuable file; keep it current

## Regenerate

```bash
make atlas-generate   # regenerate repo-map.md and changelog
make atlas-check      # verify atlas is not stale (use in CI)
```
