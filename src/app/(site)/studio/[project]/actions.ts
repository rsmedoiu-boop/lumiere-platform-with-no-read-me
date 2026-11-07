"use server";

import { createSupabaseServerClient } from "@/lib/supabase/server";
import { getCurrentUser } from "@/lib/auth/session";
import { getStudioProject } from "@/lib/studio/queries";
import { checkDraft, eventFieldsFrom, tidy } from "@/lib/studio/content";
import { getTemplate } from "@/lib/templates/library";
import { getOccasion } from "@/lib/occasions/registry";

export type SaveResult =
  | { ok: true; version: number }
  | { ok: false; reason: "invalid"; problems: { slot?: string; message: string }[] }
  | { ok: false; reason: "stale" | "signed-out" | "failed"; message: string };

/**
 * Autosave. The draft is written only if nobody else changed it since the
 * version the editor loaded (a second tab or device), so edits never silently
 * overwrite each other. The event's title, hosts, date and venue follow.
 */
export async function saveDraft(projectId: string, raw: unknown, version: number): Promise<SaveResult> {
  if (JSON.stringify(raw ?? null).length > 20_000) return { ok: false, reason: "invalid", problems: [{ message: "That's more text than an invitation can hold" }] };
  const user = await getCurrentUser();
  if (!user) return { ok: false, reason: "signed-out", message: "Please sign in again to keep saving." };
  const project = await getStudioProject(projectId);
  const template = project && getTemplate(project.templateSlug);
  const occasion = project && getOccasion(project.event.occasion);
  if (!project || !template || !occasion) return { ok: false, reason: "failed", message: "We couldn't find this invitation." };

  const checked = checkDraft(occasion, template, raw);
  if (!checked.ok) return { ok: false, reason: "invalid", problems: checked.problems };
  const content = tidy(checked.content);

  const supabase = await createSupabaseServerClient();
  if (!supabase) return { ok: false, reason: "failed", message: "Saving isn't available right now." };
  const { data, error } = await supabase
    .from("invitation_projects")
    .update({ draft_content: content, draft_version: version + 1 })
    .eq("id", projectId)
    .eq("draft_version", version)
    .select("draft_version")
    .maybeSingle();
  if (error) return { ok: false, reason: "failed", message: "We couldn't save just now. We'll keep trying." };
  if (!data) return { ok: false, reason: "stale", message: "This invitation was changed somewhere else. Reload to see the latest." };

  // Keep the event in step; a failure here doesn't lose the draft.
  await supabase.from("events").update(eventFieldsFrom(occasion, content, project.event.timezone, project.event.settings.hideAge)).eq("id", project.event.id);
  return { ok: true, version: data.draft_version };
}
