/**
 * Launch template library (first three of fifteen).
 * Each design lists the occasions it suits (see src/lib/occasions).
 *
 * These manifests are the seed for the `templates` table; in Milestone 3 the
 * gallery reads them from the database and admins upload new ones. Reusable
 * background loops made with Higgsfield will be referenced by storage path in
 * `scene.background` (kind "video") — no per-customer generation needed.
 */
import { manifestSchema, type ManifestInput, type TemplateDefinition } from "./manifest";

/**
 * Sample content shown in the gallery before a customer types anything. The
 * fields actually edited come from the occasion (src/lib/occasions), so these
 * designs work for any occasion they list.
 */
const sampleSlots: ManifestInput["slots"] = [
  { key: "partnerOne", type: "text", label: "First name", maxLength: 24, required: true, default: "Sarah" },
  { key: "partnerTwo", type: "text", label: "Second name", maxLength: 24, required: true, default: "James" },
  { key: "date", type: "date", label: "Date", required: true, default: "2027-06-12" },
  { key: "time", type: "time", label: "Start time", required: false, default: "14:00" },
  { key: "venue", type: "text", label: "Venue", maxLength: 60, required: true, default: "Ashcombe House, Oxfordshire" },
  {
    key: "invitationLine",
    type: "longtext",
    label: "Invitation wording",
    maxLength: 140,
    required: false,
    default: "request the pleasure of your company to celebrate their marriage",
  },
  { key: "lead", type: "text", label: "Opening words", maxLength: 40, required: false, default: "You are invited" },
  { key: "photo", type: "image", label: "Photograph", required: false },
];

const allOccasions = ["weddings", "engagements", "birthdays", "anniversaries", "christenings", "baby-showers", "corporate", "celebrations"];

function define(t: Omit<TemplateDefinition, "manifest"> & { manifest: ManifestInput }): TemplateDefinition {
  // Fail fast at build time if a manifest drifts from the schema.
  return { ...t, manifest: manifestSchema.parse(t.manifest) };
}

