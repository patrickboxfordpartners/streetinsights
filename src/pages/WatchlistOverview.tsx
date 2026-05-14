/**
 * Watchlist Overview — Sentiment Heat Map
 * Shows swarm composite scores for the user's watched tickers.
 * Serves as the new default authenticated landing page.
 */

import { useEffect, useState, useCallback } from 'react'
import { Link } from 'react-router-dom'
import { supabase } from '../integrations/supabase/client'
import { useAuth } from '../hooks/useAuth'
import { useWatchlist } from '../hooks/useWatchlist'
import {
  AlertTriangle,
  RefreshCw, Plus, Zap, ChevronRight, Clock,
} from 'lucide-react'

// ── Types ──────────────────────────────────────────────────────────────────

interface TickerSignal {
  ticker_id: string
  symbol: string
  company_name: string | null
  sector: string | null
  composite_score: number | null
  composite_label: string | null
  composite_delta: number | null
  news_score: number | null
  social_score: number | null
  flow_score: number | null
  reversal_signal: string | null
  reversal_triggered: boolean
  overheat_watch: boolean
  fear_greed_score: number | null
  run_date: string | null
  historical_pct_1yr: number | null
}

// ── Helpers ────────────────────────────────────────────────────────────────

function scoreColor(score: number | null): string {
  if (score === null) return '#6b7280'
  if (score >= 60) return '#10b981'
  if (score >= 40) return '#3b82f6'
  if (score >= 20) return '#f59e0b'
  if (score >= -20) return '#6b7280'
  if (score >= -40) return '#f97316'
  return '#ef4444'
}

function scoreBg(score: number | null): string {
  if (score === null) return 'bg-secondary/30 border-border/30'
  if (score >= 60) return 'bg-emerald-500/8 border-emerald-500/20'
  if (score >= 40) return 'bg-blue-500/8 border-blue-500/20'
  if (score >= 20) return 'bg-yellow-500/8 border-yellow-500/20'
  if (score >= -20) return 'bg-secondary/30 border-border/30'
  if (score >= -40) return 'bg-orange-500/8 border-orange-500/20'
  return 'bg-red-500/8 border-red-500/20'
}

function DeltaBadge({ delta }: { delta: number | null }) {
  if (delta === null) return null
  const abs = Math.abs(delta).toFixed(1)
  if (delta > 2) return <span className="text-[10px] font-medium text-emerald-400">+{abs}</span>
  if (delta < -2) return <span className="text-[10px] font-medium text-red-400">-{abs}</span>
  return <span className="text-[10px] text-muted-foreground">~{abs}</span>
}

function ComponentDots({ news, social, flow }: {
  news: number | null; social: number | null; flow: number | null
}) {
  return (
    <div className="flex items-center gap-1.5 mt-2">
      {[
        { label: 'N', score: news },
        { label: 'S', score: social },
        { label: 'F', score: flow },
      ].map(({ label, score }) => (
        <div key={label} className="flex items-center gap-0.5">
          <div
            className="w-1.5 h-1.5 rounded-full"
            style={{ background: scoreColor(score) }}
          />
          <span className="text-[9px] text-muted-foreground/60">{label}</span>
        </div>
      ))}
    </div>
  )
}

// ── Main heat map card ─────────────────────────────────────────────────────

