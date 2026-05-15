import { Clock, ExternalLink, ChevronDown, ChevronUp } from "lucide-react";
import { useState } from "react";
import { Link } from "react-router-dom";
import { ImpactBadge } from "./ImpactBadge";
import type { GovernmentEventWithScore } from "../../hooks/useGovernmentEvents";

const TYPE_LABELS: Record<string, string> = {
  fomc_meeting: "FOMC",
  rate_decision: "Rate Decision",
  fed_speech: "Fed Speech",
  fed_minutes: "Fed Minutes",
  treasury_auction: "Treasury Auction",
  treasury_refunding: "Treasury Refunding",
  congressional_hearing: "Hearing",
  bill_vote: "Bill Vote",
  presidential_schedule: "White House",
  sec_enforcement: "SEC",
  ftc_action: "FTC",
  doj_antitrust: "DOJ",
  rule_proposal: "Rule Proposal",
};

const CATEGORY_COLORS: Record<string, string> = {
  fed_treasury: "bg-blue-500/10 text-blue-500 border-blue-500/20",
  white_house_congress: "bg-purple-500/10 text-purple-500 border-purple-500/20",
  regulatory: "bg-orange-500/10 text-orange-500 border-orange-500/20",
};

function formatEventDate(date: string, allDay: boolean): string {
  const d = new Date(date);
  if (allDay) return d.toLocaleDateString("en-US", { weekday: "short", month: "short", day: "numeric" });
  return d.toLocaleDateString("en-US", { weekday: "short", month: "short", day: "numeric", hour: "numeric", minute: "2-digit" });
}

function getRelativeDay(date: string): string {
  const d = new Date(date);
  const now = new Date();
  const diffMs = d.getTime() - now.getTime();
  const diffDays = Math.ceil(diffMs / 86400000);
  if (diffDays === 0) return "Today";
  if (diffDays === 1) return "Tomorrow";
  if (diffDays === -1) return "Yesterday";
  if (diffDays < 0) return `${Math.abs(diffDays)}d ago`;
  return `In ${diffDays}d`;
}

interface EventCardProps {
  event: GovernmentEventWithScore;
}

export function EventCard({ event }: EventCardProps) {
  const [expanded, setExpanded] = useState(false);
  const isPast = new Date(event.event_date) < new Date();
  const categoryColor = CATEGORY_COLORS[event.source_category] || "bg-accent text-muted-foreground";

  return (
    <div className={`border rounded-lg p-4 transition-all hover:shadow-sm ${isPast ? "opacity-60" : ""}`}>
      {/* Header row */}
      <div className="flex items-start justify-between gap-3">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-1.5 flex-wrap">
            <span className={`text-[10px] font-bold uppercase tracking-wider px-1.5 py-0.5 rounded border ${categoryColor}`}>
              {TYPE_LABELS[event.event_type] || event.event_type}
            </span>
            <span className="text-xs text-muted-foreground font-mono">
              {getRelativeDay(event.event_date)}
            </span>
          </div>
          <h3 className="text-sm font-semibold leading-snug line-clamp-2">{event.title}</h3>
          <div className="flex items-center gap-1.5 mt-1.5 text-xs text-muted-foreground">
            <Clock className="h-3 w-3" />
            <span>{formatEventDate(event.event_date, event.all_day)}</span>
          </div>
        </div>
        <ImpactBadge magnitude={event.impact_magnitude} direction={event.impact_direction} />
      </div>

      {/* Tickers + Sectors */}
      {(event.affected_tickers.length > 0 || event.affected_sectors.length > 0) && (
        <div className="mt-3 flex flex-wrap gap-1.5">
          {event.affected_tickers.slice(0, 5).map((ticker) => (
            <Link
              key={ticker}
              to={`/dashboard/tickers/${ticker}`}
              className="text-[10px] font-mono font-bold bg-primary/10 text-primary px-1.5 py-0.5 rounded hover:bg-primary/20 transition-colors"
            >
              ${ticker}
            </Link>
          ))}
          {event.affected_sectors.slice(0, 3).map((sector) => (
            <span
              key={sector}
              className="text-[10px] bg-accent text-muted-foreground px-1.5 py-0.5 rounded"
            >
              {sector}
            </span>
          ))}
        </div>
      )}

      {/* Expand toggle */}
      {event.reasoning && (
        <button
          onClick={() => setExpanded(!expanded)}
          className="mt-2 flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground transition-colors"
        >
          {expanded ? <ChevronUp className="h-3 w-3" /> : <ChevronDown className="h-3 w-3" />}
          {expanded ? "Less" : "Analysis"}
        </button>
      )}

      {/* Expanded details */}
      {expanded && event.reasoning && (
        <div className="mt-3 pt-3 border-t space-y-2">
          <p className="text-xs text-foreground/80 leading-relaxed">{event.reasoning}</p>
          {event.key_factors && event.key_factors.length > 0 && (
            <ul className="text-xs text-muted-foreground space-y-0.5">
              {event.key_factors.map((f, i) => (
                <li key={i} className="flex items-start gap-1.5">
                  <span className="text-primary mt-0.5">-</span>
                  <span>{f}</span>
                </li>
              ))}
            </ul>
          )}
          {event.historical_precedent && (
            <p className="text-[10px] text-muted-foreground italic">
              Precedent: {event.historical_precedent}
            </p>
          )}
          {event.source_url && (
            <a
              href={event.source_url}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1 text-[10px] text-primary hover:underline"
            >
              <ExternalLink className="h-2.5 w-2.5" />
              Source
            </a>
          )}
        </div>
      )}
    </div>
  );
}
