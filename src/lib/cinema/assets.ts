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
  /** A video that plays once and holds its last frame, rather than looping. */
  once?: boolean;
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
    // The couple walk away down the vine rows. Plays once from the same opening frame as the loop, then holds.
    id: "tuscan-walk",
    kind: "video",
    src: "/media/tuscan-walk.mp4",
    poster: "/media/tuscan-golden-hour-1080.webp",
    once: true,
    mood: ["vineyard", "golden hour", "italy", "couple", "walking"],
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
  {
    id: "amalfi-terrace",
    kind: "video",
    src: "/media/amalfi-terrace-loop.mp4",
    poster: "/media/amalfi-terrace-1080.webp",
    mood: ["amalfi","terrace","sea","restaurant","luxury"],
    tone: "light",
    source: "higgsfield",
  },
  {
    id: "amalfi-envelope",
    kind: "image",
    src: "/media/amalfi-terrace-envelope-1080.webp",
    poster: "/media/amalfi-terrace-envelope-1080.webp",
    mood: ["sea blue","majolica","lemons"],
    tone: "light",
    source: "higgsfield",
  },
  {
    id: "amalfi-envelope-gilded",
    kind: "image",
    src: "/media/amalfi-terrace-envelope-gilded-1080.webp",
    poster: "/media/amalfi-terrace-envelope-gilded-1080.webp",
    mood: ["sea blue","gold","lemons"],
    tone: "light",
    source: "higgsfield",
  },
  {
    id: "amalfi-paper",
    kind: "image",
    src: "/media/amalfi-terrace-paper-900.webp",
    poster: "/media/amalfi-terrace-paper-900.webp",
    mood: ["majolica","lemons","paper"],
    tone: "light",
    source: "higgsfield",
  },
  {
    id: "blossom-lane",
    kind: "video",
    src: "/media/blossom-lane-loop.mp4",
    poster: "/media/blossom-lane-1080.webp",
    mood: ["blossom","lanterns","spring","romantic"],
    tone: "light",
    source: "higgsfield",
  },
  {
    id: "blossom-envelope",
    kind: "image",
    src: "/media/blossom-lane-envelope-1080.webp",
    poster: "/media/blossom-lane-envelope-1080.webp",
    mood: ["blush","blossom","seal"],
    tone: "light",
    source: "higgsfield",
  },
  {
    id: "blossom-envelope-gilded",
    kind: "image",
    src: "/media/blossom-lane-envelope-gilded-1080.webp",
    poster: "/media/blossom-lane-envelope-gilded-1080.webp",
    mood: ["blush","blossom","gold"],
    tone: "light",
    source: "higgsfield",
  },
  {
    id: "blossom-paper",
    kind: "image",
    src: "/media/blossom-lane-paper-900.webp",
    poster: "/media/blossom-lane-paper-900.webp",
    mood: ["washi","blossom","paper"],
    tone: "light",
    source: "higgsfield",
  },
  {
    id: "celestial-sky",
    kind: "image",
    src: "/media/celestial-sky-1080.webp",
    poster: "/media/celestial-sky-1080.webp",
    mood: ["night","stars","moon","celestial"],
    tone: "dark",
    source: "higgsfield",
  },
  {
    id: "celestial-envelope",
    kind: "image",
    src: "/media/celestial-envelope-1080.webp",
    poster: "/media/celestial-envelope-1080.webp",
    mood: ["midnight","stars","navy"],
    tone: "dark",
    source: "higgsfield",
  },
  {
    id: "celestial-envelope-gilded",
    kind: "image",
    src: "/media/celestial-envelope-gilded-1080.webp",
    poster: "/media/celestial-envelope-gilded-1080.webp",
    mood: ["midnight","gold","stars"],
    tone: "dark",
    source: "higgsfield",
  },
  {
    id: "celestial-paper",
    kind: "image",
    src: "/media/celestial-paper-900.webp",
    poster: "/media/celestial-paper-900.webp",
    mood: ["midnight","stars","paper"],
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
  // A backdrop loops, so skip any play-once clip and use the loopable asset.
  const assets = t.manifest.scenes.map((s) => s.background).filter((b) => b.kind === "asset").map((b) => getAsset(b.value));
  const a = assets.find((x) => x && !x.once) ?? assets[0];
  if (!a) return { backdrop: undefined, backdropVideo: undefined };
  return { backdrop: a.poster, backdropVideo: a.kind === "video" ? a.src : undefined };
}
