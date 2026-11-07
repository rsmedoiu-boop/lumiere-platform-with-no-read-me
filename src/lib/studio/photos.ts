import "server-only";
import type { SupabaseClient } from "@supabase/supabase-js";
import { PHOTO_BUCKET, isOwnPhotoPath } from "./photo";

/** A short-lived link to a photo the signed-in owner may see. Guests get theirs when the website is published. */
export async function signedPhotoUrl(supabase: SupabaseClient, eventId: string, path: string | undefined, seconds = 3600): Promise<string | undefined> {
  if (!isOwnPhotoPath(eventId, path)) return undefined;
  const { data } = await supabase.storage.from(PHOTO_BUCKET).createSignedUrl(path, seconds);
  return data?.signedUrl;
}
