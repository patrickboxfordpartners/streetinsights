export interface FAQ {
  category: string;
  featured: boolean;
  question: string;
  answer: string;
}

export const faqs: FAQ[] = [
  // ── Signals & Sentiment ────────────────────────────────────────────────
  {
    category: "Signals & Sentiment",
    featured: true,
    question: "Can social media sentiment actually predict stock price movements?",
    answer:
      "Sometimes, yes. Academic research has found measurable correlation between sentiment shifts in engaged investor communities and short-term price movement. The key distinction: raw mention counts are noise. What matters is credibility-weighted sentiment shifting consistently across multiple sources over 24-48 hours. That pattern sometimes precedes price movement. Street Insights tracks the signal, not the noise.",
  },
  {
    category: "Signals & Sentiment",
    featured: true,
    question: "How do you tell real stock signals from Reddit hype?",
    answer:
      "Source credibility is the filter. A post from a two-week-old account with no track record means nothing. The same thesis from accounts with documented prediction accuracy across multiple tickers means something. Street Insights scores every source by historical track record, not follower count. That's the difference between hype detection and signal detection.",
  },
  {
    category: "Signals & Sentiment",
    featured: true,
    question: "What is sentiment shift detection and why does it matter?",
    answer:
      "A sentiment shift is when the tone of conversation around a ticker moves from neutral or negative to positive, or vice versa, across multiple credible sources in a short window. A sustained shift across credible sources is often a more reliable early signal than a volume spike. Street Insights monitors for shifts specifically, not just mentions.",
  },
  {
    category: "Signals & Sentiment",
    featured: false,
    question: "Which subreddits actually produce useful stock signals?",
    answer:
      "Quality varies significantly. Subreddits with longer track records, stricter moderation, and communities focused on specific sectors or methodologies tend to produce more reliable signals than high-volume meme communities. Street Insights tracks source quality over time so you see which communities have produced accurate signals historically, not just which ones are loudest.",
  },
  {
    category: "Signals & Sentiment",
    featured: false,
    question: "Does it work for small-cap tickers?",
    answer:
      "Yes, but the data volume is lower. The scanner pulls from StockTwits and Finnhub for any active ticker, not just the high-volume names. For very thinly traded stocks the spike detection is less useful since baseline mention counts are already near zero.",
  },

  // ── How It Works ───────────────────────────────────────────────────────
  {
    category: "How It Works",
    featured: true,
    question: "What does AI prediction extraction mean exactly?",
    answer:
      "When a mention contains language suggesting a price move — targets, timeframes, directional calls — Grok runs a structured bull/bear analysis. It scores the reasoning quality, extracts the target and timeframe, then marks the prediction correct or not once the target date passes. This builds a real track record for every source.",
  },
  {
    category: "How It Works",
    featured: false,
    question: "How is this different from just following FinTwit?",
    answer:
      "Street Insights tracks across Reddit, X, and news simultaneously, then scores every source by actual track record. You stop following accounts with high follower counts and start following accounts with high win rates. That filter alone changes what you read.",
  },
  {
    category: "How It Works",
    featured: false,
    question: "How does source credibility scoring work?",
    answer:
      "Every source starts with a neutral score. Each time a source makes a directional call with a target and timeframe, the outcome is recorded when the date passes. Correct calls raise the credibility score; incorrect ones lower it. Over time, the sources that survive have earned their score through actual market calls, not marketing.",
  },
  {
    category: "How It Works",
    featured: false,
    question: "How often is the data updated?",
    answer:
      "Mention scanning runs every 15 minutes. Spike detection runs hourly. Prediction extraction and validation run on their own schedules tied to market hours and prediction target dates. Alerts fire in real time as signals are detected.",
  },

  // ── Disclaimers ────────────────────────────────────────────────────────
  {
    category: "Disclaimers",
    featured: true,
    question: "Is this financial advice?",
    answer:
      "No. Street Insights surfaces data about what other people are saying and how accurate their past predictions have been. The decisions are entirely yours. Nothing on this platform constitutes investment advice, and past signal accuracy is not a guarantee of future results.",
  },
  {
    category: "Disclaimers",
    featured: false,
    question: "Can signal data be wrong?",
    answer:
      "Yes. Credibility scores reflect historical patterns, not guarantees. Markets can move on news, macro events, or factors entirely unrelated to social sentiment. Street Insights is one input, not a trading system.",
  },

  // ── Pricing & Access ───────────────────────────────────────────────────
  {
    category: "Pricing & Access",
    featured: false,
    question: "Can I cancel anytime?",
    answer:
      "Yes. No long-term contracts. You keep access through the end of your billing period.",
  },
  {
    category: "Pricing & Access",
    featured: false,
    question: "Is there a free tier?",
    answer:
      "Yes. You can explore the platform and see a limited view of signals before subscribing. The free tier lets you verify the product works for you before paying.",
  },
  {
    category: "Pricing & Access",
    featured: false,
    question: "What exchanges and markets are covered?",
    answer:
      "Street Insights currently covers US equities (NYSE and NASDAQ) and popular ETFs. Coverage expands based on what the community actively discusses. Crypto signals are monitored but kept separate from equity signals.",
  },
];

export const featuredFaqs = faqs.filter((f) => f.featured);
