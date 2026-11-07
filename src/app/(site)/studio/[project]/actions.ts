"use server";

import { createSupabaseServerClient } from "@/lib/supabase/server";
import { getCurrentUser } from "@/lib/auth/session";
import { getStudioProject } from "@/lib/studio/queries";
import { checkDraft, eventFieldsFrom, tidy } from "@/lib/studio/content";
import { getTemplate } from "@/lib/templates/library";
import { getOccasion } from "@/lib/occasions/registry";
import { PHOTO_BUCKET, PHOTO_STORED_LIMIT_BYTES, isOwnPhotoPath } from "@/lib/studio/photo";
import { signedPhotoUrl } from "@/lib/studio/photos";

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
  if (content.story?.photoPath && !isOwnPhotoPath(project.event.id, content.story.photoPath)) {
    return { ok: false, reason: "invalid", problems: [{ message: "That photo doesn't belong to this invitation" }] };
  }

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

export type PhotoResult = { ok: true; url: string } | { ok: false; message: string };

/**
 * Record a photo the browser has just uploaded, and hand back a link to show
 * it. The path must sit in this invitation's own folder; storage rules already
 * stop anyone writing anywhere else.
 */
export async function registerPhoto(projectId: string, path: string, width: number, height: number, sizeBytes: number): Promise<PhotoResult> {
  const user = await getCurrentUser();
  if (!user) return { ok: false, message: "Please sign in again." };
  const project = await getStudioProject(projectId);
  if (!project) return { ok: false, message: "We couldn't find this invitation." };
  if (!isOwnPhotoPath(project.event.id, path)) return { ok: false, message: "That photo can't be used here." };
  if (!(sizeBytes > 0 && sizeBytes <= PHOTO_STORED_LIMIT_BYTES) || !(width > 0 && height > 0)) return { ok: false, message: "That photo is too large. Please choose a smaller one." };
  const supabase = await createSupabaseServerClient();
  if (!supabase) return { ok: false, message: "Saving isn't available right now." };

  // The object must really be there, in the owner's folder, before we record it.
  const url = await signedPhotoUrl(supabase, project.event.id, path);
  if (!url) return { ok: false, message: "The upload didn't finish. Please try again." };
  const { error } = await supabase.from("media_assets").insert({
    event_id: project.event.id,
    kind: "image",
    storage_path: path,
    mime_type: "image/webp",
    size_bytes: sizeBytes,
    width: Math.round(width),
    height: Math.round(height),
  });
  if (error) return { ok: false, message: "We couldn't record that photo. Please try again." };
  return { ok: true, url };
}

/** Delete a photo the invitation no longer uses (the file and its record). */
export async function removePhoto(projectId: string, path: string): Promise<{ ok: boolean }> {
  const user = await getCurrentUser();
  const project = user ? await getStudioProject(projectId) : null;
  if (!project || !isOwnPhotoPath(project.event.id, path)) return { ok: false };
  // Never delete a photo the saved draft still points at.
  if (project.content.story?.photoPath === path) return { ok: false };
  const supabase = await createSupabaseServerClient();
  if (!supabase) return { ok: false };
  await supabase.storage.from(PHOTO_BUCKET).remove([path]);
  await supabase.from("media_assets").delete().eq("event_id", project.event.id).eq("storage_path", path);
  return { ok: true };
}