function SignalCard({ ts }: { ts: TickerSignal; onRemove?: () => void }) {
  const isToday = ts.run_date === new Date().toISOString().split('T')[0]
  const score = ts.composite_score

  return (
    <Link
      to={`/dashboard/tickers/${ts.symbol}`}
      className={`block rounded-xl border p-4 transition-all hover:scale-[1.01] hover:shadow-md ${scoreBg(score)}`}
    >
      {/* Header */}
      <div className="flex items-start justify-between mb-3">
        <div>
          <div className="flex items-center gap-1.5">
            <span className="text-sm font-bold font-mono text-foreground">{ts.symbol}</span>
            {ts.reversal_triggered && (
              <span className={`text-[9px] font-semibold px-1.5 py-0.5 rounded-full ${
                ts.reversal_signal === 'LONG'
                  ? 'bg-emerald-500/15 text-emerald-400'
                  : 'bg-red-500/15 text-red-400'
              }`}>
                {ts.reversal_signal}
              </span>
            )}
            {ts.overheat_watch && !ts.reversal_triggered && (
              <AlertTriangle className="h-3 w-3 text-amber-400" />
            )}
          </div>
          {ts.company_name && (
            <p className="text-[10px] text-muted-foreground mt-0.5 truncate max-w-[120px]">
              {ts.company_name}
            </p>
          )}
        </div>
        <div className="flex flex-col items-end gap-1">
          {!isToday && ts.run_date && (
            <div className="flex items-center gap-1 text-[9px] text-muted-foreground/50">
              <Clock className="h-2.5 w-2.5" />
              {ts.run_date}
            </div>
          )}
        </div>
      </div>

      {/* Score */}
      <div className="flex items-end gap-2">
        <span
          className="text-3xl font-black leading-none"
          style={{ color: scoreColor(score) }}
        >
          {score !== null ? score.toFixed(0) : '—'}
        </span>
        <div className="mb-0.5">
          <DeltaBadge delta={ts.composite_delta} />
          {ts.composite_label && (
            <p className="text-[10px] text-muted-foreground">{ts.composite_label}</p>
          )}
        </div>
      </div>

      {/* Component dots */}
      <ComponentDots news={ts.news_score} social={ts.social_score} flow={ts.flow_score} />

      {/* Percentile bar */}
      {ts.historical_pct_1yr !== null && (
        <div className="mt-3">
          <div className="flex justify-between text-[9px] text-muted-foreground/50 mb-1">
            <span>1yr %ile</span>
            <span>{ts.historical_pct_1yr}th</span>
          </div>
          <div className="h-1 rounded-full bg-border/30 overflow-hidden">
            <div
              className="h-full rounded-full"
              style={{
                width: `${ts.historical_pct_1yr}%`,
                background: scoreColor(score),
              }}
            />
          </div>
        </div>
      )}

      {/* No signal state */}
      {score === null && (
        <div className="flex items-center gap-1.5 mt-2">
          <Zap className="h-3 w-3 text-muted-foreground/40" />
          <span className="text-[10px] text-muted-foreground/40">No swarm signal yet</span>
        </div>
      )}
    </Link>
  )
}

// ── Summary bar ────────────────────────────────────────────────────────────

function SummaryBar({ signals }: { signals: TickerSignal[] }) {
  const withScores = signals.filter(s => s.composite_score !== null)
  if (withScores.length === 0) return null

  const avg = withScores.reduce((s, t) => s + (t.composite_score || 0), 0) / withScores.length
  const bullish = withScores.filter(s => (s.composite_score || 0) >= 40).length
  const bearish = withScores.filter(s => (s.composite_score || 0) < -20).length
  const overheat = signals.filter(s => s.overheat_watch).length
  const reversals = signals.filter(s => s.reversal_triggered).length

  return (
    <div className="flex items-center gap-6 px-1">
      <div>
        <span className="text-2xl font-black" style={{ color: scoreColor(avg) }}>
          {avg.toFixed(0)}
        </span>
        <span className="text-xs text-muted-foreground ml-1.5">watchlist avg</span>
      </div>
      <div className="flex items-center gap-4 text-xs">
        <span className="text-emerald-400 font-medium">{bullish} bullish</span>
        <span className="text-red-400 font-medium">{bearish} bearish</span>
        {overheat > 0 && (
          <span className="flex items-center gap-1 text-amber-400 font-medium">
            <AlertTriangle className="h-3 w-3" />{overheat} overheat watch
          </span>
        )}
        {reversals > 0 && (
          <span className="flex items-center gap-1 font-medium" style={{ color: scoreColor(60) }}>
            <Zap className="h-3 w-3" />{reversals} reversal{reversals > 1 ? 's' : ''}
          </span>
        )}
      </div>
    </div>
  )
}

// ── Page ───────────────────────────────────────────────────────────────────

