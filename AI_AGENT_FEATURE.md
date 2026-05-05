# AI Agent Analysis Feature

## Overview

The AI Agent Analysis feature adds investment framework-based perspectives from legendary investors to Street Insights. Each agent persona analyzes tickers through their unique lens (value investing, growth-at-reasonable-price, contrarian, etc.) and provides structured recommendations.

## Agents Available

1. **Warren Buffett** - Value investor focused on intrinsic value, moats, and long-term competitive advantages
2. **Peter Lynch** - Growth-at-reasonable-price investor seeking undervalued growth opportunities
3. **Benjamin Graham** - Balance sheet strength and margin of safety
4. **Charlie Munger** - Multi-disciplinary thinker using mental models and inversion
5. **Seth Klarman** - Risk-averse value investor seeking asymmetric risk/reward
6. **Howard Marks** - Contrarian investor focused on market cycles and second-level thinking

## Architecture

### Database Schema

**`ai_agent_personas`** - Agent definitions
- `name`, `slug`, `description`, `framework`
- `prompt_template` - System prompt for this agent
- `display_order`, `is_active`

**`ai_agent_analyses`** - Generated analyses per ticker
- `ticker_id`, `agent_persona_id`
- `sentiment` (bullish/bearish/neutral/hold)
- `confidence_score` (0-100)
- `analysis_text`, `key_factors[]`, `risks[]`, `recommendation`
- `analyzed_at`, `expires_at` (24-hour TTL)
- Unique constraint: one analysis per agent per ticker per day

### Services

**`src/lib/ai-agents.ts`** - Core service
- `getAgentPersonas()` - Fetch all active personas
- `getTickerAgentAnalyses(tickerId)` - Get cached analyses for a ticker
- `generateAgentAnalysis(tickerId, personaId, context, apiKey)` - Generate new analysis via LLM
- `triggerFullAnalysis(tickerId, context)` - Trigger all agents for a ticker

**`src/inngest/ai-agent-functions.ts`** - Background workers
- `generateTickerAgentAnalyses` - Generate analyses on-demand (triggered by event)
- `dailyAgentAnalysisRefresh` - Daily batch job (6 AM UTC) to refresh top tickers

### UI Components

**`AIAgentPanel`** - Full analysis view (TickerDetail page)
- Tabbed interface to switch between agents
- Shows sentiment, confidence, recommendation, key factors, risks, full analysis
- Price at analysis timestamp

**`AIAgentSummary`** - Compact consensus view (Dashboard)
- Shows consensus sentiment across all agents
- Breakdown by bullish/bearish/neutral
- Average confidence score
- Agent badges with individual sentiments

## Setup

### 1. Run Database Migration

```bash
psql -h [supabase-host] -U postgres -d postgres -f supabase_ai_agents.sql
```

Or via Supabase dashboard: SQL Editor → paste contents of `supabase_ai_agents.sql` → Run

### 2. Environment Variables

Already configured:
- `XAI_API_KEY` - Grok API key (already in .env)

### 3. Deploy Inngest Functions

The Inngest functions are automatically deployed when you push to Vercel. They will:
- Listen for `ticker/agent-analysis.requested` events
- Run daily at 6 AM UTC to refresh active tickers

### 4. Trigger Initial Analyses

Option A: Via Inngest dashboard (manual trigger)
1. Go to Inngest dashboard
2. Find function `generate-ticker-agent-analyses`
3. Send test event with `{ tickerId: "uuid", symbol: "NVDA" }`

Option B: Via code (one-time script)
```typescript
import { inngest } from './src/inngest/client'

// Trigger for a specific ticker
await inngest.send({
  name: 'ticker/agent-analysis.requested',
  data: {
    tickerId: 'your-ticker-uuid',
    symbol: 'NVDA'
  }
})
```

Option C: Wait for daily cron job (runs at 6 AM UTC for top 100 tickers)

## Usage

### In TickerDetail Page

The `AIAgentPanel` component is automatically rendered when viewing a ticker:

```tsx
{ticker && (
  <AIAgentPanel tickerId={ticker.id} symbol={ticker.symbol} />
)}
```

If no analyses exist yet, it shows "No analyses available yet. Check back soon!"

### In Dashboard (Future)

Add the summary view to show consensus across all agents:

