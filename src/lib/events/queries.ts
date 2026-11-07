import "server-only";
import { createSupabaseServerClient } from "@/lib/supabase/server";

export interface EventSummary {
  id: string;
  title: string;
  slug: string;
  startsAt: string | null;
  venueName: string | null;
  stats: {
    invited: number; accepted: number; declined: number; pending: number;
    total_capacity: number; occupied: number; available: number;
    unassigned_accepted: number; needs_review: number; dietary_flags: number;
  } | null;
}

/** The signed-in customer's events with their dashboard statistics (RLS-scoped). */
export async function listMyEvents(): Promise<EventSummary[]> {
  const supabase = await createSupabaseServerClient();
  if (!supabase) return [];
  const { data: events } = await supabase
    .from("events")
    .select("id, title, slug, starts_at, venue_name")
    .order("starts_at", { ascending: true, nullsFirst: false });
  return Promise.all(
    (events ?? []).map(async (e) => {
      const { data } = await supabase.rpc("event_stats", { p_event_id: e.id }).maybeSingle();
      return {
        id: e.id, title: e.title, slug: e.slug, startsAt: e.starts_at, venueName: e.venue_name,
        stats: (data as EventSummary["stats"]) ?? null,
      };
    }),
  );
}