export function WatchlistOverview() {
  useAuth()
  const { watchlist } = useWatchlist()
  const [signals, setSignals] = useState<TickerSignal[]>([])
  const [loading, setLoading] = useState(true)
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null)

  const load = useCallback(async () => {
    setLoading(true)

    // Fetch all active tickers joined with latest swarm signal
    const { data: tickers } = await supabase
      .from('tickers')
      .select('id, symbol, company_name, sector, is_active')
      .eq('is_active', true)
      .order('symbol')

    if (!tickers?.length) { setLoading(false); return }

    // Fetch latest swarm signal per ticker
    const yesterday = new Date(Date.now() - 86400000).toISOString().split('T')[0]

    const { data: swarmData } = await supabase
      .from('swarm_signals')
      .select('*')
      .in('symbol', tickers.map(t => t.symbol))
      .gte('run_date', yesterday)
      .order('run_date', { ascending: false })

    // Map latest signal per symbol
    const latestBySymbol = new Map<string, any>()
    for (const row of (swarmData || [])) {
      if (!latestBySymbol.has(row.symbol)) {
        latestBySymbol.set(row.symbol, row)
      }
    }

    // Build signal list, watchlisted first then rest
    const built: TickerSignal[] = tickers.map(t => {
      const sw = latestBySymbol.get(t.symbol)
      return {
        ticker_id: t.id,
        symbol: t.symbol,
        company_name: t.company_name,
        sector: t.sector,
        composite_score: sw?.composite_score ?? null,
        composite_label: sw?.composite_label ?? null,
        composite_delta: sw?.composite_delta ?? null,
        news_score: sw?.news_score ?? null,
        social_score: sw?.social_score ?? null,
        flow_score: sw?.flow_score ?? null,
        reversal_signal: sw?.reversal_signal ?? null,
        reversal_triggered: sw?.reversal_triggered ?? false,
        overheat_watch: sw?.overheat_watch ?? false,
        fear_greed_score: sw?.fear_greed_score ?? null,
        run_date: sw?.run_date ?? null,
        historical_pct_1yr: sw?.historical_pct_1yr ?? null,
      }
    })

    // Sort: watchlisted first, then by composite score desc, then no-signal last
    built.sort((a, b) => {
      const aWatched = watchlist.has(a.ticker_id) ? 1 : 0
      const bWatched = watchlist.has(b.ticker_id) ? 1 : 0
      if (aWatched !== bWatched) return bWatched - aWatched
      if (a.composite_score === null && b.composite_score !== null) return 1
      if (a.composite_score !== null && b.composite_score === null) return -1
      return (b.composite_score || 0) - (a.composite_score || 0)
    })

    setSignals(built)
    setLastUpdated(new Date())
    setLoading(false)
  }, [watchlist])

  useEffect(() => { load() }, [load])

  const watchlisted = signals.filter(s => watchlist.has(s.ticker_id))
  const rest = signals.filter(s => !watchlist.has(s.ticker_id))

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold text-foreground">Market Pulse</h1>
          <p className="text-sm text-muted-foreground mt-0.5">
            Sentiment intelligence · {signals.filter(s => s.composite_score !== null).length} signals today
          </p>
        </div>
        <div className="flex items-center gap-3">
          {lastUpdated && (
            <span className="text-xs text-muted-foreground">
              Updated {lastUpdated.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
            </span>
          )}
          <button
            onClick={load}
            disabled={loading}
            className="flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground transition-colors disabled:opacity-40"
          >
            <RefreshCw className={`h-3.5 w-3.5 ${loading ? 'animate-spin' : ''}`} />
            Refresh
          </button>
        </div>
      </div>

      {loading ? (
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-3">
          {Array.from({ length: 10 }).map((_, i) => (
            <div key={i} className="h-36 rounded-xl border border-border/30 bg-secondary/20 animate-pulse" />
          ))}
        </div>
      ) : (
        <>
          {/* Watchlist section */}
          {watchlisted.length > 0 ? (
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <h2 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                  Your Watchlist ({watchlisted.length})
                </h2>
                <SummaryBar signals={watchlisted} />
              </div>
              <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-3">
                {watchlisted.map(ts => (
                  <SignalCard key={ts.ticker_id} ts={ts} onRemove={() => {}} />
                ))}
              </div>
            </div>
          ) : (
            <div className="rounded-xl border border-dashed border-border/50 bg-secondary/10 p-8 text-center">
              <Zap className="h-8 w-8 text-muted-foreground/30 mx-auto mb-3" />
              <p className="text-sm font-medium text-foreground mb-1">No watchlist yet</p>
              <p className="text-xs text-muted-foreground mb-4">
                Add tickers to your watchlist to see their sentiment signals here.
              </p>
              <Link
                to="/dashboard/tickers"
                className="inline-flex items-center gap-1.5 text-xs font-medium text-primary hover:underline"
              >
                <Plus className="h-3.5 w-3.5" /> Browse tickers
              </Link>
            </div>
          )}

          {/* All tickers (collapsed header) */}
          {rest.length > 0 && (
            <details className="group">
              <summary className="flex items-center gap-2 cursor-pointer list-none select-none py-2">
                <ChevronRight className="h-3.5 w-3.5 text-muted-foreground transition-transform group-open:rotate-90" />
                <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                  All tickers ({rest.length})
                </span>
                <span className="text-[10px] text-muted-foreground/50 ml-1">
                  — {rest.filter(s => s.composite_score !== null).length} with signals
                </span>
              </summary>
              <div className="mt-3 grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-3">
                {rest.map(ts => (
                  <SignalCard key={ts.ticker_id} ts={ts} onRemove={() => {}} />
                ))}
              </div>
            </details>
          )}
        </>
      )}
    </div>
  )
}
