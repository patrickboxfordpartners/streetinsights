# Domain Model

## Core Entities

**tickers** — Stocks being monitored. `symbol`, `sector`, `avg_daily_mentions`, `mention_spike_threshold`, `is_active`.

**sources** — Analysts/influencers making predictions. `credibility_score` (0-1), `accuracy_rate` (0-1), `total_predictions`, `correct_predictions`. Credibility is updated by `update-credibility-scores` cron.

**mentions** — Raw social media posts referencing a ticker. `content`, `platform`, `engagement_score`, `is_prediction` (flagged by extract-predictions), `processed`.

**predictions** — Structured analyst predictions extracted from mentions.
- `sentiment`: bullish | bearish | neutral
- `confidence_level`: low | medium | high
- `reasoning_quality_score`: 0-1 (set at extraction, updated at validation by reasoning-validator)
- `data_discipline_score`: 0-1
- `transparency_score`: 0-1
- `catalysts[]`, `data_sources_cited[]`

**validations** — Outcomes of predictions after target_date passes.
- `was_correct`: boolean (direction match)
- `accuracy_score`: 0-100 (directional + magnitude)
- `price_at_prediction`, `price_at_validation`, `price_change_percent`

**model_predictions** — ML model outputs (separate from analyst predictions).
- `model_type`: price_movement_24h | price_movement_7d
- `prediction_direction`: up | down | neutral
- `confidence_score`: 0-1
- `was_correct`, `validated_at` (set by validate-ml-predictions cron)

**mention_frequency** — Daily mention counts per ticker. `spike_detected` flag drives alert system.

**government_events** — Fed/Treasury/Congress events. `source_category`: fed | treasury | congress.

**event_impact_scores** — AI-scored market impact per event. `impact_direction`, `impact_magnitude` (0-10), `affected_sectors[]`, `affected_tickers[]`, `is_latest` flag.

## Key Types

`src/integrations/supabase/types.ts` — Full TypeScript types for all tables. **Source of truth for table shapes.** Always read this before writing queries.

`src/lib/ml-model.ts` — `ModelConfig`, `PredictionResult`, `FeatureVector` interfaces.

`src/lib/debate-analysis-v2.ts` — `DebateVerdict`, `MentionContext` interfaces.

## State Machines

**Mention lifecycle:** `processed: false` → debate/quick analysis → `processed: true`, `is_prediction: true/false`

**Prediction lifecycle:** created → `target_date` passes → `validate-predictions` runs → `validations` row created → `reasoning-validator` updates scores

**Government event lifecycle:** scraped → `score-event-impact` assigns score with `is_latest: true` → `validate-event-outcomes` updates after event passes
