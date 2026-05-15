export type EventType =
  | "fomc_meeting"
  | "rate_decision"
  | "fed_speech"
  | "fed_minutes"
  | "treasury_auction"
  | "treasury_refunding"
  | "congressional_hearing"
  | "bill_vote"
  | "presidential_schedule"
  | "sec_enforcement"
  | "ftc_action"
  | "doj_antitrust"
  | "rule_proposal";

export type SourceCategory = "fed_treasury" | "white_house_congress" | "regulatory";

export type EventStatus = "upcoming" | "in_progress" | "completed" | "cancelled";

export interface GovernmentEvent {
  title: string;
  description?: string;
  event_type: EventType;
  source_category: SourceCategory;
  event_date: string;
  event_end_date?: string;
  all_day?: boolean;
  source_url?: string;
  source_feed: string;
  external_id: string;
  status?: EventStatus;
  participants?: string[];
  related_topics?: string[];
}

export interface EventImpactScore {
  impact_magnitude: number;
  impact_direction: "bullish" | "bearish" | "uncertain";
  confidence: number;
  timeframe: "immediate" | "short_term" | "medium_term";
  affected_sectors: string[];
  affected_tickers: string[];
  reasoning: string;
  key_factors: string[];
  historical_precedent: string;
}

export interface GovernmentEventFetcher {
  name: string;
  fetch(): Promise<GovernmentEvent[]>;
}
