/**
 * Template engine — manifest schema and content validation.
 *
 * A template is data, not code: its manifest describes theme, scenes, layers
 * and the slots a customer fills. One renderer draws every template, so a new
 * design (or a new category such as birthdays) is a new manifest row, never
 * a new application. Pure TypeScript + Zod: reusable by a mobile app.
 */
import { z } from "zod";
import { motionLevels, openingKeys, revealKeys, transitionKeys } from "@/lib/cinema/motion";

export const SCHEMA_VERSION = 1;

const hex = z.string().regex(/^#[0-9a-fA-F]{6}$/, "Use a 6-digit hex colour");

export const fontKeys = ["cormorant", "jost"] as const;
export type FontKey = (typeof fontKeys)[number];

/** Text and ornament reveals (see src/lib/cinema/motion for what each level does with them). */
export const animationKeys = revealKeys;

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

/**
 * Depth for parallax: 0 sits on the paper, 1 floats nearest the viewer.
 * Only Cinematic motion moves layers by depth.
 */
const depth = z.number().min(0).max(1).optional();
const reveal = { animation: z.enum(animationKeys).default("settle"), delayMs: z.number().int().min(0).max(15000).default(0), depth };

export const ornamentNames = ["foil-rule", "monogram", "laurel", "arch", "stars", "sprig", "deco-fan", "wave"] as const;

export const layerSchema = z.discriminatedUnion("type", [
  z.object({
    type: z.literal("text"),
    slot: z.string().optional(), // text comes from a customer slot…
    text: z.string().optional(), // …or is fixed wording in the design
    style: textStyle,
    ...reveal,
  }),
  /**
   * Whoever the invitation is from or for — a couple, one person or an
   * organisation — laid out by the design. Lets one design serve any occasion.
   */
  z.object({ type: z.literal("names"), layout: z.enum(["stacked", "inline"]).default("stacked"), ...reveal, animation: z.enum(animationKeys).default("ink-in") }),
  z.object({ type: z.literal("ornament"), name: z.enum(ornamentNames), ...reveal, animation: z.enum(animationKeys).default("foil-draw") }),
  z.object({ type: z.literal("image"), slot: z.string(), shape: z.enum(["arch", "circle", "full"]).default("arch"), ...reveal }),
  z.object({ type: z.literal("video"), slot: z.string() }),
  z.object({ type: z.literal("countdown"), slot: z.string() }),
  z.object({ type: z.literal("rsvp") }),
]);
export type Layer = z.infer<typeof layerSchema>;

export const sceneSchema = z.object({
  id: z.string(),
  background: z.object({
    /** "asset" = a shared cinematic asset by id (src/lib/cinema/assets). */
    kind: z.enum(["color", "gradient", "image", "video", "asset"]),
    value: z.string(), // colour, CSS gradient, image URL or asset id
    poster: z.string().optional(),
    /** Veil of the template's background colour over a picture, for legible lettering. */
    overlay: z.number().min(0).max(1).default(0),
    /** Slow drift and pointer depth on the background (Cinematic only). */
    parallax: z.boolean().default(false),
  }),
  layers: z.array(layerSchema).min(1),
  transition: z.enum(transitionKeys).default("fade"),
  /** How long a prelude scene holds before the next; ignored for the final scene. */
  durationMs: z.number().int().min(1200).max(12000).optional(),
});
export type Scene = z.infer<typeof sceneSchema>;

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

const nameSlotKeys = ["partnerOne", "partnerTwo", "celebrant", "childName", "honouree", "organisation", "eventName"];

export const manifestSchema = z
  .object({
    schemaVersion: z.literal(SCHEMA_VERSION),
    theme: z.object({
      palette: z.object({ background: hex, ink: hex, accent: hex, muted: hex }),
      fonts: z.object({ display: z.enum(fontKeys), body: z.enum(fontKeys) }),
      editable: z.object({ palette: z.boolean(), fonts: z.boolean() }),
    }),
    slots: z.array(slotSchema).min(1),
    /**
     * Scenes play in order. Every scene before the last is a short prelude;
     * the last is the finished invitation, which stays on screen and is what
     * thumbnails, Still motion and exports show.
     */
    scenes: z.array(sceneSchema).min(1).max(5),
    sections: z.array(z.enum(sectionKeys)),
    motion: z
      .object({
        opening: z.enum(openingKeys).default("envelope"),
        level: z.enum(motionLevels).default("cinematic"),
      })
      .default({ opening: "envelope", level: "cinematic" }),
  })
  .superRefine((m, ctx) => {
    const final = m.scenes[m.scenes.length - 1];
    const hasNames = final.layers.some((l) => l.type === "names" || (l.type === "text" && l.slot && nameSlotKeys.includes(l.slot)));
    const hasDate = final.layers.some((l) => l.type === "text" && l.slot === "date");
    if (!hasNames) ctx.addIssue({ code: "custom", path: ["scenes"], message: "The final scene must show the names" });
    if (!hasDate) ctx.addIssue({ code: "custom", path: ["scenes"], message: "The final scene must show the date" });
    m.scenes.slice(0, -1).forEach((sc, i) => {
      if (sc.layers.some((l) => l.type === "rsvp" || l.type === "countdown"))
        ctx.addIssue({ code: "custom", path: ["scenes", i], message: "Countdown and RSVP belong on the final scene" });
    });
    const ids = new Set(m.scenes.map((sc) => sc.id));
    if (ids.size !== m.scenes.length) ctx.addIssue({ code: "custom", path: ["scenes"], message: "Scene ids must be unique" });
  });
export type Manifest = z.infer<typeof manifestSchema>;
/** What a designer writes: defaults may be left out. */
export type ManifestInput = z.input<typeof manifestSchema>;

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
  /** The customer's choices in the studio (fall back to the design's). */
  motion: z.enum(motionLevels).optional(),
  opening: z.enum(openingKeys).optional(),
});
export type InvitationContent = z.infer<typeof contentSchema>;

export type ContentProblem = { slot?: string; message: string };

/**
 * Check customer content against a template: unknown slots, lengths, required
 * fields, date formats, and overrides the template doesn't allow.
 */
export function validateContent(
  manifest: Manifest,
  raw: unknown,
  /** The fields being edited — the occasion's (see effectiveSlots); defaults to the design's own. */
  fields: Slot[] = manifest.slots,
): { ok: true; content: InvitationContent } | { ok: false; problems: ContentProblem[] } {
  const parsed = contentSchema.safeParse(raw);
  if (!parsed.success) {
    return { ok: false, problems: parsed.error.issues.map((i) => ({ message: `${i.path.join(".")}: ${i.message}` })) };
  }
  const content = parsed.data;
  const problems: ContentProblem[] = [];
  const slots = new Map(fields.map((s) => [s.key, s]));

  for (const key of Object.keys(content.slots)) {
    if (!slots.has(key)) problems.push({ slot: key, message: "This template has no such field" });
  }
  for (const slot of fields) {
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

/** The motion level and opening to use: the customer's choice, else the design's. */
export function resolveMotion(manifest: Manifest, content?: InvitationContent) {
  return { level: content?.motion ?? manifest.motion.level, opening: content?.opening ?? manifest.motion.opening };
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
