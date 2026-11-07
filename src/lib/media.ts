/**
 * Studio imagery (generated with Higgsfield, optimised to WebP; the
 * night-garden loop is a 5 s seamless H.264 clip, 540 px wide, no audio).
 * One registry so every page uses the same files, sizes and alt text.
 * Couples' own photos come from storage instead (media_assets).
 */
export const studioMedia = {
  hero: { src: "/media/hero-1080.webp", width: 896, height: 1120, alt: "A candlelit wedding table in an orangery at dusk, set with white roses and brass candlesticks" },
  nightGarden: { src: "/media/night-garden-900.webp", width: 752, height: 1344, alt: "" },
  coupleGarden: { src: "/media/couple-garden-800.webp", width: 800, height: 1062, alt: "A couple walking hand in hand through a garden under festoon lights" },
  coupleRiviera: { src: "/media/couple-riviera-720.webp", width: 720, height: 956, alt: "A couple on a terrace above the sea at sunset" },
  studioDesk: { src: "/media/studio-desk-1200.webp", width: 1168, height: 880, alt: "A stationery designer's desk with silk ribbon, gold foil, a wax seal and paper swatches" },
  chateau: { src: "/media/chateau-1600.webp", width: 1344, height: 752, alt: "A stone château reflected in a misty lake at golden hour" },
} as const;

export type StudioMediaKey = keyof typeof studioMedia;
