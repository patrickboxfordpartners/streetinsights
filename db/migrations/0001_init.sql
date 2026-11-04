-- Street Insights schema for Neon Postgres.
-- Apply this to an empty database. Do not run it against production from this repo.
-- Access control is the worker API (Clerk session + table allowlist). There is no RLS
-- and no auth.users foreign keys. User ids are Clerk ids (text), not UUIDs.

CREATE EXTENSION IF NOT EXISTS pgcrypto;

CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TABLE IF NOT EXISTS tickers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  symbol TEXT NOT NULL UNIQUE,
  company_name TEXT,
  sector TEXT,
  industry TEXT,
  market_cap BIGINT,
  avg_daily_mentions INTEGER DEFAULT 0,
  mention_spike_threshold INTEGER DEFAULT 20,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS sources (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  platform TEXT NOT NULL,
  username TEXT,
  source_type TEXT NOT NULL,
  follower_count INTEGER DEFAULT 0,
  credibility_score DECIMAL(5,2) DEFAULT 50.0,
  total_predictions INTEGER DEFAULT 0,
  correct_predictions INTEGER DEFAULT 0,
  accuracy_rate DECIMAL(5,2) DEFAULT 0.0,
  avg_days_to_target DECIMAL(8,2),
  uses_data_sources BOOLEAN DEFAULT false,
  reasoning_quality DECIMAL(3,2) DEFAULT 0.0,
  transparency_score DECIMAL(3,2) DEFAULT 0.0,
  bio TEXT,
  url TEXT,
  verified BOOLEAN DEFAULT false,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE (platform, username)
);

CREATE TABLE IF NOT EXISTS mentions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  ticker_id UUID NOT NULL REFERENCES tickers(id) ON DELETE CASCADE,
  source_id UUID REFERENCES sources(id) ON DELETE SET NULL,
  content TEXT NOT NULL,
  url TEXT,
  platform TEXT NOT NULL,
  mentioned_at TIMESTAMPTZ NOT NULL,
  detected_at TIMESTAMPTZ DEFAULT NOW(),
  engagement_score INTEGER DEFAULT 0,
  is_prediction BOOLEAN DEFAULT false,
  processed BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE (ticker_id, platform, url)
);

CREATE TABLE IF NOT EXISTS predictions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  ticker_id UUID NOT NULL REFERENCES tickers(id) ON DELETE CASCADE,
  source_id UUID NOT NULL REFERENCES sources(id) ON DELETE CASCADE,
  mention_id UUID REFERENCES mentions(id) ON DELETE SET NULL,
  sentiment TEXT NOT NULL CHECK (sentiment IN ('bullish', 'bearish', 'neutral')),
  price_target DECIMAL(12,2),
  timeframe_days INTEGER,
  confidence_level TEXT CHECK (confidence_level IN ('low', 'medium', 'high')),
  reasoning TEXT,
  data_sources_cited TEXT[],
  catalysts TEXT[],
  reasoning_quality_score DECIMAL(3,2),
  data_discipline_score DECIMAL(3,2),
  transparency_score DECIMAL(3,2),
  prediction_date TIMESTAMPTZ NOT NULL,
  target_date TIMESTAMPTZ,
  bull_case TEXT,
  bear_case TEXT,
  risks TEXT[] DEFAULT '{}',
  debate_rounds INTEGER DEFAULT 0,
  earnings_window BOOLEAN DEFAULT false,
  earnings_date DATE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS validations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  prediction_id UUID NOT NULL REFERENCES predictions(id) ON DELETE CASCADE,
  price_at_prediction DECIMAL(12,2) NOT NULL,
  price_at_validation DECIMAL(12,2) NOT NULL,
  price_change_percent DECIMAL(6,2) NOT NULL,
  was_correct BOOLEAN NOT NULL,
  accuracy_score DECIMAL(5,2) NOT NULL,
  days_to_outcome INTEGER,
  validation_date TIMESTAMPTZ NOT NULL,
  validation_method TEXT,
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS mention_frequency (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  ticker_id UUID NOT NULL REFERENCES tickers(id) ON DELETE CASCADE,
  date DATE NOT NULL,
  mention_count INTEGER DEFAULT 0,
  unique_sources INTEGER DEFAULT 0,
  avg_sentiment_score DECIMAL(4,2),
  spike_detected BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE (ticker_id, date)
);

