# Demo Analytics & Conversion Tracking

## Implemented Events

### Demo Engagement
- `demo_start` - User starts playback (progress: 0, stock: NVDA/COIN/PLTR)
- `demo_complete` - User reaches day 90 (progress: 100, outcome: bullish/bearish)
- `demo_switch_stock` - User switches scenarios (from → to)

### Conversion Actions
- `demo_cta_signup` - Clicks "Get Started" at end of demo
- `demo_cta_dashboard` - Clicks "Go to Dashboard" (logged-in users)
- `demo_cta_replay` - Clicks "Watch Again"

## Conversion Funnel

```
Landing Page Visit
  ↓
Demo Start (stock selected)
  ↓
Demo Interaction (keyboard shortcuts, playback controls)
  ↓
Demo Complete (outcome revealed)
  ↓
CTA Click
  ↓ (signup) → Sign Up Page → Dashboard First Visit
  ↓ (dashboard) → Dashboard
  ↓ (replay) → Demo Start (loop)
```

## Key Metrics to Track

### Engagement
- **Demo start rate**: Landing page views → demo starts
- **Completion rate**: Demo starts → demo completes
- **Average progress**: How far users get before dropping off
- **Stock preference**: Which scenarios convert best

### Conversion
- **Demo → Signup**: Demo completes → signup clicks
- **Demo → Dashboard**: Logged-in users going straight to dashboard
- **Replay rate**: Users watching multiple scenarios

### Attribution
- Track which stock scenario led to signup
- Track outcome (bullish/bearish) correlation with signup
- Track time-to-complete (fast vs. slow watchers)

## Google Analytics Setup

```html
<!-- In index.html -->
<script async src="https://www.googletagmanager.com/gtag/js?id=G-XXXXXXXXXX"></script>
<script>
  window.dataLayer = window.dataLayer || [];
  function gtag(){dataLayer.push(arguments);}
  gtag('js', new Date());
  gtag('config', 'G-XXXXXXXXXX');
</script>
```

## Optimization Opportunities

### A/B Tests
1. Tutorial overlay vs. autoplay
2. End-of-demo CTA copy variations
3. Stock order (NVDA first vs. COIN first)
4. Playback speed defaults (1x vs. 10x)

### Engagement Improvements
- Add progress bar showing % complete
- Add "Skip to spike" button for impatient users
- Add share button (Twitter/LinkedIn with pre-filled text)
- Add "Download report" CTA (lead magnet)

### Conversion Improvements
- Show pricing inline after demo complete
- Offer "Talk to Sales" for enterprise
- Add social proof (testimonials) after outcome reveal
- Time-limited trial offer ("Start 14-day trial - ends in 2h")

## Next Steps

1. **Install Google Analytics** - Add measurement ID to production
2. **Set up conversion goals** - Map events to business objectives
3. **Build dashboard** - Vercel Analytics or Google Analytics custom dashboard
4. **Run first A/B test** - Tutorial overlay vs. autoplay
5. **Track cohorts** - Demo viewers → signups → active users → paying customers
