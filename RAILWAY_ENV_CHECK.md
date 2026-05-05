# Railway Environment Variables - Quick Check

**Deploy Status:** Code pushed, Railway building now

---

## ⚠️ CRITICAL: Add These to Railway NOW

Railway Dashboard → market-signals-worker → Variables → Raw Editor

**Copy/paste this entire block:**

```bash
SERPAPI_API_KEY=56f7283f17ed8b8331337fef98ac597b5961d7495f69fdaa7b7a2cdf148f7a9a
TAVILY_API_KEY=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
SEARXNG_BASE_URL=https://searx.be
```

**Save** → Railway will auto-restart (takes ~2 minutes)

---

## ✅ How to Verify They're Set

After Railway restarts, check logs for this line:

```
✓ Configured providers: serpapi, tavily, newsapi, searxng
```

**If you see only:**
```
✓ Configured providers: newsapi, searxng
```

→ API keys NOT set correctly. Double-check Railway variables.

---

## 🚀 After Variables Are Set

1. **Wait 2 minutes** for Railway to restart
2. **Check logs** for "Configured providers" message
3. **Wait 15 minutes** for next scan-mentions run
4. **Check Inngest** for green checkmarks

Then follow `MONITORING_GUIDE.md` for 24-hour verification.

---

*Priority: DO THIS NOW before monitoring*
