/**
 * Macro Economic Indicators Widget
 * Display key economic indicators from FRED API
 */

import { useEffect, useState } from "react";
import { TrendingUp, TrendingDown, Activity } from "lucide-react";
import { fetchMacroOverview, type MacroOverview } from "../lib/economic-data";
import { Skeleton } from "./SkeletonLoader";

export function MacroIndicators() {
  const [data, setData] = useState<MacroOverview | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    loadData();
  }, []);

  async function loadData() {
    try {
      setLoading(true);
      const overview = await fetchMacroOverview();
      setData(overview);
      setError(null);
    } catch (err: any) {
      setError(err.message || "Failed to load economic data");
    } finally {
      setLoading(false);
    }
  }

  if (loading) {
    return (
      <div className="bg-card rounded-lg border p-5">
        <div className="flex items-center gap-2 mb-4">
          <Activity className="h-5 w-5 text-primary" />
          <h3 className="text-base font-bold">Economic Indicators</h3>
        </div>
        <div className="grid grid-cols-2 lg:grid-cols-3 gap-4">
          {Array.from({ length: 6 }).map((_, i) => (
            <div key={i} className="space-y-2">
              <Skeleton className="h-3 w-24" />
              <Skeleton className="h-6 w-16" />
            </div>
          ))}
        </div>
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className="bg-card rounded-lg border p-5">
        <div className="text-sm text-muted-foreground">
          {error || "Economic data unavailable"}
        </div>
        <div className="text-xs text-muted-foreground mt-1">
          Configure VITE_FRED_API_KEY to enable
        </div>
      </div>
    );
  }

  const indicators = [
    {
      label: "Fed Funds Rate",
      value: data.fedFundsRate?.value,
      unit: "%",
      trend: null,
      category: "rates",
    },
    {
      label: "CPI",
      value: data.cpi?.value,
      unit: "",
      trend: null,
      category: "inflation",
    },
    {
      label: "Unemployment",
      value: data.unemploymentRate?.value,
      unit: "%",
      trend: null,
      category: "employment",
    },
    {
      label: "GDP Growth",
      value: data.gdpGrowth?.value,
      unit: "%",
      trend: data.gdpGrowth && data.gdpGrowth.value > 2 ? "up" : "down",
      category: "gdp",
    },
    {
      label: "S&P 500",
      value: data.sp500?.value,
      unit: "",
      trend: null,
      category: "markets",
    },
    {
      label: "VIX",
      value: data.vix?.value,
      unit: "",
      trend: data.vix && data.vix.value > 20 ? "up" : "down",
      category: "sentiment",
    },
  ];

  return (
    <div className="bg-card rounded-lg border">
      <div className="px-5 py-4 border-b bg-accent/30">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Activity className="h-5 w-5 text-primary" />
            <h3 className="text-base font-bold">Economic Indicators</h3>
          </div>
          <span className="text-xs text-muted-foreground">Live data from FRED</span>
        </div>
      </div>
      <div className="p-5">
        <div className="grid grid-cols-2 lg:grid-cols-3 gap-4">
          {indicators.map((indicator) => (
            <div
              key={indicator.label}
              className="bg-accent/20 rounded-lg p-3 border border-accent"
            >
              <div className="text-xs text-muted-foreground uppercase tracking-wider font-semibold mb-1">
                {indicator.label}
              </div>
              <div className="flex items-baseline gap-2">
                <div className="text-xl font-bold font-mono">
                  {indicator.value !== undefined
                    ? indicator.value.toLocaleString(undefined, {
                        minimumFractionDigits: indicator.unit === "%" ? 2 : 0,
                        maximumFractionDigits: indicator.unit === "%" ? 2 : 0,
                      })
                    : "—"}
                </div>
                {indicator.unit && (
                  <span className="text-sm text-muted-foreground">{indicator.unit}</span>
                )}
                {indicator.trend === "up" && (
                  <TrendingUp className="h-3.5 w-3.5 text-green-500 ml-auto" />
                )}
                {indicator.trend === "down" && (
                  <TrendingDown className="h-3.5 w-3.5 text-red-500 ml-auto" />
                )}
              </div>
            </div>
          ))}
        </div>
        <div className="mt-4 text-xs text-muted-foreground text-center">
          Last updated:{" "}
          {new Date(data.lastUpdated).toLocaleString(undefined, {
            dateStyle: "short",
            timeStyle: "short",
          })}
        </div>
      </div>
    </div>
  );
}
