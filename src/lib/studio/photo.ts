/**
 * Rules for customers' photographs, shared by the editor (which prepares the
 * file in the browser) and the server (which refuses anything else). Photos
 * live in the private `event-media` bucket under <event id>/<uuid>.webp, so
 * the same storage rule that protects the rest of an event protects them.
 */

export const PHOTO_BUCKET = "event-media";
/** The longest side after resizing: sharp on a large phone, small enough to load fast. */
export const PHOTO_MAX_SIDE = 1800;
/** What a customer may pick; it's re-encoded as WebP in the browser, which also drops location data. */
export const PHOTO_ACCEPT = "image/jpeg,image/png,image/webp,image/heic,image/heif";
export const PHOTO_PICK_LIMIT_BYTES = 25 * 1024 * 1024;
/** A prepared photo must stay within the storage rule for images. */
export const PHOTO_STORED_LIMIT_BYTES = 15 * 1024 * 1024;

const uuid = "[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}";
const pathRe = new RegExp(`^(${uuid})/(${uuid})\\.webp$`, "i");

export function newPhotoPath(eventId: string, id: string = crypto.randomUUID()): string {
  return `${eventId}/${id}.webp`;
}

/** True only for a path of this exact shape inside this event's own folder. */
export function isOwnPhotoPath(eventId: string, path: string | undefined | null): path is string {
  const m = path ? pathRe.exec(path) : null;
  return !!m && m[1].toLowerCase() === eventId.toLowerCase();
}

/** Scale to fit inside max × max, never enlarging. */
export function fitWithin(width: number, height: number, max: number = PHOTO_MAX_SIDE): { width: number; height: number } {
  const scale = Math.min(1, max / Math.max(width, height));
  return { width: Math.max(1, Math.round(width * scale)), height: Math.max(1, Math.round(height * scale)) };
}
