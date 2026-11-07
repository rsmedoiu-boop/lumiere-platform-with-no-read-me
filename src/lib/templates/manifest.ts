/**
 * Template engine — manifest schema and content validation.
 *
 * A template is data, not code: its manifest describes theme, scenes, layers
 * and the slots a customer fills. One renderer draws every template, so a new
 * design (or a new category such as birthdays) is a new manifest row, never
 * a new application. Pure TypeScript + Zod: reusable by a mobile app.
 */
import { z } from "zod";

export const SCHEMA_VERSION = 1;

const hex = z.string().regex(/^#[0-9a-fA-F]{6}$/, "Use a 6-digit hex colour");

export const fontKeys = ["cormorant", "jost"] as const;
export type FontKey = (typeof fontKeys)[number];

export const animationKeys = ["none", "ink-in", "settle", "foil-draw"] as const;

export const slotSchema = z.object({
  key: z.string().regex(/^[a-z][a-zA-Z0-9_]{1,40}$/),
  type: z.enum(["text", "longtext", "date", "time", "image", "video", "location"]),
  label: z.string().min(1).max(60),
  maxLength: z.number().int().positive().max(2000).optional(),
  required: z.boolean().default(false),
  default: z.string().max(2000).optional(),
});
export type Slot = z.infer<typeof slotSchema>;

const textStyle = z.enum(["names", "heading", "body", "small", "date", "script"]);

export const layerSchema = z.discriminatedUnion("type", [
  z.object({
    type: z.literal("text"),
    slot: z.string().optional(), // text comes from a customer slot…
    text: z.string().optional(), // …or is fixed wording in the design
    style: textStyle,
    animation: z.enum(animationKeys).default("settle"),
    delayMs: z.number().int().min(0).max(10000).default(0),
  }),
  z.object({
    type: z.literal("ornament"),
    name: z.enum(["foil-rule", "monogram", "laurel", "arch"]),
    animation: z.enum(animationKeys).default("foil-draw"),
    delayMs: z.number().int().min(0).max(10000).default(0),
  }),
  z.object({ type: z.literal("image"), slot: z.string(), shape: z.enum(["arch", "circle", "full"]).default("arch") }),
  z.object({ type: z.literal("video"), slot: z.string() }),
  z.object({ type: z.literal("countdown"), slot: z.string() }),
  z.object({ type: z.literal("rsvp") }),
]);
export type Layer = z.infer<typeof layerSchema>;

export const sceneSchema = z.object({
  id: z.string(),
  background: z.object({
    kind: z.enum(["color", "gradient", "image", "video"]),
    value: z.string(), // colour, CSS gradient, or storage path of a reusable asset
    poster: z.string().optional(),
  }),
  layers: z.array(layerSchema).min(1),
  transition: z.enum(["fade", "rise", "none"]).default("fade"),
});

/**
 * Event-website sections — one vocabulary for every template, occasion and
 * invitation type. A template lists the sections its design supports; the
 * occasion decides which are offered and switched on by default.
 */
export const sectionKeys = [
  "countdown",
  "story",
  "schedule",
  "venue",
  "dress_code",
  "accommodation",
  "gallery",
  "video",
  "gifts",
  "rsvp",
  "extra",
] as const;
export type SectionKey = (typeof sectionKeys)[number];

export const manifestSchema = z.object({
  schemaVersion: z.literal(SCHEMA_VERSION),
  theme: z.object({
    palette: z.object({ background: hex, ink: hex, accent: hex, muted: hex }),
    fonts: z.object({ display: z.enum(fontKeys), body: z.enum(fontKeys) }),
    editable: z.object({ palette: z.boolean(), fonts: z.boolean() }),
  }),
  slots: z.array(slotSchema).min(1),
  scenes: z.array(sceneSchema).min(1),
  sections: z.array(z.enum(sectionKeys)),
});
export type Manifest = z.infer<typeof manifestSchema>;

export interface TemplateDefinition {
  slug: string;
  name: string;
  tier: "classic" | "premium" | "video" | "cinematic";
  /** Primary category (the template's home in the gallery). */
  category: string;
  /**
   * Occasions this design is offered for. Defaults to just `category`.
   * A template can only list occasions whose fields cover every slot its
   * layers use; `templateSupports` (src/lib/occasions) checks this.
   */
  occasions?: string[];
  mood: string;
  manifest: Manifest;
  /** Sample photos (slot key -> image URL) shown in gallery previews. */
  sampleMedia?: Record<string, string>;
}

/** What a customer's invitation stores: slot values and permitted overrides. */
export const contentSchema = z.object({
  slots: z.record(z.string(), z.string()),
  palette: z.object({ background: hex, ink: hex, accent: hex, muted: hex }).partial().optional(),
  fonts: z.object({ display: z.enum(fontKeys), body: z.enum(fontKeys) }).partial().optional(),
});
export type InvitationContent = z.infer<typeof contentSchema>;

export type ContentProblem = { slot?: string; message: string };

/**
 * Check customer content against a template: unknown slots, lengths, required
 * fields, date formats, and overrides the template doesn't allow.
 */
export function validateContent(manifest: Manifest, raw: unknown): { ok: true; content: InvitationContent } | { ok: false; problems: ContentProblem[] } {
  const parsed = contentSchema.safeParse(raw);
  if (!parsed.success) {
    return { ok: false, problems: parsed.error.issues.map((i) => ({ message: `${i.path.join(".")}: ${i.message}` })) };
  }
  const content = parsed.data;
  const problems: ContentProblem[] = [];
  const slots = new Map(manifest.slots.map((s) => [s.key, s]));

  for (const key of Object.keys(content.slots)) {
    if (!slots.has(key)) problems.push({ slot: key, message: "This template has no such field" });
  }
  for (const slot of manifest.slots) {
    const value = content.slots[slot.key]?.trim() ?? "";
    if (slot.required && !value) problems.push({ slot: slot.key, message: `${slot.label} is required` });
    if (slot.maxLength && value.length > slot.maxLength) {
      problems.push({ slot: slot.key, message: `${slot.label} must be ${slot.maxLength} characters or fewer` });
    }
    if (value && slot.type === "date" && !/^\d{4}-\d{2}-\d{2}$/.test(value)) {
      problems.push({ slot: slot.key, message: `${slot.label} must be a date (YYYY-MM-DD)` });
    }
    if (value && slot.type === "time" && !/^([01]\d|2[0-3]):[0-5]\d$/.test(value)) {
      problems.push({ slot: slot.key, message: `${slot.label} must be a time (HH:MM)` });
    }
  }
  if (content.palette && !manifest.theme.editable.palette) {
    problems.push({ message: "Colours can't be changed on this template" });
  }
  if (content.fonts && !manifest.theme.editable.fonts) {
    problems.push({ message: "Fonts can't be changed on this template" });
  }
  return problems.length ? { ok: false, problems } : { ok: true, content };
}

/** Default content for a new project from this template. */
export function defaultContent(manifest: Manifest): InvitationContent {
  return {
    slots: Object.fromEntries(manifest.slots.filter((s) => s.default).map((s) => [s.key, s.default!])),
  };
}

/** Resolve the final theme: template defaults plus allowed overrides. */
export function resolveTheme(manifest: Manifest, content: InvitationContent) {
  return {
    palette: { ...manifest.theme.palette, ...(manifest.theme.editable.palette ? content.palette : {}) },
    fonts: { ...manifest.theme.fonts, ...(manifest.theme.editable.fonts ? content.fonts : {}) },
  };
}

/** "2027-06-12" -> "Saturday 12 June 2027", in the event's locale. */
export function formatEventDate(isoDate: string | undefined, locale = "en-GB"): string {
  if (!isoDate || !/^\d{4}-\d{2}-\d{2}$/.test(isoDate)) return "";
  const [y, m, d] = isoDate.split("-").map(Number);
  return new Intl.DateTimeFormat(locale, {
    weekday: "long",
    day: "numeric",
    month: "long",
    year: "numeric",
    timeZone: "UTC",
  }).format(new Date(Date.UTC(y, m - 1, d)));
}
