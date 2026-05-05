# Railway Deployment - Infrastructure Upgrade

**Commit:** `756f330` (just pushed)  
**Status:** Code deployed, needs environment variables

---

## 🚂 Add These Environment Variables to Railway

Go to: Railway Dashboard → market-signals-worker → Variables

### Multi-Source News (Add these 3)

```bash
SERPAPI_API_KEY=56f7283f17ed8b8331337fef98ac597b5961d7495f69fdaa7b7a2cdf148f7a9a
TAVILY_API_KEY=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
SEARXNG_BASE_URL=https://searx.be
```

**After adding:** Railway will auto-restart the worker.

---

## ✅ Verify Deployment

### 1. Check Railway Logs (5 minutes after restart)

Look for these success messages:
```
✓ Configured providers: serpapi, tavily, newsapi, searxng
[NewsAggregator] Trying serpapi...
[NewsAggregator] ✓ serpapi returned X articles
```

### 2. Check Inngest Dashboard

Visit: https://app.inngest.com

- `scan-mentions` function should run every 15 minutes
- Look for successful executions (green checkmarks)
- Verify "scan-news-aggregated" step completes

### 3. Check Supabase

Query mentions table:
```sql
SELECT 
  platform,
  COUNT(*) as count,
  MAX(mentioned_at) as latest
FROM mentions
WHERE mentioned_at > NOW() - INTERVAL '1 hour'
GROUP BY platform
ORDER BY count DESC;
```

Should see articles from multiple sources (not just NewsAPI).

---

## 🔧 If Something Goes Wrong

### News Aggregator Not Working

**Check:** Railway logs for errors
```
[NewsAggregator] serpapi failed: ...
```

**Fix:** Verify API key is correct in Railway variables

**Fallback:** System will automatically use Tavily → NewsAPI → SearXNG

### Worker Not Starting

**Check:** Railway build logs
```
npm install failed
```

**Fix:** Railway should auto-rebuild after env var changes. If not, manually trigger:
```bash
Railway Dashboard → Deployments → Redeploy
```

---

## 📊 Monitor First 24 Hours

### Metrics to Watch

1. **News Source Distribution**
   - 70% SerpAPI (primary)
   - 20% Tavily (fallback)
   - 10% NewsAPI/SearXNG (fallback)

2. **Inngest Success Rate**
   - Target: >95% success
   - Current: Check dashboard

3. **API Costs**
   - SerpAPI: ~$1.50/day (100 searches)
   - Tavily: ~$1/day (30 searches)

### Alert Thresholds

- ⚠️ Warning: <90% success rate
- 🚨 Critical: <80% success rate
- 💰 Budget: >$5/day API spend

---

## 🎯 Next Steps (After 24h Stable)

### Week 1: Enable New Features

1. **Switch to Multi-Source News**
   - Edit `src/inngest/functions/index.ts`
   - Change: `export { scanMentions }` to `export { scanMentionsV2 as scanMentions }`
   - Commit & push

2. **Add LLM Failover**
   - Update `src/lib/debate-analysis.ts`
   - Replace direct XAI calls with `llmClient.chat()`
   - Test locally first

3. **Test Multi-Channel Notifications**
   - Add Telegram bot (optional)
   - Test with one real alert

### Week 2: Add Chart Score

1. **Database Migration**
   ```sql
   ALTER TABLE predictions ADD COLUMN chart_score INTEGER;
   ```

2. **Create Technical Analysis Function**
   - See `INFRASTRUCTURE_UPGRADE_2026-05-01.md`

3. **Update Dashboard UI**
   - Add Chart Score badge to predictions

---

## 📞 Rollback Plan

If critical issues arise:

```bash
cd ~/market-signals
git revert HEAD
git push origin main
```

Railway will auto-deploy previous version. System will continue using old single-source news.

---

## ✅ Deployment Checklist

- [x] Code pushed to GitHub (commit `756f330`)
- [ ] Railway env vars added (SERPAPI, TAVILY, SEARXNG)
- [ ] Railway auto-restarted
- [ ] Logs show "✓ Configured providers: serpapi, tavily, newsapi, searxng"
- [ ] Inngest functions running successfully
- [ ] Mentions table showing articles from multiple sources
- [ ] No errors in Railway logs for 1 hour
- [ ] API costs within budget ($3-5/day)

**Once all checked:** Infrastructure upgrade is LIVE! 🚀

---

*Created: 2026-05-01*  
*Deployment: Railway*  
*Worker: market-signals-worker*