export const templateLibrary: TemplateDefinition[] = [
  define({
    slug: "ivory-vow",
    name: "Ivory Vow",
    tier: "classic",
    category: "weddings",
    occasions: allOccasions,
    mood: "Classic and calm: engraved serif lettering, a single foil rule.",
    manifest: {
      schemaVersion: 1,
      theme: {
        palette: { background: "#fbfaf7", ink: "#25283a", accent: "#b39557", muted: "#7d7f8c" },
        fonts: { display: "cormorant", body: "jost" },
        editable: { palette: false, fonts: false },
      },
      slots: sampleSlots,
      motion: { opening: "envelope", level: "gentle" },
      scenes: [
        {
          id: "card",
          background: { kind: "color", value: "#fbfaf7" },
          transition: "fade",
          layers: [
            { type: "ornament", name: "monogram", animation: "settle", delayMs: 0 },
            { type: "names", animation: "ink-in", delayMs: 200 },
            { type: "ornament", name: "foil-rule", animation: "foil-draw", delayMs: 1800 },
            { type: "text", slot: "invitationLine", style: "body", animation: "settle", delayMs: 2100 },
            { type: "text", slot: "date", style: "date", animation: "settle", delayMs: 2300 },
            { type: "text", slot: "venue", style: "small", animation: "settle", delayMs: 2400 },
            { type: "countdown", slot: "date" },
            { type: "rsvp" },
          ],
        },
      ],
      sections: ["countdown", "schedule", "venue", "dress_code", "extra", "rsvp"],
    },
  }),
  /**
   * The flagship and the reference for the cinematic engine: a three-scene
   * film over a lantern-lit garden loop, with letter-by-letter names, depth
   * and a crossfade into the finished card.
   */
  define({
    slug: "midnight-garden",
    name: "Midnight Garden",
    tier: "premium",
    category: "weddings",
    occasions: ["weddings", "engagements", "anniversaries", "birthdays", "celebrations"],
    mood: "Evening glamour: a lantern-lit garden, champagne lettering, a laurel crest.",
    manifest: {
      schemaVersion: 1,
      theme: {
        palette: { background: "#1c2238", ink: "#f1eadb", accent: "#c9ad6e", muted: "#9aa0b6" },
        fonts: { display: "cormorant", body: "jost" },
        editable: { palette: true, fonts: true },
      },
      slots: sampleSlots,
      motion: { opening: "envelope", level: "cinematic" },
      scenes: [
        {
          id: "dusk",
          durationMs: 3000,
          background: { kind: "asset", value: "night-garden", overlay: 0.4, parallax: true },
          transition: "dissolve",
          layers: [
            { type: "ornament", name: "stars", animation: "blur", delayMs: 200, depth: 0.8 },
            { type: "text", slot: "lead", style: "heading", animation: "letters", delayMs: 600, depth: 0.4 },
          ],
        },
        {
          id: "names",
          durationMs: 3600,
          background: { kind: "asset", value: "night-garden", overlay: 0.45, parallax: true },
          transition: "dissolve",
          layers: [
            { type: "names", animation: "letters", delayMs: 300, depth: 0.5 },
            { type: "ornament", name: "foil-rule", animation: "foil-draw", delayMs: 1900, depth: 0.2 },
          ],
        },
        {
          id: "card",
          background: { kind: "asset", value: "night-garden", overlay: 0.78, parallax: true },
          transition: "iris",
          layers: [
            { type: "ornament", name: "laurel", animation: "settle", delayMs: 0, depth: 0.3 },
            { type: "text", slot: "invitationLine", style: "small", animation: "settle", delayMs: 300 },
            { type: "names", animation: "wipe", delayMs: 500, depth: 0.15 },
            { type: "ornament", name: "foil-rule", animation: "foil-draw", delayMs: 1500 },
            { type: "text", slot: "date", style: "date", animation: "rise", delayMs: 1800 },
            { type: "text", slot: "venue", style: "small", animation: "rise", delayMs: 2000 },
            { type: "countdown", slot: "date" },
            { type: "rsvp" },
          ],
        },
      ],
      sections: ["countdown", "story", "schedule", "venue", "dress_code", "accommodation", "gallery", "gifts", "extra", "rsvp"],
    },
  }),
  define({
    slug: "riviera",
    name: "Riviera",
    tier: "video",
    category: "weddings",
    occasions: ["weddings", "engagements", "anniversaries"],
    mood: "Sun-washed destination: blush paper, an arched portrait of the two of you.",
    sampleMedia: { photo: "/media/couple-riviera-720.webp" },
    manifest: {
      schemaVersion: 1,
      theme: {
        palette: { background: "#f4e6e1", ink: "#3a2f36", accent: "#a5765f", muted: "#8a7b80" },
        fonts: { display: "cormorant", body: "jost" },
        editable: { palette: true, fonts: false },
      },
      slots: sampleSlots,
      motion: { opening: "curtain", level: "cinematic" },
      scenes: [
        {
          id: "card",
          background: { kind: "color", value: "#f4e6e1" },
          transition: "rise",
          layers: [
            { type: "image", slot: "photo", shape: "arch", animation: "blur", delayMs: 0, depth: 0.35 },
            { type: "names", animation: "ink-in", delayMs: 400 },
            { type: "text", slot: "date", style: "date", animation: "settle", delayMs: 2000 },
            { type: "text", slot: "venue", style: "small", animation: "settle", delayMs: 2100 },
            { type: "countdown", slot: "date" },
            { type: "rsvp" },
          ],
        },
      ],
      sections: ["countdown", "story", "schedule", "venue", "accommodation", "gallery", "video", "extra", "rsvp"],
    },
  }),
  /**
   * Golden hour in a Tuscan vineyard: a living watercolour film, a gilded
   * velvet envelope, and a parchment website with script headings.
   */
  define({
    slug: "tuscan-vineyard",
    name: "Tuscan Vineyard",
    tier: "premium",
    category: "weddings",
    occasions: ["weddings", "engagements", "anniversaries"],
    mood: "Golden hour among the vines: a living watercolour, a gilded velvet envelope, parchment and olive branches.",
    manifest: {
      schemaVersion: 1,
      theme: {
        palette: { background: "#f6e9d3", ink: "#4a2a2e", accent: "#8a5a2b", muted: "#6f5b4b" },
        fonts: { display: "cormorant", body: "jost", script: "pinyon" },
        editable: { palette: true, fonts: false },
      },
      slots: sampleSlots,
      motion: { opening: "gilded", level: "cinematic", art: { closed: "velvet-envelope", revealed: "velvet-envelope-gilded" } },
      site: { paper: "parchment-olive", headings: "script" },
      scenes: [
        {
          id: "golden-hour",
          durationMs: 6800,
          align: "start",
          background: { kind: "asset", value: "tuscan-walk", overlay: 0.6, veil: "top", parallax: true },
          transition: "dissolve",
          layers: [
            { type: "ornament", name: "sprig", animation: "blur", delayMs: 300, depth: 0.5 },
            { type: "text", slot: "lead", style: "heading", animation: "letters", delayMs: 700, depth: 0.3 },
          ],
        },
        {
          id: "card",
          align: "start",
          background: { kind: "asset", value: "tuscan-golden-hour", overlay: 0.95, veil: "top", parallax: true },
          transition: "rise",
          layers: [
            { type: "names", layout: "caps", animation: "wipe", delayMs: 200 },
            { type: "text", slot: "invitationLine", style: "small", animation: "settle", delayMs: 1500 },
            { type: "ornament", name: "foil-rule", animation: "foil-draw", delayMs: 1800 },
            { type: "text", slot: "date", style: "date", animation: "rise", delayMs: 2100 },
            { type: "text", slot: "venue", style: "small", animation: "rise", delayMs: 2300 },
            { type: "countdown", slot: "date" },
            { type: "rsvp" },
          ],
        },
      ],
      sections: ["countdown", "story", "schedule", "venue", "dress_code", "accommodation", "gallery", "gifts", "extra", "rsvp"],
    },
  }),
];

export const getTemplate = (slug: string) => templateLibrary.find((t) => t.slug === slug);
