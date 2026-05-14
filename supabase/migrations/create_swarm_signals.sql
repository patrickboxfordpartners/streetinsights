-- Vibe-Trading swarm sentiment signals
-- Stores daily composite scores per ticker from the sentiment_intelligence_team swarm

CREATE TABLE IF NOT EXISTS swarm_signals (
  id                    UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  ticker_id             UUID REFERENCES tickers(id) ON DELETE CASCADE,
  symbol                TEXT NOT NULL,
  run_date              DATE NOT NULL DEFAULT CURRENT_DATE,

  -- Composite
  composite_score       NUMERIC(6,2),        -- -100 to +100
  composite_label       TEXT,                -- Neutral, Optimistic, etc.
  historical_pct_1yr    INTEGER,             -- 0-100 percentile
  reversal_signal       TEXT,                -- NEUTRAL | LONG | SHORT

  -- Component scores
  news_score            NUMERIC(6,2),
  social_score          NUMERIC(6,2),
  flow_score            NUMERIC(6,2),

  -- Component weights
  news_weight           NUMERIC(4,2) DEFAULT 0.25,
  social_weight         NUMERIC(4,2) DEFAULT 0.35,
  flow_weight           NUMERIC(4,2) DEFAULT 0.40,

  -- Day-over-day deltas (null on first run)
  composite_delta       NUMERIC(6,2),
  news_delta            NUMERIC(6,2),
  social_delta          NUMERIC(6,2),
  flow_delta            NUMERIC(6,2),

  -- Key flags
  overheat_watch        BOOLEAN DEFAULT false,  -- social approaching 80
  reversal_triggered    BOOLEAN DEFAULT false,
  fear_greed_score      NUMERIC(6,2),

  -- Raw report text from each agent
  news_report           TEXT,
  social_report         TEXT,
  flow_report           TEXT,
  synthesis_report      TEXT,

  -- Metadata
  swarm_run_id          TEXT,               -- Vibe-Trading run ID for traceability
  model_used            TEXT DEFAULT 'grok-3-latest',
  created_at            TIMESTAMPTZ DEFAULT NOW(),

  -- One signal per ticker per day
  UNIQUE (symbol, run_date)
);

CREATE INDEX idx_swarm_signals_ticker ON swarm_signals(ticker_id);
CREATE INDEX idx_swarm_signals_symbol ON swarm_signals(symbol);
CREATE INDEX idx_swarm_signals_run_date ON swarm_signals(run_date DESC);
CREATE INDEX idx_swarm_signals_composite ON swarm_signals(composite_score);

-- RLS: anon can read, service role writes
ALTER TABLE swarm_signals ENABLE ROW LEVEL SECURITY;

CREATE POLICY "swarm_signals_read" ON swarm_signals
  FOR SELECT USING (true);

CREATE POLICY "swarm_signals_insert" ON swarm_signals
  FOR INSERT WITH CHECK (true);

CREATE POLICY "swarm_signals_update" ON swarm_signals
  FOR UPDATE USING (true);
