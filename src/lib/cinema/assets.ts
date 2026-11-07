/**
 * Shared cinematic asset library. Backgrounds and loops are made once (with
 * Higgsfield, from original prompts) and reused by any template that wants
 * them — a design refers to an asset by id, never by file path, so assets
 * can move to storage/CDN later without touching a single manifest.
 *
 * Every asset is original, generated for us, and contains no real people.
 */

export interface CinematicAsset {
  id: string;
  kind: "video" | "image";
  /** The loop or image. Videos are short, muted, seamless and ≤ 1 MB. */
  src: string;
  /** Still frame: shown first, for Still motion and while the video loads. */
  poster: string;
  /** Words that help match an asset to a design in the studio. */
  mood: string[];
  /** Darkness of the picture, so lettering can pick a readable overlay. */
  tone: "dark" | "light";
  source: "higgsfield" | "studio";
}

export const cinematicAssets: CinematicAsset[] = [
  {
    id: "night-garden",
    kind: "video",
    src: "/media/night-garden-loop.mp4",
    poster: "/media/night-garden-900.webp",
    mood: ["evening", "garden", "lanterns", "romantic"],
    tone: "dark",
    source: "higgsfield",
  },
  {
    id: "tuscan-golden-hour",
    kind: "video",
    src: "/media/tuscan-golden-hour-loop.mp4",
    poster: "/media/tuscan-golden-hour-1080.webp",
    mood: ["vineyard", "golden hour", "italy", "rustic", "outdoor"],
    tone: "light",
    source: "higgsfield",
  },
  {
    id: "velvet-envelope",
    kind: "image",
    src: "/media/velvet-envelope-1080.webp",
    poster: "/media/velvet-envelope-1080.webp",
    mood: ["burgundy", "velvet", "embossed", "vines"],
    tone: "dark",
    source: "higgsfield",
  },
  {
    id: "velvet-envelope-gilded",
    kind: "image",
    src: "/media/velvet-envelope-gilded-1080.webp",
    poster: "/media/velvet-envelope-gilded-1080.webp",
    mood: ["burgundy", "gold foil", "vines"],
    tone: "dark",
    source: "higgsfield",
  },
  {
    id: "parchment-olive",
    kind: "image",
    src: "/media/parchment-olive-900.webp",
    poster: "/media/parchment-olive-900.webp",
    mood: ["parchment", "olive", "roses", "paper"],
    tone: "light",
    source: "higgsfield",
  },
  {
    id: "chateau-dusk",
    kind: "image",
    src: "/media/chateau-1600.webp",
    poster: "/media/chateau-900.webp",
    mood: ["chateau", "dusk", "grand", "destination"],
    tone: "dark",
    source: "higgsfield",
  },
];

export const getAsset = (id: string) => cinematicAssets.find((a) => a.id === id);

/**
 * The atmosphere behind a design's opening and website hero: its film's
 * shared asset if it has one; otherwise none, so light paper designs open
 * on their own colours rather than someone else's photograph.
 */
export function backdropFor(t: { manifest: { scenes: { background: { kind: string; value: string } }[] } }): {
  backdrop?: string;
  backdropVideo?: string;
} {
  const bg = t.manifest.scenes.map((s) => s.background).find((b) => b.kind === "asset");
  const a = bg ? getAsset(bg.value) : undefined;
  if (!a) return { backdrop: undefined, backdropVideo: undefined };
  return { backdrop: a.poster, backdropVideo: a.kind === "video" ? a.src : undefined };
}
