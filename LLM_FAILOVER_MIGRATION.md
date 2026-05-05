# LLM Failover Migration - Deployment Plan

**Status:** Ready for next Friday (May 9)  
**Effort:** 30 minutes  
**Risk:** Low (exact same interface, just adds failover)

---

## What This Does

### Before (Current)
```
Prediction extraction:
1. Bull case → Grok
2. Bear case → Grok
3. Manager synthesis → Grok

If Grok rate-limits → ALL PREDICTIONS FAIL
```

### After (With Failover)
```
Prediction extraction:
1. Bull case → Grok (or GPT-4 if Grok fails)
2. Bear case → Grok (or GPT-4 if Grok fails)
3. Manager synthesis → Grok (or GPT-4 if Grok fails)

Fallback chain: Grok → GPT-4 → Claude → Gemini
Impossible to fail (unless ALL 4 providers down)
```

---

## Files Changed

### Created
- `src/lib/debate-analysis-v2.ts` ✅ (already done)

### Modified (deployment day)
- `src/inngest/functions/extract-predictions.ts` (1 line change)

---

## Migration Steps (Next Friday)

### Step 1: Update extract-predictions.ts (2 minutes)

Edit: `src/inngest/functions/extract-predictions.ts`

**Change line 4:**
```typescript
// OLD
import {
  runDebateAnalysis,
  runQuickAnalysis,
  shouldRunFullDebate,
  type MentionContext,
  type DebateVerdict,
} from "../../lib/debate-analysis.js";

// NEW
import {
  runDebateAnalysis,
  runQuickAnalysis,
  shouldRunFullDebate,
  type MentionContext,
  type DebateVerdict,
} from "../../lib/debate-analysis-v2.js";
```

**That's it!** Everything else stays the same.

### Step 2: Test Locally (5 minutes)

```bash
cd ~/market-signals

# Test the LLM client
npx tsx src/integrations/llm/test-llm.ts

# Expected output:
# ✓ Configured providers: xai (grok-3-latest)
# ✓ Provider used: xai
# ✅ Test passed!
```

### Step 3: Deploy (2 minutes)

```bash
git add .
git commit -m "feat: enable LLM multi-model failover for prediction extraction"
git push origin main
```

Railway auto-deploys in 2-3 minutes.

### Step 4: Monitor (20 minutes)

**Check Railway logs:**
```
[debate-analysis] Used provider: xai
[debate-analysis] Used provider: xai
[debate-analysis] Used provider: xai
```

**Good!** Grok is working.

**Also good (fallback working):**
```
[LLMClient] xai failed: rate limit exceeded
[LLMClient] Trying openai...
[LLMClient] ✓ openai succeeded
[debate-analysis] Used provider: openai
```

**Bad (need to investigate):**
```
[LLMClient] All LLM providers failed
```

---

## Optional: Add Fallback Providers

If you want to enable GPT-4, Claude, or Gemini as backups:

### Add to Railway Environment Variables

```bash
# OpenAI (GPT-4)
OPENAI_API_KEY=sk-...

# Anthropic (Claude)
ANTHROPIC_API_KEY=sk-ant-...

# Google (Gemini)
GOOGLE_API_KEY=AIza...
```

**Note:** You don't NEED these right now. Grok alone is working fine. But having them means:
- If Grok rate-limits during a Reddit pump → switches to GPT-4
- If Grok has an outage → switches to Claude
- 99.9%+ uptime instead of 95%

---

## Testing Failover (Optional)

Want to see it work? Temporarily remove Grok key:

```bash
# Railway → Variables
# Temporarily delete: XAI_API_KEY

# Check logs:
[LLMClient] Trying xai...
[LLMClient] xai failed: API key not configured
[LLMClient] Trying openai...
[LLMClient] ✓ openai succeeded
```

Then restore XAI_API_KEY when done testing.

---

## What Stays The Same

- ✅ Debate pipeline logic (Bull → Bear → Manager)
- ✅ Prompts (exact same)
- ✅ Output format (exact same JSON schema)
- ✅ Database storage (no changes)
- ✅ Inngest function interface (no changes)

**Only difference:** Which LLM answers the question (transparent to everything else).

---

## Monitoring Metrics

### First Hour
- Check: Which provider is used most (should be "xai")
- Verify: No increase in errors
- Confirm: Predictions still extracting correctly

### First Day
- Check: Did any failovers occur?
- Verify: Prediction quality unchanged
- Monitor: LLM costs (should be same or slightly lower)

### First Week
- Success rate should be: 99%+ (up from ~95%)
- Failover usage: <5% (only when Grok rate-limits)
- User-facing impact: None (seamless)

---

## Rollback Plan

If issues arise:

```bash
cd ~/market-signals/src/inngest/functions
# Edit extract-predictions.ts
# Change back to:
import { ... } from "../../lib/debate-analysis.js";

git add . && git commit -m "rollback: LLM failover" && git push
```

System reverts to Grok-only in 2 minutes.

---

## Cost Impact

### Current (Grok only)
```
Predictions per day: 200-500
Cost per prediction: ~$0.002
Daily cost: $0.40-1.00
```

### After (with failover)
```
Predictions per day: 200-500
Primary (Grok 95%): $0.38-0.95
Fallback (GPT-4 5%): $0.02-0.05
Daily cost: $0.40-1.00 (SAME)
```

**No cost increase!** Failover only kicks in when Grok unavailable.

---

## Success Criteria

**After 72 hours:**
- ✅ Zero "all providers failed" errors
- ✅ 99%+ prediction extraction success rate
- ✅ Fallback used <10% of time
- ✅ Prediction quality unchanged (verify a few manually)

**If all met:** Infrastructure upgrade complete! 🎉

---

## Timeline

**This Weekend (May 2-4):**
- Monitor multi-source news (Feature #1)
- No action needed

**Monday (May 5):**
- Review news aggregator metrics
- Decision: proceed with LLM failover?

**Friday (May 9):**
- Deploy LLM failover (30 minutes)
- Monitor for first hour
- Let run over weekend

**Monday (May 12):**
- Review both features (news + LLM)
- Celebrate 99%+ uptime! 🚀

---

*Prepared: 2026-05-01*  
*Deploy: 2026-05-09 (Friday)*  
*Review: 2026-05-12 (Monday)*
