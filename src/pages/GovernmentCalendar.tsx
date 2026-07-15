import { useUrlState } from "../hooks/useUrlState";
import { Landmark, RefreshCw } from "lucide-react";
import { useGovernmentEvents } from "../hooks/useGovernmentEvents";
import { EventCard } from "../components/government/EventCard";
import { EventFilters } from "../components/government/EventFilters";
import { HighImpactAlerts } from "../components/government/HighImpactAlerts";
import { CalendarAccuracyCard } from "../components/government/CalendarAccuracyCard";

type DateRange = "1d" | "3d" | "7d" | "30d";

export function GovernmentCalendar() {
  const [range, setRange] = useUrlState<DateRange>("range", "7d");
  const [category, setCategory] = useUrlState<string>("category", "all");
  const [minMagnitude, setMinMagnitude] = useUrlState<number>("min", 0);
  const { events, loading, accuracy, refresh } = useGovernmentEvents(range);

  const filtered = events.filter((e) => {
    if (category !== "all" && e.source_category !== category) return false;
    if (minMagnitude > 0 && (e.impact_magnitude ?? 0) < minMagnitude) return false;
    return true;
  });

  const upcoming = filtered.filter((e) => e.status === "upcoming");
  const past = filtered.filter((e) => e.status !== "upcoming");

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <div className="flex items-center gap-2.5">
            <Landmark className="h-5 w-5 text-primary" />
            <h1 className="text-2xl font-bold tracking-tight">Government Calendar</h1>
          </div>
          <p className="text-sm text-muted-foreground mt-1">
            Upcoming government events scored for predicted market impact
          </p>
        </div>
        <div className="flex items-center gap-3">
          <CalendarAccuracyCard accuracy={accuracy} />
          <button
            onClick={refresh}
            disabled={loading}
            className="p-2 rounded-md border hover:bg-accent transition-colors disabled:opacity-50"
          >
            <RefreshCw className={`h-4 w-4 ${loading ? "animate-spin" : ""}`} />
          </button>
        </div>
      </div>

      {/* Filters */}
      <EventFilters
        range={range}
        onRangeChange={setRange}
        category={category}
        onCategoryChange={setCategory}
        minMagnitude={minMagnitude}
        onMinMagnitudeChange={setMinMagnitude}
      />

      {/* High impact alerts */}
      <HighImpactAlerts events={events} />

      {/* Loading state */}
      {loading && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="h-32 rounded-lg border bg-accent/30 animate-pulse" />
          ))}
        </div>
      )}

      {/* Events */}
      {!loading && filtered.length === 0 && (
        <div className="text-center py-16">
          <Landmark className="h-10 w-10 mx-auto text-muted-foreground/30 mb-3" />
          <p className="text-sm font-medium text-muted-foreground">No events in this range</p>
          <p className="text-xs text-muted-foreground mt-1">
            Try expanding the date range or adjusting filters.
            Events are scanned daily at 6:00 AM ET.
          </p>
        </div>
      )}

      {/* Upcoming */}
      {upcoming.length > 0 && (
        <div>
          <h2 className="text-xs font-bold text-muted-foreground uppercase tracking-wider mb-3">
            Upcoming ({upcoming.length})
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {upcoming.map((event) => (
              <EventCard key={event.id} event={event} />
            ))}
          </div>
        </div>
      )}

      {/* Past */}
      {past.length > 0 && (
        <div>
          <h2 className="text-xs font-bold text-muted-foreground uppercase tracking-wider mb-3">
            Recent ({past.length})
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3 opacity-70">
            {past.map((event) => (
              <EventCard key={event.id} event={event} />
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
