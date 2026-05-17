# Street Insights — Natural Language Query API

**Endpoint:** `POST https://worker-production-c529.up.railway.app/api/query`
**Auth:** None (uses server-side Supabase DB connection)
**Content-Type:** `application/json`

Ask questions about your market signals data in plain English. The API translates your question into SQL, runs it against the Supabase database, and returns results with a plain-English explanation.

## Request

```json
{ "question": "Which tickers had the most bullish predictions in the last 30 days?" }
```

**Fields:**
- `question` (string, required) — natural language question, minimum 3 characters

## Response

```json
{
  "sql": "SELECT t.symbol, COUNT(*) AS bullish_count ...",
  "results": {
    "columns": ["symbol", "bullish_count"],
    "rows": [
      { "symbol": "NVDA", "bullish_count": 47 },
      { "symbol": "TSLA", "bullish_count": 31 }
    ]
  },
  "explanation": "This query counts bullish predictions per ticker from the last 30 days, joining predictions to tickers and filtering by sentiment."
}
```

## Example Questions

```
Which tickers had the most mention spikes in the last 30 days?
Top 10 sources by accuracy rate with at least 10 predictions
Bullish predictions for NVDA in the last 60 days
Which sectors have the most active tickers?
Show prediction accuracy by platform
Which government events this month affect the financial sector?
Sources with accuracy above 70% and high reasoning quality
Most mentioned tickers this week ranked by engagement score
```

## Safety

- Only `SELECT` queries are generated and executed — no mutations allowed.
- Keywords `INSERT`, `UPDATE`, `DELETE`, `DROP`, `TRUNCATE`, `ALTER`, `CREATE`, `GRANT`, `REVOKE` are blocked at validation.
- Results capped at 200 rows.

## Schema Reference

For the full schema used by the query engine, see `/docs/overview`.
The query engine has access to: `tickers`, `sources`, `mentions`, `predictions`, `validations`, `mention_frequency`, `government_events`, `event_impact_scores`, `scan_log`.
