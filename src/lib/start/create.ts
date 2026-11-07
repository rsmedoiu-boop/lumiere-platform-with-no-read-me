import "server-only";
import type { SupabaseClient } from "@supabase/supabase-js";
import type { PreparedEvent } from "./draft";

/** The cookie holding a start-flow draft while a new customer confirms their email. */
export const START_DRAFT_COOKIE = "start_draft";

/**
 * Create the event and its first invitation in one database call (see
 * migration 0005). Runs as the signed-in customer, so RLS still applies.
 */
export async function createEventFromDraft(
  supabase: SupabaseClient,
  e: PreparedEvent,
): Promise<{ ok: true; projectId: string; eventSlug: string } | { ok: false; error: string }> {
  const { data, error } = await supabase.rpc("create_event_with_invitation", {
    p_occasion: e.occasion,
    p_template: e.template,
    p_kind: e.kind,
    p_title: e.title,
    p_hosts: e.hosts,
    p_starts_at: e.startsAt,
    p_timezone: e.timezone,
    p_venue: e.venue,
    p_details: e.details,
    p_content: e.content,
    p_sections: e.sections,
  });
  if (error) {
    // Messages raised by the function are written for customers; anything else isn't.
    const friendly = /limit of 25 events|not available|Sign in/.test(error.message);
    return { ok: false, error: friendly ? error.message : "We couldn't save your invitation just now. Please try again." };
  }
  const row = Array.isArray(data) ? data[0] : data;
  return { ok: true, projectId: row.project_id, eventSlug: row.event_slug };
}
