/**
 * Launch template library (first three of fifteen).
 *
 * These manifests are the seed for the `templates` table; in Milestone 3 the
 * gallery reads them from the database and admins upload new ones. Reusable
 * background loops made with Higgsfield will be referenced by storage path in
 * `scene.background` (kind "video") — no per-customer generation needed.
 */
import { manifestSchema, type Manifest, type TemplateDefinition } from "./manifest";

const weddingSlots: Manifest["slots"] = [
  { key: "partnerOne", type: "text", label: "First name", maxLength: 24, required: true, default: "Sarah" },
  { key: "partnerTwo", type: "text", label: "Second name", maxLength: 24, required: true, default: "James" },
  { key: "date", type: "date", label: "Wedding date", required: true, default: "2027-06-12" },
  { key: "time", type: "time", label: "Ceremony time", required: false, default: "14:00" },
  { key: "venue", type: "text", label: "Venue", maxLength: 60, required: true, default: "Ashcombe House, Oxfordshire" },
  {
    key: "invitationLine",
    type: "longtext",
    label: "Invitation wording",
    maxLength: 140,
    required: false,
    default: "request the pleasure of your company to celebrate their marriage",
  },
  { key: "photo", type: "image", label: "Couple photograph", required: false },
];

function define(t: Omit<TemplateDefinition, "manifest"> & { manifest: Manifest }): TemplateDefinition {
  // Fail fast at build time if a manifest drifts from the schema.
  return { ...t, manifest: manifestSchema.parse(t.manifest) };
}

export const templateLibrary: TemplateDefinition[] = [
  define({
    slug: "ivory-vow",
    name: "Ivory Vow",
    tier: "classic",
    category: "weddings",
    mood: "Classic and calm: engraved serif lettering, a single foil rule.",
    manifest: {
      schemaVersion: 1,
      theme: {
        palette: { background: "#fbfaf7", ink: "#25283a", accent: "#b39557", muted: "#7d7f8c" },
        fonts: { display: "cormorant", body: "jost" },
        editable: { palette: false, fonts: false },
      },
      slots: weddingSlots,
      scenes: [
        {
          id: "cover",
          background: { kind: "color", value: "#fbfaf7" },
          transition: "fade",
          layers: [
            { type: "ornament", name: "monogram", animation: "settle", delayMs: 0 },
            { type: "text", slot: "partnerOne", style: "names", animation: "ink-in", delayMs: 200 },
            { type: "text", text: "&", style: "script", animation: "settle", delayMs: 900 },
            { type: "text", slot: "partnerTwo", style: "names", animation: "ink-in", delayMs: 1100 },
            { type: "ornament", name: "foil-rule", animation: "foil-draw", delayMs: 1800 },
            { type: "text", slot: "invitationLine", style: "body", animation: "settle", delayMs: 2100 },
            { type: "text", slot: "date", style: "date", animation: "settle", delayMs: 2300 },
            { type: "text", slot: "venue", style: "small", animation: "settle", delayMs: 2400 },
            { type: "countdown", slot: "date" },
            { type: "rsvp" },
          ],
        },
      ],
      sections: ["countdown", "ceremony", "reception", "dress_code", "directions", "rsvp"],
    },
  }),
  define({
    slug: "midnight-garden",
    name: "Midnight Garden",
    tier: "premium",
    category: "weddings",
    mood: "Evening glamour: ink-blue ground, champagne lettering, a laurel crest.",
    manifest: {
      schemaVersion: 1,
      theme: {
        palette: { background: "#1c2238", ink: "#f1eadb", accent: "#c9ad6e", muted: "#9aa0b6" },
        fonts: { display: "cormorant", body: "jost" },
        editable: { palette: true, fonts: true },
      },
      slots: weddingSlots,
      scenes: [
        {
          id: "cover",
          background: { kind: "gradient", value: "radial-gradient(120% 90% at 50% 0%, #2a3150 0%, #1c2238 60%, #141a2c 100%)" },
          transition: "fade",
          layers: [
            { type: "ornament", name: "laurel", animation: "settle", delayMs: 0 },
            { type: "text", text: "Together with their families", style: "small", animation: "settle", delayMs: 300 },
            { type: "text", slot: "partnerOne", style: "names", animation: "ink-in", delayMs: 500 },
            { type: "text", text: "&", style: "script", animation: "settle", delayMs: 1200 },
            { type: "text", slot: "partnerTwo", style: "names", animation: "ink-in", delayMs: 1400 },
            { type: "ornament", name: "foil-rule", animation: "foil-draw", delayMs: 2100 },
            { type: "text", slot: "date", style: "date", animation: "settle", delayMs: 2400 },
            { type: "text", slot: "venue", style: "small", animation: "settle", delayMs: 2500 },
            { type: "countdown", slot: "date" },
            { type: "rsvp" },
          ],
        },
      ],
      sections: ["countdown", "ceremony", "reception", "dress_code", "directions", "accommodation", "gallery", "rsvp"],
    },
  }),
  define({
    slug: "riviera",
    name: "Riviera",
    tier: "video",
    category: "weddings",
    mood: "Sun-washed destination: blush paper, an arched portrait of the two of you.",
    manifest: {
      schemaVersion: 1,
      theme: {
        palette: { background: "#f4e6e1", ink: "#3a2f36", accent: "#a5765f", muted: "#8a7b80" },
        fonts: { display: "cormorant", body: "jost" },
        editable: { palette: true, fonts: false },
      },
      slots: weddingSlots,
      scenes: [
        {
          id: "cover",
          background: { kind: "color", value: "#f4e6e1" },
          transition: "rise",
          layers: [
            { type: "image", slot: "photo", shape: "arch" },
            { type: "text", slot: "partnerOne", style: "names", animation: "ink-in", delayMs: 300 },
            { type: "text", text: "&", style: "script", animation: "settle", delayMs: 1000 },
            { type: "text", slot: "partnerTwo", style: "names", animation: "ink-in", delayMs: 1200 },
            { type: "text", slot: "date", style: "date", animation: "settle", delayMs: 2000 },
            { type: "text", slot: "venue", style: "small", animation: "settle", delayMs: 2100 },
            { type: "rsvp" },
          ],
        },
      ],
      sections: ["countdown", "ceremony", "reception", "directions", "accommodation", "gallery", "video", "rsvp"],
    },
  }),
];

export const getTemplate = (slug: string) => templateLibrary.find((t) => t.slug === slug);
