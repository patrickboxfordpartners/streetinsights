# Street Insights — Worker API Overview

Base URL: `https://worker-production-c529.up.railway.app`

Street Insights tracks social media mentions, extracts analyst predictions, validates them against market outcomes, and monitors government events for market impact signals.

## Available Endpoints

| Endpoint | Method | Auth | Description |
|---|---|---|---|
| `/mcp` | GET / POST / DELETE | Bearer `MCP_API_KEY` | MCP server — 9 tools for querying all signal data |
| `/api/query` | POST | None | Natural language → SQL query against Supabase |
| `/api/quotes` | GET | None | Live market quotes via Yahoo Finance |
| `/api/swarm/run` | POST | None | Trigger swarm sentiment analysis for a ticker |
| `/health` | GET | None | Worker health check |
| `/docs/:slug` | GET | None | This documentation (markdown for agents) |

## Documentation Pages

- `/docs/overview` — this page
- `/docs/mcp` — MCP server tool reference
- `/docs/query` — Natural language query API reference

## MCP Server

The MCP endpoint exposes Street Insights data as tools any MCP-compatible client (Claude, Cursor, etc.) can call directly.

**Connect:**
```json
{
  "mcpServers": {
    "street-insights": {
      "url": "https://worker-production-c529.up.railway.app/mcp",
      "headers": { "Authorization": "Bearer <MCP_API_KEY>" }
    }
  }
}
```

See `/docs/mcp` for the full tool reference.

## Data Model

- **tickers** — symbols being monitored (NVDA, TSLA, AAPL, etc.)
- **mentions** — social media posts referencing a ticker
- **predictions** — structured analyst predictions extracted from mentions
- **validations** — outcomes: was the prediction correct?
- **sources** — analysts/influencers ranked by credibility and accuracy
- **government_events** — Fed, Treasury, Congress events with AI impact scores
- **scan_log** — Inngest cron job history and health
