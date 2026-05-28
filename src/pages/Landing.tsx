import { Link } from 'react-router-dom';
import { useEffect, useRef, useState, type FormEvent } from 'react';
import logoIcon from '../assets/logo-icon.png';

// ── Animated counter ─────────────────────────────────────────────────────────
function Counter({ end, suffix = '', prefix = '' }: { end: number; suffix?: string; prefix?: string }) {
  const [count, setCount] = useState(0);
  const started = useRef(false);
  const ref = useRef<HTMLSpanElement>(null);

  useEffect(() => {
    const run = () => {
      if (started.current) return;
      started.current = true;
      const duration = 2000;
      const start = performance.now();
      const animate = (now: number) => {
        const progress = Math.min((now - start) / duration, 1);
        const eased = 1 - Math.pow(1 - progress, 3);
        setCount(Math.floor(eased * end));
        if (progress < 1) requestAnimationFrame(animate);
      };
      requestAnimationFrame(animate);
    };

    const observer = new IntersectionObserver(([e]) => { if (e.isIntersecting) run(); }, { threshold: 0 });
    if (ref.current) observer.observe(ref.current);
    const fallback = setTimeout(run, 400);
    return () => { observer.disconnect(); clearTimeout(fallback); };
  }, [end]);

  return <span ref={ref}>{prefix}{count.toLocaleString()}{suffix}</span>;
}

// ── Ticker bar ────────────────────────────────────────────────────────────────
const TICKERS = [
  { symbol: 'TSLA', change: '+2.3%', mentions: '847', spike: '+23%', up: true },
  { symbol: 'NVDA', change: '+1.8%', mentions: '1,204', spike: '+45%', up: true },
  { symbol: 'AAPL', change: '-0.5%', mentions: '623', spike: '-12%', up: false },
  { symbol: 'AMD', change: '+3.1%', mentions: '956', spike: '+67%', up: true },
  { symbol: 'MSFT', change: '+0.9%', mentions: '542', spike: '+8%', up: true },
  { symbol: 'PLTR', change: '+4.2%', mentions: '1,103', spike: '+89%', up: true },
  { symbol: 'SPY', change: '+0.3%', mentions: '734', spike: '+15%', up: true },
  { symbol: 'QQQ', change: '+0.7%', mentions: '489', spike: '+22%', up: true },
];

