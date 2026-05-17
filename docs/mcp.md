# Street Insights MCP Tool Reference

**Endpoint:** `https://worker-production-c529.up.railway.app/mcp`
**Auth:** `Authorization: Bearer <MCP_API_KEY>`
**Protocol:** MCP StreamableHTTP (stateless)

---

## Tools

### get_tickers

List all tickers Street Insights is monitoring.

**Parameters:**
- `active_only` (boolean, optional) — filter to active tickers only (default: true)

**Returns:** Array of `{ symbol, company_name, sector, industry, market_cap, avg_daily_mentions, mention_spike_threshold, is_active }`

---

### get_mentions

Retrieve recent mentions for a ticker.

**Parameters:**
- `symbol` (string, required) — ticker symbol e.g. `NVDA`
- `limit` (integer, optional) — 1–100, default 20
- `predictions_only` (boolean, optional) — return only mentions flagged as predictions
- `platform` (string, optional) — filter by platform e.g. `twitter`, `reddit`

**Returns:** Array of `{ content, url, platform, mentioned_at, engagement_score, is_prediction }`

---

### get_mention_frequency

Daily mention counts and spike detection for a ticker.

**Parameters:**
- `symbol` (string, required)
- `days` (integer, optional) — 1–90, default 14

**Returns:** Array of `{ date, mention_count, unique_sources, avg_sentiment_score, spike_detected }`

---

### get_predictions

Analyst predictions for a ticker.

**Parameters:**
- `symbol` (string, required)
- `sentiment` (enum, optional) — `bullish` | `bearish` | `neutral`
- `confidence` (enum, optional) — `low` | `medium` | `high`
- `limit` (integer, optional) — 1–50, default 10

**Returns:** Array of `{ sentiment, price_target, timeframe_days, confidence_level, reasoning, data_sources_cited, catalysts, reasoning_quality_score, prediction_date, target_date }`

---

### get_prediction_accuracy

Validated prediction outcomes for a ticker.

**Parameters:**
- `symbol` (string, required)
- `limit` (integer, optional) — 1–50, default 20

**Returns:** Array of `{ prediction_id, price_at_prediction, price_at_validation, price_change_percent, was_correct, accuracy_score, days_to_outcome, validation_date }`

---

### get_sources

Analyst/influencer sources ranked by credibility.

**Parameters:**
- `platform` (string, optional) — e.g. `twitter`, `youtube`
- `min_accuracy` (number, optional) — 0–1 minimum accuracy rate
- `limit` (integer, optional) — 1–100, default 20

**Returns:** Array of `{ name, platform, username, source_type, credibility_score, accuracy_rate, total_predictions, correct_predictions, reasoning_quality, url, verified }`

---

### get_government_events

Upcoming government/Fed/Treasury/Congress events.

**Parameters:**
- `days_ahead` (integer, optional) — 1–90, default 14
- `source_category` (string, optional) — `fed` | `treasury` | `congress`
- `topic` (string, optional) — filter by related topic keyword

**Returns:** Array of `{ title, description, event_type, source_category, event_date, participants, related_topics, source_url, status }`

---

### get_event_impact

AI-generated market impact analysis for a government event.

**Parameters:**
- `event_id` (string UUID, required)

**Returns:** `{ impact_magnitude, impact_direction, confidence, timeframe, affected_sectors, affected_tickers, reasoning, key_factors, historical_precedent, model_name }`

---

### get_scan_status

Recent Inngest cron job health.

**Parameters:**
- `scan_type` (string, optional) — filter e.g. `mentions`, `predictions`, `government`
- `limit` (integer, optional) — 1–50, default 10

**Returns:** Array of `{ scan_type, status, mentions_found, error_message, started_at, completed_at }`

---

## Usage Example

```bash
# List tools
curl -X POST https://worker-production-c529.up.railway.app/mcp \
  -H "Authorization: Bearer <key>" \
  -H "Content-Type: application/json" \
  -H "Accept: application/json, text/event-stream" \
  -d '{"jsonrpc":"2.0","id":1,"method":"tools/list","params":{}}'

# Call a tool
curl -X POST https://worker-production-c529.up.railway.app/mcp \
  -H "Authorization: Bearer <key>" \
  -H "Content-Type: application/json" \
  -H "Accept: application/json, text/event-stream" \
  -d '{"jsonrpc":"2.0","id":2,"method":"tools/call","params":{"name":"get_predictions","arguments":{"symbol":"NVDA","sentiment":"bullish","limit":5}}}'
```
