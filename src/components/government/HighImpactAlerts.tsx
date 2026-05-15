import { AlertTriangle } from "lucide-react";
import { ImpactBadge } from "./ImpactBadge";
import type { GovernmentEventWithScore } from "../../hooks/useGovernmentEvents";

interface HighImpactAlertsProps {
  events: GovernmentEventWithScore[];
}

export function HighImpactAlerts({ events }: HighImpactAlertsProps) {
  const highImpact = events.filter(
    (e) => e.impact_magnitude !== null && e.impact_magnitude >= 7 && e.status === "upcoming"
  );

  if (highImpact.length === 0) return null;

  return (
    <div className="bg-red-500/5 border border-red-500/20 rounded-lg p-4">
      <div className="flex items-center gap-2 mb-3">
        <AlertTriangle className="h-4 w-4 text-red-500" />
        <h3 className="text-sm font-bold text-red-500">High-Impact Events</h3>
        <span className="text-[10px] bg-red-500/10 text-red-500 px-1.5 py-0.5 rounded-full font-bold">
          {highImpact.length}
        </span>
      </div>
      <div className="space-y-2">
        {highImpact.map((event) => (
          <div key={event.id} className="flex items-center justify-between gap-3 bg-card rounded-md px-3 py-2 border">
            <div className="flex-1 min-w-0">
              <p className="text-xs font-semibold truncate">{event.title}</p>
              <p className="text-[10px] text-muted-foreground">
                {new Date(event.event_date).toLocaleDateString("en-US", { weekday: "short", month: "short", day: "numeric" })}
                {event.affected_tickers.length > 0 && ` - ${event.affected_tickers.slice(0, 3).join(", ")}`}
              </p>
            </div>
            <ImpactBadge magnitude={event.impact_magnitude} direction={event.impact_direction} size="sm" />
          </div>
        ))}
      </div>
    </div>
  );
}