function TickerBar() {
  return (
    <div className="border-y border-gray-800 bg-gray-900/50 py-2.5 overflow-hidden">
      <div className="flex gap-8 animate-marquee whitespace-nowrap" style={{ animation: 'marquee 30s linear infinite' }}>
        {[...TICKERS, ...TICKERS].map((t, i) => (
          <div key={i} className="inline-flex items-center gap-2 text-sm shrink-0">
            <span className="font-bold text-white">{t.symbol}</span>
            <span className={t.up ? 'text-emerald-400' : 'text-red-400'}>{t.change}</span>
            <span className="text-gray-500">•</span>
            <span className="text-gray-400">{t.mentions} mentions</span>
            <span className={`text-xs px-1.5 py-0.5 rounded ${t.up ? 'bg-emerald-500/10 text-emerald-400' : 'bg-red-500/10 text-red-400'}`}>
              ({t.spike})
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}

// ── Dashboard mockup ──────────────────────────────────────────────────────────
const ALL_SIGNALS = [
  { symbol: 'NVDA', sentiment: 'Bullish', confidence: 92, source: 'r/wallstreetbets', mentions: 1204, spike: '+45%', color: 'emerald', age: '1m' },
  { symbol: 'AMD', sentiment: 'Bullish', confidence: 78, source: '@OptionsFlow', mentions: 956, spike: '+67%', color: 'emerald', age: '3m' },
  { symbol: 'AAPL', sentiment: 'Bearish', confidence: 65, source: 'Financial News', mentions: 623, spike: '-12%', color: 'red', age: '5m' },
  { symbol: 'TSLA', sentiment: 'Bullish', confidence: 84, source: 'r/investing', mentions: 847, spike: '+23%', color: 'emerald', age: '7m' },
  { symbol: 'PLTR', sentiment: 'Bullish', confidence: 88, source: '@OptionsFlow', mentions: 1103, spike: '+89%', color: 'emerald', age: '9m' },
];

const PREDICTIONS = [
  { symbol: 'NVDA', target: '$1,100', timeframe: '2 weeks', confidence: 87, outcome: 'pending', analyst: 'u/DeepValueDave' },
  { symbol: 'TSLA', target: '$280', timeframe: '1 month', confidence: 73, outcome: 'hit', analyst: '@SentimentSam' },
  { symbol: 'AMD', target: '$195', timeframe: '3 weeks', confidence: 81, outcome: 'pending', analyst: 'r/stocks top post' },
];

const SOURCES = [
  { name: 'u/DeepValueDave', platform: 'Reddit', winRate: '74%', calls: 43, grade: 'A', color: 'emerald' },
  { name: '@OptionsFlow', platform: 'X', winRate: '68%', calls: 127, grade: 'B+', color: 'blue' },
  { name: 'r/wallstreetbets', platform: 'Reddit', winRate: '61%', calls: 892, grade: 'B', color: 'purple' },
];

const ALERTS_FEED = [
  { symbol: 'NVDA', msg: 'Spike detected: +45% mention volume', age: '2m ago' },
  { symbol: 'PLTR', msg: 'New prediction: $42 target, 2 weeks', age: '5m ago' },
  { symbol: 'AMD', msg: 'Source alert: u/DeepValueDave posted', age: '11m ago' },
  { symbol: 'TSLA', msg: 'Spike detected: +23% mention volume', age: '18m ago' },
  { symbol: 'AAPL', msg: 'Bearish signal: -12% spike confirmed', age: '22m ago' },
];

const SIDEBAR_TABS = ['Overview', 'Live Signals', 'Predictions', 'Sources', 'Alerts', 'Backtest'];

const URL_MAP: Record<string, string> = {
  'Overview': 'dashboard',
  'Live Signals': 'signals',
  'Predictions': 'predictions',
  'Sources': 'sources',
  'Alerts': 'alerts',
  'Backtest': 'backtest',
};

function DashboardMockup() {
  const [activeTab, setActiveTab] = useState('Live Signals');
  const [visibleSignals, setVisibleSignals] = useState(ALL_SIGNALS.slice(0, 3));
  const [alertIdx, setAlertIdx] = useState(0);
  const [alertVisible, setAlertVisible] = useState(true);
  const [tickerInput, setTickerInput] = useState('');
  const [tickerResult, setTickerResult] = useState<{ symbol: string; sentiment: string; confidence: number; mentions: number; spike: string; up: boolean } | null>(null);

  const TICKER_DB: Record<string, { sentiment: string; confidence: number; mentions: number; spike: string; up: boolean }> = {
    NVDA: { sentiment: 'Bullish', confidence: 92, mentions: 1204, spike: '+45%', up: true },
    AMD: { sentiment: 'Bullish', confidence: 78, mentions: 956, spike: '+67%', up: true },
    AAPL: { sentiment: 'Bearish', confidence: 65, mentions: 623, spike: '-12%', up: false },
    TSLA: { sentiment: 'Bullish', confidence: 84, mentions: 847, spike: '+23%', up: true },
    PLTR: { sentiment: 'Bullish', confidence: 88, mentions: 1103, spike: '+89%', up: true },
    MSFT: { sentiment: 'Bullish', confidence: 71, mentions: 542, spike: '+8%', up: true },
    SPY: { sentiment: 'Neutral', confidence: 58, mentions: 734, spike: '+15%', up: true },
    QQQ: { sentiment: 'Bullish', confidence: 66, mentions: 489, spike: '+22%', up: true },
  };

  useEffect(() => {
    if (activeTab !== 'Live Signals') return;
    const id = setInterval(() => {
      setVisibleSignals((prev) => {
        const next = ALL_SIGNALS[(ALL_SIGNALS.indexOf(prev[0]) + 1) % ALL_SIGNALS.length];
        return [next, ...prev.slice(0, 2)];
      });
    }, 2500);
    return () => clearInterval(id);
  }, [activeTab]);

  useEffect(() => {
    const id = setInterval(() => {
      setAlertVisible(false);
      setTimeout(() => {
        setAlertIdx((i) => (i + 1) % ALERTS_FEED.length);
        setAlertVisible(true);
      }, 400);
    }, 3500);
    return () => clearInterval(id);
  }, []);

  function handleTickerLookup(e: FormEvent) {
    e.preventDefault();
    const sym = tickerInput.trim().toUpperCase();
    const data = TICKER_DB[sym];
    if (data) {
      setTickerResult({ symbol: sym, ...data });
    } else {
      setTickerResult({ symbol: sym, sentiment: 'Low Activity', confidence: 12, mentions: 7, spike: '+1%', up: true });
    }
  }

  const alert = ALERTS_FEED[alertIdx];

  return (
    <div className="space-y-8">
      {/* Ticker lookup widget */}
      <div className="max-w-sm mx-auto">
        <form onSubmit={handleTickerLookup} className="flex gap-2">
          <input
            type="text"
            value={tickerInput}
            onChange={(e) => { setTickerInput(e.target.value); setTickerResult(null); }}
            placeholder="Try NVDA, TSLA, AMD..."
            className="flex-1 bg-gray-900 border border-gray-700 rounded-lg px-4 py-2.5 text-sm text-white placeholder:text-gray-600 focus:outline-none focus:border-emerald-500 font-mono uppercase"
            maxLength={6}
          />
          <button type="submit" className="px-4 py-2.5 bg-emerald-600 hover:bg-emerald-700 rounded-lg text-sm font-semibold transition-colors">
            Look up
          </button>
        </form>
        {tickerResult && (
          <div className="mt-2 bg-gray-900 border border-gray-800 rounded-lg px-4 py-3 flex items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <span className={`text-xs font-bold px-2 py-0.5 rounded ${tickerResult.up ? 'bg-emerald-500/10 text-emerald-400' : 'bg-red-500/10 text-red-400'}`}>{tickerResult.symbol}</span>
              <span className={`text-sm font-semibold ${tickerResult.up ? 'text-emerald-400' : 'text-red-400'}`}>{tickerResult.sentiment}</span>
            </div>
            <div className="flex items-center gap-4 text-xs text-gray-400">
              <span>{tickerResult.mentions.toLocaleString()} mentions</span>
              <span className={tickerResult.up ? 'text-emerald-400 font-semibold' : 'text-red-400 font-semibold'}>{tickerResult.spike} spike</span>
              <span className="text-gray-600">{tickerResult.confidence}% conf.</span>
            </div>
          </div>
        )}
      </div>

      <div className="relative mx-auto max-w-4xl">
        {/* Glow */}
        <div className="absolute -inset-4 rounded-3xl bg-gradient-to-br from-emerald-500/10 via-transparent to-purple-500/5 blur-2xl pointer-events-none" />

        {/* Browser chrome */}
        <div className="relative rounded-2xl overflow-hidden border border-gray-700/60 shadow-2xl shadow-black/40">
          {/* Title bar */}
          <div className="bg-gray-900 border-b border-gray-800 px-4 py-3 flex items-center gap-3">
            <div className="flex gap-1.5">
              <div className="w-3 h-3 rounded-full bg-red-500/70" />
              <div className="w-3 h-3 rounded-full bg-amber-500/70" />
              <div className="w-3 h-3 rounded-full bg-green-500/70" />
            </div>
            <div className="flex-1 max-w-xs mx-auto bg-gray-800 rounded px-3 py-1 text-xs text-gray-400 text-center font-mono">
              app.getstreetinsights.com/{URL_MAP[activeTab] ?? 'signals'}
            </div>
          </div>

          {/* App */}
          <div className="bg-gray-950 flex h-80">
            {/* Sidebar */}
            <div className="w-44 bg-gray-900 border-r border-gray-800 p-3 space-y-1 shrink-0">
              {SIDEBAR_TABS.map((item) => {
                const active = item === activeTab;
                return (
                  <button
                    key={item}
                    onClick={() => setActiveTab(item)}
                    className={`w-full flex items-center gap-2 px-2.5 py-1.5 rounded text-xs font-medium transition-colors text-left ${active ? 'bg-emerald-500/10 text-emerald-400' : 'text-gray-500 hover:text-gray-300 hover:bg-gray-800'}`}
                  >
                    <div className={`w-1.5 h-1.5 rounded-full shrink-0 ${active ? 'bg-emerald-400' : 'bg-gray-700'}`} />
                    {item}
                  </button>
                );
              })}
            </div>

            {/* Content */}
            <div className="flex-1 p-4 overflow-hidden">
              {/* Live Signals tab */}
              {activeTab === 'Live Signals' && (
                <>
                  <div className="flex items-center justify-between mb-3">
                    <h3 className="text-sm font-semibold text-white">Live Signals</h3>
                    <div className="flex items-center gap-1.5 text-xs text-emerald-400">
                      <span className="relative flex h-1.5 w-1.5">
                        <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75" />
                        <span className="relative inline-flex rounded-full h-1.5 w-1.5 bg-emerald-500" />
                      </span>
                      Live
                    </div>
                  </div>
                  <div className="space-y-2">
                    {visibleSignals.map((s, idx) => (
                      <div key={`${s.symbol}-${idx}`} className="bg-gray-900 border border-gray-800 rounded-lg p-3 flex items-center gap-3">
                        <div className={`text-xs font-bold px-2 py-0.5 rounded shrink-0 ${s.color === 'emerald' ? 'bg-emerald-500/10 text-emerald-400' : 'bg-red-500/10 text-red-400'}`}>
                          {s.symbol}
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2">
                            <span className={`text-xs font-medium ${s.color === 'emerald' ? 'text-emerald-400' : 'text-red-400'}`}>{s.sentiment}</span>
                            <div className="flex-1 h-1 bg-gray-800 rounded-full overflow-hidden">
                              <div className={`h-full rounded-full transition-all duration-700 ${s.color === 'emerald' ? 'bg-emerald-500' : 'bg-red-500'}`} style={{ width: `${s.confidence}%` }} />
                            </div>
                            <span className="text-xs text-gray-500">{s.confidence}%</span>
                          </div>
                          <p className="text-[10px] text-gray-600 truncate mt-0.5">{s.source} · {s.mentions} mentions</p>
                        </div>
                        <div className="flex flex-col items-end shrink-0 gap-0.5">
                          <span className={`text-xs font-semibold ${s.color === 'emerald' ? 'text-emerald-400' : 'text-red-400'}`}>{s.spike}</span>
                          <span className="text-[10px] text-gray-700">{s.age} ago</span>
                        </div>
                      </div>
                    ))}
                  </div>
                </>
              )}

              {/* Predictions tab */}
              {activeTab === 'Predictions' && (
                <>
                  <div className="flex items-center justify-between mb-3">
                    <h3 className="text-sm font-semibold text-white">AI-Extracted Predictions</h3>
                    <span className="text-[10px] text-gray-500">Updated 1m ago</span>
                  </div>
                  <div className="space-y-2">
                    {PREDICTIONS.map((p) => (
                      <div key={p.symbol} className="bg-gray-900 border border-gray-800 rounded-lg p-3">
                        <div className="flex items-center justify-between mb-1.5">
                          <div className="flex items-center gap-2">
                            <span className="text-xs font-bold bg-blue-500/10 text-blue-400 px-2 py-0.5 rounded">{p.symbol}</span>
                            <span className="text-xs text-white font-semibold">{p.target}</span>
                            <span className="text-[10px] text-gray-600">in {p.timeframe}</span>
                          </div>
                          <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded ${p.outcome === 'hit' ? 'bg-emerald-500/10 text-emerald-400' : 'bg-gray-700 text-gray-400'}`}>
                            {p.outcome === 'hit' ? '✓ Hit' : 'Pending'}
                          </span>
                        </div>
                        <div className="flex items-center gap-2">
                          <div className="flex-1 h-1 bg-gray-800 rounded-full overflow-hidden">
                            <div className="h-full bg-blue-500 rounded-full" style={{ width: `${p.confidence}%` }} />
                          </div>
                          <span className="text-[10px] text-gray-500">{p.confidence}%</span>
                          <span className="text-[10px] text-gray-700 truncate max-w-24">{p.analyst}</span>
                        </div>
                      </div>
                    ))}
                  </div>
                </>
              )}

              {/* Sources tab */}
              {activeTab === 'Sources' && (
                <>
                  <div className="flex items-center justify-between mb-3">
                    <h3 className="text-sm font-semibold text-white">Source Leaderboard</h3>
                    <span className="text-[10px] text-gray-500">By win rate</span>
                  </div>
                  <div className="space-y-2">
                    {SOURCES.map((s, i) => (
                      <div key={s.name} className="bg-gray-900 border border-gray-800 rounded-lg p-3 flex items-center gap-3">
                        <span className="text-xs font-black text-gray-600 w-4 shrink-0">#{i + 1}</span>
                        <div className="flex-1 min-w-0">
                          <p className="text-xs font-semibold text-white truncate">{s.name}</p>
                          <p className="text-[10px] text-gray-600">{s.platform} · {s.calls} calls</p>
                        </div>
                        <div className="flex items-center gap-2 shrink-0">
                          <span className={`text-xs font-bold px-2 py-0.5 rounded ${s.color === 'emerald' ? 'bg-emerald-500/10 text-emerald-400' : s.color === 'blue' ? 'bg-blue-500/10 text-blue-400' : 'bg-purple-500/10 text-purple-400'}`}>{s.grade}</span>
                          <span className="text-xs text-gray-300">{s.winRate}</span>
                        </div>
                      </div>
                    ))}
                  </div>
                </>
              )}

              {/* Alerts tab */}
              {activeTab === 'Alerts' && (
                <>
                  <div className="flex items-center justify-between mb-3">
                    <h3 className="text-sm font-semibold text-white">Alert Feed</h3>
                    <div className="flex items-center gap-1.5 text-xs text-emerald-400">
                      <span className="relative flex h-1.5 w-1.5">
                        <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75" />
                        <span className="relative inline-flex rounded-full h-1.5 w-1.5 bg-emerald-500" />
                      </span>
                      Live
                    </div>
                  </div>
                  <div className="space-y-1.5">
                    {ALERTS_FEED.map((a, i) => (
                      <div key={i} className={`bg-gray-900 border rounded-lg px-3 py-2 flex items-center gap-2.5 transition-opacity ${i === 0 ? 'border-emerald-800/50' : 'border-gray-800 opacity-60'}`}>
                        <span className="text-[10px] font-bold bg-emerald-500/10 text-emerald-400 px-1.5 py-0.5 rounded shrink-0">{a.symbol}</span>
                        <span className="text-[11px] text-gray-300 flex-1 truncate">{a.msg}</span>
                        <span className="text-[10px] text-gray-700 shrink-0">{a.age}</span>
                      </div>
                    ))}
                  </div>
                </>
              )}

              {/* Overview and Backtest: fallback */}
              {(activeTab === 'Overview' || activeTab === 'Backtest') && (
                <div className="flex flex-col items-center justify-center h-full gap-3 text-center">
                  <div className="w-10 h-10 rounded-xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center">
                    <span className="text-lg">{activeTab === 'Backtest' ? '📊' : '👁'}</span>
                  </div>
                  <p className="text-sm font-semibold text-white">{activeTab}</p>
                  <p className="text-xs text-gray-600 max-w-40">Click Live Signals, Predictions, Sources, or Alerts to explore the dashboard.</p>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Floating alert badge — animates */}
        <div
          className={`absolute -top-4 -right-4 md:-right-8 bg-gray-900 border border-gray-700 rounded-xl shadow-xl px-3 py-2.5 flex items-center gap-2.5 transition-all duration-300 ${alertVisible ? 'opacity-100 translate-y-0' : 'opacity-0 -translate-y-1'}`}
        >
          <div className="w-8 h-8 rounded-full bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center shrink-0 text-sm">
            🚨
          </div>
          <div>
            <p className="text-xs font-semibold text-white">Alert: {alert.symbol}</p>
            <p className="text-[10px] text-gray-400">{alert.msg.replace(/^[^:]+: /, '')} · {alert.age}</p>
          </div>
        </div>
      </div>
    </div>
  );
}

// ── Main page ─────────────────────────────────────────────────────────────────
export function Landing() {
  return (
    <div className="min-h-screen bg-gray-950 text-white antialiased" style={{ fontFamily: "'Inter', system-ui, sans-serif" }}>
      <style>{`
        @keyframes marquee { 0% { transform: translateX(0); } 100% { transform: translateX(-50%); } }
      `}</style>

      {/* Nav */}
      <nav className="fixed top-0 w-full bg-gray-950/90 backdrop-blur-sm border-b border-gray-800 z-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 flex justify-between items-center h-16">
          <div className="flex items-center gap-2.5">
            <img src={logoIcon} alt="" className="h-8 w-auto" />
            <div className="flex flex-col">
              <span className="text-sm font-bold tracking-tight uppercase">Street Insights</span>
              <span className="text-[10px] text-gray-400 tracking-wider uppercase">Boxford Partners</span>
            </div>
          </div>
          <div className="hidden sm:flex items-center gap-6">
            <a href="#features" className="text-sm text-gray-300 hover:text-white transition-colors">Features</a>
            <a href="#how-it-works" className="text-sm text-gray-300 hover:text-white transition-colors">How It Works</a>
            <Link to="/pricing" className="text-sm text-gray-300 hover:text-white transition-colors">Pricing</Link>
            <Link to="/demo" className="text-sm text-gray-300 hover:text-white transition-colors">Demo</Link>
            <Link to="/login" className="text-sm text-gray-300 hover:text-white transition-colors">Sign In</Link>
            <Link to="/sign-up" className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 rounded-lg text-sm font-semibold transition-colors">
              Get Started
            </Link>
          </div>
        </div>
      </nav>

      {/* Hero */}
      <section className="pt-32 pb-16 px-4 text-center">
        <div className="max-w-7xl mx-auto">
          <div className="inline-flex items-center gap-2 px-4 py-2 bg-emerald-500/10 border border-emerald-500/20 rounded-full text-sm text-emerald-400 mb-8">
            <span className="relative flex h-2 w-2">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75" />
              <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500" />
            </span>
            Now tracking sentiment across Reddit, X, and financial news
          </div>

          <h1 style={{ fontSize: 'clamp(2.8rem, 7vw, 4.5rem)', fontWeight: 700, lineHeight: 1.15, letterSpacing: '-0.02em' }}>
            Know What the Market<br />
            <span style={{ color: '#34d399' }}>is Thinking</span>
          </h1>

          <p className="mt-6 text-xl text-gray-400 max-w-2xl mx-auto">
            Real-time stock sentiment tracking powered by AI. Get alerts on mention spikes,
            high-confidence predictions, and credibility-ranked sources, before the market moves.
          </p>

          <div className="mt-10 flex flex-col sm:flex-row items-center justify-center gap-4">
            <Link
              to="/sign-up"
              className="px-8 py-4 bg-emerald-600 hover:bg-emerald-700 rounded-lg font-semibold text-lg transition-colors shadow-lg shadow-emerald-600/20"
            >
              Get Early Access
            </Link>
            <Link
              to="/demo"
              className="px-8 py-4 bg-gray-800 hover:bg-gray-700 border border-gray-700 rounded-lg font-semibold text-lg transition-colors"
            >
              🎬 Watch Demo
            </Link>
          </div>
          <p className="mt-4 text-sm text-gray-500">No credit card required</p>
        </div>
      </section>

      {/* Ticker */}
      <TickerBar />

      {/* Problem */}
      <section className="py-20 px-4 bg-gray-900/40">
        <div className="max-w-5xl mx-auto">
          <h2 className="text-3xl sm:text-4xl font-bold text-center mb-4">
            Social sentiment moves markets.
          </h2>
          <p className="text-center text-gray-400 text-lg mb-12">Most investors see it too late.</p>
          <div className="grid md:grid-cols-3 gap-6">
            {[
              { icon: '⚠️', color: 'red', title: 'Noise Everywhere', desc: 'Reddit, X, Discord, news, scattered signals across dozens of sources.' },
              { icon: '🔍', color: 'orange', title: 'Who to Trust?', desc: 'Every source claims conviction. No way to verify track records.' },
              { icon: '⏰', color: 'yellow', title: 'Always Behind', desc: 'By the time you notice the spike, the move already happened.' },
            ].map((item) => (
              <div key={item.title} className="p-6 bg-gray-800/50 border border-gray-700 rounded-xl">
                <div className="text-3xl mb-3">{item.icon}</div>
                <h3 className="text-lg font-semibold mb-2">{item.title}</h3>
                <p className="text-gray-400 text-sm leading-relaxed">{item.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Stats */}
      <section className="py-16 px-4 bg-gray-950 border-y border-gray-800">
        <div className="max-w-4xl mx-auto">
          <p className="text-xs font-semibold uppercase tracking-widest text-emerald-500 text-center mb-2">Trusted by Signal Hunters</p>
          <p className="text-center text-gray-400 text-sm mb-10">Processing thousands of data points every minute</p>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-8 text-center">
            {[
              { end: 50000, suffix: '+', label: 'Mentions Tracked Daily' },
              { end: 92, suffix: '%', label: 'Prediction Accuracy' },
              { end: 15, suffix: 's', label: 'Average Alert Speed' },
              { end: 500, suffix: '+', label: 'Sources Monitored' },
            ].map((stat) => (
              <div key={stat.label}>
                <p className="text-3xl md:text-4xl font-black text-white tabular-nums">
                  <Counter end={stat.end} suffix={stat.suffix} />
                </p>
                <p className="text-sm text-gray-400 mt-1">{stat.label}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Dashboard preview */}
      <section className="py-20 px-4">
        <div className="max-w-5xl mx-auto">
          <div className="text-center mb-12">
            <p className="text-xs font-semibold uppercase tracking-widest text-emerald-500 mb-3">The Dashboard</p>
            <h2 className="text-3xl md:text-4xl font-bold">Signals. Context. Action.</h2>
            <p className="mt-4 text-gray-400 max-w-xl mx-auto">Every spike, prediction, and credibility score in one unified view.</p>
          </div>
          <DashboardMockup />
        </div>
      </section>

      {/* How It Works */}
      <section id="how-it-works" className="py-20 px-4 bg-gray-900/40">
        <div className="max-w-5xl mx-auto">
          <h2 className="text-4xl font-bold text-center mb-16">How It Works</h2>
          <div className="grid md:grid-cols-3 gap-8">
            {[
              { n: '1', color: 'bg-emerald-600', title: 'We Scan', desc: 'Continuous scrapes across Reddit, X, and financial news. Extract tickers, sentiment, and predictions in real time.' },
              { n: '2', color: 'bg-purple-600', title: 'AI Analyzes', desc: 'Grok scores reasoning quality and confidence. Validates predictions against outcomes to build credibility scores.' },
              { n: '3', color: 'bg-blue-600', title: 'You Get Alerts', desc: 'Instant notifications when spikes happen or high-confidence predictions emerge. No noise, only what matters.' },
            ].map((step) => (
              <div key={step.n} className="text-center">
                <div className={`w-14 h-14 ${step.color} rounded-full flex items-center justify-center text-xl font-bold mx-auto mb-5`}>{step.n}</div>
                <h3 className="text-xl font-semibold mb-3">{step.title}</h3>
                <p className="text-gray-400 text-sm leading-relaxed">{step.desc}</p>
              </div>
            ))}
          </div>
          <div className="text-center mt-10">
            <Link to="/demo" className="inline-flex items-center gap-2 text-emerald-400 hover:text-emerald-300 text-sm font-medium transition-colors">
              See it in action →
            </Link>
          </div>
        </div>
      </section>

      {/* Features */}
      <section id="features" className="py-20 px-4">
        <div className="max-w-7xl mx-auto">
          <div className="text-center mb-14">
            <h2 className="text-4xl sm:text-5xl font-bold mb-4">Built for Signal Hunters</h2>
            <p className="text-xl text-gray-400">Every feature designed to surface alpha before the crowd notices.</p>
          </div>
          <div className="grid md:grid-cols-3 gap-6">
            {[
              {
                color: 'from-emerald-600 to-cyan-600',
                icon: '🚨',
                title: 'Real-Time Spike Detection',
                desc: 'Instant alerts when mention frequency spikes above baseline. Customizable thresholds per ticker.',
                bullets: ['Monitoring across Reddit, X, news', 'Volume spike analysis', 'Custom thresholds per ticker', 'Daily digest + instant alerts'],
                bulletColor: 'text-emerald-500',
              },
              {
                color: 'from-blue-600 to-indigo-600',
                icon: '🏆',
                title: 'Source Credibility Rankings',
                desc: 'Track record verification for every account. Know who actually has alpha vs. who just has followers.',
                bullets: ['Win rate, accuracy, average return', 'Reasoning quality metrics', 'Leaderboard by platform', 'Filter by verified track records'],
                bulletColor: 'text-blue-500',
              },
              {
                color: 'from-purple-600 to-pink-600',
                icon: '🧠',
                title: 'AI-Powered Analysis',
                desc: 'Grok AI extracts predictions with price targets, timeframes, and confidence scores using proven frameworks.',
                bullets: ['Lynch/Munger quality scoring', 'Data discipline analysis', 'Automatic outcome validation', 'High-confidence signals only'],
                bulletColor: 'text-purple-500',
              },
            ].map((f) => (
              <div key={f.title} className="relative">
                <div className={`absolute -inset-0.5 bg-gradient-to-r ${f.color} rounded-2xl blur opacity-15`} />
                <div className="relative p-7 bg-gray-900 border border-gray-800 rounded-2xl h-full">
                  <div className="text-4xl mb-4">{f.icon}</div>
                  <h3 className="text-xl font-bold mb-3">{f.title}</h3>
                  <p className="text-gray-400 text-sm mb-4 leading-relaxed">{f.desc}</p>
                  <ul className="space-y-2">
                    {f.bullets.map((b) => (
                      <li key={b} className="flex items-start gap-2 text-sm text-gray-300">
                        <svg className={`w-4 h-4 ${f.bulletColor} mt-0.5 shrink-0`} fill="currentColor" viewBox="0 0 20 20">
                          <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                        </svg>
                        {b}
                      </li>
                    ))}
                  </ul>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Testimonials */}
      <section className="py-20 px-4 bg-gray-900/40">
        <div className="max-w-6xl mx-auto">
          <div className="text-center mb-12">
            <p className="text-xs font-semibold uppercase tracking-widest text-emerald-500 mb-3">Early Access Users</p>
            <h2 className="text-3xl md:text-4xl font-bold">Getting ahead of the crowd</h2>
          </div>
          <div className="grid md:grid-cols-3 gap-6">
            {[
              {
                quote: "I caught the NVDA spike 20 minutes before it hit $5. The mention velocity alert fired while everyone else was still reading headlines. This is the edge I was looking for.",
                name: "Jordan K.",
                role: "Options trader, 6 years",
                avatar: "JK",
                gradient: "from-emerald-500 to-teal-600",
              },
              {
                quote: "The source credibility rankings are invaluable. I used to waste time on accounts with 50k followers who were consistently wrong. Now I filter for people who have actual track records.",
                name: "Marcus T.",
                role: "Swing trader, r/stocks",
                avatar: "MT",
                gradient: "from-blue-500 to-indigo-600",
              },
              {
                quote: "Set up a custom alert for $PLTR with a 2x spike threshold. Got a notification at 6 AM before market open. Opened a position, closed it same day up 4.2%. ROI on the subscription: infinite.",
                name: "Priya S.",
                role: "Retail investor",
                avatar: "PS",
                gradient: "from-purple-500 to-pink-600",
              },
            ].map((t) => (
              <div key={t.name} className="p-6 bg-gray-800/50 border border-gray-700 rounded-2xl flex flex-col">
                <p className="text-gray-300 text-sm leading-relaxed flex-1 mb-5">"{t.quote}"</p>
                <div className="flex items-center gap-3 pt-4 border-t border-gray-700">
                  <div className={`w-9 h-9 rounded-full bg-gradient-to-br ${t.gradient} flex items-center justify-center text-xs font-bold shrink-0`}>
                    {t.avatar}
                  </div>
                  <div>
                    <p className="text-sm font-semibold text-white">{t.name}</p>
                    <p className="text-xs text-gray-500">{t.role}</p>
                  </div>
                  <div className="ml-auto flex gap-0.5">
                    {[1,2,3,4,5].map(s => <span key={s} className="text-amber-400 text-xs">★</span>)}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Infrastructure */}
      <section className="py-16 px-4 bg-gray-950 border-y border-gray-800">
        <div className="max-w-4xl mx-auto text-center">
          <p className="text-xs font-semibold uppercase tracking-widest text-gray-500 mb-6">Trusted Infrastructure</p>
          <h2 className="text-2xl font-bold mb-2">Powered by Industry Leaders</h2>
          <p className="text-gray-400 text-sm mb-8">Built on best-in-class data sources and AI technology</p>
          <div className="flex flex-wrap justify-center gap-6">
            {[
              { icon: '🔴', name: 'Reddit', label: 'Social sentiment' },
              { icon: '𝕏', name: 'X (Twitter)', label: 'Real-time feeds' },
              { icon: '📊', name: 'Alpha Vantage', label: 'Market data' },
              { icon: '🤖', name: 'xAI Grok', label: 'AI analysis' },
            ].map((s) => (
              <div key={s.name} className="flex flex-col items-center gap-2 px-5 py-4 bg-gray-900 border border-gray-800 rounded-xl min-w-28">
                <span className="text-2xl">{s.icon}</span>
                <span className="text-sm font-semibold text-white">{s.name}</span>
                <span className="text-xs text-gray-500">{s.label}</span>
              </div>
            ))}
          </div>
          <div className="flex items-center justify-center gap-6 mt-8 text-sm text-gray-500">
            <span>✓ 256-bit encryption</span>
            <span>✓ 99.9% uptime</span>
            <span>✓ Real-time processing</span>
          </div>
        </div>
      </section>

      {/* Pricing */}
      <section className="py-20 px-4">
        <div className="max-w-lg mx-auto text-center">
          <p className="text-xs font-semibold uppercase tracking-widest text-emerald-500 mb-3">Simple Pricing</p>
          <h2 className="text-3xl font-bold mb-2">Know Before You Commit</h2>
          <p className="text-gray-400 mb-8">Transparent pricing with no hidden fees</p>
          <div className="bg-gray-900 border border-gray-700 rounded-2xl p-8">
            <div className="text-5xl font-black text-white mb-1">$29<span className="text-xl font-normal text-gray-400">/month</span></div>
            <p className="text-gray-400 mb-6 text-sm">Everything you need to stay ahead of market sentiment</p>
            <ul className="space-y-3 text-left mb-8">
              {[
                'Early access pricing available now',
                'Early access pricing locked for life',
                'Cancel anytime, no long-term contracts',
                'All features included',
              ].map((item) => (
                <li key={item} className="flex items-center gap-3 text-sm text-gray-300">
                  <svg className="w-4 h-4 text-emerald-500 shrink-0" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                  </svg>
                  {item}
                </li>
              ))}
            </ul>
            <Link
              to="/sign-up"
              className="block w-full py-3 bg-emerald-600 hover:bg-emerald-700 rounded-lg font-semibold transition-colors text-center"
            >
              Reserve Your Spot
            </Link>
          </div>
        </div>
      </section>

      {/* FAQ */}
      <section className="py-20 px-4 bg-gray-900/40">
        <div className="max-w-3xl mx-auto">
          <h2 className="text-3xl font-bold text-center mb-10">Frequently Asked Questions</h2>
          <div className="space-y-4">
            {[
              {
                q: "How is this different from just following FinTwit?",
                a: "Street Insights tracks sentiment across Reddit, X, Discord, and financial news simultaneously. We provide credibility scoring based on track records, automated spike detection, and AI-powered prediction extraction. Instead of manually scrolling, you get verified signals with context.",
              },
              {
                q: "What platforms do you track?",
                a: "We monitor Reddit (r/wallstreetbets, r/stocks, r/investing), X (formerly Twitter), financial news sites, and Discord communities. We continuously add new sources based on user feedback.",
              },
              {
                q: "How accurate are the predictions?",
                a: "Our AI doesn't make predictions, it extracts and evaluates predictions made by others. The 92% accuracy stat refers to our ability to identify whether extracted predictions came true. We track every source's historical accuracy so you can decide who to trust.",
              },
              {
                q: "Do you provide financial advice?",
                a: "No. Street Insights is a market intelligence tool that surfaces sentiment data and tracks prediction accuracy. We do not provide investment recommendations. All decisions are yours to make.",
              },
              {
                q: "Can I cancel anytime?",
                a: "Yes. No long-term contracts or cancellation fees. You retain access through the end of your billing period.",
              },
            ].map((faq, i) => (
              <details key={i} className="group bg-gray-900 border border-gray-800 rounded-xl">
                <summary className="flex items-center justify-between px-5 py-4 cursor-pointer text-sm font-medium list-none">
                  {faq.q}
                  <span className="text-gray-500 group-open:rotate-180 transition-transform shrink-0 ml-3">↓</span>
                </summary>
                <div className="px-5 pb-4 text-sm text-gray-400 leading-relaxed border-t border-gray-800 pt-3">
                  {faq.a}
                </div>
              </details>
            ))}
          </div>
        </div>
      </section>

      {/* Final CTA */}
      <section className="py-20 px-4">
        <div className="max-w-2xl mx-auto text-center">
          <h2 className="text-4xl sm:text-5xl font-bold mb-4">Get ahead of the market.</h2>
          <p className="text-xl text-gray-400 mb-8">
            Join traders using Street Insights to catch spikes before they make headlines.
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Link
              to="/sign-up"
              className="px-8 py-4 bg-emerald-600 hover:bg-emerald-700 rounded-lg font-semibold text-lg transition-colors shadow-lg shadow-emerald-600/20"
            >
              Get Started
            </Link>
            <Link
              to="/demo"
              className="px-8 py-4 bg-gray-800 hover:bg-gray-700 border border-gray-700 rounded-lg font-semibold text-lg transition-colors"
            >
              🎬 Watch Demo
            </Link>
          </div>
          <p className="mt-4 text-sm text-gray-500">No credit card required · Cancel anytime</p>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-gray-800 bg-gray-950 py-12 px-4">
        <div className="max-w-7xl mx-auto grid gap-8 md:grid-cols-4 text-sm">
          <div>
            <div className="flex items-center gap-2 mb-3">
              <svg className="w-6 h-6 text-emerald-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" />
              </svg>
              <span className="font-bold">Street Insights</span>
            </div>
            <a href="https://www.boxfordpartners.com" target="_blank" rel="noopener noreferrer" className="inline-block text-[10px] font-semibold uppercase tracking-widest text-gray-600 border border-gray-800 rounded px-2 py-1 hover:text-gray-400 transition-colors mb-3">
              A Boxford Partners Company
            </a>
            <p><a href="mailto:hello@getstreetinsights.com" className="text-gray-500 hover:text-gray-300 transition-colors">hello@getstreetinsights.com</a></p>
          </div>
          <div>
            <h4 className="text-xs font-semibold uppercase tracking-wider text-gray-500 mb-3">Product</h4>
            <ul className="space-y-2 text-gray-400">
              <li><a href="#features" className="hover:text-white transition-colors">Features</a></li>
              <li><Link to="/pricing" className="hover:text-white transition-colors">Pricing</Link></li>
              <li><a href="#how-it-works" className="hover:text-white transition-colors">How It Works</a></li>
              <li><Link to="/demo" className="hover:text-white transition-colors">Demo</Link></li>
            </ul>
          </div>
          <div>
            <h4 className="text-xs font-semibold uppercase tracking-wider text-gray-500 mb-3">Company</h4>
            <ul className="space-y-2 text-gray-400">
              <li><a href="https://www.boxfordpartners.com" target="_blank" rel="noopener noreferrer" className="hover:text-white transition-colors">Boxford Partners</a></li>
              <li><a href="mailto:hello@getstreetinsights.com" className="hover:text-white transition-colors">Support</a></li>
            </ul>
          </div>
          <div>
            <h4 className="text-xs font-semibold uppercase tracking-wider text-gray-500 mb-3">Legal</h4>
            <ul className="space-y-2 text-gray-400">
              <li><Link to="/privacy" className="hover:text-white transition-colors">Privacy Policy</Link></li>
              <li><Link to="/terms" className="hover:text-white transition-colors">Terms of Service</Link></li>
            </ul>
          </div>
        </div>
        <div className="max-w-7xl mx-auto mt-10 pt-6 border-t border-gray-900 flex items-center justify-between">
          <p className="text-xs text-gray-600">© {new Date().getFullYear()} Boxford Partners LLC DBA STREET INSIGHTS. All rights reserved.</p>
          <a
            href="https://www.linkedin.com/company/boxfordpartners"
            target="_blank"
            rel="noopener noreferrer"
            aria-label="Boxford Partners on LinkedIn"
            className="text-gray-700 hover:text-gray-500 transition-colors"
          >
            <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
              <path d="M20.447 20.452h-3.554v-5.569c0-1.328-.027-3.037-1.852-3.037-1.853 0-2.136 1.445-2.136 2.939v5.667H9.351V9h3.414v1.561h.046c.477-.9 1.637-1.85 3.37-1.85 3.601 0 4.267 2.37 4.267 5.455v6.286zM5.337 7.433a2.062 2.062 0 0 1-2.063-2.065 2.064 2.064 0 1 1 2.063 2.065zm1.782 13.019H3.555V9h3.564v11.452zM22.225 0H1.771C.792 0 0 .774 0 1.729v20.542C0 23.227.792 24 1.771 24h20.451C23.2 24 24 23.227 24 22.271V1.729C24 .774 23.2 0 22.222 0h.003z"/>
            </svg>
          </a>
        </div>
      </footer>
    </div>
  );
}