CREATE TABLE IF NOT EXISTS scan_log (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  scan_type TEXT NOT NULL,
  status TEXT NOT NULL,
  mentions_found INTEGER DEFAULT 0,
  error_message TEXT,
  started_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  completed_at TIMESTAMPTZ
);

CREATE TABLE IF NOT EXISTS user_profiles (
  id TEXT PRIMARY KEY,
  email TEXT NOT NULL,
  full_name TEXT,
  plan TEXT NOT NULL DEFAULT 'free' CHECK (plan IN ('free', 'pro', 'enterprise')),
  subscription_status TEXT NOT NULL DEFAULT 'inactive' CHECK (subscription_status IN ('active', 'inactive', 'canceled', 'past_due', 'trialing')),
  stripe_customer_id TEXT UNIQUE,
  stripe_subscription_id TEXT UNIQUE,
  api_calls_this_month INTEGER DEFAULT 0,
  api_calls_limit INTEGER DEFAULT 100,
  trial_ends_at TIMESTAMPTZ,
  subscription_ends_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS user_watchlist (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id TEXT NOT NULL REFERENCES user_profiles(id) ON DELETE CASCADE,
  ticker_id UUID NOT NULL REFERENCES tickers(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE (user_id, ticker_id)
);

CREATE TABLE IF NOT EXISTS user_ticker_tracking (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id TEXT NOT NULL REFERENCES user_profiles(id) ON DELETE CASCADE,
  ticker_id UUID NOT NULL REFERENCES tickers(id) ON DELETE CASCADE,
  alert_enabled BOOLEAN DEFAULT true,
  alert_threshold INTEGER DEFAULT 50,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE (user_id, ticker_id)
);

CREATE TABLE IF NOT EXISTS source_follows (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id TEXT NOT NULL REFERENCES user_profiles(id) ON DELETE CASCADE,
  source_id UUID NOT NULL REFERENCES sources(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE (user_id, source_id)
);

CREATE TABLE IF NOT EXISTS alert_preferences (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id TEXT UNIQUE REFERENCES user_profiles(id) ON DELETE CASCADE,
  spike_alerts_enabled BOOLEAN DEFAULT true,
  prediction_alerts_enabled BOOLEAN DEFAULT true,
  daily_digest_enabled BOOLEAN DEFAULT false,
  spike_mention_threshold INTEGER DEFAULT 20,
  prediction_confidence_threshold INTEGER DEFAULT 70,
  email_enabled BOOLEAN DEFAULT true,
  email_address TEXT,
  webhook_enabled BOOLEAN DEFAULT false,
  webhook_url TEXT,
  telegram_enabled BOOLEAN DEFAULT false,
  telegram_chat_id TEXT,
  discord_enabled BOOLEAN DEFAULT false,
  discord_webhook_url TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS alert_log (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  alert_type TEXT NOT NULL,
  user_id TEXT REFERENCES user_profiles(id) ON DELETE CASCADE,
  ticker_symbol TEXT,
  subject TEXT NOT NULL,
  message TEXT NOT NULL,
  metadata JSONB,
  status TEXT DEFAULT 'pending',
  delivery_channel TEXT,
  error_message TEXT,
  sent_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS content_drafts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  source TEXT NOT NULL DEFAULT 'market-signals',
  type TEXT NOT NULL DEFAULT 'linkedin',
  title TEXT,
  body TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'draft',
  metadata JSONB DEFAULT '{}',
  published_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS debates (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  topic_title TEXT,
  topic_category TEXT,
  personas JSONB,
  transcript JSONB,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS government_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title TEXT NOT NULL,
  description TEXT,
  event_type TEXT NOT NULL,
  source_category TEXT NOT NULL,
  event_date TIMESTAMPTZ NOT NULL,
  event_end_date TIMESTAMPTZ,
  all_day BOOLEAN DEFAULT false,
  source_url TEXT,
  source_feed TEXT NOT NULL,
  external_id TEXT NOT NULL,
  status TEXT DEFAULT 'upcoming',
  participants TEXT[] DEFAULT '{}',
  related_topics TEXT[] DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE (source_feed, external_id)
);

CREATE TABLE IF NOT EXISTS event_impact_scores (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  event_id UUID NOT NULL REFERENCES government_events(id) ON DELETE CASCADE,
  impact_magnitude NUMERIC NOT NULL,
  impact_direction TEXT NOT NULL,
  confidence NUMERIC DEFAULT 0,
  timeframe TEXT DEFAULT '',
  affected_sectors TEXT[] DEFAULT '{}',
  affected_tickers TEXT[] DEFAULT '{}',
  reasoning TEXT DEFAULT '',
  key_factors TEXT[] DEFAULT '{}',
  historical_precedent TEXT DEFAULT '',
  model_provider TEXT,
  model_name TEXT,
  is_latest BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS event_validations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  event_id UUID NOT NULL REFERENCES government_events(id) ON DELETE CASCADE,
  score_id UUID NOT NULL REFERENCES event_impact_scores(id) ON DELETE CASCADE,
  actual_direction TEXT NOT NULL,
  actual_magnitude NUMERIC,
  ticker_outcomes JSONB DEFAULT '[]',
  sector_outcomes JSONB DEFAULT '[]',
  direction_correct BOOLEAN,
  magnitude_error NUMERIC,
  ticker_accuracy_pct NUMERIC,
  sector_accuracy_pct NUMERIC,
  overall_score NUMERIC,
  validation_window_hours INTEGER DEFAULT 24,
  validated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS swarm_signals (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  ticker_id UUID REFERENCES tickers(id) ON DELETE CASCADE,
  symbol TEXT NOT NULL,
  run_date DATE NOT NULL DEFAULT CURRENT_DATE,
  composite_score NUMERIC(6,2),
  composite_label TEXT,
  historical_pct_1yr INTEGER,
  reversal_signal TEXT,
  news_score NUMERIC(6,2),
  social_score NUMERIC(6,2),
  flow_score NUMERIC(6,2),
  news_weight NUMERIC(4,2) DEFAULT 0.25,
  social_weight NUMERIC(4,2) DEFAULT 0.35,
  flow_weight NUMERIC(4,2) DEFAULT 0.40,
  composite_delta NUMERIC(6,2),
  news_delta NUMERIC(6,2),
  social_delta NUMERIC(6,2),
  flow_delta NUMERIC(6,2),
  overheat_watch BOOLEAN DEFAULT false,
  reversal_triggered BOOLEAN DEFAULT false,
  fear_greed_score NUMERIC(6,2),
  news_report TEXT,
  social_report TEXT,
  flow_report TEXT,
  synthesis_report TEXT,
  swarm_run_id TEXT,
  model_used TEXT DEFAULT 'grok-3-latest',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE (symbol, run_date)
);

CREATE TABLE IF NOT EXISTS options_flow (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  ticker_id UUID REFERENCES tickers(id) ON DELETE CASCADE,
  symbol TEXT NOT NULL,
  contract_type TEXT NOT NULL CHECK (contract_type IN ('call', 'put')),
  strike_price NUMERIC,
  expiration_date DATE,
  open_interest INTEGER,
  volume INTEGER,
  implied_volatility NUMERIC,
  premium NUMERIC,
  sentiment TEXT CHECK (sentiment IN ('bullish', 'bearish', 'neutral')),
  unusual_score NUMERIC,
  source TEXT DEFAULT 'unusualwhales',
  detected_at TIMESTAMPTZ DEFAULT NOW(),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS model_predictions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  ticker_id UUID REFERENCES tickers(id) ON DELETE CASCADE,
  model_type TEXT NOT NULL,
  prediction_direction TEXT,
  confidence_score DECIMAL(3,2),
  predicted_magnitude DECIMAL(5,2),
  features JSONB,
  model_version TEXT,
  trained_at TIMESTAMPTZ,
  actual_direction TEXT,
  actual_magnitude DECIMAL(5,2),
  was_correct BOOLEAN,
  validated_at TIMESTAMPTZ,
  prediction_date TIMESTAMPTZ NOT NULL,
  target_date TIMESTAMPTZ NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE (ticker_id, model_type, prediction_date)
);

CREATE TABLE IF NOT EXISTS model_configs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  model_type TEXT NOT NULL,
  model_version TEXT NOT NULL,
  config JSONB NOT NULL,
  training_samples INTEGER,
  training_date_range TSTZRANGE,
  accuracy DECIMAL(4,3),
  precision DECIMAL(4,3),
  recall DECIMAL(4,3),
  f1_score DECIMAL(4,3),
  metrics_by_class JSONB,
  is_active BOOLEAN DEFAULT true,
  trained_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE (model_type, model_version)
);

CREATE TABLE IF NOT EXISTS model_training_data (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  ticker_id UUID REFERENCES tickers(id) ON DELETE CASCADE,
  features JSONB NOT NULL,
  target_direction TEXT NOT NULL,
  target_magnitude DECIMAL(5,2) NOT NULL,
  observation_date DATE NOT NULL,
  target_date DATE NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE (ticker_id, observation_date, target_date)
);

CREATE TABLE IF NOT EXISTS ai_agent_personas (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL UNIQUE,
  slug TEXT NOT NULL UNIQUE,
  description TEXT NOT NULL,
  framework TEXT NOT NULL,
  prompt_template TEXT NOT NULL,
  display_order INTEGER DEFAULT 0,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS ai_agent_analyses (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  ticker_id UUID NOT NULL REFERENCES tickers(id) ON DELETE CASCADE,
  agent_persona_id UUID NOT NULL REFERENCES ai_agent_personas(id) ON DELETE CASCADE,
  sentiment TEXT NOT NULL CHECK (sentiment IN ('bullish', 'bearish', 'neutral', 'hold')),
  confidence_score DECIMAL(5,2) CHECK (confidence_score >= 0 AND confidence_score <= 100),
  analysis_text TEXT NOT NULL,
  key_factors TEXT[],
  risks TEXT[],
  recommendation TEXT,
  analyzed_at TIMESTAMPTZ DEFAULT NOW(),
  price_at_analysis DECIMAL(12,2),
  ttl_hours INTEGER DEFAULT 24,
  expires_at TIMESTAMPTZ DEFAULT NOW() + INTERVAL '24 hours',
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE UNIQUE INDEX IF NOT EXISTS ai_agent_analyses_one_per_day
  ON ai_agent_analyses (ticker_id, agent_persona_id, ((analyzed_at AT TIME ZONE 'UTC')::date));

CREATE INDEX IF NOT EXISTS idx_tickers_symbol ON tickers(symbol);
CREATE INDEX IF NOT EXISTS idx_tickers_active ON tickers(is_active) WHERE is_active = true;
CREATE INDEX IF NOT EXISTS idx_sources_platform_username ON sources(platform, username);
CREATE INDEX IF NOT EXISTS idx_sources_credibility ON sources(credibility_score DESC);
CREATE INDEX IF NOT EXISTS idx_sources_accuracy ON sources(accuracy_rate DESC);
CREATE INDEX IF NOT EXISTS idx_mentions_ticker ON mentions(ticker_id);
CREATE INDEX IF NOT EXISTS idx_mentions_source ON mentions(source_id);
CREATE INDEX IF NOT EXISTS idx_mentions_mentioned_at ON mentions(mentioned_at DESC);
CREATE INDEX IF NOT EXISTS idx_mentions_platform ON mentions(platform);
CREATE INDEX IF NOT EXISTS idx_mentions_unprocessed ON mentions(processed) WHERE processed = false;
CREATE INDEX IF NOT EXISTS idx_mentions_adanos ON mentions (ticker_id, mentioned_at DESC) WHERE platform = 'adanos';
CREATE INDEX IF NOT EXISTS idx_predictions_ticker ON predictions(ticker_id);
CREATE INDEX IF NOT EXISTS idx_predictions_source ON predictions(source_id);
CREATE INDEX IF NOT EXISTS idx_predictions_date ON predictions(prediction_date DESC);
CREATE INDEX IF NOT EXISTS idx_predictions_ticker_date ON predictions(ticker_id, prediction_date DESC);
CREATE INDEX IF NOT EXISTS idx_validations_prediction ON validations(prediction_id);
CREATE INDEX IF NOT EXISTS idx_mention_frequency_ticker_date ON mention_frequency(ticker_id, date DESC);
CREATE INDEX IF NOT EXISTS idx_mention_frequency_spikes ON mention_frequency(spike_detected) WHERE spike_detected = true;
CREATE INDEX IF NOT EXISTS idx_user_profiles_stripe_customer ON user_profiles(stripe_customer_id);
CREATE INDEX IF NOT EXISTS idx_user_watchlist_user ON user_watchlist(user_id);
CREATE INDEX IF NOT EXISTS idx_source_follows_user ON source_follows(user_id);
CREATE INDEX IF NOT EXISTS idx_alert_log_user ON alert_log(user_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_content_drafts_created ON content_drafts(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_government_events_date ON government_events(event_date DESC);
CREATE INDEX IF NOT EXISTS idx_event_impact_event ON event_impact_scores(event_id);
CREATE INDEX IF NOT EXISTS idx_swarm_signals_symbol_date ON swarm_signals(symbol, run_date DESC);
CREATE INDEX IF NOT EXISTS idx_options_flow_detected ON options_flow(detected_at DESC);
CREATE INDEX IF NOT EXISTS idx_model_predictions_ticker ON model_predictions(ticker_id, prediction_date DESC);
CREATE INDEX IF NOT EXISTS idx_ai_agent_analyses_ticker ON ai_agent_analyses(ticker_id, expires_at);

DROP TRIGGER IF EXISTS update_tickers_updated_at ON tickers;
CREATE TRIGGER update_tickers_updated_at BEFORE UPDATE ON tickers
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_sources_updated_at ON sources;
CREATE TRIGGER update_sources_updated_at BEFORE UPDATE ON sources
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_predictions_updated_at ON predictions;
CREATE TRIGGER update_predictions_updated_at BEFORE UPDATE ON predictions
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_user_profiles_updated_at ON user_profiles;
CREATE TRIGGER update_user_profiles_updated_at BEFORE UPDATE ON user_profiles
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE OR REPLACE FUNCTION update_source_credibility()
RETURNS TRIGGER AS $$
DECLARE
  source_uuid UUID;
BEGIN
  SELECT source_id INTO source_uuid FROM predictions WHERE id = NEW.prediction_id;
  UPDATE sources
  SET
    total_predictions = (
      SELECT COUNT(*) FROM predictions p
      JOIN validations v ON v.prediction_id = p.id
      WHERE p.source_id = source_uuid
    ),
    correct_predictions = (
      SELECT COUNT(*) FROM predictions p
      JOIN validations v ON v.prediction_id = p.id
      WHERE p.source_id = source_uuid AND v.was_correct = true
    ),
    accuracy_rate = (
      SELECT ROUND(
        (COUNT(*) FILTER (WHERE v.was_correct = true)::DECIMAL / NULLIF(COUNT(*), 0)::DECIMAL) * 100,
        2
      )
      FROM predictions p
      JOIN validations v ON v.prediction_id = p.id
      WHERE p.source_id = source_uuid
    ),
    avg_days_to_target = (
      SELECT AVG(v.days_to_outcome)
      FROM predictions p
      JOIN validations v ON v.prediction_id = p.id
      WHERE p.source_id = source_uuid
    )
  WHERE id = source_uuid;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_update_source_credibility ON validations;
CREATE TRIGGER trigger_update_source_credibility
  AFTER INSERT ON validations
  FOR EACH ROW
  EXECUTE FUNCTION update_source_credibility();

INSERT INTO sources (name, platform, username, source_type, follower_count, verified)
VALUES
  ('Adanos — Reddit', 'adanos', 'reddit', 'publication', 0, true),
  ('Adanos — X', 'adanos', 'x', 'publication', 0, true),
  ('Adanos — News', 'adanos', 'news', 'publication', 0, true),
  ('Adanos — Polymarket', 'adanos', 'polymarket', 'publication', 0, true)
ON CONFLICT (platform, username) DO NOTHING;

INSERT INTO ai_agent_personas (name, slug, description, framework, prompt_template, display_order) VALUES
(
  'Warren Buffett',
  'buffett',
  'Value investor focused on intrinsic value, moats, and long-term competitive advantages',
  'Seeks wonderful companies at fair prices with durable competitive advantages',
  'You are Warren Buffett, the legendary value investor. Analyze {symbol} ({company_name}) based on:
1. Intrinsic value vs. market price
2. Economic moat and competitive advantages
3. Management quality and capital allocation
4. Business simplicity and understandability
5. Margin of safety

Focus on long-term business fundamentals. Be skeptical of hype and short-term noise.
Current data: {context}

Provide: sentiment (bullish/bearish/neutral/hold), confidence (0-100), 3-5 key factors, 2-3 risks, and recommendation.',
  1
),
(
  'Peter Lynch',
  'lynch',
  'Growth-at-reasonable-price investor who looks for undervalued growth opportunities',
  'Buy what you know, focus on PEG ratio and growth potential',
  'You are Peter Lynch, renowned for finding multi-baggers and GARP investing. Analyze {symbol} ({company_name}) based on:
1. PEG ratio (Price/Earnings to Growth)
2. Earnings growth trajectory
3. Industry tailwinds
4. Company story and business model clarity
5. Retail investor accessibility

Look for "ten-baggers" trading at reasonable valuations. Consider whether the average person can understand this business.
Current data: {context}

Provide: sentiment (bullish/bearish/neutral/hold), confidence (0-100), 3-5 key factors, 2-3 risks, and recommendation.',
  2
),
(
  'Benjamin Graham',
  'graham',
  'Father of value investing, focused on balance sheet strength and margin of safety',
  'Strict quantitative value investing with focus on net-net stocks',
  'You are Benjamin Graham, father of value investing. Analyze {symbol} ({company_name}) based on:
1. Balance sheet strength (assets vs. liabilities)
2. P/E ratio and P/B ratio
3. Debt levels and financial stability
4. Margin of safety (intrinsic value vs. market price)
5. Dividend history and coverage

Apply strict quantitative criteria. Be conservative and focus on downside protection.
Current data: {context}

Provide: sentiment (bullish/bearish/neutral/hold), confidence (0-100), 3-5 key factors, 2-3 risks, and recommendation.',
  3
),
(
  'Charlie Munger',
  'munger',
  'Multi-disciplinary thinker focused on business quality and mental models',
  'Invert, always invert. Focus on avoiding stupidity over seeking brilliance',
  'You are Charlie Munger, Warren Buffett''s partner and multi-disciplinary thinker. Analyze {symbol} ({company_name}) based on:
1. Business quality and rationality
2. Mental models (inversion, second-order thinking)
3. Management incentives and behavior
4. Competitive dynamics and industry structure
5. What could go catastrophically wrong?

Use a multi-disciplinary approach. Focus on avoiding big mistakes rather than making brilliant moves.
Current data: {context}

Provide: sentiment (bullish/bearish/neutral/hold), confidence (0-100), 3-5 key factors, 2-3 risks, and recommendation.',
  4
),
(
  'Seth Klarman',
  'klarman',
  'Absolute return investor focused on risk management and special situations',
  'Risk-averse value investor seeking asymmetric risk/reward',
  'You are Seth Klarman, legendary risk-averse value investor. Analyze {symbol} ({company_name}) based on:
1. Risk/reward asymmetry
2. Downside protection and margin of safety
3. Special situations or catalysts
4. Liquidity and market inefficiencies
5. Absolute return potential (not relative to index)

Be highly risk-averse. Only recommend investments with limited downside and significant upside.
Current data: {context}

Provide: sentiment (bullish/bearish/neutral/hold), confidence (0-100), 3-5 key factors, 2-3 risks, and recommendation.',
  5
),
(
  'Howard Marks',
  'marks',
  'Contrarian investor focused on market cycles and risk assessment',
  'Second-level thinking and contrarian positioning',
  'You are Howard Marks, renowned for market cycle analysis and risk management. Analyze {symbol} ({company_name}) based on:
1. Where are we in the market cycle?
2. What is the market''s current psychology?
3. Second-level thinking (what do others miss?)
4. Risk vs. uncertainty
5. Contrarian opportunities

Focus on market sentiment, positioning, and what others are overlooking. Be skeptical of consensus.
Current data: {context}

Provide: sentiment (bullish/bearish/neutral/hold), confidence (0-100), 3-5 key factors, 2-3 risks, and recommendation.',
  6
)
ON CONFLICT (slug) DO NOTHING;
