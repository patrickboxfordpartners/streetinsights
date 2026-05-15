import { inngest } from "../client.js";
import { supabase } from "../../integrations/supabase/client.js";
import { fetchAllGovernmentEvents } from "../../integrations/government/aggregator.js";

export const scanGovernmentCalendar = inngest.createFunction(
  {
    id: "scan-government-calendar",
    name: "Scan government calendars for upcoming events",
    triggers: [
      { cron: "0 10 * * *" }, // 10:00 UTC = 6:00 AM ET
      { event: "government/calendar.scan-requested" },
    ],
    retries: 2,
  },
  async ({ step }) => {
    const { events, errors } = await step.run("fetch-all-sources", async () => {
      return await fetchAllGovernmentEvents();
    });

    if (events.length === 0) {
      return { fetched: 0, stored: 0, errors };
    }

    const stored = await step.run("upsert-events", async () => {
      let upserted = 0;

      // Batch upsert in groups of 20
      for (let i = 0; i < events.length; i += 20) {
        const batch = events.slice(i, i + 20);
        const { error } = await supabase
          .from("government_events")
          .upsert(
            batch.map((e) => ({
              title: e.title,
              description: e.description || null,
              event_type: e.event_type,
              source_category: e.source_category,
              event_date: e.event_date,
              event_end_date: e.event_end_date || null,
              all_day: e.all_day ?? false,
              source_url: e.source_url || null,
              source_feed: e.source_feed,
              external_id: e.external_id,
              status: e.status || "upcoming",
              participants: e.participants || [],
              related_topics: e.related_topics || [],
            })),
            { onConflict: "source_feed,external_id" }
          );

        if (error) {
          console.error("[scan-gov-calendar] upsert batch error:", error.message);
        } else {
          upserted += batch.length;
        }
      }

      return upserted;
    });

    // Emit scoring events for new/upcoming events within next 7 days
    const newEventIds = await step.run("find-unscored-events", async () => {
      const sevenDaysOut = new Date(Date.now() + 7 * 86400000).toISOString();
      const { data } = await supabase
        .from("government_events")
        .select("id")
        .eq("status", "upcoming")
        .lte("event_date", sevenDaysOut)
        .not(
          "id",
          "in",
          `(${(
            await supabase
              .from("event_impact_scores")
              .select("event_id")
              .eq("is_latest", true)
          ).data?.map((s) => s.event_id).join(",") || "00000000-0000-0000-0000-000000000000"})`
        );

      return data?.map((e) => e.id) || [];
    });

    if (newEventIds.length > 0) {
      await step.run("emit-scoring-events", async () => {
        for (const eventId of newEventIds.slice(0, 20)) {
          await inngest.send({
            name: "government/event.needs-scoring",
            data: { event_id: eventId },
          });
          await new Promise((r) => setTimeout(r, 200));
        }
      });
    }

    // Log to scan_log
    await step.run("log-scan", async () => {
      await supabase.from("scan_log").insert({
        scan_type: "government_calendar",
        status: "success",
        mentions_found: stored,
        error_message: errors.length > 0 ? errors.join("; ") : null,
        completed_at: new Date().toISOString(),
      });
    });

    return {
      fetched: events.length,
      stored,
      errors,
      events_to_score: newEventIds.length,
    };
  }
);
