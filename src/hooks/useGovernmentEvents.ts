import { useEffect, useState, useCallback } from "react";
import { supabase } from "../integrations/supabase/client";

export interface GovernmentEventWithScore {
  id: string;
  title: string;
  description: string | null;
  event_type: string;
  source_category: string;
  event_date: string;
  event_end_date: string | null;
  all_day: boolean;
  source_url: string | null;
  status: string;
  participants: string[];
  related_topics: string[];
  // Score fields (from latest score)
  impact_magnitude: number | null;
  impact_direction: string | null;
  confidence: number | null;
  timeframe: string | null;
  affected_sectors: string[];
  affected_tickers: string[];
  reasoning: string | null;
  key_factors: string[];
  historical_precedent: string | null;
}

type DateRange = "1d" | "3d" | "7d" | "30d";

export function useGovernmentEvents(range: DateRange = "7d") {
  const [events, setEvents] = useState<GovernmentEventWithScore[]>([]);
  const [loading, setLoading] = useState(true);
  const [accuracy, setAccuracy] = useState<number | null>(null);

  const load = useCallback(async () => {
    setLoading(true);

    const daysMap = { "1d": 1, "3d": 3, "7d": 7, "30d": 30 };
    const days = daysMap[range];
    const fromDate = new Date(Date.now() - 2 * 86400000).toISOString(); // include 2 days back for context
    const toDate = new Date(Date.now() + days * 86400000).toISOString();

    const { data: eventsData } = await supabase
      .from("government_events")
      .select("*")
      .gte("event_date", fromDate)
      .lte("event_date", toDate)
      .order("event_date", { ascending: true });

    if (!eventsData || eventsData.length === 0) {
      setEvents([]);
      setLoading(false);
      return;
    }

    // Fetch latest scores for these events
    const eventIds = eventsData.map((e) => e.id);
    const { data: scoresData } = await supabase
      .from("event_impact_scores")
      .select("*")
      .in("event_id", eventIds)
      .eq("is_latest", true);

    const scoreMap = new Map(
      (scoresData || []).map((s) => [s.event_id, s])
    );

    const merged: GovernmentEventWithScore[] = eventsData.map((e) => {
      const score = scoreMap.get(e.id);
      return {
        id: e.id,
        title: e.title,
        description: e.description,
        event_type: e.event_type,
        source_category: e.source_category,
        event_date: e.event_date,
        event_end_date: e.event_end_date,
        all_day: e.all_day,
        source_url: e.source_url,
        status: e.status,
        participants: e.participants || [],
        related_topics: e.related_topics || [],
        impact_magnitude: score?.impact_magnitude ?? null,
        impact_direction: score?.impact_direction ?? null,
        confidence: score?.confidence ?? null,
        timeframe: score?.timeframe ?? null,
        affected_sectors: score?.affected_sectors || [],
        affected_tickers: score?.affected_tickers || [],
        reasoning: score?.reasoning ?? null,
        key_factors: score?.key_factors || [],
        historical_precedent: score?.historical_precedent ?? null,
      };
    });

    setEvents(merged);

    // Fetch rolling accuracy
    const { data: validations } = await supabase
      .from("event_validations")
      .select("overall_score")
      .order("validated_at", { ascending: false })
      .limit(20);

    if (validations && validations.length > 0) {
      const avg =
        validations.reduce((sum, v) => sum + (v.overall_score || 0), 0) /
        validations.length;
      setAccuracy(Math.round(avg));
    }

    setLoading(false);
  }, [range]);

  useEffect(() => {
    load();
  }, [load]);

  return { events, loading, accuracy, refresh: load };
}