```tsx
import { AIAgentSummary } from '../components/AIAgentSummary'

// In your component:
const [analyses, setAnalyses] = useState<AgentAnalysis[]>([])

useEffect(() => {
  getTickerAgentAnalyses(tickerId).then(setAnalyses)
}, [tickerId])

<AIAgentSummary analyses={analyses} symbol="NVDA" />
```

## LLM Integration

Uses **XAI Grok-2** API for analysis generation:
- Model: `grok-2-latest`
- Temperature: 0.7
- Max tokens: 1000
- System prompt: Generic analyst instructions
- User prompt: Agent-specific framework + ticker context

### Context Provided to Agents

- Symbol, company name, sector, industry
- Current price, market cap
- Social sentiment breakdown (bullish/bearish/neutral %)
- Average daily mentions
- Recent news (optional)
- Technical signals (optional)

### Response Parsing

Extracts:
- **Sentiment** - Regex match for "sentiment: bullish|bearish|neutral|hold"
- **Confidence** - Regex match for "confidence: 0-100"
- **Key Factors** - Bullet points after "key factors:"
- **Risks** - Bullet points after "risks:"
- **Recommendation** - Text after "recommendation:"

## Cost Considerations

**Per Analysis:**
- ~500 tokens input (context + prompt)
- ~800 tokens output (analysis)
- Total: ~1,300 tokens = ~$0.002 per analysis at Grok pricing

**Daily Refresh (100 tickers × 6 agents):**
- 600 analyses/day
- ~$1.20/day = ~$36/month

**Optimization:**
- Cache analyses for 24 hours (TTL)
- Only refresh tickers with >5 avg daily mentions
- Stagger requests (5 seconds between tickers) to avoid rate limits

## Future Enhancements

### Phase 2 Features

1. **Multi-LLM Router**
   - Add OpenAI GPT-4, Anthropic Claude, Gemini as fallbacks
   - Route based on availability, cost, quality

2. **Economic Context Overlay**
   - Integrate FRED API (interest rates, inflation)
   - World Bank/IMF data for macro analysis
   - Add to agent context

3. **Agent Debate Feature**
   - Generate "debate" between bullish (Lynch) vs bearish (Klarman) agents
   - Show contrasting viewpoints side-by-side

4. **Custom Agents**
   - Allow Pro/Enterprise users to create custom agent personas
   - Define custom frameworks and prompt templates

5. **Agent Performance Tracking**
   - Track accuracy of each agent's recommendations over time
   - Show historical performance metrics
   - Weight consensus by agent accuracy

### Phase 3 Features

6. **Agent Explanations**
   - "Why did Warren Buffett rate this bearish?"
   - LLM-generated explanation comparing agent's framework to ticker fundamentals

7. **Agent Notifications**
   - Alert when specific agent (e.g., Buffett) changes sentiment
   - "Buffett just flipped bullish on NVDA"

8. **Agent Portfolio Builder**
   - "What would Warren Buffett's portfolio look like?"
   - Auto-generate portfolio based on agent's top picks

## Testing

### Manual Test

1. Run database migration
2. Start dev server: `npm run dev`
3. Navigate to a ticker detail page (e.g., `/dashboard/tickers/NVDA`)
4. Check that "AI Agent Analysis" section appears (may show "No analyses" initially)
5. Trigger analysis manually via Inngest or wait for daily cron

### Verify Database

```sql
-- Check personas are seeded
SELECT name, slug, display_order FROM ai_agent_personas ORDER BY display_order;

-- Check analyses exist for a ticker
SELECT 
  ap.name as agent_name,
  aa.sentiment,
  aa.confidence_score,
  aa.analyzed_at
FROM ai_agent_analyses aa
JOIN ai_agent_personas ap ON aa.agent_persona_id = ap.id
WHERE aa.ticker_id = 'your-ticker-uuid'
ORDER BY aa.analyzed_at DESC;
```

## Troubleshooting

**Problem:** No analyses appear
- Check database: Run SQL above to verify analyses exist
- Check TTL: Analyses expire after 24 hours
- Check Inngest: Verify daily cron job is running
- Check API key: Ensure `XAI_API_KEY` is set

**Problem:** LLM errors
- Check API key is valid
- Check rate limits (Grok: 60 req/min, 100K tokens/min)
- Check Grok API status: https://status.x.ai

**Problem:** Parsing errors
- LLM response format may vary
- Check `parseAgentResponse()` in `ai-agents.ts`
- Update regex patterns if needed

## Credits

Inspired by Fincept Terminal's 37-agent framework, adapted for social sentiment analysis context.
