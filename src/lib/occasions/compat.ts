/**
 * How occasions, invitation types and templates fit together. These rules
 * drive the start flow ("which designs can I pick for a christening?") and
 * guarantee every published invitation gets a countdown and a working reply.
 */
import type { InvitationContent, Manifest, SectionKey, Slot, TemplateDefinition } from "@/lib/templates/manifest";
import { kindConfig, type InvitationKind } from "./kinds";
import { getOccasion, occasions, type OccasionConfig } from "./registry";

/** Slot keys a design actually draws (text, photos, video, countdown). */
export function slotsUsedBy(manifest: Manifest): Set<string> {
  const used = new Set<string>();
  for (const scene of manifest.scenes) {
    for (const layer of scene.layers) {
      if ("slot" in layer && layer.slot) used.add(layer.slot);
    }
  }
  return used;
}

export const templateOccasions = (t: TemplateDefinition) => t.occasions ?? [t.category];

/**
 * A design suits an occasion when it's listed for it and every slot it draws
 * is a field that occasion collects (a wedding layout needs two names; a
 * birthday only has one).
 */
export function templateSupports(t: TemplateDefinition, o: OccasionConfig): { ok: boolean; missing: string[] } {
  const fieldKeys = new Set(o.fields.map((f) => f.key));
  const missing = [...slotsUsedBy(t.manifest)].filter((k) => !fieldKeys.has(k));
  return { ok: templateOccasions(t).includes(o.slug) && missing.length === 0, missing };
}

export function templatesFor(occasionSlug: string, library: TemplateDefinition[]): TemplateDefinition[] {
  const o = getOccasion(occasionSlug);
  return o ? library.filter((t) => templateSupports(t, o).ok) : [];
}

/** Occasions a customer can start today: switched on, with at least one design. */
export function startableOccasions(library: TemplateDefinition[], activeCategorySlugs: readonly string[]): OccasionConfig[] {
  return occasions.filter((o) => activeCategorySlugs.includes(o.slug) && templatesFor(o.slug, library).length > 0);
}

/**
 * Sections offered for this occasion + invitation type + design, in the
 * design's order. Countdown and RSVP are always present for invitations
 * guests reply to; a thank-you card has neither.
 */
export function sectionsFor(o: OccasionConfig, kind: InvitationKind, t: TemplateDefinition): SectionKey[] {
  const k = kindConfig[kind];
  const allowed = (s: SectionKey) =>
    o.sections.available.includes(s) &&
    (k.sectionsAllowed === "all" || k.sectionsAllowed.includes(s)) &&
    (s !== "countdown" || k.countdown) &&
    (s !== "rsvp" || k.reply !== "none");
  const result = t.manifest.sections.filter(allowed);
  // The guarantees don't depend on a designer remembering to list them.
  if (k.countdown && !result.includes("countdown")) result.unshift("countdown");
  if (k.reply !== "none" && !result.includes("rsvp")) result.push("rsvp");
  return result;
}

/** Sections switched on when the invitation is first created. */
export function defaultSectionsFor(o: OccasionConfig, kind: InvitationKind, t: TemplateDefinition): SectionKey[] {
  const offered = sectionsFor(o, kind, t);
  const k = kindConfig[kind];
  return offered.filter((s) => o.sections.defaults.includes(s) || (s === "countdown" && k.countdown) || (s === "rsvp" && k.reply !== "none"));
}

/**
 * The fields a customer edits for this design and occasion: the occasion's
 * fields, with the design's own sample text where it provides one.
 */
export function effectiveSlots(o: OccasionConfig, t: TemplateDefinition): Slot[] {
  const fromTemplate = new Map(t.manifest.slots.map((s) => [s.key, s]));
  return o.fields.map((f) => {
    const ts = fromTemplate.get(f.key);
    return ts?.default !== undefined && f.key !== "invitationLine" ? { ...f, default: ts.default } : f;
  });
}

/** Starting content for a brand-new invitation. */
export function starterContent(o: OccasionConfig, kind: InvitationKind, t: TemplateDefinition): InvitationContent {
  const slots: Record<string, string> = {};
  for (const s of effectiveSlots(o, t)) if (s.default !== undefined) slots[s.key] = s.default;
  const wording = o.wording[kind];
  if (wording) slots.invitationLine = wording;
  return { slots };
}
