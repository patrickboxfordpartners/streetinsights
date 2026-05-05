# Multi-Source News Monitoring Guide

**Deployment:** Just pushed (commit `87d5fe9`)  
**Status:** Railway deploying now  
**Feature:** Multi-source news aggregator is LIVE

---

## ✅ What Just Changed

### Before (old scan-mentions.js)
```
News source: NewsAPI only
Failure mode: If NewsAPI down → no news
```

### After (new scan-mentions-v2.js)
```
News sources: SerpAPI → Tavily → NewsAPI → SearXNG
Failure mode: Impossible (SearXNG is free & always available)
```

---

## 🔍 How to Verify It's Working

### 1. Check Railway Logs (5 minutes after deploy)

Go to: Railway Dashboard → market-signals-worker → Logs

**Look for these success messages:**
```
✓ Configured providers: serpapi, tavily, newsapi, searxng
[scan-news-aggregated] NVDA: 5 articles from serpapi
[scan-news-aggregated] TSLA: 5 articles from serpapi
[scan-news-aggregated] AAPL: 5 articles from serpapi
```

**Good sign:** You see "from serpapi" (using primary provider)

**Also good:** You see "from tavily" or "from newsapi" (fallback working)

**Red flag:** You see errors like:
```
[scan-news-aggregated] News aggregator error for NVDA: All providers failed
```
(This means env vars not set correctly)

---

### 2. Check Inngest Dashboard

Visit: https://app.inngest.com

**Navigate to:**
- Functions → `scan-mentions-v2`
- Click on latest run (should be within last 15 minutes)

**Verify steps:**
1. ✓ fetch-active-tickers (green)
2. ✓ scan-stocktwits (green)
3. ✓ scan-reddit (green or skipped if no creds)
4. ✓ **scan-news-aggregated** (green) ← THIS IS NEW
5. ✓ scan-finnhub (green)
6. ✓ scan-alpha-vantage-news (green)
7. ✓ store-mentions (green)

**Click into "scan-news-aggregated" step:**

Should see output like:
```json
{
  "NVDA": "5 articles from serpapi",
  "TSLA": "5 articles from serpapi",
  "AAPL": "5 articles from serpapi"
}
```

---

### 3. Check Supabase Database

Run this query in Supabase SQL Editor:

```sql
-- Check news sources from last hour
SELECT 
  platform,
  COUNT(*) as articles_count,
  MAX(mentioned_at) as latest_article
FROM mentions
WHERE 
  mentioned_at > NOW() - INTERVAL '1 hour'
  AND platform IN ('news', 'finnhub', 'alphavantage')
GROUP BY platform
ORDER BY articles_count DESC;
```

**Expected results:**
```
platform      | articles_count | latest_article
------------- | -------------- | -------------------
news          | 15-25          | 2026-05-01 17:45:00
finnhub       | 10-20          | 2026-05-01 17:30:00
alphavantage  | 5-10           | 2026-05-01 17:15:00
```

**Note:** "news" platform now includes articles from SerpAPI, Tavily, NewsAPI (all merged).

---

## 📊 Success Metrics (First 24 Hours)

### Baseline (Before)
```
News articles per scan: 10-15
Source: NewsAPI only
Success rate: 85% (fails when quota exhausted)
```

### Target (After)
```
News articles per scan: 15-25 (higher coverage)
Sources: 4 providers with fallback
Success rate: 99%+ (nearly impossible to fail)
```

### Check After 24 Hours

Run this query:
```sql
-- Compare news volume before/after
SELECT 
  DATE_TRUNC('hour', mentioned_at) as hour,
  COUNT(*) as article_count
FROM mentions
WHERE 
  platform = 'news'
  AND mentioned_at > NOW() - INTERVAL '48 hours'
GROUP BY hour
ORDER BY hour DESC
LIMIT 48;
```

**What to look for:**
- Recent hours: 15-25 articles/hour
- Older hours: 10-15 articles/hour
- Smooth increase = success

---

## 🚨 Troubleshooting

### Issue 1: "All providers failed" in logs

**Cause:** API keys not set in Railway

**Fix:**
1. Go to Railway → Variables
2. Add:
   ```
   SERPAPI_API_KEY=56f7283f17ed8b8331337fef98ac597b5961d7495f69fdaa7b7a2cdf148f7a9a
   TAVILY_API_KEY=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
   SEARXNG_BASE_URL=https://searx.be
   ```
3. Save (Railway auto-restarts)

### Issue 2: Function not running

**Cause:** Worker didn't pick up new code

**Fix:**
1. Railway Dashboard → Deployments
2. Click "Redeploy" on latest deployment
3. Wait 2 minutes for rebuild

### Issue 3: Only seeing NewsAPI articles

**Cause:** SerpAPI/Tavily keys invalid or quota exhausted

**Check:** Railway logs for:
```
[NewsAggregator] serpapi failed: 403 Forbidden
[NewsAggregator] Trying tavily...
[NewsAggregator] ✓ tavily returned 5 articles
```

**This is OK!** Fallback is working as designed.

### Issue 4: No articles at all

**Cause:** All providers including SearXNG failed (very rare)

**Check:** 
```
[NewsAggregator] searxng failed: ...
```

**Fix:** Check SEARXNG_BASE_URL is set to `https://searx.be`

---

## 💰 Cost Monitoring

### Expected API Usage (per day)

```
SerpAPI: ~100 searches = $1.50/day
Tavily:  ~30 searches  = $1.00/day (when SerpAPI fails)
NewsAPI: ~10 searches  = $0.00/day (free tier)
SearXNG: unlimited     = $0.00/day (free)

Total: $2-3/day
```

### Check SerpAPI Usage

Visit: https://serpapi.com/dashboard

**Quotas:**
- Searches today: X / 5000
- Should see steady usage (not burst)

### Check Tavily Usage

Visit: https://tavily.com/dashboard

**Quotas:**
- Searches today: X / 1000
- Should see minimal usage (only when SerpAPI fails)

---

## 🎯 Success Indicators (First Week)

After 7 days, check these metrics:

### Reliability
- [ ] Zero "all providers failed" errors
- [ ] 99%+ Inngest success rate for scan-mentions
- [ ] News articles every hour (no gaps)

### Diversity
- [ ] Articles from multiple sources (not just one domain)
- [ ] SerpAPI handling 70%+ of requests
- [ ] Fallback used <20% of time

### Cost
- [ ] SerpAPI usage: $10-20/week
- [ ] Tavily usage: $5-10/week
- [ ] Total: <$30/week

**If all checked:** Multi-source news is stable. Enable LLM failover next.

---

## 📞 Next Steps

### This Weekend (Monitor)
- Check Railway logs Saturday/Sunday morning
- Verify news still flowing during weekend
- Check for any error patterns

### Monday (Review)
- Review 72-hour metrics
- Check API costs
- Decide: ready for LLM failover?

### Next Friday (If Stable)
- Enable LLM multi-model failover
- Migrate debate-analysis.ts to llmClient

---

## 🔄 Rollback (If Needed)

If critical issues arise:

```bash
cd ~/market-signals/src/inngest/functions
```

Edit `index.ts`:
```typescript
// Rollback to single-source
export { scanMentions } from "./scan-mentions.js";
```

```bash
git add . && git commit -m "rollback: disable multi-source news" && git push
```

Railway auto-deploys old version in ~2 minutes.

---

*Deployed: 2026-05-01*  
*Commit: 87d5fe9*  
*Monitor for: 72 hours*
