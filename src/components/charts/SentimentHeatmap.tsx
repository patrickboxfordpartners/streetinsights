import { useMemo } from "react"

interface HeatmapDay {
  date: string
  mention_count: number
  avg_sentiment_score: number | null
  spike_detected: boolean
}

interface SentimentHeatmapProps {
  data: HeatmapDay[]
  weeks?: number
}

function sentimentColor(score: number | null, count: number): string {
  if (count === 0 || score === null) return "hsl(220 25% 12%)" // empty cell

  // -1 (bearish) → 0 (neutral) → +1 (bullish)
  // Map to red → gray → green
  if (score > 0.15) {
    const intensity = Math.min(score / 0.6, 1)
    return `hsl(142 ${Math.round(40 + intensity * 36)}% ${Math.round(28 + intensity * 22)}%)`
  } else if (score < -0.15) {
    const intensity = Math.min(Math.abs(score) / 0.6, 1)
    return `hsl(0 ${Math.round(40 + intensity * 36)}% ${Math.round(28 + intensity * 22)}%)`
  }
  // neutral
  return "hsl(220 15% 28%)"
}

function cellOpacity(count: number, maxCount: number): number {
  if (count === 0 || maxCount === 0) return 0
  return 0.4 + (count / maxCount) * 0.6
}

export function SentimentHeatmap({ data, weeks = 26 }: SentimentHeatmapProps) {
  const { grid, monthLabels } = useMemo(() => {
    // Build a date → data map
    const byDate = new Map<string, HeatmapDay>()
    for (const d of data) byDate.set(d.date, d)

    const maxCount = Math.max(...data.map((d) => d.mention_count), 1)

    // Build a grid of the last `weeks` weeks, starting from Sunday
    const today = new Date()
    today.setHours(0, 0, 0, 0)
    const startDow = today.getDay() // 0=Sun
    const end = new Date(today)
    const start = new Date(today)
    start.setDate(start.getDate() - (weeks * 7 - 1 + startDow))

    const cols: Array<Array<{ date: string; day: HeatmapDay | null }>> = []
    const monthSet = new Map<number, string>() // col index → month label

    let current = new Date(start)
    let col: Array<{ date: string; day: HeatmapDay | null }> = []

    while (current <= end) {
      const iso = current.toISOString().split("T")[0]
      const dow = current.getDay()

      if (dow === 0 && col.length > 0) {
        cols.push(col)
        col = []
      }

      // Track month label at first occurrence of a new month in each column
      if (dow === 0 && current.getDate() <= 7) {
        monthSet.set(cols.length, current.toLocaleDateString("en-US", { month: "short" }))
      }

      col.push({ date: iso, day: byDate.get(iso) ?? null })
      current.setDate(current.getDate() + 1)
    }
    if (col.length > 0) cols.push(col)

    // Build month labels for rendering
    const labels = Array.from(monthSet.entries()).map(([colIdx, label]) => ({ colIdx, label }))

    return {
      grid: { cols, maxCount },
      monthLabels: labels,
    }
  }, [data, weeks])

  const CELL = 13
  const GAP = 3
  const totalCols = grid.cols.length
  const svgWidth = totalCols * (CELL + GAP)
  const svgHeight = 7 * (CELL + GAP) + 20 // 20px for month labels

  return (
    <div className="w-full overflow-x-auto">
      <svg
        width={svgWidth}
        height={svgHeight}
        className="block"
        style={{ minWidth: Math.min(svgWidth, 300) }}
      >
        {/* Month labels */}
        {monthLabels.map(({ colIdx, label }) => (
          <text
            key={colIdx}
            x={colIdx * (CELL + GAP)}
            y={10}
            fontSize={9}
            fill="hsl(215 15% 45%)"
            fontFamily="DM Mono, monospace"
          >
            {label}
          </text>
        ))}

        {/* Day cells */}
        {grid.cols.map((col, ci) =>
          col.map(({ date, day }, ri) => {
            const count = day?.mention_count ?? 0
            const sentiment = day?.avg_sentiment_score ?? null
            const spike = day?.spike_detected ?? false
            const color = sentimentColor(sentiment, count)
            const opacity = cellOpacity(count, grid.maxCount)

            return (
              <g key={date}>
                <rect
                  x={ci * (CELL + GAP)}
                  y={20 + ri * (CELL + GAP)}
                  width={CELL}
                  height={CELL}
                  rx={2}
                  ry={2}
                  fill={color}
                  fillOpacity={count > 0 ? opacity : 0.15}
                  stroke={spike ? "hsl(38 92% 55%)" : "transparent"}
                  strokeWidth={spike ? 1.5 : 0}
                >
                  <title>
                    {date}: {count} mentions
                    {sentiment !== null ? ` · sentiment ${sentiment > 0 ? "+" : ""}${sentiment.toFixed(2)}` : ""}
                    {spike ? " · spike" : ""}
                  </title>
                </rect>
              </g>
            )
          })
        )}
      </svg>

      {/* Legend */}
      <div className="flex items-center gap-4 mt-3 text-[10px] text-muted-foreground">
        <div className="flex items-center gap-1.5">
          <div className="w-2.5 h-2.5 rounded-sm" style={{ background: sentimentColor(null, 0), opacity: 0.15 }} />
          <span>No data</span>
        </div>
        <div className="flex items-center gap-1.5">
          <div className="w-2.5 h-2.5 rounded-sm" style={{ background: sentimentColor(-0.5, 5) }} />
          <span>Bearish</span>
        </div>
        <div className="flex items-center gap-1.5">
          <div className="w-2.5 h-2.5 rounded-sm" style={{ background: sentimentColor(0, 5) }} />
          <span>Neutral</span>
        </div>
        <div className="flex items-center gap-1.5">
          <div className="w-2.5 h-2.5 rounded-sm" style={{ background: sentimentColor(0.5, 5) }} />
          <span>Bullish</span>
        </div>
        <div className="flex items-center gap-1.5">
          <div className="w-2.5 h-2.5 rounded-sm border border-amber-400/70" style={{ background: sentimentColor(0.3, 5) }} />
          <span>Spike</span>
        </div>
        <span className="ml-auto">Darker = more mentions</span>
      </div>
    </div>
  )
}
