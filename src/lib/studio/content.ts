/**
 * Studio editing rules, shared by the editor, the autosave action and
 * (later) the mobile app: which fields a customer can change, what counts as
 * valid while they're still typing, and how a draft maps onto the event.
 * Pure TypeScript — no React, no database.
 */
import { effectiveSlots } from "@/lib/occasions/compat";
import type { OccasionConfig } from "@/lib/occasions/registry";
import { eventTitle, zonedToIso } from "@/lib/start/draft";
import { openingsFor, motionLevels } from "@/lib/cinema/motion";
import { resolveNames } from "@/lib/cinema/names";
import { contentSchema, validateContent, type InvitationContent, type Slot, type TemplateDefinition } from "@/lib/templates/manifest";

export interface FieldGroup {
  id: "names" | "when" | "where" | "wording";
  title: string;
  fields: Slot[];
}

const wordingKeys = new Set(["lead", "invitationLine"]);
const whenKeys = new Set(["date", "time"]);
const whereKeys = new Set(["venue"]);

/** The text fields a customer edits, grouped the way the editor shows them. Photos are handled in M3.5. */
export function fieldGroups(o: OccasionConfig, t: TemplateDefinition): FieldGroup[] {
  const text = effectiveSlots(o, t).filter((f) => f.type !== "image" && f.type !== "video");
  const names = text.filter((f) => !wordingKeys.has(f.key) && !whenKeys.has(f.key) && !whereKeys.has(f.key));
  const groups: FieldGroup[] = [
    { id: "names", title: "Who is it for?", fields: names },
    { id: "when", title: "When", fields: text.filter((f) => whenKeys.has(f.key)) },
    { id: "where", title: "Where", fields: text.filter((f) => whereKeys.has(f.key)) },
    { id: "wording", title: "Your words", fields: text.filter((f) => wordingKeys.has(f.key)) },
  ];
  return groups.filter((g) => g.fields.length);
}

export type DraftProblem = { slot?: string; message: string };

/**
 * Check a draft that's still being written. A half-finished draft is fine to
 * save, so missing required fields are allowed here; they're enforced when the
 * invitation is published. Everything else (unknown fields, lengths, date and
 * time formats, locked colours, the opening) is checked.
 */
export function checkDraft(
  o: OccasionConfig,
  t: TemplateDefinition,
  raw: unknown,
): { ok: true; content: InvitationContent } | { ok: false; problems: DraftProblem[] } {
  const checked = validateContent(t.manifest, raw, effectiveSlots(o, t));
  const problems: DraftProblem[] = checked.ok ? [] : checked.problems.filter((p) => !/ is required$/.test(p.message));
  const parsed = contentSchema.safeParse(raw);
  if (parsed.success) {
    const c = parsed.data;
    if (c.opening && !(openingsFor(t.manifest) as string[]).includes(c.opening)) problems.push({ message: "This design can't open that way" });
    if (c.motion && !(motionLevels as readonly string[]).includes(c.motion)) problems.push({ message: "Unknown motion level" });
  }
  if (problems.length || !parsed.success) return { ok: false, problems: problems.length ? problems : [{ message: "That doesn't look right" }] };
  return { ok: true, content: parsed.data };
}

/** Trim values and drop empty ones, so a cleared field really is cleared. */
export function tidy(content: InvitationContent): InvitationContent {
  const slots = Object.fromEntries(Object.entries(content.slots).map(([k, v]) => [k, v.trim()]).filter(([, v]) => v));
  return { ...content, slots };
}

/** What the event row should say, given the edited content (the dashboard and the website read these). */
export function eventFieldsFrom(o: OccasionConfig, content: InvitationContent, timezone: string, hideAge = false) {
  const slots = content.slots;
  const n = resolveNames(slots, { hideAge });
  const hosts = n?.mode === "couple" ? [n.first, n.second].filter(Boolean) : n?.mode === "organisation" ? [n.organisation] : n ? [n.name] : [];
  return {
    title: eventTitle(o, slots).slice(0, 160),
    host_names: hosts,
    starts_at: slots.date ? zonedToIso(slots.date, slots.time || "12:00", timezone) : null,
    venue_name: slots.venue ?? null,
  };
}
