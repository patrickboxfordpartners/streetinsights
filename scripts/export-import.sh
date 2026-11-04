#!/usr/bin/env bash
# Copy market tables from the old Postgres database into Neon.
# Does not print connection strings. Does not include user-owned tables:
# those rows use Supabase auth UUIDs and do not match Clerk user ids.
set -euo pipefail

if [[ -z "${SOURCE_DATABASE_URL:-}" ]]; then
  echo "Set SOURCE_DATABASE_URL to the old Postgres URL." >&2
  exit 1
fi
if [[ -z "${DATABASE_URL:-}" ]]; then
  echo "Set DATABASE_URL to the Neon URL." >&2
  exit 1
fi

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
DUMP="${DUMP_PATH:-$ROOT/market-data.sql}"

TABLES=(
  tickers
  sources
  mentions
  predictions
  validations
  mention_frequency
  scan_log
  government_events
  event_impact_scores
  event_validations
  swarm_signals
  options_flow
  ai_agent_personas
  ai_agent_analyses
  model_predictions
  model_configs
  model_training_data
  content_drafts
  debates
)

args=()
for table in "${TABLES[@]}"; do
  args+=(--table="public.${table}")
done

echo "Dumping ${#TABLES[@]} market tables to ${DUMP}"
pg_dump --data-only --no-owner --no-privileges "${args[@]}" --file="$DUMP" "$SOURCE_DATABASE_URL"

if [[ "${1:-}" == "--apply-schema" ]]; then
  echo "Applying db/migrations/0001_init.sql"
  psql "$DATABASE_URL" -v ON_ERROR_STOP=1 -f "$ROOT/db/migrations/0001_init.sql"
fi

echo "Loading dump with triggers paused"
{
  echo "SET session_replication_role = replica;"
  cat "$DUMP"
} | psql "$DATABASE_URL" -v ON_ERROR_STOP=1

echo "Done. Delete ${DUMP} when you have confirmed the load."
